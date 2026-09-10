import * as XLSX from 'xlsx';
import { RoundStudent, Student } from '../types';

export interface MatchedCandidate {
  student: Student;
  matchType: 'EMAIL_MATCH' | 'NAME_MATCH' | 'PHONE_MATCH' | 'SAP_MATCH' | 'AUTO_REGISTERED';
  recruiterData: {
    applicantId?: string;
    candidateId?: string;
    rawName: string;
    rawEmail: string;
    rawPhone: string;
  };
}

export interface FuzzyParseResult {
  totalRows: number;
  matchedStudents: MatchedCandidate[];
  unmatchedRows: { applicantId: string; name: string; email: string; phone: string; raw: any }[];
  headersFound: string[];
}

export function parseShortlistExcel(
  fileData: ArrayBuffer,
  masterStudents: Student[]
): FuzzyParseResult {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

  if (!jsonData || jsonData.length === 0) {
    return {
      totalRows: 0,
      matchedStudents: [],
      unmatchedRows: [],
      headersFound: [],
    };
  }

  const sampleRow = jsonData[0];
  const headersFound = Object.keys(sampleRow);

  // Helper to find header key by fuzzy matching
  const findHeaderKey = (possibleNames: string[]) => {
    return headersFound.find((h) =>
      possibleNames.some((p) => h.toLowerCase().trim().includes(p.toLowerCase()))
    );
  };

  const emailKey = findHeaderKey(['primary email', 'email id', 'candidate email', 'applicant email', 'email', 'mail']);
  const nameKey = findHeaderKey(['candidate name', 'applicant name', 'student name', 'full name', 'name']);
  const phoneKey = findHeaderKey(['mobile', 'phone', 'contact']);
  const idKey = findHeaderKey(['applicant id', 'candidate id', 'registration no', 'reg no', 'sap id', 'sapid', 'roll no']);

  const matchedStudents: MatchedCandidate[] = [];
  const unmatchedRows: { applicantId: string; name: string; email: string; phone: string; raw: any }[] = [];

  // Build lookup maps from Master DB
  const masterMapByEmail = new Map<string, Student>();
  const masterMapByName = new Map<string, Student>();
  const masterMapByPhone = new Map<string, Student>();
  const masterMapBySap = new Map<string, Student>();

  masterStudents.forEach((s) => {
    if (s.email) masterMapByEmail.set(s.email.toLowerCase().trim(), s);
    if (s.name) masterMapByName.set(s.name.toLowerCase().trim(), s);
    if (s.phone) masterMapByPhone.set(s.phone.replace(/\D/g, ''), s);
    if (s.sapId) masterMapBySap.set(s.sapId.trim(), s);
  });

  jsonData.forEach((row, idx) => {
    const rawEmail = emailKey ? String(row[emailKey]).trim() : '';
    const rawName = nameKey ? String(row[nameKey]).trim() : '';
    const rawPhone = phoneKey ? String(row[phoneKey]).trim() : '';
    const rawId = idKey ? String(row[idKey]).trim() : '';

    let matchedStudent: Student | undefined;
    let matchType: MatchedCandidate['matchType'] = 'EMAIL_MATCH';

    // 1. Primary Email Match
    if (rawEmail && masterMapByEmail.has(rawEmail.toLowerCase())) {
      matchedStudent = masterMapByEmail.get(rawEmail.toLowerCase());
      matchType = 'EMAIL_MATCH';
    }
    // 2. Candidate Name Match
    else if (rawName && masterMapByName.has(rawName.toLowerCase())) {
      matchedStudent = masterMapByName.get(rawName.toLowerCase());
      matchType = 'NAME_MATCH';
    }
    // 3. SAP ID / Applicant ID Match
    else if (rawId && masterMapBySap.has(rawId)) {
      matchedStudent = masterMapBySap.get(rawId);
      matchType = 'SAP_MATCH';
    }
    // 4. Phone Match
    else if (rawPhone && masterMapByPhone.has(rawPhone.replace(/\D/g, ''))) {
      matchedStudent = masterMapByPhone.get(rawPhone.replace(/\D/g, ''));
      matchType = 'PHONE_MATCH';
    }

    if (matchedStudent) {
      matchedStudents.push({
        student: matchedStudent,
        matchType,
        recruiterData: {
          applicantId: rawId || `APP-${idx + 100}`,
          candidateId: rawId,
          rawName: rawName || matchedStudent.name,
          rawEmail: rawEmail || matchedStudent.email,
          rawPhone: rawPhone || matchedStudent.phone,
        },
      });
    } else if (rawName || rawEmail || rawId) {
      unmatchedRows.push({
        applicantId: rawId || `REC-${Math.floor(Math.random() * 9000) + 1000}`,
        name: rawName || 'Recruiter Candidate',
        email: rawEmail || `candidate${idx}@recruiter.com`,
        phone: rawPhone || '+91 99999 00000',
        raw: row,
      });
    }
  });

  return {
    totalRows: jsonData.length,
    matchedStudents,
    unmatchedRows,
    headersFound,
  };
}

export function exportRosterExcel(
  companyName: string,
  roundName: string,
  roundStudents: RoundStudent[],
  type: 'STANDARD' | 'PANEL' | 'NO_SHOW' | 'RECRUITER' = 'STANDARD',
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  let filtered = [...roundStudents];

  if (type === 'NO_SHOW') {
    filtered = filtered.filter((s) => s.attendanceStatus === 'ABSENT' || s.attendanceStatus === 'PENDING');
  }

  const exportData = filtered.map((s, index) => {
    const base: any = {
      'S.No': index + 1,
      'SAP ID': s.sapId,
      Name: s.studentName,
      Branch: s.branch,
      Phone: s.phone,
    };

    if (type !== 'RECRUITER') {
      base['Email'] = s.email;
      base['Shortlist Status'] = s.shortlistStatus;
      base['Attendance'] = s.attendanceStatus;
      base['Attendance Time'] = s.attendanceTime || '--';
      base['Marked By'] = s.markedBy || '--';
    }

    return base;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `${roundName.slice(0, 20)} Roster`);

  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const fileName = `UPES_${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_Roster.${ext}`;
  XLSX.writeFile(workbook, fileName, { bookType: ext as any });
}
