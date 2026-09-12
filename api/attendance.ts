import type { VercelRequest, VercelResponse } from '@vercel/node';

const REGISTRY_OBJECT_ID = 'ff808181a067127101a096b1d1e50345';
const CLOUD_API_URL = `https://api.restful-api.dev/objects/${REGISTRY_OBJECT_ID}`;

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
      const resp = await fetch(CLOUD_API_URL, { headers: { 'Cache-Control': 'no-cache' } });
      const json = await resp.json();
      return res.status(200).json(json?.data?.attendanceEvents || []);
    }

    if (req.method === 'POST') {
      const { roundId, sapId, studentName, time, method } = req.body || {};
      if (!roundId || !sapId) {
        return res.status(400).json({ error: 'Missing roundId or sapId' });
      }

      let existingEvents: any[] = [];
      try {
        const getRes = await fetch(CLOUD_API_URL, { headers: { 'Cache-Control': 'no-cache' } });
        if (getRes.ok) {
          const json = await getRes.json();
          existingEvents = json?.data?.attendanceEvents || [];
        }
      } catch {}

      const newEvent = {
        roundId,
        sapId: String(sapId).trim(),
        studentName: studentName || `Candidate (${sapId})`,
        status: 'PRESENT',
        time: time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        method: method || 'REAL_CAMERA_QR_SCAN',
        timestamp: Date.now(),
      };

      const alreadyRecorded = existingEvents.some(
        (e) => e.roundId === roundId && String(e.sapId).trim() === String(sapId).trim()
      );

      if (!alreadyRecorded) {
        existingEvents.push(newEvent);
        await fetch(CLOUD_API_URL, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'UPES_PLACEMENT_PORTAL_MASTER_ATTENDANCE_REGISTRY',
            data: {
              version: 1,
              lastUpdated: Date.now(),
              attendanceEvents: existingEvents,
            },
          }),
        });
      }

      return res.status(200).json({ success: true, event: newEvent });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
