/**
 * Persistent and in-memory storage manager for original uploaded Excel sheets.
 * Uses a triple-layer strategy:
 * 1. window global in-memory maps (instant sync access across component re-renders)
 * 2. IndexedDB (unlimited binary ArrayBuffer quota for page refreshes)
 * 3. localStorage (fallback for sheet metadata: headers & rows)
 */

declare global {
  interface Window {
    __upes_excel_buffers?: Map<string, ArrayBuffer>;
    __upes_excel_meta?: Map<string, { headers: string[]; rows: any[][]; fileName?: string }>;
    __upes_latest_buffer?: ArrayBuffer;
    __upes_latest_meta?: { headers: string[]; rows: any[][]; fileName?: string };
  }
}

const DB_NAME = 'upes_placement_portal_sheets';
const STORE_NAME = 'excel_files';
const DB_VERSION = 1;

function getDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }
    try {
      const request = window.indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
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
 * Initialize global memory maps
 */
function ensureGlobalMaps() {
  if (typeof window === 'undefined') return;
  if (!window.__upes_excel_buffers) {
    window.__upes_excel_buffers = new Map();
  }
  if (!window.__upes_excel_meta) {
    window.__upes_excel_meta = new Map();
  }
}

/**
 * Store an uploaded sheet buffer and its metadata.
 * Saves under the given roundId AND under 'LATEST' so it can always be retrieved.
 */
export async function saveSheetToStorage(
  roundId: string,
  buffer: ArrayBuffer,
  meta?: { headers: string[]; rows: any[][] },
  fileName?: string
): Promise<void> {
  ensureGlobalMaps();

  // 1. In-memory fast store
  if (typeof window !== 'undefined') {
    window.__upes_excel_buffers?.set(roundId, buffer);
    window.__upes_excel_buffers?.set('LATEST', buffer);
    window.__upes_latest_buffer = buffer;

    if (meta) {
      const metaObj = { headers: meta.headers, rows: meta.rows, fileName };
      window.__upes_excel_meta?.set(roundId, metaObj);
      window.__upes_excel_meta?.set('LATEST', metaObj);
      window.__upes_latest_meta = metaObj;
    }
  }

  // 2. IndexedDB binary store
  try {
    const db = await getDB();
    if (db) {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      store.put(buffer, roundId);
      store.put(buffer, 'LATEST');
      if (meta) {
        store.put(meta, `meta_${roundId}`);
        store.put(meta, 'meta_LATEST');
      }
    }
  } catch (e) {
    console.warn('Could not save to IndexedDB:', e);
  }

  // 3. LocalStorage metadata backup
  if (meta) {
    try {
      const serialized = JSON.stringify(meta);
      // Safe size limit check (< 2MB)
      if (serialized.length < 2000000) {
        localStorage.setItem(`upes_excel_raw_${roundId}`, serialized);
        localStorage.setItem('upes_excel_raw_LATEST', serialized);
      }
    } catch {}
  }
}

/**
 * Synchronously retrieves sheet buffer from memory.
 * Checks roundId first, then falls back to 'LATEST'.
 */
export function getSheetBufferSync(roundId?: string): ArrayBuffer | undefined {
  ensureGlobalMaps();
  if (typeof window === 'undefined') return undefined;

  if (roundId && window.__upes_excel_buffers?.has(roundId)) {
    return window.__upes_excel_buffers.get(roundId);
  }
  if (window.__upes_excel_buffers?.has('LATEST')) {
    return window.__upes_excel_buffers.get('LATEST');
  }
  if (window.__upes_latest_buffer) {
    return window.__upes_latest_buffer;
  }
  return undefined;
}

/**
 * Synchronously retrieves sheet metadata (headers & rows) from memory or localStorage.
 */
export function getSheetMetaSync(roundId?: string): { headers: string[]; rows: any[][]; fileName?: string } | undefined {
  ensureGlobalMaps();
  if (typeof window === 'undefined') return undefined;

  if (roundId && window.__upes_excel_meta?.has(roundId)) {
    return window.__upes_excel_meta.get(roundId);
  }
  if (window.__upes_excel_meta?.has('LATEST')) {
    return window.__upes_excel_meta.get('LATEST');
  }
  if (window.__upes_latest_meta) {
    return window.__upes_latest_meta;
  }

  // Try localStorage
  try {
    const raw = (roundId && localStorage.getItem(`upes_excel_raw_${roundId}`)) || localStorage.getItem('upes_excel_raw_LATEST');
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {}

  return undefined;
}

/**
 * Asynchronously loads sheet buffer from IndexedDB if memory missed.
 */
export async function getSheetBufferAsync(roundId?: string): Promise<ArrayBuffer | undefined> {
  const sync = getSheetBufferSync(roundId);
  if (sync) return sync;

  try {
    const db = await getDB();
    if (!db) return undefined;

    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);

      const targetKey = roundId || 'LATEST';
      const req = store.get(targetKey);

      req.onsuccess = () => {
        if (req.result) {
          // Populate memory cache
          ensureGlobalMaps();
          if (typeof window !== 'undefined') {
            window.__upes_excel_buffers?.set(targetKey, req.result);
            window.__upes_latest_buffer = req.result;
          }
          resolve(req.result);
        } else {
          // Try LATEST
          const fallbackReq = store.get('LATEST');
          fallbackReq.onsuccess = () => {
            if (fallbackReq.result && typeof window !== 'undefined') {
              window.__upes_excel_buffers?.set('LATEST', fallbackReq.result);
              window.__upes_latest_buffer = fallbackReq.result;
            }
            resolve(fallbackReq.result);
          };
          fallbackReq.onerror = () => resolve(undefined);
        }
      };
      req.onerror = () => resolve(undefined);
    });
  } catch {
    return undefined;
  }
}
