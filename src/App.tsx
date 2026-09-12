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
import { LoginView } from './components/views/LoginView';

import { CandidateMobileScanView } from './components/views/CandidateMobileScanView';

function checkIsScanUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const hash = window.location.hash || '';
  const search = window.location.search || '';
  return (
    hash.includes('scan=') ||
    search.includes('action=scan') ||
    search.includes('scan=')
  );
}

const MainContent: React.FC = () => {
  const { activeTab, currentRole, currentUser } = usePortal();

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
        // Requirement: Portal settings only visible to Master Admin (Director)
        if (currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MASTER_ADMIN') {
          return <SettingsView />;
        }
        return <CommandCenterView />;
      default:
        return <CommandCenterView />;
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

const PortalAppContent: React.FC<{ isScanView: boolean }> = ({ isScanView }) => {
  const { currentUser } = usePortal();

  // Mobile candidate QR scan view does not require portal login
  if (isScanView) {
    return <CandidateMobileScanView />;
  }

  // If user is not logged in, display the Login View matching Screenshot 1
  if (!currentUser) {
    return <LoginView />;
  }

  return (
    <div className="min-h-screen flex flex-col font-sans bg-slate-50 text-slate-900 antialiased">
      <div className="flex-1 flex overflow-hidden">
        <Sidebar />
        <MainContent />
      </div>
    </div>
  );
};

export function App() {
  const [isScanView, setIsScanView] = React.useState(checkIsScanUrl);

  React.useEffect(() => {
    const handleUrlChange = () => {
      setIsScanView(checkIsScanUrl());
    };
    window.addEventListener('hashchange', handleUrlChange);
    window.addEventListener('popstate', handleUrlChange);
    return () => {
      window.removeEventListener('hashchange', handleUrlChange);
      window.removeEventListener('popstate', handleUrlChange);
    };
  }, []);

  return (
    <PortalProvider>
      <PortalAppContent isScanView={isScanView} />
    </PortalProvider>
  );
}

export default App;
