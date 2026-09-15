import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
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
import { saveSheetToStorage, getSheetBufferSync, getSheetMetaSync, hasSheetForRound } from '../utils/sheetStorage';
import { fetchCloudUsers, publishUsersToCloud } from '../utils/userSync';
import {
  saveToIDB,
  getFromIDB,
  fetchRemoteDatabase,
  persistToRemoteDatabase,
  sanitizeUsers,
  sanitizeSPRs,
} from '../utils/portalDb';

export interface RoundConfigInput {
  name: string;
  type?: Round['type'];
  venue?: string;
  venues?: string[];
  date?: string;
  startTime?: string;
  endTime?: string;
  sprsNeeded: number;
}

export interface ComprehensiveCompanyPayload {
  name: string;
  driveDate?: string;
  venues?: string[];
  roundsConfig?: RoundConfigInput[];
  industry?: string;
  category?: Company['category'];
  ctcTotal?: number;
  description?: string;
  rolesOffered?: string[];
  roundsCount?: number;
  minCgpa?: number;
  maxBacklogs?: number;
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
  allocateSprsToRound: (roundId: string, countNeeded: number, targetVenue?: string) => { success: boolean; count: number; message?: string };
  assignSprManuallyToRound: (roundId: string, sprId: string, targetVenue?: string) => { success: boolean; message?: string };
  removeSprFromRound: (roundId: string, sprId: string) => { success: boolean; message?: string };
  reassignSprVenue: (roundId: string, sprId: string, newVenue: string) => { success: boolean; message?: string };
  addSpr: (sprData: { name: string; sapId: string; branch: string; email?: string; phone?: string }) => void;
  updateSpr: (id: string, data: Partial<SPR>) => void;
  deleteSpr: (id: string) => void;
  acceptDuty: (dutyId: string) => void;
  debarStudent: (studentId: string, reason: string) => void;
  resolveUnknownSapIds: (newStudents: Student[]) => void;
  acceptOffer: (offerId: string) => void;
  regenerateQR: (roundId: string) => void;
  toggleGeoFence: (roundId: string) => void;
  resetAllDutiesToZero: () => void;

