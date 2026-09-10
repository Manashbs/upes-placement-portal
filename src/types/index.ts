export type UserRole = 'PLACEMENT_OFFICER' | 'SPR' | 'STUDENT' | 'RECRUITER' | 'SUPER_ADMIN';

export type TierType = 'DREAM' | 'SUPER_DREAM' | 'CORE' | 'MASS';

export interface Student {
  id: string;
  sapId: string; // Primary key e.g. "59001234"
  name: string;
  email: string;
  phone: string;
  branch: string; // e.g. "B.Tech CSE - AI & ML"
  batchYear: number; // e.g. 2026
  cgpa: number;
  activeBacklogs: number;
  historicalBacklogs: number;
  tenthPercent: number;
  twelfthPercent: number;
  status: 'ELIGIBLE' | 'PLACED' | 'DEBARRED';
  placedTier?: TierType;
  placedCompanyId?: string;
  placedCompanyName?: string;
  placedCtc?: number;
  debarredReason?: string;
  avatar?: string;
}

export interface Company {
  id: string;
  name: string;
  logo: string;
  category: TierType;
  industry: string;
  description: string;
  ctcTotal: number; // in LPA e.g. 18.5
  ctcBreakup: { base: number; variable: number; joiningBonus: number };
  bondDetails?: string;
  status: 'ACTIVE' | 'PENDING' | 'COMPLETED' | 'ARCHIVED' | 'BLACK_LISTED';
  eligibleStudentsCount: number;
  activeDrivesCount: number;
  hrContact: { name: string; email: string; phone: string };
  pastYearHired?: number;
  recruiterFeedback?: string;
  totalStudentsSat?: number;
  offersGivenCount?: number;
}

export type RoundType = 
  | 'PPT'
  | 'ONLINE_TEST'
  | 'CODING'
  | 'GD'
  | 'TECHNICAL_INTERVIEW'
  | 'HR_INTERVIEW'
  | 'ASSESSMENT'
  | 'DOCUMENTATION';

export type RoundMode = 'ON_CAMPUS' | 'VIRTUAL' | 'HYBRID';

export interface Drive {
  id: string;
  companyId: string;
  companyName: string;
  academicYear: string;
  jobRole: string;
  ctc: number;
  tier: TierType;
  eligibilityCriteria: {
    minCgpa: number;
    maxActiveBacklogs: number;
    allowedBranches: string[];
    allowedBatches: number[];
    tierRestrictionPolicy: string;
  };
  status: 'UPCOMING' | 'ONGOING' | 'COMPLETED';
}

export interface Round {
  id: string;
  driveId: string;
  companyId: string;
  companyName: string;
  roundNumber: number;
  name: string;
  type: RoundType;
  mode: RoundMode;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  venue: string; // e.g. "Block A - Lab 3"
  capacity: number;
  qrToken: string;
  qrExpiresAt: string;
  geoFenceEnabled: boolean;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED';
  assignedSprIds: string[];
  totalShortlisted: number;
  attendedCount: number;
  absentCount: number;
}

export interface RoundStudent {
  roundId: string;
  studentId: string;
  sapId: string;
  studentName: string;
  email: string;
  phone: string;
  branch: string;
  shortlistStatus: 'SHORTLISTED' | 'CLEARED' | 'REJECTED' | 'ON_HOLD';
  attendanceStatus: 'PENDING' | 'PRESENT' | 'ABSENT' | 'MANUALLY_MARKED';
  attendanceTime?: string;
  markedBy?: string;
  panelNumber?: string;
}

export interface SPR {
  id: string;
  studentId: string;
  sapId: string;
  name: string;
  email: string;
  phone: string;
  branch: string;
  totalDuties: number;
  usedInCurrentCycle: boolean;
  unavailabilities: { fromDate: string; toDate: string; reason: string }[];
  avatar?: string;
}

export interface SPRCycle {
  id: number;
  startedAt: string;
  totalSprsInPool: number;
  usedSprCount: number;
  status: 'OPEN' | 'CLOSED';
}

export interface SPRDutyAssignment {
  id: string;
  roundId: string;
  sprId: string;
  sprName: string;
  companyName: string;
  roundName: string;
  date: string;
  timeWindow: string;
  venue: string;
  role: string;
  status: 'PENDING' | 'ACCEPTED' | 'SWAP_REQUESTED' | 'COMPLETED';
  assignedAt: string;
}

export interface Offer {
  id: string;
  studentId: string;
  sapId: string;
  studentName: string;
  companyId: string;
  companyName: string;
  driveId: string;
  ctc: number;
  tier: TierType;
  offerType: 'FULL_TIME' | 'INTERN_PPO' | 'INTERN';
  offerDate: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: string;
  action: string;
  details: string;
  ipAddress?: string;
}

export interface InterviewClash {
  id: string;
  studentId: string;
  studentName: string;
  sapId: string;
  round1: { id: string; companyName: string; roundName: string; timeWindow: string };
  round2: { id: string; companyName: string; roundName: string; timeWindow: string };
  status: 'PENDING' | 'RESOLVED';
  preferredRoundId?: string;
}
