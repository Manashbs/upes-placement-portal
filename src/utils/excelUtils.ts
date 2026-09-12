import * as XLSX from 'xlsx';
import { RoundStudent, Student } from '../types';
import { getSheetBufferSync, getSheetMetaSync, saveSheetToStorage } from './sheetStorage';

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
  'reference_id', 'reference id', 'reference no', 'ref id', 'ref_id', 'ref no', 'ref. no',
  'applicant id', 'applicant_id', 'candidate id', 'candidate_id', 'application no', 'application id',
  'app id', 'app_id'
];

const NAME_KEYWORDS = ['name of the student', 'name of student', 'candidate name', 'student name', 'full name', 'name', 'person', 'participant'];
const EMAIL_KEYWORDS = ['email id', 'email_id', 'email', 'mail', 'e-mail', 'gmail', 'outlook'];
const PHONE_KEYWORDS = ['phone', 'mobile', 'contact', 'cell', 'number', 'whatsapp', 'tel'];
const BRANCH_KEYWORDS = ['qualification', 'degree', 'job profile', 'profile', 'role', 'designation', 'position', 'branch', 'department', 'dept', 'stream', 'course', 'discipline', 'program', 'specialization', 'major'];

/**
 * Find the header row index and column mappings from a raw rows array.
 * Scans the first 10 rows to find a row that looks like headers.
 */