  // Original Excel buffer storage (per round) for preserving company sheet format
  storeOriginalExcel: (roundId: string, buffer: ArrayBuffer, rawMeta?: { headers: string[]; rows: any[][] }) => void;
  getOriginalExcel: (roundId: string) => ArrayBuffer | undefined;
  getOriginalExcelRaw: (roundId: string) => { headers: string[]; rows: any[][] } | undefined;
  syncFromCloud: () => Promise<void>;
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

const DUMMY_SPR_NAMES = ['tanya kapoor', 'rohan mehra', 'divya nair', 'karthik raja', 'ananya roy', 'siddharth sen'];
function isDummySprList(list: SPR[]): boolean {
  if (!Array.isArray(list) || list.length < 50) return true;
  return list.some((s) => DUMMY_SPR_NAMES.includes((s.name || '').toLowerCase().trim()));
}

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [users, setUsers] = useState<PortalUser[]>(() => {
    try {
      const saved = localStorage.getItem('upes_portal_users');
      if (saved) {
        const parsed: PortalUser[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sanitizeUsers(parsed);
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
        if (
          parsed.id === 'usr-director-manash' ||
          (parsed.username && parsed.username.toLowerCase().includes('manash')) ||
          (parsed.name && parsed.name.toLowerCase().includes('manash'))
        ) {
          const migrated: PortalUser = {
            ...parsed,
            id: 'usr-cso',
            username: 'CSO@Upes.ac.in',
            name: 'CSO',
            email: 'CSO@Upes.ac.in',
            password: 'Pass@123',
          };
          localStorage.setItem('upes_current_user', JSON.stringify(migrated));
          return migrated;
        }
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

  const [activeTab, setActiveTab] = useState<string>('companies');

  // Permanent Database Sync on Mount: IndexedDB + Cloud Database (/api/db)
  useEffect(() => {
    let isMounted = true;

    const loadPermanentDatabase = async () => {
      try {
        // 1. Load from browser permanent IndexedDB
        const [idbUsers, idbCompanies, idbDrives, idbRounds, idbRoundStudents, idbStudents, idbSprs] = await Promise.all([
          getFromIDB<PortalUser[]>('users'),
          getFromIDB<Company[]>('companies'),
          getFromIDB<Drive[]>('drives'),
          getFromIDB<Round[]>('rounds'),
          getFromIDB<RoundStudent[]>('roundStudents'),
          getFromIDB<Student[]>('students'),
          getFromIDB<SPR[]>('sprs'),
        ]);

        if (!isMounted) return;

        if (idbCompanies && idbCompanies.length > 0) setCompanies(idbCompanies);
        if (idbDrives && idbDrives.length > 0) setDrives(idbDrives);
        if (idbRounds && idbRounds.length > 0) {
          const valid = idbRounds
            .filter((r) => r.companyName !== 'Company' && r.companyId !== 'comp-1' && r.companyId)
            .map((r) => (!hasSheetForRound(r.id) ? { ...r, totalShortlisted: 0, attendedCount: 0, absentCount: 0 } : r));
          setRounds(valid);
        }
        if (idbRoundStudents && idbRoundStudents.length > 0) {
          // Strictly isolate candidates: only retain records for rounds with uploaded sheets
          setRoundStudents(idbRoundStudents.filter((rs) => hasSheetForRound(rs.roundId)));
        }
        if (idbStudents && idbStudents.length > 0) setStudents(idbStudents);
        if (idbUsers && idbUsers.length > 0) setUsers(sanitizeUsers(idbUsers));
        
        // SPR Duty reset: Guarantee all SPR duties are 0 across system
        if (idbSprs && idbSprs.length > 0) {
          setSprs(sanitizeSPRs(idbSprs));
        } else {
          setSprs(initialSPRs.map((s) => ({ ...s, totalDuties: 0, usedInCurrentCycle: false })));
        }
        setDutyAssignments([]);
        setSprCycle({
          id: 1,
          startedAt: new Date().toISOString().split('T')[0],
          status: 'OPEN',
          totalSprsInPool: 50,
          usedSprCount: 0,
        });

        // 2. Fetch and merge latest from Cloud Database (/api/db)
        const remoteData = await fetchRemoteDatabase();
        if (!isMounted || !remoteData) return;

        if (Array.isArray(remoteData.companies) && remoteData.companies.length > 0) {
          setCompanies((prev) => {
            const existingIds = new Set(prev.map((c) => c.id));
            const merged = [...prev];
            remoteData.companies!.forEach((rc) => {
              if (!existingIds.has(rc.id)) merged.push(rc);
            });
            return merged;
          });
        }

        if (Array.isArray(remoteData.rounds) && remoteData.rounds.length > 0) {
          setRounds((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const merged = [...prev];
            remoteData.rounds!
              .filter((r) => r.companyName !== 'Company' && r.companyId !== 'comp-1' && r.companyId)
              .map((r) => (!hasSheetForRound(r.id) ? { ...r, totalShortlisted: 0, attendedCount: 0, absentCount: 0 } : r))
              .forEach((rr) => {
                if (!existingIds.has(rr.id)) merged.push(rr);
              });
            return merged;
          });
        }

        if (Array.isArray(remoteData.drives) && remoteData.drives.length > 0) {
          setDrives((prev) => {
            const existingIds = new Set(prev.map((d) => d.id));
            const merged = [...prev];
            remoteData.drives!.forEach((rd) => {
              if (!existingIds.has(rd.id)) merged.push(rd);
            });
            return merged;
          });
        }

        if (Array.isArray(remoteData.users) && remoteData.users.length > 0) {
          setUsers((prev) => sanitizeUsers([...prev, ...remoteData.users!]));
        }

        if (Array.isArray(remoteData.roundStudents) && remoteData.roundStudents.length > 0) {
          setRoundStudents((prev) => {
            const key = (rs: RoundStudent) => `${rs.roundId}_${rs.sapId}`;
            const map = new Map<string, RoundStudent>();
            prev.filter((p) => hasSheetForRound(p.roundId)).forEach((p) => map.set(key(p), p));
            remoteData.roundStudents!
              .filter((rs) => hasSheetForRound(rs.roundId))
              .forEach((rs) => {
                const existing = map.get(key(rs));
                if (!existing || (existing.attendanceStatus === 'PENDING' && rs.attendanceStatus !== 'PENDING')) {
                  map.set(key(rs), rs);
                }
              });
            return Array.from(map.values());
          });
        }

        if (Array.isArray(remoteData.sprs) && remoteData.sprs.length > 0) {
          setSprs((prev) => sanitizeSPRs(prev.length >= 50 ? prev : remoteData.sprs!));
        }
      } catch (err) {
        console.warn('[PortalDB] Init error:', err);
      }
    };

    loadPermanentDatabase();

    return () => {
      isMounted = false;
    };
  }, []);

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('upes_students');
    return saved ? JSON.parse(saved) : initialStudents;
  });
  const [companies, setCompanies] = useState<Company[]>(() => {
    try {
      const saved = localStorage.getItem('upes_companies');
      if (saved) {
        const parsed: Company[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((c) => c.name !== 'Company' && c.id !== 'comp-1');
        }
      }
    } catch {}
    return initialCompanies;
  });
  const [drives, setDrives] = useState<Drive[]>(() => {
    try {
      const saved = localStorage.getItem('upes_drives');
      if (saved) {
        const parsed: Drive[] = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter((d) => d.companyName !== 'Company' && d.companyId !== 'comp-1');
        }
      }
    } catch {}
    return initialDrives;
  });
  const [rounds, setRounds] = useState<Round[]>(() => {
    try {
      const saved = localStorage.getItem('upes_rounds');
      if (saved) {
        const parsed: Round[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter(
              (r) => r.companyName !== 'Company' && r.companyId !== 'comp-1' && r.companyId && r.companyName
            )
            .map((r) => {
              // If no Excel sheet was uploaded for this round, totalShortlisted must be 0
              if (!hasSheetForRound(r.id)) {
                return { ...r, totalShortlisted: 0, attendedCount: 0, absentCount: 0 };
              }
              return r;
            });
        }
      }
    } catch {}
    return initialRounds;
  });
  const [roundStudents, setRoundStudents] = useState<RoundStudent[]>(() => {
    try {
      const saved = localStorage.getItem('upes_round_students');
      if (saved) {
        const parsed: RoundStudent[] = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          // Strictly keep candidates only for rounds that have an uploaded Excel sheet
          return parsed.filter((rs) => hasSheetForRound(rs.roundId));
        }
      }
    } catch {}
    return initialRoundStudents;
  });
  const [sprs, setSprs] = useState<SPR[]>(() => {
    try {
      const saved = localStorage.getItem('upes_sprs');
      if (saved) {
        const parsed: SPR[] = JSON.parse(saved);
        if (!isDummySprList(parsed)) {
          // Force every SPR duty to 0 and unused in cycle as requested
          return parsed.map((s) => ({
            ...s,
            totalDuties: 0,
            usedInCurrentCycle: false,
          }));
        }
      }
    } catch {}
    try {
      localStorage.setItem('upes_sprs', JSON.stringify(initialSPRs.map((s) => ({ ...s, totalDuties: 0, usedInCurrentCycle: false }))));
    } catch {}
    return initialSPRs.map((s) => ({ ...s, totalDuties: 0, usedInCurrentCycle: false }));
  });
  const [sprCycle, setSprCycle] = useState<SPRCycle>(() => ({
    id: 1,
    startedAt: new Date().toISOString().split('T')[0],
    status: 'OPEN',
    totalSprsInPool: 50,
    usedSprCount: 0,
  }));
  const [dutyAssignments, setDutyAssignments] = useState<SPRDutyAssignment[]>(() => {
    try {
      const saved = localStorage.getItem('upes_duty_assignments');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {}
    return [];
  });
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
      return next;
    });

