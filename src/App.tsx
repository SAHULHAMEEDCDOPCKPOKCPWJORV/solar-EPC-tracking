import React, { useState } from 'react';
import { ProjectProvider, useProject } from './context/ProjectContext';
import { TopNav } from './components/layout/TopNav';
import { Sidebar } from './components/layout/Sidebar';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProjectSetupView } from './components/project-setup/ProjectSetupView';
import { WbsView } from './components/wbs/WbsView';
import { GanttView } from './components/gantt/GanttView';
import { WorkfrontView } from './components/workfront/WorkfrontView';
import { ProgressTrackingView } from './components/progress/ProgressTrackingView';
import { DelayAnalysisView } from './components/delay-analysis/DelayAnalysisView';
import { RecoveryPlanningView } from './components/recovery-planning/RecoveryPlanningView';
import { ReportsView } from './components/reports/ReportsView';
import { SettingsView } from './components/settings/SettingsView';
import { CreateProjectModal } from './components/project-setup/CreateProjectModal';
import { LoginModal } from './components/auth/LoginModal';
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X
} from 'lucide-react';

const AppContent: React.FC = () => {
  const { user, activeTab, notification } = useProject();
  const [showCreateModal, setShowCreateModal] = useState(false);

  // If user is not logged in, show secure login interface
  if (!user) {
    return <LoginModal />;
  }

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onOpenNewProjectModal={() => setShowCreateModal(true)} />;
      case 'setup':
        return <ProjectSetupView />;
      case 'wbs':
        return <WbsView />;
      case 'gantt':
        return <GanttView />;
      case 'workfront':
        return <WorkfrontView />;
      case 'progress':
        return <ProgressTrackingView />;
      case 'delay':
        return <DelayAnalysisView />;
      case 'recovery':
        return <RecoveryPlanningView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <DashboardView onOpenNewProjectModal={() => setShowCreateModal(true)} />;
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-graphite-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation */}
      <TopNav onOpenNewProjectModal={() => setShowCreateModal(true)} />

      {/* Main Layout Area: Sidebar + Active Tab Content */}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {renderActiveView()}
        </main>
      </div>

      {/* Toast Notification Banner */}
      {notification && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 text-xs font-semibold border ${
            notification.type === 'success'
              ? 'bg-emerald-950 text-emerald-200 border-emerald-600'
              : notification.type === 'warning'
              ? 'bg-amber-950 text-amber-200 border-amber-600'
              : notification.type === 'error'
              ? 'bg-rose-950 text-rose-200 border-rose-600'
              : 'bg-cyan-950 text-cyan-200 border-cyan-600'
          }`}>
            {notification.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            {notification.type === 'warning' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            {notification.type === 'error' && <AlertCircle className="w-4 h-4 text-rose-400" />}
            {notification.type === 'info' && <Info className="w-4 h-4 text-cyan-400" />}
            <span>{notification.message}</span>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      <CreateProjectModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  );
};

export function App() {
  return (
    <ProjectProvider>
      <AppContent />
    </ProjectProvider>
  );
}

export default App;
