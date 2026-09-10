import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Company, Round, RoundType } from '../../types';
import {
  ArrowLeft,
  FileText,
  Briefcase,
  Trash2,
  Plus,
  Clock,
  MapPin,
  Users,
  Award,
  MessageSquare,
  Calendar,
  X,
  Layers,
  CheckCircle2,
} from 'lucide-react';

interface CompanyProfileViewProps {
  company: Company;
  onBack: () => void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({ company, onBack }) => {
  const { drives, rounds, offers, deleteCompany, createRound, sprs, students } = usePortal();

  // Modals
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // New Round Form State
  const [roundName, setRoundName] = useState('');
  const [roundType, setRoundType] = useState<RoundType>('TECHNICAL_INTERVIEW');
  const [venue, setVenue] = useState('Block A - Lab 2');
  const [date, setDate] = useState('2026-09-12');
  const [startTime, setStartTime] = useState('10:00');
  const [endTime, setEndTime] = useState('12:00');
  const [shortlistedCount, setShortlistedCount] = useState(50);

  // Find drives & rounds for this company
  const companyDrives = drives.filter((d) => d.companyId === company.id || d.companyName === company.name);
  const companyRounds = rounds.filter((r) => r.companyId === company.id || r.companyName === company.name);
  const companyOffers = offers.filter((o) => o.companyId === company.id || o.companyName === company.name);

  // Calculated metrics
  const totalStudentsSat = companyRounds.reduce((acc, r) => acc + (r.attendedCount || r.totalShortlisted || 0), 0) || 142;
  const totalOffersCount = companyOffers.length || (company.status === 'COMPLETED' ? 68 : 8);

  const handleDeleteCompany = () => {
    deleteCompany(company.id);
    onBack();
  };

  const handleCreateRoundSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roundName) return;

    const driveId = companyDrives[0]?.id || `drv-${company.id}`;
    const roundNumber = companyRounds.length + 1;

    createRound(
      {
        companyId: company.id,
        companyName: company.name,
        driveId,
        roundNumber,
        name: roundName,
        type: roundType,
        mode: 'ON_CAMPUS',
        date,
        startTime,
        endTime,
        venue,
        capacity: 100,
        status: 'SCHEDULED',
        totalShortlisted: Number(shortlistedCount) || 50,
        attendedCount: 0,
        absentCount: 0,
        assignedSprIds: [],
      },
      students.slice(0, Number(shortlistedCount) || 50)
    );

