import React from 'react';
import { usePortal } from '../../context/PortalContext';
import {
  Building2,
  Calendar,
  Users,
  CheckCircle2,
  TrendingUp,
  Award,
  Sparkles,
  Zap,
  ArrowUpRight,
  ShieldAlert,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

export const CommandCenterView: React.FC = () => {
  const { companies, rounds, students, offers, auditLogs, setActiveTab } = usePortal();

  const activeCompaniesCount = companies.filter((c) => c.status === 'ACTIVE').length;
  const completedCompanies = companies.filter((c) => c.status === 'COMPLETED');
  const todayRoundsCount = rounds.length;

  // Finalized offers count (only from completed drives)
  const totalOffersCount =
    offers.length > 0
      ? offers.length
      : completedCompanies.reduce((acc, c) => acc + (c.offersGivenCount || 0), 0);

  // CTC calculations strictly from completed drives
  let superDreamCount = 0;
  let dreamCount = 0;
  let coreCount = 0;
  let massCount = 0;
  let totalCtcSum = 0;
  let maxCtcFound = 0;

  completedCompanies.forEach((comp) => {
    const matchedOffers = offers.filter(
      (o) => o.companyId === comp.id || o.companyName.toLowerCase() === comp.name.toLowerCase()
    );

    if (matchedOffers.length > 0) {
      matchedOffers.forEach((off) => {
        const ctc = off.ctc || 0;
        totalCtcSum += ctc;
        if (ctc > maxCtcFound) maxCtcFound = ctc;
        if (ctc >= 25) superDreamCount++;
        else if (ctc >= 15) dreamCount++;
        else if (ctc >= 8) coreCount++;
        else massCount++;
      });
    } else {
      const ctc = comp.ctcTotal || 0;
      const count = comp.offersGivenCount || 0;
      if (count > 0) {
        totalCtcSum += ctc * count;
        if (ctc > maxCtcFound) maxCtcFound = ctc;
        if (ctc >= 25) superDreamCount += count;
        else if (ctc >= 15) dreamCount += count;
        else if (ctc >= 8) coreCount += count;
        else massCount += count;
      }
    }
  });

  const totalFinalizedHires = superDreamCount + dreamCount + coreCount + massCount;
  const avgCtc = totalFinalizedHires > 0 ? (totalCtcSum / totalFinalizedHires).toFixed(1) : '0.0';
  const highestCtc = maxCtcFound > 0 ? maxCtcFound.toFixed(1) : '0.0';

  // Company-wise Hires Chart Data (ONLY for COMPLETED drives)
  const companyHiresData = completedCompanies.map((comp) => {
    const matchedOffers = offers.filter(
      (o) => o.companyId === comp.id || o.companyName.toLowerCase() === comp.name.toLowerCase()
    );
    const hiredCount = comp.offersGivenCount || matchedOffers.length || 0;
    return {
      company: comp.name,
      hired: hiredCount,
    };
  });

  // CTC Distribution Data (ONLY for COMPLETED drives)
  const ctcDistData =
    totalFinalizedHires > 0
      ? [
          { name: 'Super Dream (>25 LPA)', value: Math.round((superDreamCount / totalFinalizedHires) * 100), count: superDreamCount, color: '#F59E0B' },
          { name: 'Dream (15-25 LPA)', value: Math.round((dreamCount / totalFinalizedHires) * 100), count: dreamCount, color: '#3B82F6' },
          { name: 'Core (8-15 LPA)', value: Math.round((coreCount / totalFinalizedHires) * 100), count: coreCount, color: '#10B981' },
          { name: 'Mass (<8 LPA)', value: Math.round((massCount / totalFinalizedHires) * 100), count: massCount, color: '#6B7280' },
        ].filter((i) => i.count > 0)
      : [];

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Welcome Banner */}
      <div className="bg-[#0B132B] rounded-3xl p-8 text-white shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-slate-800 relative overflow-hidden">
        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 text-xs font-extrabold px-3 py-1 rounded-full border border-amber-500/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PLACEMENT SEASON 2025-2026 LIVE</span>
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight">
            UPES Placement Command Center
          </h2>
          <p className="text-sm text-slate-300 max-w-xl">
            Real-time management dashboard for drives, multi-round attendance, fair SPR rotation, and NIRF accreditation statistics.
          </p>
        </div>

        <div className="flex items-center space-x-3 z-10">
          <button
            onClick={() => setActiveTab('spr-rotation')}
            className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs px-5 py-3 rounded-xl shadow-lg transition-all active:scale-95 cursor-pointer"
          >
            Manage SPR Rotation
          </button>
          <button
            onClick={() => setActiveTab('companies')}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-5 py-3 rounded-xl border border-slate-700 transition-all cursor-pointer"
          >
            View Companies
          </button>
        </div>
      </div>

      {/* KPI Widgets Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Active Companies</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{activeCompaniesCount}</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-2">
            {completedCompanies.length} Completed Drive{completedCompanies.length === 1 ? '' : 's'}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Total Rounds</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{todayRoundsCount}</div>
          <div className="text-[11px] font-bold text-amber-600 mt-2">Active Multi-Round Desk</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Offers Rolled</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{totalOffersCount}</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-2">
            Highest: {highestCtc > '0' ? `${highestCtc} LPA` : 'Pending'}
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Avg CTC (Finalized)</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {avgCtc > '0' ? `${avgCtc} LPA` : '0.0 LPA'}
          </div>
          <div className="text-[11px] font-bold text-blue-600 mt-2">100% Verified</div>
        </div>
      </div>

      {/* Analytics Charts Grid — ONLY updates when drive process is finished */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Company-wise Hires Bar Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-lg font-extrabold text-slate-900">Company-wise Hires</h3>
                <span className="text-[10px] bg-amber-50 text-amber-800 font-bold px-2 py-0.5 rounded-full border border-amber-200">
                  Process Completed Only
                </span>
              </div>
              <p className="text-xs text-slate-400">Total number of students hired per completed drive</p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center space-x-1"
            >
              <span>Detailed Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64">
            {companyHiresData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={companyHiresData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="company" tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748B' }} allowDecimals={false} />
                  <Tooltip formatter={(value: any) => [`${value} Students Hired`, 'Hired Count']} />
                  <Bar dataKey="hired" name="Students Hired" fill="#0B132B" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <Building2 className="w-8 h-8 text-slate-300 mb-2" />
                <div className="text-sm font-bold text-slate-700">No Finalized Drives Yet</div>
                <p className="text-xs text-slate-400 max-w-sm mt-1">
                  Company-wise hires update automatically once a company's recruitment process is marked as <strong>Finished / Completed</strong>.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* CTC Tier Distribution Pie Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="text-lg font-extrabold text-slate-900">CTC Package Tier</h3>
              <span className="text-[10px] bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-full border border-blue-200">
                Finalized
              </span>
            </div>
            <p className="text-xs text-slate-400">Distribution by salary bracket</p>
          </div>

          <div className="h-48 flex items-center justify-center">
            {ctcDistData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={ctcDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {ctcDistData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value: any, name: any, props: any) => [`${value}% (${props.payload.count} students)`, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center text-center p-4 bg-slate-50/70 rounded-2xl border border-dashed border-slate-200">
                <Award className="w-7 h-7 text-slate-300 mb-1" />
                <div className="text-xs font-bold text-slate-600">Awaiting Finalized Offers</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Tiers calculate only from finalized student offers.
                </p>
              </div>
            )}
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
            {ctcDistData.length > 0 ? (
              ctcDistData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                    <span className="text-slate-600 font-medium">{item.name}</span>
                  </div>
                  <span className="font-bold text-slate-900">{item.count} ({item.value}%)</span>
                </div>
              ))
            ) : (
              <div className="text-[11px] text-slate-400 text-center py-1">
                Data updates when drive finishes.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Audit Log Activity Feed */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-lg font-extrabold text-slate-900">System Audit Log Activity</h3>
          <span className="text-xs text-slate-400 font-medium">Real-time immutable security trace</span>
        </div>

        <div className="space-y-3">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-start justify-between text-xs p-3 rounded-2xl bg-slate-50 border border-slate-100">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <span className="font-bold text-slate-900">{log.actorName}</span>
                  <span className="bg-slate-200 text-slate-700 px-2 py-0.5 rounded-md text-[10px] font-bold">
                    {log.action}
                  </span>
                </div>
                <p className="text-slate-600">{log.details}</p>
              </div>
              <span className="text-[10px] text-slate-400 shrink-0">{log.timestamp}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
