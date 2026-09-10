import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Calendar, MapPin, Filter, QrCode, FileSpreadsheet, Plus, Users, Building2, ChevronRight } from 'lucide-react';
import { Round, RoundType, RoundMode } from '../../types';
import { RoundQRControlModal } from '../modals/RoundQRControlModal';
import { ExcelUploadModal } from '../modals/ExcelUploadModal';
import { RoundDetailsModal } from '../modals/RoundDetailsModal';
import { exportRosterExcel } from '../../utils/excelUtils';

export const RoundsView: React.FC = () => {
  const { rounds, companies, createRound, roundStudents } = usePortal();
  const [activeTab, setActiveTab] = useState<'ALL' | 'LIVE' | 'UPCOMING' | 'COMPLETED'>('ALL');
  const [selectedRoundForQR, setSelectedRoundForQR] = useState<Round | null>(null);
  const [selectedRoundForDetails, setSelectedRoundForDetails] = useState<Round | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [selectedRoundForUpload, setSelectedRoundForUpload] = useState<Round | null>(null);

  // New Round Form state
  const [companyId, setCompanyId] = useState(companies[0]?.id || 'comp-1');
  const [roundName, setRoundName] = useState('');
  const [roundType, setRoundType] = useState<RoundType>('TECHNICAL_INTERVIEW');
  const [roundMode, setRoundMode] = useState<RoundMode>('ON_CAMPUS');
  const [date, setDate] = useState('2026-09-12');
  
  // Total Venues and Venue list
  const [totalVenues, setTotalVenues] = useState<number>(1);
  const [venuesList, setVenuesList] = useState<string[]>(['Block A - Lab 1']);
  
  // Total SPRs needed
  const [sprsNeeded, setSprsNeeded] = useState<number>(3);
  const [shortlistedStudentsTemp, setShortlistedStudentsTemp] = useState<any[]>([]);

  const filteredRounds = rounds.filter((r) => {
    if (activeTab === 'ALL') return true;
    if (activeTab === 'LIVE') return r.status === 'IN_PROGRESS';
    if (activeTab === 'UPCOMING') return r.status === 'SCHEDULED';
    if (activeTab === 'COMPLETED') return r.status === 'COMPLETED';
    return true;
  });

  const handleTotalVenuesChange = (count: number) => {
    const validCount = Math.max(1, Math.min(10, count));
    setTotalVenues(validCount);
    setVenuesList((prev) => {
      const updated = [...prev];
      while (updated.length < validCount) {
        const char = String.fromCharCode(65 + (updated.length % 26));
        updated.push(`Block ${char} - Lab ${updated.length + 1}`);
      }
      return updated.slice(0, validCount);
    });
  };

  const handleVenueNameChange = (index: number, name: string) => {
    setVenuesList((prev) => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  };

  // Divide total SPRs needed equally/randomly across venues
  const getSprAllocationPerVenue = () => {
    const base = Math.floor(sprsNeeded / totalVenues);
    const remainder = sprsNeeded % totalVenues;
    return venuesList.map((v, i) => ({
      venueName: v || `Venue ${i + 1}`,
      allocatedSprs: base + (i < remainder ? 1 : 0),
    }));
  };

  const handlePrintSchedule = () => {
    window.print();
  };

  const handleFinalizeCreateRound = () => {
    const targetComp = companies.find((c) => c.id === companyId);
    const combinedVenueString = venuesList.filter(Boolean).join(' | ');

    createRound(
      {
        companyId,
        companyName: targetComp?.name || 'Company',
        name: roundName || `${roundType} Round`,
        type: roundType,
        mode: roundMode,
        venue: combinedVenueString || 'Block A - Lab 1',
        capacity: sprsNeeded * 20,
        date,
        startTime: '09:00',
        endTime: '17:00',
      },
      shortlistedStudentsTemp
    );
    setShowCreateModal(false);
    setShortlistedStudentsTemp([]);
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            OPERATIONS CALENDAR
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Rounds
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-3xl">
            The operating calendar for every assessment, interview, and recruiter touchpoint.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create Round</span>
          </button>

          <button
            onClick={handlePrintSchedule}
            className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-amber-400" />
            <span>Print schedule</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center space-x-2 overflow-x-auto">
          {[
            { id: 'ALL', label: 'All rounds' },
            { id: 'LIVE', label: 'Live' },
            { id: 'UPCOMING', label: 'Upcoming' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`px-5 py-2.5 rounded-2xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B132B] text-white shadow-md'
                    : 'bg-white text-slate-600 border border-slate-100 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex items-center space-x-2 text-xs font-bold text-slate-400">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>{filteredRounds.length} records</span>
        </div>
      </div>

      {/* List of Round Cards */}
      <div className="space-y-4">
        {filteredRounds.map((round) => {
          const currentStudents = roundStudents.filter((rs) => rs.roundId === round.id);
          const isLive = round.status === 'IN_PROGRESS';
          const isCompleted = round.status === 'COMPLETED';
          const attendedRatio = round.attendedCount / (round.totalShortlisted || 1);

          const accentColor = isLive
            ? 'bg-blue-600'
            : isCompleted
            ? 'bg-blue-600'
            : 'bg-lime-500';

          return (
            <div
              key={round.id}
              onClick={() => setSelectedRoundForDetails(round)}
              className={`bg-white rounded-3xl p-6 border shadow-sm transition-all relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6 cursor-pointer group hover:border-amber-400 hover:shadow-md ${
                isLive
                  ? 'border-amber-200 ring-1 ring-amber-300/80 shadow-md'
                  : 'border-slate-100'
              }`}
            >
              <div className={`absolute left-0 top-6 bottom-6 w-1.5 rounded-r-full ${accentColor}`} />

              <div className="pl-4 min-w-[240px]">
                <div className="flex items-center space-x-2">
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
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

                <p className="text-xs font-semibold text-slate-400 mt-1">
                  {round.name} · {round.type}
                </p>
              </div>

              <div className="space-y-0.5 min-w-[150px]">
                <span className="text-[11px] font-semibold text-slate-400 block">Date scheduled</span>
                <div className="text-sm font-extrabold text-slate-900">
                  {round.date}
                </div>
              </div>

              <div className="space-y-0.5 min-w-[180px]">
                <span className="text-[11px] font-semibold text-slate-400 block">Venues ({round.venue.split('|').length})</span>
                <div className="flex items-center space-x-1.5 text-xs font-extrabold text-slate-900">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">{round.venue}</span>
                </div>
                <div className="text-xs text-slate-400 font-medium pl-5">
                  {round.mode === 'VIRTUAL' ? 'Virtual' : 'On Campus'}
                </div>
              </div>

              <div className="space-y-1.5 min-w-[140px]">
                <span className="text-[11px] font-semibold text-slate-400 block">Attendance</span>
                <div className="text-sm font-extrabold text-slate-900">
                  {round.attendedCount}/{round.totalShortlisted}
                </div>
                <div className="h-1.5 w-28 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#0B132B] rounded-full transition-all duration-300"
                    style={{ width: `${Math.round(attendedRatio * 100)}%` }}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoundForQR(round);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                  title="View Round QR Code"
                >
                  <QrCode className="w-4 h-4 text-amber-600" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedRoundForUpload(round);
                    setShowExcelUpload(true);
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                  title="Upload Shortlist Excel"
                >
                  <Plus className="w-4 h-4 text-emerald-600" />
                </button>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    exportRosterExcel(round.companyName, round.name, currentStudents, 'STANDARD');
                  }}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold transition-colors cursor-pointer"
                  title="Export Round Roster Excel"
                >
                  <FileSpreadsheet className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create Round Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">Schedule Drive Round & Allocate SPRs</h3>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 font-bold">✕</button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Company</label>
                <select
                  value={companyId}
                  onChange={(e) => setCompanyId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                >
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.name} ({c.category})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Round Title</label>
                  <input
                    type="text"
                    placeholder="e.g. Technical Interview"
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Round Category</label>
                  <select
                    value={roundType}
                    onChange={(e) => setRoundType(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  >
                    <option value="PPT">Pre-Placement Talk (PPT)</option>
                    <option value="ONLINE_TEST">Online Aptitude Test</option>
                    <option value="CODING">Coding Assessment</option>
                    <option value="GD">Group Discussion (GD)</option>
                    <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                    <option value="HR_INTERVIEW">HR Interview</option>
                  </select>
                </div>
              </div>

              {/* Date Scheduled & Mode */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Process Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mode</label>
                  <select
                    value={roundMode}
                    onChange={(e) => setRoundMode(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  >
                    <option value="ON_CAMPUS">On Campus</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Total Venues & Total SPRs Needed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Venues *</label>
                  <select
                    value={totalVenues}
                    onChange={(e) => handleTotalVenuesChange(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={1}>1 Venue</option>
                    <option value={2}>2 Venues</option>
                    <option value={3}>3 Venues</option>
                    <option value={4}>4 Venues</option>
                    <option value={5}>5 Venues</option>
                    <option value={6}>6 Venues</option>
                    <option value={7}>7 Venues</option>
                    <option value={8}>8 Venues</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total SPRs Needed *</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={sprsNeeded}
                    onChange={(e) => setSprsNeeded(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>
              </div>

              {/* Venue Locations Input List */}
              <div className="space-y-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
                <label className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                  Venue Locations ({venuesList.length})
                </label>
                {venuesList.map((venueName, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400 w-16">Venue {idx + 1}:</span>
                    <input
                      type="text"
                      required
                      placeholder={`e.g. Block ${String.fromCharCode(65 + idx)} - Lab ${idx + 1}`}
                      value={venueName}
                      onChange={(e) => handleVenueNameChange(idx, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold outline-none text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* SPR Equal/Random Allocation Breakdown Display */}
              <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl space-y-1">
                <div className="font-extrabold text-emerald-900 text-[11px] flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                  <span>Equal SPR Allocation Across Venues ({sprsNeeded} SPRs Total)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {getSprAllocationPerVenue().map((alloc, idx) => (
                    <span
                      key={idx}
                      className="bg-white text-emerald-900 font-extrabold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs"
                    >
                      {alloc.venueName}: {alloc.allocatedSprs} SPRs
                    </span>
                  ))}
                </div>
              </div>

              {/* Upload Shortlist Integration */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-900">Shortlist Candidate Roster</div>
                  <div className="text-[11px] text-amber-700">
                    {shortlistedStudentsTemp.length > 0
                      ? `${shortlistedStudentsTemp.length} candidates loaded from recruiter sheet`
                      : 'Upload recruiter Excel sheet (reads Name/Email)'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExcelUpload(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3 py-1.5 rounded-xl text-xs cursor-pointer"
                >
                  Upload Excel
                </button>
              </div>

              <div className="pt-3 flex justify-end space-x-3">
                <button type="button" onClick={() => setShowCreateModal(false)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleFinalizeCreateRound}
                  className="px-5 py-2.5 bg-[#0B132B] text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Create & Launch Selection Round
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Round Details & SPR Allocation Modal */}
      <RoundDetailsModal
        round={selectedRoundForDetails}
        onClose={() => setSelectedRoundForDetails(null)}
        onOpenQRModal={(r) => setSelectedRoundForQR(r)}
        onOpenUploadModal={(r) => {
          setSelectedRoundForUpload(r);
          setShowExcelUpload(true);
        }}
      />

      {/* QR Control Modal */}
      <RoundQRControlModal round={selectedRoundForQR} onClose={() => setSelectedRoundForQR(null)} />

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={showExcelUpload}
        onClose={() => setShowExcelUpload(false)}
        onShortlistValidated={(validStudents) => {
          setShortlistedStudentsTemp(validStudents);
          setShowExcelUpload(false);
        }}
      />
    </div>
  );
};
