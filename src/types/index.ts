export type DependencyType = 'FS' | 'SS' | 'FF' | 'SF';

export interface Predecessor {
  activityId: string;
  type: DependencyType;
  lagDays: number; // Positive for lag, negative for lead
}

export type ActivityStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'BLOCKED' | 'AT_RISK';

export type ReadinessStatus = 'NOT_STARTED' | 'READY' | 'AT_RISK' | 'BLOCKED' | 'IN_PROGRESS' | 'COMPLETED';

export interface Activity {
  id: string; // e.g. "ACT-010"
  wbsId: string; // e.g. "WBS-4.1"
  name: string;
  responsibleTeam: string;
  responsiblePerson: string;
  isMilestone: boolean;
  blockId?: string; // Optional association with a block

  // Durations in working days
  plannedDuration: number;
  actualDuration?: number;

  // Baseline dates (ISO string YYYY-MM-DD for date math, displayed as DD-MM-YYYY)
  baselineStart: string;
  baselineFinish: string;

  // Current Planned dates (calculated by CPM)
  currentPlannedStart: string;
  currentPlannedFinish: string;

  // Actual dates (recorded during execution)
  actualStart?: string;
  actualFinish?: string;

  // Dependency relationships
  predecessors: Predecessor[];

  // CPM Calculated Fields
  earlyStart: string;
  earlyFinish: string;
  lateStart: string;
  lateFinish: string;
  totalFloat: number; // In working days
  freeFloat: number;  // In working days
  isCritical: boolean;

  // Progress Tracking
  progressPercent: number; // 0 - 100
  status: ActivityStatus;

  // Quantity Tracking
  quantityUnit?: string; // e.g., "Nos", "Meters", "Tables", "MWp", "Tons"
  totalPlannedQuantity?: number;
  completedQuantity?: number;
  remainingQuantity?: number;

  // Delay & Constraints
  delayReason?: string;
  progressUpdateDate?: string;
}

export interface WBSNode {
  id: string; // e.g. "WBS-1"
  code: string; // e.g. "1.0", "4.1"
  name: string;
  parentId?: string | null;
  level: number;
  order: number;
  expanded?: boolean;
}

export interface WorkfrontCheckItem {
  id: string;
  title: string;
  category: 'SITE' | 'DRAWING' | 'INSPECTION' | 'MANPOWER' | 'EQUIPMENT' | 'SAFETY' | 'MATERIAL';
  isMandatory: boolean;
  isSatisfied: boolean;
  status: 'PENDING' | 'CLEARED' | 'BLOCKED' | 'WAIVED';
  blockingReason?: string;
  responsiblePerson: string;
  targetResolutionDate: string;
  clearedDate?: string;
  notes?: string;
}

export interface Block {
  id: string; // e.g. "BLK-01"
  name: string; // e.g. "Block 1 (12.5 MWp)"
  zoneCode: string;
  capacityMWp: number;
  areaAcres: number;
  plannedProgress: number; // 0 - 100
  actualProgress: number;  // 0 - 100
  status: ReadinessStatus;
  relatedActivityIds: string[]; // Linked activities in this block
  responsiblePerson: string;
  targetResolutionDate?: string;
  readinessChecks: WorkfrontCheckItem[];
}

export interface WorkingCalendar {
  id: string;
  name: string;
  workingDaysPerWeek: 5 | 6 | 7; // Usually 6 (Mon-Sat) for Indian Solar EPC
  workSunday: boolean;
  workSaturday: boolean;
  holidays: string[]; // List of YYYY-MM-DD
}

export interface ProjectBaselineSnapshot {
  id: string;
  revisionNumber: number;
  name: string;
  approvedBy: string;
  approvedDate: string;
  activitiesCount: number;
  projectPlannedFinish: string;
  notes: string;
  activities: {
    id: string;
    baselineStart: string;
    baselineFinish: string;
    duration: number;
  }[];
}

export interface Project {
  id: string; // e.g. "SWELECT-SOLAR-001"
  name: string;
  code: string;
  location: string;
  state: string;
  district: string;
  address: string;
  dcCapacityMW: number;
  acCapacityMW: number;
  areaAcres: number;
  plannedStartDate: string;
  plannedFinishDate: string;
  projectManager: string;
  description: string;
  status: 'PLANNING' | 'EXECUTION' | 'COMMISSIONING' | 'HANDOVER' | 'ON_HOLD';

  calendar: WorkingCalendar;
  wbsNodes: WBSNode[];
  activities: Activity[];
  blocks: Block[];
  baselines: ProjectBaselineSnapshot[];
  activeBaselineRevision: number;

  createdAt: string;
  updatedAt: string;
}

export interface DelaySimulationResult {
  simulatedActivityId: string;
  additionalDelayDays: number;
  originalFinishDate: string;
  simulatedFinishDate: string;
  projectFinishVarianceDays: number;
  isProjectDelayed: boolean;
  criticalPathChanged: boolean;
  affectedSuccessorIds: string[];
  unaffectedActivityIds: string[];
  floatChanges: {
    activityId: string;
    activityName: string;
    oldTotalFloat: number;
    newTotalFloat: number;
    floatErosion: number;
    nowCritical: boolean;
  }[];
  atRiskMilestones: {
    activityId: string;
    name: string;
    originalDate: string;
    simulatedDate: string;
    delayDays: number;
  }[];
  revisedSchedule: Activity[];
}

export interface RecoveryScenario {
  id: string;
  title: string;
  proposedAction: 'MANPOWER' | 'EQUIPMENT' | 'RESEQUENCING' | 'FAST_TRACKING' | 'OVERTIME' | 'EXPEDITE_CLEARANCES';
  description: string;
  affectedActivityIds: string[];
  revisedDurations: Record<string, number>; // activityId -> new duration
  resourceRequirements: string;
  estimatedCostImpactLakhs: number; // in INR Lakhs
  status: 'DRAFT' | 'APPROVED' | 'REJECTED' | 'APPLIED';
  calculatedDaysRecovered: number;
  forecastCompletionDate: string;
  criticalPathActivitiesCount: number;
  approvedBy?: string;
  approvedDate?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: 'Project Manager' | 'Planning Engineer' | 'Execution Engineer' | 'Site Engineer' | 'Project Coordinator';
  avatarInitials: string;
}
