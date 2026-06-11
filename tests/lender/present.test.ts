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
  matchedToSample,
  fundingToRow,
} from '@lender/src/lib/present';
import type { MatchedDeal, FundingRow } from '@plynth/supabase/services';

describe('dollars', () => {
  it('formats cents into a grouped dollar string with no decimals', () => {
    expect(dollars(42500000)).toBe('$425,000');
  });

  it('rounds sub-dollar cents', () => {
    expect(dollars(42549)).toBe('$425'); // 425.49 -> 425
    expect(dollars(42550)).toBe('$426'); // 425.50 -> 426
  });

  it('handles zero', () => {
    expect(dollars(0)).toBe('$0');
  });
});

describe('ltvPct', () => {
  it('formats with one decimal', () => {
    expect(ltvPct(72)).toBe('72.0%');
    expect(ltvPct(78.5)).toBe('78.5%');
  });
});

describe('termLabel', () => {
  it('appends " mo"', () => {
    expect(termLabel(12)).toBe('12 mo');
  });
});

describe('positionLabel', () => {
  it('maps known positions', () => {
    expect(positionLabel('first')).toBe('First');
    expect(positionLabel('second')).toBe('Second');
    expect(positionLabel('third+')).toBe('Third+');
  });

  it('passes through unknown positions', () => {
    expect(positionLabel('First')).toBe('First'); // already display-cased, not in map
    expect(positionLabel('mezzanine')).toBe('mezzanine');
  });
});

describe('rateLabel', () => {
  it('trims a single trailing zero on whole rates', () => {
    expect(rateLabel(9)).toBe('9.0%');
  });

  it('keeps precise cents', () => {
    expect(rateLabel(8.25)).toBe('8.25%');
  });

  it('keeps a non-zero hundredths digit', () => {
    expect(rateLabel(10.5)).toBe('10.5%'); // toFixed(2)=10.50 -> trailing 0 trimmed
  });
});

describe('cityProvince', () => {
  it('appends province when city lacks one', () => {
    expect(cityProvince('Toronto', 'ON')).toBe('Toronto, ON');
  });

  it('does not double up when city already contains a comma', () => {
    expect(cityProvince('Toronto, ON', 'ON')).toBe('Toronto, ON');
  });

  it('returns bare city when province is null or undefined', () => {
    expect(cityProvince('Toronto', null)).toBe('Toronto');
    expect(cityProvince('Toronto', undefined)).toBe('Toronto');
  });
});

describe('bareAge', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('returns minutes for recent timestamps', () => {
    expect(bareAge(ago(5 * 60 * 1000))).toBe('5m');
  });

  it('clamps to at least 1m for very recent timestamps', () => {
    expect(bareAge(ago(2 * 1000))).toBe('1m');
  });

  it('returns hours', () => {
    expect(bareAge(ago(3 * 60 * 60 * 1000))).toBe('3h');
  });

  it('returns days', () => {
    expect(bareAge(ago(2 * 24 * 60 * 60 * 1000))).toBe('2d');
  });
});

function sampleMatchedDeal(overrides: Partial<MatchedDeal> = {}): MatchedDeal {
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
    matched_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    summary: 'Strong covenant refinance.',
    age: '2h',
    ...overrides,
  };
}

describe('matchedToCard', () => {
  it('maps a representative matched deal into card display fields', () => {
    const card = matchedToCard(sampleMatchedDeal());
    expect(card).toMatchObject({
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

  it('falls back to a default summary when none is provided', () => {
    const card = matchedToCard(sampleMatchedDeal({ summary: null }));
    expect(card.summary).toBe('Deal matched against your active criteria.');
  });

  it('derives age from matched_at when age is absent', () => {
    const card = matchedToCard(sampleMatchedDeal({ age: null }));
    expect(card.age).toBe('2h');
  });

  it('maps null neighbourhood to undefined region', () => {
    const card = matchedToCard(sampleMatchedDeal({ neighbourhood: null }));
    expect(card.region).toBeUndefined();
  });
});

describe('matchedToSample', () => {
  it('maps the compact preview shape', () => {
    const s = matchedToSample(sampleMatchedDeal());
    expect(s).toEqual({
      no: '0247',
      amount: '$425,000',
      city: 'Toronto, ON',
      ltv: '72.0%',
      score: 94,
      asset: 'Residential 1st',
      term: '12 mo',
    });
  });
});

describe('fundingToRow', () => {
  it('maps a funding row into display fields', () => {
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
