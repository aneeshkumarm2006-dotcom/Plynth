# Plynth — Deployment Runbook

Single Vercel project serves both portals from one build (see `vercel.json`):
`/broker/*` → broker app, `/lender/*` → lender app, `/` → a small hub page.

## 1. Provision Supabase

1. Create a project at [supabase.com](https://supabase.com).
2. Apply the schema — from the repo root, with the Supabase CLI linked to your project:
   ```bash
   supabase link --project-ref <your-ref>
   supabase db push        # applies supabase/migrations/0001 … 0006 in order
   ```
   (Or paste each `supabase/migrations/*.sql` into the SQL editor in order.)
3. **Auth → Providers → Email**: for a smooth first run, disable "Confirm email"
   (the signup flow inserts the profile row immediately after sign-up; with
   confirmation on, the insert is deferred until the user confirms — the auth
   layer surfaces a clear message either way).
4. Copy **Project URL** and **anon public key** from Project Settings → API.

## 2. Local development

```bash
pnpm install
cp apps/broker/.env.example apps/broker/.env.local
cp apps/lender/.env.example apps/lender/.env.local
# paste the URL + anon key into both .env.local files
pnpm dev            # broker → :5173, lender → :5174
```

Leave the env vars unset to run in **mock mode** (fixtures, no backend) — useful
for design review without a database.

## 3. Deploy to Vercel

1. Import the repo into Vercel. The build is fully described by `vercel.json`
   (no framework preset needed; it builds both apps and assembles `dist-vercel/`).
2. Add environment variables (Production + Preview):
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   These are injected at build time (Vite inlines `VITE_*`), so a **redeploy is
   required** after changing them.
3. Deploy. Verify `/broker` and `/lender` both load and that sign-in works.

### Email notifications (`/api/notify-email`) — server-side env (NOT `VITE_`)

Set these on the Vercel project (server-side only; never bundled to the browser):
   - `RESEND_API_KEY` — Resend API key (`re_...`)
   - `EMAIL_FROM` — verified sender, e.g. `Plynth <notifications@plynth.com>`
   - `EMAIL_WEBHOOK_SECRET` — shared secret; also passed to `admin_set_email_config()`
   - `SUPABASE_URL` — project URL (recommended)
   - `SUPABASE_SERVICE_ROLE_KEY` — service-role key (recommended)

   **Set `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY`.** When present, the function
   re-fetches the recipient + content from the database by notification id and
   ignores the request body — so a leaked `EMAIL_WEBHOOK_SECRET` can't be used to
   send arbitrary phishing from your verified domain. Without them it falls back to
   trusting the request body (strictly less secure).

## 4. Custom domains (brokers.plynth.ca / lenders.plynth.ca)

The current `vercel.json` serves both portals under path prefixes on one domain.
To split them onto subdomains there are two options:

- **Simplest**: point both subdomains at the same Vercel project and add rewrites
  so `brokers.plynth.ca/*` → `/broker/*` and `lenders.plynth.ca/*` → `/lender/*`
  (host-based rewrites), and set each app's Vite `base` accordingly.
- **Cleanest**: split into two Vercel projects, one per app (`apps/broker`,
  `apps/lender`), each with its own domain and the same env vars. This drops the
  path-prefix indirection entirely.

This is an open decision — see ROADMAP Phase 7.

## 5. Post-deploy checklist

- [ ] Migrations applied (check `deals`, `offers`, `lender_criteria`, RLS policies exist)
- [ ] A broker can sign up, submit a deal, and see it in their pipeline
- [ ] A lender can set criteria and see matched deals
- [ ] An offer submitted by a lender appears on the broker's deal detail
- [ ] Accept → funding row created, deal status → funded
- [ ] Realtime: a new offer notification reaches the broker without refresh
- [ ] Error tracking wired (Sentry/Datadog — not yet configured; see ROADMAP)

## Known gaps before production

- **Rate limiting** is specified but not enforced; do it at the Supabase edge /
  a gateway, not the client.
- **Match recomputation** runs inline on criteria save for the assumed small
  lender count; batch it if volume grows.
- **Observability** (error + perf monitoring) is not yet wired.
