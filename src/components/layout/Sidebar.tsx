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
  LogOut,
  Shield,
  User,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';

export const Sidebar: React.FC = () => {
  const { activeTab, setActiveTab, currentRole, currentUser, logout } = usePortal();

  const isMasterAdmin = currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MASTER_ADMIN';

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

  // If student role selected, show dedicated student items
  if (currentRole === 'STUDENT') {
    return (
      <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800/60">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            UP
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-tight text-white">UPES</div>
            <div className="text-[10px] tracking-wider uppercase font-semibold text-amber-400">STUDENT PORTAL</div>
          </div>
        </div>

        <div className="px-4 py-6 flex-1">
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
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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

        {/* User profile card & logout */}
        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={logout}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer font-bold"
          >
            <span>Sign out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  if (currentRole === 'SPR') {
    return (
      <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
        <div className="p-6 flex items-center space-x-3 border-b border-slate-800/60">
          <div className="w-10 h-10 bg-amber-500 rounded-xl flex items-center justify-center font-black text-slate-950 text-xl shadow-lg shadow-amber-500/20">
            UP
          </div>
          <div>
            <div className="font-extrabold text-lg tracking-tight text-white">UPES</div>
            <div className="text-[10px] tracking-wider uppercase font-semibold text-emerald-400">SPR DESK</div>
          </div>
        </div>

        <div className="px-4 py-6 flex-1">
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
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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

        <div className="p-4 border-t border-slate-800/60">
          <button
            onClick={logout}
            className="w-full flex items-center justify-between px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer font-bold"
          >
            <span>Sign out</span>
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-[#0B132B] text-white flex flex-col shrink-0 min-h-screen border-r border-slate-800 select-none">
      {/* UPES Brand Header matching Screenshot 2 */}
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
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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

        {/* WORKSPACE Section — ONLY visible to Master Admin (Requirement #3) */}
        {isMasterAdmin && (
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
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all cursor-pointer ${
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
        )}
      </div>

      {/* Authenticated User Footer & Sign out */}
      <div className="p-4 border-t border-slate-800/60 bg-slate-950/40 space-y-2">
        <div className="flex items-center space-x-3 px-2 py-1">
          <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs border border-amber-500/30 shrink-0">
            {isMasterAdmin ? <Shield className="w-4 h-4 text-amber-400" /> : <User className="w-4 h-4 text-slate-300" />}
          </div>
          <div className="overflow-hidden flex-1">
            <div className="text-xs font-bold text-white truncate">
              {currentUser?.name || 'Master Admin'}
            </div>
            <div className="text-[10px] text-amber-400 font-extrabold uppercase tracking-wider truncate">
              {currentUser?.role?.replace('_', ' ') || 'MASTER ADMIN'}
            </div>
          </div>
        </div>

        <button
          onClick={logout}
          className="w-full flex items-center justify-between px-3 py-2 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-xl transition-all cursor-pointer font-bold"
        >
          <span>Sign out</span>
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
