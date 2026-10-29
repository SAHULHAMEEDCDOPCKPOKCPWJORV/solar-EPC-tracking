import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Project,
  Activity,
  WBSNode,
  Block,
  UserProfile,
  DelaySimulationResult,
  RecoveryScenario,
  WorkfrontCheckItem
} from '../types';
import { calculateSchedule, simulateDelay } from '../services/cpmEngine';
import {
  createReferenceSolarProject,
  DEFAULT_WORKING_CALENDAR,
  STANDARD_WBS_CATEGORIES,
  createStandardBlocks,
  generateProjectActivitiesForTimeline,
  SWELECT_WBS_NODES
} from '../services/sampleSolarProject';

interface ProjectContextType {
  user: UserProfile | null;
  login: (email: string, password: string) => boolean;
  logout: () => void;

  projects: Project[];
  currentProject: Project | null;
  setCurrentProjectId: (id: string) => void;
  createProject: (data: Partial<Project>) => Project;
  updateProjectDetails: (data: Partial<Project>) => void;
  realignEntireSchedule: (startDate?: string) => void;
  loadDemoProject: () => void;
  deleteCurrentProject: () => void;

  // Activities & Schedule
  updateActivity: (id: string, updates: Partial<Activity>) => void;
  addActivity: (activity: Omit<Activity, 'earlyStart' | 'earlyFinish' | 'lateStart' | 'lateFinish' | 'totalFloat' | 'freeFloat' | 'isCritical' | 'currentPlannedStart' | 'currentPlannedFinish'>) => void;
  deleteActivity: (id: string) => void;
  reorderActivities: (activities: Activity[]) => void;
  importActivities: (imported: Partial<Activity>[]) => void;

  // WBS
  addWBSNode: (name: string, code: string) => void;
  updateWBSNode: (id: string, name: string) => void;
  deleteWBSNode: (id: string) => void;
  generateStandardWBS: () => void;

  // Baselines
  createBaselineRevision: (name: string, notes: string) => void;

  // Workfront Blocks
  addBlock: (block: Omit<Block, 'id'>) => void;
  updateBlock: (blockId: string, updates: Partial<Block>) => void;
  deleteBlock: (blockId: string) => void;
  updateReadinessCheck: (blockId: string, checkId: string, updates: Partial<WorkfrontCheckItem>) => void;
  addReadinessCheck: (blockId: string, check: Omit<WorkfrontCheckItem, 'id'>) => void;

  // Delay & Recovery
  delaySimulationResult: DelaySimulationResult | null;
  setDelaySimulationResult: (res: DelaySimulationResult | null) => void;
  runDelaySimulation: (activityId: string, delayDays: number) => DelaySimulationResult | null;
  applyDelaySimulation: () => void;
  discardDelaySimulation: () => void;

  recoveryScenarios: RecoveryScenario[];
  addRecoveryScenario: (scenario: Omit<RecoveryScenario, 'id'>) => void;
  applyRecoveryScenario: (scenarioId: string) => void;
  deleteRecoveryScenario: (scenarioId: string) => void;

