import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Activity, WBSNode, DependencyType } from '../../types';
import { formatIndianDate } from '../../services/dateUtils';
import { parseActivitiesFromExcel, parseProjectFromExcel, exportProjectToExcel } from '../../services/excelService';
import {
  FolderTree,
  Plus,
  Trash2,
  Edit2,
  Upload,
  Download,
  Layers,
  ChevronDown,
  ChevronRight,
  Flame,
  Check,
  X,
  Sparkles,
  Calendar,
  Clock,
  Percent,
  AlertTriangle,
  RotateCcw
} from 'lucide-react';

export const WbsView: React.FC = () => {
  const {
    currentProject,
    addWBSNode,
    updateWBSNode,
    deleteWBSNode,
    generateStandardWBS,
    addActivity,
    updateActivity,
    deleteActivity,
    importActivities,
    updateProjectDetails,
    showNotification
  } = useProject();

  const [collapsedWbs, setCollapsedWbs] = useState<Record<string, boolean>>({});

  // Add WBS Node Modal
  const [showAddWbsModal, setShowAddWbsModal] = useState(false);
  const [newWbsName, setNewWbsName] = useState('');
  const [newWbsCode, setNewWbsCode] = useState('');

  // Add Activity Modal
  const [showAddActModal, setShowAddActModal] = useState(false);
  const [targetWbsId, setTargetWbsId] = useState('');
  const [actId, setActId] = useState('');
  const [actName, setActName] = useState('');
  const [actDuration, setActDuration] = useState(5);
  const [actStart, setActStart] = useState('');
  const [actFinish, setActFinish] = useState('');
  const [actProgress, setActProgress] = useState(0);
  const [actStatus, setActStatus] = useState<Activity['status']>('NOT_STARTED');
  const [actTeam, setActTeam] = useState('Site Execution');
  const [actOwner, setActOwner] = useState('Site Engineer');
  const [actIsMilestone, setActIsMilestone] = useState(false);
  const [actPredId, setActPredId] = useState('');
  const [actPredType, setActPredType] = useState<DependencyType>('FS');
  const [actPredLag, setActPredLag] = useState(0);

  // Edit Activity Modal
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editName, setEditName] = useState('');
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editStart, setEditStart] = useState('');
  const [editFinish, setEditFinish] = useState('');
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<Activity['status']>('NOT_STARTED');
  const [editTeam, setEditTeam] = useState('');
  const [editOwner, setEditOwner] = useState('');
  const [editPredId, setEditPredId] = useState('');
  const [editPredType, setEditPredType] = useState<DependencyType>('FS');
  const [editPredLag, setEditPredLag] = useState(0);

  // Inline Quick Edit state
  const [inlineEditingId, setInlineEditingId] = useState<string | null>(null);
  const [inlineName, setInlineName] = useState('');
  const [inlineDuration, setInlineDuration] = useState<number>(0);
  const [inlineStart, setInlineStart] = useState('');
  const [inlineFinish, setInlineFinish] = useState('');
  const [inlineProgress, setInlineProgress] = useState<number>(0);
  const [inlineStatus, setInlineStatus] = useState<Activity['status']>('NOT_STARTED');

  // Edit WBS Node
  const [editingWbsId, setEditingWbsId] = useState<string | null>(null);
  const [editingWbsName, setEditingWbsName] = useState('');

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  const toggleCollapse = (id: string) => {
    setCollapsedWbs(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCreateWbsNode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWbsName.trim()) return;
    const code = newWbsCode || `${currentProject.wbsNodes.length + 1}.0`;
    addWBSNode(newWbsName, code);
    setShowAddWbsModal(false);
    setNewWbsName('');
    setNewWbsCode('');
  };

  const handleCreateActivity = (e: React.FormEvent) => {
    e.preventDefault();
    if (!actName.trim()) return;

    const newId = actId.trim() || `ACT-${(currentProject.activities.length + 1).toString().padStart(3, '0')}`;
    const baseStart = actStart || currentProject.plannedStartDate;
    const baseFinish = actFinish || baseStart;

    const predecessors = actPredId ? [{
      activityId: actPredId,
      type: actPredType,
      lagDays: actPredLag
    }] : [];

    addActivity({
      id: newId,
      wbsId: targetWbsId || currentProject.wbsNodes[0]?.id || 'WBS-LAND',
      name: actName,
      plannedDuration: actIsMilestone ? 0 : actDuration,
      baselineStart: baseStart,
      baselineFinish: baseFinish,
      predecessors,
      responsibleTeam: actTeam,
      responsiblePerson: actOwner,
      isMilestone: actIsMilestone,
      progressPercent: actProgress,
      status: actProgress === 100 ? 'COMPLETED' : actStatus
    });

    setShowAddActModal(false);
    setActName('');
    setActId('');
    setActDuration(5);
    setActStart('');
    setActFinish('');
    setActProgress(0);
    setActStatus('NOT_STARTED');
  };

  const openEditModal = (act: Activity) => {
    setEditingActivity(act);
    setEditName(act.name);
    setEditDuration(act.plannedDuration);
    setEditStart(act.earlyStart || act.currentPlannedStart || act.baselineStart);
    setEditFinish(act.earlyFinish || act.currentPlannedFinish || act.baselineFinish);
    setEditProgress(act.progressPercent);
    setEditStatus(act.status);
    setEditTeam(act.responsibleTeam);
    setEditOwner(act.responsiblePerson);
    setEditPredId('');
    setEditPredType('FS');
    setEditPredLag(0);
  };

  const saveEditModal = () => {
    if (!editingActivity) return;
    const updates: Partial<Activity> = {
      name: editName,
      plannedDuration: editDuration,
      earlyStart: editStart,
      earlyFinish: editFinish,
      progressPercent: editProgress,
      status: editProgress === 100 ? 'COMPLETED' : editStatus,
      responsibleTeam: editTeam,
      responsiblePerson: editOwner
    };

    if (editPredId) {
      const existing = editingActivity.predecessors.filter(p => p.activityId !== editPredId);
      updates.predecessors = [
        ...existing,
        { activityId: editPredId, type: editPredType, lagDays: editPredLag }
      ];
    }

    updateActivity(editingActivity.id, updates);
    setEditingActivity(null);
    showNotification(`Updated activity ${editingActivity.id} - ${editName}`, 'success');
  };

  const startInlineEdit = (act: Activity) => {
    setInlineEditingId(act.id);
    setInlineName(act.name);
    setInlineDuration(act.plannedDuration);
    setInlineStart(act.earlyStart || act.currentPlannedStart || act.baselineStart);
    setInlineFinish(act.earlyFinish || act.currentPlannedFinish || act.baselineFinish);
    setInlineProgress(act.progressPercent);
    setInlineStatus(act.status);
  };

  const saveInlineEdit = (actId: string) => {
    updateActivity(actId, {
      name: inlineName,
      plannedDuration: inlineDuration,
      earlyStart: inlineStart,
      earlyFinish: inlineFinish,
      progressPercent: inlineProgress,
      status: inlineProgress === 100 ? 'COMPLETED' : inlineStatus
    });
    setInlineEditingId(null);
    showNotification(`Saved changes to ${actId}`, 'success');
  };

  const handleExcelImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { projectData, activities } = await parseProjectFromExcel(file);
      if (projectData && Object.keys(projectData).length > 0) {
        updateProjectDetails(projectData);
      }
      if (activities && activities.length > 0) {
        importActivities(activities);
        showNotification(`Imported project parameters and ${activities.length} activities from Excel`, 'success');
      } else {
        showNotification('No schedule activities found in Excel file', 'warning');
      }
    } catch (err) {
      showNotification('Failed to parse Excel file for activities import', 'error');
    }
  };

  const handleExcelExport = () => {
    try {
      exportProjectToExcel(currentProject);
      showNotification('Excel project file downloaded successfully', 'success');
    } catch (err) {
      showNotification('Failed to export Excel project', 'error');
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderTree className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              SWELECT Solar EPC Master Schedule & WBS Dictionary
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            {currentProject.activities.length} Activities across {currentProject.wbsNodes.length} WBS Categories. Directly edit Task Names, Durations, Start & Finish Dates, Predecessors, and % Complete. Fully synchronized with Excel export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExcelExport}
            className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>

          <label className="px-3.5 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-slate-200 border border-graphite-700 text-xs font-semibold flex items-center gap-1.5 cursor-pointer">
            <Upload className="w-3.5 h-3.5 text-cyan-400" />
            <span>Import Excel</span>
            <input type="file" accept=".xlsx, .xls" onChange={handleExcelImport} className="hidden" />
          </label>

          <button
            onClick={() => setShowAddWbsModal(true)}
            className="px-3.5 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add WBS Level</span>
          </button>

          <button
            onClick={() => {
              if (currentProject.wbsNodes.length > 0) {
                setTargetWbsId(currentProject.wbsNodes[0].id);
              }
              setShowAddActModal(true);
            }}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Activity</span>
          </button>
        </div>
      </div>

      {/* WBS Hierarchy List */}
      <div className="space-y-4">
        {currentProject.wbsNodes.map(node => {
          const isCollapsed = collapsedWbs[node.id];
          const nodeActivities = currentProject.activities.filter(a => a.wbsId === node.id);

          // Calculate average % complete for this WBS category
          const categoryProgress = nodeActivities.length > 0
            ? Math.round(nodeActivities.reduce((s, a) => s + (a.progressPercent || 0), 0) / nodeActivities.length)
            : 0;

          // Calculate total duration for this WBS category
          const categoryDuration = nodeActivities.reduce((s, a) => s + (a.plannedDuration || 0), 0);

          return (
            <div
              key={node.id}
              className="bg-graphite-900 border border-graphite-750 rounded-2xl shadow-xl overflow-hidden"
            >
              {/* WBS Node Header */}
              <div className="p-3.5 bg-graphite-850 border-b border-graphite-750/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleCollapse(node.id)}
                    className="p-1 hover:bg-graphite-750 rounded text-cyan-400"
                  >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>

                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800/60">
                    {node.code}
                  </span>

                  {editingWbsId === node.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingWbsName}
                        onChange={(e) => setEditingWbsName(e.target.value)}
                        className="bg-graphite-800 border border-cyan-400 rounded px-2 py-0.5 text-xs text-white"
                      />
                      <button
                        onClick={() => {
                          updateWBSNode(node.id, editingWbsName);
                          setEditingWbsId(null);
                        }}
                        className="text-emerald-400 hover:text-emerald-300"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <h3 className="text-sm font-bold text-slate-100">{node.name}</h3>
                  )}
                </div>

                <div className="flex items-center gap-4">
                  {/* Category Progress Pill */}
                  <div className="hidden sm:flex items-center gap-2 text-xs">
                    <span className="text-slate-400 font-mono text-[11px]">{categoryDuration}d</span>
                    <span className={`px-2 py-0.5 rounded font-mono font-bold text-[11px] ${
                      categoryProgress === 100
                        ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                        : categoryProgress > 0
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                        : 'bg-graphite-800 text-slate-400'
                    }`}>
                      {categoryProgress}% Complete
                    </span>
                  </div>

                  <span className="text-[11px] text-slate-400 font-mono">
                    {nodeActivities.length} {nodeActivities.length === 1 ? 'task' : 'tasks'}
                  </span>

                  <button
                    onClick={() => {
                      setTargetWbsId(node.id);
                      setShowAddActModal(true);
                    }}
                    className="p-1.5 rounded-lg bg-graphite-800 hover:bg-graphite-750 text-cyan-300 text-xs font-medium flex items-center gap-1"
                    title="Add Activity under this WBS"
                  >
                    <Plus className="w-3 h-3" />
                    <span className="text-[11px] hidden sm:inline">Add Task</span>
                  </button>

                  <button
                    onClick={() => {
                      setEditingWbsId(node.id);
                      setEditingWbsName(node.name);
                    }}
                    className="p-1.5 text-slate-400 hover:text-white"
                    title="Rename WBS"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => {
                      if (confirm(`Delete WBS category "${node.name}" and its activities?`)) {
                        deleteWBSNode(node.id);
                      }
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-400"
                    title="Delete WBS"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Activities Table */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  {nodeActivities.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 italic">
                      No activities added under this WBS package yet. Click &quot;Add Task&quot; to assign tasks.
                    </div>
                  ) : (
                    <table className="w-full text-left text-xs">
                      <thead className="bg-graphite-950/70 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-graphite-800">
                        <tr>
                          <th className="py-2.5 px-3">Task Name</th>
                          <th className="py-2.5 px-2 text-center">Duration</th>
                          <th className="py-2.5 px-3 text-center">Start Date</th>
                          <th className="py-2.5 px-3 text-center">Finish Date</th>
                          <th className="py-2.5 px-3">Predecessors</th>
                          <th className="py-2.5 px-2 text-center">% Complete</th>
                          <th className="py-2.5 px-2 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-graphite-800">
                        {nodeActivities.map(act => {
                          const isInline = inlineEditingId === act.id;

                          return (
                            <tr
                              key={act.id}
                              className={`transition-colors ${
                                isInline
                                  ? 'bg-cyan-950/30 border-l-2 border-cyan-400'
                                  : 'hover:bg-graphite-850/40'
                              }`}
                            >
                              {/* Task Name */}
                              <td className="py-2 px-3 max-w-xs">
                                {isInline ? (
                                  <input
                                    type="text"
                                    value={inlineName}
                                    onChange={(e) => setInlineName(e.target.value)}
                                    className="w-full bg-graphite-800 border border-cyan-500 rounded p-1 text-xs text-white"
                                  />
                                ) : (
                                  <div className="flex items-center gap-1.5">
                                    {act.isCritical && (
                                      <span title="Critical Path (Zero Float)">
                                        <Flame className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                                      </span>
                                    )}
                                    <span className="font-mono text-[10px] text-slate-500 font-semibold">{act.id}</span>
                                    <span className={`font-medium truncate ${act.isCritical ? 'text-rose-300 font-semibold' : 'text-slate-200'}`}>
                                      {act.name}
                                    </span>
                                  </div>
                                )}
                              </td>

                              {/* Duration */}
                              <td className="py-2 px-2 text-center font-mono">
                                {isInline ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      value={inlineDuration}
                                      onChange={(e) => setInlineDuration(Math.max(0, parseInt(e.target.value) || 0))}
                                      className="w-12 bg-graphite-800 border border-cyan-500 rounded p-1 text-xs text-white text-center font-mono"
                                    />
                                    <span className="text-[10px] text-slate-400">d</span>
                                  </div>
                                ) : (
                                  <span className="text-slate-300 text-[11px]">{act.plannedDuration} days</span>
                                )}
                              </td>

                              {/* Start Date */}
                              <td className="py-2 px-3 text-center font-mono">
                                {isInline ? (
                                  <input
                                    type="date"
                                    value={inlineStart}
                                    onChange={(e) => setInlineStart(e.target.value)}
                                    className="bg-graphite-800 border border-cyan-500 rounded p-1 text-[11px] text-white font-mono"
                                  />
                                ) : (
                                  <span className="text-[11px] text-slate-300">
                                    {formatIndianDate(act.earlyStart || act.currentPlannedStart || act.baselineStart)}
                                  </span>
                                )}
                              </td>

                              {/* Finish Date */}
                              <td className="py-2 px-3 text-center font-mono">
                                {isInline ? (
                                  <input
                                    type="date"
                                    value={inlineFinish}
                                    onChange={(e) => setInlineFinish(e.target.value)}
                                    className="bg-graphite-800 border border-cyan-500 rounded p-1 text-[11px] text-white font-mono"
                                  />
                                ) : (
                                  <span className="text-[11px] text-slate-200 font-semibold">
                                    {formatIndianDate(act.earlyFinish || act.currentPlannedFinish || act.baselineFinish)}
                                  </span>
                                )}
                              </td>

                              {/* Predecessors */}
                              <td className="py-2 px-3 font-mono text-[11px] text-slate-400">
                                {act.predecessors.length > 0 ? (
                                  act.predecessors.map(p => `${p.activityId} (${p.type}${p.lagDays ? `+${p.lagDays}d` : ''})`).join(', ')
                                ) : (
                                  <span className="text-slate-600">--</span>
                                )}
                              </td>

                              {/* % Complete */}
                              <td className="py-2 px-2 text-center">
                                {isInline ? (
                                  <div className="flex items-center justify-center gap-1">
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      value={inlineProgress}
                                      onChange={(e) => {
                                        const p = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                                        setInlineProgress(p);
                                        if (p === 100) setInlineStatus('COMPLETED');
                                        else if (p > 0 && inlineStatus === 'NOT_STARTED') setInlineStatus('IN_PROGRESS');
                                      }}
                                      className="w-14 bg-graphite-800 border border-cyan-500 rounded p-1 text-xs text-white text-center font-mono font-bold"
                                    />
                                    <span className="text-[10px] text-slate-400">%</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <span className={`text-[11px] font-mono font-bold ${
                                      act.progressPercent === 100
                                        ? 'text-emerald-400'
                                        : act.progressPercent > 0
                                        ? 'text-cyan-400'
                                        : 'text-slate-400'
                                    }`}>
                                      {act.progressPercent}%
                                    </span>
                                    <div className="w-12 bg-graphite-800 rounded-full h-1 mt-0.5 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          act.progressPercent === 100 ? 'bg-emerald-400' : 'bg-cyan-400'
                                        }`}
                                        style={{ width: `${act.progressPercent}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-2 px-2 text-center">
                                {isInline ? (
                                  <select
                                    value={inlineStatus}
                                    onChange={(e) => setInlineStatus(e.target.value as any)}
                                    className="bg-graphite-800 border border-cyan-500 rounded p-1 text-[10px] text-white"
                                  >
                                    <option value="NOT_STARTED">NOT_STARTED</option>
                                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                                    <option value="COMPLETED">COMPLETED</option>
                                    <option value="AT_RISK">AT_RISK</option>
                                    <option value="BLOCKED">BLOCKED</option>
                                  </select>
                                ) : (
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    act.status === 'COMPLETED'
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60'
                                      : act.status === 'IN_PROGRESS'
                                      ? 'bg-cyan-950 text-cyan-400 border border-cyan-800/60'
                                      : act.status === 'AT_RISK'
                                      ? 'bg-amber-950 text-amber-400 border border-amber-800/60'
                                      : act.status === 'BLOCKED'
                                      ? 'bg-rose-950 text-rose-400 border border-rose-800/60'
                                      : 'bg-graphite-800 text-slate-400'
                                  }`}>
                                    {act.status}
                                  </span>
                                )}
                              </td>

                              {/* Actions: Edit & Delete */}
                              <td className="py-2 px-3 text-right">
                                {isInline ? (
                                  <div className="flex items-center justify-end gap-1.5">
                                    <button
                                      onClick={() => saveInlineEdit(act.id)}
                                      className="p-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30"
                                      title="Save Quick Edit"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      onClick={() => setInlineEditingId(null)}
                                      className="p-1 rounded bg-graphite-800 text-slate-400 hover:text-white"
                                      title="Cancel"
                                    >
                                      <X className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-end gap-1">
                                    <button
                                      onClick={() => startInlineEdit(act)}
                                      className="p-1 text-slate-400 hover:text-cyan-400 rounded transition-colors"
                                      title="Quick Inline Edit"
                                    >
                                      <Edit2 className="w-3.5 h-3.5" />
                                    </button>

                                    <button
                                      onClick={() => openEditModal(act)}
                                      className="px-1.5 py-0.5 rounded bg-graphite-800 hover:bg-graphite-750 text-[10px] text-cyan-300"
                                      title="Full Activity Editor"
                                    >
                                      Details
                                    </button>

                                    <button
                                      onClick={() => {
                                        if (confirm(`Delete activity ${act.id} "${act.name}"? This will recalculate dependent CPM successor paths.`)) {
                                          deleteActivity(act.id);
                                        }
                                      }}
                                      className="p-1 text-slate-500 hover:text-rose-400 rounded transition-colors"
                                      title="Delete Activity"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Full Activity Edit Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-xl rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {editingActivity.id}
                </span>
                <h3 className="text-sm font-bold text-white">Edit Solar EPC Activity</h3>
              </div>
              <button onClick={() => setEditingActivity(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Duration (Days) *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold text-sm"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Finish Date
                  </label>
                  <input
                    type="date"
                    value={editFinish}
                    onChange={(e) => setEditFinish(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    % Complete (0 - 100%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editProgress}
                    onChange={(e) => {
                      const p = Math.min(100, Math.max(0, parseInt(e.target.value) || 0));
                      setEditProgress(p);
                      if (p === 100) setEditStatus('COMPLETED');
                      else if (p > 0 && editStatus === 'NOT_STARTED') setEditStatus('IN_PROGRESS');
                    }}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Activity Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as any)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="NOT_STARTED">NOT_STARTED</option>
                    <option value="IN_PROGRESS">IN_PROGRESS</option>
                    <option value="COMPLETED">COMPLETED</option>
                    <option value="AT_RISK">AT_RISK</option>
                    <option value="BLOCKED">BLOCKED</option>
                  </select>
                </div>
              </div>

              {/* Predecessors Config */}
              <div className="p-3 bg-graphite-950 rounded-xl border border-graphite-800">
                <p className="text-[11px] font-semibold text-slate-300 uppercase mb-2">Predecessor Dependencies</p>
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {editingActivity.predecessors.map(p => (
                    <span key={p.activityId} className="px-2 py-0.5 bg-graphite-800 rounded text-[10px] font-mono text-cyan-300 border border-graphite-700">
                      {p.activityId} ({p.type} {p.lagDays >= 0 ? `+${p.lagDays}d` : `${p.lagDays}d`})
                    </span>
                  ))}
                  {editingActivity.predecessors.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">No predecessors</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={editPredId}
                    onChange={(e) => setEditPredId(e.target.value)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200"
                  >
                    <option value="">+ Add Predecessor...</option>
                    {currentProject.activities
                      .filter(a => a.id !== editingActivity.id)
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.id} - {a.name.slice(0, 22)}</option>
                      ))}
                  </select>

                  <select
                    value={editPredType}
                    onChange={(e) => setEditPredType(e.target.value as DependencyType)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200"
                  >
                    <option value="FS">Finish-to-Start (FS)</option>
                    <option value="SS">Start-to-Start (SS)</option>
                    <option value="FF">Finish-to-Finish (FF)</option>
                    <option value="SF">Start-to-Finish (SF)</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Lag days"
                    value={editPredLag}
                    onChange={(e) => setEditPredLag(parseInt(e.target.value) || 0)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Responsible Team
                  </label>
                  <input
                    type="text"
                    value={editTeam}
                    onChange={(e) => setEditTeam(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Responsible Person
                  </label>
                  <input
                    type="text"
                    value={editOwner}
                    onChange={(e) => setEditOwner(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-graphite-750">
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete activity ${editingActivity.id} permanently?`)) {
                    deleteActivity(editingActivity.id);
                    setEditingActivity(null);
                  }
                }}
                className="px-3 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs font-semibold flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Task</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveEditModal}
                  className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-500/20"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Recalculate CPM</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add WBS Level */}
      {showAddWbsModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FolderTree className="w-4 h-4 text-cyan-400" />
                <span>Add WBS Package Level</span>
              </h3>
              <button onClick={() => setShowAddWbsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateWbsNode} className="space-y-4 py-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  WBS Code (e.g. 9.0 or 5.2)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 9.0"
                  value={newWbsCode}
                  onChange={(e) => setNewWbsCode(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  WBS Package Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Environmental & Ecology Clearances"
                  value={newWbsName}
                  onChange={(e) => setNewWbsName(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
                <button
                  type="button"
                  onClick={() => setShowAddWbsModal(false)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold"
                >
                  Create Package
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Activity */}
      {showAddActModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add Task to WBS</span>
              </h3>
              <button onClick={() => setShowAddActModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateActivity} className="space-y-4 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    WBS Category *
                  </label>
                  <select
                    value={targetWbsId}
                    onChange={(e) => setTargetWbsId(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  >
                    {currentProject.wbsNodes.map(n => (
                      <option key={n.id} value={n.id}>{n.code} {n.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Activity ID
                  </label>
                  <input
                    type="text"
                    placeholder={`e.g. ACT-${(currentProject.activities.length + 1).toString().padStart(3, '0')}`}
                    value={actId}
                    onChange={(e) => setActId(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Task Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Transformer Foundation excavation & rebar binding"
                  value={actName}
                  onChange={(e) => setActName(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    disabled={actIsMilestone}
                    value={actDuration}
                    onChange={(e) => setActDuration(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={actStart}
                    onChange={(e) => setActStart(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    % Complete
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={actProgress}
                    onChange={(e) => setActProgress(parseInt(e.target.value) || 0)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Predecessors */}
              <div className="p-3 bg-graphite-950 rounded-xl border border-graphite-800">
                <p className="text-[11px] font-semibold text-slate-300 uppercase mb-2">Initial Predecessor Dependency</p>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    value={actPredId}
                    onChange={(e) => setActPredId(e.target.value)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200"
                  >
                    <option value="">No Predecessor</option>
                    {currentProject.activities.map(a => (
                      <option key={a.id} value={a.id}>{a.id} - {a.name.slice(0, 20)}</option>
                    ))}
                  </select>

                  <select
                    value={actPredType}
                    onChange={(e) => setActPredType(e.target.value as DependencyType)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200"
                  >
                    <option value="FS">Finish-to-Start (FS)</option>
                    <option value="SS">Start-to-Start (SS)</option>
                    <option value="FF">Finish-to-Finish (FF)</option>
                    <option value="SF">Start-to-Finish (SF)</option>
                  </select>

                  <input
                    type="number"
                    placeholder="Lag days"
                    value={actPredLag}
                    onChange={(e) => setActPredLag(parseInt(e.target.value) || 0)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Responsible Team
                  </label>
                  <input
                    type="text"
                    value={actTeam}
                    onChange={(e) => setActTeam(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Responsible Person
                  </label>
                  <input
                    type="text"
                    value={actOwner}
                    onChange={(e) => setActOwner(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
                <button
                  type="button"
                  onClick={() => setShowAddActModal(false)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold"
                >
                  Add Task & Run CPM
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
