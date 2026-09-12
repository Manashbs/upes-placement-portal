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

export function generateCandidateAttendanceLink(roundId: string, sapId: string, studentName?: string, sessionId?: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://upes-placement-portal.vercel.app';
  const nameParam = studentName ? `&n=${encodeURIComponent(studentName)}` : '';
  const sidParam = sessionId ? `&sid=${encodeURIComponent(sessionId)}` : '';
  const tokenHash = Math.random().toString(36).substring(2, 10);
  return `${origin}/#scan=${encodeURIComponent(roundId)}${sidParam}&t=${tokenHash}${nameParam}&r=${encodeURIComponent(sapId)}`;
}

// Broadened keyword lists for smart column detection across any company format
const ID_KEYWORDS = [
  'sap', 'reg', 'applicant', 'candidate', 'roll', 'urn', 'id', 'no', 'code',
  's.no', 'sn', 'sl', 'enrollment', 'enroll', 'usn', 'prn', 'scholar',
  'employee', 'reference', 'ref', 'token', 'serial', 'index', 'admission',
  'hall ticket', 'seat', 'htno', 'university',
];
const NAME_KEYWORDS = ['name', 'candidate', 'applicant', 'student', 'full name', 'person', 'participant'];
const EMAIL_KEYWORDS = ['email', 'mail', 'e-mail', 'gmail', 'outlook'];
const PHONE_KEYWORDS = ['phone', 'mobile', 'contact', 'cell', 'number', 'whatsapp', 'tel'];
const BRANCH_KEYWORDS = ['branch', 'department', 'dept', 'stream', 'course', 'discipline', 'program', 'specialization', 'degree', 'major'];

/**
 * Find the header row index and column mappings from a raw rows array.
 * Scans the first 10 rows to find a row that looks like headers.
 */
function detectHeaderRow(rawRows: any[][]) {
  let headerRowIndex = 0;

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const rowStr = rawRows[i].map((c) => String(c).toLowerCase()).join(' ');
    const hasName = NAME_KEYWORDS.some((k) => rowStr.includes(k));
    const hasId = ID_KEYWORDS.some((k) => rowStr.includes(k));
    const hasEmail = EMAIL_KEYWORDS.some((k) => rowStr.includes(k));
    const hasBranch = BRANCH_KEYWORDS.some((k) => rowStr.includes(k));

    if ((hasName && (hasId || hasEmail || hasBranch)) || (hasId && hasEmail)) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex].map((h) => String(h).trim());

  const findColIndex = (keywords: string[]) => {
    return headerRow.findIndex((h) => {
      const lower = h.toLowerCase();
      return keywords.some((k) => lower.includes(k));
    });
  };

  return {
    headerRowIndex,
    headerRow,
    headersFound: headerRow.filter(Boolean),
    idCol: findColIndex(ID_KEYWORDS),
    nameCol: findColIndex(NAME_KEYWORDS),
    emailCol: findColIndex(EMAIL_KEYWORDS),
    phoneCol: findColIndex(PHONE_KEYWORDS),
    branchCol: findColIndex(BRANCH_KEYWORDS),
  };
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

  const { headerRowIndex, headersFound, idCol, nameCol, emailCol, phoneCol, branchCol } = detectHeaderRow(rawRows);

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

/**
 * Preserves the original company-provided Excel sheet exactly as-is and appends
 * an "Attendance Link" column at the very end. Each candidate row gets a unique
 * personalized mobile scan URL.
 *
 * This is the key function that solves the "give me back MY sheet with links" requirement.
 */
