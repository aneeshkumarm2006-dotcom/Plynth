# Plynth — Test Plan

The master checklist for the final testing pass. Hand this to the test-engineer
agent at the end. It captures what's already covered, what still needs testing,
the edge cases per feature, and the **known risk areas** discovered during build.

**Legend:** ✅ done · ☐ to do · ⚠️ known risk / watch closely
**Test types:** `[unit]` Vitest (mock mode) · `[int]` live Supabase integration ·
`[e2e]` full UI journey · `[manual]` human/visual · `[sec]` security/RLS

---

## 0. How to run

```bash
pnpm install
pnpm test                      # unit suite (Vitest, mock mode) — 258 tests today
pnpm --filter @plynth/broker exec tsc --noEmit
pnpm --filter @plynth/lender exec tsc --noEmit
pnpm -r build                  # both apps must build clean
```

**Live integration** needs the real project: env vars are in `apps/*/.env.local`
and `SUPABASE_DB_URL` in `.env`. Demo logins (from `scripts/seed.mjs`):
- Broker: `broker@plynth.test` / `TestBroker2026!` (id `1111…`)
- Lender: `lender@plynth.test` / `TestLender2026!` (id `2222…`)

DB helpers: `node scripts/db.mjs check` (list tables), reusable pg pattern in
`scripts/db.mjs` for ad-hoc read-only queries.

---

## 1. Unit tests — ✅ DONE (258 passing, `tests/`)

Already covered in mock mode; the end pass should keep these green and extend, not redo.

- ✅ `tests/shared/utils*.test.ts` — formatters (`formatCAD`, `formatPercent`, `formatMoneyShort`, `timeAgo`), validators (email/password/loan/LTV/beacon/dealNumber boundaries), `estimateMatchCount` (monotonicity + clamp), status/score label+color thresholds.
- ✅ `tests/lender/present*.test.ts` — `dollars/ltvPct/termLabel/positionLabel/rateLabel/cityProvince/bareAge`, `matchedToCard`/`matchedToSample`/`fundingToRow`, `titleCase`, `beaconBand` thresholds.
- ✅ `tests/broker/present.test.ts` — `dealRowToCard`/`offerToCard` mock-vs-live shape detection, anonymized label wrap, `expiresLabel`, `fundingToRow`.
- ✅ `tests/supabase/criteria*.test.ts` — `builderToRow`/`rowToBuilder` round-trips; close-speed parsing (en-dash + hyphen + 0 bounds).
- ✅ `tests/supabase/services-mock*.test.ts` — fundings/pipeline/lenders/analytics fixture shapes; deal-number allocation; `create` status (active/draft); `update` echo; `submitDraft`.

**Gaps still worth a unit test (mock mode):**
- ☐ `[unit]` `Submit.tsx` `parseRateRange` ("8.5–11%", "8.5-11", "9%", garbage) and `PROPERTY_TYPE_MAP` (every UI option → valid enum value). *Not exported yet — extract or test via a small refactor.*
- ☐ `[unit]` lender `whyMatched(deal, criteria)` in `apps/lender/src/pages/DealDetail.tsx` — pass/fail per factor, beacon/BFS optional branches, null guards. *Currently inline — extract to a testable util.*
- ☐ `[unit]` `offersService.activityForDeal` mock-mode shape + sort order.

---

## 2. Live integration tests `[int]` — ☐ TO DO (highest value, never run for writes)

The unit suite proves logic; these prove **RLS, triggers, and the matching loop**
against the real DB. Read-path was spot-checked once (see §7); **write-path has
never been exercised end to end.**

### 2.1 Broker write-path — ☐ ⚠️ HIGH PRIORITY
- ☐ Sign in as broker → submit a deal via the UI/`dealsService.create`. **⚠️ Verify it inserts** — this exact path had a bug: `property_type` was sent as `'Detached'` into an enum (`residential|commercial|land|multi-residential`). Fixed via `PROPERTY_TYPE_MAP`, but confirm the live insert succeeds and `property_type='residential'`.
- ☐ Confirm `beacon_score`, `exclusion_flags`, `rate_min/max`, `requested_rate_range`, `estimated_value_cents` all persist (they were previously dropped).
- ☐ ⚠️ Submit a **second** deal → confirm `deal_number` auto-increments (was hardcoded `'0252'`; would have collided on the unique `(broker_id, deal_number)` constraint). Test the allocation under two near-simultaneous submits (retry-on-23505 path).
- ☐ Submitting a deal fires the `deals_audit` trigger → an `audit_log` row appears.
- ☐ A new active deal triggers matching for lenders whose criteria fit (see 2.4).

