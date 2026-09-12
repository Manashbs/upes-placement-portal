import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Unified Cloud Database Endpoint for UPES Placement Portal
 * Persists and serves all portal collections:
 * - users (Director & Career Service Officers)
 * - companies
 * - drives
 * - rounds
 * - roundStudents (attendance & shortlists)
 * - sprs (50-member roster)
 * - offers
 * - auditLogs
 */

const NTFY_DB_TOPIC = 'upes_portal_master_db_v1';
const NTFY_DB_URL = `https://ntfy.sh/${NTFY_DB_TOPIC}`;

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
    // 1. GET: Fetch latest complete portal database snapshot
    if (req.method === 'GET') {
      try {
        const resp = await fetch(`${NTFY_DB_URL}/json?poll=1&since=all`, {
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
            const latestSnapshot = messages[messages.length - 1];
            return res.status(200).json({ success: true, data: latestSnapshot });
          }
        }
      } catch (err) {
        console.warn('[CloudDB] Failed to fetch remote snapshot:', err);
      }

      // If no remote snapshot found yet
      return res.status(200).json({ success: true, data: null });
    }

    // 2. POST: Persist updated portal snapshot to cloud DB
    if (req.method === 'POST') {
      const payload = req.body;
      if (!payload || typeof payload !== 'object') {
        return res.status(400).json({ error: 'Expected JSON object in request body' });
      }

      const snapshot = {
        ...payload,
        lastUpdated: new Date().toISOString(),
      };

      await fetch(NTFY_DB_URL, {
        method: 'POST',
        headers: {
          Title: `Portal DB Snapshot (${new Date().toLocaleTimeString()})`,
          Tags: 'database,floppy_disk',
        },
        body: JSON.stringify(snapshot),
      });

      return res.status(200).json({ success: true, timestamp: snapshot.lastUpdated });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    console.error('[CloudDB Handler Error]:', err);
    return res.status(500).json({ error: err.message || 'Internal Database Error' });
  }
}
