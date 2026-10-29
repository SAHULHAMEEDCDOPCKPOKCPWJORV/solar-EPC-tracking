import React from 'react';
import { useProject } from '../../context/ProjectContext';
import { exportProjectToExcel } from '../../services/excelService';
import { formatIndianDate } from '../../services/dateUtils';
import {
  FileSpreadsheet,
  Download,
  Printer,
  ShieldCheck,
  Sun,
  Flame,
  AlertTriangle,
  Layers,
  CheckCircle2,
  Calendar,
  Building2
} from 'lucide-react';

export const ReportsView: React.FC = () => {
  const { currentProject, projects, setCurrentProjectId, showNotification } = useProject();

  if (!currentProject) {
    return (
      <div className="flex-1 p-8 text-center text-slate-400">
        No project selected.
      </div>
    );
  }

  const handleExcelExport = () => {
    try {
      exportProjectToExcel(currentProject);
      showNotification(`Excel export for ${currentProject.name} (${currentProject.dcCapacityMW} MWp) downloaded successfully`, 'success');
    } catch (e) {
      showNotification('Failed to generate Excel export', 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const totalActs = currentProject.activities.length;
  const criticalActs = currentProject.activities.filter(a => a.isCritical).length;
  const completedActs = currentProject.activities.filter(a => a.status === 'COMPLETED').length;
  const avgProgress = totalActs > 0
    ? Math.round(currentProject.activities.reduce((s, a) => s + (a.progressPercent || 0), 0) / totalActs)
    : 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-graphite-950">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-graphite-900 border border-graphite-750 shadow-xl print:hidden">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
              {currentProject.id}
            </span>
            <span className="text-xs text-cyan-300 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
              {currentProject.dcCapacityMW} MWp DC / {currentProject.areaAcres} Acres
            </span>
            <div className="flex items-center gap-1.5 bg-graphite-850 px-2 py-0.5 rounded-lg border border-graphite-700">
              <span className="text-[10px] text-slate-400 font-semibold uppercase">Project:</span>
              <select
                value={currentProject.id}
                onChange={(e) => setCurrentProjectId(e.target.value)}
                className="bg-transparent text-xs font-bold text-white focus:outline-none cursor-pointer"
              >
                {projects.map(p => (
                  <option key={p.id} value={p.id} className="bg-graphite-900 text-white">
                    {p.name} ({p.dcCapacityMW} MWp)
                  </option>
                ))}
              </select>
            </div>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Reports, Audit Dossiers & Multi-Sheet Excel Export
          </h1>
          <p className="text-xs text-slate-400 max-w-2xl mt-0.5">
            Export the complete synchronized Solar EPC project data for <strong className="text-slate-200">{currentProject.name}</strong> into formatted Excel worksheets or formal dossier printout.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-graphite-800 hover:bg-graphite-750 text-slate-200 border border-graphite-700 text-xs font-semibold transition-colors flex items-center gap-1.5"
          >
            <Printer className="w-4 h-4 text-slate-400" />
            <span>Print Report</span>
          </button>

          <button
            onClick={handleExcelExport}
            className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-graphite-950 font-bold text-xs transition-colors flex items-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Download className="w-4 h-4" />
            <span>Export {currentProject.dcCapacityMW} MWp Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Printable Executive Dossier */}
      <div className="bg-graphite-900 border border-graphite-750 p-8 rounded-2xl shadow-2xl space-y-6 print:bg-white print:text-black print:p-0 print:border-none print:shadow-none">
        {/* Company Header */}
        <div className="flex items-start justify-between pb-6 border-b border-graphite-750 print:border-black">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-white print:text-black tracking-tight">SWELECT</span>
              <span className="text-xs font-bold text-cyan-400 print:text-blue-800 uppercase tracking-widest bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                ENERGY SYSTEMS
              </span>
            </div>
            <p className="text-xs text-slate-400 print:text-gray-600 mt-1">
              Solar EPC Project Planning, Execution Tracking & Delay Impact Report
            </p>
            <p className="text-xs font-mono text-cyan-300 print:text-black mt-2">
              Report Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs font-mono font-bold text-slate-400 print:text-black block">PROJECT CODE</span>
            <span className="text-base font-black text-white print:text-black font-mono">{currentProject.id}</span>
            <span className="text-xs font-mono text-emerald-400 print:text-gray-800 block mt-1">
              Active Baseline: Rev {currentProject.activeBaselineRevision}
            </span>
          </div>
        </div>

        {/* Project Snapshot Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-graphite-950 print:bg-gray-100 border border-graphite-800 print:border-gray-300 text-xs">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Plant Capacity</span>
            <p className="text-sm font-bold text-white print:text-black mt-0.5">
              {currentProject.dcCapacityMW} MWp DC / {currentProject.acCapacityMW} MWac
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Location</span>
            <p className="text-sm font-bold text-white print:text-black mt-0.5">
              {currentProject.location}, {currentProject.state}
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Physical Progress</span>
            <p className="text-sm font-bold text-cyan-400 print:text-blue-700 mt-0.5">
              {avgProgress}% Completed
            </p>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 print:text-gray-600">Forecast COD</span>
            <p className="text-sm font-bold text-solar-amber print:text-black mt-0.5">
              {formatIndianDate(currentProject.plannedFinishDate)}
            </p>
          </div>
        </div>

        {/* Workfront Blocks Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black mb-3">
            Block-wise Workfront Readiness Status
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-graphite-800 print:border-gray-400">
              <thead className="bg-graphite-850 print:bg-gray-200 text-slate-300 print:text-black font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Block Name</th>
                  <th className="p-2.5">Zone</th>
                  <th className="p-2.5 text-center">Capacity (MWp)</th>
                  <th className="p-2.5 text-center">Actual Progress</th>
                  <th className="p-2.5">Readiness Status</th>
                  <th className="p-2.5">Incharge</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800 print:divide-gray-300">
                {currentProject.blocks.map(b => (
                  <tr key={b.id} className="print:text-black">
                    <td className="p-2.5 font-semibold text-slate-200 print:text-black">{b.name}</td>
                    <td className="p-2.5 font-mono text-slate-400 print:text-gray-700">{b.zoneCode}</td>
                    <td className="p-2.5 text-center font-mono">{b.capacityMWp}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-cyan-400 print:text-black">{b.actualProgress}%</td>
                    <td className="p-2.5 font-bold text-[11px]">{b.status}</td>
                    <td className="p-2.5 text-slate-400 print:text-black">{b.responsiblePerson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Critical Path Schedule Summary */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 print:text-black mb-3">
            Critical Path Schedule Activities (Zero Float)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border border-graphite-800 print:border-gray-400">
              <thead className="bg-graphite-850 print:bg-gray-200 text-slate-300 print:text-black font-bold text-[10px] uppercase">
                <tr>
                  <th className="p-2.5">Activity ID</th>
                  <th className="p-2.5">Activity Description</th>
                  <th className="p-2.5 text-center">Dur (d)</th>
                  <th className="p-2.5 text-center">Early Start</th>
                  <th className="p-2.5 text-center">Early Finish</th>
                  <th className="p-2.5 text-center">Progress %</th>
                  <th className="p-2.5">Owner</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-graphite-800 print:divide-gray-300">
                {currentProject.activities.filter(a => a.isCritical).map(act => (
                  <tr key={act.id} className="print:text-black">
                    <td className="p-2.5 font-mono font-bold text-rose-400 print:text-black">{act.id}</td>
                    <td className="p-2.5 font-medium text-slate-200 print:text-black">{act.name}</td>
                    <td className="p-2.5 text-center font-mono">{act.plannedDuration}</td>
                    <td className="p-2.5 text-center font-mono">{formatIndianDate(act.earlyStart)}</td>
                    <td className="p-2.5 text-center font-mono font-bold text-cyan-300 print:text-black">{formatIndianDate(act.earlyFinish)}</td>
                    <td className="p-2.5 text-center font-mono">{act.progressPercent}%</td>
                    <td className="p-2.5 text-slate-400 print:text-black">{act.responsiblePerson}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Signature Block */}
        <div className="pt-8 border-t border-graphite-750 print:border-black grid grid-cols-2 gap-8 text-xs text-slate-400 print:text-black">
          <div>
            <div className="h-14 border-b border-dashed border-graphite-700 print:border-gray-400 mb-2"></div>
            <p className="font-bold text-slate-200 print:text-black">{currentProject.projectManager}</p>
            <p className="text-[10px]">Project Manager, SWELECT Energy Systems</p>
          </div>
          <div className="text-right">
            <div className="h-14 border-b border-dashed border-graphite-700 print:border-gray-400 mb-2"></div>
            <p className="font-bold text-slate-200 print:text-black">Lead Planning & Scheduling Engineer</p>
            <p className="text-[10px]">EPC Project Control Office, SWELECT</p>
          </div>
        </div>
      </div>
    </div>
  );
};
