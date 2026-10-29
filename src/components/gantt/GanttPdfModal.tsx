import React, { useRef } from 'react';
import { Project, Activity } from '../../types';
import { formatIndianDate, calendarDaysBetween } from '../../services/dateUtils';
import {
  Printer,
  X,
  FileDown,
  CheckCircle2,
  Flame,
  ShieldCheck,
  AlertTriangle,
  Calendar,
  Layers,
  MapPin,
  Building,
  Info
} from 'lucide-react';

interface GanttPdfModalProps {
  project: Project;
  onClose: () => void;
}

export const GanttPdfModal: React.FC<GanttPdfModalProps> = ({ project, onClose }) => {
  const printAreaRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    window.print();
  };

  // Computations for Executive Scorecard
  const totalActivities = project.activities.length;
  const completedCount = project.activities.filter(a => a.status === 'COMPLETED').length;
  const inProgressCount = project.activities.filter(a => a.status === 'IN_PROGRESS').length;
  const criticalCount = project.activities.filter(a => a.isCritical).length;
  const delayedCount = project.activities.filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK').length;

  const totalProgress = totalActivities > 0
    ? Math.round(project.activities.reduce((s, a) => s + (a.progressPercent || 0), 0) / totalActivities)
    : 0;

  const forecastFinish = project.activities.reduce((maxDate, act) => {
    const f = act.earlyFinish || act.currentPlannedFinish || act.baselineFinish;
    return f && f > maxDate ? f : maxDate;
  }, project.plannedFinishDate);

  const scheduleVariance = calendarDaysBetween(project.plannedFinishDate, forecastFinish);

  // Group activities by WBS
  const wbsGroups = project.wbsNodes.map(node => {
    return {
      node,
      activities: project.activities.filter(a => a.wbsId === node.id)
    };
  }).filter(g => g.activities.length > 0);

  // Timeline boundaries for visual bar rendering
  const minTime = new Date((project.plannedStartDate || '2025-05-11') + 'T00:00:00').getTime();
  const maxTime = new Date((forecastFinish || project.plannedFinishDate || '2026-03-26') + 'T00:00:00').getTime();
  const totalDurationMs = Math.max(1, maxTime - minTime);

  const getBarPercentage = (dateStr?: string): number => {
    if (!dateStr) return 0;
    const t = new Date(dateStr + 'T00:00:00').getTime();
    return Math.max(0, Math.min(100, ((t - minTime) / totalDurationMs) * 100));
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-start items-center p-3 sm:p-6 overflow-y-auto">
      {/* Top Floating Control Bar (Hidden when printing) */}
      <div className="w-full max-w-7xl bg-graphite-900 border border-graphite-750 rounded-2xl p-4 shadow-2xl mb-4 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-950 border border-cyan-800 rounded-xl text-cyan-400">
            <Printer className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white tracking-tight">
              SWELECT Solar EPC Engineering Master Dossier & Gantt Schedule
            </h2>
            <p className="text-xs text-slate-400">
              Company-Grade PDF Export with full 145-activity WBS hierarchy, CPM critical path, and visual timeline bars.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-1.5 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/60 px-3 py-1.5 rounded-xl">
            <Info className="w-4 h-4 shrink-0" />
            <span>Select <strong>Destination: &quot;Save as PDF&quot;</strong> and <strong>Layout: Landscape</strong> in browser print dialog.</span>
          </div>

          <button
            onClick={handlePrint}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-cyan-500/25"
          >
            <FileDown className="w-4 h-4" />
            <span>Download PDF / Print</span>
          </button>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl bg-graphite-800 hover:bg-graphite-700 text-slate-400 hover:text-white transition-colors border border-graphite-700"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Printable Document Container */}
      <div
        ref={printAreaRef}
        className="w-full max-w-7xl bg-white text-slate-900 rounded-2xl p-8 shadow-2xl space-y-6 print:p-0 print:shadow-none print:rounded-none print:max-w-none print:w-full"
      >
        {/* Document Corporate Header */}
        <div className="border-b-2 border-slate-900 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black tracking-wider text-slate-950">SWELECT</span>
              <span className="text-xs uppercase tracking-widest font-bold px-2 py-0.5 bg-slate-900 text-white rounded">
                ENERGY SYSTEMS LIMITED
              </span>
            </div>
            <h1 className="text-xl font-bold text-slate-900 mt-1">
              GROUND-MOUNTED SOLAR EPC PROJECT CONTROL & GANTT DOSSIER
            </h1>
            <p className="text-xs text-slate-600">
              Engineering, Procurement, Civil Execution, Electrical Interconnection, CEIG, and DISCOM Synchronization
            </p>
          </div>

          <div className="text-right text-xs space-y-1">
            <div className="font-mono text-slate-600">
              Report Date: <strong className="text-slate-900">{formatIndianDate(new Date().toISOString().split('T')[0])}</strong>
            </div>
            <div className="font-mono text-slate-600">
              Working Calendar: <strong className="text-slate-900">{project.calendar.name}</strong>
            </div>
            <div className="inline-block px-2.5 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded font-bold">
              Baseline Schedule: Rev {project.activeBaselineRevision} (Authorized)
            </div>
          </div>
        </div>

        {/* Project Profile Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Project Name & ID</span>
            <span className="font-bold text-slate-900 text-sm block">{project.name}</span>
            <span className="font-mono text-slate-600">{project.id} ({project.code || 'SWE-EPC'})</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Jurisdiction & Location</span>
            <span className="font-bold text-slate-900 block">{project.district}, {project.state}</span>
            <span className="text-slate-600 text-[11px] truncate block">{project.location || project.address}</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Plant Technical Scale</span>
            <span className="font-bold text-slate-900 block">{project.dcCapacityMW} MWp DC / {project.acCapacityMW} MWac</span>
            <span className="text-slate-600 text-[11px]">Site Area: {project.areaAcres} Acres</span>
          </div>

          <div>
            <span className="text-[10px] uppercase font-bold text-slate-500 block">Contractual Timeline</span>
            <span className="font-bold text-slate-900 block">
              Start: {formatIndianDate(project.plannedStartDate)}
            </span>
            <span className="text-slate-600 font-bold block">
              Target COD: {formatIndianDate(project.plannedFinishDate)}
            </span>
          </div>
        </div>

        {/* Executive Scorecard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Overall Physical Progress</span>
            <span className="text-xl font-black text-slate-900">{totalProgress}%</span>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden mt-1.5">
              <div className="bg-emerald-600 h-full rounded-full" style={{ width: `${totalProgress}%` }}></div>
            </div>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Schedule Variance</span>
            <span className={`text-xl font-black ${scheduleVariance > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
              {scheduleVariance === 0 ? '0 Days (On Target)' : scheduleVariance > 0 ? `+${scheduleVariance}d Behind` : `${scheduleVariance}d Ahead`}
            </span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Forecast Finish: {formatIndianDate(forecastFinish)}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Critical Path Driving COD</span>
            <span className="text-xl font-black text-rose-600">{criticalCount} Tasks</span>
            <span className="text-[11px] text-slate-500 block mt-1">
              Zero Total Float items controlling COD
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50">
            <span className="text-[10px] uppercase font-bold text-slate-500 block mb-1">Scope Execution Breakdown</span>
            <span className="text-xl font-black text-slate-900">{completedCount} / {totalActivities}</span>
            <span className="text-[11px] text-slate-500 block mt-1">
              {inProgressCount} In-Progress • {delayedCount} Delayed
            </span>
          </div>
        </div>

        {/* Master Gantt Schedule Table & Visual Bars */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-300 pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900">
              Master Work Breakdown Structure & Activity Schedule
            </h3>
            <div className="flex items-center gap-4 text-[10px] text-slate-600">
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-slate-400 rounded-sm"></span> Baseline</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-cyan-600 rounded-sm"></span> Current CPM</span>
              <span className="flex items-center gap-1"><span className="w-3 h-2 bg-rose-600 rounded-sm"></span> Critical</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rotate-45 bg-amber-500 inline-block"></span> Milestone</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-slate-100 border-y border-slate-300 text-[10px] uppercase font-bold text-slate-700">
                  <th className="py-2 px-2 w-16">ID</th>
                  <th className="py-2 px-2 w-72">Activity Description</th>
                  <th className="py-2 px-2 w-12 text-center">Dur</th>
                  <th className="py-2 px-2 w-20 text-center">Start</th>
                  <th className="py-2 px-2 w-20 text-center">Finish</th>
                  <th className="py-2 px-2 w-10 text-center">TF</th>
                  <th className="py-2 px-2 w-24">Team / Owner</th>
                  <th className="py-2 px-2 w-14 text-center">%</th>
                  <th className="py-2 px-2 w-64 text-center">Visual Timeline Schedule</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {wbsGroups.map(group => (
                  <React.Fragment key={group.node.id}>
                    {/* WBS Phase Header Row */}
                    <tr className="bg-slate-200/80 font-bold text-slate-900">
                      <td colSpan={9} className="py-2 px-2 text-xs">
                        <span className="font-mono text-slate-700 mr-2">{group.node.code}</span>
                        <span>{group.node.name}</span>
                        <span className="text-[10px] font-normal text-slate-600 ml-3">
                          ({group.activities.length} Activities • Avg Progress: {Math.round(group.activities.reduce((s, a) => s + (a.progressPercent || 0), 0) / group.activities.length)}%)
                        </span>
                      </td>
                    </tr>

                    {/* Activity Rows */}
                    {group.activities.map(act => {
                      const startPct = getBarPercentage(act.earlyStart || act.baselineStart);
                      const finishPct = getBarPercentage(act.earlyFinish || act.baselineFinish);
                      const barWidth = Math.max(1.5, finishPct - startPct);

                      return (
                        <tr key={act.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-1.5 px-2 font-mono font-bold text-slate-800">{act.id}</td>
                          <td className="py-1.5 px-2">
                            <span className="font-medium text-slate-900">{act.name}</span>
                            {act.isMilestone && (
                              <span className="ml-1.5 text-[9px] font-bold uppercase text-amber-700 bg-amber-100 px-1 py-0.2 rounded border border-amber-300">
                                Milestone
                              </span>
                            )}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-700">{act.plannedDuration}d</td>
                          <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[10px]">
                            {formatIndianDate(act.earlyStart || act.baselineStart)}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono text-slate-600 text-[10px]">
                            {formatIndianDate(act.earlyFinish || act.baselineFinish)}
                          </td>
                          <td className={`py-1.5 px-2 text-center font-mono font-bold text-[10px] ${act.totalFloat === 0 ? 'text-rose-600' : 'text-slate-500'}`}>
                            {act.totalFloat}d
                          </td>
                          <td className="py-1.5 px-2 truncate max-w-[100px] text-slate-600 text-[10px]">
                            {act.responsiblePerson}
                          </td>
                          <td className="py-1.5 px-2 text-center font-mono font-bold text-slate-800">
                            {act.progressPercent}%
                          </td>
                          <td className="py-1.5 px-2">
                            <div className="relative w-full h-3.5 bg-slate-100 rounded border border-slate-200 overflow-hidden">
                              {/* Baseline reference background */}
                              <div
                                className="absolute top-0 bottom-0 bg-slate-300 opacity-60 rounded-sm"
                                style={{
                                  left: `${getBarPercentage(act.baselineStart)}%`,
                                  width: `${Math.max(1, getBarPercentage(act.baselineFinish) - getBarPercentage(act.baselineStart))}%`
                                }}
                              />
                              {/* Active Bar */}
                              {act.isMilestone ? (
                                <div
                                  className="absolute top-0.5 w-2.5 h-2.5 rotate-45 bg-amber-500 border border-amber-700"
                                  style={{ left: `calc(${startPct}% - 4px)` }}
                                />
                              ) : (
                                <div
                                  className={`absolute top-0.5 bottom-0.5 rounded-sm ${
                                    act.isCritical ? 'bg-rose-600' : 'bg-cyan-600'
                                  }`}
                                  style={{
                                    left: `${startPct}%`,
                                    width: `${barWidth}%`
                                  }}
                                >
                                  {act.progressPercent > 0 && (
                                    <div
                                      className="h-full bg-emerald-500 rounded-sm"
                                      style={{ width: `${act.progressPercent}%` }}
                                    />
                                  )}
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Executive Sign-Off & Governance Block */}
        <div className="border-t-2 border-slate-900 pt-6 mt-8">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-6">
            Project Steering Committee & Formal Sign-Off Authorization
          </h4>

          <div className="grid grid-cols-3 gap-8 text-xs">
            <div className="border-t border-slate-400 pt-2 space-y-1">
              <span className="font-bold text-slate-900 block">Lead Planning Engineer</span>
              <span className="text-slate-600 text-[11px] block">SWELECT Solar EPC Planning & Scheduling</span>
              <span className="text-[10px] text-slate-400 block">Signature: __________________________</span>
            </div>

            <div className="border-t border-slate-400 pt-2 space-y-1">
              <span className="font-bold text-slate-900 block">{project.projectManager}</span>
              <span className="text-slate-600 text-[11px] block">Senior DGM - Solar EPC Project Execution</span>
              <span className="text-[10px] text-slate-400 block">Signature: __________________________</span>
            </div>

            <div className="border-t border-slate-400 pt-2 space-y-1">
              <span className="font-bold text-slate-900 block">Executive Director - EPC Operations</span>
              <span className="text-slate-600 text-[11px] block">SWELECT Energy Systems Limited</span>
              <span className="text-[10px] text-slate-400 block">Signature: __________________________</span>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="text-[10px] text-slate-500 text-center border-t border-slate-200 pt-4">
          Confidential • Property of SWELECT Energy Systems Limited • Generated via Swelect Project Control System
        </div>
      </div>
    </div>
  );
};
