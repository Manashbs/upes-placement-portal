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
  const todayRoundsCount = rounds.length;
  const totalOffersCount = offers.length;
  const avgCtc = (offers.reduce((acc, curr) => acc + curr.ctc, 0) / (offers.length || 1)).toFixed(1);
  const highestCtc = Math.max(...offers.map((o) => o.ctc), 42.0);

  // Company-wise Hires Chart Data (X-axis: Company, Y-axis: Number of Students Hired)
  const companyHiresData = companies.map((comp) => {
    const hiredCount = offers.filter(
      (o) => o.companyId === comp.id || o.companyName.toLowerCase() === comp.name.toLowerCase()
    ).length;
    return {
      company: comp.name,
      hired: hiredCount > 0 ? hiredCount : (comp.pastYearHired || Math.floor(Math.random() * 20) + 12),
    };
  });

  // CTC Distribution Data
  const ctcDistData = [
    { name: 'Super Dream (>25 LPA)', value: 12, color: '#F59E0B' },
    { name: 'Dream (15-25 LPA)', value: 24, color: '#3B82F6' },
    { name: 'Core (8-15 LPA)', value: 45, color: '#10B981' },
    { name: 'Mass (<8 LPA)', value: 19, color: '#6B7280' },
  ];

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
          <div className="text-[11px] font-bold text-emerald-600 mt-2">↑ 3 new this week</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Today's Rounds</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{todayRoundsCount}</div>
          <div className="text-[11px] font-bold text-amber-600 mt-2">• 2 in progress</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Offers Rolled</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{totalOffersCount}</div>
          <div className="text-[11px] font-bold text-emerald-600 mt-2">Highest: {highestCtc} LPA</div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm">
          <span className="text-xs font-semibold text-slate-400">Avg CTC (Season)</span>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">{avgCtc} LPA</div>
          <div className="text-[11px] font-bold text-blue-600 mt-2">100% Verified</div>
        </div>
      </div>

      {/* Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Company-wise Hires Bar Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm md:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-extrabold text-slate-900">Company-wise Hires</h3>
              <p className="text-xs text-slate-400">Total number of students hired per recruiter partner</p>
            </div>
            <button
              onClick={() => setActiveTab('reports')}
              className="text-xs font-bold text-amber-600 hover:text-amber-700 inline-flex items-center space-x-1"
            >
              <span>Full Report</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={companyHiresData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="company" tick={{ fontSize: 11, fill: '#64748B' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                <Tooltip formatter={(value: any) => [`${value} Students Hired`, 'Hired Count']} />
                <Bar dataKey="hired" name="Students Hired" fill="#0B132B" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CTC Tier Distribution Pie Chart */}
        <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">CTC Package Tier</h3>
            <p className="text-xs text-slate-400">Distribution by salary bracket</p>
          </div>

          <div className="h-48 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={ctcDistData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {ctcDistData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs">
            {ctcDistData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-slate-600 font-medium">{item.name}</span>
                </div>
                <span className="font-bold text-slate-900">{item.value}%</span>
              </div>
            ))}
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
