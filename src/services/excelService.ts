import * as XLSX from 'xlsx';
import { Project, Activity } from '../types';
import { formatIndianDate, calendarDaysBetween, parseToIsoDate } from './dateUtils';

/**
 * Helper to build an ASCII progress bar for Excel cells
 */
function buildAsciiProgressBar(percent: number): string {
  const p = Math.max(0, Math.min(100, Math.round(percent)));
  const filled = Math.round(p / 10);
  const empty = 10 - filled;
  return `[${'■'.repeat(filled)}${'·'.repeat(empty)}] ${p}%`;
}

/**
 * Export complete project with an attractive, professional Executive Dashboard sheet
 */
export function exportProjectToExcel(project: Project): void {
  const wb = XLSX.utils.book_new();

  // Metrics computation
  const totalActivities = project.activities.length;
  const completedActivities = project.activities.filter(a => a.status === 'COMPLETED').length;
  const inProgressActivities = project.activities.filter(a => a.status === 'IN_PROGRESS').length;
  const criticalActivities = project.activities.filter(a => a.isCritical);
  const delayedActivities = project.activities.filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK');

  // Overall physical progress
  const totalPhysicalProgress = totalActivities > 0
    ? Math.round(project.activities.reduce((sum, a) => sum + (a.progressPercent || 0), 0) / totalActivities)
    : 0;

  // Planned progress
  const startD = new Date(project.plannedStartDate).getTime();
  const finishD = new Date(project.plannedFinishDate).getTime();
  const nowD = new Date().getTime();
  let plannedProgressPercent = 0;
  if (finishD > startD) {
    const elapsed = Math.max(0, nowD - startD);
    plannedProgressPercent = Math.min(100, Math.round((elapsed / (finishD - startD)) * 100));
  }

  // Calculate true forecast finish date from CPM schedule
  const forecastFinishDate = project.activities.reduce((maxDate, act) => {
    const finish = act.earlyFinish || act.currentPlannedFinish || act.baselineFinish;
    return finish && finish > maxDate ? finish : maxDate;
  }, project.plannedFinishDate);

  const scheduleVarianceDays = calendarDaysBetween(project.plannedFinishDate, forecastFinishDate);

  // Open Constraints from blocks & activities
  const openConstraints: { source: string; item: string; owner: string; date: string; status: string; isCritical: boolean }[] = [];
  project.blocks.forEach(b => {
    b.readinessChecks.forEach(c => {
      if (c.status === 'BLOCKED' || c.status === 'PENDING') {
        openConstraints.push({
          source: `${b.name} (${c.category})`,
          item: c.blockingReason || c.title,
          owner: c.responsiblePerson,
          date: c.targetResolutionDate,
          status: c.status,
          isCritical: false
        });
      }
    });
  });
  delayedActivities.forEach(a => {
    if (a.delayReason) {
      openConstraints.push({
        source: `${a.id} - ${a.name}`,
        item: a.delayReason,
        owner: a.responsiblePerson,
        date: a.earlyFinish || a.currentPlannedFinish,
        status: a.status,
        isCritical: a.isCritical
      });
    }
  });

  // =========================================================================
  // 1. EXECUTIVE DASHBOARD SHEET (ATTRACTIVE VISUALIZATION)
  // =========================================================================
  const dashRows: (string | number)[][] = [
    ['SWELECT ENERGY SYSTEMS LIMITED'],
    ['GROUND-MOUNTED SOLAR EPC PROJECT - EXECUTIVE CONTROL DASHBOARD'],
    ['Report Generated:', new Date().toLocaleString('en-IN'), '', 'Working Calendar:', project.calendar.name, '', 'Baseline Revision:', `Rev ${project.activeBaselineRevision}`],
    [],
    ['1. PROJECT PROFILE & CONTRACTUAL SPECIFICATIONS', '', '', '', '', '', '', ''],
    ['Attribute', 'Project Value', '', 'Technical Parameter', 'Specification', '', 'Planning Parameter', 'Value'],
    ['Project Name', project.name, '', 'DC Capacity (MWp)', `${project.dcCapacityMW} MWp`, '', 'Planned Start Date', formatIndianDate(project.plannedStartDate)],
    ['Project ID', project.id, '', 'AC Capacity (MWac)', `${project.acCapacityMW} MWac`, '', 'Baseline Finish (COD)', formatIndianDate(project.plannedFinishDate)],
    ['Project Code', project.code || project.id, '', 'Plant Land Area', `${project.areaAcres} Acres`, '', 'Current Forecast Finish', formatIndianDate(forecastFinishDate)],
    ['Location / Site', project.location, '', 'Project State', project.state, '', 'Schedule Variance (Days)', scheduleVarianceDays > 0 ? `+${scheduleVarianceDays} Days (Delayed)` : scheduleVarianceDays < 0 ? `${scheduleVarianceDays} Days (Ahead)` : 'On Schedule (0 Days)'],
    ['Project Manager', project.projectManager, '', 'District / Address', `${project.district}, ${project.address}`, '', 'Project Execution Health', scheduleVarianceDays <= 0 && delayedActivities.length === 0 ? 'HEALTHY & ON TRACK' : scheduleVarianceDays > 0 ? 'DELAYED - CRITICAL' : 'AT RISK'],
    [],
    ['2. HIGH-LEVEL EXECUTIVE SCORECARD & KPI OVERVIEW', '', '', '', '', '', '', ''],
    ['Key Performance Indicator', 'Baseline / Target', 'Current Actual / Forecast', 'Variance', 'Health Status', 'Visual Status Metric'],
    [
      'Overall Physical Progress',
      `${plannedProgressPercent}% Planned`,
      `${totalPhysicalProgress}% Actual`,
      totalPhysicalProgress >= plannedProgressPercent ? `+${totalPhysicalProgress - plannedProgressPercent}% Ahead` : `${totalPhysicalProgress - plannedProgressPercent}% Lagging`,
      totalPhysicalProgress >= plannedProgressPercent ? 'ON TARGET' : 'BEHIND SCHEDULE',
      buildAsciiProgressBar(totalPhysicalProgress)
    ],
    [
      'COD Completion Date',
      formatIndianDate(project.plannedFinishDate),
      formatIndianDate(forecastFinishDate),
      scheduleVarianceDays === 0 ? '0 Days' : `${scheduleVarianceDays > 0 ? `+${scheduleVarianceDays}` : scheduleVarianceDays} Days`,
      scheduleVarianceDays <= 0 ? 'ON TARGET' : 'CRITICAL DELAY',
      scheduleVarianceDays <= 0 ? '✔ ON SCHEDULE' : '⚠ DELAY MITIGATION NEEDED'
    ],
    [
      'Critical Path Activities',
      '0 Float Tolerance',
      `${criticalActivities.length} Activities`,
      `${Math.round((criticalActivities.length / Math.max(1, totalActivities)) * 100)}% of total scope`,
      criticalActivities.some(a => a.status === 'BLOCKED' || a.status === 'AT_RISK') ? 'CRITICAL DELAY' : 'MONITORED',
      `${criticalActivities.length} zero-float items`
    ],
    [
      'Delayed / Blocked Activities',
      '0 Activities Allowed',
      `${delayedActivities.length} Activities`,
      `${Math.round((delayedActivities.length / Math.max(1, totalActivities)) * 100)}% of activities`,
      delayedActivities.length === 0 ? 'CLEAR' : 'ATTENTION REQUIRED',
      delayedActivities.length === 0 ? '✔ ZERO DELAYS' : `⚠ ${delayedActivities.length} BLOCKED`
    ],
    [
      'Workfront Execution Constraints',
      '0 Roadblocks Allowed',
      `${openConstraints.length} Open Constraints`,
      `${project.blocks.filter(b => b.status === 'BLOCKED').length} Blocks Blocked`,
      openConstraints.length === 0 ? 'WORKFRONT CLEAR' : 'CONSTRAINTS ACTIVE',
      openConstraints.length === 0 ? '✔ 100% READY' : `⚠ ${openConstraints.length} ACTIVE CONSTRAINTS`
    ],
    [
      'Scope Execution Status',
      `${totalActivities} Total Scope Activities`,
      `${completedActivities} Completed / ${inProgressActivities} In Progress`,
      `${totalActivities - completedActivities} Remaining`,
      `${Math.round((completedActivities / Math.max(1, totalActivities)) * 100)}% Complete`,
      buildAsciiProgressBar((completedActivities / Math.max(1, totalActivities)) * 100)
    ],
    [],
    ['3. PHASE-WISE WBS EXECUTION BREAKDOWN (SWELECT SOLAR EPC MASTER SCHEDULE)', '', '', '', '', '', '', ''],
    ['WBS ID', 'EPC Phase / Activity Category', 'Total Tasks', 'Completed', 'In-Progress', 'Critical Tasks', 'Physical %', 'Phase Health', 'Visual Progress Bar']
  ];

  // Populate WBS Phase Rows
  project.wbsNodes.forEach(node => {
    const acts = project.activities.filter(a => a.wbsId === node.id);
    const completed = acts.filter(a => a.status === 'COMPLETED').length;
    const inProg = acts.filter(a => a.status === 'IN_PROGRESS').length;
    const crit = acts.filter(a => a.isCritical).length;
    const blocked = acts.filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK').length;
    const progress = acts.length > 0 ? Math.round(acts.reduce((s, a) => s + (a.progressPercent || 0), 0) / acts.length) : 0;
    
    let health = 'ON TRACK';
    if (progress === 100) health = 'COMPLETED';
    else if (blocked > 0) health = 'BLOCKED / AT RISK';
    else if (crit > 0 && progress < 10) health = 'CRITICAL MONITOR';

    dashRows.push([
      node.code || node.id,
      node.name,
      acts.length,
      completed,
      inProg,
      crit,
      `${progress}%`,
      health,
      buildAsciiProgressBar(progress)
    ]);
  });

  // Section 4: Critical Path Schedule (Zero Float)
  dashRows.push([]);
  dashRows.push(['4. CRITICAL PATH ACTIVITIES (ZERO FLOAT - DICTATING PROJECT COMPLETION DATE)', '', '', '', '', '', '', '']);
  dashRows.push(['Activity ID', 'Task / Activity Name', 'WBS Category', 'Duration (Days)', 'Baseline Start', 'Baseline Finish', 'Forecast Finish', 'Predecessors', 'Progress %', 'Status', 'Responsible Lead']);

  criticalActivities.slice(0, 25).forEach(act => {
    const wbsNode = project.wbsNodes.find(n => n.id === act.wbsId);
    const predStr = act.predecessors.map(p => `${p.activityId}(${p.type}${p.lagDays ? `+${p.lagDays}d` : ''})`).join(', ');
    dashRows.push([
      act.id,
      act.name,
      wbsNode?.name || act.wbsId,
      act.plannedDuration,
      formatIndianDate(act.baselineStart),
      formatIndianDate(act.baselineFinish),
      formatIndianDate(act.earlyFinish || act.currentPlannedFinish),
      predStr || 'Start of Project',
      `${act.progressPercent}%`,
      act.status,
      act.responsiblePerson
    ]);
  });

  // Section 5: Delayed / At-Risk & Open Constraints Log
  dashRows.push([]);
  dashRows.push(['5. OPEN WORKFRONT CONSTRAINTS & EXECUTION BOTTLENECKS', '', '', '', '', '', '', '']);
  dashRows.push(['Source / Workfront Reference', 'Constraint Description / Reason for Delay', 'Severity / Status', 'Assigned Owner', 'Target Resolution Date', 'Critical Path Impact']);

  if (openConstraints.length === 0) {
    dashRows.push(['All Site Workfronts', 'No active blocking constraints reported. All workfronts cleared.', 'CLEARED', 'Project Team', '-', 'Zero downstream delay']);
  } else {
    openConstraints.forEach(c => {
      dashRows.push([
        c.source,
        c.item,
        c.status,
        c.owner,
        formatIndianDate(c.date),
        c.isCritical ? 'DIRECT COD DELAY (CRITICAL PATH)' : 'Non-critical buffer absorption'
      ]);
    });
  }

  // Section 6: Block-wise Readiness
  dashRows.push([]);
  dashRows.push(['6. BLOCK-WISE WORKFRONT READINESS & PROGRESS SUMMARY', '', '', '', '', '', '', '']);
  dashRows.push(['Block ID', 'Block Name', 'Zone Code', 'Capacity (MWp)', 'Planned Progress', 'Actual Progress', 'Readiness Status', 'Blocked Clearance Checks']);

  project.blocks.forEach(b => {
    const blockedChecks = b.readinessChecks.filter(c => c.status === 'BLOCKED');
    dashRows.push([
      b.id,
      b.name,
      b.zoneCode,
      `${b.capacityMWp} MWp`,
      `${b.plannedProgress}%`,
      `${b.actualProgress}%`,
      b.status,
      blockedChecks.length > 0 ? blockedChecks.map(c => c.title).join('; ') : 'All mandatory clearances satisfied'
    ]);
  });

  // Section 7: Key Project Milestones
  dashRows.push([]);
  dashRows.push(['7. KEY PROJECT MILESTONES & STATUTORY APPROVALS', '', '', '', '', '', '', '']);
  dashRows.push(['Milestone ID', 'Milestone Name', 'Baseline Target Date', 'Forecast CPM Date', 'Variance', 'Status', 'Responsible Lead']);

  const milestones = project.activities.filter(a => a.isMilestone);
  milestones.forEach(m => {
    const varDays = calendarDaysBetween(m.baselineFinish, m.earlyFinish || m.currentPlannedFinish);
    dashRows.push([
      m.id,
      m.name,
      formatIndianDate(m.baselineFinish),
      formatIndianDate(m.earlyFinish || m.currentPlannedFinish),
      varDays === 0 ? 'On Target' : `${varDays > 0 ? `+${varDays}` : varDays} Days`,
      m.status,
      m.responsiblePerson
    ]);
  });

  const wsDash = XLSX.utils.aoa_to_sheet(dashRows);

  // Set visual column widths for the Dashboard sheet
  wsDash['!cols'] = [
    { wch: 16 }, // A: ID / Code / Attribute
    { wch: 44 }, // B: Name / Title
    { wch: 22 }, // C: WBS / Category / Info
    { wch: 18 }, // D: Parameter / Duration / Start
    { wch: 18 }, // E: Value / Finish / Actual
    { wch: 18 }, // F: Parameter / Target / Variance
    { wch: 24 }, // G: Predecessors / Resp / Health
    { wch: 16 }, // H: Progress % / Status
    { wch: 24 }, // I: Progress Bar / Impact
    { wch: 20 }, // J: Extra
    { wch: 20 }  // K: Extra
  ];

  XLSX.utils.book_append_sheet(wb, wsDash, 'Executive Dashboard');

  // =========================================================================
  // 2. MASTER SCHEDULE & CPM SHEET (FULLY SYNCHRONIZED WITH USER EDITABLE COLUMNS)
  // =========================================================================
  const scheduleHeaders = [
    'Activity ID',
    'Task Name',
    'WBS ID',
    'Duration',
    'Start',
    'Finish',
    'Predecessors',
    '% Complete',
    'Status',
    'Early Start (ES)',
    'Early Finish (EF)',
    'Late Start (LS)',
    'Late Finish (LF)',
    'Total Float',
    'Free Float',
    'Critical Path?',
    'Responsible Team',
    'Responsible Person',
    'Delay Reason'
  ];

  const scheduleRows = project.activities.map(act => {
    const predStr = act.predecessors
      .map(p => `${p.activityId}${p.type !== 'FS' ? p.type : ''}${p.lagDays ? (p.lagDays > 0 ? `+${p.lagDays}d` : `${p.lagDays}d`) : ''}`)
      .join(', ');

    return [
      act.id,
      act.name,
      act.wbsId,
      act.plannedDuration,
      formatIndianDate(act.baselineStart),
      formatIndianDate(act.baselineFinish),
      predStr,
      `${act.progressPercent}%`,
      act.status,
      formatIndianDate(act.earlyStart || act.currentPlannedStart),
      formatIndianDate(act.earlyFinish || act.currentPlannedFinish),
      formatIndianDate(act.lateStart),
      formatIndianDate(act.lateFinish),
      act.totalFloat ?? 0,
      act.freeFloat ?? 0,
      act.isCritical ? 'YES' : 'NO',
      act.responsibleTeam,
      act.responsiblePerson,
      act.delayReason || ''
    ];
  });

  const wsSchedule = XLSX.utils.aoa_to_sheet([scheduleHeaders, ...scheduleRows]);
  wsSchedule['!cols'] = [
    { wch: 16 }, // Activity ID
    { wch: 45 }, // Task Name
    { wch: 16 }, // WBS ID
    { wch: 12 }, // Duration
    { wch: 14 }, // Start
    { wch: 14 }, // Finish
    { wch: 22 }, // Predecessors
    { wch: 14 }, // % Complete
    { wch: 16 }, // Status
    { wch: 16 }, // ES
    { wch: 16 }, // EF
    { wch: 16 }, // LS
    { wch: 16 }, // LF
    { wch: 12 }, // TF
    { wch: 12 }, // FF
    { wch: 14 }, // Critical
    { wch: 20 }, // Team
    { wch: 20 }, // Person
    { wch: 30 }  // Delay Reason
  ];
  XLSX.utils.book_append_sheet(wb, wsSchedule, 'WBS & Schedule CPM');

  // =========================================================================
  // 3. WORKFRONT READINESS SHEET
  // =========================================================================
  const blockHeaders = [
    'Block ID',
    'Block Name',
    'Zone Code',
    'Capacity (MWp)',
    'Area (Acres)',
    'Planned %',
    'Actual %',
    'Readiness Status',
    'Check Item ID',
    'Check Category',
    'Check Item Description',
    'Mandatory?',
    'Check Status',
    'Blocking Reason / Constraint',
    'Responsible Person',
    'Target Resolution Date'
  ];

  const blockRows: (string | number)[][] = [];
  project.blocks.forEach(block => {
    if (!block.readinessChecks || block.readinessChecks.length === 0) {
      blockRows.push([
        block.id,
        block.name,
        block.zoneCode,
        block.capacityMWp,
        block.areaAcres,
        block.plannedProgress,
        block.actualProgress,
        block.status,
        '-', '-', '-', '-', '-', '-', block.responsiblePerson, block.targetResolutionDate ? formatIndianDate(block.targetResolutionDate) : '-'
      ]);
    } else {
      block.readinessChecks.forEach(check => {
        blockRows.push([
          block.id,
          block.name,
          block.zoneCode,
          block.capacityMWp,
          block.areaAcres,
          block.plannedProgress,
          block.actualProgress,
          block.status,
          check.id,
          check.category,
          check.title,
          check.isMandatory ? 'YES' : 'NO',
          check.status,
          check.blockingReason || '-',
          check.responsiblePerson,
          formatIndianDate(check.targetResolutionDate)
        ]);
      });
    }
  });

  const wsBlocks = XLSX.utils.aoa_to_sheet([blockHeaders, ...blockRows]);
  wsBlocks['!cols'] = [
    { wch: 12 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 14 },
    { wch: 12 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 18 },
    { wch: 35 }, { wch: 12 }, { wch: 14 }, { wch: 35 }, { wch: 22 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsBlocks, 'Workfront Readiness');

  // =========================================================================
  // 4. QUANTITY-BASED PROGRESS TRACKER SHEET
  // =========================================================================
  const qtyHeaders = [
    'Activity ID',
    'Activity Name',
    'Unit of Measure',
    'Total Planned Quantity',
    'Completed Quantity',
    'Remaining Quantity',
    'Physical Progress %',
    'Status',
    'Responsible Person',
    'Last Update Date'
  ];

  const qtyRows = project.activities
    .filter(a => a.totalPlannedQuantity !== undefined && a.totalPlannedQuantity > 0)
    .map(act => {
      const planned = act.totalPlannedQuantity || 0;
      const completed = act.completedQuantity || 0;
      const remaining = planned - completed;
      const physPercent = planned > 0 ? ((completed / planned) * 100).toFixed(1) : '0.0';

      return [
        act.id,
        act.name,
        act.quantityUnit || 'Nos',
        planned,
        completed,
        remaining,
        `${physPercent}%`,
        act.status,
        act.responsiblePerson,
        formatIndianDate(act.progressUpdateDate)
      ];
    });

  const wsQty = XLSX.utils.aoa_to_sheet([qtyHeaders, ...qtyRows]);
  wsQty['!cols'] = [
    { wch: 14 }, { wch: 40 }, { wch: 16 }, { wch: 20 }, { wch: 20 },
    { wch: 20 }, { wch: 18 }, { wch: 16 }, { wch: 22 }, { wch: 16 }
  ];
  XLSX.utils.book_append_sheet(wb, wsQty, 'Quantity Progress');

  // =========================================================================
  // 5. OPEN CONSTRAINTS & DELAYS LOG
  // =========================================================================
  const delayHeaders = [
    'Activity ID',
    'Activity Name',
    'Status',
    'Delay Reason / Execution Constraint',
    'Total Float (Days)',
    'Critical Path Impact',
    'Responsible Person',
    'Target Resolution Date'
  ];

  const delayRows = project.activities
    .filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK' || a.delayReason)
    .map(act => [
      act.id,
      act.name,
      act.status,
      act.delayReason || 'Unspecified delay / constraint',
      act.totalFloat ?? 0,
      act.isCritical ? 'DIRECT CRITICAL PATH DELAY' : `Has ${act.totalFloat} days schedule buffer`,
      act.responsiblePerson,
      formatIndianDate(act.progressUpdateDate)
    ]);

  const wsDelays = XLSX.utils.aoa_to_sheet([delayHeaders, ...delayRows]);
  wsDelays['!cols'] = [
    { wch: 14 }, { wch: 40 }, { wch: 16 }, { wch: 40 },
    { wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 18 }
  ];
  XLSX.utils.book_append_sheet(wb, wsDelays, 'Delay & Constraints Log');

  // Generate file name
  const safeName = project.name.replace(/[^a-zA-Z0-9-_]/g, '_');
  const fileName = `${safeName}_${project.dcCapacityMW}MWp_Executive_Dashboard_${new Date().toISOString().slice(0, 10)}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Smart parser for uploaded Excel files (supports imported schedules, exported sheets, MS Project/Primavera tables)
 */
export function parseActivitiesFromExcel(file: File): Promise<Partial<Activity>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Find the best worksheet: check for 'WBS & Schedule CPM', 'Schedule', 'Tasks', or first sheet
        let targetSheetName = workbook.SheetNames[0];
        for (const name of workbook.SheetNames) {
          const lower = name.toLowerCase();
          if (lower.includes('schedule') || lower.includes('wbs') || lower.includes('activities') || lower.includes('tasks')) {
            targetSheetName = name;
            break;
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const activities: Partial<Activity>[] = json.map((row, index) => {
          // Task Name / Activity Name
          const name = row['Task Name'] || row['Activity Name'] || row['Name'] || row['Task'] || `Activity ${index + 1}`;
          
          // Activity ID
          const id = String(row['Activity ID'] || row['ID'] || row['Task ID'] || `ACT-${(index + 1).toString().padStart(3, '0')}`).trim();
          
          // WBS ID
          const wbsId = row['WBS ID'] || row['WBS'] || 'WBS-LAND';

          // Duration
          const rawDuration = row['Duration'] || row['Planned Duration'] || row['Planned Duration (Days)'] || 5;
          const plannedDuration = Number(String(rawDuration).replace(/[^0-9.]/g, '')) || 0;

          // % Complete
          const rawProgress = row['% Complete'] || row['Progress %'] || row['Progress'] || row['Complete Status'] || 0;
          let progressPercent = Number(String(rawProgress).replace(/[^0-9.]/g, '')) || 0;
          if (progressPercent > 100) progressPercent = 100;

          // Status
          let status: Activity['status'] = 'NOT_STARTED';
          const rawStatus = String(row['Status'] || '').toUpperCase();
          if (progressPercent >= 100 || rawStatus === 'COMPLETED') {
            status = 'COMPLETED';
            progressPercent = 100;
          } else if (rawStatus === 'BLOCKED') {
            status = 'BLOCKED';
          } else if (rawStatus === 'AT_RISK') {
            status = 'AT_RISK';
          } else if (progressPercent > 0 || rawStatus === 'IN_PROGRESS') {
            status = 'IN_PROGRESS';
          }

          // Dates
          const rawStart = row['Start'] || row['Start Date'] || row['Baseline Start'];
          const rawFinish = row['Finish'] || row['Finish Date'] || row['Baseline Finish'];
          const baselineStart = rawStart ? parseToIsoDate(String(rawStart)) : undefined;
          const baselineFinish = rawFinish ? parseToIsoDate(String(rawFinish)) : undefined;

          // Predecessors
          const rawPred = String(row['Predecessors'] || row['Predecessor'] || '').trim();
          const predecessors: Activity['predecessors'] = [];
          if (rawPred && rawPred !== '-') {
            const parts = rawPred.split(/[,;]/);
            for (const part of parts) {
              const cleanPart = part.trim();
              if (cleanPart) {
                // Match ID and optional relationship e.g. "3SS+5", "ACT-005"
                const match = cleanPart.match(/^([A-Za-z0-9-_]+)(FS|SS|FF|SF)?([+-]?\d+)?/i);
                if (match) {
                  predecessors.push({
                    activityId: match[1],
                    type: (match[2]?.toUpperCase() as any) || 'FS',
                    lagDays: match[3] ? parseInt(match[3], 10) : 0
                  });
                }
              }
            }
          }

          return {
            id,
            name,
            wbsId,
            plannedDuration,
            baselineStart,
            baselineFinish,
            progressPercent,
            status,
            responsibleTeam: row['Responsible Team'] || row['Team'] || 'Site Execution',
            responsiblePerson: row['Responsible Person'] || row['Owner'] || 'Site Engineer',
            isMilestone: Boolean(plannedDuration === 0 || row['Is Milestone'] === 'YES' || row['Is Milestone'] === true),
            predecessors
          };
        });

        resolve(activities);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Smart parser that extracts both Project Metadata (State, District, Capacity, Location) and Activities
 */
export function parseProjectFromExcel(file: File): Promise<{ projectData: Partial<Project>; activities: Partial<Activity>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const projectData: Partial<Project> = {};

        // 1. Try to read from Executive Dashboard or Project Summary sheet
        const metaSheetName = workbook.SheetNames.find(n => 
          n.toLowerCase().includes('dashboard') || 
          n.toLowerCase().includes('summary') || 
          n.toLowerCase().includes('project')
        );

        if (metaSheetName) {
          const ws = workbook.Sheets[metaSheetName];
          const rawRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1 });
          
          for (const row of rawRows) {
            if (!row || row.length < 2) continue;
            for (let c = 0; c < row.length - 1; c++) {
              const label = String(row[c] || '').trim().toLowerCase();
              const val = row[c + 1];
              if (!val) continue;

              if (label === 'project name' || label === 'project:') {
                projectData.name = String(val).trim();
              } else if (label === 'project id' || label === 'project code') {
                projectData.id = String(val).trim();
                projectData.code = String(val).trim();
              } else if (label.includes('location') || label.includes('solar park')) {
                projectData.location = String(val).trim();
              } else if (label.includes('state / district') || label.includes('state')) {
                const sVal = String(val).trim();
                if (sVal.includes(',')) {
                  const parts = sVal.split(',').map(p => p.trim());
                  projectData.state = parts[0];
                  projectData.district = parts[1];
                } else {
                  projectData.state = sVal;
                }
              } else if (label.includes('district')) {
                projectData.district = String(val).trim();
              } else if (label.includes('dc capacity')) {
                projectData.dcCapacityMW = Number(String(val).replace(/[^0-9.]/g, '')) || 0;
              } else if (label.includes('ac capacity')) {
                projectData.acCapacityMW = Number(String(val).replace(/[^0-9.]/g, '')) || 0;
              } else if (label.includes('land area') || label.includes('acres')) {
                projectData.areaAcres = Number(String(val).replace(/[^0-9.]/g, '')) || 0;
              } else if (label.includes('planned start date') || label === 'start date') {
                projectData.plannedStartDate = parseToIsoDate(String(val));
              } else if (label.includes('baseline finish') || label === 'finish date') {
                projectData.plannedFinishDate = parseToIsoDate(String(val));
              } else if (label.includes('project manager')) {
                projectData.projectManager = String(val).trim();
              }
            }
          }
        }

        // 2. Parse Activities from Schedule sheet
        let targetSheetName = workbook.SheetNames[0];
        for (const name of workbook.SheetNames) {
          const lower = name.toLowerCase();
          if (lower.includes('schedule') || lower.includes('wbs') || lower.includes('activities') || lower.includes('tasks')) {
            targetSheetName = name;
            break;
          }
        }

        const worksheet = workbook.Sheets[targetSheetName];
        const json: any[] = XLSX.utils.sheet_to_json(worksheet);

        const activities: Partial<Activity>[] = json.map((row, index) => {
          const name = row['Task Name'] || row['Activity Name'] || row['Name'] || row['Task'] || `Activity ${index + 1}`;
          const id = String(row['Activity ID'] || row['ID'] || row['Task ID'] || `ACT-${(index + 1).toString().padStart(3, '0')}`).trim();
          const wbsId = row['WBS ID'] || row['WBS'] || 'WBS-LAND';
          const rawDuration = row['Duration'] || row['Planned Duration'] || row['Planned Duration (Days)'] || 5;
          const plannedDuration = Number(String(rawDuration).replace(/[^0-9.]/g, '')) || 0;
          const rawProgress = row['% Complete'] || row['Progress %'] || row['Progress'] || row['Complete Status'] || 0;
          let progressPercent = Number(String(rawProgress).replace(/[^0-9.]/g, '')) || 0;
          if (progressPercent > 100) progressPercent = 100;

          let status: Activity['status'] = 'NOT_STARTED';
          const rawStatus = String(row['Status'] || '').toUpperCase();
          if (progressPercent >= 100 || rawStatus === 'COMPLETED') {
            status = 'COMPLETED';
            progressPercent = 100;
          } else if (rawStatus === 'BLOCKED') {
            status = 'BLOCKED';
          } else if (rawStatus === 'AT_RISK') {
            status = 'AT_RISK';
          } else if (progressPercent > 0 || rawStatus === 'IN_PROGRESS') {
            status = 'IN_PROGRESS';
          }

          const rawStart = row['Start'] || row['Start Date'] || row['Baseline Start'];
          const rawFinish = row['Finish'] || row['Finish Date'] || row['Baseline Finish'];
          const baselineStart = rawStart ? parseToIsoDate(String(rawStart)) : undefined;
          const baselineFinish = rawFinish ? parseToIsoDate(String(rawFinish)) : undefined;

          const rawPred = String(row['Predecessors'] || row['Predecessor'] || '').trim();
          const predecessors: Activity['predecessors'] = [];
          if (rawPred && rawPred !== '-') {
            const parts = rawPred.split(/[,;]/);
            for (const part of parts) {
              const cleanPart = part.trim();
              if (cleanPart) {
                const match = cleanPart.match(/^([A-Za-z0-9-_]+)(FS|SS|FF|SF)?([+-]?\d+)?/i);
                if (match) {
                  predecessors.push({
                    activityId: match[1],
                    type: (match[2]?.toUpperCase() as any) || 'FS',
                    lagDays: match[3] ? parseInt(match[3], 10) : 0
                  });
                }
              }
            }
          }

          return {
            id,
            name,
            wbsId,
            plannedDuration,
            baselineStart,
            baselineFinish,
            progressPercent,
            status,
            responsibleTeam: row['Responsible Team'] || row['Team'] || 'Site Execution',
            responsiblePerson: row['Responsible Person'] || row['Owner'] || 'Site Engineer',
            isMilestone: Boolean(plannedDuration === 0 || row['Is Milestone'] === 'YES' || row['Is Milestone'] === true),
            predecessors
          };
        });

        resolve({ projectData, activities });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
