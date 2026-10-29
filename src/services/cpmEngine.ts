import { Activity, WorkingCalendar, DelaySimulationResult } from '../types';
import {
  ensureWorkingDay,
  addWorkingDays,
  subtractWorkingDays,
  getNextWorkingDay,
  getPreviousWorkingDay,
  countWorkingDaysBetween,
  calendarDaysBetween,
  formatIndianDate
} from './dateUtils';

export interface ScheduleCalculationResult {
  activities: Activity[];
  projectPlannedStart: string;
  forecastCompletionDate: string;
  criticalPathActivityIds: string[];
  maxTotalFloat: number;
  circularDependencyError?: string;
  warnings: string[];
}

/**
 * Detect cycles in the activity predecessor graph using DFS
 */
export function detectCycle(activities: Activity[]): string | null {
  const adj = new Map<string, string[]>();
  const idSet = new Set<string>();

  for (const act of activities) {
    idSet.add(act.id);
    adj.set(act.id, []);
  }

  for (const act of activities) {
    for (const pred of act.predecessors) {
      if (idSet.has(pred.activityId)) {
        // Predecessor points to current activity in execution flow (pred -> act)
        const list = adj.get(pred.activityId) || [];
        list.push(act.id);
        adj.set(pred.activityId, list);
      }
    }
  }

  const visited = new Map<string, number>(); // 0: unvisited, 1: visiting, 2: visited
  const parent = new Map<string, string>();
  let cyclePath: string[] = [];

  function dfs(u: string): boolean {
    visited.set(u, 1);
    const neighbors = adj.get(u) || [];

    for (const v of neighbors) {
      if (visited.get(v) === 1) {
        // Cycle detected
        cyclePath = [v, u];
        let curr = u;
        while (parent.has(curr) && parent.get(curr) !== v) {
          curr = parent.get(curr)!;
          cyclePath.push(curr);
        }
        cyclePath.push(v);
        cyclePath.reverse();
        return true;
      }
      if (!visited.get(v)) {
        parent.set(v, u);
        if (dfs(v)) return true;
      }
    }

    visited.set(u, 2);
    return false;
  }

  for (const act of activities) {
    if (!visited.get(act.id)) {
      if (dfs(act.id)) {
        return `Circular dependency detected: ${cyclePath.join(' → ')}`;
      }
    }
  }

  return null;
}

/**
 * Topological Sort of activities based on dependencies
 */
export function topologicalSort(activities: Activity[]): Activity[] {
  const inDegree = new Map<string, number>();
  const graph = new Map<string, string[]>();
  const activityMap = new Map<string, Activity>();

  for (const act of activities) {
    activityMap.set(act.id, act);
    inDegree.set(act.id, 0);
    graph.set(act.id, []);
  }

  for (const act of activities) {
    for (const pred of act.predecessors) {
      if (activityMap.has(pred.activityId)) {
        graph.get(pred.activityId)!.push(act.id);
        inDegree.set(act.id, (inDegree.get(act.id) || 0) + 1);
      }
    }
  }

  const queue: string[] = [];
  inDegree.forEach((deg, id) => {
    if (deg === 0) queue.push(id);
  });

  const sorted: Activity[] = [];
  while (queue.length > 0) {
    const u = queue.shift()!;
    sorted.push(activityMap.get(u)!);

    for (const v of graph.get(u) || []) {
      const nextDeg = (inDegree.get(v) || 0) - 1;
      inDegree.set(v, nextDeg);
      if (nextDeg === 0) {
        queue.push(v);
      }
    }
  }

  // If some nodes weren't sorted (e.g. disconnected or cycle), append remainder
  if (sorted.length < activities.length) {
    for (const act of activities) {
      if (!sorted.find(s => s.id === act.id)) {
        sorted.push(act);
      }
    }
  }

  return sorted;
}

/**
 * Core Critical Path Method (CPM) calculation engine
 */
