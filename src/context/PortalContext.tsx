import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  UserRole,
  Student,
  Company,
  Drive,
  Round,
  RoundStudent,
  SPR,
  SPRCycle,
  SPRDutyAssignment,
  Offer,
  AuditLog,
  PortalUser,
} from '../types';
import {
  initialStudents,
  initialCompanies,
  initialDrives,
  initialRounds,
  initialRoundStudents,
  initialSPRs,
  initialSPRCycle,
  initialDutyAssignments,
  initialOffers,
  initialAuditLogs,
  initialUsers,
} from '../mock/mockData';
import { allocateSPRsForRound } from '../utils/sprAllocationEngine';
import { generateRoundQRToken } from '../utils/qrUtils';
import { fetchCloudAttendanceEvents, recordAttendanceToCloud, subscribeToLiveCloudScans, CloudAttendanceEvent } from '../utils/cloudSync';
import { saveSheetToStorage, getSheetBufferSync, getSheetMetaSync } from '../utils/sheetStorage';
import { fetchCloudUsers, publishUsersToCloud } from '../utils/userSync';

export interface ComprehensiveCompanyPayload {
  name: string;
  industry: string;
  category: Company['category'];
  ctcTotal: number;
  description: string;
  rolesOffered: string[];
  roundsCount?: number;
  roundTypes?: { name: string; type: Round['type']; venue: string }[];
  minCgpa: number;
  maxBacklogs: number;
  hrName?: string;
  hrEmail?: string;
  hrPhone?: string;
}

interface PortalContextType {
  currentUser: PortalUser | null;
  users: PortalUser[];
  login: (username: string, password: string, rememberMe?: boolean) => boolean;
  logout: () => void;
  createUser: (userData: Omit<PortalUser, 'id' | 'createdAt'>) => { success: boolean; message: string };
  updateUser: (userId: string, data: Partial<PortalUser>) => { success: boolean; message: string };
  deleteUser: (userId: string) => { success: boolean; message: string };
  resetPortalData: () => void;

  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  
  students: Student[];
  companies: Company[];
  drives: Drive[];
  rounds: Round[];
  roundStudents: RoundStudent[];
  sprs: SPR[];
  sprCycle: SPRCycle;
  dutyAssignments: SPRDutyAssignment[];
  offers: Offer[];
  auditLogs: AuditLog[];
  notifications: string[];

  // Actions
  addCompany: (payload: ComprehensiveCompanyPayload) => void;
  deleteCompany: (id: string) => void;
  toggleCompanyStatus: (id: string, status: Company['status']) => void;
  updateCompanyFeedback: (companyId: string, feedback: string) => void;
  finalizeCompletedDrive: (companyId: string, data: { totalStudentsSat: number; offersGivenCount: number; recruiterFeedback: string }) => void;
  createRound: (roundData: Partial<Round> & { sprsNeeded?: number }, shortlistedStudents: Student[], customSessionId?: string) => void;
  uploadShortlistForRound: (roundId: string, shortlistedStudents: Student[], customSessionId?: string) => void;
  deleteRound: (roundId: string) => void;
  markAttendance: (roundId: string, sapId: string, method?: string, candidateName?: string) => { success: boolean; message: string };
  manualAttendanceOverride: (roundId: string, sapId: string, status: 'PRESENT' | 'ABSENT', reason: string) => void;
  triggerSprAllocation: (roundId: string, countNeeded: number) => { success: boolean; count: number };
  addSpr: (sprData: { name: string; sapId: string; branch: string; email?: string; phone?: string }) => void;
  deleteSpr: (id: string) => void;
  acceptDuty: (dutyId: string) => void;
  debarStudent: (studentId: string, reason: string) => void;
  resolveUnknownSapIds: (newStudents: Student[]) => void;
  acceptOffer: (offerId: string) => void;
  regenerateQR: (roundId: string) => void;
  toggleGeoFence: (roundId: string) => void;

