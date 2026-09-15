import React, { useState } from 'react';
import { usePortal, RoundConfigInput } from '../../context/PortalContext';
import { CompanyProfileView } from './CompanyProfileView';
import {
  Search,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  MapPin,
  Users,
  Sparkles,
  UserCheck,
  Building2,
  Layers,
  ArrowUpRight,
} from 'lucide-react';
import { Company, Round } from '../../types';
import * as XLSX from 'xlsx';
import { DutyListModal } from '../modals/DutyListModal';
import { ManageRoundSprsModal } from '../modals/ManageRoundSprsModal';
import { getRoundVenueBreakdown } from '../../utils/dutyListExporter';

interface RoundFormItem {
  name: string;
  date: string;
  venues: string[];
  sprsNeeded: number;
}

export const CompaniesView: React.FC = () => {
  const { companies, addCompany, deleteCompany, rounds, sprs, dutyAssignments, setActiveTab } = usePortal();
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [createdCompanyNotice, setCreatedCompanyNotice] = useState<string | null>(null);
  const [selectedCompanyForDutyList, setSelectedCompanyForDutyList] = useState<Company | null>(null);
  const [selectedRoundForSprs, setSelectedRoundForSprs] = useState<Round | null>(null);

  // Form State: Company details
  const [newCompName, setNewCompName] = useState('');
  const [driveDate, setDriveDate] = useState<string>(() => new Date().toISOString().split('T')[0]);

  // Rounds State with venue setup directly inside each round
  const [totalRounds, setTotalRounds] = useState<number>(3);
  const [roundsList, setRoundsList] = useState<RoundFormItem[]>([
    {
      name: 'Round 1: Online Assessment / PPT',
      date: new Date().toISOString().split('T')[0],
      venues: ['Block A - Audi 1'],
      sprsNeeded: 3,
    },
    {
      name: 'Round 2: Technical Interview',
      date: new Date().toISOString().split('T')[0],
      venues: ['Block B - Lab 204'],
      sprsNeeded: 2,
    },
    {
      name: 'Round 3: HR & Management Interview',
      date: new Date().toISOString().split('T')[0],
      venues: ['Block A - Audi 1'],
      sprsNeeded: 2,
    },
  ]);

  const handleTotalRoundsChange = (count: number) => {
    const valid = Math.max(1, Math.min(8, count));
    setTotalRounds(valid);
    setRoundsList((prev) => {
      const updated = [...prev];
      while (updated.length < valid) {
        const rNum = updated.length + 1;
        const defaultName =
          rNum === 1
            ? 'Round 1: Online Assessment'
            : rNum === 2
            ? 'Round 2: Technical Interview'
            : `Round ${rNum}: HR / Final Interview`;
        const defaultVenue = `Block ${String.fromCharCode(65 + ((rNum - 1) % 26))} - Lab ${rNum}`;
        updated.push({
          name: defaultName,
          date: driveDate || new Date().toISOString().split('T')[0],
          venues: [defaultVenue],
          sprsNeeded: 2,
        });
      }
      return updated.slice(0, valid);
    });
  };


  const updateRoundField = (roundIdx: number, field: keyof RoundFormItem, value: any) => {
    setRoundsList((prev) => {
      const copy = [...prev];
      copy[roundIdx] = { ...copy[roundIdx], [field]: value };
      return copy;
    });
  };

  const handleVenueChange = (roundIdx: number, venueIdx: number, val: string) => {
    setRoundsList((prev) => {
      const copy = [...prev];
      const rVenues = [...copy[roundIdx].venues];
      rVenues[venueIdx] = val;
      copy[roundIdx] = { ...copy[roundIdx], venues: rVenues };
      return copy;
    });
  };

  const addVenueToRound = (roundIdx: number) => {
    setRoundsList((prev) => {
      const copy = [...prev];
      const rVenues = [...copy[roundIdx].venues];
      rVenues.push(`Venue ${rVenues.length + 1}`);
      copy[roundIdx] = { ...copy[roundIdx], venues: rVenues };
      return copy;
    });
  };

  const removeVenueFromRound = (roundIdx: number, venueIdx: number) => {
    setRoundsList((prev) => {
      const copy = [...prev];
      const rVenues = copy[roundIdx].venues.filter((_, i) => i !== venueIdx);
      copy[roundIdx] = {
        ...copy[roundIdx],
        venues: rVenues.length > 0 ? rVenues : ['Campus Venue 1'],
      };
      return copy;
    });
  };

  const filteredCompanies = companies.filter((comp) => {
    return (
      comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      rounds.some(
        (r) =>
          (r.companyId === comp.id || r.companyName === comp.name) &&
          r.venue.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  });

  const totalAllottedSprsNeeded = roundsList.reduce(
    (acc, r) => acc + (Number(r.sprsNeeded) || 2),
    0
  );

  const handleExportRoster = () => {
    const exportData: any[] = [];
    companies.forEach((comp) => {
      const compRounds = rounds.filter((r) => r.companyId === comp.id || r.companyName === comp.name);
      compRounds.forEach((rnd) => {
        const assignedSprNames = (rnd.assignedSprIds || [])
          .map((id) => sprs.find((s) => s.id === id)?.name || id)
          .join(', ');

        exportData.push({
          Company: comp.name,
          'Round Name': rnd.name,
          Date: rnd.date,
          Venue: rnd.venue,
          'Assigned SPRs': assignedSprNames || 'None',
          'Candidates Attended': `${rnd.attendedCount || 0} / ${rnd.totalShortlisted || 0}`,
        });
      });
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'SPR Allotments & Attendance');
    XLSX.writeFile(workbook, 'UPES_SPR_Allotment_Roster.xlsx');
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName.trim()) return;

    const formattedRounds: RoundConfigInput[] = roundsList.map((r) => ({
      name: r.name.trim(),
      venues: r.venues.filter(Boolean),
      venue: r.venues.filter(Boolean).join(', '),
      date: r.date || driveDate,
      sprsNeeded: r.sprsNeeded,
    }));

    addCompany({
      name: newCompName.trim(),
      driveDate,
      roundsConfig: formattedRounds,
    });

    setCreatedCompanyNotice(
      `Company "${newCompName.trim()}" created! ${roundsList.length} rounds and ${totalAllottedSprsNeeded} SPR duties allotted in a fair cycle.`
    );
    setShowAddModal(false);
    setNewCompName('');
    setTimeout(() => setCreatedCompanyNotice(null), 8000);
  };

  const handleOpenRoundAttendance = (roundId: string) => {
    try {
      sessionStorage.setItem('upes_active_round_id', roundId);
    } catch {}
    setActiveTab('attendance');
  };

  // Synchronize activeCompany with latest context state
  const activeCompany = selectedCompany ? (companies.find((c) => c.id === selectedCompany.id) || selectedCompany) : null;

  if (activeCompany) {
    return (
      <CompanyProfileView
        company={activeCompany}
        onBack={() => setSelectedCompany(null)}
      />
    );
  }

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            RECRUITMENT DRIVES & SPR ALLOTMENT
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Companies
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-3xl">
            Configure companies with selection rounds and round venues to automatically allot SPRs in a fair rotation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Company</span>
          </button>

          <button
            onClick={handleExportRoster}
            className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export Roster</span>
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {createdCompanyNotice && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center space-x-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="text-sm font-bold text-emerald-900">{createdCompanyNotice}</span>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('attendance')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Mark Attendance
            </button>
            <button
              onClick={() => setActiveTab('spr-rotation')}
              className="bg-white hover:bg-slate-100 text-emerald-900 border border-emerald-300 text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              View SPR Duties
            </button>
            <button
              onClick={() => setCreatedCompanyNotice(null)}
              className="text-emerald-700 hover:text-emerald-900 text-sm font-bold p-1"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="bg-white rounded-2xl p-3 border border-slate-200/80 shadow-xs flex items-center justify-between">
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company or venue..."
            className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50 font-medium"
          />
        </div>
        <div className="text-xs font-bold text-slate-500">
          Showing <span className="text-slate-900 font-extrabold">{filteredCompanies.length}</span> companies
        </div>
      </div>

      {/* Company Cards Grid with Inline Rounds & SPR Allotments */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {filteredCompanies.map((comp) => {
          const compRounds = rounds.filter((r) => r.companyId === comp.id || r.companyName === comp.name);
          const uniqueVenues = Array.from(new Set(compRounds.map((r) => r.venue).filter(Boolean)));
          const totalSprsAssigned = compRounds.reduce((acc, r) => acc + (r.assignedSprIds?.length || 0), 0);

          return (
            <div
              key={comp.id}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:border-amber-400 hover:shadow-xl transition-all duration-200 flex flex-col justify-between space-y-5 cursor-default group"
            >
              <div className="space-y-4">
                {/* Top Title & Delete */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-sm group-hover:scale-105 transition-transform">
                      {comp.name.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                        {comp.name}
                      </h3>
                      <div className="text-xs font-bold text-slate-400 flex items-center space-x-2 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>{compRounds[0]?.date || 'Drive Day'}</span>
                        <span>•</span>
                        <span>{compRounds.length} Rounds</span>
                        <span>•</span>
                        <span className="text-amber-600 font-extrabold">{totalSprsAssigned} SPRs Allotted</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedCompanyForDutyList(comp);
                      }}
                      className="inline-flex items-center space-x-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-black px-3 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                      title="Download & View Official Duty List"
                    >
                      <Download className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Duty List</span>
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete company ${comp.name} and all its rounds?`)) {
                          deleteCompany(comp.id);
                        }
                      }}
                      title="Delete Company"
                      className="p-2 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Venues Pill Badges */}
                {uniqueVenues.length > 0 && (
                  <div className="flex items-center flex-wrap gap-1.5 pt-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase mr-1">
                      Venues:
                    </span>
                    {uniqueVenues.map((v, i) => (
                      <span
                        key={i}
                        className="bg-slate-100 text-slate-700 text-xs font-bold px-2.5 py-1 rounded-lg flex items-center space-x-1"
                      >
                        <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                        <span>{v}</span>
                      </span>
                    ))}
                  </div>
                )}

                {/* Inline Rounds List with Assigned SPRs & Quick Attendance */}
                <div className="border-t border-slate-100 pt-3 space-y-2.5">
                  <div className="text-[10px] font-extrabold uppercase text-slate-400 tracking-widest">
                    Rounds & Allotted SPRs
                  </div>

                  {compRounds.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">
                      No rounds scheduled for this company yet.
                    </div>
                  ) : (
                    compRounds.map((rnd) => {
                      const breakdown = getRoundVenueBreakdown(rnd, dutyAssignments, sprs);
                      const roundSprCount = rnd.assignedSprIds?.length || 0;

                      return (
                        <div
                          key={rnd.id}
                          className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200/70 space-y-2.5"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <div className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                              <span className="w-5 h-5 rounded-md bg-amber-100 text-amber-900 text-xs font-black flex items-center justify-center">
                                R{rnd.roundNumber}
                              </span>
                              <span>{rnd.name}</span>
                            </div>

                            <div className="flex items-center space-x-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedRoundForSprs(rnd);
                                }}
                                className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 font-extrabold text-xs px-2.5 py-1.5 rounded-xl shadow-2xs transition-all active:scale-95 cursor-pointer"
                                title="Add SPRs (Auto / Manual) or reassign venues"
                              >
                                <Users className="w-3.5 h-3.5 text-amber-500" />
                                <span>+ Add SPR</span>
                              </button>

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleOpenRoundAttendance(rnd.id);
                                }}
                                className="inline-flex items-center space-x-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
                              >
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Mark Attendance</span>
                              </button>
                            </div>
                          </div>

                          <div className="text-xs text-slate-500 flex items-center space-x-3 font-semibold flex-wrap gap-y-1">
                            <span className="flex items-center space-x-1">
                              <MapPin className="w-3 h-3 text-amber-600" />
                              <span>{rnd.venue}</span>
                            </span>
                            <span>•</span>
                            <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md font-bold text-[10px]">
                              Full Day
                            </span>
                            <span>•</span>
                            <span className="text-slate-700">
                              Attended: <strong className="text-slate-900">{rnd.attendedCount || 0}</strong>
                            </span>
                            <span>•</span>
                            <span className="text-amber-600 font-bold">
                              {roundSprCount} SPRs Total
                            </span>
                          </div>

                          {/* Venues with equally divided SPRs */}
                          <div className="pt-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {breakdown.map((bg, bgIdx) => (
                              <div
                                key={bgIdx}
                                className="bg-white rounded-xl p-2.5 border border-slate-200/90 shadow-2xs space-y-1.5"
                              >
                                <div className="flex items-center justify-between pb-1 border-b border-slate-100">
                                  <span className="text-[11px] font-extrabold text-slate-800 flex items-center space-x-1">
                                    <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span className="truncate">{bg.venue}</span>
                                  </span>
                                  <span className="text-[10px] font-black text-amber-900 bg-amber-50 border border-amber-200/80 px-1.5 py-0.2 rounded">
                                    {bg.sprs.length} SPR{bg.sprs.length === 1 ? '' : 's'}
                                  </span>
                                </div>

                                <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
                                  {bg.sprs.length === 0 ? (
                                    <span className="text-[10px] text-slate-400 italic">None allotted</span>
                                  ) : (
                                    bg.sprs.map((spr, sIdx) => (
                                      <span
                                        key={sIdx}
                                        className="bg-slate-50 border border-slate-200 text-slate-900 text-[11px] font-extrabold px-2 py-0.5 rounded-md shadow-3xs flex items-center space-x-1"
                                      >
                                        <span>{spr.name}</span>
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Informational Card Footer */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold flex items-center space-x-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Process Active</span>
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedCompany(comp);
                  }}
                  className="text-xs font-black text-amber-600 hover:text-amber-700 flex items-center space-x-1 cursor-pointer transition-colors"
                >
                  <span>Open Details</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Company Modal with Per-Round Venue Configuration */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-100 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-600 mb-1">
                  SPR ALLOTMENT & ATTENDANCE SETUP
                </div>
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  Add Company
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Configure company rounds and their venues directly. SPRs will be allotted automatically in a fair cycle.
                </p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="space-y-6 text-xs">
              {/* SECTION 1: Company Name & Date */}
              <div className="bg-slate-50 p-5 rounded-2xl space-y-4 border border-slate-200/80">
                <div className="flex items-center space-x-2">
                  <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                    1
                  </span>
                  <span className="font-extrabold text-slate-900 uppercase text-[11px] tracking-widest">
                    Company Details
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Google, Microsoft, TCS"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1.5">
                      Drive Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={driveDate}
                      onChange={(e) => setDriveDate(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-sm font-bold outline-none focus:ring-2 focus:ring-amber-500/50"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: Rounds with Venue Setup Inside Each Round */}
              <div className="bg-slate-50 p-5 rounded-2xl space-y-4 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black flex items-center justify-center text-xs">
                      2
                    </span>
                    <span className="font-extrabold text-slate-900 uppercase text-[11px] tracking-widest">
                      Rounds, Venues & SPR Allotment
                    </span>
                  </div>

                  {/* Number of Rounds Counter */}
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-600">Total Rounds:</span>
                    <div className="flex items-center border border-slate-200 rounded-xl bg-white overflow-hidden">
                      <button
                        type="button"
                        onClick={() => handleTotalRoundsChange(totalRounds - 1)}
                        className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black"
                      >
                        -
                      </button>
                      <span className="px-3 py-1 font-black text-slate-900 text-sm">
                        {totalRounds}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleTotalRoundsChange(totalRounds + 1)}
                        className="px-2.5 py-1 text-slate-600 hover:bg-slate-100 font-black"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-1">
                  {roundsList.map((rc, roundIdx) => (
                    <div
                      key={roundIdx}
                      className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4"
                    >
                      {/* Round Header */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                        <span className="font-black text-slate-900 text-sm flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 text-xs font-black flex items-center justify-center">
                            {roundIdx + 1}
                          </span>
                          <span>Round #{roundIdx + 1}</span>
                        </span>

                        <span className="font-extrabold text-amber-900 bg-amber-100/80 px-3 py-1 rounded-xl text-xs border border-amber-200">
                          {rc.sprsNeeded || 2} SPRs Needed
                        </span>
                      </div>

                      {/* Round Name, Round Date & SPRs Needed */}
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                        <div className="sm:col-span-2">
                          <label className="font-bold text-slate-700 block mb-1 text-xs">
                            Round Name *
                          </label>
                          <input
                            type="text"
                            required
                            value={rc.name}
                            onChange={(e) => updateRoundField(roundIdx, 'name', e.target.value)}
                            placeholder="e.g. Technical Interview"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none text-xs focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs text-amber-900">
                            Round Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={rc.date || driveDate}
                            onChange={(e) => updateRoundField(roundIdx, 'date', e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none text-xs focus:ring-2 focus:ring-amber-500"
                          />
                        </div>

                        <div>
                          <label className="font-bold text-slate-700 block mb-1 text-xs text-amber-800">
                            SPRs Needed *
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="15"
                            required
                            value={rc.sprsNeeded}
                            onChange={(e) =>
                              updateRoundField(roundIdx, 'sprsNeeded', Math.max(1, Number(e.target.value)))
                            }
                            className="w-full bg-amber-50/60 border border-amber-300 rounded-xl p-2.5 font-black text-amber-900 outline-none text-xs focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* VENUE SETUP FOR THIS ROUND */}
                      <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/80 space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-1.5">
                            <MapPin className="w-3.5 h-3.5 text-amber-600" />
                            <span className="font-extrabold text-slate-800 text-[11px] uppercase tracking-wider">
                              Venues for this Round ({rc.venues.length})
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={() => addVenueToRound(roundIdx)}
                            className="text-[11px] font-black text-amber-600 hover:text-amber-700 bg-white px-2.5 py-1 rounded-lg border border-amber-200 hover:border-amber-300 shadow-2xs transition-all cursor-pointer"
                          >
                            + Add Venue
                          </button>
                        </div>

                        <div className="space-y-2">
                          {rc.venues.map((venueVal, vIdx) => (
                            <div key={vIdx} className="flex items-center space-x-2">
                              <span className="w-6 h-6 rounded-md bg-slate-200 text-slate-700 font-bold flex items-center justify-center text-[10px] shrink-0">
                                V{vIdx + 1}
                              </span>
                              <input
                                type="text"
                                required
                                value={venueVal}
                                onChange={(e) => handleVenueChange(roundIdx, vIdx, e.target.value)}
                                placeholder="e.g. Block A - Audi 1 or Lab 204"
                                className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold outline-none text-xs focus:ring-2 focus:ring-amber-500"
                              />
                              {rc.venues.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeVenueFromRound(roundIdx, vIdx)}
                                  className="text-slate-400 hover:text-red-600 p-1.5 text-xs font-bold"
                                  title="Remove this venue"
                                >
                                  ✕
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Automatic Cycle Allotment Summary */}
              <div className="bg-amber-50/80 border border-amber-200 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    <span className="font-extrabold text-amber-950">
                      Automated Cycle Allotment Engine
                    </span>
                  </div>
                  <span className="text-xs font-black text-amber-900 bg-amber-200/70 px-3 py-1 rounded-full">
                    {totalAllottedSprsNeeded} SPR Duties to Allot
                  </span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed font-medium">
                  Submitting will automatically create all <strong>{roundsList.length} rounds</strong> with their specified venues, generate attendance QR codes, and rotate through the <strong>{sprs.length} registered SPRs</strong> so duty distribution remains balanced and equitable.
                </p>
              </div>

              {/* Modal Actions */}
              <div className="pt-2 flex items-center justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl text-slate-600 font-bold hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black shadow-md cursor-pointer transition-all active:scale-95 flex items-center space-x-2"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Create Drive & Auto-Allot SPRs</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Duty List Modal */}
      {selectedCompanyForDutyList && (
        <DutyListModal
          company={selectedCompanyForDutyList}
          onClose={() => setSelectedCompanyForDutyList(null)}
        />
      )}

      {/* Manage Round SPRs Modal */}
      {selectedRoundForSprs && (
        <ManageRoundSprsModal
          round={selectedRoundForSprs}
          onClose={() => setSelectedRoundForSprs(null)}
        />
      )}
    </div>
  );
};