export function calculateSchedule(
  activities: Activity[],
  projectPlannedStart: string,
  calendar: WorkingCalendar
): ScheduleCalculationResult {
  const warnings: string[] = [];
  const cycleError = detectCycle(activities);

  if (cycleError) {
    return {
      activities,
      projectPlannedStart,
      forecastCompletionDate: projectPlannedStart,
      criticalPathActivityIds: [],
      maxTotalFloat: 0,
      circularDependencyError: cycleError,
      warnings: [cycleError]
    };
  }

  const validStart = ensureWorkingDay(projectPlannedStart, calendar);
  const actMap = new Map<string, Activity>();
  const cloned = activities.map(a => ({ ...a, predecessors: [...a.predecessors] }));
  cloned.forEach(a => actMap.set(a.id, a));

  // Verify predecessor references
  for (const act of cloned) {
    for (const pred of act.predecessors) {
      if (!actMap.has(pred.activityId)) {
        warnings.push(`Activity "${act.name}" (${act.id}) references missing predecessor ${pred.activityId}`);
      }
    }
  }

  const sorted = topologicalSort(cloned);

  // 1. FORWARD PASS: Calculate Early Start (ES) and Early Finish (EF)
  for (const act of sorted) {
    const validPreds = act.predecessors.filter(p => actMap.has(p.activityId));
    const duration = Math.max(0, act.plannedDuration || 0);

    if (validPreds.length === 0) {
      // No predecessors: starts at project start or its own baseline start if specified
      act.earlyStart = validStart;
    } else {
      let maxCandidateDate = validStart;

      for (const pred of validPreds) {
        const pAct = actMap.get(pred.activityId)!;
        const lag = pred.lagDays || 0;
        let candidateStart = validStart;

        switch (pred.type) {
          case 'FS': // Finish to Start
            if (lag >= 0) {
              const nextDay = getNextWorkingDay(pAct.earlyFinish, calendar);
              candidateStart = lag === 0 ? nextDay : addWorkingDays(nextDay, lag, calendar);
            } else {
              candidateStart = subtractWorkingDays(pAct.earlyFinish, Math.abs(lag), calendar);
            }
            break;

          case 'SS': // Start to Start
            if (lag >= 0) {
              candidateStart = lag === 0 ? pAct.earlyStart : addWorkingDays(pAct.earlyStart, lag, calendar);
            } else {
              candidateStart = subtractWorkingDays(pAct.earlyStart, Math.abs(lag), calendar);
            }
            break;

          case 'FF': // Finish to Finish
            {
              let candidateFinish = pAct.earlyFinish;
              if (lag > 0) {
                candidateFinish = addWorkingDays(pAct.earlyFinish, lag, calendar);
              } else if (lag < 0) {
                candidateFinish = subtractWorkingDays(pAct.earlyFinish, Math.abs(lag), calendar);
              }
              candidateStart = subtractWorkingDays(candidateFinish, duration, calendar);
            }
            break;

          case 'SF': // Start to Finish
            {
              let candidateFinish = pAct.earlyStart;
              if (lag > 0) {
                candidateFinish = addWorkingDays(pAct.earlyStart, lag, calendar);
              } else if (lag < 0) {
                candidateFinish = subtractWorkingDays(pAct.earlyStart, Math.abs(lag), calendar);
              }
              candidateStart = subtractWorkingDays(candidateFinish, duration, calendar);
            }
            break;
        }

        if (candidateStart > maxCandidateDate) {
          maxCandidateDate = candidateStart;
        }
      }

      act.earlyStart = maxCandidateDate;
    }

    // Calculate Early Finish
    if (duration === 0) {
      act.earlyFinish = act.earlyStart; // Milestone
    } else {
      act.earlyFinish = addWorkingDays(act.earlyStart, duration, calendar);
    }

    // Update current planned dates
    act.currentPlannedStart = act.earlyStart;
    act.currentPlannedFinish = act.earlyFinish;
  }

  // 2. Determine Project Completion Date
  let projectFinishDate = validStart;
  for (const act of cloned) {
    if (act.earlyFinish > projectFinishDate) {
      projectFinishDate = act.earlyFinish;
    }
  }

  // Build successors map for backward pass
  const succMap = new Map<string, { succId: string; type: string; lag: number }[]>();
  cloned.forEach(a => succMap.set(a.id, []));

  for (const act of cloned) {
    for (const pred of act.predecessors) {
      if (succMap.has(pred.activityId)) {
        succMap.get(pred.activityId)!.push({
          succId: act.id,
          type: pred.type,
          lag: pred.lagDays || 0
        });
      }
    }
  }

  // 3. BACKWARD PASS: Calculate Late Finish (LF) and Late Start (LS)
  const reverseSorted = [...sorted].reverse();

  for (const act of reverseSorted) {
    const successors = succMap.get(act.id) || [];
    const duration = Math.max(0, act.plannedDuration || 0);

    if (successors.length === 0) {
      act.lateFinish = projectFinishDate;
    } else {
      let minLateFinish = projectFinishDate;

      for (const edge of successors) {
        const sAct = actMap.get(edge.succId)!;
        let candidateLF = projectFinishDate;

        switch (edge.type) {
          case 'FS': // act finish determines succ start
            {
              const prevDay = getPreviousWorkingDay(sAct.lateStart, calendar);
              candidateLF = edge.lag === 0 ? prevDay : subtractWorkingDays(prevDay, edge.lag, calendar);
            }
            break;

          case 'SS': // act start determines succ start
            {
              let candidateLS = edge.lag === 0 ? sAct.lateStart : subtractWorkingDays(sAct.lateStart, edge.lag, calendar);
              candidateLF = duration === 0 ? candidateLS : addWorkingDays(candidateLS, duration, calendar);
            }
            break;

          case 'FF': // act finish determines succ finish
            {
              candidateLF = edge.lag === 0 ? sAct.lateFinish : subtractWorkingDays(sAct.lateFinish, edge.lag, calendar);
            }
            break;

          case 'SF': // act start determines succ finish
            {
              let candidateLS = edge.lag === 0 ? sAct.lateFinish : subtractWorkingDays(sAct.lateFinish, edge.lag, calendar);
              candidateLF = duration === 0 ? candidateLS : addWorkingDays(candidateLS, duration, calendar);
            }
            break;
        }

        if (candidateLF < minLateFinish) {
          minLateFinish = candidateLF;
        }
      }

      act.lateFinish = minLateFinish;
    }

    if (duration === 0) {
      act.lateStart = act.lateFinish;
    } else {
      act.lateStart = subtractWorkingDays(act.lateFinish, duration, calendar);
    }

    // 4. FLOAT CALCULATION
    // Total Float = Late Finish - Early Finish (in working days)
    const tf = countWorkingDaysBetween(act.earlyFinish, act.lateFinish, calendar);
    act.totalFloat = Math.max(0, tf);

    // Free Float = min over all successors (succ.EarlyStart - NextDay(act.EarlyFinish))
    if (successors.length === 0) {
      act.freeFloat = act.totalFloat;
    } else {
      let minFF = 9999;
      for (const edge of successors) {
        const sAct = actMap.get(edge.succId)!;
        if (edge.type === 'FS') {
          const nextDay = getNextWorkingDay(act.earlyFinish, calendar);
          const gap = countWorkingDaysBetween(nextDay, sAct.earlyStart, calendar) - edge.lag;
          if (gap < minFF) minFF = gap;
        } else if (edge.type === 'FF') {
          const gap = countWorkingDaysBetween(act.earlyFinish, sAct.earlyFinish, calendar) - edge.lag;
          if (gap < minFF) minFF = gap;
        } else {
          if (act.totalFloat < minFF) minFF = act.totalFloat;
        }
      }
      act.freeFloat = Math.max(0, minFF === 9999 ? 0 : minFF);
    }

    // Critical Path: Total Float is 0
    act.isCritical = act.totalFloat <= 0;
  }

  const criticalPathIds = cloned.filter(a => a.isCritical).map(a => a.id);
  const maxFloat = cloned.reduce((max, a) => Math.max(max, a.totalFloat), 0);

  return {
    activities: cloned,
    projectPlannedStart: validStart,
    forecastCompletionDate: projectFinishDate,
    criticalPathActivityIds: criticalPathIds,
    maxTotalFloat: maxFloat,
    warnings
  };
}

