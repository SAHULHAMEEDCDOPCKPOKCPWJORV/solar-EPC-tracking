import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { formatIndianDate } from '../../services/dateUtils';
import {
  ClockAlert,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Flame,
  ArrowRight,
  TrendingDown,
  Layers,
  ShieldAlert,
  Check,
  X,
  Target
} from 'lucide-react';

export const DelayAnalysisView: React.FC = () => {
  const {
    currentProject,
    delaySimulationResult,
    runDelaySimulation,
    applyDelaySimulation,
    discardDelaySimulation
  } = useProject();

  const [selectedActivityId, setSelectedActivityId] = useState<string>(
    currentProject?.activities[0]?.id || ''
  );
  const [delayDaysInput, setDelayDaysInput] = useState<number>(7);

  useEffect(() => {
    if (currentProject && !currentProject.activities.some(a => a.id === selectedActivityId)) {
      setSelectedActivityId(currentProject.activities[0]?.id || '');
    }
  }, [currentProject]);

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  const selectedActivity = currentProject.activities.find(a => a.id === selectedActivityId) || currentProject.activities[0];

  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedActivityId || delayDaysInput <= 0) return;
    runDelaySimulation(selectedActivityId, delayDaysInput);
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ClockAlert className="w-5 h-5 text-solar-amber" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              CPM Delay Impact Simulation & Float Erosion Analysis
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Simulate activity execution delays across the network without altering the live schedule. The engine evaluates dependency chains, remaining float, and identifies whether the delay absorbs buffer or shifts final COD.
          </p>
        </div>

        {delaySimulationResult && (
          <div className="flex items-center gap-3">
            <button
              onClick={discardDelaySimulation}
              className="px-3.5 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Discard Simulation</span>
            </button>
            <button
              onClick={applyDelaySimulation}
              className="px-4 py-2 rounded-xl bg-solar-amber hover:bg-amber-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-amber-500/20"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Authorize & Apply to Schedule</span>
            </button>
          </div>
        )}
      </div>

      {/* Simulation Controls Input Card */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-graphite-900 via-graphite-850 to-graphite-900 border border-graphite-750 shadow-xl">
        <form onSubmit={handleSimulate} className="flex flex-col lg:flex-row items-end gap-4">
          {/* Activity Selector */}
          <div className="flex-1 w-full">
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5">
              Select Activity for Delay Simulation
            </label>
            <select
              value={selectedActivityId}
              onChange={(e) => setSelectedActivityId(e.target.value)}
              className="w-full bg-graphite-850 border border-graphite-700 rounded-xl p-2.5 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-400"
            >
              {currentProject.activities.map(a => (
                <option key={a.id} value={a.id}>
                  {a.id} - {a.name} ({a.isCritical ? 'CRITICAL PATH' : `Float: ${a.totalFloat}d`})
                </option>
              ))}
            </select>
          </div>

          {/* Additional Delay Input */}
          <div className="w-full lg:w-48">
            <label className="text-[11px] font-bold text-slate-300 uppercase block mb-1.5">
              Additional Delay (Working Days)
            </label>
            <input
              type="number"
              min="1"
              max="120"
              value={delayDaysInput}
              onChange={(e) => setDelayDaysInput(parseInt(e.target.value) || 1)}
              className="w-full bg-graphite-850 border border-graphite-700 rounded-xl p-2.5 text-xs text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Submit Simulation Button */}
          <button
            type="submit"
            className="w-full lg:w-auto px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/20 shrink-0"
          >
            <Play className="w-4 h-4 fill-current" />
            <span>Simulate Network Impact</span>
          </button>
        </form>

        {selectedActivity && (
          <div className="mt-4 pt-3 border-t border-graphite-750/80 flex flex-wrap items-center gap-6 text-xs text-slate-400">
            <span>Current Planned Duration: <strong className="text-slate-200 font-mono">{selectedActivity.plannedDuration} days</strong></span>
            <span>Available Total Float: <strong className={`font-mono ${selectedActivity.totalFloat <= 0 ? 'text-rose-400' : 'text-emerald-400'}`}>{selectedActivity.totalFloat} days</strong></span>
            <span>Critical Path Status: <strong className={selectedActivity.isCritical ? 'text-rose-400' : 'text-slate-300'}>{selectedActivity.isCritical ? 'YES (Immediate COD Impact)' : 'NO (Float Buffer Available)'}</strong></span>
            <span>Responsible Team: <strong className="text-slate-200">{selectedActivity.responsibleTeam}</strong></span>
          </div>
        )}
      </div>

      {/* Simulation Results Section */}
      {delaySimulationResult ? (
        <div className="space-y-6">
          {/* Crucial 4-Tier Delay Distinction Display (Required by Project Spec) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* 1. Activity Delay */}
            <div className="p-4 rounded-xl bg-graphite-900 border border-graphite-750 shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">1. Activity Delay</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-solar-amber">
                  +{delaySimulationResult.additionalDelayDays}d
                </span>
                <span className="text-xs text-slate-400">Added</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                Simulated on {selectedActivity?.id}
              </p>
            </div>

            {/* 2. Successor Activities Delayed */}
            <div className="p-4 rounded-xl bg-graphite-900 border border-graphite-750 shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">2. Successor Delay</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-black font-mono text-cyan-400">
                  {delaySimulationResult.affectedSuccessorIds.length}
                </span>
                <span className="text-xs text-slate-400">Activities Shifted</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                Downstream dependency chain
              </p>
            </div>

            {/* 3. Critical Path Impact */}
            <div className="p-4 rounded-xl bg-graphite-900 border border-graphite-750 shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">3. Critical Path Shifting</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black font-mono ${delaySimulationResult.criticalPathChanged ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {delaySimulationResult.criticalPathChanged ? 'CHANGED' : 'STABLE'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                {delaySimulationResult.criticalPathChanged ? 'New critical path emerged' : 'Existing path unchanged'}
              </p>
            </div>

            {/* 4. Overall Project COD Delay */}
            <div className="p-4 rounded-xl bg-graphite-900 border border-graphite-750 shadow-lg">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">4. Overall Project Delay</span>
              <div className="flex items-baseline gap-2 mt-1">
                <span className={`text-2xl font-black font-mono ${delaySimulationResult.projectFinishVarianceDays > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                  {delaySimulationResult.projectFinishVarianceDays > 0 ? `+${delaySimulationResult.projectFinishVarianceDays}d` : '0d'}
                </span>
                <span className="text-xs text-slate-400">COD Variance</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-2 truncate">
                {delaySimulationResult.projectFinishVarianceDays > 0
                  ? 'Exceeds available float; pushes COD!'
                  : 'Fully absorbed by existing float buffer!'}
              </p>
            </div>
          </div>

          {/* 3-Way Scenario Comparison Table */}
          <div className="bg-graphite-900 border border-graphite-750 rounded-2xl shadow-xl p-5">
            <h3 className="text-sm font-bold text-white mb-1">
              3-Way Schedule Scenario Comparison
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Comparing Approved Baseline vs Current Active Schedule vs Simulated Delay Scenario
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Baseline Scenario */}
              <div className="p-4 rounded-xl bg-graphite-950 border border-graphite-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">1. Approved Baseline</span>
                  <span className="text-emerald-400 font-mono">Rev {currentProject.activeBaselineRevision}</span>
                </div>
                <p className="text-xs text-slate-300">Completion Target:</p>
                <p className="text-lg font-bold font-mono text-slate-100">
                  {formatIndianDate(currentProject.plannedFinishDate)}
                </p>
                <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                  <div>Critical Activities: {currentProject.activities.filter(a => a.isCritical).length}</div>
                  <div>Float Buffer: Intact</div>
                </div>
              </div>

              {/* Current Working Schedule */}
              <div className="p-4 rounded-xl bg-graphite-950 border border-graphite-800">
                <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">2. Current Working Schedule</span>
                  <span className="text-cyan-400 font-mono">Active</span>
                </div>
                <p className="text-xs text-slate-300">Forecast Completion:</p>
                <p className="text-lg font-bold font-mono text-cyan-300">
                  {formatIndianDate(delaySimulationResult.originalFinishDate)}
                </p>
                <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                  <div>Status: Approved execution</div>
                  <div>Variance vs Baseline: 0 days</div>
                </div>
              </div>

              {/* Simulated Delay Scenario */}
              <div className="p-4 rounded-xl bg-graphite-950 border border-amber-500/50 shadow-lg shadow-amber-500/5">
                <div className="flex items-center justify-between text-xs text-solar-amber mb-2">
                  <span className="font-semibold uppercase tracking-wider text-[10px]">3. Simulated Delay Scenario</span>
                  <span className="font-mono">+{delaySimulationResult.additionalDelayDays}d Test</span>
                </div>
                <p className="text-xs text-slate-300">Forecast Simulated COD:</p>
                <p className="text-lg font-bold font-mono text-amber-300">
                  {formatIndianDate(delaySimulationResult.simulatedFinishDate)}
                </p>
                <div className="mt-3 text-[11px] text-slate-400 space-y-1">
                  <div>Project Net Delay: <strong className="text-rose-400 font-mono">{delaySimulationResult.projectFinishVarianceDays} days</strong></div>
                  <div>Affected Successors: {delaySimulationResult.affectedSuccessorIds.length} activities</div>
                </div>
              </div>
            </div>
          </div>

          {/* Float Erosion Breakdown Table */}
          <div className="bg-graphite-900 border border-graphite-750 rounded-2xl shadow-xl p-5">
            <h3 className="text-sm font-bold text-white mb-1">
              Float Erosion & Criticality Shift Analysis
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Activities losing buffer due to downstream dependency ripple effect
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-graphite-850 text-slate-400 text-[10px] uppercase font-bold tracking-wider border-b border-graphite-750">
                  <tr>
                    <th className="py-2.5 px-3">Activity ID</th>
                    <th className="py-2.5 px-3">Activity Name</th>
                    <th className="py-2.5 px-3 text-center">Previous Float</th>
                    <th className="py-2.5 px-3 text-center">Revised Float</th>
                    <th className="py-2.5 px-3 text-center">Float Eroded</th>
                    <th className="py-2.5 px-3 text-right">Criticality Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-graphite-800">
                  {delaySimulationResult.floatChanges.map(fc => (
                    <tr key={fc.activityId} className="hover:bg-graphite-850/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{fc.activityId}</td>
                      <td className="py-2.5 px-3 font-medium text-slate-200">{fc.activityName}</td>
                      <td className="py-2.5 px-3 text-center font-mono text-slate-400">{fc.oldTotalFloat}d</td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">{fc.newTotalFloat}d</td>
                      <td className="py-2.5 px-3 text-center font-mono text-rose-400 font-bold">
                        {fc.floatErosion > 0 ? `-${fc.floatErosion}d` : '0d'}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {fc.nowCritical ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950 text-rose-400 border border-rose-800 animate-pulse">
                            NOW CRITICAL
                          </span>
                        ) : fc.newTotalFloat <= 0 ? (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-950/60 text-rose-400">
                            CRITICAL
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/40 text-emerald-400">
                            BUFFER REMAINING
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* At-Risk Milestones */}
          {delaySimulationResult.atRiskMilestones.length > 0 && (
            <div className="bg-graphite-900 border border-rose-900/40 p-5 rounded-2xl shadow-xl">
              <h3 className="text-sm font-bold text-rose-300 flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-rose-400" />
                <span>Contractual Milestones at Risk ({delaySimulationResult.atRiskMilestones.length})</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {delaySimulationResult.atRiskMilestones.map(m => (
                  <div key={m.activityId} className="p-3 rounded-xl bg-graphite-950 border border-rose-900/50">
                    <span className="text-[10px] font-mono text-rose-400 font-bold">{m.activityId}</span>
                    <h4 className="text-xs font-semibold text-slate-100 mt-0.5">{m.name}</h4>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 pt-2 border-t border-graphite-800 font-mono">
                      <span>Target: {formatIndianDate(m.originalDate)}</span>
                      <span className="text-rose-400 font-bold">Delayed: +{m.delayDays}d</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="p-12 rounded-2xl bg-graphite-900/50 border border-dashed border-graphite-800 text-center text-slate-400 text-xs">
          Select an activity above and specify additional delay days to run the CPM network simulation.
        </div>
      )}
    </div>
  );
};
