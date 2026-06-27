// Vercel Serverless Function (Node.js runtime) — POST /api/notify-email
// ----------------------------------------------------------------------------
// Receives a notification payload from the `notifications_send_email` Postgres
// trigger (migration 0015) and delivers it to the recipient's inbox via Resend.
//
// Auth: the trigger sends `Authorization: Bearer <EMAIL_WEBHOOK_SECRET>`. We
// reject anything that doesn't match, so the public endpoint can't be abused
// as an open relay.
//
// Environment (Vercel → Project → Settings → Environment Variables, Production):
//   RESEND_API_KEY        - Resend API key (re_...)            [keep secret]
//   EMAIL_FROM            - verified sender, e.g. "Plynth <notifications@plynth.com>"
//   EMAIL_WEBHOOK_SECRET  - shared secret; must equal what you pass to
//                           admin_set_email_config() in the database
//   BROKER_APP_URL        - base URL of the broker portal (for deep links)  [optional]
//   LENDER_APP_URL        - base URL of the lender portal                   [optional]
//   SUPABASE_URL          - project URL, e.g. https://xxxx.supabase.co  [recommended]
//   SUPABASE_SERVICE_ROLE_KEY - service-role key, server-side only      [recommended]
//
// SECURITY: when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set, the
// recipient address and notification content are RE-FETCHED from the
// database by notification id and the request body is ignored. This means
// that even if EMAIL_WEBHOOK_SECRET leaks, an attacker cannot use this
// endpoint to send arbitrary content to arbitrary addresses from Plynth's
// verified domain. Set both in production. (Without them it falls back to
// trusting the trigger-supplied body — strictly less safe.)
//
// None of these are VITE_-prefixed, so they are NEVER bundled into the
// browser — they exist only in this server-side function.
// ----------------------------------------------------------------------------

import { timingSafeEqual } from 'node:crypto';
import { renderHtml, renderText, renderSubject } from './_render';
import type { NotificationPayload, Recipient } from './_render';

