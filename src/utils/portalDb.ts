import {
  PortalUser,
  Company,
  Drive,
  Round,
  RoundStudent,
  SPR,
  SPRDutyAssignment,
  Offer,
  AuditLog,
  Student,
  SPRCycle,
} from '../types';
import { initialUsers, initialSPRs, initialStudents } from '../mock/mockData';

export interface PortalDatabaseState {
  users: PortalUser[];
  companies: Company[];
  drives: Drive[];
  rounds: Round[];
  roundStudents: RoundStudent[];
  students: Student[];
  sprs: SPR[];
  dutyAssignments?: SPRDutyAssignment[];
  sprCycle?: SPRCycle;
  offers: Offer[];
  auditLogs: AuditLog[];
}

const IDB_NAME = 'upes_portal_master_db';
const IDB_STORE = 'portal_collections';
const IDB_VERSION = 1;

function openIDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

/**
 * Reads a collection from IndexedDB
 */
export async function getFromIDB<T>(key: string): Promise<T | null> {
  try {
    const db = await openIDB();
    if (!db) return null;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(key);
      req.onsuccess = () => resolve((req.result as T) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/**
 * Saves a collection to IndexedDB
 */
export async function saveToIDB<T>(key: string, value: T): Promise<void> {
  try {
    const db = await openIDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      store.put(value, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
    });
  } catch {}
}

const CLOUD_CORE_TOPIC = 'upes_portal_core_data_v3';
const CLOUD_ROSTER_TOPIC = 'upes_portal_roster_data_v3';
const CLOUD_CORE_FALLBACK_URL = `https://ntfy.sh/${CLOUD_CORE_TOPIC}`;
const CLOUD_ROSTER_FALLBACK_URL = `https://ntfy.sh/${CLOUD_ROSTER_TOPIC}`;

async function fetchFromNtfyTopic(url: string): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const resp = await fetch(`${url}/json?poll=1&since=all`, {
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!resp.ok) return null;
    const text = await resp.text();
    const lines = text.trim().split('\n').filter(Boolean);

    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const item = JSON.parse(lines[i]);
        if (item.event === 'message') {
          if (item.message && item.message.startsWith('{')) {
            try { return JSON.parse(item.message); } catch {}
          }
          if (item.attachment && item.attachment.url) {
            try {
              const attachResp = await fetch(item.attachment.url, { cache: 'no-store' });
              if (attachResp.ok) return await attachResp.json();
            } catch {}
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}

/**
 * Fetches latest cloud database snapshot from /api/db or direct cloud topics
 */
export async function fetchRemoteDatabase(): Promise<Partial<PortalDatabaseState> | null> {
  try {
    // 1. Try local serverless API
    try {
      const res = await fetch('/api/db', { cache: 'no-store' });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return json.data;
        }
      }
    } catch {}

    // 2. Direct fallback to cloud topics if API unavailable
    const coreData = await fetchFromNtfyTopic(CLOUD_CORE_FALLBACK_URL);
    const rosterData = await fetchFromNtfyTopic(CLOUD_ROSTER_FALLBACK_URL);

    if (coreData || rosterData) {
      return {
        ...(coreData || {}),
        ...(rosterData ? { roundStudents: rosterData.roundStudents } : {}),
      };
    }
    return null;
  } catch (err) {
    console.warn('[PortalDB] Remote fetch error:', err);
    return null;
  }
}

// State accumulator to avoid race conditions when multiple useEffect hooks fire simultaneously
let pendingRemoteState: Partial<PortalDatabaseState> = {};
let saveTimeout: any = null;

async function executeRemotePush(snapshotToSend: Partial<PortalDatabaseState>) {
  try {
    // 1. Post to local serverless API
    let savedViaApi = false;
    try {
      const res = await fetch('/api/db', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(snapshotToSend),
      });
      if (res.ok) savedViaApi = true;
    } catch {}

    // 2. Direct fallback to cloud topics if serverless API isn't reachable
    if (!savedViaApi) {
      const now = new Date().toISOString();
      if (
        snapshotToSend.companies ||
        snapshotToSend.drives ||
        snapshotToSend.rounds ||
        snapshotToSend.sprs ||
        snapshotToSend.users
      ) {
        fetch(CLOUD_CORE_FALLBACK_URL, {
          method: 'POST',
          headers: {
            Title: 'Portal Core DB Sync',
            Tags: 'building',
          },
          body: JSON.stringify({
            companies: snapshotToSend.companies,
            drives: snapshotToSend.drives,
            rounds: snapshotToSend.rounds,
            sprs: snapshotToSend.sprs,
            dutyAssignments: snapshotToSend.dutyAssignments,
            users: snapshotToSend.users,
            lastUpdated: now,
          }),
        }).catch(() => {});
      }

      if (snapshotToSend.roundStudents) {
        fetch(CLOUD_ROSTER_FALLBACK_URL, {
          method: 'POST',
          headers: {
            Title: 'Portal Roster Sync',
            Tags: 'busts_in_silhouette',
          },
          body: JSON.stringify({
            roundStudents: snapshotToSend.roundStudents,
            lastUpdated: now,
          }),
        }).catch(() => {});
      }
    }
  } catch (err) {
    console.warn('[PortalDB] Remote sync error:', err);
  }
}

/**
 * Immediately pushes an update to cloud database without debounce delay.
 * Used when creating/deleting companies, drives, or rounds to ensure instant multi-device sync.
 */
export async function pushImmediateToRemote(data: Partial<PortalDatabaseState>): Promise<void> {
  Object.assign(pendingRemoteState, data);
  if (saveTimeout) {
    clearTimeout(saveTimeout);
    saveTimeout = null;
  }
  const toSend = { ...pendingRemoteState };
  pendingRemoteState = {};
  await executeRemotePush(toSend);
}

/**
 * Persists portal state to Cloud Database with state accumulation.
 * Accumulates rapid updates so no collection (e.g. companies, drives) is dropped.
 */
export function persistToRemoteDatabase(data: Partial<PortalDatabaseState>): void {
  // Accumulate pending changes
  Object.assign(pendingRemoteState, data);

  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    const toSend = { ...pendingRemoteState };
    pendingRemoteState = {};
    saveTimeout = null;
    await executeRemotePush(toSend);
  }, 500);
}