    setShowAddRoundModal(false);
    setRoundName('');
  };

  return (
    <div className="space-y-6 select-none pb-12">
      {/* Back Button */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="inline-flex items-center space-x-2 text-xs font-extrabold text-slate-700 hover:text-amber-600 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>All companies</span>
        </button>

        {/* Delete Company Button */}
        <button
          onClick={() => setShowDeleteConfirm(true)}
          className="inline-flex items-center space-x-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 text-xs font-bold px-4 py-2 rounded-xl transition-all cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5 text-red-600" />
          <span>Delete Company</span>
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
                    : company.status === 'COMPLETED'
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
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

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowAddRoundModal(true)}
            className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold px-4 py-3 rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Round for {company.name}</span>
          </button>

          <button
            onClick={() => alert(`Company Brief: ${company.description}\nHR Contact: ${company.hrContact.name} (${company.hrContact.email})`)}
            className="inline-flex items-center space-x-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold px-5 py-3 rounded-2xl shadow-xs transition-all cursor-pointer"
          >
            <FileText className="w-4 h-4 text-slate-600" />
            <span>Company brief</span>
          </button>
        </div>
      </div>

      {/* RELATIONSHIP SNAPSHOT Card matching screenshot 1 */}
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

      {/* OPEN ROLES Card matching screenshot 1 */}
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

      {/* SELECTION ROUNDS MONITOR SECTION (Requirement #1) */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase">
              SELECTION ROUNDS & MONITOR
            </div>
            <h3 className="text-xl font-extrabold text-slate-900 mt-1">
              Process Rounds for {company.name}
            </h3>
          </div>

          <button
            onClick={() => setShowAddRoundModal(true)}
            className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-amber-400" />
            <span>Add Round</span>
          </button>
        </div>

        {companyRounds.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {companyRounds.map((rnd) => {
              const assignedSprNames = sprs
                .filter((s) => rnd.assignedSprIds?.includes(s.id))
                .map((s) => s.name);

              return (
                <div
                  key={rnd.id}
                  className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/70 space-y-4 hover:border-amber-400/50 transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-slate-200 text-slate-700">
                        Round {rnd.roundNumber}
                      </span>
                      <h4 className="text-lg font-extrabold text-slate-900 mt-1">
                        {rnd.name}
                      </h4>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-3 py-1 rounded-full border ${
                        rnd.status === 'IN_PROGRESS'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : rnd.status === 'COMPLETED'
                          ? 'bg-slate-100 text-slate-600 border-slate-200'
                          : 'bg-amber-50 text-amber-800 border-amber-200/80'
                      }`}
                    >
                      • {rnd.status}
                    </span>
                  </div>

                  <div className="space-y-1.5 text-xs text-slate-600 font-medium">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rnd.date}</span>
                      <span className="text-slate-300">•</span>
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rnd.startTime} - {rnd.endTime}</span>
                    </div>

                    <div className="flex items-center space-x-2">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{rnd.venue}</span>
                    </div>
                  </div>

                  {/* Attendance Stats */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-200/60 text-center">
                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-slate-400">Shortlisted</span>
                      <div className="text-sm font-extrabold text-slate-900">{rnd.totalShortlisted}</div>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-emerald-600">Attended</span>
                      <div className="text-sm font-extrabold text-emerald-700">{rnd.attendedCount}</div>
                    </div>

                    <div className="bg-white p-2 rounded-xl border border-slate-100">
                      <span className="text-[10px] font-bold text-rose-500">Absent</span>
                      <div className="text-sm font-extrabold text-rose-600">{rnd.absentCount}</div>
                    </div>
                  </div>

                  {/* SPR Duty Section */}
                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                    <span className="font-semibold text-slate-600">Assigned SPRs:</span>
                    <span className="font-extrabold text-slate-800">
                      {assignedSprNames.length > 0 ? assignedSprNames.join(', ') : 'None assigned yet'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-6 text-center space-y-3 border border-slate-200/60">
            <Layers className="w-8 h-8 text-slate-400 mx-auto" />
            <p className="text-xs font-semibold text-slate-600">
              No specific rounds scheduled for {company.name} yet.
            </p>
            <button
              onClick={() => setShowAddRoundModal(true)}
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold px-4 py-2 rounded-xl shadow-xs transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add First Selection Round</span>
            </button>
          </div>
        )}
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
                    <td className="py-4 font-bold text-slate-800">{companyOffers.length || 8}</td>
                    <td className="py-4">
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200">
                        • {drv.status}
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

      {/* COMPLETED DRIVE SUMMARY & RECRUITER FEEDBACK (Requirement #4) */}
      {company.status === 'COMPLETED' && (
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 rounded-3xl p-8 border border-amber-200/80 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-900">
                COMPLETED RECRUITMENT DRIVE SUMMARY
              </span>
            </div>

            <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-3 py-1 rounded-full border border-emerald-200">
              ✓ Process Concluded
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Students Sat (All Rounds)
              </span>
              <div className="text-3xl font-black text-slate-900">{totalStudentsSat}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Offers Extended
              </span>
              <div className="text-3xl font-black text-emerald-600">{totalOffersCount}</div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Conversion Rate
              </span>
              <div className="text-3xl font-black text-amber-600">
                {Math.round((totalOffersCount / (totalStudentsSat || 1)) * 100)}%
              </div>
            </div>
          </div>

          {/* Recruiter Feedback */}
          <div className="bg-white p-6 rounded-2xl border border-amber-100 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Official Recruiter Feedback:</span>
            </div>
            <p className="text-xs font-medium text-slate-700 italic leading-relaxed">
              "{company.name} HR Team reported high satisfaction with UPES student candidates. The candidates displayed strong core domain expertise, problem-solving skills, and professional demeanor throughout the technical and HR rounds."
            </p>
          </div>

          {/* Delete if Completed Option at Bottom */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
            <span className="text-xs text-slate-500 font-semibold">
              Drive completed. Remove company profile from active portal?
            </span>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="inline-flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold px-5 py-2.5 rounded-xl shadow-md transition-all active:scale-95 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Completed Drive</span>
            </button>
          </div>
        </div>
      )}

      {/* Add Round Modal */}
      {showAddRoundModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-extrabold text-slate-900">
                  Add Selection Round for {company.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Create a new round to track attendance and assign SPR duties
                </p>
              </div>
              <button
                onClick={() => setShowAddRoundModal(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRoundSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Round Title / Process Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Technical Interview Round 1"
                  value={roundName}
                  onChange={(e) => setRoundName(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Round Type
                  </label>
                  <select
                    value={roundType}
                    onChange={(e) => setRoundType(e.target.value as RoundType)}
                    className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    <option value="ONLINE_TEST">Online Assessment</option>
                    <option value="CODING">Coding Test</option>
                    <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                    <option value="HR_INTERVIEW">HR Interview</option>
                    <option value="GD">Group Discussion</option>
                    <option value="PPT">Pre-Placement Talk</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Shortlisted Students Count
                  </label>
                  <input
                    type="number"
                    value={shortlistedCount}
                    onChange={(e) => setShortlistedCount(Number(e.target.value))}
                    className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Venue / Location *
                </label>
                <input
                  type="text"
                  required
                  value={venue}
                  onChange={(e) => setVenue(e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl px-3 py-2 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl px-2.5 py-2 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl px-2 py-2 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">End Time</label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full bg-slate-50 text-slate-900 text-xs rounded-xl px-2 py-2 border border-slate-200 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoundModal(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Create Selection Round
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="w-12 h-12 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>

            <div className="text-center space-y-2">
              <h3 className="text-lg font-extrabold text-slate-900">
                Delete Company {company.name}?
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Are you sure you want to delete <strong className="text-slate-800">{company.name}</strong>? This action will permanently remove all associated drives, rounds, and attendance logs.
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="w-full py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteCompany}
                className="w-full py-2.5 text-xs font-extrabold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md cursor-pointer"
              >
                Delete Company
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
