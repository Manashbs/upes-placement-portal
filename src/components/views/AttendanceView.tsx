import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { UserCheck, QrCode, Search, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Upload, Link, Copy, FileSpreadsheet } from 'lucide-react';
import { RoundQRControlModal } from '../modals/RoundQRControlModal';
import { ExcelUploadModal } from '../modals/ExcelUploadModal';
import { QRScannerModal } from '../modals/QRScannerModal';
import { Round, Student } from '../../types';
import { exportRosterExcel } from '../../utils/excelUtils';

export const AttendanceView: React.FC = () => {
  const { rounds, roundStudents, manualAttendanceOverride, createRound } = usePortal();
  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[1]?.id || rounds[0]?.id || '');
  const [panelFilter, setPanelFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [showQRModal, setShowQRModal] = useState<Round | null>(null);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showQRScanner, setShowQRScanner] = useState(false);
  const [copiedLinkId, setCopiedLinkId] = useState<string | null>(null);

  // Override modal state
  const [overrideTarget, setOverrideTarget] = useState<{ sapId: string; name: string } | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideStatus, setOverrideStatus] = useState<'PRESENT' | 'ABSENT'>('PRESENT');

  const selectedRound = rounds.find((r) => r.id === selectedRoundId);
  const currentRoundStudents = roundStudents.filter((rs) => rs.roundId === selectedRoundId);

  const filteredStudents = currentRoundStudents.filter((st) => {
    const matchesSearch =
      st.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      st.sapId.includes(searchTerm);

    if (panelFilter === 'ALL') return matchesSearch;
    return matchesSearch && st.panelNumber?.includes(panelFilter);
  });

  const presentCount = currentRoundStudents.filter(
    (s) => s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'MANUALLY_MARKED'
  ).length;

  const handleApplyOverride = () => {
    if (!overrideTarget || !overrideReason) return;
    manualAttendanceOverride(selectedRoundId, overrideTarget.sapId, overrideStatus, overrideReason);
    setOverrideTarget(null);
    setOverrideReason('');
  };

  const handleCopyRosterLink = (studentSapId: string) => {
    const rosterUrl = `${window.location.origin}/#roster-${selectedRoundId}-${studentSapId}`;
    navigator.clipboard.writeText(rosterUrl);
    setCopiedLinkId(studentSapId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            REAL-TIME MONITOR
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Live Attendance & Shortlist Roster
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-3xl">
            Upload shortlisted students, generate candidate roster links, and verify attendance via dynamic QR codes.
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Upload Shortlist Button */}
          <button
            onClick={() => setShowExcelUpload(true)}
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Upload className="w-4 h-4" />
            <span>Upload Shortlist Excel</span>
          </button>

          {/* Scan QR Code Button */}
          <button
            onClick={() => setShowQRScanner(true)}
            className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-amber-400" />
            <span>Scan QR Code</span>
          </button>

          {selectedRound && (
            <button
              onClick={() => setShowQRModal(selectedRound)}
              className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <span>QR Display Desk</span>
            </button>
          )}
        </div>
      </div>

      {/* Select Round Selector Pill Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center space-x-3 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2">Active Round:</span>
        {rounds.map((r) => {
          const isSelected = r.id === selectedRoundId;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRoundId(r.id)}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#0B132B] text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {r.companyName} · {r.name}
            </button>
          );
        })}
      </div>

      {/* Live Attendance Stats */}
      {selectedRound && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Attendance Rate</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {Math.round((presentCount / (currentRoundStudents.length || 1)) * 100)}%
              </div>
              <p className="text-xs text-slate-500 mt-1">{presentCount} of {currentRoundStudents.length} present</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <CheckCircle2 className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Pending Candidates</span>
              <div className="text-3xl font-extrabold text-slate-900 mt-1">
                {currentRoundStudents.length - presentCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">Waiting at venue / panel queue</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
              <Clock className="w-6 h-6" />
            </div>
          </div>

          <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">Security Check</span>
              <div className="text-3xl font-extrabold text-emerald-600 mt-1">Active</div>
              <p className="text-xs text-slate-500 mt-1">Geo-fence: {selectedRound.geoFenceEnabled ? '500m Enforced' : 'Off'}</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-bold">
              <ShieldCheck className="w-6 h-6 text-amber-400" />
            </div>
          </div>
        </div>
      )}

      {/* Search Bar & Export Buttons */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search candidate by name or SAP ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-50 text-xs rounded-xl pl-9 pr-4 py-2 border border-slate-200 outline-none"
            />
          </div>

          {/* Download Excel / CSV File Action Buttons */}
          {selectedRound && (
            <div className="flex items-center space-x-3">
              <button
                onClick={() => exportRosterExcel(selectedRound.companyName, selectedRound.name, currentRoundStudents, 'STANDARD', 'xlsx')}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Export Excel (.xlsx)</span>
              </button>

              <button
                onClick={() => exportRosterExcel(selectedRound.companyName, selectedRound.name, currentRoundStudents, 'STANDARD', 'csv')}
                className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-3.5 py-2 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Export CSV (.csv)</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Attendance Student List */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase">
              <tr>
                <th className="p-3">Candidate Details</th>
                <th className="p-3">SAP ID</th>
                <th className="p-3">Branch</th>
                <th className="p-3">Attendance Status</th>
                <th className="p-3">Roster Link</th>
                <th className="p-3 text-right">Manual Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStudents.map((st) => {
                const isPresent = st.attendanceStatus === 'PRESENT' || st.attendanceStatus === 'MANUALLY_MARKED';

                return (
                  <tr key={st.studentId} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3">
                      <div className="font-extrabold text-slate-900">{st.studentName}</div>
                      <div className="text-[11px] text-slate-400">{st.email}</div>
                    </td>

                    <td className="p-3 font-mono font-bold text-slate-700">{st.sapId}</td>

                    <td className="p-3 text-slate-600">{st.branch}</td>

                    <td className="p-3">
                      <span
                        className={`px-3 py-1 rounded-full font-bold text-[10px] inline-flex items-center space-x-1 ${
                          isPresent
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        <span>• {st.attendanceStatus}</span>
                        {st.attendanceTime && (
                          <span className="text-[9px] opacity-75">({st.attendanceTime})</span>
                        )}
                      </span>
                    </td>

                    {/* Roster Link Column */}
                    <td className="p-3">
                      <button
                        onClick={() => handleCopyRosterLink(st.sapId)}
                        className="inline-flex items-center space-x-1 text-[11px] font-bold text-slate-600 hover:text-amber-600 bg-slate-100 hover:bg-amber-50 px-2.5 py-1 rounded-lg border border-slate-200 transition-colors cursor-pointer"
                      >
                        {copiedLinkId === st.sapId ? (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Link className="w-3.5 h-3.5 text-slate-500" />
                            <span>Copy Link</span>
                          </>
                        )}
                      </button>
                    </td>

                    <td className="p-3 text-right">
                      <button
                        onClick={() => setOverrideTarget({ sapId: st.sapId, name: st.studentName })}
                        className="text-xs font-bold text-amber-600 hover:text-amber-800 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200 cursor-pointer"
                      >
                        Manual Override
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Override Reason Dialog */}
      {overrideTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">
                Manual Attendance Override
              </h3>
              <button onClick={() => setOverrideTarget(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Manually marking attendance for <strong className="text-slate-900">{overrideTarget.name} ({overrideTarget.sapId})</strong>. This action will be logged in audit logs.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Status</label>
                <select
                  value={overrideStatus}
                  onChange={(e) => setOverrideStatus(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold"
                >
                  <option value="PRESENT">Mark PRESENT</option>
                  <option value="ABSENT">Mark ABSENT</option>
                </select>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Mandatory Reason / Note</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Student network connectivity issue at venue; verified SAP ID card physically."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button onClick={() => setOverrideTarget(null)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  onClick={handleApplyOverride}
                  className="px-5 py-2 bg-[#0B132B] text-white font-bold rounded-xl"
                >
                  Confirm Override
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Control Display Modal */}
      <RoundQRControlModal round={showQRModal} onClose={() => setShowQRModal(null)} />

      {/* Upload Shortlist Excel Modal */}
      <ExcelUploadModal
        isOpen={showExcelUpload}
        onClose={() => setShowExcelUpload(false)}
        onShortlistValidated={(validStudents: Student[]) => {
          if (selectedRound) {
            createRound(
              {
                id: selectedRound.id,
                companyName: selectedRound.companyName,
                name: selectedRound.name,
                type: selectedRound.type,
              },
              validStudents
            );
          }
          setShowExcelUpload(false);
        }}
      />

      {/* QR Code Scanner Tool Modal */}
      <QRScannerModal
        isOpen={showQRScanner}
        onClose={() => setShowQRScanner(false)}
        targetRoundId={selectedRoundId}
      />
    </div>
  );
};
