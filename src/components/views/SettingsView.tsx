import React, { useState } from 'react';
import {
  ShieldCheck,
  UserPlus,
  Users,
  Search,
  Edit2,
  Trash2,
  Lock,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  MapPin,
  X,
  KeyRound,
  Building,
  Mail,
  User,
  ShieldAlert,
} from 'lucide-react';
import { usePortal } from '../../context/PortalContext';
import { PortalUser, UserRole } from '../../types';

export const SettingsView: React.FC = () => {
  const {
    currentUser,
    users,
    createUser,
    updateUser,
    deleteUser,
    resetPortalData,
  } = usePortal();

  const isMasterAdmin = currentUser?.role === 'MASTER_ADMIN';

  // Filters & State
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<PortalUser | null>(null);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form State for New User
  const [newName, setNewName] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('PLACEMENT_OFFICER');
  const [newPassword, setNewPassword] = useState('Pass@123');
  const [newDepartment, setNewDepartment] = useState('Directorate of Career Services');

  // Form State for Edit User
  const [editName, setEditName] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('PLACEMENT_OFFICER');
  const [editDepartment, setEditDepartment] = useState('');
  const [editStatus, setEditStatus] = useState<'ACTIVE' | 'DISABLED'>('ACTIVE');
  const [editPassword, setEditPassword] = useState('');

  const triggerToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // If not master admin, display unauthorized access screen
  if (!isMasterAdmin) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-8 bg-white rounded-3xl border border-slate-200">
        <div className="w-16 h-16 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-black text-slate-900 mb-2">Access Restricted</h2>
        <p className="text-sm text-slate-600 max-w-md">
          Portal settings and user governance are strictly restricted to the <strong>Master Admin</strong>.
          Regular portal users can view and use operational modules but cannot modify user credentials or permissions.
        </p>
      </div>
    );
  }

  // Filtered users
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleOpenEdit = (user: PortalUser) => {
    setEditingUser(user);
    setEditName(user.name);
    setEditRole(user.role);
    setEditDepartment(user.department || '');
    setEditStatus(user.status);
    setEditPassword('');
  };

  const handleCreateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanU = newUsername.trim();
    if (!newName.trim() || !cleanU) return;

    const emailVal = (newEmail.trim() || cleanU);

    const res = createUser({
      name: newName.trim(),
      username: cleanU,
      email: emailVal,
      role: newRole,
      password: newPassword.trim() || 'Pass@123',
      status: 'ACTIVE',
      department: newDepartment.trim(),
    });

    if (res && !res.success) {
      alert(res.message);
      return;
    }

    setShowCreateModal(false);
    setNewName('');
    setNewUsername('');
    setNewEmail('');
    setNewPassword('Pass@123');
    triggerToast(`User account for ${newName} created successfully.`);
  };

  const handleUpdateUserSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    const updates: Partial<PortalUser> = {
      name: editName.trim(),
      role: editRole,
      department: editDepartment.trim(),
      status: editStatus,
    };
    if (editPassword.trim()) {
      updates.password = editPassword.trim();
    }

    updateUser(editingUser.id, updates);
    setEditingUser(null);
    triggerToast(`Updated account settings for ${editName}.`);
  };

  const handleDeleteUser = (id: string, name: string) => {
    if (id === currentUser?.id || id === 'usr-master-admin') {
      alert('Cannot delete the primary Master Admin account.');
      return;
    }
    if (confirm(`Are you sure you want to delete user account "${name}"? This action cannot be undone.`)) {
      deleteUser(id);
      triggerToast(`Account for ${name} removed.`);
    }
  };

  const handleConfirmReset = () => {
    resetPortalData();
    setShowResetConfirmModal(false);
    triggerToast('Portal data reset to production state successfully.');
  };

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'MASTER_ADMIN':
        return (
          <span className="inline-flex items-center space-x-1 bg-amber-100 text-amber-900 text-[10px] font-black px-2.5 py-1 rounded-full border border-amber-300">
            <Sparkles className="w-3 h-3 text-amber-600" />
            <span>MASTER ADMIN</span>
          </span>
        );
      case 'PLACEMENT_OFFICER':
        return (
          <span className="inline-flex items-center space-x-1 bg-blue-100 text-blue-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-blue-200">
            <span>PLACEMENT OFFICER</span>
          </span>
        );
      case 'SPR':
        return (
          <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-emerald-200">
            <span>SPR REP</span>
          </span>
        );
      case 'RECRUITER':
        return (
          <span className="inline-flex items-center space-x-1 bg-purple-100 text-purple-900 text-[10px] font-bold px-2.5 py-1 rounded-full border border-purple-200">
            <span>RECRUITER</span>
          </span>
        );
      case 'STUDENT':
        return (
          <span className="inline-flex items-center space-x-1 bg-slate-100 text-slate-800 text-[10px] font-bold px-2.5 py-1 rounded-full border border-slate-200">
            <span>STUDENT</span>
          </span>
        );
      default:
        return (
          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2.5 py-1 rounded-full">
            {role}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 select-none pb-16 max-w-6xl">
      {/* Toast */}
      {successToast && (
        <div className="fixed top-6 right-6 z-50 bg-emerald-600 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center space-x-3 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-white shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="text-[11px] font-extrabold tracking-widest text-slate-400 uppercase mb-1">
            MASTER ADMIN CONSOLE
          </div>
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight mb-2">
            Portal Settings & User Governance
          </h2>
          <p className="text-sm font-medium text-slate-500 max-w-2xl">
            Authorize team members, manage account credentials, configure campus placement rules, and oversee production data.
          </p>
        </div>

        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center space-x-2 bg-[#0B132B] hover:bg-slate-800 text-white text-xs font-black px-5 py-3 rounded-xl shadow-lg transition-all cursor-pointer"
        >
          <UserPlus className="w-4 h-4 text-amber-400" />
          <span>Create New User</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Total Accounts</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{users.length}</div>
          <div className="text-[10px] text-emerald-600 font-bold mt-1">100% Operational</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Master Admins</div>
          <div className="text-2xl font-black text-amber-600 mt-1">
            {users.filter((u) => u.role === 'MASTER_ADMIN').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Full Authority</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">Placement Officers</div>
          <div className="text-2xl font-black text-blue-600 mt-1">
            {users.filter((u) => u.role === 'PLACEMENT_OFFICER').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Drive Managers</div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
          <div className="text-[11px] font-bold text-slate-400 uppercase">SPR Representatives</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {users.filter((u) => u.role === 'SPR').length}
          </div>
          <div className="text-[10px] text-slate-400 mt-1">Ground Team</div>
        </div>
      </div>

      {/* User Management Table Section */}
      <div className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900">Registered Portal Users</h3>
            <p className="text-xs text-slate-400">
              Only the Master Admin can provision, edit credentials, or deactivate accounts.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 w-56"
              />
            </div>

            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500"
            >
              <option value="ALL">All Roles</option>
              <option value="MASTER_ADMIN">Master Admin</option>
              <option value="PLACEMENT_OFFICER">Placement Officer</option>
              <option value="SPR">SPR</option>
              <option value="RECRUITER">Recruiter</option>
              <option value="STUDENT">Student</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 uppercase font-black tracking-wider text-[10px]">
                <th className="pb-3 pl-2">User Details</th>
                <th className="pb-3">Role & Authority</th>
                <th className="pb-3">Department</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Password</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((u) => {
                const isSelf = u.id === currentUser?.id || u.username === currentUser?.username;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 pl-2">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-[#0B132B] text-amber-400 flex items-center justify-center font-black text-xs shrink-0">
                          {u.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{u.name}</span>
                            {isSelf && (
                              <span className="text-[9px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-black">
                                YOU
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">{u.username}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3">{getRoleBadge(u.role)}</td>

                    <td className="py-3 font-medium text-slate-600">
                      {u.department || 'Career Services'}
                    </td>

                    <td className="py-3">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                          u.status === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            u.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        <span>{u.status}</span>
                      </span>
                    </td>

                    <td className="py-3 font-mono text-[11px] text-slate-500">
                      {u.password || '••••••••'}
                    </td>

                    <td className="py-3 pr-2 text-right">
                      <div className="inline-flex items-center space-x-2">
                        <button
                          onClick={() => handleOpenEdit(u)}
                          className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit user details"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        {!isSelf && u.id !== 'usr-master-admin' && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete user account"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Production Data Governance / Clear Portal */}
      <div className="bg-rose-50/50 rounded-3xl p-6 border border-rose-100 shadow-sm space-y-4">
        <div className="flex items-center space-x-3">
          <AlertTriangle className="w-5 h-5 text-rose-600" />
          <h3 className="text-base font-black text-rose-950">Production Data Governance</h3>
        </div>
        <p className="text-xs text-rose-700 max-w-3xl">
          Resetting will flush all current session drives, uploaded sheets, and temporary attendance records from your browser's local database while keeping your Master Admin account intact. Use this before launching a fresh drive season.
        </p>

        <button
          onClick={() => setShowResetConfirmModal(true)}
          className="inline-flex items-center space-x-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>Reset Portal Data to Production Clean State</span>
        </button>
      </div>

      {/* CREATE USER MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <UserPlus className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-black text-slate-900">Create Portal User</h3>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Dr. Neeraj Sharma"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Username / UPES Email</label>
                  <input
                    type="text"
                    required
                    placeholder="user@stu.upes.ac.in"
                    value={newUsername}
                    onChange={(e) => {
                      setNewUsername(e.target.value);
                      setNewEmail(e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role / Authority</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="MASTER_ADMIN">Master Admin (Full Access)</option>
                    <option value="PLACEMENT_OFFICER">Placement Officer (PO)</option>
                    <option value="SPR">SPR Representative</option>
                    <option value="RECRUITER">Recruiter Partner (Read-Only)</option>
                    <option value="STUDENT">Student Candidate</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Password</label>
                  <input
                    type="text"
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department / Division</label>
                  <input
                    type="text"
                    value={newDepartment}
                    onChange={(e) => setNewDepartment(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0B132B] hover:bg-slate-800 text-white font-black rounded-xl shadow-md cursor-pointer"
                >
                  Create Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT USER MODAL */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center space-x-2">
                <Edit2 className="w-5 h-5 text-amber-500" />
                <h3 className="text-lg font-black text-slate-900">Edit User: {editingUser.name}</h3>
              </div>
              <button
                onClick={() => setEditingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdateUserSubmit} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Role / Authority</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="MASTER_ADMIN">Master Admin</option>
                    <option value="PLACEMENT_OFFICER">Placement Officer</option>
                    <option value="SPR">SPR</option>
                    <option value="RECRUITER">Recruiter</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Status</label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as 'ACTIVE' | 'DISABLED')}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="DISABLED">DISABLED</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Department</label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">
                  Change Password (leave blank to keep unchanged)
                </label>
                <input
                  type="text"
                  placeholder="Enter new password"
                  value={editPassword}
                  onChange={(e) => setEditPassword(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 font-mono font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-[#0B132B] hover:bg-slate-800 text-white font-black rounded-xl shadow-md cursor-pointer"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CONFIRM RESET MODAL */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900 mb-2">Confirm Data Reset</h3>
            <p className="text-xs text-slate-600 mb-6">
              This will erase all temporary companies, drives, rounds, and local attendance records, returning the system to a clean production slate. Your Master Admin account will remain active.
            </p>
            <div className="flex items-center justify-end space-x-3">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReset}
                className="px-4 py-2 text-xs font-black text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md cursor-pointer"
              >
                Yes, Reset All Data
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