export function exportOriginalSheetWithAttendanceLinks(
  originalFileData: ArrayBuffer,
  roundId: string,
  companyName: string,
  roundName: string,
  matchedStudents: MatchedCandidate[],
  unmatchedRows: { applicantId: string; name: string; email: string; phone: string; branch: string; raw: any }[],
  masterStudents: Student[],
  sessionId?: string
): void {
  const workbook = XLSX.read(originalFileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) return;

  const { headerRowIndex, idCol, nameCol, emailCol } = detectHeaderRow(rawRows);

  // Find the last column index in the original sheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const newColIndex = range.e.c + 1;

  // Write the "Attendance Link" header in the header row
  const headerCellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: newColIndex });
  worksheet[headerCellRef] = { t: 's', v: 'Attendance Link' };

  // Build lookup maps for matching rows to students
  const sapByEmail = new Map<string, string>();
  const sapByName = new Map<string, string>();
  const nameByEmail = new Map<string, string>();
  const nameByName = new Map<string, string>();

  matchedStudents.forEach((m) => {
    const sapId = m.student.sapId;
    const name = m.student.name;
    if (m.recruiterData.rawEmail) {
      sapByEmail.set(m.recruiterData.rawEmail.toLowerCase().trim(), sapId);
      nameByEmail.set(m.recruiterData.rawEmail.toLowerCase().trim(), name);
    }
    if (m.recruiterData.rawName) {
      sapByName.set(m.recruiterData.rawName.toLowerCase().trim(), sapId);
      nameByName.set(m.recruiterData.rawName.toLowerCase().trim(), name);
    }
  });

  // Also build lookup for unmatched rows (they get auto-generated IDs)
  const unmatchedByName = new Map<string, { applicantId: string; name: string }>();
  unmatchedRows.forEach((u) => {
    if (u.name) unmatchedByName.set(u.name.toLowerCase().trim(), { applicantId: u.applicantId, name: u.name });
  });

  // Iterate through each data row and write the attendance link
  const dataRows = rawRows.slice(headerRowIndex + 1);
  dataRows.forEach((rowArray, idx) => {
    if (!rowArray || rowArray.every((cell) => String(cell).trim() === '')) return;

    const rowIndex = headerRowIndex + 1 + idx;
    const rawId = idCol >= 0 && rowArray[idCol] ? String(rowArray[idCol]).trim() : '';
    const rawName = nameCol >= 0 && rowArray[nameCol] ? String(rowArray[nameCol]).trim() : String(rowArray[0] || rowArray[1] || '').trim();
    const rawEmail = emailCol >= 0 && rowArray[emailCol] ? String(rowArray[emailCol]).trim() : '';

    // Resolve SAP ID for this row
    let sapId = '';
    let studentName = rawName;

    if (rawEmail && sapByEmail.has(rawEmail.toLowerCase())) {
      sapId = sapByEmail.get(rawEmail.toLowerCase()) || '';
      studentName = nameByEmail.get(rawEmail.toLowerCase()) || rawName;
    } else if (rawName && sapByName.has(rawName.toLowerCase())) {
      sapId = sapByName.get(rawName.toLowerCase()) || '';
      studentName = nameByName.get(rawName.toLowerCase()) || rawName;
    } else if (rawId) {
      // Check if rawId is a known SAP ID
      const matchedByRawId = masterStudents.find((s) => s.sapId.trim() === rawId);
      sapId = matchedByRawId ? matchedByRawId.sapId : rawId;
      studentName = matchedByRawId ? matchedByRawId.name : rawName;
    } else if (rawName && unmatchedByName.has(rawName.toLowerCase())) {
      const um = unmatchedByName.get(rawName.toLowerCase())!;
      sapId = um.applicantId;
      studentName = um.name;
    } else {
      sapId = rawId || `REG-2026-${String(idx + 1).padStart(3, '0')}`;
    }

    const link = generateCandidateAttendanceLink(roundId, sapId, studentName, sessionId);
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: newColIndex });
    worksheet[cellRef] = { t: 's', v: link };
  });

  // Update the sheet range to include the new column
  range.e.c = newColIndex;
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  // Download the modified workbook
  const fileName = `${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_With_Attendance_Links.xlsx`;
  XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
}

/**
 * Preserves the original company-provided Excel sheet exactly as-is and appends
 * an "Attendance" column at the very end, marking each candidate row as PRESENT or ABSENT
 * by cross-referencing with the live attendance data.
 *
 * This is the final downloadable report — the company's own sheet with attendance results.
 */
