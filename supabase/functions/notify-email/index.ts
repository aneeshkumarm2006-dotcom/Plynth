// Supabase Edge Function: notify-email
// ----------------------------------------------------------------------------
// Receives a notification payload from the `notifications_send_email` trigger
// (migration 0015) and delivers it to the recipient's inbox via Resend.
//
// Auth: the trigger sends `Authorization: Bearer <EMAIL_WEBHOOK_SECRET>`. We
// reject anything that doesn't match, so the function can't be used as an open
// relay even though it's publicly reachable.
//
// Required environment (set with `supabase secrets set ...`):
//   RESEND_API_KEY        - Resend API key (re_...)
//   EMAIL_FROM            - verified sender, e.g. "Plynth <notifications@plynth.com>"
//   EMAIL_WEBHOOK_SECRET  - shared secret; must equal what you pass to
//                           admin_set_email_config() in the database
// Optional:
//   BROKER_APP_URL        - base URL of the broker portal (for deep links)
//   LENDER_APP_URL        - base URL of the lender portal
// ----------------------------------------------------------------------------

import {
  renderHtml,
  renderText,
  renderSubject,
  type NotificationPayload,
  type Recipient,
} from './render.ts';

interface RequestBody {
  notification: NotificationPayload;
  recipient: Recipient;
}

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method !== 'POST') return json(405, { error: 'method not allowed' });

  const secret = Deno.env.get('EMAIL_WEBHOOK_SECRET');
  const apiKey = Deno.env.get('RESEND_API_KEY');
  const from = Deno.env.get('EMAIL_FROM');

  if (!secret || !apiKey || !from) {
    console.error('notify-email misconfigured: missing EMAIL_WEBHOOK_SECRET / RESEND_API_KEY / EMAIL_FROM');
    return json(500, { error: 'function not configured' });
  }

  // Constant-ish bearer check.
  const auth = req.headers.get('Authorization') ?? '';
  if (auth !== `Bearer ${secret}`) {
    return json(401, { error: 'unauthorized' });
  }

  let payload: RequestBody;
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: 'invalid json' });
  }

  const { notification, recipient } = payload ?? {};
  if (!notification?.title || !recipient?.email) {
    return json(400, { error: 'missing notification.title or recipient.email' });
  }

  const opts = {
    brokerAppUrl: Deno.env.get('BROKER_APP_URL') ?? undefined,
    lenderAppUrl: Deno.env.get('LENDER_APP_URL') ?? undefined,
  };

  const res = await fetch('https://api.resend.com/emails', {
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
      // Lets Resend thread/track per notification without exposing internals.
      headers: { 'X-Entity-Ref-ID': notification.id },
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error(`resend send failed (${res.status}) for ${notification.id}: ${detail}`);
    return json(502, { error: 'email provider error', status: res.status });
  }

  const data = await res.json().catch(() => ({}));
  return json(200, { ok: true, id: data?.id ?? null });
});
