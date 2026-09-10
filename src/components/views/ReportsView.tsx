import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { BarChart3, Download, FileSpreadsheet, Sparkles, CheckCircle2, TrendingUp } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ReportsView: React.FC = () => {
  const { companies, students, offers, rounds } = usePortal();

  const handleExportNaacReport = () => {
    const data = [
      { Metric: 'Total Eligible Batch Size (2026)', Value: students.length },
      { Metric: 'Total Placed Students', Value: students.filter((s) => s.status === 'PLACED').length },
      { Metric: 'Overall Placement Percentage', Value: `${Math.round((students.filter((s) => s.status === 'PLACED').length / (students.length || 1)) * 100)}%` },
      { Metric: 'Highest CTC (LPA)', Value: '42.0 LPA (Microsoft)' },
      { Metric: 'Average CTC (LPA)', Value: '8.4 LPA' },
      { Metric: 'Median CTC (LPA)', Value: '9.5 LPA' },
      { Metric: 'Total Companies Visited', Value: companies.length },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'NIRF_NAAC_Placement_Summary');
    XLSX.writeFile(workbook, 'UPES_NIRF_NAAC_Accreditation_Report_2026.xlsx');
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            ACCREDITATION & ANALYTICS
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Reports & NAAC Submissions
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-3xl">
            Export NIRF/NAAC accreditation placement data, company funnel progression, and SPR duty distribution.
          </p>
        </div>

        <button
          onClick={handleExportNaacReport}
          className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-sm font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
        >
          <FileSpreadsheet className="w-4 h-4 text-amber-400" />
          <span>Export NAAC / NIRF Excel Report</span>
        </button>
      </div>

      {/* Funnel Lineage Cards */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-6">
        <h3 className="text-lg font-extrabold text-slate-900">Season Placement Funnel</h3>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
            <div className="text-xs font-bold text-slate-400 uppercase">1. Eligible Pool</div>
            <div className="text-3xl font-extrabold text-slate-900 mt-2">1,245</div>
            <div className="text-[10px] text-slate-500 mt-1">Pre-filtered by CGPA/Backlogs</div>
          </div>

          <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
            <div className="text-xs font-bold text-blue-700 uppercase">2. Test Attended</div>
            <div className="text-3xl font-extrabold text-blue-900 mt-2">1,103</div>
            <div className="text-[10px] text-blue-700 mt-1">88.5% OA Attendance</div>
          </div>

          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
            <div className="text-xs font-bold text-amber-800 uppercase">3. Shortlisted R2</div>
            <div className="text-3xl font-extrabold text-amber-900 mt-2">180</div>
            <div className="text-[10px] text-amber-800 mt-1">Technical Interview</div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
            <div className="text-xs font-bold text-emerald-800 uppercase">4. Offers Accepted</div>
            <div className="text-3xl font-extrabold text-emerald-900 mt-2">64</div>
            <div className="text-[10px] text-emerald-800 mt-1">Final Selections</div>
          </div>
        </div>
      </div>
    </div>
  );
};
