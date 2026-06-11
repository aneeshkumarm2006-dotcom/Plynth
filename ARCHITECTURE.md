# Plynth Architecture Documentation

## Overview

Plynth is a B2B marketplace connecting Canadian mortgage brokers and private lenders. This monorepo contains:
- Two separate React 19 portals: `brokers.plynth.ca` and `lenders.plynth.ca`
- Shared design system, types, and utilities
- PostgreSQL backend (Supabase)
- Real-time matching algorithm

## Directory Structure

```
plynth/
├── apps/
│   ├── broker/          # Broker portal React app
│   └── lender/          # Lender portal React app
├── packages/
│   ├── shared/          # Shared types, utilities, hooks
│   └── supabase/        # Supabase client configuration
├── supabase/
│   ├── migrations/      # SQL schema migrations
│   └── functions/       # Supabase Edge Functions (future)
├── design-reference/    # Original HTML/CSS/JS design prototypes
└── docs/                # Documentation
```

## Technology Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Package Manager**: pnpm (workspaces)
- **Build**: Vite
- **Styling**: Tailwind CSS (planned)

## Database Schema

### Core Tables

1. **user_profiles** - Extended auth with broker/lender-specific fields
2. **deals** - Mortgage deals submitted by brokers
3. **lender_criteria** - Matching preferences set by lenders
4. **offers** - Offers from lenders to brokers on specific deals
5. **offer_history** - Counter-offer tracking
6. **fundings** - Closed deals with final terms
7. **notifications** - User notifications
8. **lender_deal_interactions** - Match scores and view tracking
9. **audit_log** - Immutable compliance log

See [supabase/migrations/0001_initial_schema.sql](supabase/migrations/0001_initial_schema.sql) for full schema.

### Row-Level Security (RLS)

All tables have RLS enabled:
- **Brokers** can only view/edit their own deals
- **Lenders** can view all active deals (for matching)
- **Offers** are visible to deal owner (broker) and submitting lender
- **Criteria** are private to each lender
- **Audit log** is private (each user sees their own actions)

See [supabase/migrations/0002_rls_policies.sql](supabase/migrations/0002_rls_policies.sql).

## API Architecture

### Broker Endpoints (Phase 2-4)

**Dashboard**
- `GET /broker/dashboard` → stats, focus deal, recent activity

**Deals**
- `POST /broker/deals` → submit new deal
- `GET /broker/deals` → list all deals (with pagination)
- `GET /broker/deals/:dealId` → full deal detail + offers
- `PATCH /broker/deals/:dealId` → update deal
- `POST /broker/deals/:dealId/reveal-borrower` → reveal borrower to specific lenders

**Offers**
- `POST /broker/offers/:offerId/counter` → counter-offer
- `POST /broker/offers/:offerId/accept` → accept and fund deal

**Other**
- `GET /broker/funded` → closed deals
- `GET /broker/lenders` → lender directory

### Lender Endpoints (Phase 3-4)

**Dashboard**
- `GET /lender/dashboard` → stats, focus deal, matched deals preview

**Matched Deals**
- `GET /lender/matched-deals` → feed of all matched deals (paginated)

**Criteria**
- `GET /lender/criteria` → current lender criteria + stats
- `PUT /lender/criteria` → update criteria (triggers re-match)
- `GET /lender/criteria/live-preview` → heuristic match preview (for UI)

**Offers**
- `POST /lender/offers` → submit offer on a deal
- `GET /lender/offers` → all offers by lender
- `POST /lender/offers/:offerId/counter` → lender counter-offer

**Pipeline & History**
- `GET /lender/pipeline` → kanban view (Reviewing, Offered, In Negotiation, Funded, Dead)
- `GET /lender/funded` → closed deals

### Authentication

- **Signup**: Email + password via Supabase Auth
- **Broker**: 3-step (account → license verification → profile)
- **Lender**: 4-step (account → firm details → criteria builder → subscription)
- **License Verification**: Async FSRA/AMF/BCFSA lookup; manual fallback
- **Session**: JWT-based (access token 1h, refresh token 7d)

## Real-Time Matching Algorithm

### Two-Tier Approach

**Tier 1: Live Preview (Client-side heuristic)**
- Called as user adjusts criteria builder sliders
- Returns estimated match count + sample deals
- No database query; purely heuristic
- Debounced API calls (200ms)

