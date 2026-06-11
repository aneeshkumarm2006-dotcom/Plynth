# Plynth — B2B Marketplace for Canadian Mortgage Brokers & Lenders

A two-sided marketplace connecting brokers and private lenders in Canada. Brokers submit mortgage deals, lenders browse and make offers, and deals get funded.

**Two separate portals**: `brokers.plynth.ca` | `lenders.plynth.ca`

## Project Status

✅ **Architecture & Database Schema**: Complete
- Comprehensive data model (9 tables + RLS policies)
- API contract designed
- Implementation plan (38 tasks across 7 phases)

⏳ **Next**: Awaiting Supabase credentials to begin Phase 1 (Auth & Onboarding)

## Quick Start

### Prerequisites

- **pnpm** (package manager)
  ```bash
  npm install -g pnpm
  ```

- **Supabase account** (user will provide URL + anon key)

### Installation

```bash
# Install dependencies
pnpm install

# Create .env files in each app (once you have Supabase credentials)
cp apps/broker/.env.example apps/broker/.env.local
cp apps/lender/.env.example apps/lender/.env.local

# Edit with your Supabase credentials
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key

# Start dev servers
pnpm dev
```

Both portals will start:
- Broker portal: `http://localhost:5173`
- Lender portal: `http://localhost:5174`

## Project Structure

```
plynth/
├── apps/
│   ├── broker/          # Broker portal (React 19 + TS + Vite)
│   └── lender/          # Lender portal (React 19 + TS + Vite)
├── packages/
│   ├── shared/          # Shared types, utils, components
│   └── supabase/        # Supabase client config
├── supabase/
│   ├── migrations/      # SQL schema migrations
│   └── functions/       # Edge Functions (future)
├── design-reference/    # Original HTML/CSS/JS prototypes
├── ARCHITECTURE.md      # Detailed architecture doc
└── README.md           # This file
```

## Key Features

### Broker Portal

- **Dashboard** with stats and deal tracking
- **Deal submission** (multi-step form with validation)
- **Pipeline management** (Kanban view)
- **Offer handling** (accept, counter, reveal borrower)
- **Funded deals** history

### Lender Portal

- **Dashboard** with matching stats
- **Criteria Builder** (hero feature with live preview)
  - Asset classes, geography, loan params, borrower profile, capacity, speed
  - Real-time match preview: "Based on your criteria, you would have matched 47 deals in the last 30 days"
- **Matched Deals Feed** (single-column, magazine-style)
- **Offer Composer** (submit bids on deals)
- **Pipeline Kanban** (track deal flow)

## Design System

**Brand**: Institutional, calm, deliberate. Antithesis of crypto-bro fintech.

