import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { Company, Round, RoundType, RoundMode } from '../../types';
import {
  ArrowLeft,
  FileText,
  Briefcase,
  Trash2,
  Plus,
  Clock,
  MapPin,
  MessageSquare,
  Calendar,
  X,
  Layers,
  CheckCircle2,
  Edit3,
  Award,
  Users,
} from 'lucide-react';
import { ExcelUploadModal } from '../modals/ExcelUploadModal';
import { RoundDetailsModal } from '../modals/RoundDetailsModal';

interface CompanyProfileViewProps {
  company: Company;
  onBack: () => void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({ company, onBack }) => {
  const { drives, rounds, offers, deleteCompany, createRound, finalizeCompletedDrive, sprs, students } = usePortal();

  // Modals State
  const [showAddRoundModal, setShowAddRoundModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showExcelUpload, setShowExcelUpload] = useState(false);
  const [showCompletionModal, setShowCompletionModal] = useState(false);
  const [selectedRoundForDetails, setSelectedRoundForDetails] = useState<Round | null>(null);

  // Completion Form Inputs
  const [completionSatCount, setCompletionSatCount] = useState<number>(company.totalStudentsSat || 120);
  const [completionOffersCount, setCompletionOffersCount] = useState<number>(company.offersGivenCount || 10);
  const [completionFeedback, setCompletionFeedback] = useState<string>(company.recruiterFeedback || '');

  // Round Form State matching Screenshot 1 (RoundsView modal)
  const [roundName, setRoundName] = useState('');
  const [roundType, setRoundType] = useState<RoundType>('TECHNICAL_INTERVIEW');
  const [roundMode, setRoundMode] = useState<RoundMode>('ON_CAMPUS');
  const [date, setDate] = useState('2026-09-12');

  // Total Venues and Venues List
  const [totalVenues, setTotalVenues] = useState<number>(1);
  const [venuesList, setVenuesList] = useState<string[]>(['Block A - Lab 1']);

  // Total SPRs Needed
  const [sprsNeeded, setSprsNeeded] = useState<number>(3);
  const [shortlistedStudentsTemp, setShortlistedStudentsTemp] = useState<any[]>([]);

  // Find drives & rounds for this company
  const companyDrives = drives.filter((d) => d.companyId === company.id || d.companyName === company.name);
  const companyRounds = rounds.filter((r) => r.companyId === company.id || r.companyName === company.name);
  const companyOffers = offers.filter((o) => o.companyId === company.id || o.companyName === company.name);

  const isCompleted = company.status === 'COMPLETED';

  const handleTotalVenuesChange = (count: number) => {
    const validCount = Math.max(1, Math.min(10, count));
    setTotalVenues(validCount);
    setVenuesList((prev) => {
      const updated = [...prev];
      while (updated.length < validCount) {
        const char = String.fromCharCode(65 + (updated.length % 26));
        updated.push(`Block ${char} - Lab ${updated.length + 1}`);
      }
      return updated.slice(0, validCount);
    });
  };

  const handleVenueNameChange = (index: number, name: string) => {
    setVenuesList((prev) => {
      const updated = [...prev];
      updated[index] = name;
      return updated;
    });
  };

  // Divide total SPRs needed equally/randomly across venues
  const getSprAllocationPerVenue = () => {
    const base = Math.floor(sprsNeeded / totalVenues);
    const remainder = sprsNeeded % totalVenues;
    return venuesList.map((v, i) => ({
      venueName: v || `Venue ${i + 1}`,
      allocatedSprs: base + (i < remainder ? 1 : 0),
    }));
  };

  const handleDeleteCompany = () => {
    deleteCompany(company.id);
    onBack();
  };

  const handleFinalizeCompletionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    finalizeCompletedDrive(company.id, {
      totalStudentsSat: Number(completionSatCount),
      offersGivenCount: Number(completionOffersCount),
      recruiterFeedback: completionFeedback,
    });
    setShowCompletionModal(false);
  };

