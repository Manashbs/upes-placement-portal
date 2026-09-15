import React, { useState } from 'react';
import { Bell, ChevronDown, CheckCircle2, ShieldCheck, UserCheck, GraduationCap, Building, Lock } from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { UserRole } from '../../types';

export const TopHeader: React.FC = () => {
  const { activeTab, currentRole, setCurrentRole, setActiveTab, notifications, currentUser, logout } = usePortal();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const getPageTitle = () => {
    switch (activeTab) {
      case 'companies': return 'Companies & Selection Drives';
      case 'rounds': return 'Selection Rounds & Processes';
      case 'attendance': return 'Round Attendance Marking';
      case 'spr-rotation': return 'SPR Allotment & Fair Rotation';
      case 'student-dashboard': return 'My Passport & Drives';
      case 'student-scan': return 'QR Attendance Scan';
      case 'student-offers': return 'My Offers & CTC';
      case 'spr-dashboard': return 'My Duties & Rotation';
      case 'spr-scanner': return 'QR Candidate Verifier';
      default: return 'SPR Allotment & Attendance Desk';
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return 'CSO';
    const clean = name.replace(/\(.*\)/, '').trim();
    if (clean.toUpperCase().includes('CSO')) return 'CSO';
    const parts = clean.split(' ').filter(Boolean);
    if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    return clean.slice(0, 3).toUpperCase();
  };

  const isMasterAdmin = currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MASTER_ADMIN';

  const getProfileName = () => {
    const rawName = currentUser?.name || '';
    const isManash = rawName.toLowerCase().includes('manash');
    const displayName = isManash || !rawName ? 'CSO' : rawName;
    return {
      name: displayName,
      title: '', // No designation as of now
      initials: getInitials(displayName),
    };
  };

  const profile = getProfileName();

  const roleOptions: { id: UserRole; label: string; icon: any; defaultTab: string }[] = [
    { id: 'DIRECTOR', label: 'Director (Master Admin)', icon: ShieldCheck, defaultTab: 'companies' },
    { id: 'CSO', label: 'Career Service Officer (CSO)', icon: UserCheck, defaultTab: 'attendance' },
  ];

  const handleSelectRole = (roleId: UserRole, defaultTab: string) => {
    setCurrentRole(roleId);
    setActiveTab(defaultTab);
    setShowProfileMenu(false);
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-8 flex items-center justify-between z-20 select-none">
      {/* Page Title & Breadcrumb */}
      <div>
        <div className="text-[10px] uppercase font-bold tracking-widest text-slate-400">
          UPES SPR & ATTENDANCE DESK
        </div>
        <h1 className="text-xl font-bold text-slate-900 tracking-tight">
          {getPageTitle()}
        </h1>
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-5">
        {/* Season Live Status Badge */}
        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 text-xs font-semibold px-3 py-1.5 rounded-full border border-emerald-200/60 shadow-xs">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>Season live</span>
        </div>

        {/* Notifications Bell */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowProfileMenu(false);
            }}
            className="p-2 rounded-full hover:bg-slate-100 text-slate-500 relative transition-colors"
          >
            <Bell className="w-5 h-5" />
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full ring-2 ring-white" />
            )}
          </button>

          {/* Notifications Drawer Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl border border-slate-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <span className="text-xs font-bold text-slate-900">Notifications</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                  {notifications.length} New
                </span>
              </div>
              <div className="space-y-2.5 max-h-64 overflow-y-auto">
                {notifications.map((note, idx) => (
                  <div key={idx} className="flex items-start space-x-2.5 text-xs text-slate-600 p-2 hover:bg-slate-50 rounded-xl transition-colors">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <span>{note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="h-6 w-px bg-slate-200" />

        {/* User Profile Pill with Role Switching Dropdown */}
        <div className="relative">
          <div
            onClick={() => {
              setShowProfileMenu(!showProfileMenu);
              setShowNotifications(false);
            }}
            className="flex items-center space-x-3 cursor-pointer group p-1.5 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-200"
          >
            <div className="w-9 h-9 bg-[#0B132B] text-amber-400 border border-amber-500/40 rounded-full flex items-center justify-center font-black text-xs shadow-sm group-hover:ring-2 group-hover:ring-amber-500 transition-all">
              {profile.initials}
            </div>
            <div className="text-left hidden md:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {profile.name}
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-colors" />
          </div>

          {/* Profile & Role Switcher Dropdown */}
          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 p-3.5 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* Account summary */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 mb-3">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {profile.name}
                </div>
                <div className="text-[11px] text-slate-500 font-mono truncate">
                  {currentUser?.username && !currentUser.username.toLowerCase().includes('manash')
                    ? currentUser.username
                    : 'CSO@Upes.ac.in'}
                </div>
              </div>

              {isMasterAdmin && (
                <>
                  <div className="text-[10px] font-extrabold text-slate-400 uppercase tracking-widest px-2 py-1 border-b border-slate-100 mb-2">
                    Simulate Role Perspective
                  </div>
                  <div className="space-y-1 mb-3">
                    {roleOptions.map((r) => {
                      const Icon = r.icon;
                      const isActive = currentRole === r.id;
                      return (
                        <button
                          key={r.id}
                          onClick={() => handleSelectRole(r.id, r.defaultTab)}
                          className={`w-full flex items-center space-x-2.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all text-left ${
                            isActive
                              ? 'bg-[#0B132B] text-amber-400'
                              : 'text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5 shrink-0" />
                          <span>{r.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}

              <div className="border-t border-slate-100 pt-2">
                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    logout();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                >
                  <span>Log out of portal</span>
                  <Lock className="w-3.5 h-3.5 text-rose-500" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
