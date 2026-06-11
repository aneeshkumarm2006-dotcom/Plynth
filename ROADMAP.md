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

## Phase 2 — Broker Portal 🟡

UI is built; data layer is mocked.

- [x] Dashboard (stats, recent activity)
- [x] Deal submission (multi-step form)
- [x] Pipeline (filter + sort)
- [x] Deal detail (offers list, actions)
- [x] Lenders directory
- [x] Funded deals page
- [ ] Replace mock data (`LENDER_MOCK`) with Supabase queries
- [ ] Wire offer accept / counter actions to backend
- [ ] Borrower reveal flow (PIPEDA — explicit per-lender reveal)

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

## Phase 4 — Real-Time Matching 🟡

SQL is done; client wiring is not.

- [x] `compute_lender_matches()` Postgres function (migration 0003)
- [x] Notification triggers (migration 0004)
- [x] RLS policies (migration 0002)
- [ ] Trigger match recomputation when lender saves criteria
- [ ] Supabase Realtime subscription in lender app (new matches, new offers)
- [ ] Live preview in criteria builder ("would have matched 47 deals…") — client-side heuristic
- [ ] In-app notification UI + badge

---

## Phase 5 — Secondary Features 🟡

- [x] Password reset (email flow)
- [x] Settings pages (broker + lender)
- [ ] Audit log export (CSV/JSON, 7-year retention requirement)
- [ ] Mobile responsiveness pass (CSS exists, not verified on real devices)
- [ ] Rate limiting (100 req/min per user — spec'd, not enforced)

---

## Phase 6 — Testing ⏳

Nothing in place yet.

- [ ] Vitest setup + unit tests (matching score logic, form validation, auth helpers)
- [ ] Cypress E2E (broker signup → submit deal → lender match → offer → accept → fund)
- [ ] RLS policy tests (isolation between brokers, lender visibility scope)
- [ ] Security audit (XSS, CSRF, input validation at boundaries)
- [ ] Performance: matching fn on realistic data volume

---

## Phase 7 — Launch ⏳

- [x] `vercel.json` with broker/lender path rewrites
- [ ] Production Supabase project + env vars in Vercel
- [ ] Observability (Sentry or Datadog — error tracking + perf)
- [ ] Domain setup: `brokers.plynth.ca`, `lenders.plynth.ca`
- [ ] Beta waitlist / invite flow
- [ ] Runbook for incident response

---

## Immediate next steps

1. Provision real Supabase project; populate env vars.
2. Replace `LENDER_MOCK` and equivalent broker mocks with live Supabase queries (start with broker dashboard + deal submission).
3. Wire the criteria-save → match-recompute → realtime-push loop end-to-end on one deal flow.
4. Add Vitest with one passing test as scaffold before feature work resumes.
