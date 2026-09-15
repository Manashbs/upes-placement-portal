import React from 'react';
import {
  LayoutDashboard,
  Building2,
  Calendar,
  UserCheck,
  GraduationCap,
  RotateCw,
  BarChart3,
  Sliders,
  Sparkles,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentRole } = usePortal();

  const operationsNav = [
    { id: 'command-center', label: 'Command center', icon: LayoutDashboard },
    { id: 'companies', label: 'Companies', icon: Building2 },
    { id: 'rounds', label: 'Rounds', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: UserCheck, hasDot: true },
    { id: 'spr-rotation', label: 'SPR rotation', icon: RotateCw },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
  ];

  const workspaceNav = [
    { id: 'settings', label: 'Portal settings', icon: Sliders },
  ];

  // If student or SPR role selected, show dedicated portal items
  if (currentRole === 'STUDENT') {
    return (
      <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800/60">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            UP
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-tight text-white">UPES</div>
            <div className="text-[10px] tracking-wider uppercase font-semibold text-amber-400">STUDENT PORTAL</div>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">
            STUDENT DESK
          </div>
          <nav className="space-y-1">
            {[
              { id: 'student-dashboard', label: 'My Passport & Drives', icon: GraduationCap },
              { id: 'student-scan', label: 'QR Attendance Scan', icon: UserCheck },
              { id: 'student-offers', label: 'My Offers & CTC', icon: Sparkles },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    );
  }

  if (currentRole === 'SPR') {
    return (
      <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800/60">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-bold text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            UP
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-tight text-white">UPES</div>
            <div className="text-[10px] tracking-wider uppercase font-semibold text-emerald-400">SPR DESK</div>
          </div>
        </div>

        <div className="px-4 py-6">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">
            DUTY MANAGEMENT
          </div>
          <nav className="space-y-1">
            {[
              { id: 'spr-dashboard', label: 'My Duties & Rotation', icon: RotateCw },
              { id: 'spr-scanner', label: 'QR Candidate Verifier', icon: UserCheck },
            ].map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/50'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* UPES Brand Header */}
      <div className="p-6 flex items-center space-x-3 border-b border-slate-800/60">
        <div className="w-10 h-10 bg-[#F59E0B] rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
          UP
        </div>
        <div>
          <div className="font-extrabold text-lg tracking-tight text-white leading-tight">UPES</div>
          <div className="text-[10px] tracking-widest uppercase font-semibold text-slate-400">
            PLACEMENT CELL
          </div>
        </div>
      </div>

      {/* Nav Content */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {/* OPERATIONS Section */}
        <div>
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-3">
            OPERATIONS
          </div>
          <nav className="space-y-1">
            {operationsNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.hasDot && (
                    <span className="w-2 h-2 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50" />
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* WORKSPACE Section */}
        <div>
          <div className="text-[11px] font-extrabold text-slate-400 uppercase tracking-widest px-3 mb-3">
            WORKSPACE
          </div>
          <nav className="space-y-1">
            {workspaceNav.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-slate-800/90 text-white font-semibold shadow-inner border border-slate-700/60'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-amber-400' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
};