  const handleFinalizeCreateRound = (e: React.FormEvent) => {
    e.preventDefault();

    const driveId = companyDrives[0]?.id || `drv-${company.id}`;
    const roundNumber = companyRounds.length + 1;
    const combinedVenueString = venuesList.filter(Boolean).join(' | ');

    createRound(
      {
        companyId: company.id,
        companyName: company.name,
        driveId,
        roundNumber,
        name: roundName || `${roundType} Round`,
        type: roundType,
        mode: roundMode,
        venue: combinedVenueString || 'Block A - Lab 1',
        capacity: sprsNeeded * 20,
        date,
        startTime: '09:00',
        endTime: '17:00',
        status: 'SCHEDULED',
        totalShortlisted: shortlistedStudentsTemp.length || sprsNeeded * 20,
        attendedCount: 0,
        absentCount: 0,
        assignedSprIds: [],
      },
      shortlistedStudentsTemp.length > 0 ? shortlistedStudentsTemp : students.slice(0, sprsNeeded * 20)
    );

    setShowAddRoundModal(false);
    setRoundName('');
    setShortlistedStudentsTemp([]);
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

      {/* Main Header Card */}
      <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center space-x-5">
          <div className="w-16 h-16 rounded-2xl bg-blue-100 text-blue-700 font-black text-2xl flex items-center justify-center shadow-xs">
            {company.logo}
          </div>

          <div className="space-y-1">
            <div className="flex items-center space-x-2">
              <span
                className={`text-[11px] font-bold px-3 py-0.5 rounded-full border ${
                  isCompleted
                    ? 'bg-blue-50 text-blue-700 border-blue-200'
                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
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
          {!isCompleted && (
            <button
              onClick={() => setShowCompletionModal(true)}
              className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-4 py-3 rounded-2xl shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Mark Process Completed</span>
            </button>
          )}

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

      {/* RELATIONSHIP SNAPSHOT Card */}
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

      {/* OPEN ROLES Card */}
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

      {/* SELECTION ROUNDS MONITOR SECTION */}
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
                  onClick={() => setSelectedRoundForDetails(rnd)}
                  className="bg-slate-50/70 rounded-2xl p-5 border border-slate-200/70 space-y-4 hover:border-amber-500 hover:bg-white hover:shadow-md transition-all cursor-pointer group"
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

      {/* PROCESS COMPLETION & RECRUITER FEEDBACK SECTION */}
      {isCompleted ? (
        <div className="bg-gradient-to-br from-amber-50/90 via-orange-50/40 to-slate-50 rounded-3xl p-8 border border-amber-200/80 shadow-md space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block animate-pulse" />
              <span className="text-xs font-extrabold uppercase tracking-widest text-amber-900">
                COMPLETED RECRUITMENT DRIVE SUMMARY
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowCompletionModal(true)}
                className="inline-flex items-center space-x-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5 text-amber-600" />
                <span>Edit Drive Summary</span>
              </button>
              <span className="bg-emerald-100 text-emerald-800 font-extrabold text-xs px-3 py-1 rounded-full border border-emerald-200">
                ✓ Process Concluded
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Total Students Sat (All Rounds)
              </span>
              <div className="text-3xl font-black text-slate-900">
                {company.totalStudentsSat || 0}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Offers Extended
              </span>
              <div className="text-3xl font-black text-emerald-600">
                {company.offersGivenCount || 0}
              </div>
            </div>

            <div className="bg-white p-5 rounded-2xl border border-amber-100 shadow-xs space-y-1">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Conversion Rate
              </span>
              <div className="text-3xl font-black text-amber-600">
                {company.totalStudentsSat
                  ? Math.round(((company.offersGivenCount || 0) / company.totalStudentsSat) * 100)
                  : 0}
                %
              </div>
            </div>
          </div>

          {/* Official Recruiter Feedback */}
          <div className="bg-white p-6 rounded-2xl border border-amber-100 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-bold text-amber-900">
              <MessageSquare className="w-4 h-4 text-amber-600" />
              <span>Official Recruiter Feedback Given by {company.name}:</span>
            </div>
            <p className="text-xs font-medium text-slate-700 italic leading-relaxed">
              "{company.recruiterFeedback || 'No recruiter feedback text entered yet.'}"
            </p>
          </div>

          {/* Delete if Completed Option at Bottom */}
          <div className="flex items-center justify-between pt-2 border-t border-amber-200/60">
            <span className="text-xs text-slate-500 font-semibold">
              Drive completed. Remove company drive profile from active portal?
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
      ) : (
        /* Action Banner for Active Companies */
        <div className="bg-white rounded-3xl p-8 border border-slate-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <div className="flex items-center space-x-2 text-amber-600 font-bold text-xs">
              <Award className="w-4 h-4" />
              <span>PROCESS COMPLETION & FINAL DATA ENTRY</span>
            </div>
            <h4 className="text-lg font-extrabold text-slate-900">
              Is the recruitment process completed for {company.name}?
            </h4>
            <p className="text-xs text-slate-500 max-w-2xl">
              Once all rounds finish, mark the process as completed to input the actual total students sat, offers granted, and recruiter feedback.
            </p>
          </div>

          <button
            onClick={() => setShowCompletionModal(true)}
            className="inline-flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-extrabold px-5 py-3 rounded-2xl shadow-md transition-all active:scale-95 cursor-pointer shrink-0"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Mark Drive Completed & Input Data</span>
          </button>
        </div>
      )}

      {/* Completion Data Entry Modal */}
      {showCompletionModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-extrabold text-slate-900">
                  Finalize Drive for {company.name}
                </h3>
              </div>
              <button
                onClick={() => setShowCompletionModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFinalizeCompletionSubmit} className="space-y-4 text-xs">
              <p className="text-slate-500 font-medium">
                Enter the final drive statistics and recruiter feedback collected for {company.name}:
              </p>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Total Students Sat (Across All Rounds) *
                </label>
                <input
                  type="number"
                  required
                  min={1}
                  placeholder="e.g. 140"
                  value={completionSatCount}
                  onChange={(e) => setCompletionSatCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-extrabold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Number of Students Given Offer *
                </label>
                <input
                  type="number"
                  required
                  min={0}
                  placeholder="e.g. 12"
                  value={completionOffersCount}
                  onChange={(e) => setCompletionOffersCount(Number(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-extrabold text-slate-900 outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Recruiter Feedback & Review *
                </label>
                <textarea
                  rows={4}
                  required
                  placeholder="Enter feedback given by recruiter (e.g. Candidate performance ratings, technical depth, interview review)..."
                  value={completionFeedback}
                  onChange={(e) => setCompletionFeedback(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-medium text-slate-900 outline-none focus:ring-2 focus:ring-amber-500 leading-relaxed"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowCompletionModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md cursor-pointer"
                >
                  Save & Finalize Completed Process
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Round Modal matching user specifications */}
      {showAddRoundModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-4 border border-slate-100 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-lg font-extrabold text-slate-900">
                Schedule Drive Round & Allocate SPRs
              </h3>
              <button
                onClick={() => setShowAddRoundModal(false)}
                className="text-slate-400 font-bold hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleFinalizeCreateRound} className="space-y-3 text-xs">
              {/* Target Company dropdown (pre-selected) */}
              <div>
                <label className="font-bold text-slate-700 block mb-1">Target Company</label>
                <select
                  disabled
                  value={company.id}
                  className="w-full bg-slate-100 border border-slate-200 rounded-xl p-2.5 font-bold text-slate-800"
                >
                  <option value={company.id}>{company.name} ({company.category})</option>
                </select>
              </div>

              {/* Round Title & Round Category Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Round Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Technical Interview"
                    value={roundName}
                    onChange={(e) => setRoundName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Round Category</label>
                  <select
                    value={roundType}
                    onChange={(e) => setRoundType(e.target.value as RoundType)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  >
                    <option value="PPT">Pre-Placement Talk (PPT)</option>
                    <option value="ONLINE_TEST">Online Aptitude Test</option>
                    <option value="CODING">Coding Assessment</option>
                    <option value="GD">Group Discussion (GD)</option>
                    <option value="TECHNICAL_INTERVIEW">Technical Interview</option>
                    <option value="HR_INTERVIEW">HR Interview</option>
                  </select>
                </div>
              </div>

              {/* Date Scheduled & Mode Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Process Scheduled Date *</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Mode</label>
                  <select
                    value={roundMode}
                    onChange={(e) => setRoundMode(e.target.value as RoundMode)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  >
                    <option value="ON_CAMPUS">On Campus</option>
                    <option value="VIRTUAL">Virtual</option>
                    <option value="HYBRID">Hybrid</option>
                  </select>
                </div>
              </div>

              {/* Total Venues & Total SPRs Needed */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total Venues *</label>
                  <select
                    value={totalVenues}
                    onChange={(e) => handleTotalVenuesChange(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none cursor-pointer focus:ring-2 focus:ring-amber-500"
                  >
                    <option value={1}>1 Venue</option>
                    <option value={2}>2 Venues</option>
                    <option value={3}>3 Venues</option>
                    <option value={4}>4 Venues</option>
                    <option value={5}>5 Venues</option>
                    <option value={6}>6 Venues</option>
                    <option value={7}>7 Venues</option>
                    <option value={8}>8 Venues</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Total SPRs Needed *</label>
                  <input
                    type="number"
                    min={1}
                    max={30}
                    value={sprsNeeded}
                    onChange={(e) => setSprsNeeded(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none"
                  />
                </div>
              </div>

              {/* Venue Locations Input List */}
              <div className="space-y-2 bg-slate-50/80 p-3 rounded-2xl border border-slate-200/60">
                <label className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
                  Venue Locations ({venuesList.length})
                </label>
                {venuesList.map((venueName, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-400 w-16">Venue {idx + 1}:</span>
                    <input
                      type="text"
                      required
                      placeholder={`e.g. Block ${String.fromCharCode(65 + idx)} - Lab ${idx + 1}`}
                      value={venueName}
                      onChange={(e) => handleVenueNameChange(idx, e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl p-2 font-bold outline-none text-xs"
                    />
                  </div>
                ))}
              </div>

              {/* SPR Equal/Random Allocation Breakdown Display */}
              <div className="bg-emerald-50 border border-emerald-200/80 p-3 rounded-2xl space-y-1">
                <div className="font-extrabold text-emerald-900 text-[11px] flex items-center space-x-1">
                  <Users className="w-3.5 h-3.5 text-emerald-600 inline mr-1" />
                  <span>Equal SPR Allocation Across Venues ({sprsNeeded} SPRs Total)</span>
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {getSprAllocationPerVenue().map((alloc, idx) => (
                    <span
                      key={idx}
                      className="bg-white text-emerald-900 font-extrabold text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs"
                    >
                      {alloc.venueName}: {alloc.allocatedSprs} SPRs
                    </span>
                  ))}
                </div>
              </div>

              {/* Shortlist Candidate Roster Excel card */}
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="font-bold text-amber-900">Shortlist Candidate Roster</div>
                  <div className="text-[11px] text-amber-700">
                    {shortlistedStudentsTemp.length > 0
                      ? `${shortlistedStudentsTemp.length} candidates loaded from recruiter sheet`
                      : 'Upload recruiter Excel sheet (reads Name/Email)'}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowExcelUpload(true)}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold px-3.5 py-2 rounded-xl text-xs shadow-xs cursor-pointer"
                >
                  Upload Excel
                </button>
              </div>

              {/* Footer action buttons */}
              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddRoundModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0B132B] hover:bg-slate-800 text-white font-bold rounded-xl shadow-md cursor-pointer"
                >
                  Create & Launch Selection Round
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

      {/* Excel Upload Modal */}
      <ExcelUploadModal
        isOpen={showExcelUpload}
        onClose={() => setShowExcelUpload(false)}
        onShortlistValidated={(validStudents) => {
          setShortlistedStudentsTemp(validStudents);
          setShowExcelUpload(false);
        }}
      />

      {/* Round Details Modal */}
      <RoundDetailsModal
        round={selectedRoundForDetails}
        onClose={() => setSelectedRoundForDetails(null)}
      />
    </div>
  );
};
