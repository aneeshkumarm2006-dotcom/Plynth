// Presenter layer: maps DB-shaped service rows into the display shapes the
// broker UI components already consume. The mock/live boundary lives in the
// service layer, but because the broker services return *display-shaped* mock
// fixtures (e.g. BROKER_MOCK.pipeline rows with `no`/`amount`/`ltv` strings)
// while live mode returns DB rows (`deal_number`/`loan_amount_cents`/numeric
// `ltv`), these mappers normalize both shapes so mock-mode visuals stay
// byte-for-byte identical to the pre-wiring fixtures.
import type { DealRow, FundingRow, OfferRow } from '@plynth/supabase/services';

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

// ------------------------------------------------------------------
// Shape detection: the mock fixtures carry display strings on fields the
// live DealRow/OfferRow do not have. We branch on those to stay identical.
// ------------------------------------------------------------------
type DealLike = DealRow & {
  no?: string;
  amount?: string;
  offers?: number;
  updated?: string;
  // mock fixture overrides for fields that are numeric on DealRow
  position: DealRow['position'] | string;
  ltv: DealRow['ltv'] | string;
  term?: string;
};

type OfferLike = OfferRow & {
  type?: string;
  rate?: string;
  lenderFee?: string;
  brokerFee?: string;
  term?: string;
  ltv?: string;
  conditions?: string;
  expires?: string;
  note?: string;
  best?: boolean;
};

function isMockDeal(d: DealLike): boolean {
  return typeof d.loan_amount_cents !== 'number' && typeof d.amount === 'string';
}

function isMockOffer(o: OfferLike): boolean {
  return typeof o.rate_percent !== 'number' && typeof o.rate === 'string';
}

// Relative-age token ("3h", "2d") for the pipeline "updated" hint.
function bareAge(iso?: string | null): string {
  if (!iso) return '';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const secs = Math.max(1, Math.floor((Date.now() - t) / 1000));
  if (secs < 3600) return Math.max(1, Math.floor(secs / 60)) + 'm';
  if (secs < 86400) return Math.floor(secs / 3600) + 'h';
  return Math.floor(secs / 86400) + 'd';
}

// ------------------------------------------------------------------
// Deal → pipeline / list row
// ------------------------------------------------------------------
export interface DealDisplay {
  // Routing id: real UUID in live mode, deal number as the fallback in mock mode.
  routeId: string;
  no: string;
  city: string;
  amount: string;
  position: string;
  ltv: string;
  term: string;
  offers: number;
  status: string;
  updated: string;
}

export function dealRowToCard(d: DealLike): DealDisplay {
  if (isMockDeal(d)) {
    return {
      routeId: d.no ?? '',
      no: d.no ?? '',
      city: d.city,
      amount: d.amount ?? '',
      position: d.position as unknown as string,
      ltv: (d.ltv as unknown as string) ?? '',
      term: d.term ?? '',
      offers: d.offers ?? 0,
      status: d.status,
      updated: d.updated ?? '',
    };
  }
  return {
    routeId: d.id || d.deal_number,
    no: d.deal_number,
    city: cityProvince(d.city, d.province),
    amount: dollars(d.loan_amount_cents),
    position: positionLabel(d.position),
    ltv: ltvPct(d.ltv),
    term: termLabel(d.term_months),
    offers: d.offers ?? 0,
    status: d.status,
    updated: bareAge(d.updated_at),
  };
}

// ------------------------------------------------------------------
// Funding → funded table row
// ------------------------------------------------------------------
export interface FundingDisplay {
  no: string;
  city: string;
  amount: string;
  position: string;
  rate: string;
  fee: string;
  term: string;
  lender: string;
  closed: string;
}

export function fundingToRow(f: FundingRow): FundingDisplay {
  return {
    no: f.deal_number,
    city: f.city,
    amount: dollars(f.loan_amount_cents),
    position: positionLabel(f.position),
    rate: rateLabel(f.actual_rate_percent),
    fee: f.actual_fee_percent != null ? rateLabel(f.actual_fee_percent) : '—',
    term: termLabel(f.actual_term_months),
    lender: f.counterparty,
    closed: f.closed_at,
  };
}

// ------------------------------------------------------------------
// Offer → offer card on the deal detail page
// ------------------------------------------------------------------
export interface OfferDisplay {
  id: string; // the real offer id to attach actions to
  label: string; // "Lender A" style anonymized label
  type: string;
  rate: string;
  rateValue: number; // numeric rate for counter math
  lenderFee: string;
  brokerFee: string;
  term: string;
  conditions: string;
  expires: string;
  note?: string;
  best?: boolean;
  status?: string;
  lenderId?: string; // for borrower reveal (live mode only)
}

function expiresLabel(iso?: string | null): string {
  if (!iso) return '—';
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '—';
  const days = Math.ceil((t - Date.now()) / 86_400_000);
  if (days <= 0) return 'Expired';
  return `${days} day${days === 1 ? '' : 's'}`;
}

export function offerToCard(o: OfferLike, index: number): OfferDisplay {
  if (isMockOffer(o)) {
    return {
      id: o.id,
      label: 'Lender ' + o.id,
      type: o.type ?? '',
      rate: o.rate ?? '',
      rateValue: parseFloat(o.rate ?? '0'),
      lenderFee: o.lenderFee ?? '',
      brokerFee: o.brokerFee ?? '',
      term: o.term ?? '',
      conditions: o.conditions ?? '',
      expires: o.expires ?? '',
      note: o.note,
      best: o.best,
      status: o.status,
      lenderId: o.lender_id,
    };
  }
  return {
    id: o.id,
    label: 'Lender ' + String.fromCharCode(65 + (index % 26)),
    type: 'Anonymized',
    rate: rateLabel(o.rate_percent),
    rateValue: o.rate_percent,
    lenderFee: o.lender_fee_percent != null ? rateLabel(o.lender_fee_percent) : '—',
    brokerFee: o.broker_fee_percent != null ? rateLabel(o.broker_fee_percent) : '—',
    term: o.term_months != null ? termLabel(o.term_months) : '—',
    conditions: o.conditions_text ?? '—',
    expires: expiresLabel(o.expires_at),
    note: undefined,
    best: o.is_best_offer,
    status: o.status,
    lenderId: o.lender_id,
  };
}
