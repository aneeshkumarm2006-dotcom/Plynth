import { describe, it, expect } from 'vitest';
import {
  dollars,
  ltvPct,
  termLabel,
  positionLabel,
  rateLabel,
  cityProvince,
  dealRowToCard,
  offerToCard,
  fundingToRow,
} from '@broker/src/lib/present';
import type { DealRow, OfferRow, FundingRow } from '@plynth/supabase/services';

// ============================================================
// Shared formatter parity (mirror of lender helpers)
// ============================================================
describe('broker base formatters', () => {
  it('dollars: zero, negative, half-up', () => {
    expect(dollars(0)).toBe('$0');
    expect(dollars(-42500000)).toBe('$-425,000');
    expect(dollars(42550)).toBe('$426');
  });

  it('ltvPct one decimal', () => {
    expect(ltvPct(78)).toBe('78.0%');
  });

  it('termLabel', () => {
    expect(termLabel(1)).toBe('1 mo');
    expect(termLabel(24)).toBe('24 mo');
  });

  it('positionLabel maps + passthrough', () => {
    expect(positionLabel('first')).toBe('First');
    expect(positionLabel('xyz')).toBe('xyz');
  });

  it('rateLabel trailing-zero trimming', () => {
    expect(rateLabel(9)).toBe('9.0%');
    expect(rateLabel(8.25)).toBe('8.25%');
    expect(rateLabel(8.5)).toBe('8.5%');
  });

  it('cityProvince', () => {
    expect(cityProvince('Ottawa', 'ON')).toBe('Ottawa, ON');
    expect(cityProvince('Ottawa, ON', 'ON')).toBe('Ottawa, ON');
    expect(cityProvince('Ottawa', null)).toBe('Ottawa');
  });
});

// ============================================================
// dealRowToCard — BOTH branches via isMockDeal shape detection
// ============================================================
describe('dealRowToCard mock-shape branch', () => {
  // Mock fixture rows carry display strings on `no`/`amount`/`ltv`.
  const mockDeal = {
    no: '0247',
    city: 'Toronto, ON',
    amount: '$425,000',
    position: 'First',
    ltv: '72.0%',
    term: '12 mo',
    status: 'negotiating',
    offers: 5,
    updated: '3h',
  } as unknown as DealRow;

  it('passes display strings through unchanged and uses `no` as routeId', () => {
    expect(dealRowToCard(mockDeal as any)).toEqual({
      routeId: '0247',
      no: '0247',
      city: 'Toronto, ON',
      amount: '$425,000',
      position: 'First',
      ltv: '72.0%',
      term: '12 mo',
      offers: 5,
      status: 'negotiating',
      updated: '3h',
    });
  });

  it('defaults missing optional fields in mock branch', () => {
    const minimal = {
      no: '0300',
      city: 'Laval, QC',
      amount: '$500,000',
      position: 'First',
      ltv: '60.0%',
      status: 'draft',
    } as unknown as DealRow;
    const card = dealRowToCard(minimal as any);
    expect(card.term).toBe('');
    expect(card.offers).toBe(0);
    expect(card.updated).toBe('');
  });
});

describe('dealRowToCard live DealRow branch', () => {
  const liveDeal: DealRow = {
    id: 'uuid-123',
    broker_id: 'b-1',
    deal_number: '0247',
    city: 'Toronto',
    province: 'ON',
    asset_class: 'Residential 1st',
    loan_amount_cents: 42500000,
    ltv: 72,
    position: 'first',
    term_months: 12,
    status: 'active',
    offers: 3 as any,
    created_at: '2026-06-01T00:00:00.000Z',
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  } as DealRow & { offers?: number };

  it('maps numeric fields through formatters and uses id as routeId', () => {
    const card = dealRowToCard(liveDeal as any);
    expect(card.routeId).toBe('uuid-123');
    expect(card.no).toBe('0247');
    expect(card.city).toBe('Toronto, ON');
    expect(card.amount).toBe('$425,000');
    expect(card.position).toBe('First');
    expect(card.ltv).toBe('72.0%');
    expect(card.term).toBe('12 mo');
    expect(card.status).toBe('active');
    expect(card.updated).toBe('2h');
  });

  it('falls back to deal_number for routeId when id is empty', () => {
    const card = dealRowToCard({ ...liveDeal, id: '' } as any);
    expect(card.routeId).toBe('0247');
  });

  it('defaults offers to 0 when absent in live branch', () => {
    const { offers, ...noOffers } = liveDeal as any;
    expect(dealRowToCard(noOffers).offers).toBe(0);
  });

  // bareAge is internal to the broker presenter; exercised here via `updated`.
  it('updated is "" when updated_at is null/absent (bareAge null guard)', () => {
    expect(dealRowToCard({ ...liveDeal, updated_at: null } as any).updated).toBe('');
  });

  it('updated is "" when updated_at is an invalid iso (bareAge NaN guard)', () => {
    expect(dealRowToCard({ ...liveDeal, updated_at: 'garbage' } as any).updated).toBe('');
  });

  it('updated floors a sub-minute updated_at to "1m"', () => {
    const card = dealRowToCard({
      ...liveDeal,
      updated_at: new Date(Date.now() - 500).toISOString(),
    } as any);
    expect(card.updated).toBe('1m');
  });
});

