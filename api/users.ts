import type { VercelRequest, VercelResponse } from '@vercel/node';

const NTFY_TOPIC = 'upes_portal_users_cloud_sync_v2';
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

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
      const resp = await fetch(`${NTFY_URL}/json?poll=1&since=all`, {
        headers: { 'Cache-Control': 'no-cache' },
      });
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
        .filter(Boolean);

      // Return latest users list published
      const latest = messages.length > 0 ? messages[messages.length - 1] : null;
      return res.status(200).json(latest || []);
    }

    if (req.method === 'POST') {
      const usersList = req.body;
      if (!usersList || !Array.isArray(usersList)) {
        return res.status(400).json({ error: 'Expected users array in body' });
      }

      await fetch(NTFY_URL, {
        method: 'POST',
        headers: {
          Title: `Portal Users Sync (${usersList.length} accounts)`,
          Tags: 'shield,key',
        },
        body: JSON.stringify(usersList),
      });

      return res.status(200).json({ success: true, count: usersList.length });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
}
