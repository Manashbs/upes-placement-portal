import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import {
  RotateCw,
  Calendar,
  Users,
  ShieldCheck,
  Building2,
  Clock,
  MapPin,
  Plus,
  CheckCircle,
  AlertCircle,
  Zap,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { allocateSPRsForRound } from '../../utils/sprAllocationEngine';

export const SPRRotationView: React.FC = () => {
  const {
    rounds,
    sprs,
    sprCycle,
    dutyAssignments,
    triggerSprAllocation,
    addSpr,
    deleteSpr,
  } = usePortal();

  const [selectedRoundForAlloc, setSelectedRoundForAlloc] = useState<string | null>(null);
  const [allocationDebug, setAllocationDebug] = useState<any[] | null>(null);
  const [showDebugModal, setShowDebugModal] = useState(false);

  // Add SPR Modal state
  const [showAddSprModal, setShowAddSprModal] = useState(false);
  const [newSprName, setNewSprName] = useState('');
  const [newSprSapId, setNewSprSapId] = useState('');
  const [newSprBranch, setNewSprBranch] = useState('B.Tech CSE');
  const [newSprEmail, setNewSprEmail] = useState('');
  const [newSprPhone, setNewSprPhone] = useState('');

  const roundsNeedingCover = rounds.filter((r) => r.assignedSprIds.length < 3).length;
  const totalAssignments = dutyAssignments.length;

  const handleTestAllocation = (roundId: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;

    const result = allocateSPRsForRound(round, 3, sprs, sprCycle, rounds);
    setAllocationDebug(result.debugLog);
    setSelectedRoundForAlloc(roundId);
    setShowDebugModal(true);

    triggerSprAllocation(roundId, 3);
  };

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
      {/* Header & Main Title matching screenshot 1 */}
      <div>
        <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
          STUDENT PLACEMENT REPRESENTATIVES
        </div>
        <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
          SPR rotation
        </h2>
        <p className="text-sm font-medium text-slate-500 max-w-3xl">
          Register SPR representatives, track duty allocations, and ensure coverage repeats fairly cycle by cycle across processes.
        </p>
      </div>

      {/* Primary Action Buttons */}
      <div className="flex items-center space-x-3 flex-wrap gap-y-2">
        <button
          onClick={() => setShowAddSprModal(true)}
          className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <UserPlus className="w-4 h-4" />
          <span>Add SPR Name</span>
        </button>

        <button
          onClick={() => {
            const nextRound = rounds.find((r) => r.assignedSprIds.length < 3);
            if (nextRound) handleTestAllocation(nextRound.id);
          }}
          className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
        >
          <RotateCw className="w-4 h-4 text-amber-400" />
          <span>Rotation sheet</span>
        </button>
      </div>

      {/* KPI Stat Cards Grid matching screenshot 1 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 tracking-wide">
                Rounds needing cover
              </span>
              <div className="text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
                {roundsNeedingCover}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-[#0B132B] text-white flex items-center justify-center shadow-md">
              <Calendar className="w-5 h-5 text-amber-400" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-1.5 text-xs font-bold text-emerald-600">
            <span>↗</span>
            <span>Upcoming and live</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 tracking-wide">
                SPR assignments
              </span>
              <div className="text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
                {totalAssignments}
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 flex items-center justify-center shadow-md shadow-amber-500/20">
              <Users className="w-5 h-5 text-slate-950" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-1.5 text-xs font-bold text-emerald-600">
            <span>↗</span>
            <span>Across visible rounds</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-400 tracking-wide">
                Coverage health
              </span>
              <div className="text-4xl font-extrabold text-slate-900 mt-3 tracking-tight">
                Good
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200/60 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <div className="mt-4 flex items-center space-x-1.5 text-xs font-bold text-emerald-600">
            <span>↗</span>
            <span>No critical gaps</span>
          </div>
        </div>
      </div>

      {/* Cycle Progress Widget */}
      <div className="bg-[#0B132B] rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-widest text-amber-400">FAIR ROTATION CYCLE #{sprCycle.id}</span>
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-emerald-500/30">
              {sprCycle.status}
            </span>
          </div>
          <h3 className="text-lg font-bold">Cycle Pool Status</h3>
          <p className="text-xs text-slate-400">
            {sprCycle.usedSprCount} of {sprCycle.totalSprsInPool} active SPRs assigned duty in this cycle.
          </p>
        </div>

        <div className="w-full md:w-64 space-y-2">
          <div className="flex justify-between text-xs font-bold">
            <span className="text-slate-400">Cycle Progress</span>
            <span className="text-amber-400">{Math.round((sprCycle.usedSprCount / sprCycle.totalSprsInPool) * 100)}%</span>
          </div>
          <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-500"
              style={{ width: `${(sprCycle.usedSprCount / sprCycle.totalSprsInPool) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* DUTY BOARD matching screenshot 1 */}
      <div className="space-y-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
            DUTY BOARD
          </div>
          <h3 className="text-xl font-bold text-slate-900 tracking-tight">
            Coverage by round
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {rounds.map((round) => {
            const assignedSprsList = sprs.filter((s) => round.assignedSprIds.includes(s.id));
            const isLive = round.status === 'IN_PROGRESS';
            const isCompleted = round.status === 'COMPLETED';

            return (
              <div
                key={round.id}
                className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all space-y-5"
              >
                <div>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-lg font-extrabold text-slate-900 leading-tight">
                        {round.companyName}
                      </h4>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {round.name} · {round.date}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full border ${
                        isLive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isCompleted
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200/80'
                      }`}
                    >
                      • {isLive ? 'Live' : isCompleted ? 'Completed' : 'Upcoming'}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 mt-4">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{round.startTime} – {round.endTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="truncate">{round.venue}</span>
                    </div>
                  </div>
                </div>

                {/* Assigned SPRs Avatars */}
                <div className="border-t border-slate-100 pt-4">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Assigned SPRs ({assignedSprsList.length})
                  </div>

                  {assignedSprsList.length > 0 ? (
                    <div className="flex items-center space-x-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {assignedSprsList.map((spr) => (
                          <div
                            key={spr.id}
                            title={`${spr.name} (${spr.branch})`}
                            className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-[#0B132B] text-amber-400 text-xs font-bold flex items-center justify-center"
                          >
                            {spr.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                        ))}
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        {assignedSprsList.map((s) => s.name.split(' ')[0]).join(', ')}
                      </span>
                    </div>
                  ) : (
                    <div className="text-xs text-amber-600 font-semibold bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200/60 inline-block">
                      ⚠ Needs SPR Coverage
                    </div>
                  )}
                </div>

                {/* Allocate Button */}
                <button
                  onClick={() => handleTestAllocation(round.id)}
                  className="w-full inline-flex items-center justify-center space-x-2 bg-slate-50 hover:bg-slate-100 text-slate-900 text-xs font-bold py-2.5 rounded-xl border border-slate-200 transition-colors"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-500" />
                  <span>Auto-allocate SPRs</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* REGISTERED SPR POOL & DUTY DETAILS SECTION (Requirement #2) */}
      <div className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
              REGISTERED SPR ROSTER ({sprs.length})
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              Active SPR Pool & Company Duty History
            </h3>
          </div>
          <button
            onClick={() => setShowAddSprModal(true)}
            className="inline-flex items-center space-x-2 bg-amber-50 text-amber-900 border border-amber-200 text-xs font-bold px-3.5 py-2 rounded-xl hover:bg-amber-100 transition-all cursor-pointer"
          >
            <UserPlus className="w-3.5 h-3.5 text-amber-600" />
            <span>Add New SPR</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sprs.map((spr) => {
            const sprDuties = dutyAssignments.filter(
              (d) => d.sprId === spr.id || d.sprName.toLowerCase() === spr.name.toLowerCase()
            );

            return (
              <div
                key={spr.id}
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between hover:border-slate-200 transition-all space-y-4"
              >
                <div>
                  {/* Top Avatar & Name Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-11 h-11 rounded-2xl bg-[#0B132B] text-amber-400 flex items-center justify-center font-bold text-sm shadow-xs">
                        {spr.name.split(' ').map((n) => n[0]).join('')}
                      </div>
                      <div>
                        <div className="font-extrabold text-slate-900 text-sm">{spr.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono font-semibold">
                          SAP: {spr.sapId} · {spr.branch}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => deleteSpr(spr.id)}
                      className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title="Remove SPR"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Status Pills */}
                  <div className="flex items-center space-x-2 mt-3">
                    <span className="text-[10px] bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full">
                      Total Duties: {spr.totalDuties}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                        spr.usedInCurrentCycle
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      }`}
                    >
                      {spr.usedInCurrentCycle ? '• Active in Cycle' : '• Available'}
                    </span>
                  </div>

                  {/* Requirement #2: Detailed Duty Allocations showing which company they did duty in */}
                  <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                    <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 flex items-center justify-between">
                      <span>Assigned Company Duties ({sprDuties.length})</span>
                      <Building2 className="w-3 h-3 text-slate-400" />
                    </div>

                    {sprDuties.length > 0 ? (
                      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                        {sprDuties.map((duty) => (
                          <div
                            key={duty.id}
                            className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/60 space-y-1 text-xs"
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
                              {duty.roundName} · <span className="text-slate-500">{duty.role}</span>
                            </div>

                            <div className="flex items-center justify-between text-[10px] text-slate-400 pt-0.5">
                              <span>📍 {duty.venue}</span>
                              <span>🕒 {duty.timeWindow}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 font-semibold bg-slate-50 p-3 rounded-xl border border-slate-100 text-center italic">
                        No duty assigned in current cycle. Available for next round allocation.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* COMPREHENSIVE DUTY LOG & ALLOCATION SHEET BOARD */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
              DUTY ALLOCATION BOARD
            </div>
            <h3 className="text-xl font-bold text-slate-900 tracking-tight">
              All Active SPR Duties Across Companies
            </h3>
          </div>
          <span className="bg-slate-100 text-slate-700 text-xs font-extrabold px-3 py-1 rounded-full">
            {dutyAssignments.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="pb-3">SPR NAME</th>
                <th className="pb-3">COMPANY</th>
                <th className="pb-3">ROUND PROCESS</th>
                <th className="pb-3">VENUE</th>
                <th className="pb-3">TIME WINDOW</th>
                <th className="pb-3">ROLE</th>
                <th className="pb-3">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dutyAssignments.map((assignment) => (
                <tr key={assignment.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 font-extrabold text-slate-900">{assignment.sprName}</td>
                  <td className="py-3.5 font-bold text-amber-900">{assignment.companyName}</td>
                  <td className="py-3.5 text-slate-700 font-semibold">{assignment.roundName}</td>
                  <td className="py-3.5 text-slate-600 font-medium">{assignment.venue}</td>
                  <td className="py-3.5 font-mono text-slate-500">{assignment.timeWindow}</td>
                  <td className="py-3.5 text-slate-600 font-medium">{assignment.role}</td>
                  <td className="py-3.5">
                    <span
                      className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full ${
                        assignment.status === 'ACCEPTED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : assignment.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-600 border border-slate-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      • {assignment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

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

      {/* Allocation Debug Audit Modal */}
      {showDebugModal && allocationDebug && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-extrabold text-slate-900">Fair Cycle Allocation Engine Log</h3>
              </div>
              <button
                onClick={() => setShowDebugModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Evaluating SPR pool against fairness rules: Cycle pool exclusion, availability calendar, and schedule conflicts.
            </p>

            <div className="space-y-2 max-h-80 overflow-y-auto pr-2">
              {allocationDebug.map((item, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-2xl text-xs border ${
                    item.status === 'QUALIFIED'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                      : 'bg-slate-50 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span>{item.sprName}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] ${
                        item.status === 'QUALIFIED'
                          ? 'bg-emerald-200 text-emerald-800'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {item.status}
                    </span>
                  </div>
                  <div className="mt-1 text-[11px] opacity-80">{item.reason}</div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setShowDebugModal(false)}
                className="bg-[#0B132B] text-white text-xs font-bold px-5 py-2.5 rounded-xl"
              >
                Close Engine Trace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
