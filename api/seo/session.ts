// GET /api/seo/session — reports whether the caller holds a valid session.
// Used by the dashboard SPA on load to decide login screen vs editor.

import type { VercelReq, VercelRes } from '../_http';
import { isAuthed } from '../_session';

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('/api/seo/session: SESSION_SECRET not configured');
    res.status(500).json({ error: 'auth not configured' });
    return;
  }
  const authed = isAuthed(req, secret, Math.floor(Date.now() / 1000));
  res.status(authed ? 200 : 401).json({ authenticated: authed });
}
