// Presenter layer: maps DB-shaped service rows into the display shapes the
// lender UI components already consume. Keeping this in one place means the
// pages stay declarative and the mock/live boundary lives entirely in the
// service layer.
import type { MatchedDeal, FundingRow, BuilderState } from '@plynth/supabase/services';
import type { MatchCardData } from '../components/MatchCard';
import type { SampleMatch } from '../components/CriteriaBuilder';

const POSITION_LABELS: Record<string, string> = {
  first: 'First',
  second: 'Second',
  'third+': 'Third+',
};

export function positionLabel(pos: string): string {
  return POSITION_LABELS[pos] ?? pos;
}

// "$425,000" — no decimals, no currency prefix (CAD is shown separately in the UI).
export function dollars(cents: number): string {
  return '$' + Math.round(cents / 100).toLocaleString('en-CA');
}

export function ltvPct(ltv: number): string {
  return ltv.toFixed(1) + '%';
}

// "residential" → "Residential", "multi-residential" → "Multi-residential".
export function titleCase(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// A beacon score → its display band.
export function beaconBand(score: number): string {
  if (score >= 720) return '720+';
  if (score >= 680) return '680–720';
  if (score >= 640) return '640–680';
  return '600–640';
}

export function termLabel(months: number): string {
  return months + ' mo';
}

// "9.0%", "8.25%" — two decimals with a single trailing zero trimmed, so whole
// rates read "9.0" while precise ones keep their cents.
export function rateLabel(rate: number): string {
  return rate.toFixed(2).replace(/0$/, '') + '%';
}

// Some city values already carry the province ("Toronto, ON"); others don't.
export function cityProvince(city: string, province?: string | null): string {
  if (!province || city.includes(',')) return city;
  return `${city}, ${province}`;
}

// Bare relative-age token ("2h", "3d") — MatchCard appends " ago".
export function bareAge(iso: string): string {
  const secs = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (secs < 3600) return Math.max(1, Math.floor(secs / 60)) + 'm';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h';
  return Math.floor(secs / 86400) + 'd';
}

export function matchedToCard(d: MatchedDeal): MatchCardData {
  return {
    no: d.deal_number,
    city: cityProvince(d.city, d.province),
    region: d.neighbourhood ?? undefined,
    amount: dollars(d.loan_amount_cents),
    position: positionLabel(d.position),
    ltv: ltvPct(d.ltv),
    term: termLabel(d.term_months),
    score: d.match_score,
    asset: d.asset_class,
    summary: d.summary ?? 'Deal matched against your active criteria.',
    age: d.age ?? bareAge(d.matched_at),
  };
}

// ------------------------------------------------------------------
// Matched-feed filtering + sorting (pure, so it's unit-testable)
// ------------------------------------------------------------------
export interface MatchedFilters {
  asset: string; // 'all' | asset_class
  province: string; // 'all' | province code
  size: string; // 'all' | 'lt500' | '500to1m' | '1mto2m' | 'gt2m'
  minScore: number; // 0 | 70 | 80 | 90
  sort: 'best' | 'newest' | 'expiring';
}

// Loan-size buckets, in cents ($500k = 50_000_000).
const SIZE_BUCKETS: Record<string, (cents: number) => boolean> = {
  all: () => true,
  lt500: (c) => c < 50_000_000,
  '500to1m': (c) => c >= 50_000_000 && c < 100_000_000,
  '1mto2m': (c) => c >= 100_000_000 && c < 200_000_000,
  gt2m: (c) => c >= 200_000_000,
};

export function filterAndSortMatched(rows: MatchedDeal[], f: MatchedFilters): MatchedDeal[] {
  const inSize = SIZE_BUCKETS[f.size] ?? SIZE_BUCKETS.all;
  let out = rows.filter(
    (d) =>
      (f.asset === 'all' || d.asset_class === f.asset) &&
      (f.province === 'all' || d.province === f.province) &&
      inSize(d.loan_amount_cents) &&
      d.match_score >= f.minScore
  );
  if (f.sort === 'best') out = [...out].sort((a, b) => b.match_score - a.match_score);
  else if (f.sort === 'newest')
    out = [...out].sort((a, b) => new Date(b.matched_at).getTime() - new Date(a.matched_at).getTime());
  // 'expiring' has no backing field yet — preserve source order.
  return out;
}

// Compact card for the CriteriaBuilder "Sample matches" preview panel.
export function matchedToSample(d: MatchedDeal): SampleMatch {
  return {
    no: d.deal_number,
    amount: dollars(d.loan_amount_cents),
    city: cityProvince(d.city, d.province),
    ltv: ltvPct(d.ltv),
    score: d.match_score,
    asset: d.asset_class,
    term: termLabel(d.term_months),
  };
}

// ------------------------------------------------------------------
// "Why this matched" — match rationale computed from a deal against the
// lender's own criteria (pure, so it's unit-testable). Returns null when
// either input is missing so the page can fall back to a static placeholder.
// ------------------------------------------------------------------
export interface WhyFactor {
  label: string;
  detail: string;
  pass: boolean;
}

export function whyMatched(deal: MatchedDeal | null, c: BuilderState | null): WhyFactor[] | null {
  if (!deal || !c) return null;
  const factors: WhyFactor[] = [];
  const assetOk = c.assets.includes(deal.asset_class);
  factors.push({
    label: 'Asset class',
    pass: assetOk,
    detail: `${deal.asset_class} — ${assetOk ? 'in' : 'outside'} criteria`,
  });
  const provOk = c.provinces.includes(deal.province);
  factors.push({
    label: 'Geography',
    pass: provOk,
    detail: `${deal.province} — ${provOk ? 'in' : 'outside'} criteria`,
  });
  const limit = deal.position === 'first' ? c.ltv1 : c.ltv2;
  const ltvOk = deal.ltv <= limit;
  factors.push({
    label: 'LTV',
    pass: ltvOk,
    detail: `${ltvPct(deal.ltv)} — ${ltvOk ? 'within' : 'over'} ${limit}% limit`,
  });
  const loan = deal.loan_amount_cents / 100;
  const sizeOk = loan >= c.loanMin && loan <= c.loanMax;
  factors.push({
    label: 'Loan size',
    pass: sizeOk,
    detail: `${dollars(deal.loan_amount_cents)} — ${sizeOk ? 'within' : 'outside'} band`,
  });
  if (deal.beacon_score != null) {
    const beaconOk = deal.beacon_score >= c.beacon;
    factors.push({
      label: 'Beacon',
      pass: beaconOk,
      detail: `${deal.beacon_score} — ${beaconOk ? 'above' : 'below'} ${c.beacon} min`,
    });
  }
  if (deal.is_self_employed) {
    factors.push({
      label: 'Self-employed (BFS)',
      pass: c.bfs,
      detail: c.bfs ? 'Accepted' : 'Not accepted',
    });
  }
  return factors;
}

export interface FundingDisplay {
  no: string;
  city: string;
  amount: string;
  position: string;
  rate: string;
  term: string;
  counterparty: string;
  closed: string;
}

export function fundingToRow(f: FundingRow): FundingDisplay {
  return {
    no: f.deal_number,
    city: f.city,
    amount: dollars(f.loan_amount_cents),
    position: positionLabel(f.position),
    rate: rateLabel(f.actual_rate_percent),
    term: termLabel(f.actual_term_months),
    counterparty: f.counterparty,
    closed: f.closed_at,
  };
}