/**
 * Find all transitive successors of a given activity
 */
export function getTransitiveSuccessors(activityId: string, activities: Activity[]): string[] {
  const succMap = new Map<string, string[]>();
  activities.forEach(a => succMap.set(a.id, []));

  for (const act of activities) {
    for (const pred of act.predecessors) {
      if (succMap.has(pred.activityId)) {
        succMap.get(pred.activityId)!.push(act.id);
      }
    }
  }

  const visited = new Set<string>();
  const queue = [activityId];

  while (queue.length > 0) {
    const curr = queue.shift()!;
    const succs = succMap.get(curr) || [];
    for (const s of succs) {
      if (!visited.has(s)) {
        visited.add(s);
        queue.push(s);
      }
    }
  }

  return Array.from(visited);
}

/**
 * Simulate delay on a specific activity and compute downstream impact
 */
export function simulateDelay(
  activities: Activity[],
  targetActivityId: string,
  additionalDelayDays: number,
  calendar: WorkingCalendar,
  projectPlannedStart: string
): DelaySimulationResult {
  // Original schedule
  const originalResult = calculateSchedule(activities, projectPlannedStart, calendar);
  const origMap = new Map(originalResult.activities.map(a => [a.id, a]));

  const targetAct = origMap.get(targetActivityId);
  if (!targetAct) {
    throw new Error(`Target activity ${targetActivityId} not found`);
  }

  // Create modified copy with lengthened duration or delayed finish
  const modifiedActivities = activities.map(act => {
    if (act.id === targetActivityId) {
      return {
        ...act,
        plannedDuration: act.plannedDuration + additionalDelayDays
      };
    }
    return { ...act };
  });

  // Calculate new schedule
  const simResult = calculateSchedule(modifiedActivities, projectPlannedStart, calendar);
  const simMap = new Map(simResult.activities.map(a => [a.id, a]));

  const origFinish = originalResult.forecastCompletionDate;
  const simFinish = simResult.forecastCompletionDate;
  const varianceDays = countWorkingDaysBetween(origFinish, simFinish, calendar);

  // Affected successors
  const affectedSuccessorIds = getTransitiveSuccessors(targetActivityId, activities);
  const unaffectedActivityIds = activities
    .map(a => a.id)
    .filter(id => id !== targetActivityId && !affectedSuccessorIds.includes(id));

  // Float changes analysis
  const floatChanges = activities.map(act => {
    const oldAct = origMap.get(act.id)!;
    const newAct = simMap.get(act.id)!;
    const floatErosion = oldAct.totalFloat - newAct.totalFloat;

    return {
      activityId: act.id,
      activityName: act.name,
      oldTotalFloat: oldAct.totalFloat,
      newTotalFloat: newAct.totalFloat,
      floatErosion,
      nowCritical: newAct.isCritical && !oldAct.isCritical
    };
  }).filter(fc => fc.floatErosion > 0 || fc.nowCritical || fc.activityId === targetActivityId);

  // At-risk milestones
  const atRiskMilestones = activities
    .filter(a => a.isMilestone && (affectedSuccessorIds.includes(a.id) || a.id === targetActivityId))
    .map(m => {
      const oldM = origMap.get(m.id)!;
      const newM = simMap.get(m.id)!;
      const delay = countWorkingDaysBetween(oldM.earlyFinish, newM.earlyFinish, calendar);
      return {
        activityId: m.id,
        name: m.name,
        originalDate: oldM.earlyFinish,
        simulatedDate: newM.earlyFinish,
        delayDays: delay
      };
    })
    .filter(m => m.delayDays > 0);

  // Check if critical path changed
  const origCrit = new Set(originalResult.criticalPathActivityIds);
  const simCrit = new Set(simResult.criticalPathActivityIds);
  let criticalPathChanged = origCrit.size !== simCrit.size;
  if (!criticalPathChanged) {
    for (const id of origCrit) {
      if (!simCrit.has(id)) {
        criticalPathChanged = true;
        break;
      }
    }
  }

  return {
    simulatedActivityId: targetActivityId,
    additionalDelayDays,
    originalFinishDate: origFinish,
    simulatedFinishDate: simFinish,
    projectFinishVarianceDays: varianceDays,
    isProjectDelayed: varianceDays > 0,
    criticalPathChanged,
    affectedSuccessorIds,
    unaffectedActivityIds,
    floatChanges,
    atRiskMilestones,
    revisedSchedule: simResult.activities
  };
}
