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

/**
 * Publishes an attendance event to the real-time cloud channel.
 * Instant cross-device sync (iPhone/Android to recruiter laptop).
 */
export async function recordAttendanceToCloud(
  event: Omit<CloudAttendanceEvent, 'timestamp'>
): Promise<boolean> {
  try {
    const fullEvent: CloudAttendanceEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // 1. Publish to ntfy.sh real-time topic (unlimited, zero-delay SSE pub/sub)
    let ntfyOk = false;
    try {
      const ntfyRes = await fetch(NTFY_URL, {
        method: 'POST',
        headers: {
          'Title': `Attendance: ${fullEvent.studentName} (${fullEvent.sapId})`,
          'Tags': 'white_check_mark,admission',
        },
        body: JSON.stringify(fullEvent),
      });
      ntfyOk = ntfyRes.ok;
    } catch (e) {
      console.warn('[CloudSync] ntfy.sh post error:', e);
    }

    // 2. Also POST to local /api/attendance if running on Vercel
    try {
      await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fullEvent),
      }).catch(() => {});
    } catch {}

    // 3. Dispatch locally via BroadcastChannel & custom event for same-device tabs
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

    return ntfyOk;
  } catch (err) {
    console.warn('[CloudSync] Failed to publish attendance event:', err);
    return false;
  }
}

/**
 * Fetches all attendance events from the cloud registry.
 */
export async function fetchCloudAttendanceEvents(): Promise<CloudAttendanceEvent[]> {
  try {
    const res = await fetch(`${NTFY_URL}/json?poll=1&since=all`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return [];

    const text = await res.text();
    const lines = text.trim().split('\n').filter(Boolean);
    const events: CloudAttendanceEvent[] = [];

    for (const line of lines) {
      try {
        const msgObj = JSON.parse(line);
        if (msgObj.event === 'message' && msgObj.message) {
          const parsed = JSON.parse(msgObj.message);
          if (parsed && parsed.roundId && (parsed.sapId || parsed.studentName)) {
            events.push(parsed);
          }
        }
      } catch {}
    }

    return events;
  } catch (err) {
    console.warn('[CloudSync] fetchCloudAttendanceEvents error:', err);
    return [];
  }
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

    return () => {
      es.close();
    };
  } catch {
    return () => {};
  }
}

