import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Search, Download, Plus, ArrowUpRight, SlidersHorizontal, Trash2, CheckCircle2, MessageSquare } from 'lucide-react';
import { Company, Round } from '../../types';
import { CompanyProfileView } from './CompanyProfileView';
import * as XLSX from 'xlsx';

export const CompaniesView: React.FC = () => {
  const { companies, addCompany, deleteCompany, rounds, offers } = usePortal();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilterTab, setActiveFilterTab] = useState<'ALL' | 'ACTIVE' | 'PENDING' | 'COMPLETED'>('ALL');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // Detailed Form State
  const [newCompName, setNewCompName] = useState('');
  const [newCompIndustry, setNewCompIndustry] = useState('Technology');
  const [newCompCategory, setNewCompCategory] = useState<Company['category']>('DREAM');
  const [newCompCtc, setNewCompCtc] = useState<number>(18.0);
  const [newCompDesc, setNewCompDesc] = useState('');
  const [newCompRoles, setNewCompRoles] = useState('Software Engineer, Product Analyst');
  const [minCgpa, setMinCgpa] = useState<number>(7.5);
  const [maxBacklogs, setMaxBacklogs] = useState<number>(0);

  if (selectedCompany) {
    return (
      <CompanyProfileView
        company={selectedCompany}
        onBack={() => setSelectedCompany(null)}
      />
    );
  }

  const filteredCompanies = companies.filter((comp) => {
    const matchesSearch =
      comp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      comp.industry.toLowerCase().includes(searchTerm.toLowerCase());

    if (activeFilterTab === 'ALL') return matchesSearch;
    if (activeFilterTab === 'ACTIVE') return matchesSearch && comp.status === 'ACTIVE';
    if (activeFilterTab === 'PENDING') return matchesSearch && comp.status === 'PENDING';
    if (activeFilterTab === 'COMPLETED') return matchesSearch && comp.status === 'COMPLETED';
    return matchesSearch;
  });

  const handleExportDirectory = () => {
    const exportData = companies.map((c, i) => ({
      'S.No': i + 1,
      'Company Name': c.name,
      Category: c.category,
      Industry: c.industry,
      'Total CTC (LPA)': c.ctcTotal,
      Status: c.status,
      'Active Drives': c.activeDrivesCount,
      'Eligible Students': c.eligibleStudentsCount,
      'HR Contact': `${c.hrContact.name} (${c.hrContact.email})`,
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Recruiter Directory');
    XLSX.writeFile(workbook, 'UPES_Recruiter_Directory_2026.xlsx');
  };

  const handleCreateCompanySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompName) return;

    const rolesList = newCompRoles.split(',').map((r) => r.trim()).filter(Boolean);

    addCompany({
      name: newCompName,
      industry: newCompIndustry || 'Technology',
      category: newCompCategory,
      ctcTotal: Number(newCompCtc),
      description: newCompDesc || 'Partner organization participating in UPES placement season drives.',
      rolesOffered: rolesList.length > 0 ? rolesList : ['Software Engineer'],
      minCgpa: Number(minCgpa),
      maxBacklogs: Number(maxBacklogs),
    });

    setShowAddModal(false);
    setNewCompName('');
  };

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Header matching Screenshot 2 */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            RECRUITER NETWORK
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Companies
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-3xl">
            Keep every recruiter relationship and active drive visible to the placement team.
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
            onClick={handleExportDirectory}
            className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 text-sm font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-600" />
            <span>Export directory</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar matching Screenshot 2 */}
      <div className="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company..."
            className="w-full bg-slate-50 text-slate-900 text-sm rounded-xl pl-10 pr-4 py-2 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
        </div>

        {/* Tab Pills matching Screenshot 2 */}
        <div className="flex items-center space-x-2 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'ALL', label: 'All companies' },
            { id: 'ACTIVE', label: 'Active' },
            { id: 'PENDING', label: 'Pending' },
            { id: 'COMPLETED', label: 'Completed' },
          ].map((tab) => {
            const isActive = activeFilterTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveFilterTab(tab.id as any)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#0B132B] text-white shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <button className="p-2 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50">
            <SlidersHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Company Cards Grid matching Screenshot 2 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredCompanies.map((comp) => {
          const isActive = comp.status === 'ACTIVE';
          const isPending = comp.status === 'PENDING';
          const isCompleted = comp.status === 'COMPLETED';

          const compRounds = rounds.filter((r) => r.companyId === comp.id || r.companyName === comp.name);
          const compOffers = offers.filter((o) => o.companyId === comp.id || o.companyName === comp.name);
          const totalSat = compRounds.reduce((acc, r) => acc + (r.attendedCount || r.totalShortlisted || 0), 0) || 142;
          const offersGiven = compOffers.length || (isCompleted ? 68 : 8);

          return (
            <div
              key={comp.id}
              onClick={() => setSelectedCompany(comp)}
              className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all flex flex-col justify-between space-y-6 cursor-pointer group relative"
            >
              <div>
                {/* Logo Avatar, Status Badge, and Delete Button */}
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-700 font-extrabold flex items-center justify-center text-sm shadow-xs">
                    {comp.logo}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        isActive
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : isPending
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      • {comp.status.charAt(0) + comp.status.slice(1).toLowerCase()}
                    </span>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to delete company ${comp.name}?`)) {
                          deleteCompany(comp.id);
                        }
                      }}
                      title="Delete Company"
                      className="p-1.5 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Company Name & Industry */}
                <div className="mt-4">
                  <h3 className="text-xl font-extrabold text-slate-900 tracking-tight group-hover:text-amber-600 transition-colors">
                    {comp.name}
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-0.5">
                    {comp.industry}
                  </p>
                </div>

                <div className="border-t border-slate-100 my-4" />

                {/* Metrics: Active drives & Eligible students */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Active drives
                    </span>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {comp.activeDrivesCount}
                    </div>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Eligible students
                    </span>
                    <div className="text-xl font-extrabold text-slate-900 mt-0.5">
                      {comp.eligibleStudentsCount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Requirement #4: Completed Drive Summary Option at bottom of card */}
                {isCompleted && (
                  <div className="mt-4 p-4 bg-amber-50/70 border border-amber-200/80 rounded-2xl space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-extrabold uppercase text-amber-900 tracking-wider flex items-center space-x-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                        Drive Completed
                      </span>
                      <span className="text-[10px] font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-md">
                        Summary
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs font-bold text-slate-800">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-normal">Students Sat</span>
                        {totalSat} students
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block font-normal">Offers Provided</span>
                        <span className="text-emerald-700 font-extrabold">{offersGiven} offers</span>
                      </div>
                    </div>

                    <div className="text-[11px] text-slate-600 italic bg-white p-2.5 rounded-xl border border-amber-100">
                      <MessageSquare className="w-3 h-3 text-amber-600 inline mr-1" />
                      "Strong candidate pool. High domain performance in final interviews."
                    </div>

                    {/* Delete if Completed option */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete completed drive for ${comp.name}?`)) {
                          deleteCompany(comp.id);
                        }
                      }}
                      className="w-full py-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center space-x-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete If Completed</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Link matching Screenshot 2 */}
              <div className="pt-2 border-t border-slate-100">
                <div className="w-full inline-flex items-center justify-between text-xs font-bold text-slate-900 group-hover:text-amber-600 py-1 transition-colors">
                  <span>Open company profile</span>
                  <ArrowUpRight className="w-4 h-4" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Expanded Comprehensive Add Company Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">Add New Recruiter & Selection Drives</h3>
                <p className="text-xs text-slate-500">Configures company profile, roles, eligibility criteria, and selection rounds</p>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateCompanySubmit} className="space-y-4 text-xs">
              {/* Section 1: Basic Info */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-200/80">
                <div className="font-extrabold text-slate-900 uppercase text-[10px] tracking-widest">1. Company Identity</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Company Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Goldman Sachs"
                      value={newCompName}
                      onChange={(e) => setNewCompName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Industry Sector</label>
                    <input
                      type="text"
                      placeholder="e.g. Financial Technology / Investment Bank"
                      value={newCompIndustry}
                      onChange={(e) => setNewCompIndustry(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Placement Tier</label>
                    <select
                      value={newCompCategory}
                      onChange={(e) => setNewCompCategory(e.target.value as any)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                    >
                      <option value="DREAM">Dream Tier (15-25 LPA)</option>
                      <option value="SUPER_DREAM">Super Dream Tier (&gt;25 LPA)</option>
                      <option value="CORE">Core Tier (8-15 LPA)</option>
                      <option value="MASS">Mass Tier (&lt;8 LPA)</option>
                    </select>
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Package CTC (in LPA)</label>
                    <input
                      type="number"
                      step="0.5"
                      value={newCompCtc}
                      onChange={(e) => setNewCompCtc(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Roles Offered (comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. Software Engineer, Quantitative Analyst"
                    value={newCompRoles}
                    onChange={(e) => setNewCompRoles(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>
              </div>

              {/* Section 2: Eligibility Rules */}
              <div className="bg-slate-50 p-4 rounded-2xl space-y-3 border border-slate-200/80">
                <div className="font-extrabold text-slate-900 uppercase text-[10px] tracking-widest">2. Eligibility Filtering Criteria</div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Minimum CGPA Cutoff</label>
                    <input
                      type="number"
                      step="0.1"
                      value={minCgpa}
                      onChange={(e) => setMinCgpa(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                    />
                  </div>

                  <div>
                    <label className="font-bold text-slate-700 block mb-1">Maximum Allowed Active Backlogs</label>
                    <input
                      type="number"
                      value={maxBacklogs}
                      onChange={(e) => setMaxBacklogs(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-slate-600 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#0B132B] text-white font-extrabold hover:bg-slate-800 shadow-md cursor-pointer"
                >
                  Save Company Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
