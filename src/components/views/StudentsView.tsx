import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { GraduationCap, Search, ShieldAlert, CheckCircle2, AlertOctagon, UserX, Download } from 'lucide-react';
import * as XLSX from 'xlsx';

export const StudentsView: React.FC = () => {
  const { students, debarStudent } = usePortal();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ELIGIBLE' | 'PLACED' | 'DEBARRED'>('ALL');

  // Debar modal state
  const [debarTarget, setDebarTarget] = useState<{ id: string; name: string } | null>(null);
  const [debarReason, setDebarReason] = useState('');

  const filteredStudents = students.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      s.sapId.includes(searchTerm) ||
      s.branch.toLowerCase().includes(searchTerm.toLowerCase());

    if (statusFilter === 'ALL') return matchesSearch;
    return matchesSearch && s.status === statusFilter;
  });

  const handleExportStudents = () => {
    const data = students.map((s, i) => ({
      'S.No': i + 1,
      'SAP ID': s.sapId,
      Name: s.name,
      Email: s.email,
      Branch: s.branch,
      'Batch Year': s.batchYear,
      CGPA: s.cgpa,
      'Active Backlogs': s.activeBacklogs,
      Status: s.status,
      'Placed Tier': s.placedTier || 'N/A',
      'Placed Company': s.placedCompanyName || 'N/A',
      'Debarred Reason': s.debarredReason || 'N/A',
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Students');
    XLSX.writeFile(workbook, 'UPES_Master_Student_Database.xlsx');
  };

  const handleConfirmDebar = () => {
    if (!debarTarget || !debarReason) return;
    debarStudent(debarTarget.id, debarReason);
    setDebarTarget(null);
    setDebarReason('');
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            MASTER DATABASE
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Student Placement Database
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-3xl">
            Single source of truth for student SAP IDs, CGPA, backlogs, placement status, and debarment flags.
          </p>
        </div>

        <button
          onClick={handleExportStudents}
          className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Export Master Excel</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by SAP ID, name, or branch..."
            className="w-full bg-slate-50 text-xs rounded-xl pl-10 pr-4 py-2 border border-slate-200 outline-none"
          />
        </div>

        <div className="flex items-center space-x-2">
          {['ALL', 'ELIGIBLE', 'PLACED', 'DEBARRED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                statusFilter === st
                  ? 'bg-[#0B132B] text-white shadow-xs'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Students Master Table */}
      <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-extrabold uppercase">
            <tr>
              <th className="p-4">Student Details</th>
              <th className="p-4">SAP ID</th>
              <th className="p-4">Branch & Batch</th>
              <th className="p-4">CGPA / Backlogs</th>
              <th className="p-4">Placement Status</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredStudents.map((student) => (
              <tr key={student.id} className="hover:bg-slate-50/80 transition-colors">
                <td className="p-4">
                  <div className="font-extrabold text-slate-900 text-sm">{student.name}</div>
                  <div className="text-slate-500">{student.email}</div>
                </td>

                <td className="p-4 font-mono font-bold text-slate-700">{student.sapId}</td>

                <td className="p-4 text-slate-700">
                  <div className="font-bold">{student.branch}</div>
                  <div className="text-slate-400">Batch {student.batchYear}</div>
                </td>

                <td className="p-4">
                  <div className="font-extrabold text-slate-900">{student.cgpa} CGPA</div>
                  <div className="text-[10px] text-slate-400">
                    {student.activeBacklogs > 0 ? (
                      <span className="text-amber-600 font-bold">{student.activeBacklogs} Active Backlog(s)</span>
                    ) : (
                      '0 Backlogs'
                    )}
                  </div>
                </td>

                <td className="p-4">
                  <span
                    className={`px-3 py-1 rounded-full text-[10px] font-bold border ${
                      student.status === 'PLACED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : student.status === 'DEBARRED'
                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    • {student.status} {student.placedCompanyName ? `(${student.placedCompanyName})` : ''}
                  </span>
                </td>

                <td className="p-4 text-right">
                  {student.status !== 'DEBARRED' ? (
                    <button
                      onClick={() => setDebarTarget({ id: student.id, name: student.name })}
                      className="text-xs font-bold text-rose-600 hover:text-rose-800 bg-rose-50 px-3 py-1.5 rounded-xl border border-rose-200"
                    >
                      Debar Student
                    </button>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">Debarred</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Debar Modal */}
      {debarTarget && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900">Debar Student</h3>
              <button onClick={() => setDebarTarget(null)} className="text-slate-400 font-bold">✕</button>
            </div>

            <p className="text-xs text-slate-500">
              Debarring <strong className="text-slate-900">{debarTarget.name}</strong> will exclude them from all future company eligibility lists for this placement season.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Debarment Reason</label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Backed out after accepting Microsoft offer / Unexcused no-show in Round 2."
                  value={debarReason}
                  onChange={(e) => setDebarReason(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-3">
                <button onClick={() => setDebarTarget(null)} className="px-4 py-2 font-bold text-slate-600">
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDebar}
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl"
                >
                  Debar Student
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
