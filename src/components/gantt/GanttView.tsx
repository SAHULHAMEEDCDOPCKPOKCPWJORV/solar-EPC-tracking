import React, { useState, useMemo, useRef } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Activity, WBSNode, DependencyType } from '../../types';
import { formatIndianDate, calendarDaysBetween } from '../../services/dateUtils';
import { exportProjectToExcel } from '../../services/excelService';
import { GanttPdfModal } from './GanttPdfModal';
import {
  CalendarDays,
  Search,
  Filter,
  ZoomIn,
  ZoomOut,
  Maximize2,
  ChevronDown,
  ChevronRight,
  Flame,
  ShieldAlert,
  Clock,
  Edit2,
  X,
  Check,
  Plus,
  Trash2,
  FileDown,
  Printer,
  FileSpreadsheet
} from 'lucide-react';

type ZoomLevel = 'DAY' | 'WEEK' | 'MONTH';

export const GanttView: React.FC = () => {
  const { currentProject, updateActivity, deleteActivity, setActiveTab, showNotification } = useProject();

  const [zoom, setZoom] = useState<ZoomLevel>('WEEK');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWbs, setSelectedWbs] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [selectedBlock, setSelectedBlock] = useState<string>('ALL');
  const [selectedTeam, setSelectedTeam] = useState<string>('ALL');
  const [collapsedWbs, setCollapsedWbs] = useState<Record<string, boolean>>({});
  const [showCriticalOnly, setShowCriticalOnly] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);

  // Quick edit modal state
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editName, setEditName] = useState<string>('');
  const [editDuration, setEditDuration] = useState<number>(0);
  const [editStart, setEditStart] = useState<string>('');
  const [editFinish, setEditFinish] = useState<string>('');
  const [editProgress, setEditProgress] = useState<number>(0);
  const [editStatus, setEditStatus] = useState<Activity['status']>('NOT_STARTED');
  const [editPredId, setEditPredId] = useState<string>('');
  const [editPredType, setEditPredType] = useState<DependencyType>('FS');
  const [editPredLag, setEditPredLag] = useState<number>(0);

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected. Please create or open a project.
      </div>
    );
  }

  // Determine overall timeline min start and max finish
  const { timelineStart, timelineFinish, totalDays } = useMemo(() => {
    let minD = currentProject.plannedStartDate;
    let maxD = currentProject.plannedFinishDate;

    currentProject.activities.forEach(a => {
      if (a.earlyStart && a.earlyStart < minD) minD = a.earlyStart;
      if (a.baselineStart && a.baselineStart < minD) minD = a.baselineStart;
      if (a.earlyFinish && a.earlyFinish > maxD) maxD = a.earlyFinish;
      if (a.baselineFinish && a.baselineFinish > maxD) maxD = a.baselineFinish;
    });

    const s = new Date(minD);
    s.setDate(s.getDate() - 3); // 3 day padding
    const f = new Date(maxD);
    f.setDate(f.getDate() + 7); // 7 day padding

    const diffDays = Math.max(30, Math.ceil((f.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    return {
      timelineStart: s,
      timelineFinish: f,
      totalDays: diffDays
    };
  }, [currentProject]);

  // Width per day depending on zoom level (well spaced for legible date ranges)
  const dayWidth = zoom === 'DAY' ? 44 : zoom === 'WEEK' ? 22 : 10;
  const chartWidth = totalDays * dayWidth;

  // 2-Tier Timeline Headers: Top tier = Months/Years, Bottom tier = Interval with Start Date to End Date
  const { monthHeaders, subHeaders } = useMemo(() => {
    const months: { label: string; left: number; width: number }[] = [];
    const subs: { label: string; subLabel?: string; left: number; width: number }[] = [];

    const curr = new Date(timelineStart);

    if (zoom === 'DAY') {
      let currentMonth = curr.getMonth();
      let currentYear = curr.getFullYear();
      let monthStartLeft = 0;
      let monthWidth = 0;

      for (let i = 0; i < totalDays; i++) {
        const d = new Date(curr);
        const isNewMonth = d.getMonth() !== currentMonth || d.getFullYear() !== currentYear;

        if (isNewMonth && monthWidth > 0) {
          const prevMonthDate = new Date(currentYear, currentMonth, 1);
          months.push({
            label: prevMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            left: monthStartLeft,
            width: monthWidth
          });
          currentMonth = d.getMonth();
          currentYear = d.getFullYear();
          monthStartLeft = i * dayWidth;
          monthWidth = 0;
        }
        monthWidth += dayWidth;

        // Daily interval with date & day
        subs.push({
          label: `${d.getDate()}`,
          subLabel: d.toLocaleString('en-US', { weekday: 'short' }),
          left: i * dayWidth,
          width: dayWidth
        });

        curr.setDate(curr.getDate() + 1);
      }

      if (monthWidth > 0) {
        const lastMonthDate = new Date(currentYear, currentMonth, 1);
        months.push({
          label: lastMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          left: monthStartLeft,
          width: monthWidth
        });
      }

    } else if (zoom === 'WEEK') {
      let currentMonth = curr.getMonth();
      let currentYear = curr.getFullYear();
      let monthStartLeft = 0;
      let monthWidth = 0;
      let weekIndex = 1;

      let dayOffset = 0;
      while (dayOffset < totalDays) {
        const weekStartDate = new Date(curr);
        const weekEndDate = new Date(curr);
        weekEndDate.setDate(weekEndDate.getDate() + 6);

        const isNewMonth = weekStartDate.getMonth() !== currentMonth || weekStartDate.getFullYear() !== currentYear;
        if (isNewMonth && monthWidth > 0) {
          const prevMonthDate = new Date(currentYear, currentMonth, 1);
          months.push({
            label: prevMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
            left: monthStartLeft,
            width: monthWidth
          });
          currentMonth = weekStartDate.getMonth();
          currentYear = weekStartDate.getFullYear();
          monthStartLeft = dayOffset * dayWidth;
          monthWidth = 0;
        }

        const weekWidth = 7 * dayWidth;
        monthWidth += weekWidth;

        const startDay = weekStartDate.getDate();
        const startMonth = weekStartDate.toLocaleString('en-US', { month: 'short' });
        const endDay = weekEndDate.getDate();
        const endMonth = weekEndDate.toLocaleString('en-US', { month: 'short' });

        // Clean, well-spaced format: "11 May - 17 May"
        const dateRangeLabel = startMonth === endMonth
          ? `${startDay} - ${endDay} ${startMonth}`
          : `${startDay} ${startMonth} - ${endDay} ${endMonth}`;

        subs.push({
          label: `Wk ${weekIndex}`,
          subLabel: dateRangeLabel,
          left: dayOffset * dayWidth,
          width: weekWidth
        });

        weekIndex++;
        curr.setDate(curr.getDate() + 7);
        dayOffset += 7;
      }

      if (monthWidth > 0) {
        const lastMonthDate = new Date(currentYear, currentMonth, 1);
        months.push({
          label: lastMonthDate.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          left: monthStartLeft,
          width: monthWidth
        });
      }

    } else {
      // MONTH ZOOM
      let dayOffset = 0;
      let currentYear = curr.getFullYear();
      let yearStartLeft = 0;
      let yearWidth = 0;

      while (dayOffset < totalDays) {
        const monthStartDate = new Date(curr.getFullYear(), curr.getMonth(), 1);
        const monthEndDate = new Date(curr.getFullYear(), curr.getMonth() + 1, 0);
        const daysInMonth = monthEndDate.getDate();

        const isNewYear = curr.getFullYear() !== currentYear;
        if (isNewYear && yearWidth > 0) {
          months.push({
            label: `${currentYear}`,
            left: yearStartLeft,
            width: yearWidth
          });
          currentYear = curr.getFullYear();
          yearStartLeft = dayOffset * dayWidth;
          yearWidth = 0;
        }

        const mWidth = daysInMonth * dayWidth;
        yearWidth += mWidth;

        subs.push({
          label: curr.toLocaleString('en-US', { month: 'long', year: 'numeric' }),
          subLabel: `${formatIndianDate(monthStartDate.toISOString())} to ${formatIndianDate(monthEndDate.toISOString())}`,
          left: dayOffset * dayWidth,
          width: mWidth
        });

        curr.setMonth(curr.getMonth() + 1);
        dayOffset += daysInMonth;
      }

      if (yearWidth > 0) {
        months.push({
          label: `${currentYear}`,
          left: yearStartLeft,
          width: yearWidth
        });
      }
    }

    return { monthHeaders: months, subHeaders: subs };
  }, [timelineStart, totalDays, zoom, dayWidth]);

  // Filter activities
  const filteredActivities = useMemo(() => {
    return currentProject.activities.filter(a => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        if (!a.name.toLowerCase().includes(q) && !a.id.toLowerCase().includes(q)) return false;
      }
      if (selectedWbs !== 'ALL' && a.wbsId !== selectedWbs) return false;
      if (selectedStatus !== 'ALL' && a.status !== selectedStatus) return false;
      if (selectedBlock !== 'ALL' && a.blockId !== selectedBlock) return false;
      if (selectedTeam !== 'ALL' && a.responsibleTeam !== selectedTeam) return false;
      if (showCriticalOnly && !a.isCritical) return false;
      return true;
    });
  }, [currentProject.activities, searchQuery, selectedWbs, selectedStatus, selectedBlock, selectedTeam, showCriticalOnly]);

  // Group activities by WBS
  const wbsGroups = useMemo(() => {
    const groups: { node: WBSNode; activities: Activity[] }[] = [];
    currentProject.wbsNodes.forEach(node => {
      const acts = filteredActivities.filter(a => a.wbsId === node.id);
      if (acts.length > 0) {
        groups.push({ node, activities: acts });
      }
    });

    // Activities without explicit WBS node
    const orphanActs = filteredActivities.filter(a => !currentProject.wbsNodes.some(n => n.id === a.wbsId));
    if (orphanActs.length > 0) {
      groups.push({
        node: { id: 'OTHER', code: '0.0', name: 'Other Solar Works', level: 1, order: 99 },
        activities: orphanActs
      });
    }

    return groups;
  }, [currentProject.wbsNodes, filteredActivities]);

  // Calculate pixel position of a date
  const getPixelOffset = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const d = new Date(dateStr + 'T00:00:00');
    const diffTime = d.getTime() - timelineStart.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);
    return Math.max(0, diffDays * dayWidth);
  };

  const todayOffset = useMemo(() => {
    const today = new Date();
    const diffDays = (today.getTime() - timelineStart.getTime()) / (1000 * 60 * 60 * 24);
    return Math.max(0, diffDays * dayWidth);
  }, [timelineStart, dayWidth]);

  // Collect unique teams & blocks for filters
  const uniqueTeams = useMemo(() => {
    const set = new Set<string>();
    currentProject.activities.forEach(a => { if (a.responsibleTeam) set.add(a.responsibleTeam); });
    return Array.from(set);
  }, [currentProject.activities]);

  const toggleWbsCollapse = (nodeId: string) => {
    setCollapsedWbs(prev => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  // Open edit modal
  const openEditModal = (act: Activity) => {
    setEditingActivity(act);
    setEditName(act.name);
    setEditDuration(act.plannedDuration);
    setEditStart(act.earlyStart || act.baselineStart || '');
    setEditFinish(act.earlyFinish || act.baselineFinish || '');
    setEditProgress(act.progressPercent);
    setEditStatus(act.status);
    setEditPredId('');
    setEditPredType('FS');
    setEditPredLag(0);
  };

  const handleSaveEdit = () => {
    if (!editingActivity) return;
    const updates: Partial<Activity> = {
      name: editName,
      plannedDuration: editDuration,
      baselineStart: editStart,
      baselineFinish: editFinish,
      earlyStart: editStart,
      earlyFinish: editFinish,
      progressPercent: editProgress,
      status: editProgress === 100 ? 'COMPLETED' : editStatus,
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
    showNotification(`Updated activity ${editingActivity.id}`, 'success');
  };

  const handleDeleteActivity = (actId: string, actName: string) => {
    if (window.confirm(`Are you sure you want to delete activity ${actId} ("${actName}")? This will update CPM dependencies.`)) {
      deleteActivity(actId);
      if (editingActivity?.id === actId) {
        setEditingActivity(null);
      }
    }
  };

  // Build row-level index for SVG dependency connector lines
  // Map activityId to vertical Y coordinate
  const activityYMap = useMemo(() => {
    const map = new Map<string, number>();
    let currentY = 0;
    const headerHeight = 36;
    const rowHeight = 44;

    wbsGroups.forEach(group => {
      currentY += headerHeight; // WBS group header
      if (!collapsedWbs[group.node.id]) {
        group.activities.forEach(act => {
          map.set(act.id, currentY + rowHeight / 2);
          currentY += rowHeight;
        });
      }
    });

    return { map, totalHeight: currentY };
  }, [wbsGroups, collapsedWbs]);

  // Selected Activity State and synchronized scrolling refs
  const [selectedActivityId, setSelectedActivityId] = useState<string | null>(null);
  const leftScrollRef = useRef<HTMLDivElement>(null);
  const rightScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingLeft = useRef(false);
  const isSyncingRight = useRef(false);

  // Synchronized Vertical Scrolling between Left table and Right Timeline
  const handleLeftScroll = () => {
    if (isSyncingLeft.current) {
      isSyncingLeft.current = false;
      return;
    }
    if (leftScrollRef.current && rightScrollRef.current) {
      isSyncingRight.current = true;
      rightScrollRef.current.scrollTop = leftScrollRef.current.scrollTop;
    }
  };

  const handleRightScroll = () => {
    if (isSyncingRight.current) {
      isSyncingRight.current = false;
      return;
    }
    if (leftScrollRef.current && rightScrollRef.current) {
      isSyncingLeft.current = true;
      leftScrollRef.current.scrollTop = rightScrollRef.current.scrollTop;
    }
  };

  // Select activity from left table or right bar and automatically scroll right timeline into view
  const handleSelectActivity = (act: Activity) => {
    setSelectedActivityId(act.id);

    // 1. Horizontally scroll the timeline so the activity's Gantt bar is brought directly into focus
    const startPx = getPixelOffset(act.earlyStart || act.baselineStart);
    if (rightScrollRef.current) {
      const containerWidth = rightScrollRef.current.clientWidth;
      const targetScrollLeft = Math.max(0, startPx - 140);
      rightScrollRef.current.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }

    // 2. Vertically scroll both left table and right timeline so the selected activity row is clearly centered
    const targetY = activityYMap.map.get(act.id);
    if (targetY !== undefined && leftScrollRef.current && rightScrollRef.current) {
      const targetScrollTop = Math.max(0, targetY - 140);
      leftScrollRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
      rightScrollRef.current.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    }
  };

  const selectedActivity = useMemo(() => {
    if (!selectedActivityId) return null;
    return currentProject.activities.find(a => a.id === selectedActivityId) || null;
  }, [currentProject.activities, selectedActivityId]);

  return (
    <div className="flex-1 flex flex-col h-full bg-graphite-950 overflow-hidden">
      {/* Gantt Toolbar */}
      <div className="bg-graphite-900 border-b border-graphite-750 px-4 py-3 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search activities or IDs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-graphite-850 border border-graphite-700 rounded-lg text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-400 w-48 sm:w-60"
            />
          </div>

          {/* WBS Filter */}
          <select
            value={selectedWbs}
            onChange={(e) => setSelectedWbs(e.target.value)}
            className="text-xs bg-graphite-850 border border-graphite-700 rounded-lg text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All WBS Categories</option>
            {currentProject.wbsNodes.map(w => (
              <option key={w.id} value={w.id}>{w.code} {w.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs bg-graphite-850 border border-graphite-700 rounded-lg text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Statuses</option>
            <option value="NOT_STARTED">Not Started</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="BLOCKED">Blocked</option>
            <option value="AT_RISK">At Risk</option>
          </select>

          {/* Block Filter */}
          <select
            value={selectedBlock}
            onChange={(e) => setSelectedBlock(e.target.value)}
            className="text-xs bg-graphite-850 border border-graphite-700 rounded-lg text-slate-300 py-1.5 px-2.5 focus:outline-none focus:border-cyan-400"
          >
            <option value="ALL">All Blocks / Zones</option>
            {currentProject.blocks.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>

          {/* Critical Path Toggle */}
          <button
            onClick={() => setShowCriticalOnly(!showCriticalOnly)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors border ${
              showCriticalOnly
                ? 'bg-rose-950 text-rose-300 border-rose-500/60 shadow-lg shadow-rose-900/30'
                : 'bg-graphite-850 text-slate-300 border-graphite-700 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-500" />
            <span>Critical Path Only</span>
          </button>
        </div>

        {/* Zoom Controls & Legend */}
        <div className="flex items-center gap-3">
          {/* Zoom Buttons */}
          <div className="flex items-center bg-graphite-850 rounded-lg p-0.5 border border-graphite-700 text-xs">
            <button
              onClick={() => setZoom('DAY')}
              className={`px-2.5 py-1 rounded font-medium ${zoom === 'DAY' ? 'bg-cyan-500 text-graphite-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Day
            </button>
            <button
              onClick={() => setZoom('WEEK')}
              className={`px-2.5 py-1 rounded font-medium ${zoom === 'WEEK' ? 'bg-cyan-500 text-graphite-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Week
            </button>
            <button
              onClick={() => setZoom('MONTH')}
              className={`px-2.5 py-1 rounded font-medium ${zoom === 'MONTH' ? 'bg-cyan-500 text-graphite-950 font-bold' : 'text-slate-400 hover:text-white'}`}
            >
              Month
            </button>
          </div>

          {/* Bar Legend */}
          <div className="hidden xl:flex items-center gap-3 text-[11px] text-slate-400 bg-graphite-850 px-3 py-1 rounded-lg border border-graphite-750">
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-slate-600 rounded-sm"></span> Baseline
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-cyan-400 rounded-sm"></span> Current CPM
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-2 bg-rose-500 rounded-sm"></span> Critical Path
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rotate-45 bg-amber-400 inline-block"></span> Milestone
            </span>
          </div>

          {/* Download PDF & Excel Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowPdfModal(true)}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/50 flex items-center gap-1.5 shadow-sm transition-all"
              title="Download Full Gantt Chart & Engineering Dossier as PDF"
            >
              <FileDown className="w-3.5 h-3.5" />
              <span>Gantt PDF</span>
            </button>

            <button
              onClick={() => {
                exportProjectToExcel(currentProject);
                showNotification('Exported complete project & Gantt schedule to Excel', 'success');
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/50 flex items-center gap-1.5 shadow-sm transition-all"
              title="Export complete synchronized project data to Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>
          </div>
        </div>
      </div>

      {/* Gantt Split View Container: Left Table + Right Timeline Canvas */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANE: Activity Hierarchy Table */}
        <div className="w-[500px] shrink-0 border-r border-graphite-750 bg-graphite-900 flex flex-col overflow-hidden">
          {/* Table Header (h-14, 56px matching right timeline 2-tier header) */}
          <div className="h-14 bg-graphite-850 border-b border-graphite-750 px-3 flex flex-col justify-center text-[11px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
            <div className="text-[9px] text-cyan-400 font-mono tracking-widest uppercase mb-1 flex items-center justify-between">
              <span>WBS Schedule Activity Hierarchy</span>
              <span className="text-slate-400 normal-case font-normal text-[10px]">Click any row to auto-focus bar &rarr;</span>
            </div>
            <div className="flex items-center justify-between text-slate-300">
              <div className="w-44 truncate">WBS / Activity Name</div>
              <div className="w-12 text-center">Dur</div>
              <div className="w-20 text-center">Start</div>
              <div className="w-20 text-center">Finish</div>
              <div className="w-12 text-center">TF</div>
              <div className="w-12 text-right">Actions</div>
            </div>
          </div>

          {/* Table Body (Synchronized scroll) */}
          <div ref={leftScrollRef} onScroll={handleLeftScroll} className="flex-1 overflow-y-auto">
            {wbsGroups.map(group => {
              const isCollapsed = collapsedWbs[group.node.id];
              return (
                <div key={group.node.id}>
                  {/* WBS Category Group Header Row */}
                  <div
                    onClick={() => toggleWbsCollapse(group.node.id)}
                    className="h-9 px-3 bg-graphite-850/80 hover:bg-graphite-800 border-b border-graphite-750/70 flex items-center justify-between cursor-pointer select-none text-xs font-bold text-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-cyan-400" />
                      )}
                      <span className="text-cyan-400 font-mono text-[11px]">{group.node.code}</span>
                      <span className="truncate">{group.node.name}</span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-normal">
                      {group.activities.length} acts
                    </span>
                  </div>

                  {/* Activity Rows */}
                  {!isCollapsed && group.activities.map(act => (
                    <div
                      key={act.id}
                      onClick={() => handleSelectActivity(act)}
                      className={`h-11 px-3 border-b flex items-center justify-between text-xs transition-all cursor-pointer group select-none ${
                        selectedActivityId === act.id
                          ? 'bg-cyan-950/90 border-l-4 border-l-cyan-400 border-b-cyan-800 text-white shadow-md'
                          : 'border-graphite-800/80 hover:bg-graphite-800/60'
                      }`}
                    >
                      {/* Name & ID */}
                      <div className="w-44 truncate pr-2">
                        <div className="flex items-center gap-1.5">
                          {act.isCritical && (
                            <span title="Critical Path (TF = 0)">
                              <Flame className="w-3 h-3 text-rose-500 shrink-0" />
                            </span>
                          )}
                          <span className={`text-[10px] font-mono font-medium ${selectedActivityId === act.id ? 'text-cyan-300 font-bold' : 'text-slate-400'}`}>
                            {act.id}
                          </span>
                          <span className={`truncate font-medium ${
                            selectedActivityId === act.id
                              ? 'text-cyan-200 font-bold'
                              : act.isCritical
                              ? 'text-rose-300 font-semibold'
                              : 'text-slate-200'
                          }`}>
                            {act.name}
                          </span>
                        </div>
                      </div>

                      {/* Duration */}
                      <div className="w-12 text-center font-mono text-slate-300 text-[11px]">
                        {act.plannedDuration}d
                      </div>

                      {/* Dates */}
                      <div className="w-20 text-center text-[10px] font-mono text-slate-400">
                        {formatIndianDate(act.earlyStart || act.baselineStart)}
                      </div>
                      <div className="w-20 text-center text-[10px] font-mono text-slate-300 font-medium">
                        {formatIndianDate(act.earlyFinish || act.baselineFinish)}
                      </div>

                      {/* Total Float */}
                      <div className="w-12 text-center">
                        <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded font-bold ${
                          act.totalFloat <= 0
                            ? 'text-rose-400 bg-rose-950/60 border border-rose-900/50'
                            : 'text-emerald-400 bg-emerald-950/40'
                        }`}>
                          {act.totalFloat}d
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="w-12 flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openEditModal(act);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-cyan-400 rounded transition-opacity"
                          title="Edit Activity"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteActivity(act.id, act.name);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 rounded transition-opacity"
                          title="Delete Activity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </div>

        {/* RIGHT PANE: Interactive Timeline Chart Canvas */}
        <div ref={rightScrollRef} onScroll={handleRightScroll} className="flex-1 flex flex-col overflow-x-auto overflow-y-auto relative bg-graphite-950">
          <div style={{ width: `${chartWidth}px`, minWidth: '100%' }} className="relative">
            {/* Timeline 2-Tier Header Row (h-14, 56px) - Generously spaced and clearly displaying start date to end date */}
            <div className="h-14 bg-graphite-900 border-b border-graphite-750 sticky top-0 z-20 flex flex-col shrink-0 select-none">
              {/* Tier 1: Months / Years Header */}
              <div className="h-6 border-b border-graphite-750/70 flex bg-graphite-900/95 overflow-hidden">
                {monthHeaders.map((m, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${m.width}px` }}
                    className="h-full border-r border-graphite-750/70 px-3 flex items-center text-[10px] font-bold uppercase tracking-widest text-cyan-400 font-mono shrink-0 truncate bg-cyan-950/20"
                  >
                    {m.label}
                  </div>
                ))}
              </div>

              {/* Tier 2: Interval Dates with Start Date to End Date */}
              <div className="h-8 flex bg-graphite-850 overflow-hidden">
                {subHeaders.map((sub, idx) => (
                  <div
                    key={idx}
                    style={{ width: `${sub.width}px` }}
                    className="h-full border-r border-graphite-750/80 px-2 flex flex-col justify-center text-center shrink-0"
                  >
                    <span className="text-[10px] font-bold text-slate-200 font-mono leading-tight truncate">
                      {sub.label}
                    </span>
                    {sub.subLabel && (
                      <span className="text-[9px] text-cyan-300 font-mono leading-tight truncate mt-0.5 font-semibold">
                        {sub.subLabel}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Today Marker Vertical Line */}
            {todayOffset > 0 && todayOffset < chartWidth && (
              <div
                style={{ left: `${todayOffset}px` }}
                className="absolute top-0 bottom-0 w-px bg-solar-amber z-10 pointer-events-none"
              >
                <div className="sticky top-16 -ml-6 bg-solar-amber text-graphite-950 px-1.5 py-0.5 rounded text-[9px] font-bold font-mono uppercase tracking-wider shadow">
                  Today
                </div>
              </div>
            )}

            {/* Background Grid Vertical Lines */}
            <div className="absolute inset-0 top-14 pointer-events-none flex">
              {subHeaders.map((sub, idx) => (
                <div
                  key={idx}
                  style={{ width: `${sub.width}px` }}
                  className="h-full border-r border-graphite-850/40"
                ></div>
              ))}
            </div>

            {/* SVG Dependency Connector Lines Overlay */}
            <svg
              className="absolute inset-0 top-14 pointer-events-none z-10"
              style={{ width: `${chartWidth}px`, height: `${activityYMap.totalHeight}px` }}
            >
              <defs>
                <marker
                  id="arrow-cyan"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#00E5FF" />
                </marker>
                <marker
                  id="arrow-rose"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 8 5 L 0 9 z" fill="#EF4444" />
                </marker>
              </defs>

              {filteredActivities.map(act => {
                const targetY = activityYMap.map.get(act.id);
                if (targetY === undefined) return null;
                const actStartOffset = getPixelOffset(act.earlyStart || act.currentPlannedStart);

                return act.predecessors.map((pred, pIdx) => {
                  const sourceY = activityYMap.map.get(pred.activityId);
                  const predAct = currentProject.activities.find(a => a.id === pred.activityId);
                  if (sourceY === undefined || !predAct) return null;

                  const predFinishOffset = getPixelOffset(predAct.earlyFinish || predAct.currentPlannedFinish);
                  const isCriticalEdge = act.isCritical && predAct.isCritical;

                  // Curved orthogonal path
                  const startX = predFinishOffset;
                  const startY = sourceY;
                  const endX = actStartOffset;
                  const endY = targetY;
                  const midX = startX + Math.max(10, (endX - startX) / 2);

                  const pathD = `M ${startX} ${startY} H ${midX} V ${endY} H ${endX}`;

                  return (
                    <path
                      key={`${act.id}-${pred.activityId}-${pIdx}`}
                      d={pathD}
                      fill="none"
                      stroke={isCriticalEdge ? '#EF4444' : '#00E5FF'}
                      strokeWidth={isCriticalEdge ? 2 : 1.2}
                      strokeDasharray={isCriticalEdge ? 'none' : '3 2'}
                      opacity={isCriticalEdge ? 0.9 : 0.6}
                      markerEnd={isCriticalEdge ? 'url(#arrow-rose)' : 'url(#arrow-cyan)'}
                    />
                  );
                });
              })}
            </svg>

            {/* Gantt Bar Rows */}
            <div className="relative z-10">
              {wbsGroups.map(group => {
                const isCollapsed = collapsedWbs[group.node.id];
                return (
                  <div key={group.node.id}>
                    {/* WBS Header placeholder spacer */}
                    <div className="h-9 bg-graphite-850/30 border-b border-graphite-750/30"></div>

                    {/* Activities */}
                    {!isCollapsed && group.activities.map(act => {
                      const earlyStartPx = getPixelOffset(act.earlyStart || act.currentPlannedStart);
                      const earlyFinishPx = getPixelOffset(act.earlyFinish || act.currentPlannedFinish);
                      const currentBarWidth = Math.max(8, earlyFinishPx - earlyStartPx);

                      const baseStartPx = getPixelOffset(act.baselineStart);
                      const baseFinishPx = getPixelOffset(act.baselineFinish);
                      const baseBarWidth = Math.max(8, baseFinishPx - baseStartPx);

                      return (
                        <div
                          key={act.id}
                          onClick={() => handleSelectActivity(act)}
                          className={`h-11 border-b relative flex items-center group cursor-pointer transition-colors ${
                            selectedActivityId === act.id
                              ? 'bg-cyan-950/40 border-b-cyan-800/60'
                              : 'border-graphite-850/40'
                          }`}
                        >
                          {/* Baseline Bar (Dotted / Ghost grey bar underneath) */}
                          <div
                            style={{
                              left: `${baseStartPx}px`,
                              width: `${baseBarWidth}px`
                            }}
                            className="absolute h-2 bg-slate-700/60 border border-slate-600/40 rounded-sm top-1.5 opacity-60"
                            title={`Baseline: ${formatIndianDate(act.baselineStart)} to ${formatIndianDate(act.baselineFinish)}`}
                          ></div>

                          {/* Current Schedule Bar or Milestone Diamond */}
                          {act.isMilestone ? (
                            <div
                              style={{ left: `${earlyStartPx - 8}px` }}
                              className={`absolute w-4 h-4 rotate-45 bg-solar-amber shadow-lg border-2 border-graphite-950 flex items-center justify-center cursor-pointer transition-transform ${
                                selectedActivityId === act.id
                                  ? 'ring-4 ring-cyan-300 scale-125 z-30 shadow-cyan-400/80'
                                  : 'shadow-solar-amber/30 hover:scale-125'
                              }`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectActivity(act);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                openEditModal(act);
                              }}
                              title={`Milestone: ${act.name} (${formatIndianDate(act.earlyFinish)})`}
                            ></div>
                          ) : (
                            <div
                              style={{
                                left: `${earlyStartPx}px`,
                                width: `${currentBarWidth}px`
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSelectActivity(act);
                              }}
                              onDoubleClick={(e) => {
                                e.stopPropagation();
                                openEditModal(act);
                              }}
                              className={`absolute h-5 rounded-md cursor-pointer transition-all shadow-md flex items-center px-2 overflow-hidden ${
                                selectedActivityId === act.id
                                  ? 'ring-2 ring-cyan-300 ring-offset-2 ring-offset-graphite-950 shadow-lg shadow-cyan-500/80 z-30 scale-[1.02]'
                                  : ''
                              } ${
                                act.isCritical
                                  ? 'bg-rose-600/80 border border-rose-400 text-white shadow-rose-900/40 hover:bg-rose-500'
                                  : act.status === 'COMPLETED'
                                  ? 'bg-emerald-600/80 border border-emerald-400 text-white hover:bg-emerald-500'
                                  : act.status === 'BLOCKED'
                                  ? 'bg-red-950 border border-red-600 text-red-200'
                                  : act.status === 'AT_RISK'
                                  ? 'bg-solar-amber/80 border border-amber-300 text-graphite-950 font-bold'
                                  : 'bg-cyan-500/80 border border-cyan-300 text-graphite-950 font-bold hover:bg-cyan-400'
                              }`}
                              title={`${act.name}\nPlanned: ${formatIndianDate(act.earlyStart)} to ${formatIndianDate(act.earlyFinish)}\nProgress: ${act.progressPercent}%\nTotal Float: ${act.totalFloat} days`}
                            >
                              {/* Actual Progress Overlay Fill */}
                              <div
                                style={{ width: `${act.progressPercent}%` }}
                                className="absolute left-0 top-0 bottom-0 bg-white/30"
                              ></div>

                              <span className="relative z-10 text-[10px] truncate select-none font-medium">
                                {act.progressPercent > 0 ? `${act.progressPercent}%` : ''} {act.name}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Selected Activity Inspector Bottom Bar */}
      {selectedActivity && (
        <div className="bg-graphite-900 border-t border-cyan-500/50 px-5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-2xl shrink-0 z-20">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              {selectedActivity.id}
            </span>
            <span className="font-bold text-white text-sm truncate max-w-sm">{selectedActivity.name}</span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
              selectedActivity.isCritical ? 'bg-rose-950 text-rose-400 border border-rose-800' : 'bg-emerald-950 text-emerald-400'
            }`}>
              {selectedActivity.isCritical ? 'CRITICAL PATH (Zero Float)' : `Total Float: ${selectedActivity.totalFloat}d`}
            </span>
            <span className="text-slate-300 font-mono text-[11px]">
              {formatIndianDate(selectedActivity.earlyStart || selectedActivity.baselineStart)} → {formatIndianDate(selectedActivity.earlyFinish || selectedActivity.baselineFinish)} ({selectedActivity.plannedDuration} days)
            </span>
            <span className="text-cyan-300 font-mono font-bold">
              {selectedActivity.progressPercent}% Complete
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openEditModal(selectedActivity)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs flex items-center gap-1.5 shadow transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Edit Activity</span>
            </button>
            <button
              onClick={() => handleDeleteActivity(selectedActivity.id, selectedActivity.name)}
              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete</span>
            </button>
            <button
              onClick={() => setSelectedActivityId(null)}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-graphite-800"
              title="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Quick Edit Activity Modal */}
      {editingActivity && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-700 w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                  {editingActivity.id}
                </span>
                <h3 className="text-sm font-bold text-white truncate max-w-xs">{editingActivity.name}</h3>
              </div>
              <button
                onClick={() => setEditingActivity(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 py-4 text-xs">
              {/* Task Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Activity / Task Name
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Duration and Progress */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Planned Duration (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={editDuration}
                    onChange={(e) => setEditDuration(Math.max(0, parseInt(e.target.value) || 0))}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Recalculates CPM forward/backward passes.</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Progress Percentage (%)
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={editProgress}
                    onChange={(e) => setEditProgress(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">100% marks task COMPLETED.</p>
                </div>
              </div>

              {/* Start & Finish Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={editStart}
                    onChange={(e) => setEditStart(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
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
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Activity Status
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 focus:outline-none focus:border-cyan-400"
                >
                  <option value="NOT_STARTED">NOT_STARTED</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="COMPLETED">COMPLETED</option>
                  <option value="AT_RISK">AT_RISK</option>
                  <option value="BLOCKED">BLOCKED</option>
                </select>
              </div>

              {/* Add Predecessor */}
              <div className="p-3 bg-graphite-950 rounded-xl border border-graphite-800">
                <p className="font-semibold text-slate-200 mb-2">Predecessor Dependencies</p>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editingActivity.predecessors.map(p => (
                    <span key={p.activityId} className="px-2 py-0.5 bg-graphite-800 rounded text-[10px] font-mono text-cyan-300 border border-graphite-700">
                      {p.activityId} ({p.type} {p.lagDays >= 0 ? `+${p.lagDays}d` : `${p.lagDays}d`})
                    </span>
                  ))}
                  {editingActivity.predecessors.length === 0 && (
                    <span className="text-[10px] text-slate-500 italic">No predecessors (starts at project baseline start)</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 mt-2">
                  <select
                    value={editPredId}
                    onChange={(e) => setEditPredId(e.target.value)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200"
                  >
                    <option value="">+ Add Predecessor...</option>
                    {currentProject.activities
                      .filter(a => a.id !== editingActivity.id)
                      .map(a => (
                        <option key={a.id} value={a.id}>{a.id} - {a.name.slice(0, 25)}</option>
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
                    placeholder="Lag (days)"
                    value={editPredLag}
                    onChange={(e) => setEditPredLag(parseInt(e.target.value) || 0)}
                    className="bg-graphite-850 border border-graphite-700 rounded p-1.5 text-[11px] text-slate-200"
                  />
                </div>
              </div>

              {/* Float info */}
              <div className="bg-graphite-850 p-3 rounded-xl border border-graphite-750 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Total Float</span>
                  <p className="text-sm font-bold font-mono text-cyan-300">{editingActivity.totalFloat} working days</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Critical Path</span>
                  <p className={`text-sm font-bold ${editingActivity.isCritical ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {editingActivity.isCritical ? 'YES (Zero Float)' : 'NO'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditingActivity(null);
                    setActiveTab('delay');
                  }}
                  className="px-2.5 py-1.5 rounded bg-solar-amber/10 hover:bg-solar-amber/20 text-solar-amber border border-solar-amber/30 text-xs font-semibold"
                >
                  Simulate Delay &rarr;
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-graphite-750">
              <button
                type="button"
                onClick={() => handleDeleteActivity(editingActivity.id, editingActivity.name)}
                className="px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Activity</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingActivity(null)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-slate-300 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>Save & Recalculate CPM</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* PDF Export / Printable Dossier Modal */}
      {showPdfModal && (
        <GanttPdfModal
          project={currentProject}
          onClose={() => setShowPdfModal(false)}
        />
      )}
    </div>
  );
};
