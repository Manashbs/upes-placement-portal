import React, { useState, useMemo } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Company, Round } from '../../types';
import {
  exportCompanyDutyListExcel,
  generateWhatsAppDutyRoster,
  getRoundVenueBreakdown,
} from '../../utils/dutyListExporter';
import {
  X,
  Download,
  Printer,
  Copy,
  Check,
  Building2,
  Calendar,
  MapPin,
  Clock,
  Users,
  FileSpreadsheet,
  Share2,
} from 'lucide-react';

interface DutyListModalProps {
  company: Company;
  onClose: () => void;
}

export const DutyListModal: React.FC<DutyListModalProps> = ({ company, onClose }) => {
  const { rounds, dutyAssignments, sprs } = usePortal();
  const [copied, setCopied] = useState(false);

  // Rounds for this company sorted sequentially Round 1, Round 2, ...
  const compRounds = useMemo(() => {
    return rounds
      .filter((r) => r.companyId === company.id || r.companyName === company.name)
      .sort((a, b) => (a.roundNumber || 0) - (b.roundNumber || 0));
  }, [rounds, company]);

  // Overall totals
  const totalAssignedSprs = useMemo(() => {
    return compRounds.reduce((acc, r) => acc + (r.assignedSprIds?.length || 0), 0);
  }, [compRounds]);

  const allVenues = useMemo(() => {
    const list: string[] = [];
    compRounds.forEach((r) => {
      if (r.venues && r.venues.length > 0) {
        list.push(...r.venues);
      } else if (r.venue) {
        list.push(...r.venue.split(',').map((v) => v.trim()).filter(Boolean));
      }
    });
    return Array.from(new Set(list));
  }, [compRounds]);

  const handleDownloadExcel = () => {
    exportCompanyDutyListExcel({
      company,
      rounds,
      dutyAssignments,
      sprs,
    });
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppDutyRoster({
      company,
      rounds,
      dutyAssignments,
      sprs,
    });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in select-none">
      <div className="bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 rounded-2xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-sm">
              {company.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center space-x-2 text-[11px] font-black text-amber-600 uppercase tracking-wider">
                <span>UPES Placement Portal</span>
                <span>•</span>
                <span>Official SPR Duty Roster</span>
              </div>
              <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                {company.name} Duty List
              </h3>
              <div className="text-xs text-slate-500 font-bold flex items-center space-x-2 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{compRounds[0]?.date || 'Drive Day'}</span>
                <span>•</span>
                <span>{compRounds.length} Rounds</span>
                <span>•</span>
                <span>{allVenues.length} Venues</span>
                <span>•</span>
                <span className="text-amber-600 font-black">{totalAssignedSprs} Total SPRs</span>
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="px-6 py-3 bg-white border-b border-slate-100 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownloadExcel}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-black px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Download Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleCopyWhatsApp}
              className="inline-flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-800 text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copied ? 'Copied Roster!' : 'Copy for WhatsApp'}</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="inline-flex items-center space-x-1.5 bg-slate-900 hover:bg-slate-800 active:scale-95 text-white text-xs font-bold px-3.5 py-2 rounded-xl transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Duty Roster</span>
          </button>
        </div>

        {/* Content / Duty Roster View */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 bg-slate-50/40 print:p-0 print:bg-white">
          {compRounds.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-sm">
              No rounds scheduled for {company.name} yet.
            </div>
          ) : (
            compRounds.map((rnd) => {
              const breakdown = getRoundVenueBreakdown(rnd, dutyAssignments, sprs);
              const roundSprCount = rnd.assignedSprIds?.length || 0;
              const cleanRoundName = rnd.name
                .replace(new RegExp(`^Round\\s*${rnd.roundNumber}\\s*[:\\-]?\\s*`, 'i'), '')
                .trim();

              return (
                <div
                  key={rnd.id}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs"
                >
                  {/* Round Header */}
                  <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center">
                        R{rnd.roundNumber}
                      </span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        Round {rnd.roundNumber}: {cleanRoundName || rnd.name}
                      </span>
                    </div>

                    <div className="text-xs text-amber-600 font-extrabold">
                      {roundSprCount} SPR{roundSprCount === 1 ? '' : 's'} Allotted
                    </div>
                  </div>

                  {/* Venues Grid with Assigned SPRs */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {breakdown.map((bg, bIdx) => (
                      <div
                        key={bIdx}
                        className="bg-slate-50/60 rounded-xl p-3.5 border border-slate-200/70 space-y-2.5"
                      >
                        <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60">
                          <div className="flex items-center space-x-1.5 text-xs font-black text-slate-800">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            <span>{bg.venue}</span>
                          </div>
                          <span className="text-[10px] bg-white border border-slate-200 text-slate-600 font-black px-2 py-0.5 rounded-md">
                            {bg.sprs.length} SPR{bg.sprs.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {bg.sprs.length === 0 ? (
                          <div className="text-[11px] text-slate-400 italic py-1">
                            No SPRs assigned to this venue yet.
                          </div>
                        ) : (
                          <div className="space-y-1.5">
                            {bg.sprs.map((spr, sIdx) => (
                              <div
                                key={sIdx}
                                className="bg-white px-3 py-2 rounded-xl border border-slate-200/80 flex items-center justify-between shadow-2xs"
                              >
                                <div className="text-xs font-extrabold text-slate-900">
                                  {spr.name}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-xs text-slate-500 font-medium">
            Duty list is synchronized live with Career Services SPR Rotation Cycle.
          </div>
          <button
            onClick={onClose}
            className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-extrabold px-5 py-2 rounded-xl transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
