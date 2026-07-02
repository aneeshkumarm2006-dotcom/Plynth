// Signed session cookie for the /seoteam dashboard.
// -----------------------------------------------------------------------------
// The dashboard authenticates with a single shared password (SEO_DASHBOARD_
// PASSWORD). On success we hand back an httpOnly, Secure, SameSite=Lax cookie
// whose value is `base64url(payload).hmac`, signed with SESSION_SECRET. There is
// no server-side session store — the HMAC is the whole guarantee, so the payload
// is small (just an expiry) and every byte is verified in constant time.
//
// Uses only node:crypto (no dependency), same primitive family as the
// timingSafeEqual bearer check in notify-email.ts.

import { createHmac, timingSafeEqual } from 'node:crypto';
import type { VercelReq } from './_http';
import { parseCookies } from './_http';

export const SESSION_COOKIE = 'plynth_seo';

interface SessionPayload {
  exp: number; // unix seconds
}

function b64url(buf: Buffer): string {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s: string): Buffer {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  return Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

function sign(payloadB64: string, secret: string): string {
  return b64url(createHmac('sha256', secret).update(payloadB64).digest());
}

// Constant-time string compare that never short-circuits on length.
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export function ttlSeconds(): number {
  const days = Number(process.env.SEO_SESSION_TTL_DAYS) || 7;
  return Math.max(1, Math.floor(days)) * 24 * 60 * 60;
}

// Mint a signed token that expires `ttlSeconds` from `nowSec`.
export function createToken(secret: string, nowSec: number): string {
  const payload: SessionPayload = { exp: nowSec + ttlSeconds() };
  const payloadB64 = b64url(Buffer.from(JSON.stringify(payload)));
  return `${payloadB64}.${sign(payloadB64, secret)}`;
}

// Verify signature and expiry. Returns true only for an intact, unexpired token.
export function verifyToken(token: string | undefined, secret: string, nowSec: number): boolean {
  if (!token) return false;
  const dot = token.indexOf('.');
  if (dot < 0) return false;
  const payloadB64 = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!safeEqual(sig, sign(payloadB64, secret))) return false;
  try {
    const payload = JSON.parse(fromB64url(payloadB64).toString('utf8')) as SessionPayload;
    return typeof payload.exp === 'number' && payload.exp > nowSec;
  } catch {
    return false;
  }
}

// Set-Cookie value that establishes the session.
export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${ttlSeconds()}`;
}

// Set-Cookie value that clears the session (logout).
export function clearCookie(): string {
  return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

// Read + verify the session cookie off an incoming request.
export function isAuthed(req: VercelReq, secret: string, nowSec: number): boolean {
  const token = parseCookies(req)[SESSION_COOKIE];
  return verifyToken(token, secret, nowSec);
}
