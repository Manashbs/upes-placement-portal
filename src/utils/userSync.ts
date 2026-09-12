import { PortalUser } from '../types';
import { initialUsers } from '../mock/mockData';

const NTFY_TOPIC = 'upes_portal_users_cloud_sync_v3_director_only';
const NTFY_URL = `https://ntfy.sh/${NTFY_TOPIC}`;

/**
 * Fetch latest portal users from cloud topic or /api/users
 */
export async function fetchCloudUsers(): Promise<PortalUser[] | null> {
  try {
    // 1. Try local vercel serverless API
    try {
      const apiRes = await fetch('/api/users', { cache: 'no-store' });
      if (apiRes.ok) {
        const data = await apiRes.json();
        if (Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {}

    // 2. Direct fallback to ntfy.sh json poll
    const res = await fetch(`${NTFY_URL}/json?poll=1&since=all`, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) return null;

    const text = await res.text();
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
      .filter((m) => Array.isArray(m) && m.length > 0);

    if (messages.length > 0) {
      return messages[messages.length - 1];
    }
    return null;
  } catch (e) {
    console.warn('[UserSync] fetch error:', e);
    return null;
  }
}

/**
 * Publish updated portal users to cloud so all devices & browser sessions receive them immediately
 */
export async function publishUsersToCloud(users: PortalUser[]): Promise<boolean> {
  try {
    // Save to localStorage
    try {
      localStorage.setItem('upes_portal_users', JSON.stringify(users));
    } catch {}

    // Publish to ntfy cloud topic
    try {
      await fetch(NTFY_URL, {
        method: 'POST',
        headers: {
          Title: `Portal Users Update (${users.length} accounts)`,
          Tags: 'shield,key',
        },
        body: JSON.stringify(users),
      });
    } catch (err) {
      console.warn('[UserSync] ntfy publish error:', err);
    }

    // Also post to local /api/users
    try {
      await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(users),
      }).catch(() => {});
    } catch {}

    // Dispatch broadcast channel event for same-device cross-tab sync
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        const bc = new BroadcastChannel('upes_users_live_sync');
        bc.postMessage({ type: 'USERS_UPDATED', users });
        bc.close();
      } catch {}
    }

    return true;
  } catch (e) {
    console.error('[UserSync] publishUsersToCloud error:', e);
    return false;
  }
}