function detectHeaderRow(rawRows: any[][]) {
  let headerRowIndex = 0;

  for (let i = 0; i < Math.min(10, rawRows.length); i++) {
    const rowStr = rawRows[i].map((c) => String(c).toLowerCase()).join(' ');
    const hasName = NAME_KEYWORDS.some((k) => rowStr.includes(k));
    const hasId = SAP_EXACT_KEYWORDS.some((k) => rowStr.includes(k)) ||
                  ROLL_OR_REG_KEYWORDS.some((k) => rowStr.includes(k)) ||
                  CANDIDATE_ID_KEYWORDS.some((k) => rowStr.includes(k));
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

    // 3. Search for Candidate / Reference / Applicant ID (excluding serial columns)
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
      if (lower.includes('company') || lower.includes('college') || lower.includes('university') || lower.includes('institute')) return false;
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

  // 2. Extract Data Rows starting after headerRowIndex
  const dataRows = rawRows.slice(headerRowIndex + 1);

  dataRows.forEach((rowArray, idx) => {
    if (!rowArray || rowArray.every((cell) => String(cell).trim() === '')) return;

    // 1. Extract rawId directly from the detected column
    let rawId = idCol >= 0 && rowArray[idCol] !== undefined && rowArray[idCol] !== null ? String(rowArray[idCol]).trim() : '';

    // If idCol didn't find anything, search other cells for a 7-11 digit SAP number
    if (!rawId) {
      for (let c = 0; c < rowArray.length; c++) {
        const cellVal = String(rowArray[c] || '').trim();
        if (/^\d{7,11}$/.test(cellVal) || /^500\d{6,8}$/.test(cellVal)) {
          rawId = cellVal;
          break;
        }
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

    // CRITICAL: ALWAYS preserve the exact SAP ID / Roll number from the sheet!
    const candidateStudent: Student = {
      id: `st-sheet-${rawId}-${Date.now()}-${idx}`,
      sapId: rawId, // Exact SAP ID / Roll number from the sheet
      name: rawName,
      email: rawEmail || `${rawId.toLowerCase()}@stu.upes.ac.in`,
      phone: rawPhone || 'N/A',
      branch: rawBranch,
      batchYear: 2026,
      cgpa: 8.0,
      activeBacklogs: 0,
      historicalBacklogs: 0,
      tenthPercent: 85.0,
      twelfthPercent: 85.0,
      status: 'ELIGIBLE',
    };

    matchedStudents.push({
      student: candidateStudent,
      matchType: 'AUTO_REGISTERED',
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
  format: 'xlsx' | 'csv' = 'xlsx',
  roundId?: string
) {
  // Delegate to exportExactSheetWithAttendance to maintain exact sheet preservation
  if (roundId) {
    exportExactSheetWithAttendance(roundId, companyName, roundName, roundStudents, [], format);
    return;
  }

  let filtered = [...roundStudents];
  if (type === 'NO_SHOW') {
    filtered = filtered.filter((s) => s.attendanceStatus === 'ABSENT' || s.attendanceStatus === 'PENDING');
  }

  const exportData = filtered.map((s, index) => {
    const base: any = {
      'S.No': index + 1,
      'SAP ID': s.sapId,
      'Candidate Name': s.studentName,
      'Branch': s.branch,
      'Email': s.email,
      'Attendance Status': s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'MANUALLY_MARKED' ? 'PRESENT' : 'ABSENT',
      'Attendance Marked Time': s.attendanceTime || '--',
    };
    return base;
  });

  const worksheet = XLSX.utils.json_to_sheet(exportData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Roster`);

  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const fileName = `${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_Roster.${ext}`;
  XLSX.writeFile(workbook, fileName, { bookType: ext as any });
}

/**
 * Preserves the original company-provided Excel sheet exactly as-is and appends
 * an "Attendance Link" column at the very end. Each candidate row gets a unique
 * personalized mobile scan URL.
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

  const { headerRowIndex, idCol, nameCol } = detectHeaderRow(rawRows);

  const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
  const newColIndex = range.e.c + 1;

  const headerCellRef = XLSX.utils.encode_cell({ r: headerRowIndex, c: newColIndex });
  worksheet[headerCellRef] = { t: 's', v: 'Attendance Link' };

  const dataRows = rawRows.slice(headerRowIndex + 1);
  dataRows.forEach((rowArray, idx) => {
    if (!rowArray || rowArray.every((cell) => String(cell).trim() === '')) return;

    const rowIndex = headerRowIndex + 1 + idx;
    const rawId = idCol >= 0 && rowArray[idCol] ? String(rowArray[idCol]).trim() : String(idx + 1);
    const rawName = nameCol >= 0 && rowArray[nameCol] ? String(rowArray[nameCol]).trim() : `Candidate ${rawId}`;

    const link = generateCandidateAttendanceLink(roundId, rawId, rawName, sessionId);
    const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: newColIndex });
    worksheet[cellRef] = { t: 's', v: link };
  });

  range.e.c = newColIndex;
  worksheet['!ref'] = XLSX.utils.encode_range(range);

  const fileName = `${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_With_Attendance_Links.xlsx`;
  XLSX.writeFile(workbook, fileName, { bookType: 'xlsx' });
}

/**
 * Preserves the original company-provided Excel sheet EXACTLY as-is and appends
 * "Attendance Status" and "Attendance Marked Time" columns at the very end.
 *
 * This function is the single source of truth for all attendance sheet downloads.
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
  // Try retrieving original buffer & meta from sheetStorage if not passed directly
  if (!originalBuffer) {
    originalBuffer = getSheetBufferSync(roundId);
  }
  if (!originalMeta) {
    originalMeta = getSheetMetaSync(roundId);
  }

  // Build comprehensive attendance lookups:
  // SAP ID / Candidate ID -> { status, time }
  // Student Name -> { status, time }
  const attendanceMapBySap = new Map<string, { status: string; time: string }>();
  const attendanceMapByName = new Map<string, { status: string; time: string }>();

  // Filter students for this round, or use all if round filter is empty
  const roundFiltered = roundStudents.filter((rs) => rs.roundId === roundId);
  const studentsToScan = roundFiltered.length > 0 ? roundFiltered : roundStudents;

  studentsToScan.forEach((rs) => {
    const isPresent = rs.attendanceStatus === 'PRESENT' || rs.attendanceStatus === 'MANUALLY_MARKED';
    const status = isPresent ? 'PRESENT' : 'ABSENT';
    const time = isPresent ? (rs.attendanceTime || 'Recorded') : '--';
    const cleanSap = String(rs.sapId || '').trim();
    const cleanName = String(rs.studentName || '').trim().toLowerCase();

    if (cleanSap) {
      attendanceMapBySap.set(cleanSap, { status, time });
      attendanceMapBySap.set(cleanSap.toLowerCase(), { status, time });
    }
    if (cleanName) {
      attendanceMapByName.set(cleanName, { status, time });
    }
  });

  // Also read any live scans from localStorage
  try {
    const liveScansRaw = localStorage.getItem('upes_live_scans');
    if (liveScansRaw) {
      const scans = JSON.parse(liveScansRaw);
      if (Array.isArray(scans)) {
        scans.forEach((ev: any) => {
          if (ev.roundId === roundId || !ev.roundId) {
            const sSap = String(ev.sapId || '').trim();
            const sName = String(ev.studentName || '').trim().toLowerCase();
            const sTime = ev.time || 'Recorded';
            if (sSap) {
              attendanceMapBySap.set(sSap, { status: 'PRESENT', time: sTime });
              attendanceMapBySap.set(sSap.toLowerCase(), { status: 'PRESENT', time: sTime });
            }
            if (sName) {
              attendanceMapByName.set(sName, { status: 'PRESENT', time: sTime });
            }
          }
        });
      }
    }
  } catch {}

  // Helper to match row data to attendance status & time
  const resolveRowAttendance = (rowArray: any[], idCol: number, nameCol: number): { status: string; time: string } => {
    const rawId = idCol >= 0 && rowArray[idCol] !== undefined ? String(rowArray[idCol]).trim() : '';
    const rawName = nameCol >= 0 && rowArray[nameCol] !== undefined ? String(rowArray[nameCol]).trim().toLowerCase() : '';

    // 1. Direct match by SAP / candidate ID
    if (rawId && attendanceMapBySap.has(rawId)) {
      return attendanceMapBySap.get(rawId)!;
    }
    if (rawId && attendanceMapBySap.has(rawId.toLowerCase())) {
      return attendanceMapBySap.get(rawId.toLowerCase())!;
    }

    // 2. Direct match by Name
    if (rawName && attendanceMapByName.has(rawName)) {
      return attendanceMapByName.get(rawName)!;
    }

    // 3. Partial / contains Name match (e.g. 'ANIRUDDH VIJAYVARGIA' contains 'aniruddh')
    if (rawName && rawName.length > 2) {
      for (const [keyName, val] of attendanceMapByName.entries()) {
        if (keyName.length > 2 && (rawName.includes(keyName) || keyName.includes(rawName))) {
          return val;
        }
      }
    }

    // 4. Any cell in row contains an ID from attendanceMapBySap
    for (let c = 0; c < rowArray.length; c++) {
      const cellVal = String(rowArray[c] || '').trim();
      if (cellVal && attendanceMapBySap.has(cellVal)) {
        return attendanceMapBySap.get(cellVal)!;
      }
    }

    return { status: 'ABSENT', time: '--' };
  };

  // 1. If originalBuffer is provided, parse and modify the actual workbook
  if (originalBuffer) {
    try {
      const workbook = XLSX.read(originalBuffer, { type: 'array' });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rawRows: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

      if (rawRows && rawRows.length > 0) {
        const { headerRowIndex, headerRow, idCol, nameCol } = detectHeaderRow(rawRows);

        // Check if Attendance Status and Time columns already exist in header
        let statusColIndex = headerRow.findIndex((h) => h.toLowerCase().includes('attendance status'));
        let timeColIndex = headerRow.findIndex((h) => h.toLowerCase().includes('attendance marked time') || h.toLowerCase().includes('attendance time'));

        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

        if (statusColIndex === -1) {
          statusColIndex = range.e.c + 1;
        }
        if (timeColIndex === -1) {
          timeColIndex = statusColIndex === range.e.c + 1 ? range.e.c + 2 : range.e.c + 1;
        }

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

          const res = resolveRowAttendance(rowArray, idCol, nameCol);

          const cellStatusRef = XLSX.utils.encode_cell({ r: rowIndex, c: statusColIndex });
          const cellTimeRef = XLSX.utils.encode_cell({ r: rowIndex, c: timeColIndex });
          worksheet[cellStatusRef] = { t: 's', v: res.status };
          worksheet[cellTimeRef] = { t: 's', v: res.time };
        }

        range.e.c = Math.max(range.e.c, statusColIndex, timeColIndex);
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
    const { idCol, nameCol } = detectHeaderRow([originalMeta.headers]);
    const headers = [...originalMeta.headers, 'Attendance Status', 'Attendance Marked Time'];
    const rows = originalMeta.rows.map((rowArray) => {
      const res = resolveRowAttendance(rowArray, idCol, nameCol);
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

  // 3. Clean fallback: ONLY if no original sheet ever existed
  const fallbackData = studentsToScan.map((s) => ({
    'SAP ID': s.sapId,
    'Candidate Name': s.studentName,
    'Attendance Status': s.attendanceStatus === 'PRESENT' || s.attendanceStatus === 'MANUALLY_MARKED' ? 'PRESENT' : 'ABSENT',
    'Attendance Marked Time': s.attendanceTime || '--',
  }));

  const worksheet = XLSX.utils.json_to_sheet(fallbackData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, `Attendance Report`);

  const ext = format === 'csv' ? 'csv' : 'xlsx';
  const fileName = `${companyName.replace(/\s+/g, '_')}_${roundName.replace(/\s+/g, '_')}_Attendance_Report.${ext}`;
  XLSX.writeFile(workbook, fileName, { bookType: ext as any });
}

/**
 * Compatibility alias: NEVER generates the old synthetic format.
 * Delegates entirely to exportExactSheetWithAttendance!
 */
export function exportAnnotatedAttendanceExcel(
  companyName: string,
  roundName: string,
  roundId: string,
  roundStudents: RoundStudent[],
  format: 'xlsx' | 'csv' = 'xlsx'
) {
  exportExactSheetWithAttendance(roundId, companyName, roundName, roundStudents, [], format);
}

export const exportOriginalSheetWithAttendanceStatus = exportExactSheetWithAttendance;