// Constant-time bearer comparison — a plain `!==` short-circuits on the first
// differing byte, leaking the secret one byte at a time under timing analysis.
function bearerMatches(header: string | string[] | undefined, expected: string): boolean {
  const got = Array.isArray(header) ? header[0] ?? '' : header ?? '';
  const a = Buffer.from(got);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

// Best-effort, in-memory rate limit. NOTE: serverless instances are
// ephemeral and not shared, so this only throttles bursts hitting the same
// warm instance — it is a cheap backstop, not a guarantee. For hard limits
// across instances use Vercel KV / Upstash Ratelimit. Caps total sends per
// rolling window so a leaked secret can't trivially blast the Resend quota.
const RL_WINDOW_MS = 60_000;
const RL_MAX = 60;
let rlWindowStart = 0;
let rlCount = 0;
function rateLimited(nowMs: number): boolean {
  if (nowMs - rlWindowStart > RL_WINDOW_MS) {
    rlWindowStart = nowMs;
    rlCount = 0;
  }
  rlCount += 1;
  return rlCount > RL_MAX;
}

// Re-fetch the notification + recipient from the DB (service role) so the
// caller cannot choose who gets mailed or what it says. Returns null if the
// notification doesn't exist or the recipient has opted out / has no email.
async function resolveFromDb(
  supabaseUrl: string,
  serviceKey: string,
  notificationId: string
): Promise<{ notification: NotificationPayload; recipient: Recipient } | null> {
  const h = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` };
  const base = supabaseUrl.replace(/\/$/, '');

  const nRes = await fetch(
    `${base}/rest/v1/notifications?id=eq.${encodeURIComponent(notificationId)}` +
      `&select=id,user_id,notification_type,entity_type,entity_id,title,message,created_at`,
    { headers: h }
  );
  if (!nRes.ok) throw new Error(`notification lookup failed (${nRes.status})`);
  const nRows = (await nRes.json()) as NotificationPayload[];
  const n = nRows?.[0];
  if (!n) return null;

  const pRes = await fetch(
    `${base}/rest/v1/user_profiles?id=eq.${encodeURIComponent(n.user_id)}` +
      `&select=email,first_name,last_name,firm_name,brokerage_name,role,email_notifications`,
    { headers: h }
  );
  if (!pRes.ok) throw new Error(`recipient lookup failed (${pRes.status})`);
  const pRows = (await pRes.json()) as Array<{
    email: string | null;
    first_name: string | null;
    last_name: string | null;
    firm_name: string | null;
    brokerage_name: string | null;
    role: string;
    email_notifications: boolean;
  }>;
  const p = pRows?.[0];
  if (!p || !p.email || p.email_notifications === false) return null;

  const name =
    [p.first_name, p.last_name].filter(Boolean).join(' ').trim() ||
    p.firm_name ||
    p.brokerage_name ||
    p.email.split('@')[0];

  return { notification: n, recipient: { email: p.email, name, role: p.role } };
}

// Minimal request/response shapes — avoids a build-time @vercel/node dependency
// while staying typed for the fields we actually use.
interface VercelReq {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
}
interface VercelRes {
  status(code: number): VercelRes;
  json(body: unknown): void;
}

function safeParse(s: string): unknown {
  try { return JSON.parse(s); } catch { return null; }
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'POST') { res.status(405).json({ error: 'method not allowed' }); return; }

  const secret = process.env.EMAIL_WEBHOOK_SECRET;
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!secret || !apiKey || !from) {
    console.error('notify-email misconfigured: missing EMAIL_WEBHOOK_SECRET / RESEND_API_KEY / EMAIL_FROM');
    res.status(500).json({ error: 'function not configured' });
    return;
  }

  const auth = req.headers['authorization'];
  if (!bearerMatches(auth, `Bearer ${secret}`)) { res.status(401).json({ error: 'unauthorized' }); return; }

  if (rateLimited(Date.now())) {
    res.status(429).json({ error: 'rate limited' });
    return;
  }

  const payload = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as
    { notification?: NotificationPayload; recipient?: Recipient } | null;

  // Prefer the trusted DB re-fetch (keyed by notification id) over the
  // request body, so the caller can't pick the recipient or the content.
  // Falls back to the body only when the service-role env isn't configured.
  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  let notification: NotificationPayload | undefined;
  let recipient: Recipient | undefined;

  if (supabaseUrl && serviceKey) {
    const id = payload?.notification?.id;
    if (!id) { res.status(400).json({ error: 'missing notification.id' }); return; }
    try {
      const resolved = await resolveFromDb(supabaseUrl, serviceKey, id);
      if (!resolved) { res.status(200).json({ ok: true, skipped: 'no recipient / opted out' }); return; }
      notification = resolved.notification;
      recipient = resolved.recipient;
    } catch (e) {
      console.error('notify-email db resolve failed:', (e as Error).message);
      res.status(502).json({ error: 'recipient lookup failed' });
      return;
    }
  } else {
    console.warn('notify-email: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set — trusting request body (less secure)');
    notification = payload?.notification;
    recipient = payload?.recipient;
  }

  if (!notification?.title || !recipient?.email) {
    res.status(400).json({ error: 'missing notification.title or recipient.email' });
    return;
  }

  const opts = {
    brokerAppUrl: process.env.BROKER_APP_URL || undefined,
    lenderAppUrl: process.env.LENDER_APP_URL || undefined,
  };

  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      from,
      to: [recipient.email],
      subject: renderSubject(notification),
      html: renderHtml(notification, recipient, opts),
      text: renderText(notification, recipient, opts),
      headers: { 'X-Entity-Ref-ID': notification.id },
    }),
  });

  if (!r.ok) {
    const detail = await r.text();
    console.error(`resend send failed (${r.status}) for ${notification.id}: ${detail}`);
    res.status(502).json({ error: 'email provider error', status: r.status });
    return;
  }

  const data = (await r.json().catch(() => ({}))) as { id?: string };
  res.status(200).json({ ok: true, id: data?.id ?? null });
}
