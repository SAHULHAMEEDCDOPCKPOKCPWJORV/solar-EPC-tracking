import React, { useState, useEffect, useMemo } from 'react';
import { useProject } from '../../context/ProjectContext';
import { formatIndianDate } from '../../services/dateUtils';
import { ALL_INDIAN_STATES, getDistrictsForState } from '../../services/indianStatesAndDistricts';
import {
  Settings2,
  Save,
  ShieldCheck,
  Calendar,
  Layers,
  MapPin,
  Sun,
  FileCheck,
  Plus,
  RotateCcw,
  AlertTriangle,
  History,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  ArrowRight,
  Clock,
  Flame,
  Zap
} from 'lucide-react';

export const INDIAN_STATES = ALL_INDIAN_STATES;

export const ProjectSetupView: React.FC = () => {
  const {
    currentProject,
    updateProjectDetails,
    realignEntireSchedule,
    createBaselineRevision,
    setActiveTab,
    showNotification
  } = useProject();

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    state: 'Tamil Nadu',
    district: 'Tirunelveli',
    address: '',
    dcCapacityMW: 0,
    acCapacityMW: 0,
    areaAcres: 0,
    plannedStartDate: '',
    projectManager: '',
    description: '',
    status: 'EXECUTION' as any
  });

  const [customDistrictMode, setCustomDistrictMode] = useState(false);

  // Baseline freeze modal
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [baselineName, setBaselineName] = useState('');
  const [baselineNotes, setBaselineNotes] = useState('');

  useEffect(() => {
    if (currentProject) {
      const pState = currentProject.state || 'Tamil Nadu';
      const availableDistricts = getDistrictsForState(pState);
      const isCustom = Boolean(currentProject.district && !availableDistricts.includes(currentProject.district));

      setFormData({
        name: currentProject.name || '',
        code: currentProject.code || currentProject.id || '',
        location: currentProject.location || '',
        state: pState,
        district: currentProject.district || (availableDistricts[0] || ''),
        address: currentProject.address || '',
        dcCapacityMW: currentProject.dcCapacityMW || 0,
        acCapacityMW: currentProject.acCapacityMW || 0,
        areaAcres: currentProject.areaAcres || 0,
        plannedStartDate: currentProject.plannedStartDate || '',
        projectManager: currentProject.projectManager || '',
        description: currentProject.description || '',
        status: currentProject.status || 'EXECUTION'
      });
      setCustomDistrictMode(isCustom);
    }
  }, [currentProject]);

  const handleStateChange = (newState: string) => {
    const districts = getDistrictsForState(newState);
    const newDistrict = districts.length > 0 ? districts[0] : '';
    setFormData(prev => ({
      ...prev,
      state: newState,
      district: newDistrict
    }));
    setCustomDistrictMode(false);
  };

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  const immediateNextSteps = useMemo(() => {
    if (!currentProject || currentProject.activities.length === 0) return [];
    const pStart = new Date((currentProject.plannedStartDate || '2025-05-11') + 'T00:00:00').getTime();
    const cutoff45Days = pStart + 45 * 24 * 60 * 60 * 1000;

    return currentProject.activities
      .filter(act => {
        const aStart = new Date((act.earlyStart || act.currentPlannedStart || act.baselineStart) + 'T00:00:00').getTime();
        return aStart <= cutoff45Days;
      })
      .sort((a, b) => {
        const da = (a.earlyStart || a.currentPlannedStart || a.baselineStart);
        const db = (b.earlyStart || b.currentPlannedStart || b.baselineStart);
        return da.localeCompare(db);
      })
      .slice(0, 8);
  }, [currentProject]);

  const keyMilestones = useMemo(() => {
    if (!currentProject) return [];
    return currentProject.activities.filter(a => a.isMilestone);
  }, [currentProject]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectDetails({
      name: formData.name,
      code: formData.code,
      location: formData.location,
      state: formData.state,
      district: formData.district,
      address: formData.address,
      dcCapacityMW: Number(formData.dcCapacityMW),
      acCapacityMW: Number(formData.acCapacityMW),
      areaAcres: Number(formData.areaAcres),
      plannedStartDate: formData.plannedStartDate,
      projectManager: formData.projectManager,
      description: formData.description,
      status: formData.status
    });
  };

  const handleAuthorizeBaseline = (e: React.FormEvent) => {
    e.preventDefault();
    createBaselineRevision(baselineName, baselineNotes);
    setShowFreezeModal(false);
    setBaselineName('');
    setBaselineNotes('');
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Settings2 className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Project Parameters & Engineering Specifications
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Configure site boundaries, Indian statutory state jurisdiction, plant capacities, and formal baseline freeze authorizations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFreezeModal(true)}
            className="px-4 py-2.5 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-emerald-400 border border-emerald-500/40 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-emerald-950/20"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Freeze Baseline Revision</span>
          </button>
        </div>
      </div>

      {/* Main Parameters Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="bg-graphite-900 border border-graphite-750 p-6 rounded-2xl shadow-xl space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-graphite-750">
            <Sun className="w-4 h-4 text-cyan-400" />
            <span>Core Plant & Project Identity</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project ID / SAP Reference *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                DC Capacity in MW (MWp) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.dcCapacityMW}
                onChange={(e) => setFormData({ ...formData, dcCapacityMW: parseFloat(e.target.value) || 0 })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                AC Capacity in MW (MWac) *
              </label>
              <input
                type="number"
                step="0.01"
                required
                value={formData.acCapacityMW}
                onChange={(e) => setFormData({ ...formData, acCapacityMW: parseFloat(e.target.value) || 0 })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Total Land Area in Acres *
              </label>
              <input
                type="number"
                step="0.1"
                required
                value={formData.areaAcres}
                onChange={(e) => setFormData({ ...formData, areaAcres: parseFloat(e.target.value) || 0 })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold text-sm focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Planned Start Date (Notice to Proceed) *
              </label>
              <input
                type="date"
                required
                value={formData.plannedStartDate}
                onChange={(e) => setFormData({ ...formData, plannedStartDate: e.target.value })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400 mt-1">Displayed as {formatIndianDate(formData.plannedStartDate)}</p>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project Manager *
              </label>
              <input
                type="text"
                required
                value={formData.projectManager}
                onChange={(e) => setFormData({ ...formData, projectManager: e.target.value })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project Execution Lifecycle Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
              >
                <option value="PLANNING">PLANNING</option>
                <option value="EXECUTION">EXECUTION</option>
                <option value="COMMISSIONING">COMMISSIONING</option>
                <option value="HANDOVER">HANDOVER</option>
                <option value="ON_HOLD">ON_HOLD</option>
              </select>
            </div>
          </div>
        </div>

        {/* Location & Jurisdiction */}
        <div className="bg-graphite-900 border border-graphite-750 p-6 rounded-2xl shadow-xl space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-graphite-750">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>Site Location & Indian State Jurisdiction</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project Location / Solar Park *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pavagada Solar Park"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Indian State *
              </label>
              <select
                required
                value={formData.state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400 font-medium"
              >
                {INDIAN_STATES.map(st => (
                  <option key={st} value={st}>{st}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-400 mt-1">Updates available districts automatically.</p>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-semibold text-slate-300 uppercase block">
                  District *
                </label>
                <button
                  type="button"
                  onClick={() => setCustomDistrictMode(!customDistrictMode)}
                  className="text-[10px] text-cyan-400 hover:underline"
                >
                  {customDistrictMode ? 'Select from list' : 'Type custom'}
                </button>
              </div>

              {customDistrictMode ? (
                <input
                  type="text"
                  required
                  placeholder={`Enter district in ${formData.state}`}
                  value={formData.district}
                  onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400 font-medium"
                />
              ) : (
                <select
                  required
                  value={formData.district}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setCustomDistrictMode(true);
                    } else {
                      setFormData({ ...formData, district: e.target.value });
                    }
                  }}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400 font-medium"
                >
                  {getDistrictsForState(formData.state).map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                  <option value="__CUSTOM__">+ Other / Enter Custom District...</option>
                </select>
              )}
              <p className="text-[10px] text-cyan-400 mt-1">
                {getDistrictsForState(formData.state).length} districts loaded for {formData.state}.
              </p>
            </div>
          </div>

          <div className="text-xs">
            <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
              Complete Site Postal Address
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="text-xs">
            <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
              Project Execution Description & Technical Scope
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-400 placeholder:text-slate-500"
            />
          </div>

          <div className="flex justify-end pt-3 border-t border-graphite-750">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Changes & Recalculate Network</span>
            </button>
          </div>
        </div>
      </form>

      {/* Automatic Schedule Timeline & Immediate Next Execution Steps Generator */}
      <div className="bg-graphite-900 border border-cyan-500/30 p-6 rounded-2xl shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-graphite-750">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              <h3 className="text-base font-bold text-white">
                Automatic Schedule Timeline & Immediate Next Execution Steps
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Derived from the authentic 145-activity SWELECT Solar EPC master network aligned to start date{' '}
              <span className="font-mono text-cyan-300 font-bold">{formatIndianDate(currentProject.plannedStartDate)}</span> through COD{' '}
              <span className="font-mono text-emerald-400 font-bold">{formatIndianDate(currentProject.plannedFinishDate)}</span>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => realignEntireSchedule(formData.plannedStartDate)}
              className="px-4 py-2 rounded-xl bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 text-cyan-300 text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-cyan-950/40"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Re-Align 145 Activities to This Timeline</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('gantt')}
              className="px-4 py-2 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-slate-200 border border-graphite-700 text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <span>Open Gantt Chart</span>
              <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          </div>
        </div>

        {/* Timeline Metrics Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3.5 bg-graphite-950/80 border border-graphite-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Project Start (Day 1)</span>
            <span className="text-sm font-bold font-mono text-cyan-300">{formatIndianDate(currentProject.plannedStartDate)}</span>
          </div>
          <div className="p-3.5 bg-graphite-950/80 border border-graphite-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">COD / Forecast Finish</span>
            <span className="text-sm font-bold font-mono text-emerald-400">{formatIndianDate(currentProject.plannedFinishDate)}</span>
          </div>
          <div className="p-3.5 bg-graphite-950/80 border border-graphite-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Total Activities</span>
            <span className="text-sm font-bold font-mono text-slate-100">{currentProject.activities.length} SWELECT Tasks</span>
          </div>
          <div className="p-3.5 bg-graphite-950/80 border border-graphite-800 rounded-xl">
            <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">Critical Path Driving COD</span>
            <span className="text-sm font-bold font-mono text-rose-400 flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-500 inline" />
              {currentProject.activities.filter(a => a.isCritical).length} Zero-Float Tasks
            </span>
          </div>
        </div>

        {/* Immediate Next Steps Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-solar-400" />
              <span>Immediate Next Steps to Execute (Kickoff & Month 1 Priority Tasks)</span>
            </h4>
            <span className="text-[11px] text-slate-400">
              Activities scheduled within first 45 days
            </span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-graphite-800 bg-graphite-950">
            <table className="w-full text-left text-xs">
              <thead className="bg-graphite-850/80 text-[10px] uppercase font-bold text-slate-400 border-b border-graphite-800">
                <tr>
                  <th className="py-2.5 px-3">Task ID</th>
                  <th className="py-2.5 px-3">Immediate Execution Task</th>
                  <th className="py-2.5 px-3">Start Date</th>
                  <th className="py-2.5 px-3">Finish Date</th>
                  <th className="py-2.5 px-3 text-center">Dur (Days)</th>
                  <th className="py-2.5 px-3">Responsible Lead & Team</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-850">
                {immediateNextSteps.map(act => (
                  <tr key={act.id} className="hover:bg-graphite-900/60 transition-colors">
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">{act.id}</td>
                    <td className="py-2.5 px-3">
                      <div className="font-semibold text-slate-200">{act.name}</div>
                      <div className="text-[10px] text-slate-400">{act.wbsId}</div>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{formatIndianDate(act.earlyStart || act.baselineStart)}</td>
                    <td className="py-2.5 px-3 font-mono text-slate-300">{formatIndianDate(act.earlyFinish || act.baselineFinish)}</td>
                    <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-300">{act.plannedDuration}d</td>
                    <td className="py-2.5 px-3">
                      <span className="text-slate-200 font-medium block">{act.responsiblePerson}</span>
                      <span className="text-[10px] text-slate-400">{act.responsibleTeam}</span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                        act.status === 'COMPLETED'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                          : act.status === 'IN_PROGRESS'
                          ? 'bg-cyan-950 text-cyan-300 border border-cyan-800'
                          : 'bg-graphite-800 text-slate-400 border border-graphite-700'
                      }`}>
                        {act.status} ({act.progressPercent}%)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        type="button"
                        onClick={() => setActiveTab('gantt')}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 underline font-semibold"
                      >
                        View in Gantt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Key Statutory Approval Milestones */}
        {keyMilestones.length > 0 && (
          <div className="space-y-3 pt-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Key Regulatory & Commissioning Milestone Gates</span>
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {keyMilestones.slice(0, 3).map(m => (
                <div key={m.id} className="p-3.5 rounded-xl bg-graphite-950/80 border border-graphite-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-[10px] text-amber-400">{m.id}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Target COD Gate</span>
                  </div>
                  <p className="font-bold text-slate-200 text-xs">{m.name}</p>
                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                    <span>Target Date:</span>
                    <span className="font-mono font-bold text-cyan-300">{formatIndianDate(m.earlyFinish || m.baselineFinish)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Baseline Revisions Log Card */}
      <div className="bg-graphite-900 border border-graphite-750 p-6 rounded-2xl shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Authorized Baseline Schedule History</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            Active Baseline: Rev {currentProject.activeBaselineRevision}
          </span>
        </div>

        <div className="space-y-3">
          {currentProject.baselines.map(base => (
            <div
              key={base.id}
              className="p-4 rounded-xl bg-graphite-950/80 border border-graphite-800 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                    Rev {base.revisionNumber}
                  </span>
                  <span className="font-bold text-slate-100">{base.name}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Approved By: <strong className="text-slate-300">{base.approvedBy}</strong> on {formatIndianDate(base.approvedDate)} • {base.activitiesCount} Activities
                </p>
                {base.notes && (
                  <p className="text-[11px] text-slate-500 italic mt-0.5">&quot;{base.notes}&quot;</p>
                )}
              </div>

              <div className="text-right shrink-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Baseline COD</span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {formatIndianDate(base.projectPlannedFinish)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal: Authorize Baseline Revision */}
      {showFreezeModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-graphite-900 border border-graphite-750 w-full max-w-md rounded-2xl shadow-2xl p-6">
            <div className="flex items-center justify-between pb-3 border-b border-graphite-750">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Authorize & Freeze Baseline Revision</span>
              </h3>
              <button onClick={() => setShowFreezeModal(false)} className="text-slate-400 hover:text-white">
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuthorizeBaseline} className="space-y-4 py-4 text-xs">
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-200 text-[11px]">
                <strong className="block mb-1">Baseline Protection Protocol:</strong> Freezing will increment the authorized revision number to <strong className="text-white">Rev {(currentProject.activeBaselineRevision || 0) + 1}</strong> and capture the current CPM calculated start and finish dates. Previous baseline snapshots are permanently archived and never overwritten.
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Baseline Revision Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. Authorized Baseline Revision ${(currentProject.activeBaselineRevision || 0) + 1}`}
                  value={baselineName}
                  onChange={(e) => setBaselineName(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                  Executive Notes & Change Authority Reference
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Approved per SWELECT Executive Project Steering Committee Minutes #14"
                  value={baselineNotes}
                  onChange={(e) => setBaselineNotes(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 placeholder:text-slate-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
                <button
                  type="button"
                  onClick={() => setShowFreezeModal(false)}
                  className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-graphite-950 font-bold"
                >
                  Freeze & Authorize Baseline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
