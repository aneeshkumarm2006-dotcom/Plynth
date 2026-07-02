// POST /api/seo/login
// -----------------------------------------------------------------------------
// Shared-password login for the /seoteam dashboard. Constant-time compare,
// best-effort rate limit, and on success a signed httpOnly session cookie.

import type { VercelReq, VercelRes } from '../_http';
import { jsonBody } from '../_http';
import { passwordMatches, loginLocked, recordLoginFailure, recordLoginSuccess } from '../_seoAuth';
import { createToken, sessionCookie } from '../_session';

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const password = process.env.SEO_DASHBOARD_PASSWORD;
  const secret = process.env.SESSION_SECRET;
  if (!password || !secret) {
    console.error('/api/seo/login: SEO_DASHBOARD_PASSWORD / SESSION_SECRET not configured');
    res.status(500).json({ error: 'auth not configured' });
    return;
  }

  const now = Date.now();
  if (loginLocked(now)) {
    res.status(429).json({ error: 'too many attempts — try again later' });
    return;
  }

  const body = jsonBody(req);
  const submitted = typeof body?.password === 'string' ? body.password : '';
  if (!submitted || !passwordMatches(submitted, password)) {
    recordLoginFailure(now);
    res.status(401).json({ error: 'invalid password' });
    return;
  }

  recordLoginSuccess();
  const token = createToken(secret, Math.floor(now / 1000));
  res.setHeader('Set-Cookie', sessionCookie(token));
  res.status(200).json({ ok: true });
}
