import { describe, it, expect } from 'vitest';
import {
  dollars,
  ltvPct,
  termLabel,
  positionLabel,
  rateLabel,
  cityProvince,
  bareAge,
  matchedToCard,
  fundingToRow,
  titleCase,
  beaconBand,
  filterAndSortMatched,
  type MatchedFilters,
} from '@lender/src/lib/present';
import type { MatchedDeal, FundingRow } from '@plynth/supabase/services';

describe('filterAndSortMatched', () => {
  const mk = (over: Partial<MatchedDeal>): MatchedDeal =>
    ({
      deal_id: 'd',
      deal_number: '0001',
      city: 'Toronto',
      province: 'ON',
      asset_class: 'Residential 1st',
      loan_amount_cents: 42_500_000,
      ltv: 72,
      position: 'first',
      term_months: 12,
      match_score: 80,
      matched_at: '2026-06-01T00:00:00Z',
      ...over,
    }) as MatchedDeal;
  const rows = [
    mk({ deal_id: 'a', province: 'ON', asset_class: 'Residential 1st', loan_amount_cents: 42_500_000, match_score: 94, matched_at: '2026-06-05T00:00:00Z' }),
    mk({ deal_id: 'b', province: 'BC', asset_class: 'Residential 2nd', loan_amount_cents: 89_000_000, match_score: 81, matched_at: '2026-06-03T00:00:00Z' }),
    mk({ deal_id: 'c', province: 'AB', asset_class: 'Commercial', loan_amount_cents: 340_000_000, match_score: 76, matched_at: '2026-06-08T00:00:00Z' }),
  ];
  const base: MatchedFilters = { asset: 'all', province: 'all', size: 'all', minScore: 0, sort: 'best' };

  it('no filters → all rows, best-sorted by score desc', () => {
    const out = filterAndSortMatched(rows, base);
    expect(out.map((d) => d.deal_id)).toEqual(['a', 'b', 'c']);
  });
  it('province filter', () => {
    expect(filterAndSortMatched(rows, { ...base, province: 'BC' }).map((d) => d.deal_id)).toEqual(['b']);
  });
  it('asset filter', () => {
    expect(filterAndSortMatched(rows, { ...base, asset: 'Commercial' }).map((d) => d.deal_id)).toEqual(['c']);
  });
  it('loan-size buckets (cents)', () => {
    expect(filterAndSortMatched(rows, { ...base, size: 'lt500' }).map((d) => d.deal_id)).toEqual(['a']);
    expect(filterAndSortMatched(rows, { ...base, size: '500to1m' }).map((d) => d.deal_id)).toEqual(['b']);
    expect(filterAndSortMatched(rows, { ...base, size: 'gt2m' }).map((d) => d.deal_id)).toEqual(['c']);
  });
  it('min match score', () => {
    expect(filterAndSortMatched(rows, { ...base, minScore: 80 }).map((d) => d.deal_id)).toEqual(['a', 'b']);
    expect(filterAndSortMatched(rows, { ...base, minScore: 90 }).map((d) => d.deal_id)).toEqual(['a']);
  });
  it('newest sort orders by matched_at desc', () => {
    expect(filterAndSortMatched(rows, { ...base, sort: 'newest' }).map((d) => d.deal_id)).toEqual(['c', 'a', 'b']);
  });
  it('combined filters intersect', () => {
    expect(
      filterAndSortMatched(rows, { ...base, province: 'ON', size: 'lt500', minScore: 90 }).map((d) => d.deal_id)
    ).toEqual(['a']);
  });
  it('does not mutate the input array', () => {
    const copy = [...rows];
    filterAndSortMatched(rows, { ...base, sort: 'newest' });
    expect(rows).toEqual(copy);
  });
});

describe('titleCase', () => {
  it('capitalizes the first letter', () => {
    expect(titleCase('residential')).toBe('Residential');
    expect(titleCase('commercial')).toBe('Commercial');
  });
  it('leaves hyphenated enums readable', () => {
    expect(titleCase('multi-residential')).toBe('Multi-residential');
  });
});

describe('beaconBand', () => {
  it('maps scores to display bands at the right thresholds', () => {
    expect(beaconBand(740)).toBe('720+');
    expect(beaconBand(720)).toBe('720+');
    expect(beaconBand(719)).toBe('680–720');
    expect(beaconBand(680)).toBe('680–720');
    expect(beaconBand(679)).toBe('640–680');
    expect(beaconBand(640)).toBe('640–680');
    expect(beaconBand(639)).toBe('600–640');
    expect(beaconBand(500)).toBe('600–640');
  });
});

// ============================================================
// dollars — zero, negative, half-dollar rounding, large
// ============================================================
describe('lender dollars edge cases', () => {
  it('zero -> $0', () => {
    expect(dollars(0)).toBe('$0');
  });

  it('negative cents render with a minus inside the string', () => {
    // Math.round(-42500000/100) = -425000 -> "-425,000"
    expect(dollars(-42500000)).toBe('$-425,000');
  });

  it('rounds half-dollar (.50) up', () => {
    expect(dollars(42550)).toBe('$426'); // 425.50 -> 426
  });

  it('rounds just-below-half down', () => {
    expect(dollars(42549)).toBe('$425');
  });

  it('formats very large amounts with grouping', () => {
    expect(dollars(340_000_000)).toBe('$3,400,000');
  });
});