// ============================================================
// offerToCard — mock vs live, anonymized labels, expiresLabel
// ============================================================
describe('offerToCard mock-shape branch', () => {
  const mockOffer = {
    id: 'A',
    type: 'MIC · Ontario',
    rate: '9.25%',
    lenderFee: '2.0%',
    brokerFee: '1.0%',
    term: '12 months',
    conditions: 'Full appraisal',
    expires: '3 days',
    note: 'Open to a reduction.',
    best: true,
    status: 'submitted',
  } as unknown as OfferRow;

  it('label uses the mock id ("Lender A") and parses rateValue from the string', () => {
    const card = offerToCard(mockOffer as any, 0);
    expect(card.label).toBe('Lender A');
    expect(card.rate).toBe('9.25%');
    expect(card.rateValue).toBeCloseTo(9.25);
    expect(card.type).toBe('MIC · Ontario');
    expect(card.expires).toBe('3 days');
    expect(card.best).toBe(true);
  });
});

describe('offerToCard live OfferRow branch', () => {
  function liveOffer(overrides: Partial<OfferRow> = {}): OfferRow {
    return {
      id: 'offer-uuid',
      deal_id: 'd-1',
      lender_id: 'lender-1',
      rate_percent: 9,
      lender_fee_percent: 2,
      broker_fee_percent: 1,
      term_months: 12,
      max_ltv: 72,
      conditions_text: 'Full appraisal',
      status: 'submitted',
      is_best_offer: true,
      expires_at: new Date(Date.now() + 3 * 86_400_000).toISOString(),
      created_at: '2026-06-01T00:00:00.000Z',
      updated_at: '2026-06-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('anonymizes the lender by index: 0->A, 1->B', () => {
    expect(offerToCard(liveOffer(), 0).label).toBe('Lender A');
    expect(offerToCard(liveOffer(), 1).label).toBe('Lender B');
  });

  it('wraps the anonymized label at 26 (index 26 -> A again)', () => {
    expect(offerToCard(liveOffer(), 26).label).toBe('Lender A');
    expect(offerToCard(liveOffer(), 27).label).toBe('Lender B');
  });

  it('formats rate, fees, term through the trimming formatters', () => {
    const card = offerToCard(liveOffer(), 0);
    expect(card.rate).toBe('9.0%');
    expect(card.rateValue).toBe(9);
    expect(card.lenderFee).toBe('2.0%');
    expect(card.brokerFee).toBe('1.0%');
    expect(card.term).toBe('12 mo');
    expect(card.type).toBe('Anonymized');
  });

  it('renders "—" for null fee/term/conditions', () => {
    const card = offerToCard(
      liveOffer({ lender_fee_percent: null, broker_fee_percent: null, term_months: null, conditions_text: null }),
      0
    );
    expect(card.lenderFee).toBe('—');
    expect(card.brokerFee).toBe('—');
    expect(card.term).toBe('—');
    expect(card.conditions).toBe('—');
  });

  it('expiresLabel: null expires_at -> "—"', () => {
    const card = offerToCard(liveOffer({ expires_at: null as any }), 0);
    expect(card.expires).toBe('—');
  });

  it('expiresLabel: past date -> "Expired"', () => {
    const card = offerToCard(
      liveOffer({ expires_at: new Date(Date.now() - 5 * 86_400_000).toISOString() }),
      0
    );
    expect(card.expires).toBe('Expired');
  });

  it('expiresLabel: exactly now / same instant -> "Expired" (days <= 0)', () => {
    const card = offerToCard(liveOffer({ expires_at: new Date(Date.now()).toISOString() }), 0);
    expect(card.expires).toBe('Expired');
  });

  it('expiresLabel: ~1 day out -> "1 day" (singular)', () => {
    // Just under 1 full day rounds up via Math.ceil to 1.
    const card = offerToCard(
      liveOffer({ expires_at: new Date(Date.now() + 86_400_000 - 1000).toISOString() }),
      0
    );
    expect(card.expires).toBe('1 day');
  });

  it('expiresLabel: multi-day -> "n days" (plural)', () => {
    const card = offerToCard(
      liveOffer({ expires_at: new Date(Date.now() + 3 * 86_400_000 + 1000).toISOString() }),
      0
    );
    expect(card.expires).toBe('4 days');
  });

  it('expiresLabel: invalid iso -> "—"', () => {
    const card = offerToCard(liveOffer({ expires_at: 'not-a-date' }), 0);
    expect(card.expires).toBe('—');
  });
});

// ============================================================
// fundingToRow — fee "—" when null
// ============================================================
describe('broker fundingToRow', () => {
  function funding(overrides: Partial<FundingRow> = {}): FundingRow {
    return {
      id: 'f-1',
      deal_id: 'd-1',
      deal_number: '0231',
      city: 'Hamilton, ON',
      loan_amount_cents: 54000000,
      position: 'first',
      actual_rate_percent: 9,
      actual_fee_percent: 2,
      actual_term_months: 12,
      counterparty: 'Lender',
      closed_at: 'Jun 2, 2026',
      ...overrides,
    };
  }

  it('maps a full funding row', () => {
    expect(fundingToRow(funding())).toEqual({
      no: '0231',
      city: 'Hamilton, ON',
      amount: '$540,000',
      position: 'First',
      rate: '9.0%',
      fee: '2.0%',
      term: '12 mo',
      lender: 'Lender',
      closed: 'Jun 2, 2026',
    });
  });

  it('renders fee "—" when actual_fee_percent is null', () => {
    expect(fundingToRow(funding({ actual_fee_percent: null })).fee).toBe('—');
  });
});
