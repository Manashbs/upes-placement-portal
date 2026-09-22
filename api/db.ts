import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Unified Cloud Database Endpoint for UPES Placement Portal
 * Partitions core database state (companies, drives, rounds, sprs, users)
 * from heavy roster spreadsheets to guarantee instant cross-device synchronization.
 */

const NTFY_CORE_TOPIC = 'upes_portal_core_data_v3';
const NTFY_ROSTER_TOPIC = 'upes_portal_roster_data_v3';

const NTFY_CORE_URL = `https://ntfy.sh/${NTFY_CORE_TOPIC}`;
const NTFY_ROSTER_URL = `https://ntfy.sh/${NTFY_ROSTER_TOPIC}`;

// In-memory persistent database cache across serverless warm invocations
const inMemoryDb: {
  companies: any[];
  drives: any[];
  rounds: any[];
  sprs: any[];
  dutyAssignments: any[];
  users: any[];
  roundStudents: any[];
  lastUpdated: string;
} = {
  companies: [],
  drives: [],
  rounds: [],
  sprs: [],
  dutyAssignments: [],
  users: [],
  roundStudents: [],
  lastUpdated: new Date().toISOString(),
};

async function parseNtfyMessages(url: string): Promise<any | null> {
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
          // If stored inline
          if (item.message && item.message.startsWith('{')) {
            try {
              return JSON.parse(item.message);
            } catch {}
          }
          // If stored as ntfy attachment
          if (item.attachment && item.attachment.url) {
            try {
              const attachResp = await fetch(item.attachment.url, { cache: 'no-store' });
              if (attachResp.ok) {
                return await attachResp.json();
              }
            } catch {}
          }
        }
      } catch {}
    }
  } catch {}
  return null;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS configuration
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // 1. GET: Fetch latest consolidated portal database snapshot
    if (req.method === 'GET') {
      try {
        const coreSnapshot = await parseNtfyMessages(NTFY_CORE_URL);
        if (coreSnapshot && typeof coreSnapshot === 'object') {
          if (Array.isArray(coreSnapshot.companies) && coreSnapshot.companies.length > 0) {
            inMemoryDb.companies = coreSnapshot.companies;
          }
          if (Array.isArray(coreSnapshot.drives) && coreSnapshot.drives.length > 0) {
            inMemoryDb.drives = coreSnapshot.drives;
          }
          if (Array.isArray(coreSnapshot.rounds) && coreSnapshot.rounds.length > 0) {
            inMemoryDb.rounds = coreSnapshot.rounds;
          }
          if (Array.isArray(coreSnapshot.sprs) && coreSnapshot.sprs.length > 0) {
            inMemoryDb.sprs = coreSnapshot.sprs;
          }
          if (Array.isArray(coreSnapshot.dutyAssignments)) {
            inMemoryDb.dutyAssignments = coreSnapshot.dutyAssignments;
          }
          if (Array.isArray(coreSnapshot.users) && coreSnapshot.users.length > 0) {
            inMemoryDb.users = coreSnapshot.users;
          }
          if (coreSnapshot.lastUpdated) {
            inMemoryDb.lastUpdated = coreSnapshot.lastUpdated;
          }
        }

        // Fetch roster if memory cache doesn't have it
        if (!inMemoryDb.roundStudents || inMemoryDb.roundStudents.length === 0) {
          const rosterSnapshot = await parseNtfyMessages(NTFY_ROSTER_URL);
          if (rosterSnapshot && Array.isArray(rosterSnapshot.roundStudents)) {
            inMemoryDb.roundStudents = rosterSnapshot.roundStudents;
          }
        }
      } catch (err) {
        console.warn('[CloudDB] Sync notice:', err);
      }

      return res.status(200).json({ success: true, data: inMemoryDb });
    }

    // 2. POST: Persist updated portal snapshot to cloud DB with collection merging
    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Expected JSON object in request body' });
      }

      const now = new Date().toISOString();
      inMemoryDb.lastUpdated = now;

      // Merge incoming collections into inMemoryDb
      if (Array.isArray(payload.companies)) {
        inMemoryDb.companies = payload.companies;
      }
      if (Array.isArray(payload.drives)) {
        inMemoryDb.drives = payload.drives;
      }
      if (Array.isArray(payload.rounds)) {
        inMemoryDb.rounds = payload.rounds;
      }
      if (Array.isArray(payload.sprs)) {
        inMemoryDb.sprs = payload.sprs;
      }
      if (Array.isArray(payload.dutyAssignments)) {
        inMemoryDb.dutyAssignments = payload.dutyAssignments;
      }
      if (Array.isArray(payload.users)) {
        inMemoryDb.users = payload.users;
      }
      if (Array.isArray(payload.roundStudents)) {
        inMemoryDb.roundStudents = payload.roundStudents;
      }

      // 2A. Publish core data to core topic
      const corePayload = {
        companies: inMemoryDb.companies,
        drives: inMemoryDb.drives,
        rounds: inMemoryDb.rounds,
        sprs: inMemoryDb.sprs,
        dutyAssignments: inMemoryDb.dutyAssignments,
        users: inMemoryDb.users,
        lastUpdated: now,
      };

      try {
        fetch(NTFY_CORE_URL, {
          method: 'POST',
          headers: {
            Title: `Portal Core DB (${inMemoryDb.companies.length} Companies, ${inMemoryDb.drives.length} Drives)`,
            Tags: 'building,card_file_box',
          },
          body: JSON.stringify(corePayload),
        }).catch(() => {});
      } catch {}

      // 2B. Publish roster data if included in update
      if (Array.isArray(payload.roundStudents)) {
        try {
          fetch(NTFY_ROSTER_URL, {
            method: 'POST',
            headers: {
              Title: `Portal Roster Sync (${payload.roundStudents.length} Students)`,
              Tags: 'busts_in_silhouette,floppy_disk',
            },
            body: JSON.stringify({ roundStudents: payload.roundStudents, lastUpdated: now }),
          }).catch(() => {});
        } catch {}
      }

      return res.status(200).json({ success: true, timestamp: now });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[CloudDB Handler Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal Database Error' });
  }
}