// ============================================================
// ltvPct / termLabel / positionLabel
// ============================================================
describe('lender ltvPct / termLabel / positionLabel', () => {
  it('ltvPct keeps one decimal', () => {
    expect(ltvPct(60)).toBe('60.0%');
    expect(ltvPct(72.49)).toBe('72.5%'); // toFixed rounds
  });

  it('termLabel for 1 vs 12 months', () => {
    expect(termLabel(1)).toBe('1 mo');
    expect(termLabel(12)).toBe('12 mo');
  });

  it('positionLabel maps known and passes through unknown', () => {
    expect(positionLabel('first')).toBe('First');
    expect(positionLabel('second')).toBe('Second');
    expect(positionLabel('third+')).toBe('Third+');
    expect(positionLabel('weird')).toBe('weird');
  });
});

// ============================================================
// rateLabel — single trailing-zero trim, not over-trim
// ============================================================
describe('lender rateLabel trailing-zero behaviour', () => {
  it('9 -> "9.0%"', () => {
    expect(rateLabel(9)).toBe('9.0%');
  });

  it('8.25 -> "8.25%"', () => {
    expect(rateLabel(8.25)).toBe('8.25%');
  });

  it('10 -> "10.0%"', () => {
    expect(rateLabel(10)).toBe('10.0%');
  });

  it('8.5 -> "8.5%"', () => {
    expect(rateLabel(8.5)).toBe('8.5%');
  });

  it('8.2 -> "8.2%" (single trailing zero from 8.20 trimmed)', () => {
    expect(rateLabel(8.2)).toBe('8.2%');
  });
});

// ============================================================
// cityProvince
// ============================================================
describe('lender cityProvince', () => {
  it('appends province when absent', () => {
    expect(cityProvince('Toronto', 'ON')).toBe('Toronto, ON');
  });

  it('does not double up when city already has a comma', () => {
    expect(cityProvince('Toronto, ON', 'ON')).toBe('Toronto, ON');
  });

  it('returns bare city when province null/undefined', () => {
    expect(cityProvince('Toronto', null)).toBe('Toronto');
    expect(cityProvince('Toronto', undefined)).toBe('Toronto');
  });
});

// ============================================================
// bareAge — floor, minutes, hours, days
// ============================================================
describe('lender bareAge', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('floors sub-minute to "1m"', () => {
    expect(bareAge(ago(500))).toBe('1m');
  });

  it('minutes', () => {
    expect(bareAge(ago(15 * 60 * 1000))).toBe('15m');
  });

  it('hours', () => {
    expect(bareAge(ago(5 * 60 * 60 * 1000))).toBe('5h');
  });

  it('days', () => {
    expect(bareAge(ago(4 * 24 * 60 * 60 * 1000))).toBe('4d');
  });
});

// ============================================================
// matchedToCard — fallbacks and full mapping
// ============================================================
function sampleMatched(overrides: Partial<MatchedDeal> = {}): MatchedDeal {
  return {
    deal_id: 'd-1',
    deal_number: '0247',
    city: 'Toronto',
    province: 'ON',
    neighbourhood: 'East York',
    asset_class: 'Residential 1st',
    loan_amount_cents: 42500000,
    ltv: 72,
    position: 'first',
    term_months: 12,
    match_score: 94,
    matched_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    summary: 'Strong covenant refinance.',
    age: '2h',
    ...overrides,
  };
}

describe('matchedToCard fallbacks', () => {
  it('uses default summary when summary is null', () => {
    expect(matchedToCard(sampleMatched({ summary: null })).summary).toBe(
      'Deal matched against your active criteria.'
    );
  });

  it('uses default summary when summary is undefined', () => {
    expect(matchedToCard(sampleMatched({ summary: undefined })).summary).toBe(
      'Deal matched against your active criteria.'
    );
  });

  it('derives age via bareAge(matched_at) when age is null', () => {
    // matched_at is 3h ago in the fixture
    expect(matchedToCard(sampleMatched({ age: null })).age).toBe('3h');
  });

  it('full field mapping is correct', () => {
    expect(matchedToCard(sampleMatched())).toEqual({
      no: '0247',
      city: 'Toronto, ON',
      region: 'East York',
      amount: '$425,000',
      position: 'First',
      ltv: '72.0%',
      term: '12 mo',
      score: 94,
      asset: 'Residential 1st',
      summary: 'Strong covenant refinance.',
      age: '2h',
    });
  });
});

// ============================================================
// fundingToRow — fee not part of lender shape; rate trimming
// ============================================================
describe('lender fundingToRow', () => {
  it('maps with rate trailing-zero trimmed and dollars formatted', () => {
    const f: FundingRow = {
      id: 'f-1',
      deal_id: 'd-1',
      deal_number: '0231',
      city: 'Hamilton, ON',
      loan_amount_cents: 54000000,
      position: 'first',
      actual_rate_percent: 9,
      actual_fee_percent: null,
      actual_term_months: 12,
      counterparty: 'Anonymized',
      closed_at: 'Jun 2, 2026',
    };
    expect(fundingToRow(f)).toEqual({
      no: '0231',
      city: 'Hamilton, ON',
      amount: '$540,000',
      position: 'First',
      rate: '9.0%',
      term: '12 mo',
      counterparty: 'Anonymized',
      closed: 'Jun 2, 2026',
    });
  });
});
