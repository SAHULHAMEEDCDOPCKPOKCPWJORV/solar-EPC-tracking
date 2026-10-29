import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { RecoveryScenario } from '../../types';
import { formatIndianDate } from '../../services/dateUtils';
import { calculateSchedule } from '../../services/cpmEngine';
import {
  FastForward,
  Plus,
  CheckCircle2,
  AlertTriangle,
  IndianRupee,
  Users,
  Wrench,
  Clock,
  Sparkles,
  ShieldCheck,
  Check,
  Trash2,
  X
} from 'lucide-react';

export const RecoveryPlanningView: React.FC = () => {
  const {
    currentProject,
    recoveryScenarios,
    addRecoveryScenario,
    applyRecoveryScenario,
    deleteRecoveryScenario,
    showNotification
  } = useProject();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [title, setTitle] = useState('');
  const [proposedAction, setProposedAction] = useState<RecoveryScenario['proposedAction']>('EQUIPMENT');
  const [description, setDescription] = useState('');
  const [selectedActivityId, setSelectedActivityId] = useState('');
  const [compressedDuration, setCompressedDuration] = useState<number>(10);
  const [resourceRequirements, setResourceRequirements] = useState('');
  const [costLakhs, setCostLakhs] = useState<number>(3.5);

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  const criticalActs = currentProject.activities.filter(a => a.isCritical);

  const handleCreateScenario = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !selectedActivityId) return;

    const act = currentProject.activities.find(a => a.id === selectedActivityId);
    if (!act) return;

    // Simulate what the new schedule finish date would be
    const revisedDurations: Record<string, number> = {
      [selectedActivityId]: compressedDuration
    };

    const simulatedActs = currentProject.activities.map(a => {
      if (a.id === selectedActivityId) {
        return { ...a, plannedDuration: compressedDuration };
      }
      return { ...a };
    });

    const recalc = calculateSchedule(simulatedActs, currentProject.plannedStartDate, currentProject.calendar);
    const originalFinish = new Date(currentProject.plannedFinishDate).getTime();
    const newFinish = new Date(recalc.forecastCompletionDate).getTime();
    const daysRecovered = Math.max(0, Math.round((originalFinish - newFinish) / (1000 * 60 * 60 * 24)));

    addRecoveryScenario({
      title,
      proposedAction,
      description,
      affectedActivityIds: [selectedActivityId],
      revisedDurations,
      resourceRequirements,
      estimatedCostImpactLakhs: costLakhs,
      status: 'DRAFT',
      calculatedDaysRecovered: daysRecovered,
      forecastCompletionDate: recalc.forecastCompletionDate,
      criticalPathActivitiesCount: recalc.criticalPathActivityIds.length
    });

    setShowCreateModal(false);
    setTitle('');
    setDescription('');
  };

  const getActionBadge = (action: RecoveryScenario['proposedAction']) => {
    switch (action) {
      case 'EQUIPMENT':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-orange-950 text-orange-400 border border-orange-800 flex items-center gap-1"><Wrench className="w-3 h-3" /> Additional Equipment</span>;
      case 'MANPOWER':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-950 text-indigo-400 border border-indigo-800 flex items-center gap-1"><Users className="w-3 h-3" /> Extra Labour Gang</span>;
      case 'OVERTIME':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950 text-amber-400 border border-amber-800 flex items-center gap-1"><Clock className="w-3 h-3" /> Extended Hours</span>;
      case 'FAST_TRACKING':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950 text-cyan-400 border border-cyan-800 flex items-center gap-1"><FastForward className="w-3 h-3" /> Fast-Tracking</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-950 text-purple-400 border border-purple-800">Clearance Acceleration</span>;
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FastForward className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Schedule Recovery & Crash Optimization Planning
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Evaluate technically feasible recovery options (extra piling rigs, double-shift cable trenching, expedited clearances) with transparent cost-time tradeoff calculations before committing to schedule compression.
          </p>
        </div>

        <button
          onClick={() => {
            if (criticalActs.length > 0) {
              setSelectedActivityId(criticalActs[0].id);
              setCompressedDuration(Math.max(1, criticalActs[0].plannedDuration - 5));
            }
            setShowCreateModal(true);
          }}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 shrink-0"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Recovery Scenario</span>
        </button>
      </div>

      {/* Suggested Quick Recovery Recommendations */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-cyan-950/40 via-graphite-900 to-graphite-900 border border-cyan-800/40 text-xs">
        <div className="flex items-center gap-2 font-bold text-cyan-300 mb-1">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>Engineering Crash Recommendations for {currentProject.name}</span>
        </div>
        <p className="text-slate-400 leading-relaxed">
          The critical path currently runs through <strong className="text-slate-200">Piling (ACT-010) &rarr; MMS Assembly (ACT-011) &rarr; Module Clamping (ACT-012) &rarr; 132kV Switchyard (ACT-018) &rarr; T&C (ACT-021)</strong>. Mobilizing 2 additional hydraulic piling rigs or running a second shift on DC string terminations yields the highest schedule compression per ₹ Lakh invested.
        </p>
      </div>

      {/* Scenarios Grid */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center justify-between">
          <span>Active Recovery Scenarios ({recoveryScenarios.length})</span>
          <span className="text-xs text-slate-400">Formal Planner Approval Required</span>
        </h3>

        {recoveryScenarios.length === 0 ? (
          <div className="p-12 rounded-2xl bg-graphite-900/60 border border-dashed border-graphite-800 text-center">
            <FastForward className="w-8 h-8 text-slate-500 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-300">No Recovery Scenarios Formulated Yet</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              Click &quot;New Recovery Scenario&quot; to test resource acceleration, extra machinery, or work resequencing against schedule delays.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {recoveryScenarios.map(scen => (
              <div
                key={scen.id}
                className={`p-5 rounded-2xl border transition-all ${
                  scen.status === 'APPLIED'
                    ? 'bg-graphite-900 border-emerald-500/50 shadow-lg shadow-emerald-500/5'
                    : 'bg-graphite-900 border-graphite-750'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                      {scen.id}
                    </span>
                    {getActionBadge(scen.proposedAction)}
                  </div>
                  {scen.status === 'APPLIED' ? (
                    <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800 px-2 py-0.5 rounded flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> APPLIED TO SCHEDULE
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate-400 bg-graphite-800 px-2 py-0.5 rounded">
                      DRAFT SCENARIO
                    </span>
                  )}
                </div>

                <h3 className="text-sm font-bold text-white mb-1">{scen.title}</h3>
                <p className="text-xs text-slate-400 line-clamp-2 mb-4">{scen.description}</p>

                {/* Metrics Breakdown */}
                <div className="grid grid-cols-3 gap-2 p-3 bg-graphite-950 rounded-xl border border-graphite-800 text-center mb-4">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Days Recovered</span>
                    <p className="text-base font-black font-mono text-emerald-400">
                      +{scen.calculatedDaysRecovered}d
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Revised COD</span>
                    <p className="text-xs font-bold font-mono text-cyan-300 mt-1">
                      {formatIndianDate(scen.forecastCompletionDate)}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500">Est. Cost Impact</span>
                    <p className="text-xs font-bold font-mono text-solar-amber mt-1">
                      ₹ {scen.estimatedCostImpactLakhs} Lakhs
                    </p>
                  </div>
                </div>

                <div className="text-xs text-slate-400 mb-4 space-y-1">
                  <div>Resource Needs: <strong className="text-slate-300">{scen.resourceRequirements || 'Specialized contractors & tooling'}</strong></div>
                  <div>Compressed Activities: <span className="font-mono text-cyan-400">{scen.affectedActivityIds.join(', ')}</span></div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-graphite-750">
                  <button
                    onClick={() => deleteRecoveryScenario(scen.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 rounded transition-colors"
                    title="Delete Scenario"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {scen.status !== 'APPLIED' ? (
                    <button
                      onClick={() => applyRecoveryScenario(scen.id)}
                      className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Formally Approve & Apply</span>
                    </button>
                  ) : (
                    <span className="text-[11px] text-emerald-400 font-mono">
                      Schedule compressed by {scen.calculatedDaysRecovered} working days
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Formulate Recovery Scenario */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-lg rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FastForward className="w-4 h-4 text-cyan-400" />
                <span>Formulate Schedule Recovery Scenario</span>
              </h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateScenario} className="space-y-4 py-4 text-xs">
              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Recovery Scenario Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Deploy 2 Additional Hydraulic Piling Rigs for Block 2 & 3"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Proposed Crash Strategy
                  </label>
                  <select
                    value={proposedAction}
                    onChange={(e) => setProposedAction(e.target.value as any)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  >
                    <option value="EQUIPMENT">Additional Equipment (Rigs/Cranes)</option>
                    <option value="MANPOWER">Additional Manpower Gang</option>
                    <option value="OVERTIME">Overtime / 2-Shift Working</option>
                    <option value="FAST_TRACKING">Parallel Execution / Fast-Tracking</option>
                    <option value="EXPEDITE_CLEARANCES">Expedite CEIG / Statutory Clearance</option>
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Target Critical Activity
                  </label>
                  <select
                    value={selectedActivityId}
                    onChange={(e) => {
                      setSelectedActivityId(e.target.value);
                      const act = currentProject.activities.find(a => a.id === e.target.value);
                      if (act) {
                        setCompressedDuration(Math.max(1, act.plannedDuration - 5));
                      }
                    }}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                  >
                    {currentProject.activities.map(a => (
                      <option key={a.id} value={a.id}>
                        {a.id} - {a.name.slice(0, 24)} ({a.plannedDuration}d)
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Compressed Duration (Working Days)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={compressedDuration}
                    onChange={(e) => setCompressedDuration(parseInt(e.target.value) || 1)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                    Est. Cost Impact (INR ₹ Lakhs)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    value={costLakhs}
                    onChange={(e) => setCostLakhs(parseFloat(e.target.value) || 0)}
                    className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Resource & Tooling Requirements
                </label>
                <input
                  type="text"
                  placeholder="e.g. 2 Nos Sany Hydraulic Piling Rigs, 8 Operators, Fuel Bowsers"
                  value={resourceRequirements}
                  onChange={(e) => setResourceRequirements(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Technical Justification & Assumptions
                </label>
                <textarea
                  rows={2}
                  placeholder="Assumes soil stratum is amenable and operator accommodation is provided on site."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold"
                >
                  Create & Calculate Recovery
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