**Colors**:
- Slate Blue (#3B547A) — primary
- Amber (#D4A574) — CTAs
- Off-white (#FAF6EF) — page background
- Muted tones for status pills (no bright traffic lights)

**Typography**:
- Headers: Source Serif 4 (or Tiempos with license)
- Body: Inter
- Tabular figures on all numbers (currency, %, LTV, terms)

**Components**:
- Editorial numbered dividers ("01 / Pipeline")
- Plinth monogram (column-on-base)
- Sidebar nav (text-only, no icons)
- Definition lists for structured data
- Skeleton loaders (no spinners)
- Toast notifications (slides up)

See `ARCHITECTURE.md` for full design spec.

## Database Schema

**Core tables**:
- `user_profiles` — broker & lender accounts
- `deals` — submitted mortgages
- `lender_criteria` — matching preferences
- `offers` — bids from lenders
- `offer_history` — counter-offer tracking
- `fundings` — closed deals
- `notifications` — user alerts
- `lender_deal_interactions` — match scores
- `audit_log` — compliance log (immutable)

**All tables have RLS enabled** for data isolation:
- Brokers see only their own deals
- Lenders see all active deals (for browsing)
- Offers visible to deal owner + submitting lender
- Audit log is private per user

See `supabase/migrations/` for SQL.

## Real-Time Matching

**Two-tier approach**:

1. **Live Preview** (client-side heuristic)
   - Runs as user adjusts criteria builder sliders
   - Returns estimated match count + sample deals
   - No DB query; instant feedback

2. **Exact Match** (server-side PostgreSQL)
   - Triggered when lender saves criteria
   - `compute_lender_matches()` function scores all eligible deals
   - Results stored; notified via Supabase Realtime

**Match Score**: 0–100
- 80–100: Excellent
- 60–80: Good
- 30–60: Fair
- 0–30: Poor

## API Endpoints

### Broker

- `GET /broker/dashboard` — stats & recent activity
- `POST /broker/deals` — submit deal
- `GET /broker/deals` — list all deals
- `GET /broker/deals/:id` — deal detail + offers
- `POST /broker/offers/:id/accept` — accept offer & fund
- `POST /broker/offers/:id/counter` — counter-offer
- `GET /broker/funded` — closed deals

### Lender

- `GET /lender/dashboard` — stats & focus deal
- `GET /lender/matched-deals` — feed of matched deals
- `GET /lender/criteria` — current preferences
- `PUT /lender/criteria` — update preferences
- `POST /lender/offers` — submit bid on deal
- `GET /lender/pipeline` — kanban view
- `GET /lender/funded` — closed deals

See `ARCHITECTURE.md` for full API spec.

## Implementation Plan

### Phase 1: Auth & Onboarding (Weeks 2-3)
- [ ] Broker signup (3-step)
- [ ] Lender signup (4-step + criteria builder)
- [ ] Login flows

### Phase 2: Broker Portal (Weeks 3-4)
- [ ] Dashboard
- [ ] Deal submission
- [ ] Pipeline view
- [ ] Deal detail
- [ ] Offer management

### Phase 3: Lender Portal (Weeks 4-5)
- [ ] Dashboard
- [ ] Matched deals feed
- [ ] Deal detail
- [ ] Criteria builder
- [ ] Offer submission

### Phase 4: Real-Time Matching (Weeks 5-6)
- [ ] PostgreSQL match computation
- [ ] WebSocket subscriptions
- [ ] Live preview
- [ ] Notifications

### Phase 5: Secondary Features (Weeks 6-7)
- [ ] User settings
- [ ] Audit log export
- [ ] Password reset
- [ ] Mobile responsiveness

### Phase 6: Testing (Weeks 7-8)
- [ ] E2E tests (Cypress)
- [ ] Unit tests (Vitest)
- [ ] Security audit
- [ ] Performance tuning

### Phase 7: Launch (Week 8+)
- [ ] Deploy to production
- [ ] Observability (Datadog)
- [ ] Beta users & feedback

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + Realtime)
- **Package Manager**: pnpm
- **Styling**: Tailwind CSS (planned)
- **Testing**: Vitest (unit), Cypress (E2E)

## Compliance

**PIPEDA (Canadian Privacy)**
- Borrower info anonymized by default
- Brokers must explicitly reveal to each lender
- 7-year audit log retention

**FSRA/Mortgage Regulation**
- Broker license verification (async with fallback)
- All actions logged with user, timestamp, IP, changes

**Security**
- Row-level security (RLS) on all tables
- Input validation (client + server)
- Rate limiting (100 req/min per user)
- XSS/CSRF protection

## Docs

- **[ARCHITECTURE.md](ARCHITECTURE.md)** — Detailed design & spec
- **[design-reference/](design-reference/)** — Original HTML/CSS/JS prototypes
- **[supabase/migrations/](supabase/migrations/)** — Database schema

## Contributing

1. Keep commits focused & descriptive
2. Use TypeScript (no `any`)
3. Test critical paths
4. Follow design system (colors, spacing, motion)

## License

Proprietary — Plynth Inc.

---

**Status**: Architecture complete. Awaiting Supabase credentials to begin Phase 1.

**Next**: Provide Supabase URL + anon key, then we'll start Auth & Onboarding.
