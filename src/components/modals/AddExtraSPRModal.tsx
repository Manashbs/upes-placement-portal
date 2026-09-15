import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Round } from '../../types';
import {
  Users,
  Shuffle,
  UserCheck,
  CheckCircle2,
  X,
  Building2,
  Sparkles,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface AddExtraSPRModalProps {
  isOpen: boolean;
  onClose: () => void;
  round: Round | null;
}

export const AddExtraSPRModal: React.FC<AddExtraSPRModalProps> = ({
  isOpen,
  onClose,
  round,
}) => {
  const { sprs, allotExtraSPRs } = usePortal();

  const [mode, setMode] = useState<'MANUAL' | 'RANDOM'>('MANUAL');
  const [randomCount, setRandomCount] = useState<number>(2);

  // Manual Selection state: Map of sprId -> venueName
  const [selectedSprVenues, setSelectedSprVenues] = useState<Record<string, string>>({});
  const [searchFilter, setSearchFilter] = useState('');
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  if (!isOpen || !round) return null;

  const venuesList = round.venue
    ? round.venue.split('|').map((v) => v.trim()).filter(Boolean)
    : ['Main Venue'];

  const filteredSprs = sprs.filter((s) => {
    const q = searchFilter.toLowerCase();
    return s.name.toLowerCase().includes(q) || s.sapId.includes(q) || s.branch.toLowerCase().includes(q);
  });

  const handleToggleSprSelection = (sprId: string) => {
    setSelectedSprVenues((prev) => {
      const next = { ...prev };
      if (next[sprId]) {
        delete next[sprId];
      } else {
        next[sprId] = venuesList[0] || 'Main Venue';
      }
      return next;
    });
  };

  const handleVenueChangeForSpr = (sprId: string, venue: string) => {
    setSelectedSprVenues((prev) => ({
      ...prev,
      [sprId]: venue,
    }));
  };

  const handleAllotSubmit = () => {
    setFeedbackMsg(null);

    if (mode === 'MANUAL') {
      const selectedEntries = Object.entries(selectedSprVenues).map(([sprId, venue]) => ({
        sprId,
        venue,
      }));

      if (selectedEntries.length === 0) {
        setFeedbackMsg({ type: 'error', text: 'Please select at least one SPR of your choice.' });
        return;
      }

      const res = allotExtraSPRs(round.id, 'MANUAL', undefined, selectedEntries);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message });
        setTimeout(() => {
          onClose();
          setFeedbackMsg(null);
          setSelectedSprVenues({});
        }, 1200);
      } else {
        setFeedbackMsg({ type: 'error', text: res.message });
      }
    } else {
      // RANDOM MODE
      const res = allotExtraSPRs(round.id, 'RANDOM', randomCount);
      if (res.success) {
        setFeedbackMsg({ type: 'success', text: res.message });
        setTimeout(() => {
          onClose();
          setFeedbackMsg(null);
        }, 1200);
      } else {
        setFeedbackMsg({ type: 'error', text: res.message });
      }
    }
  };

  // Preview venue split for random allocation
  const getRandomVenuePreview = () => {
    const base = Math.floor(randomCount / venuesList.length);
    const remainder = randomCount % venuesList.length;
    return venuesList.map((v, idx) => ({
      venue: v,
      count: base + (idx < remainder ? 1 : 0),
    }));
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 select-none">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-100 overflow-hidden">
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-extrabold flex items-center justify-center shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-slate-900 tracking-tight">
                Allot Extra SPR Duties
              </h3>
              <p className="text-xs text-slate-400 font-semibold">
                {round.companyName} · {round.name} ({venuesList.length} Venues)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* Mode Selection Tabs */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Choose Allocation Method
            </label>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setMode('MANUAL')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  mode === 'MANUAL'
                    ? 'border-amber-400 bg-amber-50/60 ring-2 ring-amber-400/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    mode === 'MANUAL' ? 'bg-amber-500 text-slate-950' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">Of Our Choice (Manual)</div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                    Select specific SPRs and assign them to chosen venues manually.
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setMode('RANDOM')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex items-start space-x-3 ${
                  mode === 'RANDOM'
                    ? 'border-emerald-400 bg-emerald-50/60 ring-2 ring-emerald-400/30 shadow-xs'
                    : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold shrink-0 ${
                    mode === 'RANDOM' ? 'bg-emerald-500 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">Random System Allocation</div>
                  <div className="text-[11px] font-medium text-slate-500 mt-0.5">
                    System picks eligible SPRs and divides them venue-wise equally.
                  </div>
                </div>
              </button>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedbackMsg && (
            <div
              className={`p-3.5 rounded-2xl text-xs font-bold border flex items-center space-x-2 ${
                feedbackMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-rose-50 text-rose-800 border-rose-200'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>{feedbackMsg.text}</span>
            </div>
          )}

          {/* MODE 1: MANUAL SELECTION */}
          {mode === 'MANUAL' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Search SPR by name, SAP ID, branch..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-semibold outline-none focus:ring-2 focus:ring-amber-400 w-full"
                />

                <span className="text-[11px] font-extrabold text-slate-500 bg-slate-100 px-3 py-1.5 rounded-xl shrink-0">
                  {Object.keys(selectedSprVenues).length} SPRs Selected
                </span>
              </div>

              <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-64 overflow-y-auto divide-y divide-slate-100">
                {filteredSprs.map((spr) => {
                  const isSelected = !!selectedSprVenues[spr.id];
                  const alreadyAssigned = round.assignedSprIds?.includes(spr.id);

                  return (
                    <div
                      key={spr.id}
                      className={`p-3 flex items-center justify-between transition-colors ${
                        isSelected ? 'bg-amber-50/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSprSelection(spr.id)}
                          className="w-4 h-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                        />

                        <div>
                          <div className="font-extrabold text-slate-900 text-xs flex items-center space-x-2">
                            <span>{spr.name}</span>
                            {alreadyAssigned && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-extrabold">
                                Already Assigned
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 font-mono">
                            SAP: {spr.sapId} · {spr.branch} · Total Duties: {spr.totalDuties}
                          </div>
                        </div>
                      </div>

                      {isSelected && (
                        <div className="flex items-center space-x-2">
                          <span className="text-[10px] font-bold text-slate-400">Allot to:</span>
                          <select
                            value={selectedSprVenues[spr.id]}
                            onChange={(e) => handleVenueChangeForSpr(spr.id, e.target.value)}
                            className="bg-white border border-slate-200 rounded-lg text-xs font-bold px-2 py-1 outline-none text-slate-800"
                          >
                            {venuesList.map((v, i) => (
                              <option key={i} value={v}>
                                {v}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* MODE 2: RANDOM SYSTEM ALLOCATION */}
          {mode === 'RANDOM' && (
            <div className="space-y-5 bg-emerald-50/50 p-5 rounded-2xl border border-emerald-100">
              <div className="flex items-center justify-between">
                <div>
                  <label className="font-extrabold text-slate-900 text-xs block">
                    Number of Extra SPRs to Allot Randomly
                  </label>
                  <p className="text-[11px] text-slate-500 font-medium">
                    System evaluates eligible SPRs and balances venue duties equally.
                  </p>
                </div>

                <input
                  type="number"
                  min={1}
                  max={15}
                  value={randomCount}
                  onChange={(e) => setRandomCount(Math.max(1, Math.min(15, Number(e.target.value))))}
                  className="w-20 bg-white border border-emerald-300 rounded-xl p-2.5 font-extrabold text-center text-sm outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* Venue-Wise Breakdown Preview */}
              <div className="space-y-2 pt-2 border-t border-emerald-200/60">
                <div className="text-[11px] font-extrabold text-emerald-900 uppercase tracking-wider flex items-center space-x-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Calculated Equal Distribution Across {venuesList.length} Venues:</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {getRandomVenuePreview().map((vPrev, idx) => (
                    <div
                      key={idx}
                      className="bg-white p-2.5 rounded-xl border border-emerald-200/80 flex items-center justify-between text-xs"
                    >
                      <span className="font-bold text-slate-700 truncate">{vPrev.venue}</span>
                      <span className="font-extrabold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded-md text-[10px]">
                        +{vPrev.count} Extra SPRs
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleAllotSubmit}
            className={`px-5 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition-all active:scale-95 cursor-pointer flex items-center space-x-2 ${
              mode === 'MANUAL'
                ? 'bg-amber-500 hover:bg-amber-600 text-slate-950'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {mode === 'MANUAL'
                ? `Confirm ${Object.keys(selectedSprVenues).length} Extra SPR Allotments`
                : `Allot ${randomCount} Extra SPRs Venue-Wise`}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
