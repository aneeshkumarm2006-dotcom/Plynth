// Shared auth utilities for the /seoteam serverless endpoints:
// constant-time password check, login rate limiting, and a request guard
// that every /api/seo/* CRUD endpoint calls to enforce the session cookie.

import { timingSafeEqual } from 'node:crypto';
import type { VercelReq, VercelRes } from './_http';
import { isAuthed } from './_session';

// Constant-time compare of the submitted password against the env secret.
export function passwordMatches(submitted: string, expected: string): boolean {
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Best-effort, in-memory login throttle — same caveat as notify-email.ts:
// serverless instances aren't shared, so this only slows brute force on a
// single warm instance. For hard cross-instance limits, back it with Vercel
// KV / Upstash. Locks after MAX failures within WINDOW; a success resets.
const WINDOW_MS = 15 * 60_000; // 15 min
const MAX_FAILS = 8;
let failCount = 0;
let windowStart = 0;

export function loginLocked(nowMs: number): boolean {
  if (nowMs - windowStart > WINDOW_MS) {
    windowStart = nowMs;
    failCount = 0;
  }
  return failCount >= MAX_FAILS;
}

export function recordLoginFailure(nowMs: number): void {
  if (nowMs - windowStart > WINDOW_MS) {
    windowStart = nowMs;
    failCount = 0;
  }
  failCount += 1;
}

export function recordLoginSuccess(): void {
  failCount = 0;
}

// Guard for protected endpoints. Returns true when the caller holds a valid
// session cookie; otherwise writes a 401 and returns false so the handler can
// `if (!requireSession(req, res)) return;`.
export function requireSession(req: VercelReq, res: VercelRes): boolean {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    console.error('/api/seo: SESSION_SECRET not configured');
    res.status(500).json({ error: 'auth not configured' });
    return false;
  }
  if (!isAuthed(req, secret, Math.floor(Date.now() / 1000))) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}
