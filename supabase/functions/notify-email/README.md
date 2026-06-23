# notify-email

Mirrors every in-app notification to the user's inbox via **Resend**.

## How it fits together

```
notifications INSERT  (offer/counter/funding triggers, migration 0004)
   └─ trigger notifications_send_email  (migration 0015, runs in Postgres)
        └─ pg_net POST  ──► this Edge Function ──► Resend ──► user inbox
```

The trigger resolves the recipient's email + display name from `user_profiles`,
honours the `email_notifications` opt-out column, and is a **no-op until the
function URL is configured** — so the DB migration is safe to ship before
Resend exists.

## One-time setup (when the Resend key + domain are ready)

1. **Verify a sending domain** in Resend and grab an API key.

2. **Set the function's secrets:**
   ```bash
   supabase secrets set \
     RESEND_API_KEY=re_xxx \
     EMAIL_FROM="Plynth <notifications@yourdomain.com>" \
     EMAIL_WEBHOOK_SECRET="$(openssl rand -hex 32)" \
     BROKER_APP_URL=https://app.plynth.com \
     LENDER_APP_URL=https://lender.plynth.com
   ```

3. **Deploy:**
   ```bash
   supabase functions deploy notify-email
   ```

4. **Point the database at it** (use the *same* secret as `EMAIL_WEBHOOK_SECRET`).
   Run as an admin user:
   ```sql
   select admin_set_email_config(
     'https://<project-ref>.supabase.co/functions/v1/notify-email',
     '<the EMAIL_WEBHOOK_SECRET value>'
   );
   ```

That's it — the next notification of any kind also sends an email.

## Security notes

- Public endpoint, but every request must carry `Authorization: Bearer
  <EMAIL_WEBHOOK_SECRET>`; mismatches get 401. Not an open relay.
- The secret + function URL live in `private.email_config` (RLS on, no
  policies) — unreachable from the anon/authenticated client.
- Recipient email is looked up server-side from `user_profiles`; the client
  never specifies who gets mailed.
- All user-influenced fields (title/message/name) are HTML-escaped in `render.ts`.

## Tests

```bash
deno test supabase/functions/notify-email/render.test.ts
```
