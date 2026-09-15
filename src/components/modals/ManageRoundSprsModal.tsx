import React, { useState, useMemo } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Round, SPR } from '../../types';
import { getRoundVenueBreakdown } from '../../utils/dutyListExporter';
import {
  X,
  Users,
  Sparkles,
  UserPlus,
  MapPin,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  MoveRight,
} from 'lucide-react';

interface ManageRoundSprsModalProps {
  round: Round;
  onClose: () => void;
}

export const ManageRoundSprsModal: React.FC<ManageRoundSprsModalProps> = ({ round, onClose }) => {
  const {
    rounds,
    sprs,
    dutyAssignments,
    sprCycle,
    allocateSprsToRound,
    assignSprManuallyToRound,
    removeSprFromRound,
    reassignSprVenue,
  } = usePortal();

  // Find freshest round object
  const currentRound = rounds.find((r) => r.id === round.id) || round;

  // Active Tab: 'auto' | 'manual' | 'roster'
  const [activeTab, setActiveTab] = useState<'auto' | 'manual' | 'roster'>('auto');

  // Auto Allot State
  const [autoCount, setAutoCount] = useState<number>(2);
  const [autoTargetVenue, setAutoTargetVenue] = useState<string>('ALL');

  // Manual Allot State
  const [manualSearch, setManualSearch] = useState('');
  const [manualTargetVenue, setManualTargetVenue] = useState<string>('');
  const [sprToAssignVenue, setSprToAssignVenue] = useState<SPR | null>(null);

  // Reassign Venue Modal state
  const [reassignSprId, setReassignSprId] = useState<string | null>(null);

  // Status/Feedback message
  const [actionFeedback, setActionFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Determine venues for the round
  const roundVenues = useMemo(() => {
    if (currentRound.venues && currentRound.venues.length > 0) {
      return currentRound.venues.filter(Boolean);
    }
    if (currentRound.venue) {
      return currentRound.venue.split(',').map((v) => v.trim()).filter(Boolean);
    }
    return ['Campus Venue'];
  }, [currentRound]);

  // Set default manual venue
  React.useEffect(() => {
    if (roundVenues.length > 0 && !manualTargetVenue) {
      setManualTargetVenue(roundVenues[0]);
    }
  }, [roundVenues, manualTargetVenue]);

  // Get current venue breakdown
  const venueBreakdown = useMemo(() => {
    return getRoundVenueBreakdown(currentRound, dutyAssignments, sprs);
  }, [currentRound, dutyAssignments, sprs]);

  // Calculate next eligible SPRs preview for the auto tab
  const nextInCyclePreview = useMemo(() => {
    const assignedIds = new Set(currentRound.assignedSprIds || []);
    const targetDate = (currentRound.date || '').trim();

    // Check conflicts on date
    const conflictingSprIds = new Set<string>();
    rounds.forEach((r) => {
      if (r.id !== currentRound.id && r.date && r.date.trim() === targetDate) {
        (r.assignedSprIds || []).forEach((id) => conflictingSprIds.add(id));
      }
    });

    return sprs
      .filter((s) => !assignedIds.has(s.id))
      .map((spr) => {
        const hasDateConflict = conflictingSprIds.has(spr.id);
        const isUnavailable = spr.unavailabilities?.some((un) => {
          const uFrom = new Date(un.fromDate).getTime();
          const uTo = new Date(un.toDate).getTime();
          const rDate = new Date(targetDate).getTime();
          return rDate >= uFrom && rDate <= uTo;
        });
        return {
          spr,
          hasDateConflict,
          isUnavailable,
          eligible: !hasDateConflict && !isUnavailable,
        };
      })
      .sort((a, b) => {
        // Fewest duties first
        if (a.spr.totalDuties !== b.spr.totalDuties) {
          return a.spr.totalDuties - b.spr.totalDuties;
        }
        // Unused in cycle first
        if (a.spr.usedInCurrentCycle !== b.spr.usedInCurrentCycle) {
          return a.spr.usedInCurrentCycle ? 1 : -1;
        }
        return 0;
      });
  }, [sprs, currentRound, rounds]);

  // Filtered manual SPRs
  const filteredManualSprs = useMemo(() => {
    const query = manualSearch.toLowerCase().trim();
    const assignedIds = new Set(currentRound.assignedSprIds || []);
    const targetDate = (currentRound.date || '').trim();

    const conflictingSprIds = new Set<string>();
    rounds.forEach((r) => {
      if (r.id !== currentRound.id && r.date && r.date.trim() === targetDate) {
        (r.assignedSprIds || []).forEach((id) => conflictingSprIds.add(id));
      }
    });

    return sprs
      .filter((s) => {
        if (!query) return true;
        return (
          s.name.toLowerCase().includes(query) ||
          (s.sapId && s.sapId.toLowerCase().includes(query)) ||
          (s.branch && s.branch.toLowerCase().includes(query))
        );
      })
      .map((s) => ({
        spr: s,
        isAlreadyAssigned: assignedIds.has(s.id),
        hasConflict: conflictingSprIds.has(s.id),
      }));
  }, [sprs, manualSearch, currentRound, rounds]);

  const handleAutoAllot = () => {
    const target = autoTargetVenue === 'ALL' ? undefined : autoTargetVenue;
    const res = allocateSprsToRound(currentRound.id, autoCount, target);
    if (res.success) {
      setActionFeedback({ type: 'success', text: res.message || `Allotted ${res.count} SPRs!` });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback({ type: 'error', text: res.message || 'Could not allot SPRs.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const handleManualAssign = (sprId: string, chosenVenue?: string) => {
    const target = chosenVenue || manualTargetVenue || roundVenues[0];
    const res = assignSprManuallyToRound(currentRound.id, sprId, target);
    if (res.success) {
      setActionFeedback({ type: 'success', text: res.message || 'SPR assigned successfully.' });
      setTimeout(() => setActionFeedback(null), 4000);
    } else {
      setActionFeedback({ type: 'error', text: res.message || 'Failed to assign SPR.' });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  const onInitiateManualAssign = (spr: SPR) => {
    if (roundVenues.length > 1) {
      setSprToAssignVenue(spr);
    } else {
      handleManualAssign(spr.id, roundVenues[0]);
    }
  };

  const handleRemove = (sprId: string) => {
    const res = removeSprFromRound(currentRound.id, sprId);
    if (res.success) {
      setActionFeedback({ type: 'success', text: res.message || 'SPR unassigned.' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const handleReassignVenue = (sprId: string, newVenue: string) => {
    const res = reassignSprVenue(currentRound.id, sprId, newVenue);
    if (res.success) {
      setReassignSprId(null);
      setActionFeedback({ type: 'success', text: res.message || 'Venue updated.' });
      setTimeout(() => setActionFeedback(null), 3000);
    }
  };

  const totalAssignedCount = currentRound.assignedSprIds?.length || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center space-x-2 text-xs font-black text-amber-600 uppercase tracking-wider mb-1">
              <span>Round {currentRound.roundNumber}</span>
              <span>•</span>
              <span>{currentRound.companyName}</span>
            </div>
            <h3 className="text-xl font-black text-slate-900 tracking-tight">
              Manage SPR Allotments
            </h3>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Add SPRs manually or via fair rotation cycle, divided equally across venues.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 pt-3 border-b border-slate-200 bg-white flex items-center space-x-2">
          <button
            onClick={() => setActiveTab('auto')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'auto'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Auto Allot (By Cycle)</span>
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'manual'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Manual Selection</span>
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`flex items-center space-x-2 px-4 py-2.5 text-xs font-extrabold border-b-2 transition-all cursor-pointer ${
              activeTab === 'roster'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Current Roster ({totalAssignedCount})</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {actionFeedback && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs font-bold flex items-center space-x-2 animate-in fade-in ${
              actionFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {actionFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            <span>{actionFeedback.text}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* TAB 1: AUTO ALLOT */}
          {activeTab === 'auto' && (
            <div className="space-y-5">
              <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Fair Cycle Auto-Allotment
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                      Allots SPRs according to the strict UPES fairness cycle: SPRs with the lowest historical duties are prioritized, same-date conflicts are prevented, and duty is divided equally across venues.
                    </p>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    How many SPRs to add?
                  </label>
                  <div className="flex items-center space-x-2">
                    {[1, 2, 4, 6].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setAutoCount(num)}
                        className={`flex-1 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                          autoCount === num
                            ? 'bg-slate-900 text-amber-400 shadow-sm'
                            : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }`}
                      >
                        +{num}
                      </button>
                    ))}
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={autoCount}
                      onChange={(e) => setAutoCount(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-center"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 uppercase tracking-wider mb-1.5">
                    Assign to Venue
                  </label>
                  <select
                    value={autoTargetVenue}
                    onChange={(e) => setAutoTargetVenue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    <option value="ALL">✨ Divide Equally Across All Venues</option>
                    {roundVenues.map((v, i) => (
                      <option key={i} value={v}>
                        📍 Only {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Preview Next Candidates */}
              <div>
                <div className="text-xs font-extrabold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Next SPRs in Queue (Fair Order)</span>
                  <span className="text-[11px] text-amber-600 font-bold">
                    Cycle #{sprCycle.id}
                  </span>
                </div>
                <div className="bg-slate-50 rounded-2xl border border-slate-200/80 divide-y divide-slate-100 max-h-48 overflow-y-auto">
                  {nextInCyclePreview.slice(0, 6).map(({ spr, eligible, hasDateConflict }, idx) => (
                    <div
                      key={spr.id}
                      className="px-4 py-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center space-x-2.5">
                        <span className="w-5 h-5 rounded-md bg-white border border-slate-200 text-slate-600 font-black text-[10px] flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <div>
                          <span className="font-extrabold text-slate-900">{spr.name}</span>
                          <span className="text-slate-400 text-[11px] ml-2">({spr.sapId || 'N/A'})</span>
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <span className="text-[10px] bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-md font-bold">
                          {spr.totalDuties} duties
                        </span>
                        {hasDateConflict ? (
                          <span className="text-[10px] bg-red-100 text-red-700 px-2 py-0.5 rounded-md font-bold">
                            Date Clash
                          </span>
                        ) : spr.usedInCurrentCycle ? (
                          <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md font-bold">
                            Used in cycle
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-md font-bold">
                            Eligible Next
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Button */}
              <button
                onClick={handleAutoAllot}
                className="w-full bg-amber-500 hover:bg-amber-600 active:scale-98 text-slate-950 text-sm font-black py-3 rounded-2xl shadow-md transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>
                  Allot {autoCount} SPRs Automatically ({autoTargetVenue === 'ALL' ? 'Equally to all venues' : autoTargetVenue})
                </span>
              </button>
            </div>
          )}

          {/* TAB 2: MANUAL ALLOT */}
          {activeTab === 'manual' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={manualSearch}
                    onChange={(e) => setManualSearch(e.target.value)}
                    placeholder="Search SPR by name or SAP..."
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  />
                </div>

                <div>
                  <select
                    value={manualTargetVenue}
                    onChange={(e) => setManualTargetVenue(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/40"
                  >
                    {roundVenues.map((v, i) => (
                      <option key={i} value={v}>
                        Assign to: {v}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SPR List */}
              <div className="border border-slate-200 rounded-2xl divide-y divide-slate-100 max-h-72 overflow-y-auto">
                {filteredManualSprs.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    No matching SPR found.
                  </div>
                ) : (
                  filteredManualSprs.map(({ spr, isAlreadyAssigned, hasConflict }) => (
                    <div
                      key={spr.id}
                      className="px-4 py-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-slate-900 text-xs">{spr.name}</span>
                          <span className="text-[10px] text-slate-400">({spr.sapId || 'N/A'})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-2 mt-0.5">
                          <span>{spr.branch || 'B.Tech CSE'}</span>
                          <span>•</span>
                          <span>{spr.totalDuties} total duties</span>
                          {hasConflict && (
                            <span className="text-amber-600 font-bold">• Active duty on same date</span>
                          )}
                        </div>
                      </div>

                      {isAlreadyAssigned ? (
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Assigned
                        </span>
                      ) : (
                        <button
                          onClick={() => onInitiateManualAssign(spr)}
                          className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-white text-xs font-extrabold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Assign</span>
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CURRENT ROSTER BY VENUE */}
          {activeTab === 'roster' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>
                  Showing all SPRs allotted for <strong>{currentRound.name}</strong>
                </span>
                <span className="font-bold text-slate-700">
                  Total: {totalAssignedCount} SPRs
                </span>
              </div>

              {venueBreakdown.map((vb, vIdx) => (
                <div
                  key={vIdx}
                  className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs font-black text-slate-900">
                      <MapPin className="w-4 h-4 text-amber-500" />
                      <span>{vb.venue}</span>
                      <span className="bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md text-[10px] font-extrabold">
                        {vb.sprs.length} SPR{vb.sprs.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {vb.sprs.length === 0 ? (
                    <div className="text-xs text-slate-400 italic py-2">
                      No SPRs allotted to this venue yet.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {vb.sprs.map((spr) => (
                        <div
                          key={spr.id}
                          className="bg-white p-3 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs"
                        >
                          <div>
                            <div className="text-xs font-black text-slate-900">{spr.name}</div>
                            <div className="text-[11px] text-slate-400">
                              SAP: {spr.sapId || spr.id} • {spr.branch || 'B.Tech CSE'}
                            </div>
                          </div>

                          <div className="flex items-center space-x-1.5">
                            {/* Move Venue Button */}
                            {roundVenues.length > 1 && (
                              <div className="relative">
                                {reassignSprId === spr.id ? (
                                  <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl">
                                    {roundVenues
                                      .filter((v) => v !== vb.venue)
                                      .map((v, i) => (
                                        <button
                                          key={i}
                                          onClick={() => handleReassignVenue(spr.id, v)}
                                          className="text-[10px] font-bold bg-white text-slate-800 hover:bg-amber-500 hover:text-slate-950 px-2 py-1 rounded-lg transition-all"
                                        >
                                          Move to {v}
                                        </button>
                                      ))}
                                    <button
                                      onClick={() => setReassignSprId(null)}
                                      className="text-xs text-slate-400 hover:text-slate-600 px-1"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setReassignSprId(spr.id)}
                                    title="Move to another venue"
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                                  >
                                    <MoveRight className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Remove button */}
                            <button
                              onClick={() => handleRemove(spr.id)}
                              title="Unassign SPR"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-semibold">
            {totalAssignedCount} SPR(s) assigned across {roundVenues.length} venue(s).
          </div>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>

      {/* Dedicated Venue Selection Prompt when manually assigning */}
      {sprToAssignVenue && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl border border-slate-200 p-6 space-y-5 animate-in zoom-in-95">
            <div className="flex items-start justify-between">
              <div>
                <div className="text-[11px] font-black text-amber-600 uppercase tracking-wider mb-0.5">
                  Select Venue • Round {currentRound.roundNumber}
                </div>
                <h4 className="text-lg font-black text-slate-900">
                  Assign {sprToAssignVenue.name}
                </h4>
                <p className="text-xs text-slate-500 mt-1">
                  Which venue in <strong>{currentRound.name}</strong> should <strong>{sprToAssignVenue.name}</strong> be assigned to?
                </p>
              </div>
              <button
                onClick={() => setSprToAssignVenue(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Venue selection options */}
            <div className="space-y-2.5">
              {roundVenues.map((venueName) => {
                const countInVenue = venueBreakdown.find((vb) => vb.venue === venueName)?.sprs.length || 0;
                return (
                  <button
                    key={venueName}
                    type="button"
                    onClick={() => {
                      const sprId = sprToAssignVenue.id;
                      setSprToAssignVenue(null);
                      handleManualAssign(sprId, venueName);
                    }}
                    className="w-full flex items-center justify-between p-3.5 rounded-2xl border-2 border-slate-200 hover:border-amber-500 hover:bg-amber-50/60 transition-all text-left cursor-pointer group"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-amber-500 group-hover:text-slate-950 flex items-center justify-center text-slate-700 font-bold transition-colors">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900 group-hover:text-amber-950">
                          {venueName}
                        </div>
                        <div className="text-[11px] font-semibold text-slate-400 group-hover:text-amber-800/80">
                          Currently assigned: {countInVenue} SPR{countInVenue === 1 ? '' : 's'}
                        </div>
                      </div>
                    </div>
                    <span className="text-xs font-black text-slate-700 group-hover:text-slate-950 bg-slate-100 group-hover:bg-amber-400 px-3 py-1.5 rounded-xl transition-colors">
                      Assign Here →
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setSprToAssignVenue(null)}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
