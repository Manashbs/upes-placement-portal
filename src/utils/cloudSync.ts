export interface CloudAttendanceEvent {
  roundId: string;
  sapId: string;
  studentName: string;
  status: 'PRESENT';
  time: string;
  method: string;
  timestamp: number;
}

const REGISTRY_OBJECT_ID = 'ff808181a067127101a096b1d1e50345';
const CLOUD_API_URL = `https://api.restful-api.dev/objects/${REGISTRY_OBJECT_ID}`;

/**
 * Publishes an attendance event to the global cloud registry.
 * This allows candidate mobile phones (iOS/Android) and recruiter laptops to sync
 * attendance in real-time across different devices and networks.
 */
export async function recordAttendanceToCloud(event: Omit<CloudAttendanceEvent, 'timestamp'>): Promise<boolean> {
  try {
    const fullEvent: CloudAttendanceEvent = {
      ...event,
      timestamp: Date.now(),
    };

    // 1. Fetch current events from cloud registry
    let existingEvents: CloudAttendanceEvent[] = [];
    try {
      const getRes = await fetch(CLOUD_API_URL, {
        headers: { 'Cache-Control': 'no-cache' },
      });
      if (getRes.ok) {
        const json = await getRes.json();
        if (json && json.data && Array.isArray(json.data.attendanceEvents)) {
          existingEvents = json.data.attendanceEvents;
        }
      }
    } catch {}

    // Check if already present to avoid duplicates
    const alreadyRecorded = existingEvents.some(
      (e) => e.roundId === fullEvent.roundId && String(e.sapId).trim() === String(fullEvent.sapId).trim()
    );

    if (alreadyRecorded) {
      return true;
    }

    // Append new event
    const updatedEvents = [...existingEvents, fullEvent];

    // 2. Save back to cloud registry
    const putRes = await fetch(CLOUD_API_URL, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: 'UPES_PLACEMENT_PORTAL_MASTER_ATTENDANCE_REGISTRY',
        data: {
          version: 1,
          lastUpdated: Date.now(),
          attendanceEvents: updatedEvents,
        },
      }),
    });

    // 3. Also dispatch locally via BroadcastChannel & custom event
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('upes_attendance_live_sync');
        bc.postMessage({ type: 'ATTENDANCE_LIVE_UPDATE', event: fullEvent });
        bc.close();
      } catch {}
    }

    return putRes.ok;
  } catch (err) {
    console.warn('[CloudSync] Failed to publish attendance event to cloud:', err);
    return false;
  }
}

/**
 * Fetches all attendance events from the cloud registry.
 */
export async function fetchCloudAttendanceEvents(): Promise<CloudAttendanceEvent[]> {
  try {
    const res = await fetch(CLOUD_API_URL, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return [];
    const json = await res.json();
    if (json && json.data && Array.isArray(json.data.attendanceEvents)) {
      return json.data.attendanceEvents;
    }
    return [];
  } catch {
    return [];
  }
}
