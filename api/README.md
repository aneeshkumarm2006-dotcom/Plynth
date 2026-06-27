# /api — Vercel Serverless Functions

## notify-email

Mirrors every in-app notification to the user's inbox via **Resend**.

### How it fits together

```
notifications INSERT  (offer/counter/funding triggers, migration 0004)
   └─ trigger notifications_send_email  (migration 0015, runs in Postgres)
        └─ pg_net POST  ──► /api/notify-email (Vercel) ──► Resend ──► inbox
```

The trigger resolves the recipient's email + display name from `user_profiles`,
honours the `email_notifications` opt-out column, and is a **no-op until the
function URL is configured** — so the DB migration is safe to ship before
Resend exists.

### One-time setup (when the Resend key + domain are ready)

1. **Verify a sending domain** in Resend and grab an API key.

2. **Add env vars in Vercel** → Project → Settings → Environment Variables
   (Production). None are `VITE_`-prefixed, so they stay server-side only:

   | Name | Example |
   |---|---|
   | `RESEND_API_KEY` | `re_...` |
   | `EMAIL_FROM` | `Plynth <notifications@yourdomain.com>` |
   | `EMAIL_WEBHOOK_SECRET` | output of `openssl rand -hex 32` |
   | `BROKER_APP_URL` | `https://<your-app>.vercel.app/broker` |
   | `LENDER_APP_URL` | `https://<your-app>.vercel.app/lender` |

3. **Deploy** (push to the branch Vercel builds, or `vercel --prod`). The
   function is live at `https://<your-app>.vercel.app/api/notify-email`.

4. **Point the database at it** (same secret as `EMAIL_WEBHOOK_SECRET`).
   Run as an admin user in the Supabase SQL editor:
   ```sql
   select admin_set_email_config(
     'https://<your-app>.vercel.app/api/notify-email',
     '<the EMAIL_WEBHOOK_SECRET value>'
   );
   ```

### ⚠️ Vercel Deployment Protection

If your project has **Deployment Protection / Vercel Authentication** enabled,
Vercel will gate `/api/notify-email` behind SSO and Supabase's `pg_net` POST
will get a 401 HTML page instead of reaching the function. Either disable
protection for Production, or add a **Protection Bypass for Automation** and
send its token. Our own `EMAIL_WEBHOOK_SECRET` bearer check is what actually
secures the endpoint.

### Security notes

- Public endpoint, but every request must carry `Authorization: Bearer
  <EMAIL_WEBHOOK_SECRET>`; mismatches get 401. Not an open relay.
- The secret + function URL live in `private.email_config` (RLS on, no
  policies) — unreachable from the anon/authenticated client.
- Recipient email is looked up server-side from `user_profiles`; the client
  never specifies who gets mailed.
- All user-influenced fields (title/message/name) are HTML-escaped in `_render.ts`.

### Tests

Render logic is covered by the main Vitest suite:
```bash
pnpm test tests/api/notify-email-render.test.ts
```
