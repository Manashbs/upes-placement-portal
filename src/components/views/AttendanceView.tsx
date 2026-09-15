import React, { useState, useEffect } from 'react';
import { usePortal } from '../../context/PortalContext';
import { UserCheck, QrCode, Search, CheckCircle2, Clock, AlertTriangle, ShieldCheck, Upload, Link, Copy, FileSpreadsheet, Download, Trash2, Maximize2, RefreshCw, Calendar, Building2, Layers, Filter } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { RoundQRControlModal } from '../modals/RoundQRControlModal';
import { ExcelUploadModal } from '../modals/ExcelUploadModal';
import { Round, RoundStudent, Student } from '../../types';
import { exportRosterExcel, exportAnnotatedAttendanceExcel, generateCandidateAttendanceLink, exportExactSheetWithAttendance } from '../../utils/excelUtils';
import { hasSheetForRound } from '../../utils/sheetStorage';

export const AttendanceView: React.FC = () => {
  const { rounds, roundStudents, students, markAttendance, manualAttendanceOverride, createRound, uploadShortlistForRound, deleteRound, getOriginalExcel, getOriginalExcelRaw, syncFromCloud } = usePortal();
  const [selectedRoundId, setSelectedRoundId] = useState<string>(() => {
    try {
      const pre = sessionStorage.getItem('upes_active_round_id');
      if (pre && rounds.some((r) => r.id === pre)) return pre;
    } catch {}
    return rounds[0]?.id || '';
  });
  const [selectedCompanyFilter, setSelectedCompanyFilter] = useState<string>('ALL');
  const [roundSearchQuery, setRoundSearchQuery] = useState<string>('');
  const [downloadNotice, setDownloadNotice] = useState<string | null>(null);
  const [panelFilter, setPanelFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [quickSapInput, setQuickSapInput] = useState('');
  const [quickMarkNotice, setQuickMarkNotice] = useState<string | null>(null);
  
  const handleSelectRound = (roundId: string) => {
    setSelectedRoundId(roundId);
    try {
      sessionStorage.setItem('upes_active_round_id', roundId);
    } catch {}
  };

  // Keep selected round synchronized without fighting user clicks
  useEffect(() => {
    if (rounds.length > 0) {
      const exists = rounds.some((r) => r.id === selectedRoundId);
      if (!exists) {
        try {
          const pre = sessionStorage.getItem('upes_active_round_id');
          if (pre && rounds.some((r) => r.id === pre)) {
            setSelectedRoundId(pre);
            return;
          }
        } catch {}
        setSelectedRoundId(rounds[0].id);
        try {
          sessionStorage.setItem('upes_active_round_id', rounds[0].id);
        } catch {}
      }
    } else {
      setSelectedRoundId('');
    }
  }, [rounds, selectedRoundId]);

  // Unique companies derived from available rounds
  const uniqueCompanies = Array.from(
    new Set(rounds.map((r) => r.companyName || 'Unassigned'))
  ).sort();

  // Filtered rounds based on company filter & search query
  const filteredRounds = rounds.filter((r) => {
    const matchesCompany = selectedCompanyFilter === 'ALL' || r.companyName === selectedCompanyFilter;
    const q = roundSearchQuery.toLowerCase().trim();
    const matchesQuery =
      !q ||
      r.companyName.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.venue.toLowerCase().includes(q) ||
      r.date.includes(q);
    return matchesCompany && matchesQuery;
  });

  const getRoundCandidateCount = (roundId: string) => {
    return roundStudents.filter((rs) => rs.roundId === roundId).length;
  };

  const handleQuickMark = (targetSap?: string) => {
    const sapToMark = (targetSap || quickSapInput).trim();
    if (!sapToMark || !selectedRoundId) return;

    const res = markAttendance(selectedRoundId, sapToMark, 'LIVE_DESK_ADMIN');
    setQuickMarkNotice(res.message);
    setQuickSapInput('');
    setTimeout(() => setQuickMarkNotice(null), 3500);
  };

  // Modals state
  const [showQRModal, setShowQRModal] = useState<Round | null>(null);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
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
            Upload company-specific shortlists, generate dynamic QR codes, and monitor live candidate attendance with strict round data isolation.
          </p>
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {/* Upload Shortlist Button */}
          {selectedRound && (
            <button
              onClick={() => setShowExcelUpload(true)}
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Shortlist Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* Enhanced Round Navigation & Company Directory Hub */}
      {rounds.length > 0 ? (
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#0B132B] text-amber-400 flex items-center justify-center font-bold">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-extrabold text-slate-900">Placement Rounds Directory</h3>
                <p className="text-[11px] text-slate-400 font-semibold">Select or search company rounds to inspect live attendance records</p>
              </div>
            </div>

            {/* Quick Round Dropdown Jump Menu */}
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-400 shrink-0">Quick Jump:</span>
              <select
                value={selectedRoundId}
                onChange={(e) => handleSelectRound(e.target.value)}
                className="bg-slate-50 hover:bg-slate-100 text-xs font-extrabold text-slate-800 px-3 py-2 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer max-w-xs truncate shadow-xs"
              >
                {rounds.map((r) => {
                  const cCount = getRoundCandidateCount(r.id);
                  return (
                    <option key={r.id} value={r.id}>
                      {r.companyName} · {r.name} ({r.date || 'TBD'}) — {cCount > 0 ? `${cCount} candidates` : 'No sheet'}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          {/* Search & Company Filter Controls */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            {/* Search Input for rounds */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search rounds by company, round name, venue, date..."
                value={roundSearchQuery}
                onChange={(e) => setRoundSearchQuery(e.target.value)}
                className="w-full bg-slate-50 text-xs rounded-xl pl-8 pr-7 py-2 border border-slate-200 outline-none focus:ring-2 focus:ring-amber-500"
              />
              {roundSearchQuery && (
                <button
                  onClick={() => setRoundSearchQuery('')}
                  className="absolute right-2.5 top-2 text-xs text-slate-400 hover:text-slate-600 font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Company Filter Tabs */}
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 max-w-full">
              <span className="text-[11px] font-extrabold text-slate-400 uppercase shrink-0 flex items-center space-x-1">
                <Building2 className="w-3 h-3" />
                <span>Company:</span>
              </span>
              <button
                type="button"
                onClick={() => setSelectedCompanyFilter('ALL')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer ${
                  selectedCompanyFilter === 'ALL'
                    ? 'bg-[#0B132B] text-amber-400 shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Companies ({rounds.length})
              </button>
              {uniqueCompanies.map((comp) => {
                const compRounds = rounds.filter((r) => r.companyName === comp);
                const isFilterActive = selectedCompanyFilter === comp;
                return (
                  <button
                    key={comp}
                    type="button"
                    onClick={() => setSelectedCompanyFilter(comp)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold shrink-0 transition-all cursor-pointer flex items-center space-x-1.5 ${
                      isFilterActive
                        ? 'bg-[#0B132B] text-amber-400 shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <span>{comp}</span>
                    <span className="text-[10px] opacity-75 font-mono px-1.5 py-0.2 rounded-full bg-slate-200/60 text-slate-700">
                      {compRounds.length}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Grouped Grid of Round Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 pt-1">
            {filteredRounds.map((r) => {
              const isSelected = r.id === selectedRoundId;
              const cCount = getRoundCandidateCount(r.id);

              return (
                <div
                  key={r.id}
                  onClick={() => handleSelectRound(r.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer text-left relative flex flex-col justify-between ${
                    isSelected
                      ? 'bg-[#0B132B] text-white border-amber-500 shadow-md ring-2 ring-amber-500/80 scale-[1.01]'
                      : 'bg-slate-50/90 hover:bg-slate-100 text-slate-800 border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                        isSelected ? 'bg-amber-400 text-slate-950' : 'bg-slate-200 text-slate-700'
                      }`}>
                        R{r.roundNumber || 1}
                      </span>
                      {cCount > 0 ? (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center space-x-1 ${
                          isSelected ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/30' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        }`}>
                          <CheckCircle2 className="w-2.5 h-2.5" />
                          <span>{cCount} Candidates</span>
                        </span>
                      ) : (
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full inline-flex items-center space-x-1 ${
                          isSelected ? 'bg-amber-500/20 text-amber-300 border border-amber-400/30' : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          <AlertTriangle className="w-2.5 h-2.5" />
                          <span>No Shortlist</span>
                        </span>
                      )}
                    </div>

                    <div className="font-extrabold text-sm tracking-tight truncate" title={`${r.companyName} · ${r.name}`}>
                      {r.companyName}
                    </div>
                    <div className={`text-xs font-semibold truncate ${isSelected ? 'text-amber-300' : 'text-slate-600'}`}>
                      {r.name}
                    </div>
                  </div>

                  <div className={`mt-3 pt-2 border-t text-[11px] flex items-center justify-between ${
                    isSelected ? 'border-slate-700 text-slate-300' : 'border-slate-200 text-slate-500'
                  }`}>
                    <span className="truncate max-w-[120px]" title={r.venue || 'Campus'}>{r.venue || 'Campus'}</span>
                    <span className="font-mono text-[10px]">{r.date || 'TBD'}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredRounds.length === 0 && (
            <div className="py-8 text-center text-xs text-slate-400 font-semibold">
              No placement rounds match your current company or search query.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-10 border border-slate-100 shadow-sm text-center">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h3 className="text-base font-extrabold text-slate-900">No Placement Rounds Available</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Create a placement round in the <strong>Rounds</strong> tab to start tracking live attendance and uploading shortlist sheets.
          </p>
        </div>
      )}

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
      {/* Student List & Attendance Records */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 space-y-4">
        {/* Quick Instant SAP ID Attendance Desk Bar */}
        {selectedRound && (
          <div className="bg-amber-50/80 border border-amber-200/80 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center space-x-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <div className="text-xs font-black text-amber-950">
                Live Attendance Desk · Rapid Scan / SAP ID Entry:
              </div>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleQuickMark();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Enter SAP ID (e.g. 500120001)..."
                value={quickSapInput}
                onChange={(e) => setQuickSapInput(e.target.value)}
                className="bg-white text-xs font-mono font-bold text-slate-900 px-3 py-2 rounded-xl border border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500 w-60 shadow-inner"
              />
              <button
                type="submit"
                className="bg-[#0B132B] hover:bg-slate-800 text-amber-400 text-xs font-black px-4 py-2 rounded-xl transition-all cursor-pointer shadow-xs shrink-0 active:scale-95 flex items-center space-x-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Mark Present</span>
              </button>
            </form>
          </div>
        )}

        {quickMarkNotice && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold px-4 py-2.5 rounded-xl animate-in fade-in flex items-center justify-between shadow-xs">
            <span>✓ {quickMarkNotice}</span>
            <button onClick={() => setQuickMarkNotice(null)} className="text-emerald-700 font-bold ml-2">✕</button>
          </div>
        )}

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

              {/* Download Attendance Report (.xlsx) — exports exact company sheet with Attendance columns appended */}
              <button
                onClick={() => {
                  if (currentRoundStudents.length === 0) {
                    setDownloadNotice('No candidate shortlist has been uploaded for this round yet. Please upload an Excel sheet first.');
                    setTimeout(() => setDownloadNotice(null), 4000);
                    return;
                  }
                  const buffer = getOriginalExcel(selectedRound.id);
                  const rawMeta = getOriginalExcelRaw(selectedRound.id);
                  exportExactSheetWithAttendance(
                    selectedRound.id,
                    selectedRound.companyName,
                    selectedRound.name,
                    roundStudents,
                    students,
                    'xlsx',
                    buffer,
                    rawMeta
                  );
                }}
                className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
                title="Download exact uploaded sheet with Attendance Status and Time"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download Attendance Report (.xlsx)</span>
              </button>

              {/* Export CSV (.csv) — exports exact company sheet in CSV format */}
              <button
                onClick={() => {
                  if (currentRoundStudents.length === 0) {
                    setDownloadNotice('No candidate shortlist has been uploaded for this round yet. Please upload an Excel sheet first.');
                    setTimeout(() => setDownloadNotice(null), 4000);
                    return;
                  }
                  const buffer = getOriginalExcel(selectedRound.id);
                  const rawMeta = getOriginalExcelRaw(selectedRound.id);
                  exportExactSheetWithAttendance(
                    selectedRound.id,
                    selectedRound.companyName,
                    selectedRound.name,
                    roundStudents,
                    students,
                    'csv',
                    buffer,
                    rawMeta
                  );
                }}
                className="inline-flex items-center space-x-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                title="Export exact uploaded sheet in CSV format with Attendance"
              >
                <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                <span>Export CSV (.csv)</span>
              </button>
            </div>
          )}
        </div>

        {downloadNotice && (
          <div className="bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold px-4 py-3 rounded-2xl animate-in fade-in flex items-center justify-between shadow-xs">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>{downloadNotice}</span>
            </div>
            <button onClick={() => setDownloadNotice(null)} className="text-amber-800 font-bold ml-2">✕</button>
          </div>
        )}

        {/* Live Attendance Student List or Dedicated Empty State */}
        {currentRoundStudents.length === 0 ? (
          <div className="bg-slate-50/70 border-2 border-dashed border-slate-200 rounded-3xl p-10 text-center my-2">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4 shadow-xs">
              <FileSpreadsheet className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 tracking-tight mb-2">
              No Shortlist Uploaded for {selectedRound?.companyName} · {selectedRound?.name}
            </h3>
            <p className="text-xs text-slate-500 max-w-lg mx-auto mb-6 leading-relaxed">
              No candidate roster has been uploaded for this placement round yet. Each round strictly maintains its own isolated candidate records and does not inherit data from other rounds or companies.
              Upload the company's Excel shortlist to populate candidates and enable live QR scans.
            </p>
            <button
              onClick={() => setShowExcelUpload(true)}
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black px-6 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Company Excel Shortlist</span>
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase">
                <tr>
                  <th className="p-3">Candidate Details</th>
                  <th className="p-3">SAP ID</th>
                  <th className="p-3">Branch</th>
                  <th className="p-3">Attendance Status</th>
                  <th className="p-3">Roster Link</th>
                  <th className="p-3 text-right">Actions</th>
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
                        <div className="flex items-center space-x-2 flex-wrap gap-y-1">
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

                          {!isPresent && (
                            <button
                              onClick={() => handleQuickMark(st.sapId)}
                              className="inline-flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-[10px] px-2.5 py-1 rounded-lg shadow-xs transition-all active:scale-95 cursor-pointer"
                              title="Mark present live now"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Mark Present</span>
                            </button>
                          )}
                        </div>
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
                          className="text-xs font-bold text-slate-500 hover:text-amber-600 bg-slate-50 hover:bg-amber-50 px-3 py-1.5 rounded-xl border border-slate-200 cursor-pointer"
                        >
                          Override / Note
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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
    </div>
  );
};
