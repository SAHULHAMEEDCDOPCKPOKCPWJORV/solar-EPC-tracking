import React, { useState } from 'react';
import { useProject } from '../../context/ProjectContext';
import {
  Sun,
  Layers,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Bell,
  User,
  Plus,
  FolderOpen,
  LogOut,
  ChevronDown,
  ShieldCheck,
  Zap
} from 'lucide-react';

interface TopNavProps {
  onOpenNewProjectModal: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ onOpenNewProjectModal }) => {
  const {
    currentProject,
    projects,
    setCurrentProjectId,
    loadDemoProject,
    user,
    logout,
    notification
  } = useProject();

  const [showProjectDropdown, setShowProjectDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotificationsModal, setShowNotificationsModal] = useState(false);

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'EXECUTION':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse"></span> EXECUTION</span>;
      case 'COMMISSIONING':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-solar-amber/20 text-solar-amber border border-solar-amber/40 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-solar-amber animate-pulse"></span> COMMISSIONING</span>;
      case 'HANDOVER':
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800/60">HANDOVER</span>;
      default:
        return <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">PLANNING</span>;
    }
  };

  return (
    <header className="h-16 bg-graphite-900 border-b border-graphite-750 px-4 flex items-center justify-between sticky top-0 z-40">
      {/* Brand & Platform */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-cyan-400 to-cyan-600 flex items-center justify-center shadow-lg shadow-cyan-500/20 text-graphite-950 font-black">
            <Sun className="w-5 h-5 text-graphite-950 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold tracking-tight text-white text-base">SWELECT</span>
              <span className="text-[10px] tracking-wider uppercase font-semibold text-cyan-400 bg-cyan-950/80 px-1.5 py-0.5 rounded border border-cyan-800/50">Project Control</span>
            </div>
            <p className="text-[11px] text-slate-400 font-normal leading-none hidden sm:block">Solar EPC Execution & Scheduling Platform</p>
          </div>
        </div>

        <div className="h-6 w-px bg-graphite-750 mx-1 hidden md:block"></div>

        {/* Project Selector */}
        <div className="relative">
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            className="flex items-center gap-2 bg-graphite-850 hover:bg-graphite-800 border border-graphite-700/80 hover:border-cyan-500/50 rounded-lg px-3 py-1.5 text-sm transition-colors text-left"
          >
            <FolderOpen className="w-4 h-4 text-cyan-400 shrink-0" />
            <div className="max-w-[200px] sm:max-w-[280px] truncate">
              {currentProject ? (
                <div className="truncate">
                  <span className="font-medium text-slate-100">{currentProject.name}</span>
                  <span className="text-xs text-slate-400 ml-2">({currentProject.dcCapacityMW} MWp)</span>
                </div>
              ) : (
                <span className="text-slate-400 italic">No Project Selected</span>
              )}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-1" />
          </button>

          {/* Project Dropdown Menu */}
          {showProjectDropdown && (
            <div className="absolute top-full left-0 mt-1.5 w-80 bg-graphite-850 border border-graphite-700 rounded-xl shadow-2xl p-2 z-50">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-2 py-1 mb-1">
                Active Projects ({projects.length})
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {projects.map(p => (
                  <button
                    key={p.id}
                    onClick={() => {
                      setCurrentProjectId(p.id);
                      setShowProjectDropdown(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                      currentProject?.id === p.id
                        ? 'bg-cyan-500/10 text-cyan-300 border border-cyan-500/30'
                        : 'text-slate-200 hover:bg-graphite-750'
                    }`}
                  >
                    <div className="truncate mr-2">
                      <p className="font-semibold truncate">{p.name}</p>
                      <p className="text-[10px] text-slate-400">{p.id} • {p.dcCapacityMW} MWp • {p.location || 'India'}</p>
                    </div>
                    {currentProject?.id === p.id && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />}
                  </button>
                ))}
              </div>

              <div className="border-t border-graphite-750 pt-2 mt-2 space-y-1">
                <button
                  onClick={() => {
                    setShowProjectDropdown(false);
                    onOpenNewProjectModal();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-400 hover:bg-cyan-500/10 flex items-center gap-2"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Project</span>
                </button>
                <button
                  onClick={() => {
                    setShowProjectDropdown(false);
                    loadDemoProject();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-solar-amber hover:bg-solar-amber/10 flex items-center gap-2"
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>Load 50 MWp Reference Project</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Status Pill */}
        {currentProject && (
          <div className="hidden lg:flex items-center gap-2">
            {getStatusBadge(currentProject.status)}
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Baseline: Rev {currentProject.activeBaselineRevision}</span>
            </span>
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* Sync Indicator */}
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-400/90 bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-full">
          <Zap className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono font-medium">CPM Live</span>
        </div>

        {/* Notifications */}
        <button
          onClick={() => setShowNotificationsModal(!showNotificationsModal)}
          className="relative p-2 rounded-lg bg-graphite-850 hover:bg-graphite-800 border border-graphite-750 text-slate-300 hover:text-white transition-colors"
          title="Execution Alerts"
        >
          <Bell className="w-4 h-4" />
          {currentProject?.activities.some(a => a.status === 'BLOCKED' || a.status === 'AT_RISK') && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-solar-amber ring-2 ring-graphite-900"></span>
          )}
        </button>

        {/* Notifications Dropdown */}
        {showNotificationsModal && (
          <div className="absolute top-14 right-16 w-80 bg-graphite-850 border border-graphite-700 rounded-xl shadow-2xl p-3 z-50">
            <div className="flex items-center justify-between pb-2 border-b border-graphite-750">
              <h4 className="text-xs font-semibold text-slate-200">Execution Alerts</h4>
              <span className="text-[10px] text-slate-400">Real-time Constraints</span>
            </div>
            <div className="py-2 max-h-60 overflow-y-auto space-y-2 text-xs">
              {currentProject?.activities.filter(a => a.status === 'BLOCKED' || a.status === 'AT_RISK').map(a => (
                <div key={a.id} className="p-2 rounded bg-graphite-900 border border-graphite-750">
                  <div className="flex items-center gap-1.5 text-solar-amber font-semibold text-[11px]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{a.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{a.delayReason || 'Activity marked at risk / blocked.'}</p>
                </div>
              ))}
              {(!currentProject || !currentProject.activities.some(a => a.status === 'BLOCKED' || a.status === 'AT_RISK')) && (
                <p className="text-slate-400 text-[11px] py-4 text-center">No active execution constraints or delays.</p>
              )}
            </div>
          </div>
        )}

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-graphite-800 border border-transparent hover:border-graphite-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-xs font-bold text-graphite-950">
              {user?.avatarInitials || 'SW'}
            </div>
            <div className="hidden md:block text-left">
              <p className="text-xs font-semibold text-slate-200 leading-tight">{user?.name || 'Er. K. Ramesh'}</p>
              <p className="text-[10px] text-cyan-400 leading-tight">{user?.role || 'Project Manager'}</p>
            </div>
            <ChevronDown className="w-3 h-3 text-slate-400 hidden md:block" />
          </button>

          {showUserDropdown && (
            <div className="absolute top-full right-0 mt-1.5 w-60 bg-graphite-850 border border-graphite-700 rounded-xl shadow-2xl p-2 z-50">
              <div className="px-3 py-2 border-b border-graphite-750">
                <p className="text-xs font-bold text-slate-100">{user?.name || 'Er. K. Ramesh'}</p>
                <p className="text-[11px] text-slate-400 truncate">{user?.email || 'k.ramesh@swelectes.com'}</p>
                <p className="text-[10px] text-cyan-400 font-medium mt-1">{user?.role || 'Project Manager'}</p>
              </div>
              <div className="pt-2">
                <button
                  onClick={() => {
                    setShowUserDropdown(false);
                    logout();
                  }}
                  className="w-full text-left px-3 py-1.5 rounded-lg text-xs font-medium text-rose-400 hover:bg-rose-500/10 flex items-center gap-2"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