  // Navigation & Notifications
  activeTab: string;
  setActiveTab: (tab: string) => void;
  notification: { message: string; type: 'success' | 'warning' | 'error' | 'info' } | null;
  showNotification: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
}

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const LOCAL_STORAGE_KEY = 'SWELECT_PROJECTS_V1';
const CURRENT_PROJECT_ID_KEY = 'SWELECT_ACTIVE_PROJECT_ID';
const USER_SESSION_KEY = 'SWELECT_USER_SESSION';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // User Authentication
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem(USER_SESSION_KEY);
    if (saved) {
      try { return JSON.parse(saved); } catch (e) { return null; }
    }
    return null;
  });

  // Projects State
  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // If existing saved reference project has old 4.4 MW or fewer than 80 activities, upgrade to clean 50 MWp / 200 Acres
          const oldRef = parsed.find((p: any) => p.id === 'SWE-EPC-2025-042' || p.dcCapacityMW === 4.4);
          if (oldRef) {
            const upgraded = createReferenceSolarProject(50, 200);
            return [upgraded, ...parsed.filter((p: any) => p.id !== 'SWE-EPC-2025-042' && p.id !== 'SWE-EPC-2025-050')];
          }
          return parsed;
        }
      } catch (e) {
        console.error('Failed to parse saved projects', e);
      }
    }
    // Return sample project by default so the user immediately has full working ground-mount Solar EPC data
    return [createReferenceSolarProject(50, 200)];
  });

  const [currentProjectId, setCurrentProjectIdState] = useState<string>(() => {
    const saved = localStorage.getItem(CURRENT_PROJECT_ID_KEY);
    if (saved && saved !== 'SWE-EPC-2025-042') return saved;
    return 'SWE-EPC-2025-050';
  });

  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [delaySimulationResult, setDelaySimulationResult] = useState<DelaySimulationResult | null>(null);
  const [recoveryScenarios, setRecoveryScenarios] = useState<RecoveryScenario[]>([]);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'warning' | 'error' | 'info' } | null>(null);

  // Auto-dismiss notification
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: 'success' | 'warning' | 'error' | 'info' = 'info') => {
    setNotification({ message, type });
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(projects));
  }, [projects]);

  useEffect(() => {
    if (currentProjectId) {
      localStorage.setItem(CURRENT_PROJECT_ID_KEY, currentProjectId);
    }
  }, [currentProjectId]);

  const currentProject = projects.find(p => p.id === currentProjectId) || (projects.length > 0 ? projects[0] : null);

  const setCurrentProjectId = (id: string) => {
    setCurrentProjectIdState(id);
    setDelaySimulationResult(null);
  };

  const login = (email: string, pass: string): boolean => {
    if (!email || !pass) return false;
    // Derive role based on email or name
    let role: UserProfile['role'] = 'Project Manager';
    if (email.toLowerCase().includes('planning')) role = 'Planning Engineer';
    else if (email.toLowerCase().includes('site')) role = 'Site Engineer';
    else if (email.toLowerCase().includes('execution')) role = 'Execution Engineer';
    else if (email.toLowerCase().includes('coord')) role = 'Project Coordinator';

    const username = email.split('@')[0].replace(/[._]/g, ' ').toUpperCase();
    const newUser: UserProfile = {
      id: `USR-${Date.now()}`,
      name: username || 'Er. K. Ramesh',
      email,
      role,
      avatarInitials: (username ? username.slice(0, 2) : 'SW').toUpperCase()
    };
    setUser(newUser);
    localStorage.setItem(USER_SESSION_KEY, JSON.stringify(newUser));
    showNotification(`Welcome back, ${newUser.name}!`, 'success');
    return true;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem(USER_SESSION_KEY);
    showNotification('Logged out successfully', 'info');
  };

  const loadDemoProject = () => {
    const demo = createReferenceSolarProject();
    setProjects(prev => {
      const filtered = prev.filter(p => p.id !== demo.id);
      return [demo, ...filtered];
    });
    setCurrentProjectId(demo.id);
    showNotification('Loaded SWELECT 50 MWp Reference Project', 'success');
  };

  const deleteCurrentProject = () => {
    if (!currentProject) return;
    const remaining = projects.filter(p => p.id !== currentProject.id);
    setProjects(remaining);
    if (remaining.length > 0) {
      setCurrentProjectId(remaining[0].id);
    } else {
      setCurrentProjectIdState('');
    }
    showNotification('Project deleted', 'warning');
  };

  const updateCurrentProjectInState = (updater: (prev: Project) => Project) => {
    if (!currentProject) return;
    setProjects(prevProjects => {
      return prevProjects.map(p => {
        if (p.id === currentProject.id) {
          const updated = updater(p);
          updated.updatedAt = new Date().toISOString();
          return updated;
        }
        return p;
      });
    });
  };

  const createProject = (data: Partial<Project>): Project => {
    const newId = data.id?.trim() || `SWE-PRJ-${Date.now().toString().slice(-4)}`;
    const plannedStart = data.plannedStartDate || new Date().toISOString().split('T')[0];
    const capacity = Number(data.dcCapacityMW) || 50;
    const acCapacity = Number(data.acCapacityMW) || Math.round(capacity * 0.8 * 10) / 10;
    const acres = Number(data.areaAcres) || Math.round(capacity * 4);

    // Automatically generate full 145 authentic SWELECT activities scaled to user's capacity and area
    const generated = generateProjectActivitiesForTimeline(plannedStart, DEFAULT_WORKING_CALENDAR, true, capacity, acres);
    const plannedFinish = data.plannedFinishDate || generated.forecastCompletionDate;
    const blocks = createStandardBlocks(capacity, acres);

    const newProject: Project = {
      id: newId,
      name: data.name || 'New Ground-Mounted Solar Project',
      code: data.code || newId,
      location: data.location || '',
      state: data.state || '',
      district: data.district || '',
      address: data.address || '',
      dcCapacityMW: capacity,
      acCapacityMW: acCapacity,
      areaAcres: acres,
      plannedStartDate: plannedStart,
      plannedFinishDate: plannedFinish,
      projectManager: data.projectManager || 'Er. K. Ramesh',
      description: data.description || '',
      status: 'EXECUTION',
      calendar: DEFAULT_WORKING_CALENDAR,
      wbsNodes: SWELECT_WBS_NODES,
      activities: generated.activities,
      blocks,
      activeBaselineRevision: 1,
      baselines: [
        {
          id: 'BASE-REV-01',
          revisionNumber: 1,
          name: 'Original Approved Baseline (R0)',
          approvedBy: data.projectManager || 'SWELECT Project Director',
          approvedDate: new Date().toISOString().split('T')[0],
          activitiesCount: generated.activities.length,
          projectPlannedFinish: plannedFinish,
          notes: 'Initial formal contract baseline frozen upon project creation.',
          activities: generated.activities.map(a => ({
            id: a.id,
            baselineStart: a.earlyStart,
            baselineFinish: a.earlyFinish,
            duration: a.plannedDuration
          }))
        }
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setProjects(prev => [newProject, ...prev]);
    setCurrentProjectId(newProject.id);
    showNotification(`Project "${newProject.name}" (${capacity} MWp) created and synchronized across all modules!`, 'success');
    return newProject;
  };

  const updateProjectDetails = (data: Partial<Project>) => {
    updateCurrentProjectInState(p => {
      const merged = { ...p, ...data };
      const newCap = Number(data.dcCapacityMW !== undefined ? data.dcCapacityMW : p.dcCapacityMW) || 50;
      const newAcres = Number(data.areaAcres !== undefined ? data.areaAcres : p.areaAcres) || Math.round(newCap * 4);

      // Dynamically adjust blocks and activities to user-entered capacity and acreage
      if (data.dcCapacityMW !== undefined || data.areaAcres !== undefined) {
        merged.blocks = createStandardBlocks(newCap, newAcres);
        merged.activities = merged.activities.map(a => {
          let q = a.totalPlannedQuantity;
          if (a.quantityUnit === 'MWp') q = newCap;
          else if (a.quantityUnit === 'Acres') q = newAcres;
          return {
            ...a,
            totalPlannedQuantity: q,
            remainingQuantity: q && a.completedQuantity ? Math.max(0, q - a.completedQuantity) : q
          };
        });
      }

      if (data.plannedStartDate && data.plannedStartDate !== p.plannedStartDate && merged.activities.length > 0) {
        // Recalculate activities aligned to new planned start date
        const recalc = calculateSchedule(merged.activities, data.plannedStartDate, merged.calendar);
        merged.activities = recalc.activities;
        merged.plannedFinishDate = recalc.forecastCompletionDate;
      } else if (merged.activities.length > 0) {
        const recalc = calculateSchedule(merged.activities, merged.plannedStartDate, merged.calendar);
        merged.activities = recalc.activities;
        merged.plannedFinishDate = recalc.forecastCompletionDate;
      }
      return merged;
    });
    showNotification('Project parameters updated & synchronized across all views', 'success');
  };

  const realignEntireSchedule = (newStartDate?: string) => {
    updateCurrentProjectInState(project => {
      const start = newStartDate || project.plannedStartDate;
      const { activities, forecastCompletionDate } = generateProjectActivitiesForTimeline(
        start,
        project.calendar,
        false,
        project.dcCapacityMW,
        project.areaAcres
      );
      return {
        ...project,
        plannedStartDate: start,
        plannedFinishDate: forecastCompletionDate,
        activities,
        wbsNodes: project.wbsNodes.length > 0 ? project.wbsNodes : SWELECT_WBS_NODES,
        blocks: createStandardBlocks(project.dcCapacityMW, project.areaAcres)
      };
    });
    showNotification(`Full 145-activity schedule synchronized to ${currentProject?.dcCapacityMW || 50} MWp timeline`, 'success');
  };

  // Activity Updates
  const updateActivity = (id: string, updates: Partial<Activity>) => {
    updateCurrentProjectInState(project => {
      const updatedList = project.activities.map(a => {
        if (a.id === id) {
          const merged = { ...a, ...updates };
          if (updates.progressPercent !== undefined) {
            merged.progressPercent = Math.min(100, Math.max(0, updates.progressPercent));
            if (merged.progressPercent === 100) {
              merged.status = 'COMPLETED';
            } else if (merged.progressPercent > 0 && merged.status === 'NOT_STARTED') {
              merged.status = 'IN_PROGRESS';
            }
          }
          if (updates.status === 'COMPLETED' && (!updates.progressPercent || updates.progressPercent === 0)) {
            merged.progressPercent = 100;
          }
          if (updates.earlyStart) {
            merged.currentPlannedStart = updates.earlyStart;
            merged.baselineStart = updates.earlyStart;
          }
          if (updates.earlyFinish) {
            merged.currentPlannedFinish = updates.earlyFinish;
            merged.baselineFinish = updates.earlyFinish;
          }
          // If quantity updated, auto calculate physical progress
          if (merged.totalPlannedQuantity && merged.totalPlannedQuantity > 0 && merged.completedQuantity !== undefined) {
            merged.progressPercent = Math.min(100, Math.round((merged.completedQuantity / merged.totalPlannedQuantity) * 100));
            merged.remainingQuantity = Math.max(0, merged.totalPlannedQuantity - merged.completedQuantity);
            if (merged.progressPercent === 100) merged.status = 'COMPLETED';
            else if (merged.progressPercent > 0 && merged.status === 'NOT_STARTED') merged.status = 'IN_PROGRESS';
          }
          return merged;
        }
        return a;
      });

      const recalc = calculateSchedule(updatedList, project.plannedStartDate, project.calendar);
      return {
        ...project,
        activities: recalc.activities,
        plannedFinishDate: recalc.forecastCompletionDate
      };
    });
  };

  const addActivity = (newAct: Omit<Activity, 'earlyStart' | 'earlyFinish' | 'lateStart' | 'lateFinish' | 'totalFloat' | 'freeFloat' | 'isCritical' | 'currentPlannedStart' | 'currentPlannedFinish'>) => {
    updateCurrentProjectInState(project => {
      const full: Activity = {
        ...newAct,
        earlyStart: project.plannedStartDate,
        earlyFinish: project.plannedStartDate,
        lateStart: project.plannedStartDate,
        lateFinish: project.plannedStartDate,
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false,
        currentPlannedStart: project.plannedStartDate,
        currentPlannedFinish: project.plannedStartDate
      };
      const list = [...project.activities, full];
      const recalc = calculateSchedule(list, project.plannedStartDate, project.calendar);
      return {
        ...project,
        activities: recalc.activities,
        plannedFinishDate: recalc.forecastCompletionDate
      };
    });
    showNotification('Activity added & schedule recalculated', 'success');
  };

  const deleteActivity = (id: string) => {
    updateCurrentProjectInState(project => {
      // Remove activity and remove it from any other activity's predecessors
      const filtered = project.activities
        .filter(a => a.id !== id)
        .map(a => ({
          ...a,
          predecessors: a.predecessors.filter(p => p.activityId !== id)
        }));
      const recalc = calculateSchedule(filtered, project.plannedStartDate, project.calendar);
      return {
        ...project,
        activities: recalc.activities,
        plannedFinishDate: recalc.forecastCompletionDate
      };
    });
    showNotification('Activity deleted', 'info');
  };

  const reorderActivities = (activities: Activity[]) => {
    updateCurrentProjectInState(project => ({
      ...project,
      activities
    }));
  };

  const importActivities = (imported: Partial<Activity>[]) => {
    if (!currentProject) return;
    updateCurrentProjectInState(project => {
      const baseDate = project.plannedStartDate;
      const newActs: Activity[] = imported.map((imp, idx) => ({
        id: imp.id || `ACT-IMP-${Date.now()}-${idx}`,
        wbsId: imp.wbsId || (project.wbsNodes[0]?.id || 'WBS-1'),
        name: imp.name || `Imported Activity ${idx + 1}`,
        plannedDuration: imp.plannedDuration || 5,
        baselineStart: baseDate,
        baselineFinish: baseDate,
        currentPlannedStart: baseDate,
        currentPlannedFinish: baseDate,
        earlyStart: baseDate,
        earlyFinish: baseDate,
        lateStart: baseDate,
        lateFinish: baseDate,
        totalFloat: 0,
        freeFloat: 0,
        isCritical: false,
        predecessors: imp.predecessors || [],
        responsibleTeam: imp.responsibleTeam || 'EPC Execution',
        responsiblePerson: imp.responsiblePerson || 'Site Engineer',
        progressPercent: imp.progressPercent || 0,
        status: imp.status || 'NOT_STARTED',
        isMilestone: imp.isMilestone || false
      }));

      const combined = [...project.activities, ...newActs];
      const recalc = calculateSchedule(combined, project.plannedStartDate, project.calendar);
      return {
        ...project,
        activities: recalc.activities,
        plannedFinishDate: recalc.forecastCompletionDate
      };
    });
    showNotification(`Successfully imported ${imported.length} activities`, 'success');
  };

  // WBS Nodes
  const addWBSNode = (name: string, code: string) => {
    updateCurrentProjectInState(project => {
      const newNode: WBSNode = {
        id: `WBS-${Date.now()}`,
        code,
        name,
        level: 1,
        order: project.wbsNodes.length + 1,
        expanded: true
      };
      return {
        ...project,
        wbsNodes: [...project.wbsNodes, newNode]
      };
    });
    showNotification(`Added WBS category "${name}"`, 'success');
  };

  const updateWBSNode = (id: string, name: string) => {
    updateCurrentProjectInState(project => ({
      ...project,
      wbsNodes: project.wbsNodes.map(n => n.id === id ? { ...n, name } : n)
    }));
  };

  const deleteWBSNode = (id: string) => {
    updateCurrentProjectInState(project => ({
      ...project,
      wbsNodes: project.wbsNodes.filter(n => n.id !== id)
    }));
    showNotification('WBS Node deleted', 'info');
  };

  const generateStandardWBS = () => {
    updateCurrentProjectInState(project => {
      const nodes: WBSNode[] = STANDARD_WBS_CATEGORIES.map((cat, idx) => ({
        id: `WBS-${idx + 1}`,
        code: cat.code,
        name: cat.name,
        level: 1,
        order: idx + 1,
        expanded: true
      }));
      return {
        ...project,
        wbsNodes: nodes
      };
    });
    showNotification('Generated 14 Standard Ground-Mounted Solar EPC WBS Categories', 'success');
  };

  // Baseline Freezing
  const createBaselineRevision = (name: string, notes: string) => {
    if (!currentProject) return;
    const newRevNum = (currentProject.activeBaselineRevision || 0) + 1;
    const newSnapshot = {
      id: `BASE-REV-0${newRevNum}`,
      revisionNumber: newRevNum,
      name: name || `Baseline Revision ${newRevNum}`,
      approvedBy: user?.name || 'Chief Project Planner, SWELECT',
      approvedDate: new Date().toISOString().split('T')[0],
      activitiesCount: currentProject.activities.length,
      projectPlannedFinish: currentProject.plannedFinishDate,
      notes: notes || 'Authorized baseline update',
      activities: currentProject.activities.map(a => ({
        id: a.id,
        baselineStart: a.earlyStart,
        baselineFinish: a.earlyFinish,
        duration: a.plannedDuration
      }))
    };

    updateCurrentProjectInState(project => {
      // Update activity baseline dates to current planned dates
      const updatedActs = project.activities.map(a => ({
        ...a,
        baselineStart: a.earlyStart,
        baselineFinish: a.earlyFinish
      }));
      return {
        ...project,
        activeBaselineRevision: newRevNum,
        baselines: [...project.baselines, newSnapshot],
        activities: updatedActs
      };
    });

    showNotification(`Baseline Revision ${newRevNum} officially authorized and frozen`, 'success');
  };

  // Block Management
  const addBlock = (blockData: Omit<Block, 'id'>) => {
    updateCurrentProjectInState(project => {
      const newBlock: Block = {
        ...blockData,
        id: `BLK-${(project.blocks.length + 1).toString().padStart(2, '0')}`
      };
      return {
        ...project,
        blocks: [...project.blocks, newBlock]
      };
    });
    showNotification('Block/Zone created', 'success');
  };

  const updateBlock = (blockId: string, updates: Partial<Block>) => {
    updateCurrentProjectInState(project => ({
      ...project,
      blocks: project.blocks.map(b => b.id === blockId ? { ...b, ...updates } : b)
    }));
  };

  const deleteBlock = (blockId: string) => {
    updateCurrentProjectInState(project => ({
      ...project,
      blocks: project.blocks.filter(b => b.id !== blockId)
    }));
    showNotification('Block deleted', 'info');
  };

  const updateReadinessCheck = (blockId: string, checkId: string, updates: Partial<WorkfrontCheckItem>) => {
    updateCurrentProjectInState(project => {
      const updatedBlocks = project.blocks.map(b => {
        if (b.id === blockId) {
          const updatedChecks = b.readinessChecks.map(c => {
            if (c.id === checkId) {
              const merged = { ...c, ...updates };
              if (merged.status === 'CLEARED') {
                merged.isSatisfied = true;
                merged.blockingReason = undefined;
                merged.clearedDate = new Date().toISOString().split('T')[0];
              } else if (merged.status === 'BLOCKED') {
                merged.isSatisfied = false;
              }
              return merged;
            }
            return c;
          });

          // Check overall block readiness: if any mandatory check is BLOCKED, block status is BLOCKED
          const hasBlockedMandatory = updatedChecks.some(c => c.isMandatory && c.status === 'BLOCKED');
          const hasPendingMandatory = updatedChecks.some(c => c.isMandatory && c.status === 'PENDING');
          let newStatus = b.status;
          if (hasBlockedMandatory) newStatus = 'BLOCKED';
          else if (hasPendingMandatory) newStatus = 'AT_RISK';
          else if (updatedChecks.every(c => c.isSatisfied)) newStatus = 'READY';

          return {
            ...b,
            status: newStatus,
            readinessChecks: updatedChecks
          };
        }
        return b;
      });

      return {
        ...project,
        blocks: updatedBlocks
      };
    });
  };

  const addReadinessCheck = (blockId: string, checkData: Omit<WorkfrontCheckItem, 'id'>) => {
    updateCurrentProjectInState(project => {
      const updatedBlocks = project.blocks.map(b => {
        if (b.id === blockId) {
          const newCheck: WorkfrontCheckItem = {
            ...checkData,
            id: `RC-${Date.now().toString().slice(-4)}`
          };
          return {
            ...b,
            readinessChecks: [...b.readinessChecks, newCheck]
          };
        }
        return b;
      });
      return { ...project, blocks: updatedBlocks };
    });
    showNotification('Prerequisite check added', 'success');
  };

  // Delay Simulation
  const runDelaySimulation = (activityId: string, delayDays: number): DelaySimulationResult | null => {
    if (!currentProject) return null;
    try {
      const result = simulateDelay(
        currentProject.activities,
        activityId,
        delayDays,
        currentProject.calendar,
        currentProject.plannedStartDate
      );
      setDelaySimulationResult(result);
      return result;
    } catch (e: any) {
      showNotification(e.message || 'Simulation error', 'error');
      return null;
    }
  };

  const applyDelaySimulation = () => {
    if (!delaySimulationResult || !currentProject) return;
    updateCurrentProjectInState(project => ({
      ...project,
      activities: delaySimulationResult.revisedSchedule,
      plannedFinishDate: delaySimulationResult.simulatedFinishDate
    }));
    setDelaySimulationResult(null);
    showNotification('Simulated delay changes applied to current working schedule', 'warning');
  };

  const discardDelaySimulation = () => {
    setDelaySimulationResult(null);
    showNotification('Simulation discarded without changing schedule', 'info');
  };

  // Recovery Scenarios
  const addRecoveryScenario = (scenarioData: Omit<RecoveryScenario, 'id'>) => {
    const newScen: RecoveryScenario = {
      ...scenarioData,
      id: `REC-${Date.now().toString().slice(-4)}`
    };
    setRecoveryScenarios(prev => [newScen, ...prev]);
    showNotification(`Recovery scenario "${newScen.title}" created`, 'success');
  };

  const applyRecoveryScenario = (scenarioId: string) => {
    const scen = recoveryScenarios.find(s => s.id === scenarioId);
    if (!scen || !currentProject) return;

    updateCurrentProjectInState(project => {
      const updatedActs = project.activities.map(a => {
        if (scen.revisedDurations[a.id] !== undefined) {
          return {
            ...a,
            plannedDuration: scen.revisedDurations[a.id]
          };
        }
        return a;
      });

      const recalc = calculateSchedule(updatedActs, project.plannedStartDate, project.calendar);
      return {
        ...project,
        activities: recalc.activities,
        plannedFinishDate: recalc.forecastCompletionDate
      };
    });

    setRecoveryScenarios(prev =>
      prev.map(s => s.id === scenarioId ? { ...s, status: 'APPLIED', approvedDate: new Date().toISOString() } : s)
    );
    showNotification(`Recovery scenario applied! Schedule compressed by ${scen.calculatedDaysRecovered} days.`, 'success');
  };

  const deleteRecoveryScenario = (scenarioId: string) => {
    setRecoveryScenarios(prev => prev.filter(s => s.id !== scenarioId));
    showNotification('Scenario deleted', 'info');
  };

  return (
    <ProjectContext.Provider
      value={{
        user,
        login,
        logout,
        projects,
        currentProject,
        setCurrentProjectId,
        createProject,
        updateProjectDetails,
        realignEntireSchedule,
        loadDemoProject,
        deleteCurrentProject,

        updateActivity,
        addActivity,
        deleteActivity,
        reorderActivities,
        importActivities,

        addWBSNode,
        updateWBSNode,
        deleteWBSNode,
        generateStandardWBS,

        createBaselineRevision,

        addBlock,
        updateBlock,
        deleteBlock,
        updateReadinessCheck,
        addReadinessCheck,

        delaySimulationResult,
        setDelaySimulationResult,
        runDelaySimulation,
        applyDelaySimulation,
        discardDelaySimulation,

        recoveryScenarios,
        addRecoveryScenario,
        applyRecoveryScenario,
        deleteRecoveryScenario,

        activeTab,
        setActiveTab,
        notification,
        showNotification
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export const useProject = (): ProjectContextType => {
  const context = useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
};
