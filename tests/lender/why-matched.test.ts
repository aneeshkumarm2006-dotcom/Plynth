import { describe, it, expect } from 'vitest';
import { whyMatched } from '@lender/src/lib/present';
import type { MatchedDeal, BuilderState } from '@plynth/supabase/services';

// test.md §1, §4.5 and worklog §3: the real "Why this matched" rationale.
// Extracted from DealDetail.tsx to apps/lender/src/lib/present.ts.

function deal(overrides: Partial<MatchedDeal> = {}): MatchedDeal {
  return {
    deal_id: 'd-1',
    deal_number: '0247',
    city: 'Toronto',
    province: 'ON',
    neighbourhood: 'East York',
    asset_class: 'Residential 1st',
    loan_amount_cents: 42500000, // $425,000
    ltv: 72,
    position: 'first',
    term_months: 12,
    match_score: 94,
    matched_at: new Date().toISOString(),
    summary: null,
    age: null,
    beacon_score: 700,
    property_type: 'residential',
    is_self_employed: false,
    ...overrides,
  } as MatchedDeal;
}

function criteria(overrides: Partial<BuilderState> = {}): BuilderState {
  return {
    assets: ['Residential 1st'],
    provinces: ['ON'],
    cities: [],
    loanMin: 100000,
    loanMax: 1000000,
    ltv1: 75,
    ltv2: 65,
    termMin: 6,
    termMax: 24,
    beacon: 660,
    bfs: true,
    exclusions: [],
    monthlyTarget: 0,
    available: 0,
    ...overrides,
  } as BuilderState;
}

function factor(factors: ReturnType<typeof whyMatched>, label: string) {
  return factors!.find((x) => x.label === label);
}

describe('whyMatched — null guards', () => {
  it('returns null when the deal is missing', () => {
    expect(whyMatched(null, criteria())).toBeNull();
  });
  it('returns null when the criteria are missing', () => {
    expect(whyMatched(deal(), null)).toBeNull();
  });
  it('returns null when both are missing', () => {
    expect(whyMatched(null, null)).toBeNull();
  });
});

describe('whyMatched — asset class', () => {
  it('passes when the asset is in criteria', () => {
    expect(factor(whyMatched(deal(), criteria()), 'Asset class')!.pass).toBe(true);
  });
  it('fails when the asset is outside criteria', () => {
    const f = factor(whyMatched(deal({ asset_class: 'Commercial' }), criteria()), 'Asset class')!;
    expect(f.pass).toBe(false);
    expect(f.detail).toContain('outside');
  });
});

describe('whyMatched — geography', () => {
  it('passes when the province is in criteria', () => {
    expect(factor(whyMatched(deal(), criteria()), 'Geography')!.pass).toBe(true);
  });
  it('fails when the province is outside criteria', () => {
    const f = factor(whyMatched(deal({ province: 'BC' }), criteria()), 'Geography')!;
    expect(f.pass).toBe(false);
    expect(f.detail).toContain('outside');
  });
});

describe('whyMatched — LTV uses the position-specific limit', () => {
  it('first-position LTV within ltv1 passes', () => {
    const f = factor(whyMatched(deal({ position: 'first', ltv: 75 }), criteria({ ltv1: 75 })), 'LTV')!;
    expect(f.pass).toBe(true);
    expect(f.detail).toContain('75% limit');
  });
  it('first-position LTV over ltv1 fails', () => {
    const f = factor(whyMatched(deal({ position: 'first', ltv: 80 }), criteria({ ltv1: 75 })), 'LTV')!;
    expect(f.pass).toBe(false);
    expect(f.detail).toContain('over');
  });
  it('second-position LTV is measured against ltv2, not ltv1', () => {
    // ltv 70 is fine for ltv1=75 but over ltv2=65 — proves the position branch.
    const f = factor(whyMatched(deal({ position: 'second', ltv: 70 }), criteria({ ltv1: 75, ltv2: 65 })), 'LTV')!;
    expect(f.pass).toBe(false);
    expect(f.detail).toContain('65% limit');
  });
});

describe('whyMatched — loan size band', () => {
  it('passes inside the band', () => {
    expect(factor(whyMatched(deal(), criteria()), 'Loan size')!.pass).toBe(true);
  });
  it('fails below the band', () => {
    const f = factor(whyMatched(deal({ loan_amount_cents: 5000000 }), criteria({ loanMin: 100000 })), 'Loan size')!;
    expect(f.pass).toBe(false);
    expect(f.detail).toContain('outside');
  });
  it('fails above the band', () => {
    const f = factor(whyMatched(deal({ loan_amount_cents: 200000000 }), criteria({ loanMax: 1000000 })), 'Loan size')!;
    expect(f.pass).toBe(false);
  });
});

describe('whyMatched — beacon (optional branch)', () => {
  it('includes a passing beacon factor when above the min', () => {
    const f = factor(whyMatched(deal({ beacon_score: 700 }), criteria({ beacon: 660 })), 'Beacon')!;
    expect(f.pass).toBe(true);
    expect(f.detail).toContain('above');
  });
  it('includes a failing beacon factor when below the min', () => {
    const f = factor(whyMatched(deal({ beacon_score: 620 }), criteria({ beacon: 660 })), 'Beacon')!;
    expect(f.pass).toBe(false);
    expect(f.detail).toContain('below');
  });
  it('omits the beacon factor entirely when beacon_score is null', () => {
    expect(factor(whyMatched(deal({ beacon_score: null }), criteria()), 'Beacon')).toBeUndefined();
  });
  it('omits the beacon factor when beacon_score is undefined', () => {
    expect(factor(whyMatched(deal({ beacon_score: undefined }), criteria()), 'Beacon')).toBeUndefined();
  });
});

describe('whyMatched — self-employed / BFS (optional branch)', () => {
  it('omits the BFS factor when the borrower is not self-employed', () => {
    expect(factor(whyMatched(deal({ is_self_employed: false }), criteria()), 'Self-employed (BFS)')).toBeUndefined();
  });
  it('passes when self-employed and the lender accepts BFS', () => {
    const f = factor(whyMatched(deal({ is_self_employed: true }), criteria({ bfs: true })), 'Self-employed (BFS)')!;
    expect(f.pass).toBe(true);
    expect(f.detail).toBe('Accepted');
  });
  it('fails when self-employed and the lender does not accept BFS', () => {
    const f = factor(whyMatched(deal({ is_self_employed: true }), criteria({ bfs: false })), 'Self-employed (BFS)')!;
    expect(f.pass).toBe(false);
    expect(f.detail).toBe('Not accepted');
  });
});

describe('whyMatched — composition', () => {
  it('always returns the four core factors first, in order', () => {
    const labels = whyMatched(deal({ beacon_score: null, is_self_employed: false }), criteria())!.map((x) => x.label);
    expect(labels).toEqual(['Asset class', 'Geography', 'LTV', 'Loan size']);
  });
  it('appends beacon then BFS when both optional branches apply', () => {
    const labels = whyMatched(deal({ beacon_score: 700, is_self_employed: true }), criteria())!.map((x) => x.label);
    expect(labels).toEqual(['Asset class', 'Geography', 'LTV', 'Loan size', 'Beacon', 'Self-employed (BFS)']);
  });
});
