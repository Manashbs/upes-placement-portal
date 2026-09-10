import React from 'react';
import { UserRole } from '../../types';
import { usePortal } from '../../context/PortalContext';
import { ShieldCheck, UserCheck, GraduationCap, Building, Lock } from 'lucide-react';

export const RoleSwitcherBar: React.FC = () => {
  const { currentRole, setCurrentRole, setActiveTab } = usePortal();

  const roles: { id: UserRole; label: string; icon: any; defaultTab: string }[] = [
    { id: 'PLACEMENT_OFFICER', label: 'Placement Officer (PO)', icon: ShieldCheck, defaultTab: 'spr-rotation' },
    { id: 'SPR', label: 'Student Rep (SPR)', icon: UserCheck, defaultTab: 'spr-dashboard' },
    { id: 'STUDENT', label: 'Student', icon: GraduationCap, defaultTab: 'student-dashboard' },
    { id: 'RECRUITER', label: 'Recruiter (Read-Only)', icon: Building, defaultTab: 'companies' },
    { id: 'SUPER_ADMIN', label: 'Super Admin', icon: Lock, defaultTab: 'settings' },
  ];

  const handleRoleChange = (roleId: UserRole, defaultTab: string) => {
    setCurrentRole(roleId);
    setActiveTab(defaultTab);
  };

  return (
    <div className="bg-[#0f172a] text-slate-300 text-xs py-2 px-8 flex items-center justify-between border-b border-slate-800 z-30 select-none">
      <div className="flex items-center space-x-2 font-medium text-slate-400">
        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
        <span className="uppercase text-[10px] tracking-widest font-bold text-amber-400">DEMO SWITCHER:</span>
        <span className="hidden md:inline">Select active perspective to test user workflows</span>
      </div>

      <div className="flex items-center space-x-1.5 overflow-x-auto">
        {roles.map((r) => {
          const Icon = r.icon;
          const isActive = currentRole === r.id;
          return (
            <button
              key={r.id}
              onClick={() => handleRoleChange(r.id, r.defaultTab)}
              className={`flex items-center space-x-1.5 px-3 py-1 rounded-lg transition-all ${
                isActive
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-xs'
                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{r.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