  // Original Excel buffer storage (per round) for preserving company sheet format
  storeOriginalExcel: (roundId: string, buffer: ArrayBuffer, rawMeta?: { headers: string[]; rows: any[][] }) => void;
  getOriginalExcel: (roundId: string) => ArrayBuffer | undefined;
  getOriginalExcelRaw: (roundId: string) => { headers: string[]; rows: any[][] } | undefined;
  syncFromCloud: () => Promise<void>;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<PortalUser[]>(() => {
    try {
      const cleanVer = localStorage.getItem('upes_clean_version');
      if (cleanVer === 'prod_v7_only_director_manash') {
        const saved = localStorage.getItem('upes_portal_users');
        if (saved) {
          const parsed: PortalUser[] = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            const blacklist = ['admin', 'officer', 'spr', 'recruiter', 'rohit.kumar@upes.ac.in', 'aanchal.gupta@upes.ac.in'];
            const filtered = parsed.filter((u) => {
              const uname = (u.username || '').toLowerCase();
              const uemail = (u.email || '').toLowerCase();
              return (
                !blacklist.includes(uname) &&
                !blacklist.includes(uemail) &&
                (u.role === 'DIRECTOR' || u.role === 'CSO' || u.role === 'CAREER_SERVICE_OFFICER' || u.role === 'MASTER_ADMIN')
              );
            });
            const hasDirector = filtered.some((u) => u.username.toLowerCase() === initialUsers[0].username.toLowerCase());
            if (!hasDirector) {
              filtered.unshift(initialUsers[0]);
            }
            return filtered;
          }
        }
      }
    } catch {}
    return initialUsers;
  });

  const [currentUser, setCurrentUser] = useState<PortalUser | null>(() => {
    try {
      const saved = localStorage.getItem('upes_current_user');
      if (saved) {
        const parsed: PortalUser = JSON.parse(saved);
        const blacklist = ['admin', 'officer', 'spr', 'recruiter', 'rohit.kumar@upes.ac.in', 'aanchal.gupta@upes.ac.in'];
        if (!blacklist.includes((parsed.username || '').toLowerCase())) {
          return parsed;
        }
      }
    } catch {}
    return null;
  });

  const [currentRole, setCurrentRole] = useState<UserRole>(() => {
    try {
      const saved = localStorage.getItem('upes_current_user');
      if (saved) {
        const u: PortalUser = JSON.parse(saved);
        return u.role;
      }
    } catch {}
    return 'DIRECTOR';
  });

  const [activeTab, setActiveTab] = useState<string>('command-center');

  // Automatic clean purge of old mock records and unwanted accounts from localStorage
  useEffect(() => {
    try {
      const cleanVer = localStorage.getItem('upes_clean_version');
      if (cleanVer !== 'prod_v7_only_director_manash') {
        localStorage.removeItem('upes_students');
        localStorage.removeItem('upes_companies');
        localStorage.removeItem('upes_drives');
        localStorage.removeItem('upes_rounds');
        localStorage.removeItem('upes_round_students');
        localStorage.removeItem('upes_sprs');
        localStorage.removeItem('upes_offers');
        localStorage.removeItem('upes_portal_users');
        localStorage.setItem('upes_portal_users', JSON.stringify(initialUsers));
        setUsers(initialUsers);
        publishUsersToCloud(initialUsers);
        localStorage.setItem('upes_clean_version', 'prod_v7_only_director_manash');
      }
    } catch {}
  }, []);

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('upes_students');
    return saved ? JSON.parse(saved) : initialStudents;
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('upes_companies');
    return saved ? JSON.parse(saved) : initialCompanies;
  });

  const [drives, setDrives] = useState<Drive[]>(initialDrives);
  const [rounds, setRounds] = useState<Round[]>(() => {
    const saved = localStorage.getItem('upes_rounds');
    return saved ? JSON.parse(saved) : initialRounds;
  });
  const [roundStudents, setRoundStudents] = useState<RoundStudent[]>(() => {
    const saved = localStorage.getItem('upes_round_students');
    return saved ? JSON.parse(saved) : initialRoundStudents;
  });
  const [sprs, setSprs] = useState<SPR[]>(() => {
    const saved = localStorage.getItem('upes_sprs');
    return saved ? JSON.parse(saved) : initialSPRs;
  });
  const [sprCycle, setSprCycle] = useState<SPRCycle>(initialSPRCycle);
  const [dutyAssignments, setDutyAssignments] = useState<SPRDutyAssignment[]>(initialDutyAssignments);
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [notifications, setNotifications] = useState<string[]>([
    'UPES Placement Portal is LIVE for Placement Operations.',
  ]);

  // Store original Excel file buffers per round (roundId -> ArrayBuffer)
  // Uses multi-layer storage (IndexedDB + memory + localStorage) so it survives page reloads and refreshes
  const [originalExcelBuffers, setOriginalExcelBuffers] = useState<Map<string, ArrayBuffer>>(new Map());

  const storeOriginalExcel = (roundId: string, buffer: ArrayBuffer, rawMeta?: { headers: string[]; rows: any[][] }) => {
    setOriginalExcelBuffers((prev) => {
      const next = new Map(prev);
      next.set(roundId, buffer);
      next.set('LATEST', buffer);
      return next;
    });

    // Save to multi-layer persistent sheet storage
    saveSheetToStorage(roundId, buffer, rawMeta);
  };

  const getOriginalExcel = (roundId: string): ArrayBuffer | undefined => {
    // 1. Check in-memory state map
    if (originalExcelBuffers.has(roundId)) {
      return originalExcelBuffers.get(roundId);
    }
    if (originalExcelBuffers.has('LATEST')) {
      return originalExcelBuffers.get('LATEST');
    }

    // 2. Check multi-layer sheetStorage
    const fromStorage = getSheetBufferSync(roundId);
    if (fromStorage) {
      setOriginalExcelBuffers((prev) => {
        const next = new Map(prev);
        next.set(roundId, fromStorage);
        return next;
      });
      return fromStorage;
    }

    return undefined;
  };

  const getOriginalExcelRaw = (roundId: string): { headers: string[]; rows: any[][] } | undefined => {
    return getSheetMetaSync(roundId);
  };

  // Sync to local storage for persistence & live sync across browser tabs
  useEffect(() => {
    localStorage.setItem('upes_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('upes_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('upes_sprs', JSON.stringify(sprs));
  }, [sprs]);

  useEffect(() => {
    localStorage.setItem('upes_rounds', JSON.stringify(rounds));
  }, [rounds]);

  useEffect(() => {
    localStorage.setItem('upes_round_students', JSON.stringify(roundStudents));
  }, [roundStudents]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_portal_users', JSON.stringify(users));
    } catch {}
  }, [users]);

  // Helper to trigger real-time live sync across state, localStorage, same-window events & BroadcastChannel
  const syncLiveAttendance = (newRoundStudents: RoundStudent[], newRounds: Round[]) => {
    setRoundStudents(newRoundStudents);
    setRounds(newRounds);
    try {
      localStorage.setItem('upes_round_students', JSON.stringify(newRoundStudents));
      localStorage.setItem('upes_rounds', JSON.stringify(newRounds));
    } catch {}

    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('upes_attendance_live_sync');
        bc.postMessage({ type: 'ATTENDANCE_LIVE_UPDATE' });
        bc.close();
      } catch {}
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('upes_attendance_updated'));
    }
  };

  // Helper to apply incoming cloud/SSE attendance events to state & localStorage
  const applyAttendanceEvents = (events: CloudAttendanceEvent[]) => {
    if (!events || events.length === 0) return;

    setRoundStudents((prevRs) => {
      let changed = false;
      const updatedRs = prevRs.map((rs) => {
        const rsSap = String(rs.sapId || '').trim();
        const rsName = String(rs.studentName || '').toLowerCase().trim();

        const matchingCloudEvent = events.find((ev) => {
          if (ev.roundId !== rs.roundId) return false;
          const evSap = String(ev.sapId || '').trim();
          const evName = String(ev.studentName || '').toLowerCase().trim();

          // 1. Exact SAP ID match
          if (evSap && rsSap && evSap === rsSap) return true;
          // 2. Exact student name match
          if (evName && rsName && evName === rsName) return true;
          // 3. Name contains
          if (evName && rsName && (evName.includes(rsName) || rsName.includes(evName)) && rsName.length > 3) return true;
          // 4. Candidate (SAP) match
          if (evName.includes(`(${rsSap})`) || rsName.includes(`(${evSap})`)) return true;
          // 5. Student ID match
          if (rs.studentId && evSap && rs.studentId.trim() === evSap) return true;

          return false;
        });

        if (matchingCloudEvent && rs.attendanceStatus !== 'PRESENT' && rs.attendanceStatus !== 'MANUALLY_MARKED') {
          changed = true;
          return {
            ...rs,
            attendanceStatus: 'PRESENT' as const,
            attendanceTime: matchingCloudEvent.time || rs.attendanceTime || 'Just now',
            markedBy: matchingCloudEvent.method || 'REAL_CAMERA_QR_SCAN',
            studentName: rs.studentName || matchingCloudEvent.studentName,
          };
        }
        return rs;
      });

      if (changed) {
        try {
          localStorage.setItem('upes_round_students', JSON.stringify(updatedRs));
        } catch {}
        setRounds((prevRounds) => {
          const nextRounds = prevRounds.map((r) => {
            const count = updatedRs.filter(
              (item) => item.roundId === r.id && (item.attendanceStatus === 'PRESENT' || item.attendanceStatus === 'MANUALLY_MARKED')
            ).length;
            return { ...r, attendedCount: count };
          });
          try {
            localStorage.setItem('upes_rounds', JSON.stringify(nextRounds));
          } catch {}
          return nextRounds;
        });
        return updatedRs;
      }
      return prevRs;
    });
  };

  const syncFromCloud = async () => {
    try {
      const events = await fetchCloudAttendanceEvents();
      if (events && events.length > 0) {
        applyAttendanceEvents(events);
      }
    } catch (err) {
      console.warn('[CloudSync] Polling error:', err);
    }
  };

  // Live real-time cross-tab and cross-window sync
  useEffect(() => {
    const reloadFromStorage = () => {
      const savedRs = localStorage.getItem('upes_round_students');
      if (savedRs) {
        try {
          setRoundStudents(JSON.parse(savedRs));
        } catch {}
      }

      const savedR = localStorage.getItem('upes_rounds');
      if (savedR) {
        try {
          setRounds(JSON.parse(savedR));
        } catch {}
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'upes_round_students' || e.key === 'upes_rounds') {
        reloadFromStorage();
      }
    };

    window.addEventListener('storage', handleStorage);
    window.addEventListener('upes_attendance_updated', reloadFromStorage);

    // BroadcastChannel sync
    let bc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      bc = new BroadcastChannel('upes_attendance_live_sync');
      bc.onmessage = (evt) => {
        if (evt.data?.type === 'ATTENDANCE_LIVE_UPDATE') {
          reloadFromStorage();
          if (evt.data?.event) {
            applyAttendanceEvents([evt.data.event]);
          }
        }
      };
    }

    // Zero-latency instant SSE stream from candidate mobile devices
    const unsubscribeSSE = subscribeToLiveCloudScans((ev) => {
      applyAttendanceEvents([ev]);
    });

    // Custom window event listener
    const handleLiveRecorded = (e: any) => {
      if (e.detail) {
        applyAttendanceEvents([e.detail]);
      }
    };
    window.addEventListener('upes_live_scan_recorded', handleLiveRecorded);

    // Cloud sync for registered users
    const syncUsersFromCloud = async () => {
      try {
        const cloudUsers = await fetchCloudUsers();
        if (cloudUsers && Array.isArray(cloudUsers) && cloudUsers.length > 0) {
          const blacklist = ['admin', 'officer', 'spr', 'recruiter', 'rohit.kumar@upes.ac.in', 'aanchal.gupta@upes.ac.in'];
          const validCloudUsers = cloudUsers.filter((cu) => {
            const uname = (cu.username || '').toLowerCase();
            const uemail = (cu.email || '').toLowerCase();
            return (
              !blacklist.includes(uname) &&
              !blacklist.includes(uemail) &&
              (cu.role === 'DIRECTOR' || cu.role === 'CSO' || cu.role === 'CAREER_SERVICE_OFFICER' || cu.role === 'MASTER_ADMIN')
            );
          });

          setUsers((prev) => {
            const merged = [...prev];
            validCloudUsers.forEach((cu) => {
              const idx = merged.findIndex((m) => m.id === cu.id || m.username.toLowerCase() === cu.username.toLowerCase());
              if (idx >= 0) {
                merged[idx] = { ...merged[idx], ...cu };
              } else {
                merged.push(cu);
              }
            });
            try {
              localStorage.setItem('upes_portal_users', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      } catch {}
    };

    let userBc: BroadcastChannel | null = null;
    if (typeof BroadcastChannel !== 'undefined') {
      userBc = new BroadcastChannel('upes_users_live_sync');
      userBc.onmessage = (evt) => {
        if (evt.data?.type === 'USERS_UPDATED' && Array.isArray(evt.data.users)) {
          setUsers(evt.data.users);
        }
      };
    }

    const pollInterval = setInterval(reloadFromStorage, 1000);
    const cloudPollInterval = setInterval(syncFromCloud, 2500);
    const userPollInterval = setInterval(syncUsersFromCloud, 3000);
    syncFromCloud(); // initial fetch on mount
    syncUsersFromCloud();

    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('upes_attendance_updated', reloadFromStorage);
      window.removeEventListener('upes_live_scan_recorded', handleLiveRecorded);
      unsubscribeSSE();
      clearInterval(pollInterval);
      clearInterval(cloudPollInterval);
      clearInterval(userPollInterval);
      if (bc) bc.close();
      if (userBc) userBc.close();
    };
  }, []);

  const addAuditLog = (action: string, details: string) => {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toLocaleString(),
      actorName: currentRole === 'PLACEMENT_OFFICER' ? 'Rhea Kapoor (PO)' : currentRole,
      actorRole: currentRole,
      action,
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  const addCompany = (payload: ComprehensiveCompanyPayload) => {
    const compId = `comp-${Date.now()}`;
    const driveId = `drv-${Date.now()}`;

    // Filter eligible students based on criteria
    const eligiblePool = students.filter(
      (s) => s.cgpa >= payload.minCgpa && s.activeBacklogs <= payload.maxBacklogs && s.status !== 'DEBARRED'
    );

    const createdComp: Company = {
      id: compId,
      name: payload.name,
      logo: payload.name.substring(0, 3).toUpperCase(),
      category: payload.category,
      industry: payload.industry,
      description: payload.description,
      ctcTotal: payload.ctcTotal,
      ctcBreakup: { base: payload.ctcTotal * 0.7, variable: payload.ctcTotal * 0.2, joiningBonus: payload.ctcTotal * 0.1 },
      status: 'ACTIVE',
      eligibleStudentsCount: eligiblePool.length || 955,
      activeDrivesCount: payload.rolesOffered.length || 1,
      hrContact: {
        name: payload.hrName || 'Sarah Jenkins',
        email: payload.hrEmail || `hr@${payload.name.toLowerCase().replace(/\s+/g, '')}.com`,
        phone: payload.hrPhone || '+91 98765 00000',
      },
    };

    setCompanies((prev) => [createdComp, ...prev]);

    // Create Drive
    const newDrive: Drive = {
      id: driveId,
      companyId: compId,
      companyName: payload.name,
      academicYear: '2026-2027',
      jobRole: payload.rolesOffered[0] || 'Software Engineer',
      ctc: payload.ctcTotal,
      tier: payload.category,
      eligibilityCriteria: {
        minCgpa: payload.minCgpa,
        maxActiveBacklogs: payload.maxBacklogs,
        allowedBranches: ['B.Tech CSE - AI & ML', 'B.Tech CSE - Cyber Security', 'B.Tech CSE - Data Science'],
        allowedBatches: [2026],
        tierRestrictionPolicy: `${payload.category} tier rules apply.`,
      },
      status: 'ONGOING',
    };

    setDrives((prev) => [newDrive, ...prev]);

    // Note: Creating a company ONLY creates the company profile & drive eligibility.
    // Rounds are NOT created automatically and must be added manually from the Rounds section.
    addAuditLog('CREATE_COMPANY', `Added company profile for ${payload.name}.`);
  };

  const deleteCompany = (id: string) => {
    const target = companies.find((c) => c.id === id);
    const compName = target ? target.name : id;

    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setDrives((prev) => prev.filter((d) => d.companyId !== id && d.companyName !== compName));
    setRounds((prev) => prev.filter((r) => r.companyId !== id && r.companyName !== compName));
    setRoundStudents((prev) => prev.filter((rs) => !rs.roundId.includes(id)));

    addAuditLog('DELETE_COMPANY', `Deleted company profile and active processes for ${compName}.`);
  };

  const toggleCompanyStatus = (id: string, status: Company['status']) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status } : c))
    );
    addAuditLog('UPDATE_COMPANY_STATUS', `Changed company status to ${status}.`);
  };

  const updateCompanyFeedback = (companyId: string, feedback: string) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === companyId ? { ...c, recruiterFeedback: feedback } : c))
    );
    addAuditLog('UPDATE_COMPANY_FEEDBACK', `Updated recruiter feedback for company ${companyId}.`);
  };

  const finalizeCompletedDrive = (companyId: string, data: { totalStudentsSat: number; offersGivenCount: number; recruiterFeedback: string }) => {
    setCompanies((prev) =>
      prev.map((c) =>
        c.id === companyId
          ? {
              ...c,
              status: 'COMPLETED',
              totalStudentsSat: data.totalStudentsSat,
              offersGivenCount: data.offersGivenCount,
              recruiterFeedback: data.recruiterFeedback,
            }
          : c
      )
    );
    addAuditLog('FINALIZE_COMPLETED_DRIVE', `Marked company drive ${companyId} as COMPLETED with ${data.offersGivenCount} offers.`);
  };

  const createRound = (
    roundData: Partial<Round> & { sprsNeeded?: number },
    shortlistedStudents: Student[],
    customSessionId?: string
  ) => {
    const companyName = roundData.companyName || 'Company';
    const roundName = roundData.name || 'Round';
    const roundId = roundData.id || `rnd-${Date.now()}`;
    const driveId = roundData.driveId || 'drv-1';
    const companyId = roundData.companyId || 'comp-1';

    const qrResult = generateRoundQRToken(roundId, driveId, companyName, roundName, 60, customSessionId);

    const sprsNeededCount = roundData.sprsNeeded || 3;

    // Build base round model
    const mockRoundForAlloc: Round = {
      id: roundId,
      driveId,
      companyId,
      companyName,
      roundNumber: roundData.roundNumber || 1,
      name: roundName,
      type: roundData.type || 'TECHNICAL_INTERVIEW',
      mode: roundData.mode || 'ON_CAMPUS',
      date: roundData.date || new Date().toISOString().split('T')[0],
      startTime: roundData.startTime || '10:00',
      endTime: roundData.endTime || '13:00',
      venue: roundData.venue || 'Block A - Lab 1',
      capacity: roundData.capacity || 50,
      qrToken: qrResult.token,
      qrExpiresAt: qrResult.expiresAtIso,
      geoFenceEnabled: false,
      status: 'SCHEDULED',
      assignedSprIds: [],
      totalShortlisted: shortlistedStudents.length,
      attendedCount: 0,
      absentCount: 0,
    };

    // Run SPR Allocation Engine for exact sprsNeededCount
    const allocResult = allocateSPRsForRound(mockRoundForAlloc, sprsNeededCount, sprs, sprCycle, rounds);
    const allocatedSprIds = allocResult.selectedSprs.map((s) => s.id);

    const newRound: Round = {
      ...mockRoundForAlloc,
      assignedSprIds: allocatedSprIds,
    };

    setRounds((prev) => [newRound, ...prev]);

    // Save assigned SPR state & duty assignments
    if (allocatedSprIds.length > 0) {
      setSprs((prev) =>
        prev.map((s) => {
          const wasSelected = allocatedSprIds.includes(s.id);
          const updatedTotalDuties = wasSelected ? s.totalDuties + 1 : s.totalDuties;
          const updatedUsedInCycle = allocResult.cycleClosed ? false : (wasSelected || s.usedInCurrentCycle);
          return {
            ...s,
            totalDuties: updatedTotalDuties,
            usedInCurrentCycle: updatedUsedInCycle,
          };
        })
      );

      const newDuties: SPRDutyAssignment[] = allocResult.selectedSprs.map((spr) => ({
        id: `duty-${Date.now()}-${spr.id}`,
        roundId,
        sprId: spr.id,
        sprName: spr.name,
        companyName,
        roundName,
        date: newRound.date,
        timeWindow: `${newRound.startTime} - ${newRound.endTime}`,
        venue: newRound.venue,
        role: 'SPR Duty',
        status: 'ASSIGNED',
        assignedAt: new Date().toISOString(),
      }));

      setDutyAssignments((prev) => [...newDuties, ...prev]);

      setSprCycle((prev) => {
        const newUsed = prev.usedSprCount + allocatedSprIds.length;
        const isClosed = allocResult.cycleClosed;
        return {
          ...prev,
          totalSprsInPool: sprs.length,
          usedSprCount: isClosed ? 0 : newUsed,
          id: isClosed ? prev.id + 1 : prev.id,
          status: isClosed ? 'OPEN' : prev.status,
        };
      });
    }

    // Create RoundStudent entries - all initialized to PENDING
    const newRoundStudents: RoundStudent[] = shortlistedStudents.map((st, i) => ({
      roundId,
      studentId: st.id,
      sapId: String(st.sapId).trim(),
      studentName: st.name,
      email: st.email,
      phone: st.phone,
      branch: st.branch,
      shortlistStatus: 'SHORTLISTED',
      attendanceStatus: 'PENDING',
      panelNumber: `Panel ${(i % 4) + 1} (Room ${(i % 4) + 101})`,
    }));

    // Filter out any previous students for this roundId
    const updatedRoundStudents = [
      ...newRoundStudents,
      ...roundStudents.filter((rs) => rs.roundId !== roundId),
    ];
    const updatedRounds = [newRound, ...rounds.filter((r) => r.id !== roundId)];

    syncLiveAttendance(updatedRoundStudents, updatedRounds);

    addAuditLog('CREATE_ROUND', `Created ${roundName} for ${companyName} with ${shortlistedStudents.length} shortlisted candidates and ${allocatedSprIds.length} allocated SPRs.`);
  };

  const uploadShortlistForRound = (roundId: string, shortlistedStudents: Student[], customSessionId?: string) => {
    const targetRound = rounds.find((r) => r.id === roundId);
    const companyName = targetRound?.companyName || 'Company';
    const roundName = targetRound?.name || 'Round';
    const driveId = targetRound?.driveId || 'drv-1';

    // Generate a FRESH QR token for this round — this ensures every upload creates
    // a completely new QR session, so old scans won't carry over.
    const freshQR = generateRoundQRToken(roundId, driveId, companyName, roundName, 60, customSessionId);

    const newRoundStudents: RoundStudent[] = shortlistedStudents.map((st, i) => ({
      roundId,
      studentId: st.id,
      sapId: String(st.sapId).trim(),
      studentName: st.name,
      email: st.email,
      phone: st.phone,
      branch: st.branch,
      shortlistStatus: 'SHORTLISTED',
      attendanceStatus: 'PENDING',
      panelNumber: `Panel ${(i % 4) + 1} (Room ${(i % 4) + 101})`,
    }));

    // Replace ALL old round students for this round with the fresh set
    const updatedRoundStudents = [
      ...newRoundStudents,
      ...roundStudents.filter((rs) => rs.roundId !== roundId),
    ];

    // Update round with fresh QR token and reset attendance counts
    const updatedRounds = rounds.map((r) =>
      r.id === roundId
        ? {
            ...r,
            totalShortlisted: shortlistedStudents.length,
            attendedCount: 0,
            absentCount: 0,
            qrToken: freshQR.token,
            qrExpiresAt: freshQR.expiresAtIso,
          }
        : r
    );

    syncLiveAttendance(updatedRoundStudents, updatedRounds);

    addAuditLog(
      'UPLOAD_SHORTLIST',
      `Uploaded fresh shortlist of ${shortlistedStudents.length} candidates for ${companyName} · ${roundName}. QR token regenerated for new session.`
    );
  };

  const deleteRound = (roundId: string) => {
    const target = rounds.find((r) => r.id === roundId);
    const roundLabel = target ? `${target.companyName} · ${target.name}` : roundId;

    // Remove the round
    const updatedRounds = rounds.filter((r) => r.id !== roundId);
    // Remove all round students for this round
    const updatedRoundStudents = roundStudents.filter((rs) => rs.roundId !== roundId);

    syncLiveAttendance(updatedRoundStudents, updatedRounds);

    // Remove associated duty assignments
    setDutyAssignments((prev) => prev.filter((d) => d.roundId !== roundId));

    // Remove stored Excel buffer
    setOriginalExcelBuffers((prev) => {
      const next = new Map(prev);
      next.delete(roundId);
      return next;
    });

    addAuditLog('DELETE_ROUND', `Deleted round ${roundLabel} and all associated attendance data.`);
  };

  const markAttendance = (roundId: string, sapId: string, method: string = 'SELF_QR_SCAN', candidateName?: string) => {
    const cleanSap = String(sapId || '').trim();
    if (!cleanSap) {
      return { success: false, message: 'Invalid candidate SAP ID.' };
    }
    if (!roundId) {
      return { success: false, message: 'No round specified for attendance.' };
    }

    const student = students.find((s) => String(s.sapId).trim() === cleanSap);
    const resolvedName = candidateName || student?.name || `Candidate (${cleanSap})`;
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // STRICT: Only match this exact roundId + sapId combination
    const exactIndex = roundStudents.findIndex(
      (rs) => String(rs.sapId).trim() === cleanSap && rs.roundId === roundId
    );

    let updatedRoundStudents: RoundStudent[] = [];

    if (exactIndex !== -1) {
      // Check if already marked for THIS specific round
      const existing = roundStudents[exactIndex];
      if (existing.attendanceStatus === 'PRESENT' || existing.attendanceStatus === 'MANUALLY_MARKED') {
        return { success: false, message: `Attendance already marked for ${resolvedName} (${cleanSap}) in this round.` };
      }

      // Mark present ONLY for this exact round + SAP combo
      updatedRoundStudents = roundStudents.map((rs) => {
        if (String(rs.sapId).trim() === cleanSap && rs.roundId === roundId) {
          return {
            ...rs,
            attendanceStatus: 'PRESENT' as const,
            attendanceTime: nowTime,
            markedBy: method,
            studentName: resolvedName || rs.studentName,
          };
        }
        return rs;
      });
    } else {
      // Student not found in this round's roster — create a new record for THIS round only
      const newRecord: RoundStudent = {
        roundId,
        studentId: student?.id || `st-${cleanSap}`,
        sapId: cleanSap,
        studentName: resolvedName,
        email: student?.email || `${cleanSap}@stu.upes.ac.in`,
        phone: student?.phone || 'N/A',
        branch: student?.branch || 'B.Tech CSE',
        shortlistStatus: 'SHORTLISTED',
        attendanceStatus: 'PRESENT',
        attendanceTime: nowTime,
        markedBy: method,
        panelNumber: 'Panel 1',
      };
      updatedRoundStudents = [newRecord, ...roundStudents];
    }

    const updatedRounds = rounds.map((r) => {
      const presentCount = updatedRoundStudents.filter(
        (rs) => rs.roundId === r.id && (rs.attendanceStatus === 'PRESENT' || rs.attendanceStatus === 'MANUALLY_MARKED')
      ).length;
      return { ...r, attendedCount: presentCount };
    });

    syncLiveAttendance(updatedRoundStudents, updatedRounds);

    // Broadcast to Cloud Sync for cross-device real-time sync
    recordAttendanceToCloud({
      roundId,
      sapId: cleanSap,
      studentName: resolvedName,
      status: 'PRESENT',
      time: nowTime,
      method,
    });

    addAuditLog('ATTENDANCE_MARKED', `Attendance marked for ${resolvedName} (${cleanSap}) in round ${roundId} via ${method}.`);
    return { success: true, message: `Attendance verified successfully for ${resolvedName} (${cleanSap})!` };
  };

  const manualAttendanceOverride = (roundId: string, sapId: string, status: 'PRESENT' | 'ABSENT', reason: string) => {
    const cleanSap = String(sapId || '').trim();
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const updatedRoundStudents = roundStudents.map((rs) =>
      rs.roundId === roundId && String(rs.sapId).trim() === cleanSap
        ? {
            ...rs,
            attendanceStatus: status === 'PRESENT' ? ('MANUALLY_MARKED' as const) : ('ABSENT' as const),
            attendanceTime: status === 'PRESENT' ? nowTime : undefined,
            markedBy: `MANUAL_OVERRIDE: ${reason}`,
          }
        : rs
    );

    const updatedRounds = rounds.map((r) => {
      const presentCount = updatedRoundStudents.filter(
        (rs) => rs.roundId === r.id && (rs.attendanceStatus === 'PRESENT' || rs.attendanceStatus === 'MANUALLY_MARKED')
      ).length;
      return { ...r, attendedCount: presentCount };
    });

    syncLiveAttendance(updatedRoundStudents, updatedRounds);

    if (status === 'PRESENT') {
      recordAttendanceToCloud({
        roundId,
        sapId: cleanSap,
        studentName: cleanSap,
        status: 'PRESENT',
        time: nowTime,
        method: `MANUAL_OVERRIDE: ${reason}`,
      });
    }

    addAuditLog('MANUAL_ATTENDANCE_OVERRIDE', `Manual override set to ${status} for SAP ${cleanSap}. Reason: ${reason}`);
  };

  const triggerSprAllocation = (roundId: string, countNeeded: number) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return { success: false, count: 0 };

    const allocation = allocateSPRsForRound(round, countNeeded, sprs, sprCycle, rounds);

    if (allocation.selectedSprs.length === 0) {
      return { success: false, count: 0 };
    }

    const selectedIds = allocation.selectedSprs.map((s) => s.id);

    // Update round assigned SPRs
    setRounds((prev) =>
      prev.map((r) => (r.id === roundId ? { ...r, assignedSprIds: [...r.assignedSprIds, ...selectedIds] } : r))
    );

    // Update SPR used flags and duty counts
    setSprs((prev) =>
      prev.map((s) => {
        const wasSelected = selectedIds.includes(s.id);
        const updatedTotalDuties = wasSelected ? s.totalDuties + 1 : s.totalDuties;
        // If cycle completes, reset usedInCurrentCycle to false so duty repeats fairly in next cycle!
        const updatedUsedInCycle = allocation.cycleClosed ? false : (wasSelected || s.usedInCurrentCycle);
        return {
          ...s,
          totalDuties: updatedTotalDuties,
          usedInCurrentCycle: updatedUsedInCycle,
        };
      })
    );

    // Create duty assignments
    const newDuties: SPRDutyAssignment[] = allocation.selectedSprs.map((spr) => ({
      id: `duty-${Date.now()}-${spr.id}`,
      roundId,
      sprId: spr.id,
      sprName: spr.name,
      companyName: round.companyName,
      roundName: round.name,
      date: round.date,
      timeWindow: `${round.startTime} - ${round.endTime}`,
      venue: round.venue,
      role: 'SPR Duty',
      status: 'ASSIGNED',
      assignedAt: new Date().toISOString(),
    }));

    setDutyAssignments((prev) => [...newDuties, ...prev]);

    // Update cycle count
    setSprCycle((prev) => {
      const newUsed = prev.usedSprCount + selectedIds.length;
      const isClosed = allocation.cycleClosed;
      return {
        ...prev,
        totalSprsInPool: sprs.length,
        usedSprCount: isClosed ? 0 : newUsed,
        id: isClosed ? prev.id + 1 : prev.id,
        status: isClosed ? 'OPEN' : prev.status,
      };
    });

    addAuditLog(
      'SPR_ALLOCATED',
      `Allocated ${allocation.selectedSprs.length} SPRs (${allocation.selectedSprs.map((s) => s.name).join(', ')}) to ${round.companyName} ${round.name}.`
    );

    return { success: true, count: allocation.selectedSprs.length };
  };

  const addSpr = (sprData: { name: string; sapId: string; branch: string; email?: string; phone?: string }) => {
    const newSpr: SPR = {
      id: `spr-${Date.now()}`,
      studentId: `st-${Date.now()}`,
      sapId: sprData.sapId,
      name: sprData.name,
      email: sprData.email || `${sprData.name.toLowerCase().replace(/\s+/g, '.')}@stu.upes.ac.in`,
      phone: sprData.phone || '+91 98765 43210',
      branch: sprData.branch || 'B.Tech CSE',
      totalDuties: 0,
      usedInCurrentCycle: false,
      unavailabilities: [],
    };

    setSprs((prev) => [newSpr, ...prev]);
    setSprCycle((prev) => ({ ...prev, totalSprsInPool: prev.totalSprsInPool + 1 }));
    addAuditLog('ADD_SPR', `Registered new SPR representative: ${sprData.name} (${sprData.sapId}).`);
  };

  const deleteSpr = (id: string) => {
    const target = sprs.find((s) => s.id === id);
    setSprs((prev) => prev.filter((s) => s.id !== id));
    setSprCycle((prev) => ({ ...prev, totalSprsInPool: Math.max(0, prev.totalSprsInPool - 1) }));
    if (target) {
      addAuditLog('DELETE_SPR', `Removed SPR representative: ${target.name}.`);
    }
  };

  const acceptDuty = (dutyId: string) => {
    setDutyAssignments((prev) =>
      prev.map((d) => (d.id === dutyId ? { ...d, status: 'ACCEPTED' } : d))
    );
    addAuditLog('ACCEPT_DUTY', `SPR accepted duty assignment ${dutyId}.`);
  };

  const debarStudent = (studentId: string, reason: string) => {
    setStudents((prev) =>
      prev.map((s) =>
        s.id === studentId ? { ...s, status: 'DEBARRED', debarredReason: reason } : s
      )
    );
    addAuditLog('DEBAR_STUDENT', `Debarred student ${studentId}. Reason: ${reason}`);
  };

  const resolveUnknownSapIds = (newStudents: Student[]) => {
    setStudents((prev) => [...newStudents, ...prev]);
    addAuditLog('RESOLVE_UNKNOWN_SAP_IDS', `Imported ${newStudents.length} new student records into master database.`);
  };

  const acceptOffer = (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return;

    setOffers((prev) =>
      prev.map((o) => (o.id === offerId ? { ...o, status: 'ACCEPTED' } : o))
    );

    setStudents((prev) =>
      prev.map((s) =>
        s.id === offer.studentId
          ? {
              ...s,
              status: 'PLACED',
              placedTier: offer.tier,
              placedCompanyId: offer.companyId,
              placedCompanyName: offer.companyName,
              placedCtc: offer.ctc,
            }
          : s
      )
    );

    addAuditLog('OFFER_ACCEPTED', `Student ${offer.studentName} accepted offer from ${offer.companyName} (${offer.ctc} LPA).`);
  };

  const regenerateQR = (roundId: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return;

    const qrResult = generateRoundQRToken(roundId, round.driveId, round.companyName, round.name, 60);
    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId
          ? { ...r, qrToken: qrResult.token, qrExpiresAt: qrResult.expiresAtIso }
          : r
      )
    );
    addAuditLog('REGENERATE_QR', `Regenerated QR security token for round ${roundId}.`);
  };

  const toggleGeoFence = (roundId: string) => {
    setRounds((prev) =>
      prev.map((r) => (r.id === roundId ? { ...r, geoFenceEnabled: !r.geoFenceEnabled } : r))
    );
  };

  const login = (usr: string, pwd: string, rememberMe: boolean = true): boolean => {
    const cleanU = (usr || '').trim().toLowerCase();
    if (!cleanU) return false;

    const cleanPrefix = cleanU.includes('@') ? cleanU.split('@')[0] : cleanU;

    // Check in-memory users, fresh localStorage, and initialUsers
    let pool: PortalUser[] = [...users];
    try {
      const saved = localStorage.getItem('upes_portal_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          parsed.forEach((p: PortalUser) => {
            if (!pool.some((u) => u.id === p.id || u.username.toLowerCase() === p.username.toLowerCase())) {
              pool.push(p);
            }
          });
        }
      }
    } catch {}

    initialUsers.forEach((iu) => {
      if (!pool.some((u) => u.username.toLowerCase() === iu.username.toLowerCase())) {
        pool.push(iu);
      }
    });

    const found = pool.find((u) => {
      const uUsername = (u.username || '').trim().toLowerCase();
      const uEmail = (u.email || '').trim().toLowerCase();
      const uPrefix = uUsername.includes('@') ? uUsername.split('@')[0] : uUsername;

      const userMatches =
        uUsername === cleanU ||
        uEmail === cleanU ||
        uPrefix === cleanU ||
        uUsername === cleanPrefix ||
        uEmail === cleanPrefix;

      if (!userMatches) return false;

      // Allow login with user's assigned password, or the universal Pass@123
      const passMatches = !u.password || u.password === pwd || pwd === 'Pass@123';
      return passMatches;
    });

    if (found) {
      if (found.status === 'DISABLED') {
        return false;
      }
      const updatedUser = { ...found, lastLogin: new Date().toLocaleString() };
      setCurrentUser(updatedUser);
      setCurrentRole(found.role);
      if (rememberMe) {
        localStorage.setItem('upes_current_user', JSON.stringify(updatedUser));
      }
      addAuditLog('USER_LOGIN', `User ${found.name} (${found.role}) logged into placement portal.`);
      return true;
    }
    return false;
  };

  const logout = () => {
    if (currentUser) {
      addAuditLog('USER_LOGOUT', `User ${currentUser.name} logged out.`);
    }
    setCurrentUser(null);
    localStorage.removeItem('upes_current_user');
  };

  const createUser = (userData: Omit<PortalUser, 'id' | 'createdAt'>): { success: boolean; message: string } => {
    const isDirector = currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MASTER_ADMIN';
    if (!isDirector) {
      return { success: false, message: 'Only Director (Master Admin) has authority to create Career Service Officers.' };
    }
    const cleanU = (userData.username || '').trim();
    if (!cleanU) return { success: false, message: 'Username is required.' };

    const emailToUse = (userData.email || cleanU).trim();

    const newUser: PortalUser = {
      ...userData,
      id: `usr-${Date.now()}`,
      username: cleanU,
      email: emailToUse,
      createdAt: new Date().toISOString().split('T')[0],
      status: userData.status || 'ACTIVE',
      password: userData.password || 'Pass@123',
    };

    setUsers((prev) => {
      const filtered = prev.filter(
        (u) => u.username.toLowerCase() !== cleanU.toLowerCase() && (!u.email || u.email.toLowerCase() !== cleanU.toLowerCase())
      );
      const next = [newUser, ...filtered];
      publishUsersToCloud(next);
      return next;
    });

    addAuditLog('CREATE_USER', `Director created portal user ${newUser.name} (${newUser.role}).`);
    return { success: true, message: `User ${newUser.username} created successfully.` };
  };

  const updateUser = (userId: string, data: Partial<PortalUser>): { success: boolean; message: string } => {
    const isDirector = currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MASTER_ADMIN';
    if (!isDirector) {
      return { success: false, message: 'Only Director (Master Admin) has authority to edit users.' };
    }
    let targetName = '';
    setUsers((prev) => {
      const next = prev.map((u) => {
        if (u.id === userId) {
          targetName = data.name || u.name;
          return { ...u, ...data };
        }
        return u;
      });
      publishUsersToCloud(next);
      return next;
    });
    addAuditLog('UPDATE_USER', `Director updated user ${targetName || userId}.`);
    return { success: true, message: 'User updated successfully.' };
  };

  const deleteUser = (userId: string): { success: boolean; message: string } => {
    const isDirector = currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MASTER_ADMIN';
    if (!isDirector) {
      return { success: false, message: 'Only Director (Master Admin) has authority to delete users.' };
    }
    if (currentUser?.id === userId) {
      return { success: false, message: 'Cannot delete the active Director account.' };
    }
    setUsers((prev) => {
      const next = prev.filter((u) => u.id !== userId);
      publishUsersToCloud(next);
      return next;
    });
    addAuditLog('DELETE_USER', `Director removed user account ${userId}.`);
    return { success: true, message: 'User deleted successfully.' };
  };

  const resetPortalData = () => {
    const isDirector = currentUser?.role === 'DIRECTOR' || currentUser?.role === 'MASTER_ADMIN';
    if (!isDirector) return;
    setStudents([]);
    setCompanies([]);
    setDrives([]);
    setRounds([]);
    setRoundStudents([]);
    setOffers([]);
    setSprs([]);
    setDutyAssignments([]);
    localStorage.removeItem('upes_students');
    localStorage.removeItem('upes_companies');
    localStorage.removeItem('upes_drives');
    localStorage.removeItem('upes_rounds');
    localStorage.removeItem('upes_round_students');
    localStorage.removeItem('upes_sprs');
    localStorage.removeItem('upes_offers');
    localStorage.removeItem('upes_excel_raw_LATEST');
    addAuditLog('RESET_PORTAL_DATA', 'Master Admin purged and reset portal data to clean state.');
  };

  return (
    <PortalContext.Provider
      value={{
        currentUser,
        users,
        login,
        logout,
        createUser,
        updateUser,
        deleteUser,
        resetPortalData,
        currentRole,
        setCurrentRole,
        activeTab,
        setActiveTab,
        students,
        companies,
        drives,
        rounds,
        roundStudents,
        sprs,
        sprCycle,
        dutyAssignments,
        offers,
        auditLogs,
        notifications,
        addCompany,
        deleteCompany,
        toggleCompanyStatus,
        updateCompanyFeedback,
        finalizeCompletedDrive,
        createRound,
        uploadShortlistForRound,
        deleteRound,
        markAttendance,
        manualAttendanceOverride,
        triggerSprAllocation,
        addSpr,
        deleteSpr,
        acceptDuty,
        debarStudent,
        resolveUnknownSapIds,
        acceptOffer,
        regenerateQR,
        toggleGeoFence,
        storeOriginalExcel,
        getOriginalExcel,
        getOriginalExcelRaw,
        syncFromCloud,
      }}
    >
      {children}
    </PortalContext.Provider>
  );
};

export const usePortal = () => {
  const context = useContext(PortalContext);
  if (!context) {
    throw new Error('usePortal must be used within a PortalProvider');
  }
  return context;
};
