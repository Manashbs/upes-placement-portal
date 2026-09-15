import type { VercelRequest, VercelResponse } from '@vercel/node';

const NTFY_TOPIC = 'upes_portal_live_attendance_sync_v2';
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

// Global in-memory cache to guarantee zero-latency responses across serverless invocations
const inMemoryEvents: any[] = [];

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    if (req.method === 'GET') {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);
        const resp = await fetch(`${NTFY_URL}/json?poll=1&since=all`, {
          headers: { 'Cache-Control': 'no-cache' },
          signal: controller.signal,
        });
        clearTimeout(timeout);

        if (resp.ok) {
          const text = await resp.text();
          const lines = text.trim().split('\n').filter(Boolean);
          const events = lines
            .map((l) => { try { return JSON.parse(l); } catch { return null; } })
            .filter((e) => e && e.event === 'message' && e.message)
            .map((e) => { try { return JSON.parse(e.message); } catch { return null; } })
            .filter((e) => e && e.roundId && e.sapId);

          // Merge with inMemoryEvents, keeping unique by roundId + sapId
          const seen = new Set<string>();
          const combined: any[] = [];
          [...events, ...inMemoryEvents].forEach((ev) => {
            const key = `${ev.roundId}_${String(ev.sapId).trim()}`;
            if (!seen.has(key)) {
              seen.add(key);
              combined.push(ev);
            }
          });
          return res.status(200).json(combined);
        }
      } catch {}

      // If remote ntfy timed out, return memory cache
      return res.status(200).json(inMemoryEvents);
    }

    if (req.method === 'POST') {
      const { roundId, sapId, studentName, time, method } = req.body || {};
      if (!roundId || !sapId) {
        return res.status(400).json({ error: 'Missing roundId or sapId' });
      }

      const newEvent = {
        roundId,
        sapId: String(sapId).trim(),
        studentName: studentName || `Candidate (${sapId})`,
        status: 'PRESENT',
        time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: method || 'REAL_CAMERA_QR_SCAN',
        timestamp: Date.now(),
      };

      // Store in memory cache
      const exists = inMemoryEvents.some(
        (e) => e.roundId === newEvent.roundId && String(e.sapId).trim() === newEvent.sapId
      );
      if (!exists) {
        inMemoryEvents.unshift(newEvent);
        if (inMemoryEvents.length > 500) inMemoryEvents.pop();
      }

      // Asynchronously publish to NTFY (fire-and-forget, do not block response)
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        fetch(NTFY_URL, {
          method: 'POST',
          headers: {
            'Title': `Attendance: ${newEvent.studentName} (${newEvent.sapId})`,
            'Tags': 'white_check_mark',
          },
          body: JSON.stringify(newEvent),
          signal: controller.signal,
        })
          .then(() => clearTimeout(timeout))
          .catch(() => clearTimeout(timeout));
      } catch {}

      return res.status(200).json({ success: true, event: newEvent });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
