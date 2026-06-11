# Plynth Roadmap

Phase-by-phase tracker. Status reflects what's actually wired up in the codebase, not just what files exist.

**Legend**: ✅ done · 🟡 partial / scaffold only · ⏳ not started

---

## Phase 0 — Foundation ✅

- [x] Monorepo (pnpm workspaces, broker + lender apps, shared packages)
- [x] Database schema (6 migrations: tables, RLS, matching fn, triggers, grants)
- [x] Architecture doc + API contract
- [x] Single-project Vercel deploy config

---

## Phase 1 — Auth & Onboarding ✅

- [x] Broker signup (3-step: account → license → profile)
- [x] Lender signup (4-step: account → firm → criteria → subscription)
- [x] Login flows (both portals)
- [x] Forgot / reset password
- [x] Auth context with mock-mode fallback (`packages/supabase/src/auth.ts`)

**Remaining**: end-to-end test against real Supabase project (currently runs in mock mode).

---

## Phase 2 — Broker Portal ✅

UI built and wired to the service layer (mock fallback identical in mock mode).

- [x] Dashboard — `analyticsService.brokerStats` + `dealsService` + `fundingsService`
- [x] Deal submission — `dealsService.create` (dollars → cents)
- [x] Pipeline (filter + sort) — `dealsService.listForBroker`
- [x] Deal detail — `dealsService.getById` + `offersService.listForDeal`
- [x] Lenders directory — `lendersService.listDirectory`
- [x] Funded deals page — `fundingsService.listForBroker`
- [x] Replace mock data with service-layer queries (+ `apps/broker/src/lib/present.ts`)
- [x] Wire offer accept / counter / reject to backend (`offersService`)
- [x] Borrower reveal flow (PIPEDA — per-lender reveal via `dealsService.revealBorrowerTo`)

**Improvised / follow-ups** (see doubts): dashboard focus "quote" + "new offers" column are
still derived from deal status (no per-deal offer-count aggregate); counter shaves a fixed
0.25% (no counter form yet); activity timeline still fixture; `deal_number` allocation is
hardcoded in Submit (needs a sequence service).

---

## Phase 3 — Lender Portal ✅

UI built and wired to the service layer. Runs on live Supabase queries when
configured, falling back to fixtures in mock mode (visuals identical).

- [x] Dashboard — `matchedService` (focus = top match, today's matches)
- [x] Matched deals feed (filter by asset class, sort by best/newest/expiring) — `matchedService`
- [x] Deal detail (with match score bar) — `matchedService.getForLender`
- [x] Criteria builder (~590 lines, full form state) — `criteriaService`
- [x] Offer composer — wired to `offersService.submit` (controlled form)
- [x] Pipeline — `pipelineService` (derives columns from matched + offers + fundings)
- [x] Funded — `fundingsService` (YTD volume + avg rate derived from the set)
- [x] Account / subscription management
- [x] Replace mocks with live queries (via service layer + presenter mappers)
- [x] Wire offer submission to backend

**New in this pass**: `fundingsService`, lender `pipelineService`, `matchedService.getForLender`,
and `apps/lender/src/lib/present.ts` (DB-row → display-shape mappers).

**Remaining**: dashboard stat strip (Funded YTD / Deployment Rate / Win Rate / Avg Response)
still fixture-backed — needs an analytics aggregation endpoint (Phase 4). End-to-end test
against a real Supabase project.

---

## Phase 4 — Real-Time Matching ✅

- [x] `compute_lender_matches()` Postgres function (migration 0003)
- [x] Notification triggers (migration 0004)
- [x] RLS policies (migration 0002)
- [x] Trigger match recomputation when lender saves criteria (`criteriaService.upsert` → RPC)
- [x] Supabase Realtime subscription (lender Dashboard + Matched refetch on notification insert)
- [x] Live preview in criteria builder ("would have matched N deals…") — `estimateMatchCount`
- [x] In-app notification UI + badge (`NotificationBell` wired in both shells)
- [x] Dashboard analytics aggregation (`analyticsService` — broker + lender stat strips)

**Remaining**: realtime currently refetches on any notification insert (no type filtering);
Win Rate / Avg Response sidebar stats still fixture-backed (no aggregate query yet).

---

## Phase 5 — Secondary Features 🟡

- [x] Password reset (email flow)
- [x] Settings pages (broker + lender)
- [x] Audit log export (CSV download in broker Settings via `auditService.toCSV`)
- [x] Mobile responsiveness pass — sidebar → sticky horizontal nav at ≤768px; stat
      strips/tables stack. **Not device-verified**, and inline two-column page grids
      (dashboard/criteria/deal-detail) don't collapse (inline styles beat CSS) — see doubts.
- [ ] Rate limiting (100 req/min per user) — **must be enforced server-side** (Supabase
      edge/gateway), not the client. Buttons disable during in-flight submits, but that is
      not rate limiting. Deferred to backend.

---

## Phase 6 — Testing 🟡

- [x] Vitest setup (root `vitest.config.ts`, `pnpm test`) + 91 unit tests across 4 files:
      matching heuristic, formatters, validators, present.ts mappers, criteria round-trip,
      mock-mode service shapes
- [ ] Cypress E2E (broker signup → submit deal → lender match → offer → accept → fund)
- [ ] RLS policy tests (isolation between brokers, lender visibility scope) — needs a live
      Supabase project
- [ ] Security audit (XSS, CSRF, input validation at boundaries)
- [ ] Performance: matching fn on realistic data volume

---

## Phase 7 — Launch 🟡

- [x] `vercel.json` with broker/lender path rewrites
- [x] `.env.example` templates (broker + lender)
- [x] Deploy runbook (`DEPLOY.md` — provisioning, Vercel, domains, post-deploy checklist)
- [ ] Production Supabase project + env vars in Vercel  ← **blocked on Supabase URL**
- [ ] Observability (Sentry or Datadog — error tracking + perf)
- [ ] Domain setup: `brokers.plynth.ca`, `lenders.plynth.ca` (decision in DEPLOY.md §4)
- [ ] Beta waitlist / invite flow
- [ ] Runbook for incident response

---

## Immediate next steps

1. **Provision the Supabase project** and populate env vars in both apps + Vercel
   (everything else runs in mock mode until then — this is the one true blocker).
2. Run the post-deploy checklist in `DEPLOY.md` against the live project (the first
   real end-to-end pass: broker submit → lender match → offer → accept → fund).
3. Close the small follow-ups flagged in Phase 2/4 doubts (counter form, deal-number
   sequence, notification-type filtering, Win Rate/Avg Response aggregates).
4. Add Cypress E2E + RLS isolation tests once the live project exists.