/**
 * Sanitize users array to guarantee CSO account is present exactly once,
 * legacy dummy accounts are excluded, and any duplicates are strictly purged.
 */
export function sanitizeUsers(usersList: PortalUser[]): PortalUser[] {
  const blacklist = ['admin', 'officer', 'spr', 'recruiter', 'rohit.kumar@upes.ac.in', 'aanchal.gupta@upes.ac.in'];
  
  const seenUsernames = new Set<string>();
  const seenIds = new Set<string>();
  const deduplicated: PortalUser[] = [];

  for (const u of (usersList || [])) {
    if (!u) continue;
    let uname = (u.username || '').trim().toLowerCase();
    const uemail = (u.email || '').trim().toLowerCase();
    const uid = (u.id || '').trim();

    // Migrate any legacy user instances to CSO
    if (uname === 'manash.29481@stu.upes.ac.in' || uemail === 'manash.29481@stu.upes.ac.in' || uid === 'usr-director-manash') {
      uname = 'cso@upes.ac.in';
      u.username = 'CSO@Upes.ac.in';
      u.email = 'CSO@Upes.ac.in';
      u.name = 'CSO';
      u.password = 'Pass@123';
      u.id = 'usr-cso';
    }

    if (!uname || blacklist.includes(uname) || blacklist.includes(uemail)) {
      continue;
    }

    if (
      u.role !== 'DIRECTOR' &&
      u.role !== 'CSO' &&
      u.role !== 'CAREER_SERVICE_OFFICER' &&
      u.role !== 'MASTER_ADMIN'
    ) {
      continue;
    }

    // Skip any duplicate entries by username or ID
    if (seenUsernames.has(uname) || (uid && seenIds.has(uid))) {
      continue;
    }

    seenUsernames.add(uname);
    if (uid) seenIds.add(uid);
    deduplicated.push({
      ...u,
      role: u.role === 'MASTER_ADMIN' ? 'DIRECTOR' : u.role,
    });
  }

  // Ensure CSO is present exactly once
  const csoUname = initialUsers[0].username.toLowerCase();
  if (!seenUsernames.has(csoUname)) {
    deduplicated.unshift(initialUsers[0]);
  }

  return deduplicated;
}

/**
 * Sanitize SPRs array: if invalid or contains legacy dummy names, load the 50-member roster
 */
const DUMMY_SPR_NAMES = ['tanya kapoor', 'rohan mehra', 'divya nair', 'karthik raja', 'ananya roy', 'siddharth sen'];
export function sanitizeSPRs(sprList: SPR[]): SPR[] {
  if (!Array.isArray(sprList) || sprList.length < 50) {
    return initialSPRs.map((s) => ({ ...s, totalDuties: 0, usedInCurrentCycle: false }));
  }
  const hasDummy = sprList.some((s) => DUMMY_SPR_NAMES.includes((s.name || '').toLowerCase().trim()));
  if (hasDummy) {
    return initialSPRs.map((s) => ({ ...s, totalDuties: 0, usedInCurrentCycle: false }));
  }
  // Preserve authentic duties, cycle usage status, and unavailabilities
  return sprList.map((s) => ({
    ...s,
    totalDuties: typeof s.totalDuties === 'number' ? s.totalDuties : 0,
    usedInCurrentCycle: Boolean(s.usedInCurrentCycle),
    unavailabilities: Array.isArray(s.unavailabilities) ? s.unavailabilities : [],
  }));
}
