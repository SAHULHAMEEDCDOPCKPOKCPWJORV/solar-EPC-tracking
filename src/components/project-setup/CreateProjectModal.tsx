import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { ALL_INDIAN_STATES, getDistrictsForState } from '../../services/indianStatesAndDistricts';
import { formatIndianDate } from '../../services/dateUtils';
import {
  Sun,
  Plus,
  X,
  MapPin,
  Calendar,
  Layers,
  FileText,
  User,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const INDIAN_STATES = ALL_INDIAN_STATES;

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateProjectModal: React.FC<CreateProjectModalProps> = ({ isOpen, onClose }) => {
  const { createProject, showNotification } = useProject();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [location, setLocation] = useState('');
  const [state, setState] = useState('Tamil Nadu');
  const [district, setDistrict] = useState('Tirunelveli');
  const [customDistrictMode, setCustomDistrictMode] = useState(false);
  const [address, setAddress] = useState('');
  const [dcCapacityMW, setDcCapacityMW] = useState<number>(0);
  const [acCapacityMW, setAcCapacityMW] = useState<number>(0);
  const [areaAcres, setAreaAcres] = useState<number>(0);
  const [plannedStartDate, setPlannedStartDate] = useState('');
  const [plannedFinishDate, setPlannedFinishDate] = useState('');
  const [projectManager, setProjectManager] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleStateChange = (newState: string) => {
    setState(newState);
    const districts = getDistrictsForState(newState);
    setDistrict(districts[0] || '');
    setCustomDistrictMode(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!name.trim()) { setError('Project Name is required.'); return; }
    if (!code.trim()) { setError('Project ID / Reference is required.'); return; }
    if (!location.trim()) { setError('Project Location is required.'); return; }
    if (!state.trim()) { setError('Indian State is required.'); return; }
    if (!district.trim()) { setError('District is required.'); return; }
    if (dcCapacityMW <= 0) { setError('DC Capacity in MW must be greater than 0.'); return; }
    if (acCapacityMW <= 0) { setError('AC Capacity in MW must be greater than 0.'); return; }
    if (areaAcres <= 0) { setError('Project Area in Acres must be greater than 0.'); return; }
    if (!plannedStartDate) { setError('Planned Start Date is required.'); return; }
    if (!plannedFinishDate) { setError('Planned Finish Date is required.'); return; }
    if (plannedFinishDate < plannedStartDate) {
      setError('Planned Finish Date cannot precede Planned Start Date.');
      return;
    }
    if (!projectManager.trim()) { setError('Project Manager is required.'); return; }

    createProject({
      name: name.trim(),
      id: code.trim(),
      code: code.trim(),
      location: location.trim(),
      state: state.trim(),
      district: district.trim(),
      address: address.trim(),
      dcCapacityMW,
      acCapacityMW,
      areaAcres,
      plannedStartDate,
      plannedFinishDate,
      projectManager: projectManager.trim(),
      description: description.trim()
    });

    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
      <div className="bg-graphite-900 border border-graphite-750 w-full max-w-2xl rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-graphite-750">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center border border-cyan-500/30">
              <Sun className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Create New Ground-Mounted Solar EPC Project</h2>
              <p className="text-[11px] text-slate-400">Initialize project scope, location & authorized baseline parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-3 p-3 rounded-xl bg-cyan-950/40 border border-cyan-500/30 flex items-start gap-2.5 text-cyan-300 text-[11px]">
          <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <span>
            <strong>Automatic Schedule & Next Steps Generation:</strong> Upon creation, the complete 145-activity SWELECT Solar EPC master schedule (Land, Engineering, Detailed Drawings, Procurement, Site Execution, Transmission Line, CEIG, and DISCOM MRT) will be automatically generated and scheduled from your Planned Start Date through COD.
          </span>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 py-4 text-xs">
          {/* Section 1: Identification */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 50 MWp Ground-Mounted Solar PV Power Project"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-semibold focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project ID *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SWE-EPC-2025-055"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
            </div>
          </div>

          {/* Section 2: Technical Capacity */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                DC Capacity (MWp) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                placeholder="50.0"
                value={dcCapacityMW || ''}
                onChange={(e) => setDcCapacityMW(parseFloat(e.target.value) || 0)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                AC Capacity (MWac) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0.1"
                required
                placeholder="40.0"
                value={acCapacityMW || ''}
                onChange={(e) => setAcCapacityMW(parseFloat(e.target.value) || 0)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Land Area (Acres) *
              </label>
              <input
                type="number"
                step="0.1"
                min="1"
                required
                placeholder="200"
                value={areaAcres || ''}
                onChange={(e) => setAreaAcres(parseFloat(e.target.value) || 0)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono font-bold"
              />
            </div>
          </div>

          {/* Section 3: Location */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project Location *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Pavagada Solar Park"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
              />
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Indian State *
              </label>
              <select
                required
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-medium"
              >
                {INDIAN_STATES.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
                  placeholder={`Enter district in ${state}`}
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-medium"
                />
              ) : (
                <select
                  required
                  value={district}
                  onChange={(e) => {
                    if (e.target.value === '__CUSTOM__') {
                      setCustomDistrictMode(true);
                    } else {
                      setDistrict(e.target.value);
                    }
                  }}
                  className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-medium"
                >
                  {getDistrictsForState(state).map(dist => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                  <option value="__CUSTOM__">+ Other / Enter Custom District...</option>
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
              Project Site Postal Address
            </label>
            <input
              type="text"
              placeholder="e.g. Plot #14, Sector C, Pavagada Solar Park, Tumakuru - 561202"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
            />
          </div>

          {/* Section 4: Schedule Dates & Manager */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Planned Start Date *
              </label>
              <input
                type="date"
                required
                value={plannedStartDate}
                onChange={(e) => setPlannedStartDate(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
              />
              {plannedStartDate && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">{formatIndianDate(plannedStartDate)}</span>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Planned Finish Date (Baseline) *
              </label>
              <input
                type="date"
                required
                value={plannedFinishDate}
                onChange={(e) => setPlannedFinishDate(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 font-mono"
              />
              {plannedFinishDate && (
                <span className="text-[10px] text-slate-400 mt-0.5 block">{formatIndianDate(plannedFinishDate)}</span>
              )}
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Project Manager *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Er. K. Ramesh (Senior DGM)"
                value={projectManager}
                onChange={(e) => setProjectManager(e.target.value)}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
              Project Description & Scope Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Turnkey Ground-Mounted Solar PV Power Project including 33kV pooling, substation & transmission line."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-slate-100 placeholder:text-slate-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-graphite-750">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-graphite-800 text-slate-300 text-xs font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors shadow-lg shadow-cyan-500/20"
            >
              Create Project
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
