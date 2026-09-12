import {
  PortalUser,
  Company,
  Drive,
  Round,
  RoundStudent,
  SPR,
  Offer,
  AuditLog,
  Student,
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
  offers: Offer[];
  auditLogs: AuditLog[];
}

const IDB_NAME = 'upes_portal_master_db';
const IDB_STORE = 'portal_collections';
const IDB_VERSION = 1;

const CLOUD_DB_TOPIC = 'upes_portal_master_db_v1';
const CLOUD_DB_FALLBACK_URL = `https://ntfy.sh/${CLOUD_DB_TOPIC}`;

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

/**
 * Fetches latest cloud database snapshot
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

    // 2. Fallback to direct cloud topic
    const resp = await fetch(`${CLOUD_DB_FALLBACK_URL}/json?poll=1&since=all`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (resp.ok) {
      const text = await resp.text();
      const lines = text.trim().split('\n').filter(Boolean);
      const messages = lines
        .map((l) => {
          try {
            return JSON.parse(l);
          } catch {
            return null;
          }
        })
        .filter((e) => e && e.event === 'message' && e.message)
        .map((e) => {
          try {
            return JSON.parse(e.message);
          } catch {
            return null;
          }
        })
        .filter((m) => m && typeof m === 'object');

      if (messages.length > 0) {
        return messages[messages.length - 1];
      }
    }
    return null;
  } catch (err) {
    console.warn('[PortalDB] Remote fetch error:', err);
    return null;
  }
}

// Debounce timer for saving to cloud
let saveTimeout: any = null;

/**
 * Persists portal state to Cloud Database (debounced to prevent spam)
 */
export function persistToRemoteDatabase(data: Partial<PortalDatabaseState>): void {
  if (saveTimeout) {
    clearTimeout(saveTimeout);
  }

  saveTimeout = setTimeout(async () => {
    try {
      // 1. Post to local serverless API
      let savedViaApi = false;
      try {
        const res = await fetch('/api/db', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        if (res.ok) savedViaApi = true;
      } catch {}

      // 2. Direct fallback to cloud topic if API isn't hosted locally
      if (!savedViaApi) {
        await fetch(CLOUD_DB_FALLBACK_URL, {
          method: 'POST',
          headers: {
            Title: 'Portal DB Sync',
            Tags: 'database',
          },
          body: JSON.stringify({ ...data, lastUpdated: new Date().toISOString() }),
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[PortalDB] Remote sync error:', err);
    }
  }, 1000);
}

/**
 * Sanitize users array to guarantee Director Manash is present and legacy dummy accounts are excluded
 */
export function sanitizeUsers(usersList: PortalUser[]): PortalUser[] {
  const blacklist = ['admin', 'officer', 'spr', 'recruiter', 'rohit.kumar@upes.ac.in', 'aanchal.gupta@upes.ac.in'];
  const valid = (usersList || []).filter((u) => {
    const uname = (u.username || '').toLowerCase();
    const uemail = (u.email || '').toLowerCase();
    return (
      !blacklist.includes(uname) &&
      !blacklist.includes(uemail) &&
      (u.role === 'DIRECTOR' || u.role === 'CSO' || u.role === 'CAREER_SERVICE_OFFICER' || u.role === 'MASTER_ADMIN')
    );
  });

  const hasDirector = valid.some((u) => u.username.toLowerCase() === initialUsers[0].username.toLowerCase());
  if (!hasDirector) {
    valid.unshift(initialUsers[0]);
  }
  return valid;
}

/**
 * Sanitize SPRs array: if invalid or contains legacy dummy names, load the 50-member roster
 */
const DUMMY_SPR_NAMES = ['tanya kapoor', 'rohan mehra', 'divya nair', 'karthik raja', 'ananya roy', 'siddharth sen'];
export function sanitizeSPRs(sprList: SPR[]): SPR[] {
  if (!Array.isArray(sprList) || sprList.length < 50) {
    return initialSPRs;
  }
  const hasDummy = sprList.some((s) => DUMMY_SPR_NAMES.includes((s.name || '').toLowerCase().trim()));
  if (hasDummy) {
    return initialSPRs;
  }
  return sprList;
}
