// Pure email-rendering helpers for the notify-email Vercel function.
// No Node/network imports, so they can be unit-tested in isolation
// (see tests/api/notify-email-render.test.ts). The leading underscore
// tells Vercel this is a private helper, not a routable function.

export interface NotificationPayload {
  id: string;
  user_id: string;
  notification_type: string;
  entity_type?: string | null;
  entity_id?: string | null;
  title: string;
  message?: string | null;
  created_at: string;
}

export interface Recipient {
  email: string;
  name: string;
  role: 'broker' | 'lender' | 'admin' | string;
}

export interface RenderOptions {
  brokerAppUrl?: string; // e.g. https://app.plynth.com
  lenderAppUrl?: string; // e.g. https://lender.plynth.com
}

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!)
  );

// Best-effort deep link back into the right portal. Falls back to the
// portal's notifications page, then to "no link" when no base URL is set.
export function buildLink(
  n: NotificationPayload,
  recipient: Recipient,
  opts: RenderOptions
): string | null {
  const base = recipient.role === 'lender' ? opts.lenderAppUrl : opts.brokerAppUrl;
  if (!base) return null;
  const root = base.replace(/\/+$/, '');
  return `${root}/notifications`;
}

export function renderSubject(n: NotificationPayload): string {
  return `Plynth · ${n.title}`;
}

export function renderHtml(
  n: NotificationPayload,
  recipient: Recipient,
  opts: RenderOptions = {}
): string {
  const link = buildLink(n, recipient, opts);
  const greeting = recipient.name ? `Hi ${escapeHtml(recipient.name)},` : 'Hi,';
  const body = n.message ? `<p style="margin:0 0 16px;color:#3f4756;font-size:15px;line-height:1.5">${escapeHtml(n.message)}</p>` : '';
  const button = link
    ? `<a href="${escapeHtml(link)}" style="display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:11px 20px;border-radius:8px;font-size:14px;font-weight:600">View in Plynth</a>`
    : '';

  return `<!DOCTYPE html>
<html>
  <body style="margin:0;background:#f4f6fa;padding:32px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      <tr><td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:14px;overflow:hidden;box-shadow:0 1px 3px rgba(16,24,40,0.08)">
          <tr><td style="padding:24px 28px 0">
            <div style="font-size:13px;font-weight:700;letter-spacing:0.08em;color:#2563eb;text-transform:uppercase">Plynth</div>
          </td></tr>
          <tr><td style="padding:16px 28px 28px">
            <p style="margin:0 0 14px;color:#6b7280;font-size:14px">${greeting}</p>
            <h1 style="margin:0 0 12px;color:#101828;font-size:19px;line-height:1.35">${escapeHtml(n.title)}</h1>
            ${body}
            ${button}
          </td></tr>
          <tr><td style="padding:18px 28px;border-top:1px solid #eef1f6">
            <p style="margin:0;color:#98a2b3;font-size:12px;line-height:1.5">You're receiving this because you have email notifications on for your Plynth account. You can turn these off in your account settings.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

export function renderText(n: NotificationPayload, recipient: Recipient, opts: RenderOptions = {}): string {
  const link = buildLink(n, recipient, opts);
  const lines = [
    recipient.name ? `Hi ${recipient.name},` : 'Hi,',
    '',
    n.title,
    n.message ? `\n${n.message}` : '',
    link ? `\nView in Plynth: ${link}` : '',
    '',
    '— Plynth. Turn off these emails in your account settings.',
  ];
  return lines.filter((l) => l !== undefined).join('\n');
}
