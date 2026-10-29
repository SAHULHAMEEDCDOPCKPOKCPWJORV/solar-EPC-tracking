import React from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  LayoutDashboard,
  Settings2,
  FolderTree,
  CalendarDays,
  ShieldAlert,
  TrendingUp,
  ClockAlert,
  FastForward,
  FileSpreadsheet,
  Sliders,
  Flame,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentProject } = useProject();

  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'setup', label: 'Project Setup', icon: Settings2 },
    { id: 'wbs', label: 'WBS & Activities', icon: FolderTree },
    { id: 'gantt', label: 'Schedule & Gantt', icon: CalendarDays },
    { id: 'workfront', label: 'Workfront Readiness', icon: ShieldAlert },
    { id: 'progress', label: 'Progress Tracking', icon: TrendingUp },
    { id: 'delay', label: 'Delay Analysis', icon: ClockAlert },
    { id: 'recovery', label: 'Recovery Planning', icon: FastForward },
    { id: 'reports', label: 'Reports & Excel', icon: FileSpreadsheet },
    { id: 'settings', label: 'Calendar & Baseline', icon: Sliders },
  ];

  const criticalCount = currentProject?.activities.filter(a => a.isCritical).length || 0;
  const blockedCount = currentProject?.activities.filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK').length || 0;

  return (
    <aside className="w-64 bg-graphite-900/95 border-r border-graphite-750/80 flex flex-col justify-between shrink-0 select-none">
      <div className="py-4">
        {/* Navigation list */}
        <div className="px-3 mb-2">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 py-1">
            Execution Modules
          </p>
        </div>

        <nav className="space-y-1 px-2">
          {navigationItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-medium transition-all group ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-transparent text-cyan-300 border-l-2 border-cyan-400 font-semibold pl-2.5'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-graphite-800'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      isActive ? 'text-cyan-400' : 'text-slate-400 group-hover:text-slate-300'
                    }`}
                  />
                  <span>{item.label}</span>
                </div>

                {/* Badges for delay or recovery if relevant */}
                {item.id === 'delay' && blockedCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-solar-amber/20 text-solar-amber border border-solar-amber/40">
                    {blockedCount}
                  </span>
                )}
                {item.id === 'gantt' && criticalCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/50">
                    {criticalCount} CP
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Project Status Summary Widget at Bottom */}
      {currentProject && (
        <div className="p-3 m-3 bg-graphite-850/80 rounded-xl border border-graphite-700/60 text-xs">
          <div className="flex items-center justify-between text-slate-300 mb-1.5">
            <span className="font-semibold text-[11px] truncate">{currentProject.code || currentProject.id}</span>
            <span className="text-[10px] text-cyan-400 font-bold">{currentProject.dcCapacityMW} MWp</span>
          </div>

          <p className="text-[10px] text-slate-400 truncate mb-2.5">
            {currentProject.location || 'India'}
          </p>

          <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-2 border-t border-graphite-750">
            <div className="bg-graphite-900 p-1.5 rounded flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <div>
                <p className="text-slate-400 text-[9px] uppercase font-bold leading-none">Critical</p>
                <p className="font-semibold text-slate-100">{criticalCount} Acts</p>
              </div>
            </div>

            <div className="bg-graphite-900 p-1.5 rounded flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-solar-amber shrink-0" />
              <div>
                <p className="text-slate-400 text-[9px] uppercase font-bold leading-none">Constraints</p>
                <p className="font-semibold text-slate-100">{blockedCount} Open</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
