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
} from '../mock/mockData';
import { allocateSPRsForRound } from '../utils/sprAllocationEngine';
import { generateRoundQRToken } from '../utils/qrUtils';

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
  createRound: (roundData: Partial<Round>, shortlistedStudents: Student[]) => void;
  markAttendance: (roundId: string, sapId: string, method?: string) => { success: boolean; message: string };
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
}

const PortalContext = createContext<PortalContextType | undefined>(undefined);

export const PortalProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentRole, setCurrentRole] = useState<UserRole>('PLACEMENT_OFFICER');
  const [activeTab, setActiveTab] = useState<string>('command-center');

  const [students, setStudents] = useState<Student[]>(() => {
    const saved = localStorage.getItem('upes_students');
    return saved ? JSON.parse(saved) : initialStudents;
  });

  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('upes_companies');
    return saved ? JSON.parse(saved) : initialCompanies;
  });

  const [drives, setDrives] = useState<Drive[]>(initialDrives);
  const [rounds, setRounds] = useState<Round[]>(initialRounds);
  const [roundStudents, setRoundStudents] = useState<RoundStudent[]>(initialRoundStudents);
  const [sprs, setSprs] = useState<SPR[]>(() => {
    const saved = localStorage.getItem('upes_sprs');
    return saved ? JSON.parse(saved) : initialSPRs;
  });
  const [sprCycle, setSprCycle] = useState<SPRCycle>(initialSPRCycle);
  const [dutyAssignments, setDutyAssignments] = useState<SPRDutyAssignment[]>(initialDutyAssignments);
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(initialAuditLogs);
  const [notifications, setNotifications] = useState<string[]>([
    'Season 2025-2026 is LIVE. 12 active drives running.',
    'Microsoft Round 2 Technical Interview is IN PROGRESS at Block B.',
    '4 rounds currently need SPR duty allocation.',
  ]);

  // Sync to local storage for persistence
  useEffect(() => {
    localStorage.setItem('upes_students', JSON.stringify(students));
  }, [students]);

  useEffect(() => {
    localStorage.setItem('upes_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('upes_sprs', JSON.stringify(sprs));
  }, [sprs]);

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

  const createRound = (roundData: Partial<Round>, shortlistedStudents: Student[]) => {
    const companyName = roundData.companyName || 'Company';
    const roundName = roundData.name || 'Round';
    const roundId = `rnd-${Date.now()}`;
    const driveId = roundData.driveId || 'drv-1';
    const companyId = roundData.companyId || 'comp-1';

    const qrResult = generateRoundQRToken(roundId, driveId, companyName, roundName, 60, true);

    const newRound: Round = {
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
      geoFenceEnabled: true,
      status: 'SCHEDULED',
      assignedSprIds: [],
      totalShortlisted: shortlistedStudents.length,
      attendedCount: 0,
      absentCount: 0,
    };

    setRounds((prev) => [newRound, ...prev]);

    // Create RoundStudent entries
    const newRoundStudents: RoundStudent[] = shortlistedStudents.map((st, i) => ({
      roundId,
      studentId: st.id,
      sapId: st.sapId,
      studentName: st.name,
      email: st.email,
      phone: st.phone,
      branch: st.branch,
      shortlistStatus: 'SHORTLISTED',
      attendanceStatus: 'PENDING',
      panelNumber: `Panel ${(i % 4) + 1} (Room ${(i % 4) + 101})`,
    }));

    setRoundStudents((prev) => [...newRoundStudents, ...prev]);
    addAuditLog('CREATE_ROUND', `Created ${roundName} for ${companyName} with ${shortlistedStudents.length} shortlisted candidates.`);
  };

  const markAttendance = (roundId: string, sapId: string, method: string = 'SELF_QR_SCAN') => {
    const student = students.find((s) => s.sapId === sapId);
    if (!student) {
      return { success: false, message: `SAP ID ${sapId} not found in student database.` };
    }

    const roundStudentIndex = roundStudents.findIndex(
      (rs) => rs.roundId === roundId && rs.sapId === sapId
    );

    if (roundStudentIndex === -1) {
      return { success: false, message: `Student ${student.name} (${sapId}) is NOT shortlisted for this round!` };
    }

    const currentRecord = roundStudents[roundStudentIndex];
    if (currentRecord.attendanceStatus === 'PRESENT' || currentRecord.attendanceStatus === 'MANUALLY_MARKED') {
      return { success: false, message: `Attendance already marked for ${student.name} at ${currentRecord.attendanceTime}.` };
    }

    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setRoundStudents((prev) =>
      prev.map((rs, idx) =>
        idx === roundStudentIndex
          ? {
              ...rs,
              attendanceStatus: 'PRESENT',
              attendanceTime: nowTime,
              markedBy: method,
            }
          : rs
      )
    );

    setRounds((prev) =>
      prev.map((r) =>
        r.id === roundId
          ? { ...r, attendedCount: r.attendedCount + 1 }
          : r
      )
    );

    addAuditLog('ATTENDANCE_MARKED', `Attendance marked for ${student.name} (${sapId}) in round ${roundId} via ${method}.`);
    return { success: true, message: `Attendance verified successfully for ${student.name} (${sapId})!` };
  };

  const manualAttendanceOverride = (roundId: string, sapId: string, status: 'PRESENT' | 'ABSENT', reason: string) => {
    const nowTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setRoundStudents((prev) =>
      prev.map((rs) =>
        rs.roundId === roundId && rs.sapId === sapId
          ? {
              ...rs,
              attendanceStatus: status === 'PRESENT' ? 'MANUALLY_MARKED' : 'ABSENT',
              attendanceTime: status === 'PRESENT' ? nowTime : undefined,
              markedBy: `MANUAL_OVERRIDE: ${reason}`,
            }
          : rs
      )
    );

    addAuditLog('MANUAL_ATTENDANCE_OVERRIDE', `Manual override set to ${status} for SAP ${sapId}. Reason: ${reason}`);
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
      role: 'Process Coordinator & Attendance Verifier',
      status: 'PENDING',
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

    const qrResult = generateRoundQRToken(roundId, round.driveId, round.companyName, round.name, 30, round.geoFenceEnabled);
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

  return (
    <PortalContext.Provider
      value={{
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