### 2.2 Drafts — ☐
- ☐ "Save draft" creates a `draft` deal with `submitted_at = null`, not matched to lenders.
- ☐ Draft appears in broker Pipeline under the Draft filter with a **Submit** action.
- ☐ Submitting a draft (`submitDraft`, from Pipeline row or DealDetail) flips it to `active`, stamps `submitted_at`, and starts matching.

### 2.3 Edit deal — ☐
- ☐ "Edit deal" panel saves loan amount / term / notes via `dealsService.update`; row updates; `updated_at` changes.
- ☐ ⚠️ Loan amount below `$50,000` (5_000_000 cents) is rejected client-side AND by the DB `valid_loan_amount` check.

### 2.4 Lender criteria → match recompute — ☐
- ☐ Lender saves criteria → `criteriaService.upsert` calls `compute_lender_matches` RPC → `lender_deal_interactions` repopulates with scores.
- ☐ `match_score` values are sane (0–100) and ordering is by score desc.
- ☐ A deal **outside** criteria (wrong province / asset class / over LTV) does NOT appear in matches.
- ☐ Editing criteria changes which deals match ("affects new deals only" semantics).

### 2.5 Offer lifecycle + triggers — ☐ ⚠️
- ☐ Lender submits an offer → `offers` row; `trg_offer_inserted_notify` creates a broker `offer_received` notification AND flips deal `active→offer`.
- ☐ Broker counters (real counter form: rate + note) → `offer_history` row; `trg_offer_history_notify` notifies the lender; deal → `negotiating`.
- ☐ Broker accepts → `offersService.accept`: offer `accepted`, deal `funded`, a `fundings` row is created, `trg_funding_notify` notifies both parties.
- ☐ Broker declines → offer `rejected`.
- ☐ ⚠️ `unique(deal_id, lender_id)` — a lender submitting a second offer on the same deal is handled (no crash; expected behavior defined).
- ☐ Activity timeline (`offersService.activityForDeal`) reflects the real offer + counter history, newest-first, anonymized.

### 2.6 View tracking — ☐
- ☐ Lender opens a deal detail → `recordView` increments `lender_deal_interactions.views_count` (via `increment_view_count` RPC). Confirm it increments and is idempotent-ish per the RPC's logic.

### 2.7 Notifications + realtime — ☐
- ☐ Notification bell shows unread count; mark-read / mark-all-read update `is_read`.
- ☐ Realtime: with two sessions open, an offer/counter/funding pushes a notification live (no refresh).
- ☐ ⚠️ Multiple subscriptions for the same user don't crash — regression test for the "cannot add postgres_changes after subscribe()" bug (fixed via unique channel names in `notifications.ts`). Open Dashboard + Matched + bell simultaneously.
- ☐ Lender Matched/Dashboard only refetch on `new_match` notifications (not on every insert).

---

## 3. End-to-end journeys `[e2e]` — ☐ TO DO (Cypress/Playwright)

- ☐ **Full deal lifecycle:** broker signs up → submits deal → lender (matching criteria) sees it in Matched → makes an offer → broker counters → lender re-counters (lender-side counter is currently broker-only; confirm/scope) → broker accepts → deal funds → both see it in Funded.
- ☐ **Broker signup (3-step):** account → FSRA license + province → profile. Profile row created; `verification_status` handling.
- ☐ **Lender signup (4-step):** account → firm → criteria builder (embedded) → subscription tier. Criteria persisted on completion.
- ☐ **Auth:** login, logout, forgot-password email, reset-password. Session persists across reload (`storageKey: 'plynth.session'`).
- ☐ **Mock-mode parity:** with env vars unset the app runs on fixtures and every screen still renders (demo mode) — no white screens.

