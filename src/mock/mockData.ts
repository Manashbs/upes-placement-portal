import { Student, Company, Drive, Round, RoundStudent, SPR, SPRCycle, SPRDutyAssignment, Offer, AuditLog, PortalUser } from '../types';

/**
 * Production Initial State:
 * All dummy students, companies, drives, rounds, and offers removed.
 * Only default portal accounts are provisioned for real project deployment.
 */

export const initialUsers: PortalUser[] = [
  {
    id: 'usr-director-manash',
    username: 'Manash.29481@stu.upes.ac.in',
    name: 'Manash (Director)',
    email: 'Manash.29481@stu.upes.ac.in',
    role: 'DIRECTOR',
    password: 'Pass@123',
    status: 'ACTIVE',
    department: 'Directorate of Career Services',
    createdAt: '2026-09-01',
    lastLogin: '2026-09-13 00:55',
  },
];

export const initialStudents: Student[] = [];

export const initialCompanies: Company[] = [];

export const initialDrives: Drive[] = [];

export const initialRounds: Round[] = [];

export const initialRoundStudents: RoundStudent[] = [];

export const initialSPRs: SPR[] = [];

export const initialSPRCycle: SPRCycle = {
  id: 1,
  startedAt: '2026-09-01',
  status: 'OPEN',
  totalSprsInPool: 0,
  usedSprCount: 0,
};

export const initialDutyAssignments: SPRDutyAssignment[] = [];

export const initialOffers: Offer[] = [];

export const initialAuditLogs: AuditLog[] = [
  {
    id: 'log-sys-init',
    timestamp: new Date().toLocaleString(),
    actorName: 'System',
    actorRole: 'MASTER_ADMIN',
    action: 'SYSTEM_INITIALIZED',
    details: 'UPES Placement Portal initialized in production clean mode.',
  },
];
