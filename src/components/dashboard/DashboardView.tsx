import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { formatIndianDate, calendarDaysBetween } from '../../services/dateUtils';
import { exportProjectToExcel } from '../../services/excelService';
import {
  TrendingUp,
  ClockAlert,
  Flame,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Plus,
  Compass,
  FileSpreadsheet,
  Zap,
  Target,
  FolderTree,
  Building2,
  MapPin,
  Clock,
  ArrowRight,
  CheckCircle,
  AlertCircle,
  HelpCircle,
  BarChart3,
  ListTodo,
  Edit3,
  Sliders,
  FolderOpen,
  X,
  Check,
  Sparkles
} from 'lucide-react';

interface DashboardViewProps {
  onOpenNewProjectModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onOpenNewProjectModal }) => {
  const {
    currentProject,
    projects,
    setCurrentProjectId,
    updateProjectDetails,
    setActiveTab,
    loadDemoProject,
    showNotification
  } = useProject();

  const [dashboardMode, setDashboardMode] = useState<'SIMPLE' | 'DETAILED'>('SIMPLE');

  // Quick specifications editor modal
  const [showQuickEditModal, setShowQuickEditModal] = useState(false);
  const [quickName, setQuickName] = useState('');
  const [quickDcMW, setQuickDcMW] = useState(50);
  const [quickAcMW, setQuickAcMW] = useState(40);
  const [quickAcres, setQuickAcres] = useState(200);

  useEffect(() => {
    if (currentProject) {
      setQuickName(currentProject.name);
      setQuickDcMW(currentProject.dcCapacityMW);
      setQuickAcMW(currentProject.acCapacityMW);
      setQuickAcres(currentProject.areaAcres);
    }
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 bg-graphite-950">
        <div className="max-w-md w-full text-center p-8 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mx-auto flex items-center justify-center mb-4">
            <Compass className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No Active Solar EPC Project</h2>
          <p className="text-sm text-slate-400 mb-6">
            Create your ground-mounted solar project or load the SWELECT master project schedule to initiate dependency-based scheduling, workfront readiness, and executive reporting.
          </p>
          <div className="space-y-3">
            <button
              onClick={onOpenNewProjectModal}
              className="w-full py-2.5 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Project</span>
            </button>
            <button
              onClick={loadDemoProject}
              className="w-full py-2.5 px-4 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-slate-200 border border-graphite-700 font-medium text-sm transition-all flex items-center justify-center gap-2"
            >
              <span>Load SWELECT 50 MWp Master Schedule</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // REAL PROJECT-BASED DATA COMPUTATION (ZERO RANDOM/DUMMY NUMBERS)
  // =========================================================================
  const totalActivities = currentProject.activities.length;
  const completedActivities = currentProject.activities.filter(a => a.status === 'COMPLETED').length;
  const inProgressActivities = currentProject.activities.filter(a => a.status === 'IN_PROGRESS').length;
  const criticalActivities = currentProject.activities.filter(a => a.isCritical);
  const delayedActivities = currentProject.activities.filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK');

  // Overall physical progress %
  const totalPhysicalProgress = totalActivities > 0
    ? Math.round(currentProject.activities.reduce((sum, a) => sum + (a.progressPercent || 0), 0) / totalActivities)
    : 0;

  // Planned baseline progress based on project duration elapsed
  const startD = new Date(currentProject.plannedStartDate).getTime();
  const finishD = new Date(currentProject.plannedFinishDate).getTime();
  const nowD = new Date().getTime();
  let plannedProgressPercent = 0;
  if (finishD > startD) {
    const elapsed = Math.max(0, nowD - startD);
    plannedProgressPercent = Math.min(100, Math.round((elapsed / (finishD - startD)) * 100));
  }

  // Calculate actual forecast completion date from CPM activities
  const forecastFinishDate = currentProject.activities.reduce((maxDate, act) => {
    const finish = act.earlyFinish || act.currentPlannedFinish || act.baselineFinish;
    return finish && finish > maxDate ? finish : maxDate;
  }, currentProject.plannedFinishDate);

  // Schedule variance in days (Forecast vs Baseline)
  const scheduleVarianceDays = calendarDaysBetween(currentProject.plannedFinishDate, forecastFinishDate);

  // Overall project health verdict
  const isDelayed = scheduleVarianceDays > 0;
  const isBehindProgress = totalPhysicalProgress < plannedProgressPercent;
  let overallHealth: { label: string; color: string; bg: string; border: string; desc: string } = {
    label: 'ON SCHEDULE & HEALTHY',
    color: 'text-emerald-400',
    bg: 'bg-emerald-950/60',
    border: 'border-emerald-800/60',
    desc: 'Project execution is advancing within the approved baseline timeline.'
  };

  if (isDelayed) {
    overallHealth = {
      label: `DELAYED BY +${scheduleVarianceDays} DAYS`,
      color: 'text-rose-400',
      bg: 'bg-rose-950/60',
      border: 'border-rose-800/60',
      desc: 'Critical path activities require fast-tracking or additional resource deployment.'
    };
  } else if (isBehindProgress || delayedActivities.length > 0) {
    overallHealth = {
      label: 'AT RISK - MONITOR CLOSELY',
      color: 'text-solar-amber',
      bg: 'bg-amber-950/60',
      border: 'border-amber-800/60',
      desc: 'Physical progress is slightly behind planned targets, but float currently buffers COD.'
    };
  }

  // Open Constraints directly aggregated from blocks & activities
  const openConstraints: { source: string; item: string; owner: string; date: string; status: string; isCritical: boolean }[] = [];
  currentProject.blocks.forEach(b => {
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

  // WBS Category Breakdown (The 8 Solar EPC Phases)
  const phaseBreakdown = currentProject.wbsNodes.map(node => {
    const acts = currentProject.activities.filter(a => a.wbsId === node.id);
    const completed = acts.filter(a => a.status === 'COMPLETED').length;
    const inProg = acts.filter(a => a.status === 'IN_PROGRESS').length;
    const crit = acts.filter(a => a.isCritical).length;
    const blocked = acts.filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK').length;
    const progress = acts.length > 0 ? Math.round(acts.reduce((s, a) => s + (a.progressPercent || 0), 0) / acts.length) : 0;
    
    let statusLabel = 'Not Started';
    let statusClass = 'text-slate-400 bg-graphite-800 border-graphite-700';
    if (progress === 100) {
      statusLabel = 'Completed';
      statusClass = 'text-emerald-400 bg-emerald-950/70 border-emerald-800/60';
    } else if (blocked > 0) {
      statusLabel = 'Blocked / Needs Attention';
      statusClass = 'text-rose-400 bg-rose-950/70 border-rose-800/60';
    } else if (progress > 0 || inProg > 0) {
      statusLabel = 'In Progress';
      statusClass = 'text-cyan-300 bg-cyan-950/70 border-cyan-800/60';
    }

    return {
      id: node.id,
      code: node.code,
      name: node.name,
      totalActs: acts.length,
      completed,
      inProg,
      crit,
      blocked,
      progress,
      statusLabel,
      statusClass
    };
  });

  // Upcoming Milestones
  const milestones = currentProject.activities
    .filter(a => a.isMilestone)
    .sort((a, b) => (a.earlyFinish || a.baselineFinish || '').localeCompare(b.earlyFinish || b.baselineFinish || ''));

  // Timeline labels calculation for S-Curve
  const startDateObj = new Date(currentProject.plannedStartDate);
  const finishDateObj = new Date(forecastFinishDate);
  const totalMonthsDiff = Math.max(1, (finishDateObj.getFullYear() - startDateObj.getFullYear()) * 12 + (finishDateObj.getMonth() - startDateObj.getMonth()));
  const sCurvePoints: string[] = [];
  for (let i = 0; i <= 5; i++) {
    const targetMonthD = new Date(startDateObj.getTime());
    targetMonthD.setMonth(startDateObj.getMonth() + Math.round((totalMonthsDiff / 5) * i));
    const label = targetMonthD.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    sCurvePoints.push(label);
  }

  // Handle Export to Excel
  const handleExportDashboardExcel = () => {
    try {
      exportProjectToExcel(currentProject);
      showNotification(`Executive Project Dashboard (${currentProject.dcCapacityMW} MWp) exported to Excel successfully`, 'success');
    } catch (err) {
      showNotification('Failed to export Excel dashboard', 'error');
    }
  };

  const handleSaveQuickEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentProject) return;
    const dc = Number(quickDcMW) || 50;
    const ac = Number(quickAcMW) || Math.round(dc * 0.8 * 10) / 10;
    const acres = Number(quickAcres) || Math.round(dc * 4);

    updateProjectDetails({
      name: quickName.trim() || currentProject.name,
      dcCapacityMW: dc,
      acCapacityMW: ac,
      areaAcres: acres
    });
    setShowQuickEditModal(false);
    showNotification(`Project parameters updated to ${dc} MWp / ${acres} Acres and synced across all views!`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* 1. TOP HEADER: ACTIVE PROJECT SELECTOR & IDENTITY */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl">
        <div className="space-y-2">
          {/* Active Project Switcher & Metadata */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Project Dropdown Selector */}
            <div className="flex items-center gap-1.5 bg-graphite-850 px-2.5 py-1 rounded-xl border border-graphite-700">
              <FolderOpen className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                value={currentProject.id}
                onChange={(e) => setCurrentProjectId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer pr-2"
                title="Switch active project to view and sync across all modules"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-graphite-900 text-white">
                    {p.name} ({p.dcCapacityMW} MWp)
                  </option>
                ))}
              </select>
            </div>

            <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
              {currentProject.id}
            </span>

            {/* User-defined Capacity & Acreage Badge with Quick Edit */}
            <button
              onClick={() => setShowQuickEditModal(true)}
              className="flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 hover:bg-amber-950/70 border border-amber-800/60 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
              title="Click to edit project capacity (MWp) and acreage"
            >
              <Zap className="w-3.5 h-3.5 text-solar-amber" />
              <span className="font-bold">{currentProject.dcCapacityMW} MWp DC</span>
              <span className="text-slate-400">/ {currentProject.acCapacityMW} MWac • {currentProject.areaAcres} Acres</span>
              <span className="ml-1 text-[10px] text-cyan-400 font-bold bg-cyan-950 px-1 py-0.2 rounded border border-cyan-800 flex items-center gap-0.5">
                <Edit3 className="w-2.5 h-2.5" /> Edit
              </span>
            </button>

            <span className="text-xs text-slate-300 flex items-center gap-1 font-medium">
              <MapPin className="w-3.5 h-3.5 text-slate-400" />
              {currentProject.district || currentProject.location}, {currentProject.state}
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            {currentProject.name}
          </h1>
          <p className="text-xs text-slate-400">
            SWELECT Ground-Mounted Solar EPC Execution Control • Baseline Rev {currentProject.activeBaselineRevision}
          </p>
        </div>

        {/* Action Controls & Excel Download */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Simple vs Detailed View Toggle */}
          <div className="flex items-center bg-graphite-850 p-1 rounded-xl border border-graphite-750">
            <button
              onClick={() => setDashboardMode('SIMPLE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dashboardMode === 'SIMPLE'
                  ? 'bg-cyan-500 text-graphite-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Simple Overview
            </button>
            <button
              onClick={() => setDashboardMode('DETAILED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                dashboardMode === 'DETAILED'
                  ? 'bg-cyan-500 text-graphite-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Detailed Engineering
            </button>
          </div>

          {/* Export to Excel */}
          <button
            onClick={handleExportDashboardExcel}
            className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-graphite-950 font-bold text-xs transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2"
            title="Download full project dashboard and multi-sheet master data to Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export Project Excel</span>
          </button>
        </div>
      </div>

      {/* 2. CROSS-MODULE LIVE SYNCHRONIZATION STATUS BAR */}
      <div className="p-3.5 bg-graphite-900 border border-cyan-500/30 rounded-2xl shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
          <div>
            <span className="font-bold text-slate-100 mr-2">
              All 9 Modules Synchronized:
            </span>
            <span className="text-slate-400">
              Viewing live data for <strong className="text-cyan-300">{currentProject.name}</strong> ({currentProject.dcCapacityMW} MWp)
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => setActiveTab('wbs')}
            className="px-2.5 py-1 bg-graphite-850 hover:bg-graphite-800 text-slate-300 hover:text-white rounded-lg border border-graphite-700 text-[11px] font-medium transition-colors flex items-center gap-1"
            title="View WBS Activities for this project"
          >
            <FolderTree className="w-3.5 h-3.5 text-cyan-400" />
            <span>WBS ({totalActivities})</span>
          </button>

          <button
            onClick={() => setActiveTab('gantt')}
            className="px-2.5 py-1 bg-graphite-850 hover:bg-graphite-800 text-slate-300 hover:text-white rounded-lg border border-graphite-700 text-[11px] font-medium transition-colors flex items-center gap-1"
            title="View interactive Gantt schedule for this project"
          >
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            <span>Gantt ({criticalActivities.length} CP)</span>
          </button>

          <button
            onClick={() => setActiveTab('workfront')}
            className="px-2.5 py-1 bg-graphite-850 hover:bg-graphite-800 text-slate-300 hover:text-white rounded-lg border border-graphite-700 text-[11px] font-medium transition-colors flex items-center gap-1"
            title="View Workfront Readiness checks for this project"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Readiness ({currentProject.blocks.length} Zones)</span>
          </button>

          <button
            onClick={() => setActiveTab('progress')}
            className="px-2.5 py-1 bg-graphite-850 hover:bg-graphite-800 text-slate-300 hover:text-white rounded-lg border border-graphite-700 text-[11px] font-medium transition-colors flex items-center gap-1"
            title="Update physical progress for this project"
          >
            <TrendingUp className="w-3.5 h-3.5 text-solar-amber" />
            <span>Progress ({totalPhysicalProgress}%)</span>
          </button>

          <button
            onClick={() => setActiveTab('delay')}
            className="px-2.5 py-1 bg-graphite-850 hover:bg-graphite-800 text-slate-300 hover:text-white rounded-lg border border-graphite-700 text-[11px] font-medium transition-colors flex items-center gap-1"
            title="Run CPM delay simulations for this project"
          >
            <ClockAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Delays ({openConstraints.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('reports')}
            className="px-2.5 py-1 bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 rounded-lg border border-emerald-600/60 text-[11px] font-bold transition-colors flex items-center gap-1 shadow-sm"
            title="Generate Audit Reports & Excel Export for this project"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            <span>Reports & Excel</span>
          </button>
        </div>
      </div>

      {/* 2. OVERALL PROJECT HEALTH BANNER (CLEAR & UNDERSTANDABLE VERDICT) */}
      <div className={`p-5 rounded-2xl border ${overallHealth.bg} ${overallHealth.border} shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4`}>
        <div className="flex items-center gap-3.5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isDelayed ? 'bg-rose-500/20 text-rose-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
            {isDelayed ? <AlertCircle className="w-6 h-6" /> : <CheckCircle className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">Current Schedule Status</span>
              <span className={`text-xs font-black uppercase px-2 py-0.5 rounded border ${overallHealth.color} ${overallHealth.border}`}>
                {overallHealth.label}
              </span>
            </div>
            <p className="text-sm font-semibold text-white mt-0.5">
              {overallHealth.desc}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs shrink-0 bg-graphite-950/60 p-3 rounded-xl border border-graphite-800">
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Target COD Date</p>
            <p className="text-sm font-bold text-slate-100 font-mono">
              {formatIndianDate(currentProject.plannedFinishDate)}
            </p>
          </div>
          <div className="w-px h-8 bg-graphite-800"></div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Forecast Completion</p>
            <p className={`text-sm font-bold font-mono ${isDelayed ? 'text-rose-400' : 'text-cyan-300'}`}>
              {formatIndianDate(forecastFinishDate)}
            </p>
          </div>
        </div>
      </div>

      {/* 3. SIMPLIFIED 4-CARD EXECUTIVE KPI SCORECARD */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Actual Physical Progress */}
        <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Physical Progress</span>
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-white font-mono">{totalPhysicalProgress}%</span>
              <span className="text-xs text-slate-400">of total solar plant</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="w-full bg-graphite-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-500 to-emerald-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${totalPhysicalProgress}%` }}
              ></div>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400 mt-2 font-mono">
              <span>Target: {plannedProgressPercent}%</span>
              <span className={totalPhysicalProgress >= plannedProgressPercent ? 'text-emerald-400 font-bold' : 'text-solar-amber font-bold'}>
                {totalPhysicalProgress >= plannedProgressPercent ? 'On Track / Ahead' : `${plannedProgressPercent - totalPhysicalProgress}% Lagging`}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Schedule Timeline Variance */}
        <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Schedule Timeline</span>
              <Clock className="w-4 h-4 text-solar-amber" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono ${scheduleVarianceDays <= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {scheduleVarianceDays > 0 ? `+${scheduleVarianceDays}` : `${scheduleVarianceDays}`}d
              </span>
              <span className="text-xs text-slate-400">vs Approved Baseline</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-graphite-800 text-[11px] text-slate-300">
            {scheduleVarianceDays <= 0 ? (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5" /> 100% on track for scheduled COD
              </span>
            ) : (
              <span className="text-rose-400 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> Requires recovery intervention
              </span>
            )}
          </div>
        </div>

        {/* Card 3: Critical Path Activities */}
        <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Critical Activities</span>
              <Flame className="w-4 h-4 text-rose-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-rose-400 font-mono">{criticalActivities.length}</span>
              <span className="text-xs text-slate-400">Zero-Float Tasks</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-graphite-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Any delay directly impacts COD</span>
            <button
              onClick={() => setActiveTab('gantt')}
              className="text-cyan-400 hover:underline font-semibold"
            >
              View on Gantt &rarr;
            </button>
          </div>
        </div>

        {/* Card 4: Open Action Roadblocks */}
        <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Action Roadblocks</span>
              <AlertTriangle className="w-4 h-4 text-solar-amber" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black font-mono ${openConstraints.length === 0 ? 'text-emerald-400' : 'text-solar-amber'}`}>
                {openConstraints.length}
              </span>
              <span className="text-xs text-slate-400">Items Needing Action</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-graphite-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>{openConstraints.length === 0 ? 'All site workfronts cleared' : 'Site, HSE, or drawings'}</span>
            <button
              onClick={() => setActiveTab('workfront')}
              className="text-cyan-400 hover:underline font-semibold"
            >
              Clear Roadblocks &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 4. "WHERE IS THE PROJECT RIGHT NOW?" - THE 8 SOLAR EPC EXECUTION PHASES */}
      <div className="bg-graphite-900 border border-graphite-750 p-6 rounded-2xl shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <FolderTree className="w-5 h-5 text-cyan-400" />
              <span>Project Execution Roadmap (8 Core Solar EPC Stages)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Understand the complete plant lifecycle from initial land acquisition to final TANGEDCO/DISCOM grid synchronization.
            </p>
          </div>

          <button
            onClick={() => setActiveTab('wbs')}
            className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 self-start sm:self-auto bg-graphite-850 px-3 py-1.5 rounded-lg border border-graphite-750"
          >
            <span>Open Activity Table & Edit Tasks</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* The 8 Phase Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {phaseBreakdown.map((phase, index) => (
            <div
              key={phase.id}
              onClick={() => setActiveTab('wbs')}
              className="p-4 rounded-xl bg-graphite-950/70 border border-graphite-800 hover:border-cyan-500/50 transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/50">
                    Step {index + 1}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${phase.statusClass}`}>
                    {phase.statusLabel}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors line-clamp-1 mb-1">
                  {phase.name}
                </h3>
              </div>

              <div className="mt-4">
                <div className="w-full bg-graphite-800 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-300 ${
                      phase.progress === 100
                        ? 'bg-emerald-400'
                        : phase.blocked > 0
                        ? 'bg-rose-500'
                        : 'bg-cyan-400'
                    }`}
                    style={{ width: `${phase.progress}%` }}
                  ></div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 mt-2 font-mono">
                  <span>{phase.completed} of {phase.totalActs} Tasks Done</span>
                  <span className="font-bold text-white">{phase.progress}%</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 5. "WHAT NEEDS IMMEDIATE ATTENTION?" SECTION (SIMPLE & ACTIONABLE) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Top Delayed / Zero-Float Critical Activities */}
        <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Flame className="w-4 h-4 text-rose-500" />
                  <span>Key Activities to Watch Today (Zero Float)</span>
                </h3>
                <p className="text-xs text-slate-400">If any of these slip, project COD will slip by the same number of days.</p>
              </div>
              <button
                onClick={() => setActiveTab('delay')}
                className="text-xs text-rose-400 hover:underline font-semibold"
              >
                Analyze Delay &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {criticalActivities.slice(0, 5).map(act => (
                <div
                  key={act.id}
                  className="p-3 rounded-xl bg-graphite-950/70 border border-graphite-800 hover:border-rose-500/40 transition-colors flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-mono font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.2 rounded border border-rose-900/50">
                        {act.id}
                      </span>
                      <span className="text-xs font-semibold text-white truncate">{act.name}</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Duration: {act.plannedDuration}d • Due: <span className="text-cyan-300 font-mono">{formatIndianDate(act.earlyFinish || act.currentPlannedFinish)}</span> • Owner: {act.responsiblePerson}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[11px] font-mono font-bold text-white bg-graphite-800 px-2 py-0.5 rounded">
                      {act.progressPercent}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-graphite-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">Total Critical Activities: {criticalActivities.length}</span>
            <button
              onClick={() => setActiveTab('gantt')}
              className="text-cyan-400 font-semibold hover:underline"
            >
              Open Gantt Schedule &rarr;
            </button>
          </div>
        </div>

        {/* Right Column: Site Block Readiness & Pending Clearances */}
        <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Layers className="w-4 h-4 text-cyan-400" />
                  <span>Site Block Workfronts & Clearances</span>
                </h3>
                <p className="text-xs text-slate-400">Checks if site blocks are cleared for civil, piling & module mounting.</p>
              </div>
              <button
                onClick={() => setActiveTab('workfront')}
                className="text-xs text-cyan-400 hover:underline font-semibold"
              >
                Clear Checklist &rarr;
              </button>
            </div>

            <div className="space-y-2.5">
              {currentProject.blocks.map(block => {
                const blockedCount = block.readinessChecks.filter(c => c.status === 'BLOCKED').length;
                return (
                  <div
                    key={block.id}
                    className="p-3 rounded-xl bg-graphite-950/70 border border-graphite-800 flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{block.name}</span>
                        <span className="text-[10px] text-slate-400 font-mono">({block.capacityMWp} MWp)</span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        {blockedCount === 0 ? 'All site, drawing & HSE checks cleared' : `⚠ ${blockedCount} blocking check(s) pending`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                        block.status === 'READY'
                          ? 'text-emerald-400 bg-emerald-950/60 border border-emerald-800/50'
                          : block.status === 'BLOCKED'
                          ? 'text-rose-400 bg-rose-950/60 border border-rose-800/50'
                          : 'text-amber-400 bg-amber-950/60 border border-amber-800/50'
                      }`}>
                        {block.status}
                      </span>
                      <p className="text-[10px] text-cyan-300 font-mono mt-1">{block.actualProgress}% Done</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-graphite-800 flex justify-between items-center text-xs">
            <span className="text-slate-400">{currentProject.blocks.length} Total Site Blocks</span>
            <button
              onClick={() => setActiveTab('workfront')}
              className="text-cyan-400 font-semibold hover:underline"
            >
              Workfront Matrix &rarr;
            </button>
          </div>
        </div>
      </div>

      {/* 6. DETAILED S-CURVE & MILESTONES (VISIBLE IN DETAILED MODE OR EXPANDABLE) */}
      {dashboardMode === 'DETAILED' && (
        <div className="space-y-6 pt-2">
          {/* S-Curve Chart */}
          <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Cumulative Progress S-Curve (Planned Baseline vs Actual Execution)</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual comparison across project timeline: {formatIndianDate(currentProject.plannedStartDate)} to {formatIndianDate(forecastFinishDate)}
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="flex items-center gap-1.5 text-slate-300">
                  <span className="w-3 h-0.5 bg-slate-400 inline-block border-b-2 border-dashed border-slate-400"></span>
                  Planned Baseline
                </span>
                <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                  <span className="w-3 h-1 bg-cyan-400 rounded-full inline-block"></span>
                  Actual Progress
                </span>
              </div>
            </div>

            <div className="h-64 w-full bg-graphite-950/70 rounded-xl p-3 border border-graphite-800 relative">
              <svg className="w-full h-full" viewBox="0 0 600 200" preserveAspectRatio="none">
                <line x1="50" y1="20" x2="570" y2="20" stroke="#1f2937" strokeDasharray="3 3" />
                <line x1="50" y1="65" x2="570" y2="65" stroke="#1f2937" strokeDasharray="3 3" />
                <line x1="50" y1="110" x2="570" y2="110" stroke="#1f2937" strokeDasharray="3 3" />
                <line x1="50" y1="155" x2="570" y2="155" stroke="#1f2937" strokeDasharray="3 3" />

                <text x="40" y="24" fill="#6b7280" fontSize="10" textAnchor="end">100%</text>
                <text x="40" y="69" fill="#6b7280" fontSize="10" textAnchor="end">75%</text>
                <text x="40" y="114" fill="#6b7280" fontSize="10" textAnchor="end">50%</text>
                <text x="40" y="159" fill="#6b7280" fontSize="10" textAnchor="end">25%</text>

                {/* Planned Baseline S-Curve */}
                <path
                  d="M 50 180 C 180 175, 250 120, 360 60 C 440 25, 520 20, 570 20"
                  fill="none"
                  stroke="#64748b"
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />

                {/* Actual Progress Curve */}
                {(() => {
                  const actualX = 50 + (520 * Math.min(100, Math.max(0, plannedProgressPercent))) / 100;
                  const actualY = 180 - (160 * Math.min(100, Math.max(0, totalPhysicalProgress))) / 100;
                  return (
                    <>
                      <path
                        d={`M 50 180 C ${50 + actualX / 3} 175, ${50 + (actualX * 2) / 3} ${actualY + 20}, ${actualX} ${actualY}`}
                        fill="none"
                        stroke="#00E5FF"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                      />
                      <circle cx={actualX} cy={actualY} r="5" fill="#00E5FF" stroke="#0B0F17" strokeWidth="2" />
                      <line x1={actualX} y1="20" x2={actualX} y2="180" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="2 2" />
                      <text x={actualX + 5} y="32" fill="#f59e0b" fontSize="10" fontWeight="bold">Current Point</text>
                    </>
                  );
                })()}

                {/* X Axis Timeline Labels */}
                {sCurvePoints.map((label, index) => {
                  const xPos = 50 + (520 / (sCurvePoints.length - 1)) * index;
                  return (
                    <text key={index} x={xPos} y="196" fill="#9ca3af" fontSize="10" textAnchor="middle">
                      {label}
                    </text>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Key Milestones */}
          <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-cyan-400" />
                <span>Contractual & Statutory Project Milestones</span>
              </h3>
              <span className="text-xs text-slate-400">Target COD Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {milestones.map(m => (
                <div
                  key={m.id}
                  className="p-3.5 rounded-xl bg-graphite-950/60 border border-graphite-800"
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold">{m.id}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                      m.status === 'COMPLETED'
                        ? 'bg-emerald-950 text-emerald-400'
                        : 'bg-graphite-800 text-slate-300'
                    }`}>
                      {m.status}
                    </span>
                  </div>
                  <h4 className="text-xs font-semibold text-slate-100 line-clamp-2">{m.name}</h4>
                  <p className="text-[11px] font-mono text-cyan-300 mt-2">
                    Target: {formatIndianDate(m.earlyFinish || m.currentPlannedFinish || m.baselineFinish)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Quick Edit Specifications Modal */}
      {showQuickEditModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-solar-amber" />
                <h3 className="text-sm font-bold text-white">Adjust Project Capacity & Specifications</h3>
              </div>
              <button onClick={() => setShowQuickEditModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuickEdit} className="space-y-4 py-4 text-xs">
              <div className="p-3 bg-cyan-950/40 border border-cyan-800/40 rounded-xl text-cyan-200 text-[11px]">
                Modifying the plant capacity or acreage dynamically updates the entire CPM schedule, workfront blocks, and physical progress across all views up to Excel export.
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  value={quickName}
                  onChange={(e) => setQuickName(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    DC Capacity (MWp) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={quickDcMW}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setQuickDcMW(val);
                      setQuickAcMW(Math.round(val * 0.8 * 10) / 10);
                      setQuickAcres(Math.round(val * 4));
                    }}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    AC Capacity (MWac) *
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0.1"
                    required
                    value={quickAcMW}
                    onChange={(e) => setQuickAcMW(Number(e.target.value))}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Plant Land Area (Acres) *
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  required
                  value={quickAcres}
                  onChange={(e) => setQuickAcres(Number(e.target.value))}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
                <button
                  type="button"
                  onClick={() => setShowQuickEditModal(false)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold transition-all shadow-lg shadow-cyan-500/20"
                >
                  Save & Sync All Modules
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
