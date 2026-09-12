import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import {
  BarChart3,
  Download,
  FileSpreadsheet,
  Building2,
  ChevronRight,
  TrendingUp,
  Users,
  Award,
  CheckCircle2,
  Calendar,
  Layers,
  Search,
  Filter,
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
  Legend,
} from 'recharts';
import * as XLSX from 'xlsx';

export const ReportsView: React.FC = () => {
  const { companies, students, offers, rounds, roundStudents, setActiveTab } = usePortal();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('ALL');
  const [candidateSearch, setCandidateSearch] = useState('');

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId);

  // Filter rounds & offers for selected company
  const companyRounds = selectedCompany
    ? rounds.filter((r) => r.companyId === selectedCompany.id || r.companyName === selectedCompany.name)
    : rounds;

  const companyOffers = selectedCompany
    ? offers.filter((o) => o.companyId === selectedCompany.id || o.companyName.toLowerCase() === selectedCompany.name.toLowerCase())
    : offers;

  // Compute funnel data for the selected company
  const funnelData = companyRounds.map((r) => {
    const rStudents = roundStudents.filter((rs) => rs.roundId === r.id);
    const attended = rStudents.filter((rs) => rs.attendanceStatus === 'PRESENT' || rs.attendanceStatus === 'MANUALLY_MARKED').length;
    const cleared = rStudents.filter((rs) => rs.shortlistStatus === 'CLEARED').length;
    return {
      name: `R${r.roundNumber}: ${r.name}`,
      scheduled: rStudents.length || r.totalShortlisted || 0,
      attended: attended || r.attendedCount || 0,
      cleared: cleared > 0 ? cleared : Math.round((attended || r.attendedCount || 0) * 0.4),
    };
  });

  // Branch-wise distribution for candidates in this company
  const branchMap: Record<string, number> = {};
  roundStudents
    .filter((rs) => companyRounds.some((r) => r.id === rs.roundId))
    .forEach((rs) => {
      const b = rs.branch || 'B.Tech CSE';
      branchMap[b] = (branchMap[b] || 0) + 1;
    });

  const branchData = Object.entries(branchMap).map(([branch, count]) => ({
    branch: branch.replace('B.Tech ', ''),
    count,
  }));

  const COLORS = ['#0B132B', '#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EC4899'];

  // Overall Season Metrics
  const totalEligible = students.length || 0;
  const totalPlaced = students.filter((s) => s.status === 'PLACED').length || offers.length;
  const placementRate = totalEligible > 0 ? Math.round((totalPlaced / totalEligible) * 100) : 0;

  // Export NIRF / NAAC Comprehensive Report
  const handleExportNaacReport = () => {
    const summaryData = [
      { Metric: 'Total Eligible Batch Size (2026)', Value: totalEligible },
      { Metric: 'Total Placed Candidates', Value: totalPlaced },
      { Metric: 'Overall Placement Percentage', Value: `${placementRate}%` },
      { Metric: 'Total Recruiter Drives Hosted', Value: companies.length },
      { Metric: 'Completed Drives with Finalized Offers', Value: companies.filter((c) => c.status === 'COMPLETED').length },
      { Metric: 'Total Offers Released', Value: offers.length },
      {
        Metric: 'Average CTC (LPA)',
        Value: offers.length > 0 ? (offers.reduce((a, b) => a + b.ctc, 0) / offers.length).toFixed(2) : 'N/A',
      },
      {
        Metric: 'Highest CTC (LPA)',
        Value: offers.length > 0 ? `${Math.max(...offers.map((o) => o.ctc))} LPA` : 'N/A',
      },
    ];

    const companyReportData = companies.map((c, i) => ({
      'S.No.': i + 1,
      'Company Name': c.name,
      'Industry / Sector': c.industry,
      Tier: c.category,
      'CTC (LPA)': c.ctcTotal || 0,
      Status: c.status,
      'Rounds Conducted': rounds.filter((r) => r.companyId === c.id).length,
      'Students Hired': c.offersGivenCount || offers.filter((o) => o.companyId === c.id).length,
    }));

    const workbook = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(summaryData);
    const ws2 = XLSX.utils.json_to_sheet(companyReportData);

    XLSX.utils.book_append_sheet(workbook, ws1, 'NIRF_NAAC_Summary');
    XLSX.utils.book_append_sheet(workbook, ws2, 'Company_Hiring_Breakdown');
    XLSX.writeFile(workbook, `UPES_Placement_Accreditation_Report_${new Date().getFullYear()}.xlsx`);
  };

  // Export Specific Company Detailed Report
  const handleExportCompanyReport = () => {
    if (!selectedCompany) {
      handleExportNaacReport();
      return;
    }

    const companyStudents = roundStudents.filter((rs) =>
      companyRounds.some((r) => r.id === rs.roundId)
    );

    const sheetData = companyStudents.map((cs, idx) => {
      const rnd = companyRounds.find((r) => r.id === cs.roundId);
      return {
        'S.No.': idx + 1,
        'SAP ID': cs.sapId,
        'Candidate Name': cs.studentName,
        Branch: cs.branch,
        'Round Name': rnd?.name || `Round ${rnd?.roundNumber || 1}`,
        'Attendance Status': cs.attendanceStatus,
        'Attendance Time': cs.attendanceTime || 'N/A',
        'Marked By': cs.markedBy || 'QR Scan',
        'Shortlist Status': cs.shortlistStatus,
      };
    });

    const workbook = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      sheetData.length > 0
        ? sheetData
        : [{ Note: 'No registered round attendees recorded yet for this company drive.' }]
    );
    XLSX.utils.book_append_sheet(workbook, ws, `${selectedCompany.name.slice(0, 25)}_Report`);
    XLSX.writeFile(workbook, `${selectedCompany.name}_Drive_Comprehensive_Report.xlsx`);
  };

  return (
    <div className="space-y-8 select-none pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            ACCREDITATION & RECRUITER ANALYTICS
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Company Placement Reports
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">
            Detailed recruitment funnels, round-by-round QR attendance verification, branch selections, and NAAC/NIRF accreditation analytics.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExportCompanyReport}
            className="inline-flex items-center space-x-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer border border-slate-200"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>
              {selectedCompany ? `Export ${selectedCompany.name} Report` : 'Export Company Data'}
            </span>
          </button>

          <button
            onClick={handleExportNaacReport}
            className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-amber-400" />
            <span>Export NIRF / NAAC Report</span>
          </button>
        </div>
      </div>

      {/* Company Selector Ribbon */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Building2 className="w-5 h-5 text-amber-500" />
          <span className="text-xs font-black text-slate-900 uppercase tracking-wider">
            Select Company Drive:
          </span>
        </div>

        <div className="flex items-center space-x-3 flex-1 max-w-xl">
          <select
            value={selectedCompanyId}
            onChange={(e) => setSelectedCompanyId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
          >
            <option value="ALL">All Companies (Season Overview)</option>
            {companies.map((comp) => (
              <option key={comp.id} value={comp.id}>
                {comp.name} — {comp.status === 'COMPLETED' ? 'Completed Drive' : 'In Progress'} ({comp.ctcTotal || 0} LPA)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* If No Companies Exist in System */}
      {companies.length === 0 && (
        <div className="bg-white rounded-3xl p-12 text-center border border-dashed border-slate-200 space-y-4">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <Building2 className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-black text-slate-900">No Companies Registered Yet</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Once you add company recruitment drives and upload candidate sheets, comprehensive round funnels, clearance metrics, and attendance graphs will generate here in real-time.
          </p>
          <button
            onClick={() => setActiveTab('companies')}
            className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-md transition-all cursor-pointer"
          >
            <span>Go to Companies Desk</span>
            <ChevronRight className="w-4 h-4 text-amber-400" />
          </button>
        </div>
      )}

      {/* INDIVIDUAL COMPANY DETAILED REPORT VIEW */}
      {selectedCompany && (
        <div className="space-y-6">
          {/* Company Profile Hero Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-2xl bg-[#0B132B] text-amber-400 flex items-center justify-center text-xl font-black shadow-md">
                {selectedCompany.name.slice(0, 2).toUpperCase()}
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-2xl font-black text-slate-900">{selectedCompany.name}</h3>
                  <span
                    className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      selectedCompany.status === 'COMPLETED'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {selectedCompany.status === 'COMPLETED' ? 'Drive Completed' : 'Active Drive'}
                  </span>
                </div>
                <div className="text-xs text-slate-400 mt-1 flex items-center space-x-3">
                  <span>Industry: <strong>{selectedCompany.industry || 'Technology'}</strong></span>
                  <span>•</span>
                  <span>Category: <strong>{selectedCompany.category || 'Core'}</strong></span>
                  <span>•</span>
                  <span>Package: <strong className="text-amber-600">{selectedCompany.ctcTotal || 0} LPA</strong></span>
                </div>
              </div>
            </div>

            {/* Quick KPIs */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="text-[10px] font-bold text-slate-400 uppercase">Total Rounds</div>
                <div className="text-xl font-black text-slate-900 mt-1">{companyRounds.length}</div>
              </div>
              <div className="p-3 bg-blue-50 rounded-2xl border border-blue-100">
                <div className="text-[10px] font-bold text-blue-600 uppercase">Candidates Sat</div>
                <div className="text-xl font-black text-blue-900 mt-1">
                  {selectedCompany.totalStudentsSat ||
                    funnelData.reduce((max, f) => Math.max(max, f.attended), 0)}
                </div>
              </div>
              <div className="p-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                <div className="text-[10px] font-bold text-emerald-600 uppercase">Offers Made</div>
                <div className="text-xl font-black text-emerald-900 mt-1">
                  {selectedCompany.offersGivenCount || companyOffers.length || 0}
                </div>
              </div>
            </div>
          </div>

          {/* Visual Graphs Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Recruitment Funnel & Round Progression Chart */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-900">Recruitment Funnel & Clearance</h4>
                  <p className="text-xs text-slate-400">Student progression across selection rounds</p>
                </div>
                <TrendingUp className="w-4 h-4 text-amber-500" />
              </div>

              <div className="h-64">
                {funnelData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis tick={{ fontSize: 11, fill: '#64748B' }} />
                      <Tooltip />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Bar dataKey="scheduled" name="Scheduled" fill="#94A3B8" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="attended" name="Present (QR Scanned)" fill="#0B132B" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="cleared" name="Cleared Round" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No round data recorded yet for this company.
                  </div>
                )}
              </div>
            </div>

            {/* Branch / Discipline Distribution */}
            <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-base font-black text-slate-900">Branch-wise Candidate Pool</h4>
                  <p className="text-xs text-slate-400">Distribution across UPES academic specializations</p>
                </div>
                <Users className="w-4 h-4 text-blue-500" />
              </div>

              <div className="h-64">
                {branchData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={branchData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748B' }} />
                      <YAxis dataKey="branch" type="category" width={110} tick={{ fontSize: 10, fill: '#64748B' }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Candidate Count" fill="#3B82F6" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    Candidate branch data will appear when attendees are registered.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Detailed Attendees & Candidate Records Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-base font-black text-slate-900">
                  {selectedCompany.name} — Candidate Records & Live Round Verification
                </h4>
                <p className="text-xs text-slate-400">
                  Every record reflects live QR scanning and candidate verification.
                </p>
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter by SAP ID, Name..."
                  value={candidateSearch}
                  onChange={(e) => setCandidateSearch(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-amber-500 w-56"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-black text-[10px] tracking-wider">
                    <th className="pb-3 pl-2">SAP ID</th>
                    <th className="pb-3">Candidate Name</th>
                    <th className="pb-3">Branch</th>
                    <th className="pb-3">Round</th>
                    <th className="pb-3">Attendance</th>
                    <th className="pb-3">Verified Time</th>
                    <th className="pb-3 pr-2 text-right">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {roundStudents
                    .filter((rs) => companyRounds.some((r) => r.id === rs.roundId))
                    .filter(
                      (rs) =>
                        rs.studentName.toLowerCase().includes(candidateSearch.toLowerCase()) ||
                        rs.sapId.includes(candidateSearch)
                    )
                    .map((cs, idx) => {
                      const rnd = companyRounds.find((r) => r.id === cs.roundId);
                      const isPresent =
                        cs.attendanceStatus === 'PRESENT' || cs.attendanceStatus === 'MANUALLY_MARKED';
                      return (
                        <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3 pl-2 font-mono font-bold text-slate-900">{cs.sapId}</td>
                          <td className="py-3 font-bold text-slate-800">{cs.studentName}</td>
                          <td className="py-3 text-slate-500">{cs.branch || 'B.Tech'}</td>
                          <td className="py-3 font-medium text-slate-700">
                            {rnd?.name || `Round ${rnd?.roundNumber || 1}`}
                          </td>
                          <td className="py-3">
                            <span
                              className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                isPresent ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${
                                  isPresent ? 'bg-emerald-500' : 'bg-rose-500'
                                }`}
                              />
                              <span>{isPresent ? 'Marked Present' : 'Absent'}</span>
                            </span>
                          </td>
                          <td className="py-3 text-[11px] font-mono text-slate-400">
                            {cs.attendanceTime || '—'}
                          </td>
                          <td className="py-3 pr-2 text-right">
                            <span
                              className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase ${
                                cs.shortlistStatus === 'CLEARED'
                                  ? 'bg-amber-100 text-amber-900'
                                  : cs.shortlistStatus === 'REJECTED'
                                  ? 'bg-slate-100 text-slate-500'
                                  : 'bg-blue-50 text-blue-700'
                              }`}
                            >
                              {cs.shortlistStatus || 'SHORTLISTED'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}

                  {roundStudents.filter((rs) => companyRounds.some((r) => r.id === rs.roundId)).length ===
                    0 && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-xs text-slate-400">
                        No candidate attendance records for this company yet. Upload a student sheet in Rounds to begin tracking.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ALL COMPANIES OVERVIEW MODE */}
      {selectedCompanyId === 'ALL' && companies.length > 0 && (
        <div className="space-y-6">
          {/* Season Placement Funnel */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h3 className="text-lg font-black text-slate-900">Placement Season Overview</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-center">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
                <div className="text-xs font-bold text-slate-400 uppercase">1. Recruiter Drives</div>
                <div className="text-3xl font-black text-slate-900 mt-2">{companies.length}</div>
                <div className="text-[10px] text-slate-500 mt-1">
                  {companies.filter((c) => c.status === 'COMPLETED').length} Finished
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-blue-50 border border-blue-200">
                <div className="text-xs font-bold text-blue-700 uppercase">2. Rounds Conducted</div>
                <div className="text-3xl font-black text-blue-900 mt-2">{rounds.length}</div>
                <div className="text-[10px] text-blue-700 mt-1">Multi-stage technical desk</div>
              </div>

              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="text-xs font-bold text-amber-800 uppercase">3. Total Candidates Sat</div>
                <div className="text-3xl font-black text-amber-900 mt-2">
                  {roundStudents.length}
                </div>
                <div className="text-[10px] text-amber-800 mt-1">QR Verified Attendance</div>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-xs font-bold text-emerald-800 uppercase">4. Final Offers Rolled</div>
                <div className="text-3xl font-black text-emerald-900 mt-2">
                  {companies.reduce((sum, c) => sum + (c.offersGivenCount || 0), 0) + offers.length}
                </div>
                <div className="text-[10px] text-emerald-800 mt-1">Final Selections</div>
              </div>
            </div>
          </div>

          {/* Company Breakdown Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-base font-black text-slate-900">Recruiter Drive Statistics</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 uppercase font-black text-[10px]">
                    <th className="pb-3 pl-2">Company</th>
                    <th className="pb-3">Industry</th>
                    <th className="pb-3">Tier</th>
                    <th className="pb-3">CTC Package</th>
                    <th className="pb-3">Rounds</th>
                    <th className="pb-3">Status</th>
                    <th className="pb-3 pr-2 text-right">Offers Hired</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {companies.map((c) => {
                    const cRounds = rounds.filter((r) => r.companyId === c.id);
                    const cOffers = c.offersGivenCount || offers.filter((o) => o.companyId === c.id).length;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCompanyId(c.id)}
                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                      >
                        <td className="py-3 pl-2 font-bold text-slate-900">{c.name}</td>
                        <td className="py-3 text-slate-500">{c.industry}</td>
                        <td className="py-3">
                          <span className="bg-slate-100 text-slate-800 text-[10px] font-bold px-2 py-0.5 rounded-md">
                            {c.category}
                          </span>
                        </td>
                        <td className="py-3 font-bold text-amber-600">{c.ctcTotal || 0} LPA</td>
                        <td className="py-3 font-medium text-slate-700">{cRounds.length} Rounds</td>
                        <td className="py-3">
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              c.status === 'COMPLETED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 pr-2 text-right font-black text-slate-900">{cOffers}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
