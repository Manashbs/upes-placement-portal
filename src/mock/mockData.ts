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

export const initialSPRs: SPR[] = [
  { id: 'spr-1', studentId: '500120001', sapId: '500120001', name: 'Shruti', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-2', studentId: '500120002', sapId: '500120002', name: 'Sahaj Gakhar', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-3', studentId: '500120003', sapId: '500120003', name: 'Mihika', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-4', studentId: '500120004', sapId: '500120004', name: 'Charvie Ganjoo', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-5', studentId: '500120005', sapId: '500120005', name: 'Aayush Kumar', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-6', studentId: '500120006', sapId: '500120006', name: 'Ambrish Chaurasiya', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-7', studentId: '500120007', sapId: '500120007', name: 'Saanvi Gupta', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-8', studentId: '500120008', sapId: '500120008', name: 'Aagman Sharma', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-9', studentId: '500120009', sapId: '500120009', name: 'Sumit Kumar', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-10', studentId: '500120010', sapId: '500120010', name: 'Shashank Dimri', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-11', studentId: '500120011', sapId: '500120011', name: 'Kinjal Srivastava', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-12', studentId: '500120012', sapId: '500120012', name: 'Daksh Mehrotra', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-13', studentId: '500120013', sapId: '500120013', name: 'Pranay Ahluwalia', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-14', studentId: '500120014', sapId: '500120014', name: 'Adwita', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-15', studentId: '500120015', sapId: '500120015', name: 'Shreya Mittal', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-16', studentId: '500120016', sapId: '500120016', name: 'Het Mehta Nilesh Mehta', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-17', studentId: '500120017', sapId: '500120017', name: 'Anusha Sharma', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-18', studentId: '500120018', sapId: '500120018', name: 'Manan Marwah', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-19', studentId: '500120019', sapId: '500120019', name: 'Anima Pandey', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-20', studentId: '500120020', sapId: '500120020', name: 'Sampada Bhardwaj', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-21', studentId: '500120021', sapId: '500120021', name: 'Vishesh Singhal', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-22', studentId: '500120022', sapId: '500120022', name: 'Tejasvi Hazarika', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-23', studentId: '500120023', sapId: '500120023', name: 'Yashi Vijayvargiya', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-24', studentId: '500120024', sapId: '500120024', name: 'Sneha Chaudhary', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-25', studentId: '500120025', sapId: '500120025', name: 'Vaishnavi Sharma', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-26', studentId: '500120026', sapId: '500120026', name: 'Shivanya Bharadwaj', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-27', studentId: '500120027', sapId: '500120027', name: 'Sambhav Chhibber', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-28', studentId: '500120028', sapId: '500120028', name: 'Oshan Paul', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-29', studentId: '500120029', sapId: '500120029', name: 'Anshika Agarwal', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-30', studentId: '500120030', sapId: '500120030', name: 'Rishu Kumar', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-31', studentId: '500120031', sapId: '500120031', name: 'Manvi Sethi', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-32', studentId: '500120032', sapId: '500120032', name: 'Jyoti Kumari', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-33', studentId: '500120033', sapId: '500120033', name: 'Manash Srivastav', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-34', studentId: '500120034', sapId: '500120034', name: 'Vedant Kalla', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-35', studentId: '500120035', sapId: '500120035', name: 'Bhavya Chadha', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-36', studentId: '500120036', sapId: '500120036', name: 'Ritika Mathur', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-37', studentId: '500120037', sapId: '500120037', name: 'Mehak Dahiya', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-38', studentId: '500120038', sapId: '500120038', name: 'Kushagra Agarwal', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-39', studentId: '500120287', sapId: '500120287', name: 'Chitranshi', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-40', studentId: '500120040', sapId: '500120040', name: 'Abhineet Tandon', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-41', studentId: '500120041', sapId: '500120041', name: 'Harsh Shivhare', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-42', studentId: '500120042', sapId: '500120042', name: 'Tanvi Kapoor', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-43', studentId: '500120043', sapId: '500120043', name: 'Lavish Sharma', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-44', studentId: '500120044', sapId: '500120044', name: 'Suryansh Mishra', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-45', studentId: '500120045', sapId: '500120045', name: 'Harshdeep Singh Basra', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-46', studentId: '500120046', sapId: '500120046', name: 'Navya Chaudhary', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-47', studentId: '500120047', sapId: '500120047', name: 'Daksh Sethi', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-48', studentId: '500120048', sapId: '500120048', name: 'Abhiram Bhamidipati', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-49', studentId: '500120049', sapId: '500120049', name: 'Aashna Suman', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
  { id: 'spr-50', studentId: '500120050', sapId: '500120050', name: 'Mayank Tanishk', email: '', phone: '', branch: 'B.Tech CSE', totalDuties: 0, usedInCurrentCycle: false, unavailabilities: [] },
];

export const initialSPRCycle: SPRCycle = {
  id: 1,
  startedAt: '2026-09-01',
  status: 'OPEN',
  totalSprsInPool: 50,
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
