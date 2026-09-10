import React, { useState, useEffect } from 'react';
import { usePortal } from '../../context/PortalContext';
import { QrCode, CheckCircle2, AlertCircle, Building2, Calendar, MapPin, User, Sparkles, ShieldCheck } from 'lucide-react';
import confetti from 'canvas-confetti';

interface CandidateMobileScanViewProps {
  roundIdParam?: string;
  sapIdParam?: string;
}

export const CandidateMobileScanView: React.FC<CandidateMobileScanViewProps> = ({
  roundIdParam,
  sapIdParam,
}) => {
  const { rounds, students, roundStudents, markAttendance } = usePortal();

  // Parse URL search parameters if not explicitly provided as props
  const [roundId, setRoundId] = useState<string>(roundIdParam || '');
  const [sapId, setSapId] = useState<string>(sapIdParam || '');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const rId = urlParams.get('roundId') || urlParams.get('round');
      const sId = urlParams.get('sapId') || urlParams.get('sap');
      if (rId) setRoundId(rId);
      if (sId) setSapId(sId);
    }
  }, []);

  const targetRound = rounds.find((r) => r.id === roundId) || rounds[0];
  const candidateStudent = students.find((s) => s.sapId === sapId) || {
    id: 'st-temp',
    sapId: sapId || '59001234',
    name: 'Shortlisted Student Candidate',
    email: 'candidate@upes.ac.in',
    branch: 'B.Tech CSE',
  };

  const existingRecord = roundStudents.find(
    (rs) => rs.roundId === (targetRound?.id || roundId) && rs.sapId === (candidateStudent.sapId)
  );

  const isAlreadyPresent = existingRecord?.attendanceStatus === 'PRESENT' || existingRecord?.attendanceStatus === 'MANUALLY_MARKED';

  const handleScanRoundQR = () => {
    if (!targetRound) return;

    const result = markAttendance(targetRound.id, candidateStudent.sapId, 'MOBILE_CAMERA_QR_SCAN');
    setScanResult(result);

    if (result.success) {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    }
  };

  const handleManualTokenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetRound) return;

    const result = markAttendance(targetRound.id, candidateStudent.sapId, 'MOBILE_QR_TOKEN_SUBMIT');
    setScanResult(result);

    if (result.success) {
      confetti({ particleCount: 80, spread: 80, origin: { y: 0.6 } });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4 flex flex-col justify-between max-w-md mx-auto font-sans select-none">
      {/* Header */}
      <div className="pt-4 pb-2 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center text-sm shadow-md">
            UP
          </div>
          <div>
            <h1 className="text-base font-extrabold text-white tracking-tight">UPES Placement Cell</h1>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider">Candidate Mobile Scanner Desk</p>
          </div>
        </div>

        <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-500/30">
          ● System Live
        </span>
      </div>

      {/* Main Content Body */}
      <div className="my-auto py-6 space-y-5">
        {/* Candidate Info Card */}
        <div className="bg-slate-900 rounded-3xl p-5 border border-slate-800 shadow-xl space-y-3">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-[#0B132B] border border-amber-400/40 text-amber-400 flex items-center justify-center font-extrabold text-sm">
                {candidateStudent.name.split(' ').map((n) => n[0]).join('')}
              </div>
              <div>
                <h3 className="font-extrabold text-white text-sm">{candidateStudent.name}</h3>
                <p className="text-xs text-slate-400 font-mono font-medium">SAP: {candidateStudent.sapId}</p>
              </div>
            </div>

            <span
              className={`text-[10px] font-extrabold px-2.5 py-1 rounded-full border ${
                isAlreadyPresent
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {isAlreadyPresent ? '✓ PRESENT' : 'PENDING'}
            </span>
          </div>

          {/* Drive & Round Detail */}
          {targetRound && (
            <div className="space-y-1.5 text-xs text-slate-300 pt-1">
              <div className="flex items-center space-x-2 font-bold text-amber-400">
                <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span>{targetRound.companyName} — {targetRound.name}</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Date: {targetRound.date} ({targetRound.startTime} - {targetRound.endTime})</span>
              </div>
              <div className="flex items-center space-x-2 text-slate-400">
                <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span>Venue: {targetRound.venue}</span>
              </div>
            </div>
          )}
        </div>

        {/* Camera QR Scanner Simulation */}
        <div className="bg-slate-900 rounded-3xl p-6 border border-slate-800 shadow-2xl text-center space-y-4 relative overflow-hidden">
          <div className="w-44 h-44 mx-auto rounded-3xl border-2 border-dashed border-amber-400 flex flex-col items-center justify-center relative bg-slate-950/60 p-4">
            <div className="absolute inset-0 bg-amber-400/10 animate-pulse rounded-3xl" />
            <QrCode className="w-20 h-20 text-amber-400 mb-2 opacity-90" />
            <p className="text-[10px] text-amber-300 font-extrabold uppercase tracking-widest relative z-10">Scan Process QR Code</p>
          </div>

          <div className="space-y-1">
            <h4 className="text-sm font-extrabold text-white">Point Camera at Round Security QR</h4>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Scan the Security QR Code displayed at your process venue or monitor screen to mark attendance.
            </p>
          </div>

          <button
            onClick={handleScanRoundQR}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-600 hover:to-amber-500 text-slate-950 font-extrabold text-sm py-3.5 rounded-2xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            ⚡ Scan Round QR Code & Mark Attendance
          </button>
        </div>

        {/* Scan Result Feedback Banner */}
        {scanResult && (
          <div
            className={`p-4 rounded-2xl border text-xs space-y-1 ${
              scanResult.success
                ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200'
                : 'bg-rose-500/20 border-rose-500/40 text-rose-200'
            }`}
          >
            <div className="flex items-center space-x-2 font-bold text-sm">
              {scanResult.success ? <CheckCircle2 className="w-5 h-5 text-emerald-400" /> : <AlertCircle className="w-5 h-5 text-rose-400" />}
              <span>{scanResult.success ? 'Attendance Marked Present!' : 'Scan Verification Failed'}</span>
            </div>
            <p className="text-xs opacity-90">{scanResult.message}</p>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="py-3 border-t border-slate-800 text-center text-[10px] text-slate-500 font-mono">
        UPES Placement Cell Security System · Dynamic QR Scanner
      </div>
    </div>
  );
};
