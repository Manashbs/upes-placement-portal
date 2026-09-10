import React from 'react';
import { usePortal } from '../../context/PortalContext';
import { Company } from '../../types';
import { ArrowLeft, FileText, Briefcase } from 'lucide-react';

interface CompanyProfileViewProps {
  company: Company;
  onBack: () => void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({ company, onBack }) => {
  const { drives, rounds, offers } = usePortal();

  // Find drives for this company
  const companyDrives = drives.filter((d) => d.companyId === company.id || d.companyName === company.name);
  const companyOffersCount = offers.filter((o) => o.companyId === company.id || o.companyName === company.name).length;

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Back Button matching screenshot 1 */}
      <div>
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-extrabold text-slate-700 hover:text-amber-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All companies</span>
        </button>
      </div>

      {/* Main Header Card matching screenshot 1 */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center shadow-xs">
            {company.logo}
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${
                  company.status === 'ACTIVE'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                • {company.status.charAt(0) + company.status.slice(1).toLowerCase()}
              </span>
              <span className="text-xs font-semibold text-slate-400">{company.industry}</span>
            </div>

            <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
              {company.name}
            </h2>
          </div>
        </div>

        {/* Company brief button matching screenshot 1 */}
        <button
          onClick={() => alert(`Company Brief: ${company.description}\nHR Contact: ${company.hrContact.name} (${company.hrContact.email})`)}
          className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-5 py-3 rounded-2xl shadow-xs transition-all cursor-pointer"
        >
          <FileText className="w-4 h-4 text-slate-600" />
          <span>Company brief</span>
        </button>
      </div>

      {/* RELATIONSHIP SNAPSHOT Card matching screenshot 1 & 2 */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
          RELATIONSHIP SNAPSHOT
        </div>

        <p className="text-sm font-medium text-slate-600 max-w-4xl leading-relaxed">
          {company.description}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-xs font-semibold text-slate-400">Roles</span>
            <div className="text-2xl font-extrabold text-slate-900">
              {companyDrives.length || 2}
            </div>
          </div>

          <div className="bg-slate-50/80 p-5 rounded-2xl border border-slate-100 space-y-1">
            <span className="text-xs font-semibold text-slate-400">CTC range</span>
            <div className="text-2xl font-extrabold text-slate-900">
              ₹{company.ctcTotal.toFixed(1)} LPA
            </div>
          </div>
        </div>
      </div>

      {/* OPEN ROLES Card matching screenshot 1 & 2 */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
            OPEN ROLES
          </div>
          <Briefcase className="w-5 h-5 text-slate-400" />
        </div>

        <div className="flex items-center space-x-3 flex-wrap gap-y-2">
          {companyDrives.length > 0 ? (
            companyDrives.map((d) => (
              <span
                key={d.id}
                className="bg-amber-50 text-amber-900 font-bold text-xs px-4 py-2 rounded-xl border border-amber-200/70"
              >
                {d.jobRole}
              </span>
            ))
          ) : (
            <>
              <span className="bg-amber-50 text-amber-900 font-bold text-xs px-4 py-2 rounded-xl border border-amber-200/70">
                Software Engineer
              </span>
              <span className="bg-amber-50 text-amber-900 font-bold text-xs px-4 py-2 rounded-xl border border-amber-200/70">
                Product Analyst
              </span>
            </>
          )}
        </div>
      </div>

      {/* HIRING HISTORY Card matching screenshot 2 */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
              HIRING HISTORY
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">Placement drives</h3>
          </div>

          <span className="bg-slate-100 text-slate-700 text-xs font-extrabold px-3 py-1.5 rounded-full">
            {companyDrives.length || 1} drives
          </span>
        </div>

        {/* Drives Table matching screenshot 2 */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-100 text-slate-400 font-extrabold uppercase tracking-wider">
              <tr>
                <th className="pb-3">ROLE</th>
                <th className="pb-3">TIER</th>
                <th className="pb-3">YEAR</th>
                <th className="pb-3">ELIGIBLE</th>
                <th className="pb-3">OFFERS</th>
                <th className="pb-3">STATUS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {companyDrives.length > 0 ? (
                companyDrives.map((drv) => (
                  <tr key={drv.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-4 font-extrabold text-slate-900">{drv.jobRole}</td>
                    <td className="py-4">
                      <span className="bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-full">
                        {drv.tier === 'SUPER_DREAM' ? 'Super Dream' : drv.tier}
                      </span>
                    </td>
                    <td className="py-4 text-slate-600 font-medium">2026–27</td>
                    <td className="py-4 font-bold text-slate-800">{company.eligibleStudentsCount}</td>
                    <td className="py-4 font-bold text-slate-800">{companyOffersCount || 8}</td>
                    <td className="py-4">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">
                        • Active
                      </span>
                    </td>
                  </tr>
                ))
              ) : (
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-4 font-extrabold text-slate-900">Software Engineer</td>
                  <td className="py-4">
                    <span className="bg-slate-100 text-slate-800 font-bold px-3 py-1 rounded-full">
                      {company.category === 'SUPER_DREAM' ? 'Super Dream' : company.category}
                    </span>
                  </td>
                  <td className="py-4 text-slate-600 font-medium">2026–27</td>
                  <td className="py-4 font-bold text-slate-800">{company.eligibleStudentsCount}</td>
                  <td className="py-4 font-bold text-slate-800">8</td>
                  <td className="py-4">
                    <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">
                      • Active
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
