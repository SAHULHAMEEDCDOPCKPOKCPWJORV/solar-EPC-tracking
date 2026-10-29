import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import { formatIndianDate } from '../../services/dateUtils';
import {
  Sliders,
  Calendar,
  Trash2,
  AlertTriangle,
  Plus,
  X,
  Save,
  Check
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const { currentProject, updateProjectDetails, deleteCurrentProject, showNotification } = useProject();

  const [workingDaysPerWeek, setWorkingDaysPerWeek] = useState<5 | 6 | 7>(
    currentProject?.calendar.workingDaysPerWeek || 6
  );
  const [workSaturday, setWorkSaturday] = useState<boolean>(
    currentProject?.calendar.workSaturday ?? true
  );
  const [workSunday, setWorkSunday] = useState<boolean>(
    currentProject?.calendar.workSunday ?? false
  );
  const [holidays, setHolidays] = useState<string[]>(
    currentProject?.calendar.holidays || []
  );
  const [newHoliday, setNewHoliday] = useState('');

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  const handleSaveCalendar = (e: React.FormEvent) => {
    e.preventDefault();
    updateProjectDetails({
      calendar: {
        ...currentProject.calendar,
        workingDaysPerWeek,
        workSaturday,
        workSunday,
        holidays
      }
    });
    showNotification('Working calendar updated & schedule recalculated', 'success');
  };

  const handleAddHoliday = () => {
    if (!newHoliday || holidays.includes(newHoliday)) return;
    setHolidays([...holidays, newHoliday].sort());
    setNewHoliday('');
  };

  const handleRemoveHoliday = (date: string) => {
    setHolidays(holidays.filter(h => h !== date));
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <h1 className="text-xl font-bold text-white tracking-tight">
              Project Execution Calendar & Schedule Rules
            </h1>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Ground-mounted Solar EPC projects in India operate on site-specific working shifts. Configure working days and gazetted state holidays to ensure accurate CPM forward/backward duration calculations.
          </p>
        </div>
      </div>

      {/* Calendar Config Form */}
      <form onSubmit={handleSaveCalendar} className="space-y-6">
        <div className="bg-graphite-900 border border-graphite-750 p-6 rounded-2xl shadow-xl space-y-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 pb-3 border-b border-graphite-750">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span>Site Working Days Configuration</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Working Days per Week
              </label>
              <select
                value={workingDaysPerWeek}
                onChange={(e) => {
                  const val = parseInt(e.target.value) as 5 | 6 | 7;
                  setWorkingDaysPerWeek(val);
                  if (val === 6) { setWorkSaturday(true); setWorkSunday(false); }
                  else if (val === 5) { setWorkSaturday(false); setWorkSunday(false); }
                  else { setWorkSaturday(true); setWorkSunday(true); }
                }}
                className="w-full bg-graphite-850 border border-graphite-700 rounded-lg p-2.5 text-slate-100 font-bold focus:outline-none focus:border-cyan-400"
              >
                <option value={6}>6-Day Workweek (Mon-Sat, Standard Indian Solar EPC)</option>
                <option value={5}>5-Day Workweek (Mon-Fri, Corporate / Engineering)</option>
                <option value={7}>7-Day Workweek (Continuous Commissioning Shift)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Saturday Work Shift
              </label>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workSaturday}
                  onChange={(e) => setWorkSaturday(e.target.checked)}
                  className="rounded border-graphite-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-300 font-semibold">Saturday is a Working Day</span>
              </label>
            </div>

            <div>
              <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-1">
                Sunday Work Shift
              </label>
              <label className="flex items-center gap-2 mt-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={workSunday}
                  onChange={(e) => setWorkSunday(e.target.checked)}
                  className="rounded border-graphite-700 text-cyan-500 focus:ring-0"
                />
                <span className="text-slate-300 font-semibold">Sunday is a Working Day</span>
              </label>
            </div>
          </div>

          {/* Holidays */}
          <div>
            <label className="text-[11px] font-semibold text-slate-300 uppercase block mb-2">
              Indian Gazetted & Site Non-Working Holidays ({holidays.length})
            </label>

            <div className="flex gap-2 max-w-sm mb-3">
              <input
                type="date"
                value={newHoliday}
                onChange={(e) => setNewHoliday(e.target.value)}
                className="bg-graphite-850 border border-graphite-700 rounded-lg p-2 text-xs text-slate-100 font-mono"
              />
              <button
                type="button"
                onClick={handleAddHoliday}
                className="px-3 py-2 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Date</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-2">
              {holidays.map(h => (
                <span
                  key={h}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-graphite-850 border border-graphite-700 text-xs text-slate-300 font-mono"
                >
                  <span>{formatIndianDate(h)}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveHoliday(h)}
                    className="text-slate-500 hover:text-rose-400 p-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          </div>

          <div className="flex justify-end pt-3 border-t border-graphite-750">
            <button
              type="submit"
              className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-cyan-500/20"
            >
              <Save className="w-4 h-4" />
              <span>Save Calendar & Recalculate CPM Schedule</span>
            </button>
          </div>
        </div>
      </form>

      {/* Danger Zone: Delete Project */}
      <div className="bg-graphite-900 border border-rose-900/50 p-6 rounded-2xl shadow-xl flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-rose-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500" />
            <span>Delete Project</span>
          </h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xl">
            Permanently remove &quot;{currentProject.name}&quot; ({currentProject.id}) and all its WBS packages, baseline revisions, and workfront readiness records.
          </p>
        </div>

        <button
          onClick={() => {
            if (confirm(`Are you absolutely sure you want to delete ${currentProject.name}? This action cannot be undone.`)) {
              deleteCurrentProject();
            }
          }}
          className="px-4 py-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-700 text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Delete Project</span>
        </button>
      </div>
    </div>
  );
};
