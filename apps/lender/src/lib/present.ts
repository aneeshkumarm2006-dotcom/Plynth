// Presenter layer: maps DB-shaped service rows into the display shapes the
// lender UI components already consume. Keeping this in one place means the
// pages stay declarative and the mock/live boundary lives entirely in the
// service layer.
import type { MatchedDeal, FundingRow } from '@plynth/supabase/services';
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
