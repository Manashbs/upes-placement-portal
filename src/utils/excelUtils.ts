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
  rawRows?: any[][];
  headerRow?: string[];
  headerRowIndex?: number;
}

export function generateCandidateAttendanceLink(roundId: string, sapId: string, studentName?: string, sessionId?: string): string {
  const origin = typeof window !== 'undefined' && window.location.origin ? window.location.origin : 'https://upes-placement-portal.vercel.app';
  const nameParam = studentName ? `&n=${encodeURIComponent(studentName)}` : '';
  const sidParam = sessionId ? `&sid=${encodeURIComponent(sessionId)}` : '';
  const tokenHash = Math.random().toString(36).substring(2, 10);
  return `${origin}/#scan=${encodeURIComponent(roundId)}${sidParam}&t=${tokenHash}${nameParam}&r=${encodeURIComponent(sapId)}`;
}

// Dedicated keyword groups for high-accuracy column detection
const SERIAL_KEYWORDS = [
  's.no', 'sr.no', 'sl.no', 's no', 'sr no', 'sl no', 's_no', 'sr_no', 'sl_no',
  'serial', 's. no', 'sr. no', 'sl. no', 'seq', 's/no', 'sl/no', 'sr/no', 's.no.', 'sr.no.',
  'row', 'index', '#'
];

const SAP_EXACT_KEYWORDS = [
  'sap id', 'sap_id', 'sap no', 'sapno', 'sap number', 'sap_no', 'sapid', 'sap', 'system id', 'system_id'
];

const ROLL_OR_REG_KEYWORDS = [
  'roll no', 'roll_no', 'roll number', 'rollno', 'roll', 'registration no', 'registration number',
  'reg no', 'reg_no', 'urn', 'enrollment no', 'enrollment number', 'enrollment',
  'enroll', 'usn', 'prn', 'student id', 'student_id', 'scholar id', 'admission no'
];

const CANDIDATE_ID_KEYWORDS = [
  'applicant id', 'applicant_id', 'candidate id', 'candidate_id', 'application no', 'application id',
  'app id', 'app_id', 'ref no', 'reference no'
];

const NAME_KEYWORDS = ['name of the student', 'name of student', 'candidate name', 'student name', 'full name', 'name', 'person', 'participant'];
const EMAIL_KEYWORDS = ['email', 'mail', 'e-mail', 'gmail', 'outlook'];
const PHONE_KEYWORDS = ['phone', 'mobile', 'contact', 'cell', 'number', 'whatsapp', 'tel'];
const BRANCH_KEYWORDS = ['job profile', 'profile', 'role', 'designation', 'position', 'branch', 'department', 'dept', 'stream', 'course', 'discipline', 'program', 'specialization', 'degree', 'major'];

/**
 * Find the header row index and column mappings from a raw rows array.
 * Scans the first 10 rows to find a row that looks like headers.
 */
