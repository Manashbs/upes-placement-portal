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
  unmatchedRows: { applicantId: string; name: string; email: string; phone: string; branch: string; raw: any }[];
  headersFound: string[];
}

export function generateCandidateAttendanceLink(roundId: string, sapId: string, studentName?: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://upes-placement-portal.vercel.app';
  const nameParam = studentName ? `&n=${encodeURIComponent(studentName)}` : '';
  const tokenHash = Math.random().toString(36).substring(2, 12) + Math.random().toString(36).substring(2, 12);
  return `${origin}/#scan=${encodeURIComponent(roundId)}&t=${tokenHash}${nameParam}&r=${encodeURIComponent(sapId)}`;
}

export function parseShortlistExcel(
  fileData: ArrayBuffer,
  masterStudents: Student[]
): FuzzyParseResult {
  const workbook = XLSX.read(fileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) {
    return {
      totalRows: 0,
      matchedStudents: [],
      unmatchedRows: [],
      headersFound: [],
    };
  }

  // 1. Scan for Header Row dynamically across rows 0-10
  let headerRowIndex = 0;
  const idKeywords = ['sap', 'reg', 'applicant', 'candidate', 'roll', 'urn', 'id', 'no', 'code', 's.no', 'sn', 'sl'];
  const nameKeywords = ['name', 'candidate', 'applicant', 'student', 'full name', 'person'];
  const emailKeywords = ['email', 'mail', 'e-mail'];
  const phoneKeywords = ['phone', 'mobile', 'contact', 'cell', 'number'];
  const branchKeywords = ['branch', 'department', 'dept', 'stream', 'course', 'discipline', 'program', 'specialization'];

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const rowStr = rawRows[i].map((c) => String(c).toLowerCase()).join(' ');
    const hasName = nameKeywords.some((k) => rowStr.includes(k));
    const hasId = idKeywords.some((k) => rowStr.includes(k));
    const hasEmail = emailKeywords.some((k) => rowStr.includes(k));
    const hasBranch = branchKeywords.some((k) => rowStr.includes(k));

    if ((hasName && (hasId || hasEmail || hasBranch)) || (hasId && hasEmail)) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex].map((h) => String(h).trim());
  const headersFound = headerRow.filter(Boolean);

  // Helper to locate column index by header name keywords
  const findColIndex = (keywords: string[]) => {
    return headerRow.findIndex((h) => {
      const lower = h.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    });
  };

  const idCol = findColIndex(idKeywords);
  const nameCol = findColIndex(nameKeywords);
  const emailCol = findColIndex(emailKeywords);
  const phoneCol = findColIndex(phoneKeywords);
  const branchCol = findColIndex(branchKeywords);

  const matchedStudents: MatchedCandidate[] = [];
  const unmatchedRows: { applicantId: string; name: string; email: string; phone: string; branch: string; raw: any }[] = [];

  // Build Master DB Lookup Maps
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

  // 2. Extract Data Rows starting after headerRowIndex
  const dataRows = rawRows.slice(headerRowIndex + 1);

  dataRows.forEach((rowArray, idx) => {
    if (!rowArray || rowArray.every((cell) => String(cell).trim() === '')) return;

    // Extract exact cell values or fallback to column position
    const rawId = idCol >= 0 && rowArray[idCol] ? String(rowArray[idCol]).trim() : '';
    const rawName = nameCol >= 0 && rowArray[nameCol] ? String(rowArray[nameCol]).trim() : String(rowArray[0] || rowArray[1] || '').trim();
    const rawEmail = emailCol >= 0 && rowArray[emailCol] ? String(rowArray[emailCol]).trim() : '';
    const rawPhone = phoneCol >= 0 && rowArray[phoneCol] ? String(rowArray[phoneCol]).trim() : '';
    const rawBranch = branchCol >= 0 && rowArray[branchCol] ? String(rowArray[branchCol]).trim() : 'N/A';

    if (!rawName && !rawEmail && !rawId) return; // Skip invalid blank rows

    let matchedStudent: Student | undefined;
    let matchType: MatchedCandidate['matchType'] = 'EMAIL_MATCH';

    if (rawEmail && masterMapByEmail.has(rawEmail.toLowerCase())) {
      matchedStudent = masterMapByEmail.get(rawEmail.toLowerCase());
      matchType = 'EMAIL_MATCH';
    } else if (rawName && masterMapByName.has(rawName.toLowerCase())) {
      matchedStudent = masterMapByName.get(rawName.toLowerCase());
      matchType = 'NAME_MATCH';
    } else if (rawId && masterMapBySap.has(rawId)) {
      matchedStudent = masterMapBySap.get(rawId);
      matchType = 'SAP_MATCH';
    } else if (rawPhone && masterMapByPhone.has(rawPhone.replace(/\D/g, ''))) {
      matchedStudent = masterMapByPhone.get(rawPhone.replace(/\D/g, ''));
      matchType = 'PHONE_MATCH';
    }

    if (matchedStudent) {
      matchedStudents.push({
        student: matchedStudent,
        matchType,
        recruiterData: {
          applicantId: rawId || matchedStudent.sapId,
          candidateId: rawId,
          rawName: rawName || matchedStudent.name,
          rawEmail: rawEmail || matchedStudent.email,
          rawPhone: rawPhone || matchedStudent.phone,
        },
      });
    } else {
      // Use exact values from Excel row. NEVER generate fake dummy names or fake SAP IDs!
      const candidateId = rawId || `REG-2026-${String(idx + 1).padStart(3, '0')}`;
      unmatchedRows.push({
        applicantId: candidateId,
        name: rawName || `Candidate ${idx + 1}`,
        email: rawEmail || `${candidateId.toLowerCase()}@upes.ac.in`,
        phone: rawPhone || 'N/A',
        branch: rawBranch || 'N/A',
        raw: rowArray,
      });
    }
  });

  return {
    totalRows: dataRows.filter((r) => r && r.some((c: any) => String(c).trim() !== '')).length,
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
      'SAP / Candidate ID': s.sapId,
      'Student Name': s.studentName,
      'Branch': s.branch,
      'Phone': s.phone,
    };

    if (type !== 'RECRUITER') {
      base['Email'] = s.email;
      base['Shortlist Status'] = s.shortlistStatus;
      base['Attendance Link'] = generateCandidateAttendanceLink(s.roundId, s.sapId, s.studentName);
      base['Attendance Status'] = s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'MANUALLY_MARKED' ? 'PRESENT' : 'ABSENT';
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

export function exportAnnotatedAttendanceExcel(
  companyName: string,
  roundName: string,
  roundId: string,
  roundStudents: RoundStudent[],
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  const exportData = roundStudents.map((s, index) => {
    return {
      'S.No': index + 1,
      'SAP / Reg ID': s.sapId,
      'Student Name': s.studentName,
      'Branch / Department': s.branch,
      'Email': s.email,
      'Phone': s.phone,
      'Attendance Link': generateCandidateAttendanceLink(roundId, s.sapId, s.studentName),
      'Attendance Status': s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'MANUALLY_MARKED' ? 'PRESENT' : 'ABSENT',
      'Attendance Marked Time': s.attendanceTime || '--',
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Attendance Report`);

  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const fileName = `UPES_${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_Attendance_Report.${ext}`;
  XLSX.writeFile(workbook, fileName, { bookType: ext as any });
}