**Tier 2: Exact Match (Server-side, post-save)**
- When lender saves criteria, triggers `compute_lender_matches()`
- PostgreSQL function: filters deals, computes score for each
- Results stored in `lender_deal_interactions` table
- Emits real-time notification via Supabase Realtime

### Match Score Calculation

```
Base: 2 points
+ 7 pts × (# asset classes selected)
+ 5.5 pts × (# provinces selected)
+ 0.4 pts × (loan range / $100K)
+ 0.55 pts × (LTV - 60)
+ 0.12 pts × (700 - beacon score)
+ 2 pts if accepts BFS
- 1.5 pts × (# exclusion flags)
```

Ranges: 0–30 (poor), 30–60 (fair), 60–80 (good), 80–100 (excellent)

## Key Features

### Broker Portal

1. **Dashboard**
   - Stat strip (Active Deals, Offers In, Funded This Month, Volume YTD)
   - Editorial "Deal in Focus" card (hero)
   - Recent offers, awaiting offers, recently funded

2. **Deal Submission**
   - Multi-field form: location, loan params, borrower info
   - Validation: LTV ≤ 90%, loan ≥ $50K
   - Document upload (future: AI extraction)
   - Review & confirm

3. **Deal Pipeline**
   - Kanban view: Draft → Active → Matched → Negotiating → Offer → Funded/Declined
   - Card: deal #, city, amount, LTV, term, # offers

4. **Deal Detail**
   - Full deal facts (definition list)
   - Stacked offer cards (sorted by rate)
   - Activity timeline
   - Accept/counter/reveal actions

5. **Offer Management**
   - Accept offer → creates funding record
   - Counter offer → new offer_history entry
   - Reveal borrower → to specific lenders

### Lender Portal

1. **Dashboard**
   - Stat strip (New Matches, Offers Out, Funded YTD, Deployment Rate)
   - Sidebar (Win Rate, Avg Response Time, Criteria Preview)
   - Deal in Focus (best match)
   - Matched deals feed (5 recent)
   - Comparables (recent closings)

2. **Criteria Builder** (Hero screen)
   - 6 sections: Asset Classes, Geography, Loan Parameters, Borrower Profile, Capacity, Speed
   - Dual-thumb sliders, multi-select chips, toggles
   - Live preview panel (right): estimated matches + sample deals
   - "Based on your criteria, you would have matched 47 deals in the last 30 days"

3. **Matched Deals Feed**
   - Single-column (magazine-like)
   - Card: deal #, location, amount, LTV, term, match score, summary
   - Filterable: asset class, province, loan size, match score
   - Sortable: newest, best match, expiring soon

4. **Deal Detail**
   - Deal facts + AI summary
   - Comparable deals (defensive moat)
   - Offer composer (rate, fees, term, conditions, expiry)

5. **Pipeline Kanban**
   - Columns: Reviewing, Offered, In Negotiation, Funded, Dead
   - Each card: deal #, city, amount, match score
   - Drag-and-drop (optional MVP)

## Implementation Phases

### Phase 0: Foundation (Weeks 1-2)
- [x] Setup Supabase project & migrations
- [x] Create database schema
- [x] Setup frontend monorepo
- [ ] Supabase auth integration

### Phase 1: Auth & Onboarding (Weeks 2-3)
- [ ] Broker signup flow (3-step)
- [ ] Lender signup flow (4-step with criteria builder)
- [ ] Login screens

### Phase 2: Core Broker Portal (Weeks 3-4)
- [ ] Broker dashboard
- [ ] Deal submission form
- [ ] Pipeline view (Kanban)
- [ ] Deal detail view
- [ ] Offer management

### Phase 3: Core Lender Portal (Weeks 4-5)
- [ ] Lender dashboard
- [ ] Matched deals feed
- [ ] Deal detail view
- [ ] Criteria builder & management
- [ ] Offer submission

### Phase 4: Real-Time & Matching (Weeks 5-6)
- [ ] Match computation function (PostgreSQL)
- [ ] Realtime subscriptions (WebSocket)
- [ ] Live criteria preview
- [ ] Notification system

### Phase 5: Secondary Features (Weeks 6-7)
- [ ] User profile & settings
- [ ] Audit log & export
- [ ] Password reset
- [ ] Mobile responsiveness

