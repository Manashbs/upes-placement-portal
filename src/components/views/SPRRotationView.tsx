import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { SPR } from '../../types';
import {
  Building2,
  Clock,
  MapPin,
  Trash2,
  UserPlus,
  X,
  ChevronRight,
  UserCheck,
} from 'lucide-react';

export const SPRRotationView: React.FC = () => {
  const { sprs, dutyAssignments, addSpr, deleteSpr } = usePortal();

  // State for SPR details modal
  const [selectedSprDetails, setSelectedSprDetails] = useState<SPR | null>(null);

  // Add SPR Modal state
  const [showAddSprModal, setShowAddSprModal] = useState(false);
  const [newSprName, setNewSprName] = useState('');
  const [newSprSapId, setNewSprSapId] = useState('');
  const [newSprBranch, setNewSprBranch] = useState('B.Tech CSE');
  const [newSprEmail, setNewSprEmail] = useState('');
  const [newSprPhone, setNewSprPhone] = useState('');

  const handleAddSprSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprName || !newSprSapId) return;

    addSpr({
      name: newSprName,
      sapId: newSprSapId,
      branch: newSprBranch || 'B.Tech CSE',
      email: newSprEmail,
      phone: newSprPhone,
    });

    setNewSprName('');
    setNewSprSapId('');
    setNewSprEmail('');
    setNewSprPhone('');
    setShowAddSprModal(false);
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Header & Main Title */}
      <div>
        <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
          STUDENT PLACEMENT REPRESENTATIVES
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          SPR rotation
        </h2>
        <p className="text-sm font-medium text-slate-500 max-w-3xl">
          Register SPR representatives and view detailed company drive duty allocations, venues handled, and process history.
        </p>
      </div>

      {/* Primary Action Button */}
      <div className="flex items-center justify-between flex-wrap gap-4 border-b border-slate-200/60 pb-6">
        <button
          onClick={() => setShowAddSprModal(true)}
          className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-extrabold px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add SPR Name</span>
        </button>

        <div className="text-xs font-bold text-slate-500 bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-2xs">
          Registered SPR Roster: <span className="text-slate-900 font-extrabold">{sprs.length} Active Representatives</span>
        </div>
      </div>

      {/* SPR Cards Roster Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Active SPR Roster ({sprs.length})
          </h3>
          <span className="text-xs text-slate-400 font-medium">💡 Click any SPR card to view full duty history & venues</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprs.map((spr) => {
            const sprDuties = dutyAssignments.filter(
              (d) => d.sprId === spr.id || d.sprName.toLowerCase() === spr.name.toLowerCase()
            );

            return (
              <div
                key={spr.id}
                onClick={() => setSelectedSprDetails(spr)}
                className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between hover:border-amber-400 hover:shadow-md transition-all cursor-pointer group space-y-4 relative overflow-hidden"
              >
                {/* Decorative Top Accent Line on Hover */}
                <div className="absolute top-0 left-0 right-0 h-1 bg-transparent group-hover:bg-amber-400 transition-colors" />

                <div>
                  {/* Top Avatar & Name Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-12 h-12 rounded-2xl bg-[#0B132B] text-amber-400 flex items-center justify-center font-extrabold text-base shadow-xs group-hover:scale-105 transition-transform">
                        {spr.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-base group-hover:text-amber-900 transition-colors">
                          {spr.name}
                        </div>
                        <div className="text-xs text-slate-400 font-mono font-semibold">
                          SAP: {spr.sapId} · {spr.branch}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteSpr(spr.id);
                      }}
                      className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                      title="Remove SPR"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center space-x-2 mt-4">
                    <span className="text-[11px] bg-slate-100 text-slate-700 font-bold px-3 py-1 rounded-full">
                      Total Duties: {spr.totalDuties}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        spr.usedInCurrentCycle
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {spr.usedInCurrentCycle ? '• Active in Cycle' : '• Available'}
                    </span>
                  </div>

                  {/* Duties Preview Summary */}
                  <div className="mt-4 pt-4 border-t border-slate-100 space-y-2">
                    <div className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Companies Handled ({sprDuties.length})</span>
                      <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    </div>

                    {sprDuties.length > 0 ? (
                      <div className="space-y-2">
                        {sprDuties.slice(0, 2).map((duty) => (
                          <div
                            key={duty.id}
                            className="bg-slate-50 p-3 rounded-2xl border border-slate-200/60 space-y-1 text-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="font-extrabold text-slate-900">{duty.companyName}</span>
                              <span
                                className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                  duty.status === 'ACCEPTED'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : duty.status === 'COMPLETED'
                                    ? 'bg-slate-200 text-slate-700'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {duty.status}
                              </span>
                            </div>
                            <div className="text-[11px] font-medium text-slate-600">
                              {duty.roundName} · <span className="text-slate-500 font-bold">{duty.role}</span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                              <span>📍 {duty.venue}</span>
                              <span>🕒 {duty.timeWindow}</span>
                            </div>
                          </div>
                        ))}
                        {sprDuties.length > 2 && (
                          <div className="text-[11px] font-bold text-amber-600 text-center pt-1">
                            +{sprDuties.length - 2} more duties recorded
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-400 font-medium bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center italic">
                        No duty assigned yet in current cycle. Click to inspect details.
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Hint */}
                <div className="pt-2 flex items-center justify-between text-xs font-extrabold text-amber-600 group-hover:text-amber-700">
                  <span>View Details & Venues</span>
                  <ChevronRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SPR Details Modal */}
      {selectedSprDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
            {/* Sticky Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-xl bg-[#0B132B] text-amber-400 font-extrabold flex items-center justify-center text-sm">
                  {selectedSprDetails.name.split(' ').map((n) => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-slate-900">
                    {selectedSprDetails.name}
                  </h3>
                  <p className="text-xs text-slate-400 font-mono font-medium">
                    SAP ID: {selectedSprDetails.sapId} · {selectedSprDetails.branch}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedSprDetails(null)}
                className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              {/* SPR Overview Stats */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Duties</span>
                  <div className="text-sm font-extrabold text-slate-900 mt-0.5">
                    {selectedSprDetails.totalDuties} Assigned Duties
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Cycle Status</span>
                  <div className="text-xs font-extrabold text-amber-600 mt-0.5">
                    {selectedSprDetails.usedInCurrentCycle ? 'Active in Cycle' : 'Available for Next Round'}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact</span>
                  <div className="text-xs font-medium text-slate-700 mt-0.5">
                    {selectedSprDetails.phone || selectedSprDetails.email || 'Registered in Roster'}
                  </div>
                </div>
              </div>

              {/* Handled Companies & Venues Detailed Roster */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Building2 className="w-4 h-4 text-amber-500" />
                    <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                      Companies Handled & Assigned Venues
                    </h4>
                  </div>
                  <span className="text-[11px] font-bold text-slate-500">
                    {dutyAssignments.filter(d => d.sprId === selectedSprDetails.id || d.sprName.toLowerCase() === selectedSprDetails.name.toLowerCase()).length} Records Found
                  </span>
                </div>

                {(() => {
                  const duties = dutyAssignments.filter(
                    (d) => d.sprId === selectedSprDetails.id || d.sprName.toLowerCase() === selectedSprDetails.name.toLowerCase()
                  );

                  if (duties.length === 0) {
                    return (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-1">
                        <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="text-xs font-bold text-slate-700">No duty history recorded yet</div>
                        <p className="text-[11px] text-slate-400">
                          This representative is available in the SPR pool and ready for allocation in upcoming drive rounds.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {duties.map((duty) => (
                        <div
                          key={duty.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs space-y-2 hover:border-amber-400/60 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <span className="font-extrabold text-slate-900 text-sm">{duty.companyName}</span>
                              <span className="text-xs text-slate-400 font-semibold">• {duty.roundName}</span>
                            </div>
                            <span
                              className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border ${
                                duty.status === 'ACCEPTED'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                  : duty.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {duty.status}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                            <div className="flex items-center space-x-1.5 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span className="truncate">Venue: <strong className="text-slate-900">{duty.venue}</strong></span>
                            </div>

                            <div className="flex items-center space-x-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>Time: <strong className="text-slate-900">{duty.timeWindow}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[11px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                            <span className="text-slate-500">Assigned Duty Role:</span>
                            <span className="font-extrabold text-slate-900">{duty.role}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
              <button
                onClick={() => setSelectedSprDetails(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New SPR Modal */}
      {showAddSprModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-extrabold text-slate-900">Add New SPR Representative</h3>
              </div>
              <button onClick={() => setShowAddSprModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSprSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">SPR Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Singh"
                  value={newSprName}
                  onChange={(e) => setNewSprName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">SAP ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 59001240"
                  value={newSprSapId}
                  onChange={(e) => setNewSprSapId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Branch / Discipline</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech CSE - Cloud Computing"
                  value={newSprBranch}
                  onChange={(e) => setNewSprBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                  <input
                    type="email"
                    placeholder="student@stu.upes.ac.in"
                    value={newSprEmail}
                    onChange={(e) => setNewSprEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none text-[11px]"
                  />
                </div>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                  <input
                    type="text"
                    placeholder="+91 98765 00000"
                    value={newSprPhone}
                    onChange={(e) => setNewSprPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none text-[11px]"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSprModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Save SPR Name
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