function detectHeaderRow(rawRows: any[][]) {
  let headerRowIndex = 0;

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const rowStr = rawRows[i].map((c) => String(c).toLowerCase()).join(' ');
    const hasName = NAME_KEYWORDS.some((k) => rowStr.includes(k));
    const hasId = SAP_EXACT_KEYWORDS.some((k) => rowStr.includes(k)) || ROLL_OR_REG_KEYWORDS.some((k) => rowStr.includes(k));
    const hasEmail = EMAIL_KEYWORDS.some((k) => rowStr.includes(k));
    const hasBranch = BRANCH_KEYWORDS.some((k) => rowStr.includes(k));

    if ((hasName && (hasId || hasEmail || hasBranch)) || (hasId && hasEmail)) {
      headerRowIndex = i;
      break;
    }
  }

  const headerRow = rawRows[headerRowIndex].map((h) => String(h).trim());

  const isSerialCol = (headerStr: string) => {
    const lower = headerStr.toLowerCase().trim();
    if (lower === 'no' || lower === 'no.' || lower === '#') return true;
    return SERIAL_KEYWORDS.some((sk) => lower === sk || lower.startsWith(sk + ' ') || lower.startsWith(sk + '.'));
  };

  const findIdColIndex = (): number => {
    // 1. Search for explicit SAP ID first (highest priority)
    const sapIdx = headerRow.findIndex((h) => {
      const lower = h.toLowerCase().trim();
      return SAP_EXACT_KEYWORDS.some((k) => lower === k || lower.includes(k));
    });
    if (sapIdx !== -1) return sapIdx;

    // 2. Search for Roll / Registration / Enrollment / Student ID (excluding serial columns)
    const rollIdx = headerRow.findIndex((h) => {
      if (isSerialCol(h)) return false;
      const lower = h.toLowerCase().trim();
      return ROLL_OR_REG_KEYWORDS.some((k) => lower === k || lower.includes(k));
    });
    if (rollIdx !== -1) return rollIdx;

    // 3. Search for Candidate / Applicant ID (excluding serial columns)
    const candIdx = headerRow.findIndex((h) => {
      if (isSerialCol(h)) return false;
      const lower = h.toLowerCase().trim();
      return CANDIDATE_ID_KEYWORDS.some((k) => lower === k || lower.includes(k));
    });
    if (candIdx !== -1) return candIdx;

    // 4. Data inspection: look for column with 7-11 digits (e.g. 5000xxxxx or 500123178)
    for (let c = 0; c < headerRow.length; c++) {
      if (isSerialCol(headerRow[c])) continue;
      let sapLikeCount = 0;
      for (let r = headerRowIndex + 1; r < Math.min(headerRowIndex + 10, rawRows.length); r++) {
        const val = String(rawRows[r]?.[c] || '').trim();
        if (/^\d{7,11}$/.test(val) || /^500\d{6,8}$/.test(val)) {
          sapLikeCount++;
        }
      }
      if (sapLikeCount >= 2) return c;
    }

    // 5. Generic ID/Code fallback (excluding serial columns)
    const genIdx = headerRow.findIndex((h) => {
      if (isSerialCol(h)) return false;
      const lower = h.toLowerCase().trim();
      return lower.includes('id') || lower.includes('code');
    });
    if (genIdx !== -1) return genIdx;

    // 6. If nothing is matching, use S.No as the fallback candidate identifier
    const sNoIdx = headerRow.findIndex((h) => isSerialCol(h));
    if (sNoIdx !== -1) return sNoIdx;

    return -1;
  };

  const findNameColIndex = (): number => {
    return headerRow.findIndex((h) => {
      const lower = h.toLowerCase().trim();
      if (lower.includes('company') || lower.includes('college') || lower.includes('university')) return false;
      return NAME_KEYWORDS.some((k) => lower === k || lower.includes(k));
    });
  };

  const findColIndex = (keywords: string[]) => {
    return headerRow.findIndex((h) => {
      const lower = h.toLowerCase().trim();
      return keywords.some((k) => lower === k || lower.includes(k));
    });
  };

  return {
    headerRowIndex,
    headerRow,
    headersFound: headerRow.filter(Boolean),
    idCol: findIdColIndex(),
    nameCol: findNameColIndex(),
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
      rawRows: [],
      headerRow: [],
      headerRowIndex: 0,
    };
  }

  const { headerRowIndex, headerRow, headersFound, idCol, nameCol, emailCol, phoneCol, branchCol } = detectHeaderRow(rawRows);

  const matchedStudents: MatchedCandidate[] = [];
  const unmatchedRows: { applicantId: string; name: string; email: string; phone: string; branch: string; raw: any }[] = [];

  // Build Master DB Lookup Maps for enriching existing data
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

    // 1. Extract rawId directly from the detected column
    let rawId = idCol >= 0 && rowArray[idCol] !== undefined && rowArray[idCol] !== null ? String(rowArray[idCol]).trim() : '';

    // Safeguard: If another cell in the row contains a 7-11 digit SAP number (e.g. 500123178), prioritize it!
    for (let c = 0; c < rowArray.length; c++) {
      if (c === idCol) continue;
      const cellVal = String(rowArray[c] || '').trim();
      if (/^\d{7,11}$/.test(cellVal) || /^500\d{6,8}$/.test(cellVal)) {
        rawId = cellVal;
        break;
      }
    }

    // If rawId is still empty but rawEmail has a SAP ID (e.g. 500012345@stu.upes.ac.in)
    if (!rawId && emailCol >= 0 && rowArray[emailCol]) {
      const emailVal = String(rowArray[emailCol]).trim();
      const emailSapMatch = emailVal.match(/(500\d{6,8}|\d{7,10})/);
      if (emailSapMatch) {
        rawId = emailSapMatch[1];
      }
    }

    // Fallback: If nothing matched, use S.No or row number
    if (!rawId) {
      rawId = String(idx + 1);
    }

    // 2. Extract Candidate Name
    let rawName = nameCol >= 0 && rowArray[nameCol] !== undefined ? String(rowArray[nameCol]).trim() : '';
    if (!rawName) {
      // Find first text cell that is not numeric or email
      for (let c = 0; c < rowArray.length; c++) {
        if (c === idCol) continue;
        const val = String(rowArray[c] || '').trim();
        if (val && !/^\d+$/.test(val) && !val.includes('@') && val.length > 2) {
          rawName = val;
          break;
        }
      }
    }
    if (!rawName) rawName = `Candidate ${rawId}`;

    const rawEmail = emailCol >= 0 && rowArray[emailCol] ? String(rowArray[emailCol]).trim() : '';
    const rawPhone = phoneCol >= 0 && rowArray[phoneCol] ? String(rowArray[phoneCol]).trim() : '';
    const rawBranch = branchCol >= 0 && rowArray[branchCol] ? String(rowArray[branchCol]).trim() : 'N/A';

    if (!rawName && !rawEmail && !rawId) return; // Skip invalid blank rows

    // CRITICAL: NEVER overwrite rawId from the uploaded sheet with a mock student's SAP ID!
    // The sheet data is the source of truth for the drive.
    let existingStudent: Student | undefined;
    if (masterMapBySap.has(rawId)) {
      existingStudent = masterMapBySap.get(rawId);
    } else if (rawEmail && masterMapByEmail.has(rawEmail.toLowerCase())) {
      existingStudent = masterMapByEmail.get(rawEmail.toLowerCase());
    } else if (rawName && masterMapByName.has(rawName.toLowerCase())) {
      existingStudent = masterMapByName.get(rawName.toLowerCase());
    }

    const candidateStudent: Student = {
      id: existingStudent?.id || `st-sheet-${rawId}-${Date.now()}-${idx}`,
      sapId: rawId, // ALWAYS use the exact SAP ID / ID from the sheet!
      name: rawName || existingStudent?.name || `Candidate ${rawId}`,
      email: rawEmail || existingStudent?.email || `${rawId.toLowerCase()}@stu.upes.ac.in`,
      phone: rawPhone || existingStudent?.phone || 'N/A',
      branch: rawBranch !== 'N/A' ? rawBranch : (existingStudent?.branch || 'N/A'),
      batchYear: existingStudent?.batchYear || 2026,
      cgpa: existingStudent?.cgpa || 8.0,
      activeBacklogs: existingStudent?.activeBacklogs || 0,
      historicalBacklogs: existingStudent?.historicalBacklogs || 0,
      tenthPercent: existingStudent?.tenthPercent || 85.0,
      twelfthPercent: existingStudent?.twelfthPercent || 85.0,
      status: 'ELIGIBLE',
    };

    matchedStudents.push({
      student: candidateStudent,
      matchType: existingStudent ? 'SAP_MATCH' : 'AUTO_REGISTERED',
      recruiterData: {
        applicantId: rawId,
        candidateId: rawId,
        rawName,
        rawEmail: candidateStudent.email,
        rawPhone: candidateStudent.phone,
      },
    });
  });

  return {
    totalRows: dataRows.filter((r) => r && r.some((c: any) => String(c).trim() !== '')).length,
    matchedStudents,
    unmatchedRows,
    headersFound,
    rawRows,
    headerRow,
    headerRowIndex,
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
 * "Attendance Status" and "Attendance Marked Time" columns at the very end.
 *
 * It returns the exact sheet uploaded by the recruiter, supporting both .xlsx and .csv!
 */
export function exportExactSheetWithAttendance(
  roundId: string,
  companyName: string,
  roundName: string,
  roundStudents: RoundStudent[],
  masterStudents: Student[],
  format: 'xlsx' | 'csv' = 'xlsx',
  originalBuffer?: ArrayBuffer,
  originalMeta?: { headers: string[]; rows: any[][] }
): void {
  // Build attendance lookup:
  // sapId -> { status, time }
  // name -> { status, time }
  const attendanceMapBySap = new Map<string, { status: string; time: string }>();
  const attendanceMapByName = new Map<string, { status: string; time: string }>();

  roundStudents
    .filter((rs) => rs.roundId === roundId)
    .forEach((rs) => {
      const isPresent = rs.attendanceStatus === 'PRESENT' || rs.attendanceStatus === 'MANUALLY_MARKED';
      const status = isPresent ? 'PRESENT' : 'ABSENT';
      const time = isPresent ? (rs.attendanceTime || 'Recorded') : '--';
      if (rs.sapId) attendanceMapBySap.set(String(rs.sapId).trim(), { status, time });
      if (rs.studentName) attendanceMapByName.set(String(rs.studentName).toLowerCase().trim(), { status, time });
    });

  // 1. If originalBuffer is provided, parse and modify the actual workbook
  if (originalBuffer) {
    try {
      const workbook = XLSX.read(originalBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawRows && rawRows.length > 0) {
        const { headerRowIndex, idCol, nameCol } = detectHeaderRow(rawRows);

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const statusColIndex = range.e.c + 1;
        const timeColIndex = range.e.c + 2;

        // Write headers at the end of the original sheet
        const statusHeaderRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: statusColIndex });
        const timeHeaderRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: timeColIndex });
        worksheet[statusHeaderRef] = { t: 's', v: 'Attendance Status' };
        worksheet[timeHeaderRef] = { t: 's', v: 'Attendance Marked Time' };

        // Write row attendance
        for (let idx = 0; idx < rawRows.length - (headerRowIndex + 1); idx++) {
          const rowIndex = headerRowIndex + 1 + idx;
          const rowArray = rawRows[rowIndex];
          if (!rowArray || rowArray.every((c) => String(c).trim() === '')) continue;

          const rawId = idCol >= 0 && rowArray[idCol] !== undefined ? String(rowArray[idCol]).trim() : '';
          const rawName = nameCol >= 0 && rowArray[nameCol] !== undefined ? String(rowArray[nameCol]).trim() : '';

          let res: { status: string; time: string } = { status: 'ABSENT', time: '--' };

          if (rawId && attendanceMapBySap.has(rawId)) {
            res = attendanceMapBySap.get(rawId)!;
          } else if (rawName && attendanceMapByName.has(rawName.toLowerCase())) {
            res = attendanceMapByName.get(rawName.toLowerCase())!;
          }

          const cellStatusRef = XLSX.utils.encode_cell({ r: rowIndex, c: statusColIndex });
          const cellTimeRef = XLSX.utils.encode_cell({ r: rowIndex, c: timeColIndex });
          worksheet[cellStatusRef] = { t: 's', v: res.status };
          worksheet[cellTimeRef] = { t: 's', v: res.time };
        }

        range.e.c = timeColIndex;
        worksheet['!ref'] = XLSX.utils.encode_range(range);

        const ext = format === 'csv' ? 'csv' : 'xlsx';
        const fileName = `${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_Attendance_Report.${ext}`;
        XLSX.writeFile(workbook, fileName, { bookType: ext as any });
        return;
      }
    } catch (e) {
      console.warn('Error reading originalBuffer with XLSX:', e);
    }
  }

  // 2. If originalMeta (headers & rows) is available
  if (originalMeta && originalMeta.headers && originalMeta.rows) {
    const headers = [...originalMeta.headers, 'Attendance Status', 'Attendance Marked Time'];
    const rows = originalMeta.rows.map((rowArray) => {
      const rawId = String(rowArray[1] || rowArray[0] || '').trim();
      const rawName = String(rowArray[2] || rowArray[1] || '').trim();

      let res: { status: string; time: string } = { status: 'ABSENT', time: '--' };
      if (rawId && attendanceMapBySap.has(rawId)) {
        res = attendanceMapBySap.get(rawId)!;
      } else if (rawName && attendanceMapByName.has(rawName.toLowerCase())) {
        res = attendanceMapByName.get(rawName.toLowerCase())!;
      }

      return [...rowArray, res.status, res.time];
    });

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Report');
    const ext = format === 'csv' ? 'csv' : 'xlsx';
    const fileName = `${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_Attendance_Report.${ext}`;
    XLSX.writeFile(workbook, fileName, { bookType: ext as any });
    return;
  }

  // 3. Fallback: If no original sheet ever existed
  const currentStudents = roundStudents.filter((rs) => rs.roundId === roundId);
  exportAnnotatedAttendanceExcel(companyName, roundName, roundId, currentStudents, format);
}

export const exportOriginalSheetWithAttendanceStatus = exportExactSheetWithAttendance;