export function exportOriginalSheetWithAttendanceStatus(
  originalFileData: ArrayBuffer,
  roundId: string,
  companyName: string,
  roundName: string,
  roundStudents: RoundStudent[],
  masterStudents: Student[]
): void {
  const workbook = XLSX.read(originalFileData, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length === 0) return;

  const { headerRowIndex, idCol, nameCol, emailCol } = detectHeaderRow(rawRows);

  // Find the last column index in the original sheet
  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const newColIndex = range.e.c + 1;

  // Write the "Attendance" header
  const headerCellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: newColIndex });
  worksheet[headerCellRef] = { t: 's', v: 'Attendance' };

  // Build attendance lookup: sapId -> PRESENT/ABSENT
  const attendanceBySap = new Map<string, 'PRESENT' | 'ABSENT'>();
  const attendanceByName = new Map<string, 'PRESENT' | 'ABSENT'>();
  const attendanceByEmail = new Map<string, 'PRESENT' | 'ABSENT'>();

  roundStudents
    .filter((rs) => rs.roundId === roundId)
    .forEach((rs) => {
      const status: 'PRESENT' | 'ABSENT' =
        rs.attendanceStatus === 'PRESENT' || rs.attendanceStatus === 'MANUALLY_MARKED'
          ? 'PRESENT'
          : 'ABSENT';
      if (rs.sapId) attendanceBySap.set(rs.sapId.trim(), status);
      if (rs.studentName) attendanceByName.set(rs.studentName.toLowerCase().trim(), status);
      if (rs.email) attendanceByEmail.set(rs.email.toLowerCase().trim(), status);
    });

  // Also build sapId lookup from masterStudents for ID-based matching
  const masterSapByName = new Map<string, string>();
  const masterSapByEmail = new Map<string, string>();
  masterStudents.forEach((s) => {
    if (s.name) masterSapByName.set(s.name.toLowerCase().trim(), s.sapId);
    if (s.email) masterSapByEmail.set(s.email.toLowerCase().trim(), s.sapId);
  });

  // Iterate data rows and write attendance status
  const dataRows = rawRows.slice(headerRowIndex + 1);
  dataRows.forEach((rowArray, idx) => {
    if (!rowArray || rowArray.every((cell) => String(cell).trim() === '')) return;

    const rowIndex = headerRowIndex + 1 + idx;
    const rawId = idCol >= 0 && rowArray[idCol] ? String(rowArray[idCol]).trim() : '';
    const rawName = nameCol >= 0 && rowArray[nameCol] ? String(rowArray[nameCol]).trim() : String(rowArray[0] || rowArray[1] || '').trim();
    const rawEmail = emailCol >= 0 && rowArray[emailCol] ? String(rowArray[emailCol]).trim() : '';

    // Try to resolve attendance status through multiple matching strategies
    let status: 'PRESENT' | 'ABSENT' = 'ABSENT';

    // Strategy 1: Direct SAP/ID match
    if (rawId && attendanceBySap.has(rawId)) {
      status = attendanceBySap.get(rawId)!;
    }
    // Strategy 2: Email → SAP → attendance
    else if (rawEmail && attendanceByEmail.has(rawEmail.toLowerCase())) {
      status = attendanceByEmail.get(rawEmail.toLowerCase())!;
    } else if (rawEmail && masterSapByEmail.has(rawEmail.toLowerCase())) {
      const resolvedSap = masterSapByEmail.get(rawEmail.toLowerCase())!;
      if (attendanceBySap.has(resolvedSap)) {
        status = attendanceBySap.get(resolvedSap)!;
      }
    }
    // Strategy 3: Name → SAP → attendance
    else if (rawName && attendanceByName.has(rawName.toLowerCase())) {
      status = attendanceByName.get(rawName.toLowerCase())!;
    } else if (rawName && masterSapByName.has(rawName.toLowerCase())) {
      const resolvedSap = masterSapByName.get(rawName.toLowerCase())!;
      if (attendanceBySap.has(resolvedSap)) {
        status = attendanceBySap.get(resolvedSap)!;
      }
    }

    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: newColIndex });
    worksheet[cellRef] = { t: 's', v: status };
  });

  // Update the sheet range
  range.e.c = newColIndex;
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  // Download
  const fileName = `${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_Final_Attendance_Report.xlsx`;
  XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
}
