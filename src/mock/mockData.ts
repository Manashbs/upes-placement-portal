import { Student, Company, Drive, Round, RoundStudent, SPR, SPRCycle, SPRDutyAssignment, Offer, AuditLog, PortalUser } from '../types';

/**
 * Production Initial State:
 * All dummy students, companies, drives, rounds, and offers removed.
 * Only default portal accounts are provisioned for real project deployment.
 */

export const initialUsers: PortalUser[] = [
  {
    id: 'usr-master-admin',
    username: 'Manash.29481@stu.upes.ac.in',
    name: 'Manash (Master Admin)',
    email: 'Manash.29481@stu.upes.ac.in',
    role: 'MASTER_ADMIN',
    password: 'Pass@123',
    status: 'ACTIVE',
    department: 'Directorate of Career Services & Placement Cell',
    createdAt: '2026-09-01',
    lastLogin: '2026-09-13 00:20',
  },
  {
    id: 'usr-admin-alias',
    username: 'admin',
    name: 'Master Admin',
    email: 'Manash.29481@stu.upes.ac.in',
    role: 'MASTER_ADMIN',
    password: 'Pass@123',
    status: 'ACTIVE',
    department: 'Directorate of Career Services',
    createdAt: '2026-09-01',
    lastLogin: '2026-09-13 00:20',
  },
  {
    id: 'usr-po-1',
    username: 'officer',
    name: 'Placement Officer',
    email: 'placements@upes.ac.in',
    role: 'PLACEMENT_OFFICER',
    password: 'Pass@123',
    status: 'ACTIVE',
    department: 'Corporate Relations & Career Services',
    createdAt: '2026-09-01',
  },
  {
    id: 'usr-spr-1',
    username: 'spr',
    name: 'SPR Representative',
    email: 'spr.desk@stu.upes.ac.in',
    role: 'SPR',
    password: 'Pass@123',
    status: 'ACTIVE',
    department: 'Student Placement Representatives Pool',
    createdAt: '2026-09-01',
  },
  {
    id: 'usr-recruiter-1',
    username: 'recruiter',
    name: 'Recruiter Partner',
    email: 'recruiter@enterprise.com',
    role: 'RECRUITER',
    password: 'Pass@123',
    status: 'ACTIVE',
    department: 'Campus Hiring Partner',
    createdAt: '2026-09-01',
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
