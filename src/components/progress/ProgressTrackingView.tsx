import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { Activity } from '../../types';
import { formatIndianDate } from '../../services/dateUtils';
import {
  TrendingUp,
  Package,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Edit2,
  Calendar,
  Save,
  Check,
  AlertOctagon,
  ArrowRight
} from 'lucide-react';

export const ProgressTrackingView: React.FC = () => {
  const { currentProject, updateActivity, showNotification } = useProject();

  const [selectedActivityId, setSelectedActivityId] = useState<string>('');
  const [completedQtyInput, setCompletedQtyInput] = useState<number>(0);
  const [actualStartInput, setActualStartInput] = useState<string>('');
  const [actualFinishInput, setActualFinishInput] = useState<string>('');
  const [delayReasonInput, setDelayReasonInput] = useState<string>('');
  const [scopeWarning, setScopeWarning] = useState<string | null>(null);

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  // Activities with quantity tracking configured
  const quantityActivities = currentProject.activities.filter(
    a => a.totalPlannedQuantity !== undefined && a.totalPlannedQuantity > 0
  );

  const activeAct = currentProject.activities.find(a => a.id === selectedActivityId) || quantityActivities[0] || currentProject.activities[0];

  const handleSelectActivity = (act: Activity) => {
    setSelectedActivityId(act.id);
    setCompletedQtyInput(act.completedQuantity || 0);
    setActualStartInput(act.actualStart || '');
    setActualFinishInput(act.actualFinish || '');
    setDelayReasonInput(act.delayReason || '');
    setScopeWarning(null);
  };

  const handleUpdateProgress = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeAct) return;

    const planned = activeAct.totalPlannedQuantity || 0;
    const completed = Number(completedQtyInput) || 0;

    // Check scope overflow
    if (planned > 0 && completed > planned) {
      if (!confirm(`Warning: Completed quantity (${completed} ${activeAct.quantityUnit}) exceeds approved planned scope (${planned} ${activeAct.quantityUnit}). Do you have an authorized Scope Change Order?`)) {
        return;
      }
    }

    // Physical % calculation with zero-division guard
    let percent = activeAct.progressPercent;
    if (planned > 0) {
      percent = Math.min(100, Math.round((completed / planned) * 100));
    }

    let newStatus = activeAct.status;
    if (percent === 100) newStatus = 'COMPLETED';
    else if (percent > 0 && newStatus === 'NOT_STARTED') newStatus = 'IN_PROGRESS';
    if (delayReasonInput && newStatus !== 'COMPLETED') newStatus = 'AT_RISK';

    updateActivity(activeAct.id, {
      completedQuantity: completed,
      remainingQuantity: Math.max(0, planned - completed),
      progressPercent: percent,
      actualStart: actualStartInput || undefined,
      actualFinish: percent === 100 ? (actualFinishInput || new Date().toISOString().split('T')[0]) : undefined,
      delayReason: delayReasonInput || undefined,
      status: newStatus,
      progressUpdateDate: new Date().toISOString().split('T')[0]
    });

    showNotification(`Recorded progress for ${activeAct.name} (${percent}%)`, 'success');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Quantity-Based Progress Tracking & Baseline Reconciliation
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Physical progress is calculated directly from surveyed field quantities (Completed Quantity / Planned Quantity &times; 100) with strict division-by-zero protection and scope overage safeguards.
          </p>
        </div>
      </div>

      {/* Main Split View: Left Activities Quantity Table, Right Field Progress Entry */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table of Bill of Quantities Progress */}
        <div className="lg:col-span-2 bg-graphite-900 border border-graphite-750 rounded-2xl shadow-xl overflow-hidden flex flex-col">
          <div className="p-4 border-b border-graphite-750 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Package className="w-4 h-4 text-cyan-400" />
              <span>Solar EPC Execution Quantities ({quantityActivities.length})</span>
            </h3>
            <span className="text-xs text-slate-400">Click row to log field measurement</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-xs">
              <thead className="bg-graphite-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-graphite-750">
                <tr>
                  <th className="py-3 px-3">Activity</th>
                  <th className="py-3 px-3 text-center">Unit</th>
                  <th className="py-3 px-3 text-right">Planned Qty</th>
                  <th className="py-3 px-3 text-right">Completed Qty</th>
                  <th className="py-3 px-3 text-right">Remaining</th>
                  <th className="py-3 px-3 text-center">Physical %</th>
                  <th className="py-3 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800">
                {quantityActivities.map(act => {
                  const isSelected = activeAct?.id === act.id;
                  const planned = act.totalPlannedQuantity || 0;
                  const completed = act.completedQuantity || 0;
                  const remaining = Math.max(0, planned - completed);
                  const percent = planned > 0 ? Math.round((completed / planned) * 100) : 0;

                  return (
                    <tr
                      key={act.id}
                      onClick={() => handleSelectActivity(act)}
                      className={`cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-cyan-500/15 border-l-2 border-cyan-400'
                          : 'hover:bg-graphite-850/60'
                      }`}
                    >
                      <td className="py-3 px-3">
                        <span className="font-mono text-[10px] text-cyan-400 font-bold block">{act.id}</span>
                        <span className="font-medium text-slate-200 line-clamp-1">{act.name}</span>
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-400">{act.quantityUnit}</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-300 font-bold">
                        {planned.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-cyan-300 font-bold">
                        {completed.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-right font-mono text-slate-400">
                        {remaining.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center gap-1.5 justify-center">
                          <span className="font-mono font-bold text-xs text-slate-100">{percent}%</span>
                        </div>
                        <div className="w-16 bg-graphite-800 rounded-full h-1 mx-auto mt-1">
                          <div
                            className="bg-cyan-400 h-full rounded-full"
                            style={{ width: `${Math.min(100, percent)}%` }}
                          ></div>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          act.status === 'COMPLETED'
                            ? 'bg-emerald-950 text-emerald-400'
                            : act.status === 'IN_PROGRESS'
                            ? 'bg-cyan-950 text-cyan-400'
                            : act.status === 'AT_RISK'
                            ? 'bg-amber-950 text-amber-400'
                            : 'bg-graphite-800 text-slate-400'
                        }`}>
                          {act.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Form: Progress Update Form for Selected Activity */}
        {activeAct ? (
          <div className="bg-graphite-900 border border-graphite-750 p-5 rounded-2xl shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-graphite-750 mb-4">
                <div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">{activeAct.id}</span>
                  <h3 className="text-sm font-bold text-white">{activeAct.name}</h3>
                </div>
                <span className="text-xs font-mono text-slate-400 bg-graphite-850 px-2 py-1 rounded">
                  {activeAct.quantityUnit || 'Scope'}
                </span>
              </div>

              <form onSubmit={handleUpdateProgress} className="space-y-4 text-xs">
                {/* Planned vs Completed display */}
                <div className="p-3 bg-graphite-950 rounded-xl border border-graphite-800 grid grid-cols-2 gap-3 text-center">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Total Planned</span>
                    <p className="text-base font-black font-mono text-slate-200 mt-0.5">
                      {activeAct.totalPlannedQuantity?.toLocaleString() || 0} {activeAct.quantityUnit}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400">Current Progress</span>
                    <p className="text-base font-black font-mono text-cyan-400 mt-0.5">
                      {activeAct.progressPercent}%
                    </p>
                  </div>
                </div>

                {/* Completed Input */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Cumulative Completed Quantity ({activeAct.quantityUnit}) *
                  </label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    value={completedQtyInput}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value) || 0;
                      setCompletedQtyInput(val);
                      if (activeAct.totalPlannedQuantity && val > activeAct.totalPlannedQuantity) {
                        setScopeWarning(`Quantity exceeds planned scope by ${val - activeAct.totalPlannedQuantity} ${activeAct.quantityUnit}!`);
                      } else {
                        setScopeWarning(null);
                      }
                    }}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
                  />
                  {scopeWarning && (
                    <p className="text-[11px] text-solar-amber mt-1 flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>{scopeWarning}</span>
                    </p>
                  )}
                </div>

                {/* Actual Start & Finish Dates */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                      Actual Start Date
                    </label>
                    <input
                      type="date"
                      value={actualStartInput}
                      onChange={(e) => setActualStartInput(e.target.value)}
                      className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                      Actual Finish Date
                    </label>
                    <input
                      type="date"
                      value={actualFinishInput}
                      onChange={(e) => setActualFinishInput(e.target.value)}
                      className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
                    />
                  </div>
                </div>

                {/* Delay reason if any */}
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Delay Reason / Root Cause (if applicable)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Rock encounter in row 4, awaiting CEIG approval..."
                    value={delayReasonInput}
                    onChange={(e) => setDelayReasonInput(e.target.value)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 placeholder:text-slate-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Physical Progress</span>
                </button>
              </form>
            </div>

            <div className="mt-4 pt-3 border-t border-graphite-750 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Owner: {activeAct.responsiblePerson}</span>
              <span>Updated: {formatIndianDate(activeAct.progressUpdateDate)}</span>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};
