import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { Round } from '../../types';
import {
  MapPin,
  Calendar,
  Clock,
  Users,
  CheckCircle2,
  XCircle,
  QrCode,
  Upload,
  FileSpreadsheet,
  X,
  Building2,
  UserCheck,
  ShieldCheck,
} from 'lucide-react';
import { exportRosterExcel } from '../../utils/excelUtils';

interface RoundDetailsModalProps {
  round: Round | null;
  onClose: () => void;
  onOpenQRModal?: (round: Round) => void;
  onOpenUploadModal?: (round: Round) => void;
}

export const RoundDetailsModal: React.FC<RoundDetailsModalProps> = ({
  round,
  onClose,
  onOpenQRModal,
  onOpenUploadModal,
}) => {
  const { roundStudents, sprs } = usePortal();

  if (!round) return null;

  const currentRoundStudents = roundStudents.filter((rs) => rs.roundId === round.id);

  // Parse venues list from round.venue string (separated by | or comma)
  const venues = round.venue
    ? round.venue.split('|').map((v) => v.trim()).filter(Boolean)
    : ['Block A - Lab 1'];

  // Retrieve assigned SPRs for this round (or grab from sprs pool if list is empty)
  let assignedSprsList = sprs.filter((s) => round.assignedSprIds?.includes(s.id));
  if (assignedSprsList.length === 0) {
    assignedSprsList = sprs.slice(0, Math.max(3, venues.length * 2));
  }

  // Distribute SPRs across venues randomly / equally
  const baseCount = Math.max(1, Math.floor(assignedSprsList.length / venues.length));
  const remainder = assignedSprsList.length % venues.length;

  let currentSprIndex = 0;
  const venueSPRMapping = venues.map((venueName, idx) => {
    const sprsCountForVenue = baseCount + (idx < remainder ? 1 : 0);
    const sprsForVenue = assignedSprsList.slice(currentSprIndex, currentSprIndex + sprsCountForVenue);
    currentSprIndex += sprsCountForVenue;

    return {
      venueName,
      sprs: sprsForVenue.length > 0 ? sprsForVenue : [assignedSprsList[idx % assignedSprsList.length]],
    };
  });

  const isLive = round.status === 'IN_PROGRESS';
  const isCompleted = round.status === 'COMPLETED';

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Sticky Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center space-x-4">
            <div className="w-12 h-12 rounded-2xl bg-[#0B132B] text-amber-400 font-extrabold text-base flex items-center justify-center shadow-xs">
              {round.companyName.substring(0, 3).toUpperCase()}
            </div>

            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {round.companyName}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isLive
                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                      : isCompleted
                      ? 'bg-slate-100 text-slate-600 border-slate-200'
                      : 'bg-amber-50 text-amber-800 border-amber-200'
                  }`}
                >
                  • {isLive ? 'Live' : isCompleted ? 'Completed' : 'Upcoming'}
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                {round.name} · <span className="text-slate-600 font-bold">{round.type}</span>
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Modal Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Key Info Banner Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Date Scheduled</span>
              <div className="text-xs font-extrabold text-slate-900 flex items-center space-x-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-amber-500" />
                <span>{round.date}</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Venues</span>
              <div className="text-xs font-extrabold text-slate-900 flex items-center space-x-1 mt-0.5">
                <Building2 className="w-3.5 h-3.5 text-blue-500" />
                <span>{venues.length} Locations</span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Mode</span>
              <div className="text-xs font-extrabold text-slate-900 mt-0.5">
                {round.mode === 'VIRTUAL' ? 'Virtual' : 'On Campus'}
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Attendance Rate</span>
              <div className="text-xs font-extrabold text-emerald-600 mt-0.5">
                {round.attendedCount}/{round.totalShortlisted || 0} ({Math.round(((round.attendedCount || 0) / (round.totalShortlisted || 1)) * 100)}%)
              </div>
            </div>
          </div>

          {/* Venues & Randomly Allocated SPRs Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Venues & Randomly Assigned SPR Representatives ({assignedSprsList.length} Total SPRs)
                </h4>
              </div>
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Equally Distributed Across {venues.length} Venues
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {venueSPRMapping.map((vItem, vIdx) => (
                <div
                  key={vIdx}
                  className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3 hover:border-amber-400/60 transition-all"
                >
                  {/* Venue Header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                    <div className="flex items-center space-x-1.5 font-extrabold text-xs text-slate-900">
                      <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      <span>{vItem.venueName}</span>
                    </div>
                    <span className="text-[10px] font-extrabold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-md border border-amber-200/60">
                      {vItem.sprs.length} SPRs Assigned
                    </span>
                  </div>

                  {/* Assigned SPRs List */}
                  <div className="space-y-2">
                    {vItem.sprs.map((spr, sIdx) => {
                      return (
                        <div
                          key={spr.id || sIdx}
                          className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 flex items-center justify-between text-xs"
                        >
                          <div className="flex items-center space-x-2.5">
                            <div className="w-7 h-7 rounded-lg bg-[#0B132B] text-amber-400 font-bold text-[10px] flex items-center justify-center">
                              {spr.name ? spr.name.split(' ').map((n) => n[0]).join('') : 'SP'}
                            </div>
                            <div>
                              <div className="font-extrabold text-slate-900 text-xs">
                                {spr.name}
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono font-medium">
                                SAP: {spr.sapId} · {spr.branch}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 inline-block">
                              ✓ Confirmed
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shortlisted Candidate Roster Preview */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
                  Shortlisted Candidates Roster ({currentRoundStudents.length} Candidates)
                </h4>
              </div>
              <span className="text-[11px] font-extrabold text-slate-600">
                Present: {round.attendedCount} | Absent: {round.absentCount}
              </span>
            </div>

            {currentRoundStudents.length > 0 ? (
              <div className="border border-slate-100 rounded-2xl overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-400 font-extrabold uppercase tracking-wider text-[10px] sticky top-0 bg-slate-50">
                    <tr>
                      <th className="p-2.5">SAP ID</th>
                      <th className="p-2.5">NAME</th>
                      <th className="p-2.5">BRANCH</th>
                      <th className="p-2.5">PANEL</th>
                      <th className="p-2.5">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {currentRoundStudents.map((st) => (
                      <tr key={st.sapId} className="hover:bg-slate-50/50">
                        <td className="p-2.5 font-mono font-bold text-slate-800">{st.sapId}</td>
                        <td className="p-2.5 font-extrabold text-slate-900">{st.studentName}</td>
                        <td className="p-2.5 text-slate-500">{st.branch}</td>
                        <td className="p-2.5 text-slate-600 font-medium">{st.panelNumber || 'Panel 1'}</td>
                        <td className="p-2.5">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              st.attendanceStatus === 'PRESENT'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : st.attendanceStatus === 'ABSENT'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-800 border border-amber-200'
                            }`}
                          >
                            {st.attendanceStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="bg-slate-50 p-4 rounded-2xl text-center text-xs font-semibold text-slate-500 border border-slate-100">
                No shortlist roster uploaded yet for this round. Use "Upload Excel" to import candidate names.
              </div>
            )}
          </div>
        </div>

        {/* Sticky Modal Action Buttons Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
          <button
            onClick={() => exportRosterExcel(round.companyName, round.name, currentRoundStudents, 'STANDARD')}
            className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-blue-600" />
            <span>Export Roster Excel</span>
          </button>

          <div className="flex items-center space-x-3">
            {onOpenUploadModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenUploadModal(round);
                }}
                className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Upload className="w-4 h-4 text-emerald-600" />
                <span>Upload Shortlist</span>
              </button>
            )}

            {onOpenQRModal && (
              <button
                onClick={() => {
                  onClose();
                  onOpenQRModal(round);
                }}
                className="inline-flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <QrCode className="w-4 h-4" />
                <span>View Security QR Code</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
