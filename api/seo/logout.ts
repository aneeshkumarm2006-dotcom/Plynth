// POST /api/seo/logout — clears the session cookie.

import type { VercelReq, VercelRes } from '../_http';
import { clearCookie } from '../_session';

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }
  res.setHeader('Set-Cookie', clearCookie());
  res.status(200).json({ ok: true });
}