    // Save strictly to multi-layer persistent sheet storage for this roundId
    saveSheetToStorage(roundId, buffer, rawMeta);
  };

  const getOriginalExcel = (roundId: string): ArrayBuffer | undefined => {
    // 1. Check in-memory state map strictly for roundId
    if (originalExcelBuffers.has(roundId)) {
      return originalExcelBuffers.get(roundId);
    }

    // 2. Check multi-layer sheetStorage strictly for roundId
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

  // Multi-tier Database Persistence: localStorage + IndexedDB + Cloud Database
  useEffect(() => {
    try {
      localStorage.setItem('upes_students', JSON.stringify(students));
      saveToIDB('students', students);
    } catch {}
  }, [students]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_companies', JSON.stringify(companies));
      saveToIDB('companies', companies);
      persistToRemoteDatabase({ companies });
    } catch {}
  }, [companies]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_drives', JSON.stringify(drives));
      saveToIDB('drives', drives);
      persistToRemoteDatabase({ drives });
    } catch {}
  }, [drives]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_sprs', JSON.stringify(sprs));
      saveToIDB('sprs', sprs);
      persistToRemoteDatabase({ sprs });
    } catch {}
  }, [sprs]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_rounds', JSON.stringify(rounds));
      saveToIDB('rounds', rounds);
      persistToRemoteDatabase({ rounds });
    } catch {}
  }, [rounds]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_round_students', JSON.stringify(roundStudents));
      saveToIDB('roundStudents', roundStudents);
      persistToRemoteDatabase({ roundStudents });
    } catch {}
  }, [roundStudents]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_portal_users', JSON.stringify(users));
      saveToIDB('users', users);
      persistToRemoteDatabase({ users });
    } catch {}
  }, [users]);

  useEffect(() => {
    try {
      localStorage.setItem('upes_duty_assignments', JSON.stringify(dutyAssignments));
      saveToIDB('dutyAssignments', dutyAssignments);
      persistToRemoteDatabase({ dutyAssignments });
    } catch {}
  }, [dutyAssignments]);

  // Automatically reconcile duty assignments and SPR duties whenever rounds change
  // Ensures that when any process or round is deleted, orphaned duties are pruned and SPR duty counts are reduced
  useEffect(() => {
    const activeRoundIds = new Set(rounds.map((r) => r.id));
    setDutyAssignments((prev) => {
      const activeDuties = prev.filter((d) => activeRoundIds.has(d.roundId));
      if (activeDuties.length !== prev.length) {
        setSprs((sprList) =>
          sprList.map((s) => {
            const activeCount = activeDuties.filter((d) => d.sprId === s.id).length;
            return {
              ...s,
              totalDuties: activeCount,
              usedInCurrentCycle: activeCount > 0,
            };
          })
        );
        return activeDuties;
      }
      return prev;
    });
  }, [rounds]);

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

      // 1. Update existing records in roster
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

      // 2. Auto-insert dynamically scanned candidates if not already in roster
      events.forEach((ev) => {
        if (!ev.roundId || !ev.sapId) return;
        const evSap = String(ev.sapId).trim();
        const exists = updatedRs.some(
          (rs) => rs.roundId === ev.roundId && String(rs.sapId).trim() === evSap
        );
        if (!exists) {
          changed = true;
          const matchedStudent = students.find((s) => String(s.sapId).trim() === evSap);
          updatedRs.unshift({
            roundId: ev.roundId,
            studentId: matchedStudent?.id || `st-${evSap}`,
            sapId: evSap,
            studentName: ev.studentName || matchedStudent?.name || `Candidate (${evSap})`,
            email: matchedStudent?.email || `${evSap}@stu.upes.ac.in`,
            phone: matchedStudent?.phone || 'N/A',
            branch: matchedStudent?.branch || 'B.Tech CSE',
            shortlistStatus: 'SHORTLISTED',
            attendanceStatus: 'PRESENT',
            attendanceTime: ev.time || 'Just now',
            markedBy: ev.method || 'REAL_CAMERA_QR_SCAN',
            panelNumber: 'Panel 1',
          });
        }
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

  const isSyncingRef = useRef(false);
  const syncFromCloud = async () => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    try {
      const events = await fetchCloudAttendanceEvents();
      if (events && events.length > 0) {
        applyAttendanceEvents(events);
      }
    } catch (err) {
      console.warn('[CloudSync] Polling error:', err);
    } finally {
      isSyncingRef.current = false;
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
    const minCgpa = payload.minCgpa ?? 0;
    const maxBacklogs = payload.maxBacklogs ?? 100;
    const eligiblePool = students.filter(
      (s) => s.cgpa >= minCgpa && s.activeBacklogs <= maxBacklogs && s.status !== 'DEBARRED'
    );

    const createdComp: Company = {
      id: compId,
      name: payload.name,
      logo: payload.name.substring(0, 3).toUpperCase(),
      category: payload.category || 'CORE',
      industry: payload.industry || 'Placement Drive',
      description: payload.description || `Drive for ${payload.name}`,
      ctcTotal: payload.ctcTotal || 10,
      ctcBreakup: { base: (payload.ctcTotal || 10) * 0.7, variable: (payload.ctcTotal || 10) * 0.2, joiningBonus: (payload.ctcTotal || 10) * 0.1 },
      status: 'ACTIVE',
      eligibleStudentsCount: eligiblePool.length || 955,
      activeDrivesCount: (payload.rolesOffered && payload.rolesOffered.length) || 1,
      hrContact: {
        name: payload.hrName || 'Placement Officer',
        email: payload.hrEmail || `placement@upes.ac.in`,
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
      jobRole: (payload.rolesOffered && payload.rolesOffered[0]) || 'Recruitment Drive',
      ctc: payload.ctcTotal || 10,
      tier: payload.category || 'CORE',
      eligibilityCriteria: {
        minCgpa,
        maxActiveBacklogs: maxBacklogs,
        allowedBranches: ['B.Tech CSE - AI & ML', 'B.Tech CSE - Cyber Security', 'B.Tech CSE - Data Science'],
        allowedBatches: [2026],
        tierRestrictionPolicy: `Placement rules apply.`,
      },
      status: 'ONGOING',
    };

    setDrives((prev) => [newDrive, ...prev]);

    // Check if rounds are configured to auto-create with venue and fair SPR allotment
    if (payload.roundsConfig && payload.roundsConfig.length > 0) {
      let currentSprPool = [...sprs];
      let currentCycleState = { ...sprCycle };
      let currentRoundsList = [...rounds];
      const newDuties: SPRDutyAssignment[] = [];
      const newRoundsCreated: Round[] = [];
      const newRoundStudentsList: RoundStudent[] = [];

      payload.roundsConfig.forEach((rc, idx) => {
        const roundNum = idx + 1;
        const roundId = `rnd-${compId}-${roundNum}`;
        const rName = rc.name || `Round ${roundNum}`;
        const rDate = rc.date || payload.driveDate || new Date().toISOString().split('T')[0];
        const rStartTime = '09:00';
        const rEndTime = '18:00';
        const rVenuesList = (rc.venues && rc.venues.filter(Boolean).length > 0)
          ? rc.venues.filter(Boolean)
          : (rc.venue ? rc.venue.split(',').map((v) => v.trim()).filter(Boolean) : ['Campus Venue']);
        const rVenue = rVenuesList.join(', ');
        const sprsReq = Math.max(1, Number(rc.sprsNeeded) || 2);

        const qrResult = generateRoundQRToken(roundId, driveId, payload.name, rName, 60);

        const mockRoundForAlloc: Round = {
          id: roundId,
          driveId,
          companyId: compId,
          companyName: payload.name,
          roundNumber: roundNum,
          name: rName,
          type: rc.type || (roundNum === 1 ? 'ONLINE_TEST' : roundNum === 2 ? 'TECHNICAL_INTERVIEW' : 'HR_INTERVIEW'),
          mode: 'ON_CAMPUS',
          date: rDate,
          startTime: rStartTime,
          endTime: rEndTime,
          venue: rVenue,
          venues: rVenuesList,
          capacity: 60,
          qrToken: qrResult.token,
          qrExpiresAt: qrResult.expiresAtIso,
          geoFenceEnabled: false,
          status: 'SCHEDULED',
          assignedSprIds: [],
          totalShortlisted: 0,
          attendedCount: 0,
          absentCount: 0,
        };

        const allocResult = allocateSPRsForRound(
          mockRoundForAlloc,
          sprsReq,
          currentSprPool,
          currentCycleState,
          currentRoundsList
        );
        const allocatedSprIds = allocResult.selectedSprs.map((s) => s.id);

        // Divide allocated SPRs equally among the round's venues
        const venueAssignmentsMap: Record<string, string[]> = {};
        rVenuesList.forEach((v) => {
          venueAssignmentsMap[v] = [];
        });

        allocResult.selectedSprs.forEach((spr, sIdx) => {
          const assignedVenue = rVenuesList[sIdx % rVenuesList.length];
          venueAssignmentsMap[assignedVenue].push(spr.id);

          newDuties.push({
            id: `duty-${Date.now()}-${spr.id}-${roundNum}-${sIdx}`,
            roundId,
            sprId: spr.id,
            sprName: spr.name,
            companyName: payload.name,
            roundName: rName,
            date: rDate,
            timeWindow: 'Full Day',
            venue: assignedVenue, // INDIVIDUAL SPECIFIC ASSIGNED VENUE
            role: 'SPR Duty',
            status: 'ASSIGNED',
            assignedAt: new Date().toISOString(),
          });
        });

        const venueAssignments = rVenuesList.map((v) => ({
          venue: v,
          sprIds: venueAssignmentsMap[v] || [],
        }));

        const createdRound: Round = {
          ...mockRoundForAlloc,
          venues: rVenuesList,
          venueAssignments,
          assignedSprIds: allocatedSprIds,
        };

        newRoundsCreated.push(createdRound);
        currentRoundsList = [createdRound, ...currentRoundsList];

        // Update SPR pool duty counts and cycle usage
        currentSprPool = currentSprPool.map((s) => {
          const wasSelected = allocatedSprIds.includes(s.id);
          const updatedTotalDuties = wasSelected ? s.totalDuties + 1 : s.totalDuties;
          const updatedUsedInCycle = allocResult.cycleClosed ? false : (wasSelected || s.usedInCurrentCycle);
          return {
            ...s,
            totalDuties: updatedTotalDuties,
            usedInCurrentCycle: updatedUsedInCycle,
          };
        });

        // Advance cycle tracker
        const newUsed = currentCycleState.usedSprCount + allocatedSprIds.length;
        const isClosed = allocResult.cycleClosed;
        currentCycleState = {
          ...currentCycleState,
          totalSprsInPool: currentSprPool.length,
          usedSprCount: isClosed ? 0 : newUsed,
          id: isClosed ? currentCycleState.id + 1 : currentCycleState.id,
          status: isClosed ? 'OPEN' : currentCycleState.status,
        };

        // Note: Shortlist candidates are NOT auto-populated.
        // The round starts strictly with 0 candidates until the recruiter's Excel sheet is uploaded.
      });

      setRounds(currentRoundsList);
      setSprs(currentSprPool);
      setDutyAssignments((prev) => [...newDuties, ...prev]);
      setSprCycle(currentCycleState);

      try {
        localStorage.setItem('upes_rounds', JSON.stringify(currentRoundsList));
        localStorage.setItem('upes_sprs', JSON.stringify(currentSprPool));
        localStorage.setItem('upes_duty_assignments', JSON.stringify([...newDuties, ...dutyAssignments]));
        localStorage.setItem('upes_spr_cycle', JSON.stringify(currentCycleState));
      } catch {}

      addAuditLog(
        'CREATE_COMPANY',
        `Created company ${payload.name} with ${newRoundsCreated.length} auto-generated rounds and fair SPR allotments across ${payload.venues?.length || 1} venue(s).`
      );
    } else {
      addAuditLog('CREATE_COMPANY', `Added company profile for ${payload.name}.`);
    }
  };

  const deleteCompany = (id: string) => {
    const target = companies.find((c) => c.id === id);
    const compName = target ? target.name : id;

    // Identify all rounds belonging to this company process
    const roundsToDelete = rounds.filter((r) => r.companyId === id || r.companyName === compName);
    const deletedRoundIds = new Set(roundsToDelete.map((r) => r.id));

    // Find all SPR duty assignments associated with this company or its rounds
    const dutiesToDelete = dutyAssignments.filter(
      (d) => deletedRoundIds.has(d.roundId) || d.companyName === compName
    );

    // Count duties to reduce per SPR
    const sprDutyReductions = new Map<string, number>();
    dutiesToDelete.forEach((d) => {
      const cur = sprDutyReductions.get(d.sprId) || 0;
      sprDutyReductions.set(d.sprId, cur + 1);
    });

    // Also account for assignedSprIds on the round models themselves
    roundsToDelete.forEach((r) => {
      if (Array.isArray(r.assignedSprIds)) {
        r.assignedSprIds.forEach((sId) => {
          if (!sprDutyReductions.has(sId)) {
            sprDutyReductions.set(sId, 1);
          }
        });
      }
    });

    // Reduce duties by 1 per deleted duty assignment for all assigned SPRs
    setSprs((prev) =>
      prev.map((s) => {
        const count = sprDutyReductions.get(s.id) || 0;
        if (count > 0) {
          const newTotal = Math.max(0, s.totalDuties - count);
          return {
            ...s,
            totalDuties: newTotal,
            usedInCurrentCycle: newTotal > 0 ? s.usedInCurrentCycle : false,
          };
        }
        return s;
      })
    );

    // Remove deleted duty assignments
    setDutyAssignments((prev) =>
      prev.filter((d) => !deletedRoundIds.has(d.roundId) && d.companyName !== compName)
    );

    // Adjust cycle count
    setSprCycle((prev) => ({
      ...prev,
      usedSprCount: Math.max(0, prev.usedSprCount - dutiesToDelete.length),
    }));

    // Remove company, drives, rounds, and associated round students
    setCompanies((prev) => prev.filter((c) => c.id !== id));
    setDrives((prev) => prev.filter((d) => d.companyId !== id && d.companyName !== compName));
    setRounds((prev) => prev.filter((r) => r.companyId !== id && r.companyName !== compName));
    setRoundStudents((prev) => prev.filter((rs) => !deletedRoundIds.has(rs.roundId) && !rs.roundId.includes(id)));

    addAuditLog('DELETE_COMPANY', `Deleted company process ${compName}, cleared rounds, and reduced assigned SPR duty counts.`);
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
    const rawCompanyId = (roundData.companyId || '').trim();
    if (!rawCompanyId || rawCompanyId === 'comp-1') {
      console.error('Cannot create round: Target company is mandatory (NOT NULL).');
      return;
    }

    const targetCompany = companies.find((c) => c.id === rawCompanyId);
    if (!targetCompany) {
      console.error('Cannot create round: Target company does not exist in registered companies.');
      return;
    }

    const companyId = targetCompany.id;
    const companyName = targetCompany.name;
    const roundName = roundData.name || `${roundData.type || 'Drive'} Round`;
    const roundId = roundData.id || `rnd-${Date.now()}`;
    const driveId = roundData.driveId || drives.find((d) => d.companyId === companyId)?.id || `drv-${companyId}`;

    const qrResult = generateRoundQRToken(roundId, driveId, companyName, roundName, 60, customSessionId);

    const sprsNeededCount = roundData.sprsNeeded || 3;

    // Parse venues
    const rVenuesList = (roundData.venues && roundData.venues.filter(Boolean).length > 0)
      ? roundData.venues.filter(Boolean)
      : (roundData.venue ? roundData.venue.split(',').map((v) => v.trim()).filter(Boolean) : ['Block A - Lab 1']);
    const rVenue = rVenuesList.join(', ');

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
      venue: rVenue,
      venues: rVenuesList,
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

    // Divide allocated SPRs equally among the round's venues
    const venueAssignmentsMap: Record<string, string[]> = {};
    rVenuesList.forEach((v) => {
      venueAssignmentsMap[v] = [];
    });

    const newDuties: SPRDutyAssignment[] = [];
    allocResult.selectedSprs.forEach((spr, sIdx) => {
      const assignedVenue = rVenuesList[sIdx % rVenuesList.length];
      venueAssignmentsMap[assignedVenue].push(spr.id);

      newDuties.push({
        id: `duty-${Date.now()}-${spr.id}-${sIdx}`,
        roundId,
        sprId: spr.id,
        sprName: spr.name,
        companyName,
        roundName,
        date: mockRoundForAlloc.date,
        timeWindow: `${mockRoundForAlloc.startTime} - ${mockRoundForAlloc.endTime}`,
        venue: assignedVenue, // INDIVIDUAL SPECIFIC ASSIGNED VENUE
        role: 'SPR Duty',
        status: 'ASSIGNED',
        assignedAt: new Date().toISOString(),
      });
    });

    const venueAssignments = rVenuesList.map((v) => ({
      venue: v,
      sprIds: venueAssignmentsMap[v] || [],
    }));

    const newRound: Round = {
      ...mockRoundForAlloc,
      venues: rVenuesList,
      venueAssignments,
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

    // Find all duty assignments belonging to this round
    const dutiesToDelete = dutyAssignments.filter((d) => d.roundId === roundId);
    const sprDutyReductions = new Map<string, number>();
    dutiesToDelete.forEach((d) => {
      const cur = sprDutyReductions.get(d.sprId) || 0;
      sprDutyReductions.set(d.sprId, cur + 1);
    });

    // Also account for assignedSprIds on target round
    if (target?.assignedSprIds) {
      target.assignedSprIds.forEach((sId) => {
        if (!sprDutyReductions.has(sId)) {
          sprDutyReductions.set(sId, 1);
        }
      });
    }

    // Reduce duties by 1 for all assigned SPRs
    setSprs((prev) =>
      prev.map((s) => {
        const count = sprDutyReductions.get(s.id) || 0;
        if (count > 0) {
          const newTotal = Math.max(0, s.totalDuties - count);
          return {
            ...s,
            totalDuties: newTotal,
            usedInCurrentCycle: newTotal > 0 ? s.usedInCurrentCycle : false,
          };
        }
        return s;
      })
    );

    // Remove the round
    const updatedRounds = rounds.filter((r) => r.id !== roundId);
    // Remove all round students for this round
    const updatedRoundStudents = roundStudents.filter((rs) => rs.roundId !== roundId);

    syncLiveAttendance(updatedRoundStudents, updatedRounds);

    // Remove associated duty assignments
    setDutyAssignments((prev) => prev.filter((d) => d.roundId !== roundId));

    // Adjust cycle tracker count
    setSprCycle((prev) => ({
      ...prev,
      usedSprCount: Math.max(0, prev.usedSprCount - dutiesToDelete.length),
    }));

    // Remove stored Excel buffer
    setOriginalExcelBuffers((prev) => {
      const next = new Map(prev);
      next.delete(roundId);
      return next;
    });

    addAuditLog('DELETE_ROUND', `Deleted round ${roundLabel}, cleared duties, and reduced assigned SPR duty counts by 1.`);
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

  const getPreservedRoundVenueAssignments = (
    round: Round,
    roundVenues: string[],
    existingDutyAssignments: SPRDutyAssignment[]
  ): { venue: string; sprIds: string[] }[] => {
    let currentVA: { venue: string; sprIds: string[] }[] = (round.venueAssignments && round.venueAssignments.length > 0)
      ? round.venueAssignments.map((va) => ({ venue: va.venue, sprIds: [...va.sprIds] }))
      : roundVenues.map((v) => ({ venue: v, sprIds: [] }));

    roundVenues.forEach((rv) => {
      if (!currentVA.some((va) => va.venue === rv)) {
        currentVA.push({ venue: rv, sprIds: [] });
      }
    });

    const assignedIds = round.assignedSprIds || [];
    const accountedIds = new Set<string>();
    currentVA.forEach((va) => {
      va.sprIds = va.sprIds.filter((id) => assignedIds.includes(id));
      va.sprIds.forEach((id) => accountedIds.add(id));
    });

    const roundDuties = existingDutyAssignments.filter((d) => d.roundId === round.id);
    assignedIds.forEach((id) => {
      if (!accountedIds.has(id)) {
        const duty = roundDuties.find((d) => d.sprId === id);
        let targetV = duty?.venue && roundVenues.includes(duty.venue) ? duty.venue : undefined;
        if (!targetV) {
          const sortedVA = [...currentVA].sort((a, b) => a.sprIds.length - b.sprIds.length);
          targetV = sortedVA[0].venue;
        }
        const grp = currentVA.find((va) => va.venue === targetV);
        if (grp) {
          grp.sprIds.push(id);
        } else {
          currentVA[0].sprIds.push(id);
        }
        accountedIds.add(id);
      }
    });

    return currentVA;
  };

  const allocateSprsToRound = (roundId: string, countNeeded: number, targetVenue?: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return { success: false, count: 0, message: 'Round not found' };

    let roundVenues = (round.venues && round.venues.length > 0)
      ? round.venues.filter(Boolean)
      : (round.venue ? round.venue.split(',').map((v) => v.trim()).filter(Boolean) : ['Campus Venue']);
    if (roundVenues.length === 0) roundVenues = ['Campus Venue'];

    const allocation = allocateSPRsForRound(round, countNeeded, sprs, sprCycle, rounds);
    if (allocation.selectedSprs.length === 0) {
      return { success: false, count: 0, message: 'No eligible SPRs available for this date / cycle' };
    }

    const selectedIds = allocation.selectedSprs.map((s) => s.id);

    // Current venueAssignments preserving all already assigned SPRs
    let currentVA = getPreservedRoundVenueAssignments(round, roundVenues, dutyAssignments);

    const newDuties: SPRDutyAssignment[] = [];

    // Distribute newly selected SPRs
    allocation.selectedSprs.forEach((spr) => {
      let assignedVenue = targetVenue;
      if (!assignedVenue || !roundVenues.includes(assignedVenue)) {
        // Find venue in currentVA with the lowest sprIds.length to balance equally!
        const sortedVA = [...currentVA].sort((a, b) => a.sprIds.length - b.sprIds.length);
        assignedVenue = sortedVA[0].venue;
      }

      const targetGroup = currentVA.find((va) => va.venue === assignedVenue);
      if (targetGroup) {
        targetGroup.sprIds.push(spr.id);
      } else {
        currentVA.push({ venue: assignedVenue, sprIds: [spr.id] });
      }

      newDuties.push({
        id: `duty-${Date.now()}-${spr.id}-${Math.random().toString(36).substring(2, 6)}`,
        roundId,
        sprId: spr.id,
        sprName: spr.name,
        companyName: round.companyName,
        roundName: round.name,
        date: round.date,
        timeWindow: round.startTime && round.endTime ? `${round.startTime} - ${round.endTime}` : 'Full Day',
        venue: assignedVenue,
        role: 'SPR Duty',
        status: 'ASSIGNED',
        assignedAt: new Date().toISOString(),
      });
    });

    // Update round assigned SPRs
    const nextRounds = rounds.map((r) =>
      r.id === roundId
        ? {
            ...r,
            venues: roundVenues,
            venueAssignments: currentVA,
            assignedSprIds: [...r.assignedSprIds, ...selectedIds],
          }
        : r
    );
    setRounds(nextRounds);

    // Update SPRs usage and duty counts
    const nextSprs = sprs.map((s) =>
      selectedIds.includes(s.id)
        ? {
            ...s,
            totalDuties: s.totalDuties + 1,
            usedInCurrentCycle: true,
          }
        : s
    );
    setSprs(nextSprs);

    const nextDuties = [...newDuties, ...dutyAssignments];
    setDutyAssignments(nextDuties);

    // Update cycle count
    const newUsed = sprCycle.usedSprCount + selectedIds.length;
    const isClosed = allocation.cycleClosed;
    const nextCycle: SPRCycle = {
      ...sprCycle,
      totalSprsInPool: nextSprs.length,
      usedSprCount: isClosed ? 0 : newUsed,
      id: isClosed ? sprCycle.id + 1 : sprCycle.id,
      status: isClosed ? 'OPEN' : sprCycle.status,
    };
    setSprCycle(nextCycle);

    try {
      localStorage.setItem('upes_rounds', JSON.stringify(nextRounds));
      localStorage.setItem('upes_sprs', JSON.stringify(nextSprs));
      localStorage.setItem('upes_duty_assignments', JSON.stringify(nextDuties));
      localStorage.setItem('upes_spr_cycle', JSON.stringify(nextCycle));
    } catch {}

    addAuditLog(
      'AUTO_SPR_ALLOCATED',
      `Allocated ${allocation.selectedSprs.length} SPR(s) to ${round.companyName} (${round.name}). Venue: ${
        targetVenue || 'Equally distributed'
      }`
    );

    return {
      success: true,
      count: allocation.selectedSprs.length,
      message: `Successfully allocated ${allocation.selectedSprs.length} SPR(s) following fair rotation cycle.`,
    };
  };

  const triggerSprAllocation = (roundId: string, countNeeded: number) => {
    return allocateSprsToRound(roundId, countNeeded);
  };

  const assignSprManuallyToRound = (roundId: string, sprId: string, targetVenue?: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return { success: false, message: 'Round not found' };

    const spr = sprs.find((s) => s.id === sprId);
    if (!spr) return { success: false, message: 'SPR not found' };

    if (round.assignedSprIds?.includes(sprId)) {
      return { success: false, message: `${spr.name} is already assigned to this round.` };
    }

    let roundVenues = (round.venues && round.venues.length > 0)
      ? round.venues.filter(Boolean)
      : (round.venue ? round.venue.split(',').map((v) => v.trim()).filter(Boolean) : ['Campus Venue']);
    if (roundVenues.length === 0) roundVenues = ['Campus Venue'];

    // Preserve ALL existing assigned SPRs so none are wiped out!
    let currentVA = getPreservedRoundVenueAssignments(round, roundVenues, dutyAssignments);

    let assignedVenue = targetVenue;
    if (!assignedVenue || !roundVenues.includes(assignedVenue)) {
      const sortedVA = [...currentVA].sort((a, b) => a.sprIds.length - b.sprIds.length);
      assignedVenue = sortedVA[0].venue;
    }

    const targetGroup = currentVA.find((va) => va.venue === assignedVenue);
    if (targetGroup) {
      targetGroup.sprIds.push(spr.id);
    } else {
      currentVA.push({ venue: assignedVenue, sprIds: [spr.id] });
    }

    const newDuty: SPRDutyAssignment = {
      id: `duty-${Date.now()}-${spr.id}-${Math.random().toString(36).substring(2, 6)}`,
      roundId,
      sprId: spr.id,
      sprName: spr.name,
      companyName: round.companyName,
      roundName: round.name,
      date: round.date,
      timeWindow: round.startTime && round.endTime ? `${round.startTime} - ${round.endTime}` : 'Full Day',
      venue: assignedVenue,
      role: 'SPR Duty (Manual)',
      status: 'ASSIGNED',
      assignedAt: new Date().toISOString(),
    };

    const nextRounds = rounds.map((r) =>
      r.id === roundId
        ? {
            ...r,
            venues: roundVenues,
            venueAssignments: currentVA,
            assignedSprIds: [...r.assignedSprIds, sprId],
          }
        : r
    );
    setRounds(nextRounds);

    const nextSprs = sprs.map((s) =>
      s.id === sprId
        ? {
            ...s,
            totalDuties: s.totalDuties + 1,
            usedInCurrentCycle: true,
          }
        : s
    );
    setSprs(nextSprs);

    const nextDuties = [newDuty, ...dutyAssignments];
    setDutyAssignments(nextDuties);

    try {
      localStorage.setItem('upes_rounds', JSON.stringify(nextRounds));
      localStorage.setItem('upes_sprs', JSON.stringify(nextSprs));
      localStorage.setItem('upes_duty_assignments', JSON.stringify(nextDuties));
    } catch {}

    addAuditLog(
      'MANUAL_SPR_ASSIGNED',
      `Manually assigned SPR ${spr.name} to ${round.companyName} (${round.name}) at venue ${assignedVenue}.`
    );

    return { success: true, message: `Assigned ${spr.name} to ${assignedVenue}` };
  };

  const removeSprFromRound = (roundId: string, sprId: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return { success: false, message: 'Round not found' };

    const spr = sprs.find((s) => s.id === sprId);
    const sprName = spr ? spr.name : sprId;

    let roundVenues = (round.venues && round.venues.length > 0)
      ? round.venues.filter(Boolean)
      : (round.venue ? round.venue.split(',').map((v) => v.trim()).filter(Boolean) : ['Campus Venue']);
    if (roundVenues.length === 0) roundVenues = ['Campus Venue'];

    let currentVA = getPreservedRoundVenueAssignments(round, roundVenues, dutyAssignments);
    const nextVA = currentVA.map((va) => ({
      venue: va.venue,
      sprIds: va.sprIds.filter((id) => id !== sprId),
    }));

    const nextRounds = rounds.map((r) =>
      r.id === roundId
        ? {
            ...r,
            venues: roundVenues,
            venueAssignments: nextVA,
            assignedSprIds: r.assignedSprIds.filter((id) => id !== sprId),
          }
        : r
    );
    setRounds(nextRounds);

    const nextDuties = dutyAssignments.filter(
      (d) => !(d.roundId === roundId && d.sprId === sprId)
    );
    setDutyAssignments(nextDuties);

    const nextSprs = sprs.map((s) =>
      s.id === sprId
        ? {
            ...s,
            totalDuties: Math.max(0, s.totalDuties - 1),
          }
        : s
    );
    setSprs(nextSprs);

    try {
      localStorage.setItem('upes_rounds', JSON.stringify(nextRounds));
      localStorage.setItem('upes_duty_assignments', JSON.stringify(nextDuties));
      localStorage.setItem('upes_sprs', JSON.stringify(nextSprs));
    } catch {}

    addAuditLog(
      'SPR_REMOVED',
      `Removed SPR ${sprName} from ${round.companyName} - ${round.name}.`
    );

    return { success: true, message: `Removed ${sprName} from duty roster.` };
  };

  const reassignSprVenue = (roundId: string, sprId: string, newVenue: string) => {
    const round = rounds.find((r) => r.id === roundId);
    if (!round) return { success: false, message: 'Round not found' };

    const spr = sprs.find((s) => s.id === sprId);
    const sprName = spr ? spr.name : sprId;

    let roundVenues = (round.venues && round.venues.length > 0)
      ? round.venues.filter(Boolean)
      : (round.venue ? round.venue.split(',').map((v) => v.trim()).filter(Boolean) : ['Campus Venue']);
    if (roundVenues.length === 0) roundVenues = ['Campus Venue'];

    let currentVA = getPreservedRoundVenueAssignments(round, roundVenues, dutyAssignments);
    currentVA = currentVA.map((va) => ({
      venue: va.venue,
      sprIds: va.sprIds.filter((id) => id !== sprId),
    }));

    let targetGroup = currentVA.find((va) => va.venue === newVenue);
    if (!targetGroup) {
      targetGroup = { venue: newVenue, sprIds: [] };
      currentVA.push(targetGroup);
    }
    targetGroup.sprIds.push(sprId);

    const nextRounds = rounds.map((r) =>
      r.id === roundId
        ? {
            ...r,
            venues: roundVenues,
            venueAssignments: currentVA,
          }
        : r
    );
    setRounds(nextRounds);

    const nextDuties = dutyAssignments.map((d) =>
      d.roundId === roundId && d.sprId === sprId
        ? { ...d, venue: newVenue }
        : d
    );
    setDutyAssignments(nextDuties);

    try {
      localStorage.setItem('upes_rounds', JSON.stringify(nextRounds));
      localStorage.setItem('upes_duty_assignments', JSON.stringify(nextDuties));
    } catch {}

    addAuditLog(
      'SPR_VENUE_REASSIGNED',
      `Reassigned SPR ${sprName} to venue ${newVenue} for ${round.companyName} - ${round.name}.`
    );

    return { success: true, message: `Reassigned ${sprName} to ${newVenue}` };
  };

  const resetAllDutiesToZero = () => {
    setSprs((prev) =>
      prev.map((s) => ({
        ...s,
        totalDuties: 0,
        usedInCurrentCycle: false,
      }))
    );
    setDutyAssignments([]);
    setSprCycle({
      id: 1,
      startedAt: new Date().toISOString().split('T')[0],
      status: 'OPEN',
      totalSprsInPool: sprs.length || 50,
      usedSprCount: 0,
    });
    setRounds((prev) =>
      prev.map((r) => ({
        ...r,
        assignedSprIds: [],
      }))
    );
    try {
      localStorage.setItem('upes_duty_assignments', JSON.stringify([]));
      const resetList = sprs.map((s) => ({ ...s, totalDuties: 0, usedInCurrentCycle: false }));
      localStorage.setItem('upes_sprs', JSON.stringify(resetList));
      saveToIDB('upes_duty_assignments', []);
      saveToIDB('upes_sprs', resetList);
    } catch {}

    addAuditLog('SYSTEM_RESET', 'Reset all SPR duty counts to 0 and cleared duty rotation assignments.');
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

  const updateSpr = (id: string, data: Partial<SPR>) => {
    setSprs((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    );
    if (data.name) {
      setDutyAssignments((prev) =>
        prev.map((d) => (d.sprId === id ? { ...d, sprName: data.name! } : d))
      );
    }
    try {
      const updatedSprs = sprs.map((s) => (s.id === id ? { ...s, ...data } : s));
      localStorage.setItem('upes_sprs', JSON.stringify(updatedSprs));
    } catch {}
    addAuditLog('UPDATE_SPR', `Updated profile for SPR ID ${id}.`);
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
    const remainingDirectors = users.filter(
      (u) => u.id !== userId && (u.role === 'DIRECTOR' || u.role === 'MASTER_ADMIN')
    );
    if (remainingDirectors.length === 0) {
      return { success: false, message: 'Cannot delete the only remaining Director account.' };
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
    setSprs(initialSPRs);
    setDutyAssignments([]);
    localStorage.removeItem('upes_students');
    localStorage.removeItem('upes_companies');
    localStorage.removeItem('upes_drives');
    localStorage.removeItem('upes_rounds');
    localStorage.removeItem('upes_round_students');
    localStorage.setItem('upes_sprs', JSON.stringify(initialSPRs));
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
        allocateSprsToRound,
        assignSprManuallyToRound,
        removeSprFromRound,
        reassignSprVenue,
        addSpr,
        updateSpr,
        deleteSpr,
        acceptDuty,
        debarStudent,
        resolveUnknownSapIds,
        acceptOffer,
        regenerateQR,
        toggleGeoFence,
        resetAllDutiesToZero,
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
