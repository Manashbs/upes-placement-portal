import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { GraduationCap, QrCode, CheckCircle2, AlertTriangle, Sparkles, Building2, Calendar, MapPin, Award } from 'lucide-react';
import confetti from 'canvas-confetti';
import { validateQRToken } from '../../utils/qrUtils';

export const StudentPortalView: React.FC = () => {
  const { students, drives, rounds, roundStudents, offers, markAttendance, acceptOffer } = usePortal();
  const currentStudent = students.find((s) => s.sapId === '59001234') || students[0];

  const [qrInput, setQrInput] = useState('');
  const [scanResult, setScanResult] = useState<{ success: boolean; message: string } | null>(null);

  // Shortlisted rounds for student
  const studentRoundStudentRecords = roundStudents.filter((rs) => rs.sapId === currentStudent.sapId);

  const studentOffers = offers.filter((o) => o.studentId === currentStudent.id || o.sapId === currentStudent.sapId);

  const handleSimulatedScan = (roundId: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;

    const tokenValidation = validateQRToken(round.qrToken);
    if (!tokenValidation.valid) {
      setScanResult({ success: false, message: tokenValidation.message });
      return;
    }

    const result = markAttendance(roundId, currentStudent.sapId, 'STUDENT_PORTAL_APP');
    setScanResult(result);

    if (result.success) {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.7 } });
    }
  };

  const handleAcceptOfferClick = (offerId: string) => {
    acceptOffer(offerId);
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Student Passport Card */}
      <div className="bg-[#0B132B] rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-amber-500 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            {currentStudent.name.split(' ').map((n) => n[0]).join('')}
          </div>
          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-amber-400 uppercase tracking-widest">PLACEMENT PASSPORT</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/30">
                • {currentStudent.status}
              </span>
            </div>
            <h2 className="text-2xl font-extrabold">{currentStudent.name}</h2>
            <p className="text-xs text-slate-300">
              SAP ID: {currentStudent.sapId} · {currentStudent.branch} (Batch {currentStudent.batchYear})
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-6 border-t md:border-t-0 md:border-l border-slate-800 pt-4 md:pt-0 md:pl-8 text-center">
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">CGPA</span>
            <div className="text-2xl font-extrabold text-white mt-0.5">{currentStudent.cgpa}</div>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 font-bold uppercase">Backlogs</span>
            <div className="text-2xl font-extrabold text-emerald-400 mt-0.5">{currentStudent.activeBacklogs}</div>
          </div>
        </div>
      </div>

      {/* Offers & Tier Locks Desk */}
      {studentOffers.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-3xl p-6 text-slate-950 shadow-xl space-y-4">
          <div className="flex items-center space-x-3">
            <Award className="w-6 h-6 text-slate-950" />
            <h3 className="text-xl font-extrabold tracking-tight">Congratulations! Job Offer Issued</h3>
          </div>

          {studentOffers.map((off) => (
            <div key={off.id} className="bg-white/95 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
              <div>
                <div className="text-sm font-extrabold text-slate-900">{off.companyName}</div>
                <div className="text-xs text-slate-600 font-medium">
                  {off.offerType} · CTC: <strong>{off.ctc} LPA</strong> ({off.tier} Tier)
                </div>
              </div>

              {off.status === 'PENDING' ? (
                <button
                  onClick={() => handleAcceptOfferClick(off.id)}
                  className="bg-[#0B132B] hover:bg-slate-800 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                >
                  Accept Offer & Lock Passport
                </button>
              ) : (
                <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-4 py-2 rounded-xl border border-emerald-300">
                  ✓ Offer Accepted (Tier Locked)
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Shortlisted Rounds & QR Scanner Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Shortlisted Rounds Schedule */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <h3 className="text-lg font-extrabold text-slate-900">My Shortlisted Rounds</h3>

          <div className="space-y-3">
            {studentRoundStudentRecords.map((rs) => {
              const round = rounds.find((r) => r.id === rs.roundId);
              if (!round) return null;

              const isMarked = rs.attendanceStatus === 'PRESENT' || rs.attendanceStatus === 'MANUALLY_MARKED';

              return (
                <div key={rs.roundId} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-extrabold text-slate-900 text-sm">{round.companyName}</h4>
                      <p className="text-xs text-slate-500 font-medium">{round.name}</p>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                        isMarked
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {isMarked ? '✓ Attended' : 'Pending Scan'}
                    </span>
                  </div>

                  <div className="text-xs text-slate-600 space-y-1">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{round.date} · {round.startTime} - {round.endTime}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{round.venue}</span>
                    </div>
                  </div>

                  {!isMarked && (
                    <button
                      onClick={() => handleSimulatedScan(round.id)}
                      className="w-full bg-[#0B132B] hover:bg-slate-800 text-white font-bold text-xs py-2 rounded-xl transition-all cursor-pointer inline-flex items-center justify-center space-x-2"
                    >
                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                      <span>Scan Round QR & Verify</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Scan Receipt Feedback */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900">Scan Receipt Verification</h3>
            <p className="text-xs text-slate-500">
              When at the venue, scan the round QR displayed on screen to mark your attendance automatically.
            </p>

            {scanResult ? (
              <div
                className={`p-5 rounded-2xl border space-y-2 ${
                  scanResult.success
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center space-x-2 font-bold text-sm">
                  {scanResult.success ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-rose-600" />
                  )}
                  <span>{scanResult.success ? 'Attendance Verified!' : 'Verification Failed'}</span>
                </div>
                <p className="text-xs">{scanResult.message}</p>
              </div>
            ) : (
              <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400">
                Ready to scan round QR code.
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 border-t border-slate-100 pt-3">
            🔒 Backend security pipeline validates student registration, shortlist status, round window, and idempotency automatically.
          </div>
        </div>
      </div>
    </div>
  );
};
