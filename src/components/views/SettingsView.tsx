import React from 'react';
import { Sliders, ShieldCheck, MapPin, Lock, Bell } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="space-y-8 select-none pb-12 max-w-4xl">
      <div>
        <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
          SYSTEM GOVERNANCE
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          Portal Settings & Rules
        </h2>
        <p className="text-sm font-medium text-slate-500">
          Configure tier restriction rules, attendance geo-fencing parameters, and SPR cycle policies.
        </p>
      </div>

      <div className="space-y-6">
        {/* Tier Lock Policy */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
            <Lock className="w-5 h-5 text-amber-500" />
            <h3 className="text-lg font-extrabold text-slate-900">One Student One Offer / Tier Policy</h3>
          </div>

          <div className="space-y-3 text-xs">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-amber-500 rounded-md" />
              <span className="font-bold text-slate-800">Enforce Dream Offer Locking (&gt;15 LPA locks out Core companies)</span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input type="checkbox" defaultChecked className="w-4 h-4 text-amber-500 rounded-md" />
              <span className="font-bold text-slate-800">Super Dream Tier allows 1 upgraded attempt for Dream-placed candidates</span>
            </label>
          </div>
        </div>

        {/* Attendance Security Settings */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-3 border-b border-slate-100 pb-3">
            <MapPin className="w-5 h-5 text-emerald-500" />
            <h3 className="text-lg font-extrabold text-slate-900">QR Attendance & Geo-Fencing</h3>
          </div>

          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">QR Token Rotation Interval</label>
              <select className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold">
                <option value="15">Every 15 minutes</option>
                <option value="30" selected>Every 30 minutes</option>
                <option value="60">Every 60 minutes</option>
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Default Geo-fence Radius</label>
              <input
                type="text"
                defaultValue="500 meters (UPES Bidholi Campus)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
