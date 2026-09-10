import React from 'react';
import { PortalProvider, usePortal } from './context/PortalContext';
import { Sidebar } from './components/layout/Sidebar';
import { TopHeader } from './components/layout/TopHeader';

import { CommandCenterView } from './components/views/CommandCenterView';
import { CompaniesView } from './components/views/CompaniesView';
import { RoundsView } from './components/views/RoundsView';
import { AttendanceView } from './components/views/AttendanceView';
import { SPRRotationView } from './components/views/SPRRotationView';
import { ReportsView } from './components/views/ReportsView';
import { SettingsView } from './components/views/SettingsView';
import { StudentPortalView } from './components/views/StudentPortalView';
import { SPRPortalView } from './components/views/SPRPortalView';

import { CandidateMobileScanView } from './components/views/CandidateMobileScanView';

const MainContent: React.FC = () => {
  const { activeTab, currentRole } = usePortal();

  // Check if candidate opened personalized attendance link with action=scan
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const isScanAction = urlParams?.get('action') === 'scan';

  if (isScanAction) {
    return <CandidateMobileScanView />;
  }

  const renderActiveView = () => {
    // If student role selected
    if (currentRole === 'STUDENT' || activeTab.startsWith('student-')) {
      return <StudentPortalView />;
    }

    // If SPR role selected
    if (currentRole === 'SPR' || activeTab.startsWith('spr-dash') || activeTab === 'spr-scanner') {
      return <SPRPortalView />;
    }

    switch (activeTab) {
      case 'command-center':
        return <CommandCenterView />;
      case 'companies':
        return <CompaniesView />;
      case 'rounds':
        return <RoundsView />;
      case 'attendance':
        return <AttendanceView />;
      case 'spr-rotation':
        return <SPRRotationView />;
      case 'reports':
        return <ReportsView />;
      case 'settings':
        return <SettingsView />;
      default:
        return <SPRRotationView />;
    }
  };

  return (
    <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-slate-50 bg-grid-canvas">
      <TopHeader />
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-7xl mx-auto">
          {renderActiveView()}
        </div>
      </main>
    </div>
  );
};

export function App() {
  return (
    <PortalProvider>
      <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 antialiased">
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <MainContent />
        </div>
      </div>
    </PortalProvider>
  );
}

export default App;
