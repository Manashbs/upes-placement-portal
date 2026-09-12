import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { UserCheck, QrCode, Search, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Upload, Link, Copy, FileSpreadsheet, Download, Trash2, Maximize2, RefreshCw } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { RoundQRControlModal } from '../modals/RoundQRControlModal';
import { ExcelUploadModal } from '../modals/ExcelUploadModal';
import { QRScannerModal } from '../modals/QRScannerModal';
import { Round, RoundStudent, Student } from '../../types';
import { exportRosterExcel, exportAnnotatedAttendanceExcel, generateCandidateAttendanceLink, exportOriginalSheetWithAttendanceStatus } from '../../utils/excelUtils';

export const AttendanceView: React.FC = () => {
  const { rounds, roundStudents, students, manualAttendanceOverride, createRound, uploadShortlistForRound, deleteRound, getOriginalExcel, syncFromCloud } = usePortal();
  const [selectedRoundId, setSelectedRoundId] = useState<string>(rounds[1]?.id || rounds[0]?.id || '');
  const [panelFilter, setPanelFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
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
  const rawRoundStudents = roundStudents.filter((rs) => rs.roundId === selectedRoundId);
  const currentRoundStudents = Array.from(
    rawRoundStudents.reduce((map, item) => {
      const key = String(item.sapId).trim();
      const existing = map.get(key);
      if (!existing || item.attendanceStatus === 'PRESENT' || item.attendanceStatus === 'MANUALLY_MARKED') {
        map.set(key, item);
      }
      return map;
    }, new Map<string, RoundStudent>()).values()
  );

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
    const scanUrl = generateCandidateAttendanceLink(selectedRoundId, studentSapId);
    navigator.clipboard.writeText(scanUrl);
    setCopiedLinkId(studentSapId);
    setTimeout(() => setCopiedLinkId(null), 2000);
  };

  const handleDeleteRound = (roundId: string) => {
    const target = rounds.find((r) => r.id === roundId);
    const label = target ? `${target.companyName} · ${target.name}` : roundId;
    if (window.confirm(`Are you sure you want to delete round "${label}"? All associated attendance data will be permanently removed.`)) {
      deleteRound(roundId);
      const remaining = rounds.filter((r) => r.id !== roundId);
      if (remaining.length > 0) {
        setSelectedRoundId(remaining[0].id);
      } else {
        setSelectedRoundId('');
      }
    }
  };

  const handleDownloadInlineQR = () => {
    if (!selectedRound) return;
    const svgEl = document.getElementById(`inline-qr-${selectedRound.id}`);
    if (!svgEl) return;
    const svgData = new XMLSerializer().serializeToString(svgEl);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 40;
      if (ctx) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 20, 20);
        const pngUrl = canvas.toDataURL('image/png');
        const dl = document.createElement('a');
        dl.href = pngUrl;
        dl.download = `UPES_QR_${selectedRound.companyName}_${selectedRound.name}.png`;
        dl.click();
      }
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
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
        </div>
      </div>

      {/* Select Round Selector Pill Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex items-center space-x-3 overflow-x-auto">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider px-2 shrink-0">Active Round:</span>
        {rounds.map((r) => {
          const isSelected = r.id === selectedRoundId;
          return (
            <button
              key={r.id}
              onClick={() => setSelectedRoundId(r.id)}
              className={`inline-flex items-center space-x-1.5 px-4 py-2 rounded-2xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
                isSelected
                  ? 'bg-[#0B132B] text-white shadow-md'
                  : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              <QrCode className={`w-3 h-3 ${isSelected ? 'text-amber-400' : 'text-slate-400'}`} />
              <span>{r.companyName} · {r.name}</span>
            </button>
          );
        })}
      </div>

      {/* Requirement #3: Dedicated Per-Round Unique QR Control & Live Desk Banner */}
      {selectedRound && (
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-3 flex-1">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <span className="text-[10px] font-extrabold uppercase px-3 py-1 rounded-full bg-amber-50 text-amber-900 border border-amber-200">
                {selectedRound.type.replace('_', ' ')}
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {selectedRound.venue}
              </span>
              <span className="text-xs text-slate-400 font-bold">•</span>
              <span className="text-xs font-semibold text-slate-500">
                {selectedRound.date} ({selectedRound.startTime} - {selectedRound.endTime})
              </span>
            </div>

            <div>
              <h3 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                {selectedRound.companyName} · {selectedRound.name}
              </h3>
              <p className="text-xs font-medium text-slate-500 mt-1">
                Unique QR session for this specific round. Candidates scanning this QR will have their attendance marked in real-time.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2 flex-wrap gap-y-2">
              <button
                onClick={() => setShowQRModal(selectedRound)}
                className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Present Fullscreen QR Desk</span>
              </button>

              <button
                onClick={handleDownloadInlineQR}
                className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Download QR (PNG)</span>
              </button>

              {/* Requirement #1: Round should be deletable */}
              <button
                onClick={() => handleDeleteRound(selectedRound.id)}
                className="inline-flex items-center space-x-2 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-3.5 py-2.5 rounded-xl border border-rose-200 transition-all cursor-pointer"
                title="Delete this round and remove all its attendance records"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                <span>Delete Round</span>
              </button>
            </div>
          </div>

          {/* Unique QR Code Display Specifically for Selected Round */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-2 shrink-0">
            <div className="p-3 bg-white rounded-xl shadow-xs border border-slate-200/80">
              <QRCodeSVG
                id={`inline-qr-${selectedRound.id}`}
                value={selectedRound.qrToken}
                size={130}
                level="H"
                includeMargin={false}
              />
            </div>
            <div className="text-center">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500 block">
                Round QR Code
              </span>
              <span className="text-[9px] font-mono text-slate-400 block max-w-[140px] truncate">
                {selectedRound.qrToken.slice(0, 18)}...
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Live Attendance Stats Grid */}
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
              <p className="text-xs text-slate-500 mt-1">Single Process QR Enforced</p>
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
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              {/* Download Final Attendance Report — uses original company sheet with Attendance column appended */}
              <button
                onClick={() => {
                  const buffer = getOriginalExcel(selectedRound.id);
                  if (buffer) {
                    exportOriginalSheetWithAttendanceStatus(
                      buffer,
                      selectedRound.id,
                      selectedRound.companyName,
                      selectedRound.name,
                      roundStudents,
                      students
                    );
                  } else {
                    // Fallback: use the standard annotated export if no original buffer stored
                    exportAnnotatedAttendanceExcel(selectedRound.companyName, selectedRound.name, selectedRound.id, currentRoundStudents, 'xlsx');
                  }
                }}
                className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download Final Attendance Report</span>
              </button>

              <button
                onClick={async () => {
                  setIsSyncing(true);
                  await syncFromCloud();
                  setTimeout(() => setIsSyncing(false), 600);
                }}
                className="inline-flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Sync live scans from mobile phones immediately"
              >
                <RefreshCw className={`w-4 h-4 text-white ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing...' : 'Sync Live Scans'}</span>
              </button>

              <button
                onClick={() => exportAnnotatedAttendanceExcel(selectedRound.companyName, selectedRound.name, selectedRound.id, currentRoundStudents, 'xlsx')}
                className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4 text-white" />
                <span>Download Attendance Report (.xlsx)</span>
              </button>

              <button
                onClick={() => exportAnnotatedAttendanceExcel(selectedRound.companyName, selectedRound.name, selectedRound.id, currentRoundStudents, 'csv')}
                className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
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
        targetRoundId={selectedRound?.id}
        companyName={selectedRound?.companyName}
        roundName={selectedRound?.name}
        onShortlistValidated={(validStudents: Student[], sessionId?: string) => {
          if (selectedRound) {
            uploadShortlistForRound(selectedRound.id, validStudents, sessionId);
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
