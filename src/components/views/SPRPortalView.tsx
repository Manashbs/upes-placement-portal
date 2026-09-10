import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { UserCheck, CheckCircle2, RotateCw, Calendar, MapPin, Clock, ArrowLeftRight } from 'lucide-react';

export const SPRPortalView: React.FC = () => {
  const { dutyAssignments, acceptDuty, markAttendance, rounds } = usePortal();
  const [candidateSapInput, setCandidateSapInput] = useState('');
  const [selectedRoundId, setSelectedRoundId] = useState(rounds[1]?.id || rounds[0]?.id || '');
  const [verifyResult, setVerifyResult] = useState<{ success: boolean; message: string } | null>(null);

  const handleVerifyCandidate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateSapInput) return;

    const res = markAttendance(selectedRoundId, candidateSapInput.trim(), 'SPR_MANUAL_VERIFIER');
    setVerifyResult(res);
    setCandidateSapInput('');
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* SPR Welcome Banner matching screenshot 7 concept */}
      <div className="bg-[#0B132B] rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="space-y-2">
          <div className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            SPR DESK — Welcome, Tanya Kapoor
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">Student Placement Representative</h2>
          <p className="text-sm text-slate-300">
            Manage your assigned round duties, verify candidate attendance at venues, and maintain coverage health.
          </p>
        </div>

        <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8 text-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Total Duties</span>
            <div className="text-2xl font-extrabold text-white mt-0.5">7</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Current Cycle</span>
            <div className="text-2xl font-extrabold text-amber-400 mt-0.5">7/60</div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Upcoming Duties */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">Upcoming Duties</h3>

          <div className="space-y-4">
            {dutyAssignments.map((duty) => (
              <div key={duty.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h4 className="font-extrabold text-slate-900 text-base">{duty.companyName}</h4>
                    <p className="text-xs font-semibold text-slate-500">{duty.roundName}</p>
                  </div>

                  <span
                    className={`text-[10px] font-extrabold px-3 py-1 rounded-full border ${
                      duty.status === 'COMPLETED'
                        ? 'bg-slate-200 text-slate-700 border-slate-300'
                        : 'bg-amber-50 text-amber-800 border-amber-200'
                    }`}
                  >
                    {duty.status === 'COMPLETED' ? 'COMPLETED' : 'DUTY ASSIGNED'}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{duty.date} · {duty.timeWindow}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    <span>{duty.venue}</span>
                  </div>
                </div>

                <div className="flex items-center space-x-3 pt-2">
                  <span className="text-xs font-extrabold text-amber-900 bg-amber-50 px-3.5 py-2 rounded-xl border border-amber-200 flex items-center space-x-1.5">
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                    <span>Mandatory Duty (Assigned by System Cycle)</span>
                  </span>

                  <button
                    onClick={() => alert('Swap request submitted to PO for approval.')}
                    className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 font-bold text-xs px-4 py-2 rounded-xl cursor-pointer"
                  >
                    Request Swap
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Candidate SAP ID QR Verification Tool */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">Candidate Attendance Verifier</h3>
          <p className="text-xs text-slate-500">
            Enter candidate SAP ID directly to verify attendance at the venue entrance.
          </p>

          <form onSubmit={handleVerifyCandidate} className="space-y-3">
            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1">Target Round</label>
              <select
                value={selectedRoundId}
                onChange={(e) => setSelectedRoundId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold"
              >
                {rounds.map((r) => (
                  <option key={r.id} value={r.id}>{r.companyName} - {r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-xs text-slate-700 block mb-1">Candidate SAP ID</label>
              <input
                type="text"
                placeholder="e.g. 59001234"
                value={candidateSapInput}
                onChange={(e) => setCandidateSapInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold font-mono outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs py-3 rounded-xl shadow-md transition-all cursor-pointer"
            >
              Verify Candidate & Mark Attendance
            </button>
          </form>

          {verifyResult && (
            <div
              className={`p-4 rounded-2xl border text-xs space-y-1 ${
                verifyResult.success
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="font-bold">{verifyResult.success ? '✓ SUCCESS' : '✕ VERIFICATION FAILED'}</div>
              <div>{verifyResult.message}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