---

## 4. Feature test cases + edge cases (by area)

### 4.1 Submit-deal flow — ☐
- ☐ LTV auto-computes from loan ÷ appraised value; 0 appraised value → no divide-by-zero.
- ☐ `parseRateRange`: "8.5–11%" → {8.5,11}; "9%" → {9,9}; "abc" → {}.
- ☐ Property flags chips toggle and persist into `exclusion_flags`.
- ☐ Beacon band → representative score (`BEACON_BANDS`); review step shows chosen band + flags.
- ☐ ⚠️ Address parsing is fragile — city/province from trailing comma tokens. Test a non-standard address; province falls back to `ON` when not a valid code.
- ☐ Document drop + "AI extraction" is **mocked** (fake values) — verify it's clearly a stub, not asserted as real.

### 4.2 Criteria builder — ☐
- ☐ Live preview count (`estimateMatchCount`) updates as sliders/chips change (debounced 200ms).
- ☐ Dual-thumb sliders (loan size, term) can't cross over; LTV 1st/2nd independent.
- ☐ Sample matches in the panel come from live matched data on the Criteria page; onboarding uses the fixture default.
- ☐ Save shows "affects new deals only" note; triggers recompute.
- ⚠️ Geography is a **province/city chip selector, not the spec'd interactive Canada map** — known fidelity gap, not a bug.

### 4.3 Matched feed — ☐
- ☐ Asset-class filter chips + sort (Best / Newest). ⚠️ "Expiring soon" sort is a **no-op** (no backing field) — confirm it's inert, scope a fix.
- ☐ Empty + loading (skeleton) states.

### 4.4 Pipeline — ☐
- ☐ Broker: status filters (all/active/offer/negotiating/draft); draft Submit action; row → deal detail.
- ☐ Lender: 5 columns (Reviewing→Offered→In Negotiation→Funded→Dead) populate from offers+matched+fundings. ⚠️ **No drag-and-drop** (read-only) — known gap.

### 4.5 Deal detail (both) — ☐
- ☐ Facts now read real columns (property type, appraised value, beacon band, rate) — verify they reflect the actual deal, not the old `$590,000`/`680–720` literals.
- ☐ Lender "Why this matched" computed factors match the deal vs the lender's criteria (✓/✕ correct).
- ☐ Offer cards: accept/counter/decline busy states + error toasts; "Leading offer" badge on best.
- ☐ `[unit]` `effectiveAnnualCost(rate, lenderFee, brokerFee, term)` = rate + fees annualized over term (✅ unit-tested). Verify the broker offer card shows "Effective annual cost" and flags the **lowest true cost** offer — which can differ from the lowest rate (the point of the feature).
- ☐ Borrower reveal button calls `revealBorrowerTo`. ⚠️ See §6 — reveal is **not yet enforced** (lender can read borrower fields regardless); display-only today.

### 4.6 Analytics / dashboards — ☐
- ☐ Broker stat strip (`brokerStats`): active deals, offers in, funded this month, volume YTD — counts match DB.
- ☐ Lender stat strip (`lenderStats`) + sidebar (`lenderSidebar`): new matches, offers out, funded YTD, deployment rate, win rate, avg response — verify formulas against seeded data.
- ☐ Funded pages: YTD volume + avg rate derived correctly; broker "Lender" column / lender "Broker" column anonymized.

### 4.7 Settings / account — ☐
- ☐ Broker Settings: profile/brokerage/notifications/billing tabs; Activity log + **CSV export** (`auditService.toCSV`) downloads. ⚠️ `changes`/`user_agent` columns are fetched but not displayed.
- ☐ Lender Account: subscription tier, usage stats, plan switch. ⚠️ Stripe payment is a **static mock** (`•••• 4242`).

---

## 5. ⚠️ Known risk areas / regression watch

Each of these is a real edge the build surfaced — assert them explicitly.

