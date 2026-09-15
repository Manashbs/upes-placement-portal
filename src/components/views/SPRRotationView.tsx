import React, { useState } from 'react';
import { usePortal } from '../../context/PortalContext';
import { SPR } from '../../types';
import {
  Building2,
  MapPin,
  Trash2,
  UserPlus,
  X,
  ChevronRight,
  UserCheck,
  Edit2,
  Calendar,
  Search,
  RotateCw,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Sparkles,
  Phone,
  Mail,
  Filter,
  Clock,
  Briefcase,
} from 'lucide-react';

export const SPRRotationView: React.FC = () => {
  const { sprs, dutyAssignments, sprCycle, addSpr, updateSpr, deleteSpr, resetAllDutiesToZero } = usePortal();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'AVAILABLE' | 'ASSIGNED'>('ALL');
  const [sortBy, setSortBy] = useState<'FEWEST' | 'MOST' | 'NAME'>('FEWEST');
  const [copiedSap, setCopiedSap] = useState<string | null>(null);

  // State for SPR details modal
  const [selectedSprDetails, setSelectedSprDetails] = useState<SPR | null>(null);

  // Add SPR Modal state
  const [showAddSprModal, setShowAddSprModal] = useState(false);
  const [newSprName, setNewSprName] = useState('');
  const [newSprSapId, setNewSprSapId] = useState('');
  const [newSprBranch, setNewSprBranch] = useState('B.Tech CSE');
  const [newSprEmail, setNewSprEmail] = useState('');
  const [newSprPhone, setNewSprPhone] = useState('');

  // Edit SPR Modal state
  const [sprToEdit, setSprToEdit] = useState<SPR | null>(null);
  const [editName, setEditName] = useState('');
  const [editSapId, setEditSapId] = useState('');
  const [editBranch, setEditBranch] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPhone, setEditPhone] = useState('');

  const handleCopySap = (sap: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(sap);
    setCopiedSap(sap);
    setTimeout(() => setCopiedSap(null), 2000);
  };

  const handleOpenEdit = (spr: SPR, e: React.MouseEvent) => {
    e.stopPropagation();
    setSprToEdit(spr);
    setEditName(spr.name);
    setEditSapId(spr.sapId);
    setEditBranch(spr.branch);
    setEditEmail(spr.email);
    setEditPhone(spr.phone || '');
  };

  const handleSaveEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!sprToEdit || !editName.trim() || !editSapId.trim()) return;

    updateSpr(sprToEdit.id, {
      name: editName.trim(),
      sapId: editSapId.trim(),
      branch: editBranch.trim() || 'B.Tech CSE',
      email: editEmail.trim(),
      phone: editPhone.trim(),
    });

    setSprToEdit(null);
  };

  const handleAddSprSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSprName.trim() || !newSprSapId.trim()) return;

    addSpr({
      name: newSprName.trim(),
      sapId: newSprSapId.trim(),
      branch: newSprBranch || 'B.Tech CSE',
      email: newSprEmail.trim(),
      phone: newSprPhone.trim(),
    });

    setNewSprName('');
    setNewSprSapId('');
    setNewSprEmail('');
    setNewSprPhone('');
    setShowAddSprModal(false);
  };

  // Metrics
  const totalDutiesCount = dutyAssignments.length;
  const availableCount = sprs.filter((s) => !s.usedInCurrentCycle).length;
  const assignedCount = sprs.filter((s) => s.usedInCurrentCycle).length;
  const maxDutiesInPool = Math.max(1, ...sprs.map((s) => s.totalDuties || 0));

  // Filter & Sort
  const filteredSprs = sprs
    .filter((s) => {
      const q = searchTerm.toLowerCase();
      const matchesSearch =
        s.name.toLowerCase().includes(q) ||
        s.sapId.includes(q) ||
        s.branch.toLowerCase().includes(q);

      if (filterStatus === 'AVAILABLE') return matchesSearch && !s.usedInCurrentCycle;
      if (filterStatus === 'ASSIGNED') return matchesSearch && s.usedInCurrentCycle;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'FEWEST') return a.totalDuties - b.totalDuties;
      if (sortBy === 'MOST') return b.totalDuties - a.totalDuties;
      if (sortBy === 'NAME') return a.name.localeCompare(b.name);
      return 0;
    });

  return (
    <div className="space-y-8 select-none pb-12">
      {/* Executive Header Banner */}
      <div className="bg-gradient-to-r from-[#0B132B] via-[#1C2541] to-[#0B132B] rounded-3xl p-8 text-white shadow-xl relative overflow-hidden border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15),transparent_70%)] pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 bg-amber-500/20 text-amber-300 px-3 py-1 rounded-full text-xs font-black tracking-wider uppercase border border-amber-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>UPES SPR Command Center</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Student Placement Representatives
            </h2>
            <p className="text-sm text-slate-300 max-w-2xl font-medium leading-relaxed">
              Automated fair-cycle rotation roster. Allots representatives across company selection rounds with verified clash prevention and live venue tracking.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={() => {
                if (window.confirm('Reset all SPR duty counts to 0 and clear all duty allocations?')) {
                  resetAllDutiesToZero();
                }
              }}
              className="inline-flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white text-xs font-black px-4 py-3.5 rounded-2xl border border-white/20 transition-all cursor-pointer active:scale-95"
              title="Reset all duty counts to 0 and start a fresh rotation"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>Reset Duties to 0</span>
            </button>

            <button
              onClick={() => setShowAddSprModal(true)}
              className="inline-flex items-center space-x-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs sm:text-sm font-black px-5 py-3.5 rounded-2xl shadow-lg shadow-amber-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add Representative</span>
            </button>
          </div>
        </div>
      </div>

      {/* 4 Executive Metric Widgets */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black shrink-0 border border-amber-200/60">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Active SPR Pool
            </span>
            <span className="text-2xl font-black text-slate-900">
              {sprs.length}
            </span>
            <span className="text-[11px] font-bold text-emerald-600 block">
              100% Verified Representatives
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black shrink-0 border border-blue-200/60">
            <RotateCw className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Cycle Status
            </span>
            <span className="text-2xl font-black text-slate-900">
              Cycle #{sprCycle.id}
            </span>
            <span className="text-[11px] font-bold text-blue-600 block">
              Fair Balance Active
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black shrink-0 border border-emerald-200/60">
            <UserCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Available for Duty
            </span>
            <span className="text-2xl font-black text-slate-900">
              {availableCount}
            </span>
            <span className="text-[11px] font-bold text-slate-500 block">
              Ready for Next Round
            </span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex items-center space-x-4">
          <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-600 flex items-center justify-center font-black shrink-0 border border-purple-200/60">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 block">
              Total Duties Allotted
            </span>
            <span className="text-2xl font-black text-slate-900">
              {totalDutiesCount}
            </span>
            <span className="text-[11px] font-bold text-purple-600 block">
              Across Selection Rounds
            </span>
          </div>
        </div>
      </div>

      {/* Filter, Search & Sorting Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3 w-full md:w-auto">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search representative by name, SAP ID, or branch..."
              className="w-full bg-slate-50 text-slate-900 text-xs font-bold rounded-xl pl-10 pr-4 py-2.5 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto">
            {[
              { id: 'ALL', label: `All (${sprs.length})` },
              { id: 'AVAILABLE', label: `Available (${availableCount})` },
              { id: 'ASSIGNED', label: `On Duty (${assignedCount})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterStatus(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                  filterStatus === tab.id
                    ? 'bg-[#0B132B] text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-2 w-full md:w-auto justify-end">
          <span className="text-xs font-bold text-slate-400 flex items-center space-x-1">
            <Filter className="w-3.5 h-3.5" />
            <span>Sort by:</span>
          </span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs font-black text-slate-800 outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer"
          >
            <option value="FEWEST">Fairness (Fewest Duties First)</option>
            <option value="MOST">Most Experienced (Most Duties)</option>
            <option value="NAME">Name (A-Z)</option>
          </select>
        </div>
      </div>

      {/* SPR Cards Roster Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredSprs.map((spr) => {
          const sprDuties = dutyAssignments.filter(
            (d) => d.sprId === spr.id || d.sprName.toLowerCase() === spr.name.toLowerCase()
          );

          const isAssigned = spr.usedInCurrentCycle;
          const dutyPercent = Math.min(100, Math.round((spr.totalDuties / maxDutiesInPool) * 100));

          return (
            <div
              key={spr.id}
              onClick={() => setSelectedSprDetails(spr)}
              className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between space-y-5 cursor-pointer group relative overflow-hidden"
            >
              {/* Top Accent Line based on duty availability */}
              <div
                className={`absolute top-0 left-0 right-0 h-1.5 ${
                  isAssigned ? 'bg-amber-400' : 'bg-emerald-400'
                }`}
              />

              <div className="space-y-4">
                {/* Card Header: Avatar, Name, Badges, Edit & Delete */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center space-x-3.5 min-w-0">
                    <div
                      className={`w-13 h-13 rounded-2xl flex items-center justify-center font-black text-base shadow-sm shrink-0 transition-transform group-hover:scale-105 ${
                        isAssigned
                          ? 'bg-[#0B132B] text-amber-400 ring-2 ring-amber-400/30'
                          : 'bg-emerald-950 text-emerald-400 ring-2 ring-emerald-400/30'
                      }`}
                    >
                      {spr.name
                        .split(' ')
                        .filter(Boolean)
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join('')
                        .toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <h4 className="font-black text-slate-900 text-base truncate group-hover:text-amber-600 transition-colors">
                        {spr.name}
                      </h4>

                      <div className="flex items-center space-x-2 mt-0.5">
                        <span
                          onClick={(e) => handleCopySap(spr.sapId, e)}
                          title="Click to copy SAP ID"
                          className="font-mono text-[11px] font-black text-slate-500 bg-slate-100 hover:bg-slate-200 px-2 py-0.5 rounded-md flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <span>{spr.sapId}</span>
                          <Copy className="w-2.5 h-2.5 text-slate-400" />
                        </span>

                        {copiedSap === spr.sapId && (
                          <span className="text-[10px] font-bold text-emerald-600 animate-in fade-in">
                            Copied!
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
                        {spr.branch}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center space-x-1 shrink-0">
                    <button
                      onClick={(e) => handleOpenEdit(spr, e)}
                      title="Edit Representative Details"
                      className="p-2 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Are you sure you want to remove SPR ${spr.name}?`)) {
                          deleteSpr(spr.id);
                        }
                      }}
                      title="Remove Representative"
                      className="p-2 rounded-xl text-slate-300 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Duty Balance Pill & Visual Meter */}
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-100 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-extrabold text-slate-700">
                      Total Duties: <strong className="text-slate-900 text-sm">{spr.totalDuties}</strong>
                    </span>

                    <span
                      className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                        isAssigned
                          ? 'bg-amber-50 text-amber-800 border-amber-200'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                      }`}
                    >
                      {isAssigned ? '• Duty Assigned in Cycle' : '• Available for Next Round'}
                    </span>
                  </div>

                  <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isAssigned ? 'bg-amber-500' : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.max(10, dutyPercent)}%` }}
                    />
                  </div>
                </div>

                {/* COMPLETE DUTIES HISTORY ON CARD (Company, Round, Venue, Day) */}
                <div className="space-y-2 pt-1">
                  <div className="flex items-center justify-between text-[11px] font-black text-slate-400 uppercase tracking-wider">
                    <span>Assigned Process Duties ({sprDuties.length})</span>
                    <Building2 className="w-3.5 h-3.5" />
                  </div>

                  {sprDuties.length === 0 ? (
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center text-xs font-semibold text-slate-400 italic">
                      No duties allotted yet. Ready for rotation.
                    </div>
                  ) : (
                    <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                      {sprDuties.map((duty) => (
                        <div
                          key={duty.id}
                          className="bg-slate-50/90 hover:bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2 transition-all hover:border-amber-300"
                        >
                          {/* Company Name & Status */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-1.5 min-w-0">
                              <Briefcase className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                              <span className="font-black text-slate-900 text-xs truncate">
                                {duty.companyName}
                              </span>
                            </div>

                            <span
                              className={`text-[9px] font-black px-2 py-0.5 rounded-md shrink-0 border ${
                                duty.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-700 border-slate-200'
                                  : 'bg-amber-100 text-amber-900 border-amber-300'
                              }`}
                            >
                              {duty.status === 'COMPLETED' ? 'Completed' : 'Duty Allotted'}
                            </span>
                          </div>

                          {/* Round Name */}
                          <div className="text-[11px] font-extrabold text-amber-950 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/60 truncate">
                            {duty.roundName}
                          </div>

                          {/* Date, Venue & Time Details */}
                          <div className="space-y-1 text-[11px] text-slate-600 font-medium pt-1 border-t border-slate-200/60">
                            <div className="flex items-center space-x-1.5">
                              <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>Date: <strong className="text-slate-900 font-black">{duty.date || 'Drive Day'}</strong></span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                              <span className="truncate">Venue: <strong className="text-slate-900 font-bold">{duty.venue || 'Campus Venue'}</strong></span>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <Clock className="w-3 h-3 text-blue-500 shrink-0" />
                              <span>Time: <strong className="text-slate-800 font-semibold">{duty.timeWindow || 'Full Day'}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Card Footer with Contact & Dossier Link */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="flex items-center space-x-3 text-slate-400 text-[11px]">
                  {spr.phone && (
                    <span className="flex items-center space-x-1" title={spr.phone}>
                      <Phone className="w-3 h-3" />
                      <span className="font-semibold">{spr.phone.slice(-4)}</span>
                    </span>
                  )}
                  {spr.email && (
                    <span className="flex items-center space-x-1" title={spr.email}>
                      <Mail className="w-3 h-3" />
                      <span className="truncate max-w-[100px] font-semibold">{spr.email.split('@')[0]}</span>
                    </span>
                  )}
                </div>

                <span className="font-black text-amber-600 group-hover:text-amber-700 flex items-center space-x-1 transition-colors">
                  <span>Full Profile</span>
                  <ChevronRight className="w-3.5 h-3.5 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* EDIT SPR MODAL */}
      {sprToEdit && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                  <Edit2 className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900">Edit SPR Details</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Update representative contact and branch</p>
                </div>
              </div>
              <button
                onClick={() => setSprToEdit(null)}
                className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEditSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Representative Name *</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">SAP ID *</label>
                <input
                  type="text"
                  required
                  value={editSapId}
                  onChange={(e) => setEditSapId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Branch / Discipline</label>
                <input
                  type="text"
                  value={editBranch}
                  onChange={(e) => setEditBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number</label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  placeholder="+91 98765 00000"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSprToEdit(null)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SPR FULL DETAILS MODAL */}
      {selectedSprDetails && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-100 overflow-hidden flex flex-col my-8">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 shrink-0">
              <div className="flex items-center space-x-3.5">
                <div className="w-14 h-14 rounded-2xl bg-[#0B132B] text-amber-400 font-black flex items-center justify-center text-lg shadow-sm">
                  {selectedSprDetails.name.split(' ').filter(Boolean).map((n) => n[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{selectedSprDetails.name}</h3>
                  <p className="text-xs text-slate-400 font-mono font-bold">
                    SAP: {selectedSprDetails.sapId} · {selectedSprDetails.branch}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedSprDetails(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
              <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Duties</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{selectedSprDetails.totalDuties}</div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Rotation Status</span>
                  <div className="text-xs font-black text-amber-600 mt-1">
                    {selectedSprDetails.usedInCurrentCycle ? 'Duty Assigned' : 'Available'}
                  </div>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Phone</span>
                  <div className="text-xs font-bold text-slate-700 mt-1">
                    {selectedSprDetails.phone || 'Available'}
                  </div>
                </div>
              </div>

              {/* Complete Duty Timeline History */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Duty Allotments History
                </h4>

                {(() => {
                  const duties = dutyAssignments.filter(
                    (d) => d.sprId === selectedSprDetails.id || d.sprName.toLowerCase() === selectedSprDetails.name.toLowerCase()
                  );

                  if (duties.length === 0) {
                    return (
                      <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 text-center space-y-1">
                        <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
                        <div className="text-xs font-bold text-slate-700">No duty history recorded yet</div>
                        <p className="text-[11px] text-slate-400">
                          This representative is available in the SPR pool and ready for allocation.
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-3">
                      {duties.map((duty) => (
                        <div
                          key={duty.id}
                          className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2.5 hover:border-amber-400 transition-all"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                              <span className="font-black text-slate-900 text-sm">{duty.companyName}</span>
                              <span className="text-xs text-amber-900 font-extrabold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                {duty.roundName}
                              </span>
                            </div>
                            <span
                              className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${
                                duty.status === 'COMPLETED'
                                  ? 'bg-slate-100 text-slate-600 border-slate-200'
                                  : 'bg-amber-50 text-amber-800 border-amber-200'
                              }`}
                            >
                              {duty.status === 'COMPLETED' ? 'Completed' : 'Duty Allotted'}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs pt-1 border-t border-slate-100 text-slate-600">
                            <div className="flex items-center space-x-1.5 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                              <span>Date: <strong className="text-slate-900">{duty.date || 'Drive Day'}</strong></span>
                            </div>

                            <div className="flex items-center space-x-1.5 font-medium">
                              <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">Venue: <strong className="text-slate-900">{duty.venue || 'Campus Venue'}</strong></span>
                            </div>

                            <div className="flex items-center space-x-1.5 font-medium">
                              <Clock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span>Time: <strong className="text-slate-900">{duty.timeWindow || 'Full Day'}</strong></span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>
            </div>

            <div className="flex items-center justify-end px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50/50">
              <button
                onClick={() => setSelectedSprDetails(null)}
                className="bg-slate-900 hover:bg-slate-800 text-white text-xs font-black px-5 py-2.5 rounded-xl transition-all cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add New SPR Modal */}
      {showAddSprModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-100">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <h3 className="text-base font-black text-slate-900">Add New SPR Representative</h3>
              </div>
              <button onClick={() => setShowAddSprModal(false)} className="text-slate-400 font-bold hover:text-slate-600">✕</button>
            </div>

            <form onSubmit={handleAddSprSubmit} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">SPR Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Vikramaditya Singh"
                  value={newSprName}
                  onChange={(e) => setNewSprName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">SAP ID *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 59001240"
                  value={newSprSapId}
                  onChange={(e) => setNewSprSapId(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Branch / Discipline</label>
                <input
                  type="text"
                  placeholder="e.g. B.Tech CSE - Cloud Computing"
                  value={newSprBranch}
                  onChange={(e) => setNewSprBranch(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone Number (Optional)</label>
                <input
                  type="text"
                  placeholder="+91 98765 00000"
                  value={newSprPhone}
                  onChange={(e) => setNewSprPhone(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold outline-none text-[11px] focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 flex justify-end space-x-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddSprModal(false)}
                  className="px-4 py-2 font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition-all active:scale-95"
                >
                  Save SPR Representative
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
