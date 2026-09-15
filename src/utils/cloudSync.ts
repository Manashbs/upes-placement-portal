export interface CloudAttendanceEvent {
  roundId: string;
  sapId: string;
  studentName: string;
  status: 'PRESENT';
  time: string;
  method: string;
  timestamp: number;
}

const NTFY_TOPIC = 'upes_portal_live_attendance_sync_v2';
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;
const PROD_API_BASE = 'https://upes-placement-portal.vercel.app';

function getAttendanceApiUrl(): string {
  if (typeof window !== 'undefined' && window.location.origin) {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return '/api/attendance';
    }
    return `${window.location.origin}/api/attendance`;
  }
  return `${PROD_API_BASE}/api/attendance`;
}

/**
 * Publishes an attendance event to the real-time cloud channel.
 * Instant cross-device sync (iPhone/Android to recruiter laptop).
 */
export async function recordAttendanceToCloud(
  event: Omit<CloudAttendanceEvent, 'timestamp'>
): Promise<boolean> {
  const fullEvent: CloudAttendanceEvent = {
    ...event,
    timestamp: Date.now(),
  };

  // 1. Dispatch locally via BroadcastChannel & custom event for 0ms same-device sync
  if (typeof BroadcastChannel !== 'undefined') {
    try {
      const bc = new BroadcastChannel('upes_attendance_live_sync');
      bc.postMessage({ type: 'ATTENDANCE_LIVE_UPDATE', event: fullEvent });
      bc.close();
    } catch {}
  }

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('upes_live_scan_recorded', { detail: fullEvent }));
  }

  // 2. Publish to /api/attendance with strict timeout so it never blocks UI
  let success = false;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(getAttendanceApiUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(fullEvent),
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (res.ok) success = true;
  } catch {}

  // 3. Direct cloud backup to production server if local failed
  if (!success && typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 4000);
      await fetch(`${PROD_API_BASE}/api/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEvent),
        signal: controller.signal,
      });
      clearTimeout(timeout);
      success = true;
    } catch {}
  }

  return success;
}

/**
 * Fetches all attendance events from the cloud registry with 3s timeout.
 */
export async function fetchCloudAttendanceEvents(): Promise<CloudAttendanceEvent[]> {
  // First try primary API endpoint
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(getAttendanceApiUrl(), {
      headers: { 'Cache-Control': 'no-cache' },
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    }
  } catch {}

  // Fallback to prod endpoint directly if on localhost
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3000);
      const res = await fetch(`${PROD_API_BASE}/api/attendance`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal: controller.signal,
      });
      clearTimeout(timeout);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          return data;
        }
      }
    } catch {}
  }

  return [];
}

/**
 * Creates an EventSource stream for zero-latency instant attendance updates.
 */
export function subscribeToLiveCloudScans(
  onEvent: (event: CloudAttendanceEvent) => void
): () => void {
  if (typeof window === 'undefined' || typeof EventSource === 'undefined') {
    return () => {};
  }

  try {
    const es = new EventSource(`${NTFY_URL}/sse`);

    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.event === 'message' && data.message) {
          const ev = JSON.parse(data.message) as CloudAttendanceEvent;
          if (ev && ev.roundId && (ev.sapId || ev.studentName)) {
            onEvent(ev);
          }
        }
      } catch {}
    };

    es.onerror = () => {
      // Gracefully silence SSE errors if blocked by local network
      try {
        es.close();
      } catch {}
    };

    return () => {
      try {
        es.close();
      } catch {}
    };
  } catch {
    return () => {};
  }
}