### Phase 6: Testing & Hardening (Weeks 7-8)
- [ ] E2E tests (Cypress/Playwright)
- [ ] Unit tests (Vitest)
- [ ] Security audit
- [ ] Performance optimization

### Phase 7: Launch & Monitoring (Week 8+)
- [ ] Deploy to production
- [ ] Observability setup (Datadog/Sentry)
- [ ] Beta user cohort & feedback

## Getting Started

### Prerequisites

1. **Supabase Project** (user provides URL later)
   - When ready, create a new project at supabase.com
   - Note the URL and anon key

2. **pnpm** installed
   ```bash
   npm install -g pnpm
   ```

### Setup Steps

1. **Install dependencies**
   ```bash
   pnpm install
   ```

2. **Create `.env.local` in each app**
   ```
   # apps/broker/.env.local
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

   ```
   # apps/lender/.env.local
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

3. **Apply database migrations**
   ```bash
   # In the Supabase dashboard or via CLI:
   supabase db push
   ```

4. **Start dev servers**
   ```bash
   pnpm dev
   # Broker runs on localhost:5173
   # Lender runs on localhost:5174
   ```

## Design System

Colors (exact hex values):
- Slate Blue (primary): #3B547A
- Slate Blue Deep (headings): #1F2D44
- Off-white (page bg): #FAF6EF
- White (card surfaces): #FFFFFF
- Amber (accent, CTAs): #D4A574
- Amber Deep (hover): #B8895A
- Text Secondary: #6B7280
- Border Subtle: #E5E0D6
- Status Sage (positive): #7C9885
- Status Dust (negative): #C97B7B
- Status Wheat (caution): #D4B574

Typography:
- Headers: Source Serif 4 (serif) — fallback: Georgia
- Body: Inter (humanist sans)
- Numbers: Tabular figures (font-feature-settings: 'tnum')

Distinctive elements:
- Editorial numbered dividers ("01 / Pipeline", "02 / Offers")
- Subtle paper-texture noise on off-white bg (2-3% opacity)
- Asymmetric grids (not rigid 12-col)
- Plinth monogram (column on architectural base)
- Sidebar nav (text-only, no icons, slate-blue indicator on active)
- Currency: "$425,000 CAD" with subtle CAD suffix
- Corner radius: 8px cards, 6px buttons, 4px inputs
- Borders: 1px #E5E0D6
- Motion: 200ms ease-out fades (no springs/bounces)
- Status pills: low-saturation muted tones

## Performance Targets

- Dashboard load: < 500ms
- Matched deals pagination: lazy load, virtual scroll
- Criteria compute: < 1s
- Offer expiry check: nightly cron + on-read validation
- Database: read replicas for high-traffic queries

## Compliance & Security

**PIPEDA (Canadian Privacy)**
- Borrower details anonymized until explicit reveal
- Audit trail immutable (INSERT-only, no DELETE)
- Data retention: 7 years for audit log

**FSRA/Mortgage Industry**
- Broker license verification (async with manual fallback)
- Audit log (user, action, timestamp, entity, IP, changes)
- No bright traffic-light status colors (low-saturation pillls)

**Code Security**
- RLS policies enforce data isolation
- Input validation (client-side + server-side)
- XSS prevention (sanitize inputs)
- CSRF tokens on state-changing endpoints
- Rate limiting (100 req/min per user, 10 req/min per deal submission)

## Key Decisions

1. **Borrower anonymization**: Strict opt-in (brokers must explicitly reveal to each lender)
2. **Unverified brokers**: Can draft deals, but cannot submit until license verified
3. **Match computation**: Immediate for MVP (< 100 lenders); batch nightly if needed at scale
4. **Offer storage**: Update in place for MVP; version if audit history needed
5. **Automatic expiry**: Mark inactive; brokers can still see for negotiation context

## Related Files

- Design prototypes: `design-reference/` (original HTML/CSS/JS)
- Database schema: `supabase/migrations/`
- Shared types: `packages/shared/src/types.ts`
- Shared utils: `packages/shared/src/utils/index.ts`

## Next Steps

1. User provides Supabase URL & anon key
2. Apply database migrations
3. Start Phase 1: Auth & Onboarding
4. Build out broker portal (Phase 2)
5. Build out lender portal (Phase 3)
6. Integrate real-time matching (Phase 4)

---

**Status**: Foundation complete. Awaiting Supabase credentials to begin Phase 1.