1. ⚠️ **`property_type` enum** — UI labels must map to `residential|commercial|land|multi-residential`. Any unmapped value = insert rejected. (`Submit.tsx` `PROPERTY_TYPE_MAP`.)
2. ⚠️ **`deal_number` allocation** — max+1 per broker, zero-padded, retry on `23505`. Test concurrent submits.
3. ⚠️ **Close-speed parser** — `builderToRow` now accepts en-dash OR hyphen and honours `0`. Regression test "5-30 days" → {5,30}.
4. ⚠️ **Realtime channel uniqueness** — multiple `subscribe()` calls per user must not throw. (`notifications.ts` channel-name counter.)
5. ⚠️ **Mock/live shape detection** — broker presenters branch on `typeof loan_amount_cents`/`rate_percent`. A schema change to those types could silently flip the branch.
6. ⚠️ **`valid_loan_amount` / `valid_ltv` checks** — client validation must mirror the DB CHECK constraints (≥ $50k; 0 < LTV ≤ 100).
7. ⚠️ **Address → province** parsing fragility (see 4.1).

---

## 6. 🔒 Security / RLS test matrix `[sec]` — ☐ (run with the DB-isolation pass)

Spot-checked once (broker+lender read-scoping + one cross-tenant check passed).
The full matrix is still TODO:

- ☐ Broker A cannot read Broker B's deals/offers/fundings/notifications/audit log.
- ☐ Lender cannot read another lender's `lender_criteria` (✅ verified once) / offers / interactions.
- ☐ Lender CAN read all active deals (by design) but a broker cannot read `lender_deal_interactions` (RLS blocks — this is why the broker "N viewed" needs a SECURITY DEFINER fn).
- ☐ `offers` visible only to the owning lender + the deal's broker.
- ☐ A user cannot INSERT a row impersonating another (`broker_id`/`lender_id` = `auth.uid()` enforced).
- ☐ Anon (logged-out) is denied on every table except the signup `user_profiles` insert path.
- ☐ ⚠️ **Borrower privacy** — currently `borrower_name`/`beacon_score` are readable by any lender via RLS; the "anonymize until reveal" is UI-only. Test that, once enforced, a lender NOT in `borrower_details_revealed_to` cannot read borrower PII (column mask / view).
- ☐ Input sanitization at boundaries (XSS in notes/firm name/address; the unit suite checks `validateDealNumber` rejects injection shapes).

---

## 7. Already verified once `[int]` — ✅ (re-confirm in the final pass)

- ✅ Both demo users sign in; RLS-scoped reads work (lender sees 7 deals/3 matches/own criteria/offers; broker sees own 7 deals/offers/fundings/notifications).
- ✅ Cross-tenant: broker reading `lender_criteria` → 0 rows.
- ✅ Grants correct: `authenticated` has full CRUD; `anon` blocked on `deals`.
- ✅ Schema applied (migrations 0001–0006); triggers fire (seed produced 10 notifications, 2 fundings, audit entries).

---

## 8. Deferred features — test once built (the "DB pass")

These are not built yet; add tests when they land:
- ☐ Offer-expiry cron — `expire_offers()` exists but **nothing schedules it**; offers never actually expire (a broker can accept an "expired" offer). Test the scheduled job flips past-due offers and frees the deal.
- ☐ Broker demand signal ("N lenders matched/viewed") — needs a SECURITY DEFINER aggregate over `lender_deal_interactions`; test it returns counts only, never lender identities (k-anonymity).
- ☐ Borrower-reveal enforcement (see §6).
- ☐ Stripe billing, FSRA verification, document upload to Storage (each needs external setup).

---

## 9. Cross-cutting `[manual]`

- ☐ Mobile: sidebar → horizontal nav at ≤768px; stat strips/tables stack. ⚠️ Inline two-column page grids (dashboard/criteria/deal-detail) do NOT collapse — known limitation, verify it's tolerable.
- ☐ Motion: 200ms fades, no springs; reduced-motion respected.
- ☐ Error states: every service call has a failure toast; no unhandled promise rejections in console.
- ☐ Tabular figures on all currency/%/LTV/term/deal numbers (the institutional look).
- ☐ Performance: dashboard + matched feed load under a realistic deal volume; matching fn on a few hundred deals.

---

_Last updated alongside the Tier 0 build. Keep this in sync as features land so the
final agent run has a complete, current brief._
