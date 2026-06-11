import { describe, it, expect } from 'vitest';
import {
  formatCAD,
  centsToCAD,
  cadToCents,
  formatPercent,
  formatMoneyShort,
  formatNumber,
  isValidEmail,
  isValidPassword,
  isValidLoanAmount,
  isValidLTV,
  isValidBeaconScore,
  validateDealNumber,
  dealStatusLabel,
  offerStatusLabel,
  matchScoreLabel,
  matchScoreColor,
  timeAgo,
  estimateMatchCount,
  type CriteriaShape,
} from '@plynth/shared/utils';

describe('formatCAD', () => {
  it('formats whole-dollar amounts from cents with grouping', () => {
    // 42_500_000 cents = $425,000
    expect(formatCAD(42500000)).toContain('425,000');
  });

  it('returns a non-empty currency string for zero', () => {
    expect(formatCAD(0)).toContain('0');
  });
});

describe('centsToCAD / cadToCents', () => {
  it('round-trips a whole-dollar amount', () => {
    const dollars = 425000;
    expect(centsToCAD(cadToCents(dollars))).toBe(dollars);
  });

  it('cadToCents rounds to nearest cent', () => {
    expect(cadToCents(10.005)).toBe(1001); // 1000.5 -> rounds to 1001
    expect(cadToCents(10.004)).toBe(1000);
  });

  it('centsToCAD divides by 100', () => {
    expect(centsToCAD(12345)).toBe(123.45);
  });
});

describe('formatPercent', () => {
  it('formats with one decimal', () => {
    expect(formatPercent(72, 1)).toBe('72.0%');
  });

  it('defaults to two decimals', () => {
    expect(formatPercent(8.25)).toBe('8.25%');
  });

  it('rounds to requested precision', () => {
    expect(formatPercent(33.336, 2)).toBe('33.34%');
  });
});

describe('formatNumber', () => {
  it('groups thousands', () => {
    expect(formatNumber(1234567)).toContain('1,234,567');
  });
});

describe('formatMoneyShort', () => {
  it('abbreviates exact millions without decimals', () => {
    expect(formatMoneyShort(2_000_000)).toBe('$2M');
  });

  it('abbreviates fractional millions with two decimals', () => {
    expect(formatMoneyShort(2_500_000)).toBe('$2.50M');
  });

  it('abbreviates thousands with K', () => {
    expect(formatMoneyShort(150_000)).toBe('$150K');
  });

  it('handles values just under a million as K', () => {
    expect(formatMoneyShort(999_000)).toBe('$999K');
  });
});

describe('isValidEmail', () => {
  it.each([
    'marcus@northbridge.ca',
    'a.b-c+tag@sub.example.com',
  ])('accepts %s', (email) => {
    expect(isValidEmail(email)).toBe(true);
  });

  it.each([
    '',
    'no-at-sign',
    'missing@domain',
    'spaces in@email.com',
    '@nolocal.com',
    'two@@at.com',
  ])('rejects %s', (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('rejects passwords shorter than 12 chars', () => {
    expect(isValidPassword('short')).toBe(false);
    expect(isValidPassword('eleven_chars')).toBe(true); // 12 chars
    expect(isValidPassword('a'.repeat(11))).toBe(false);
  });

  it('accepts exactly 12 chars (boundary)', () => {
    expect(isValidPassword('a'.repeat(12))).toBe(true);
  });

  it('accepts long passwords', () => {
    expect(isValidPassword('a'.repeat(200))).toBe(true);
  });
});

describe('isValidLoanAmount', () => {
  it('rejects below $50k minimum (in cents)', () => {
    expect(isValidLoanAmount(4_999_999)).toBe(false); // $49,999.99
  });

  it('accepts exactly $50k (boundary)', () => {
    expect(isValidLoanAmount(5_000_000)).toBe(true);
  });

  it('accepts large amounts', () => {
    expect(isValidLoanAmount(340_000_000)).toBe(true);
  });

  it('rejects zero and negatives', () => {
    expect(isValidLoanAmount(0)).toBe(false);
    expect(isValidLoanAmount(-1)).toBe(false);
  });
});

describe('isValidLTV', () => {
  it('accepts the open-closed range (0, 100]', () => {
    expect(isValidLTV(0.01)).toBe(true);
    expect(isValidLTV(72)).toBe(true);
    expect(isValidLTV(100)).toBe(true);
  });

  it('rejects boundary and out-of-range values', () => {
    expect(isValidLTV(0)).toBe(false);
    expect(isValidLTV(-5)).toBe(false);
    expect(isValidLTV(100.1)).toBe(false);
  });
});

describe('isValidBeaconScore', () => {
  it('accepts the inclusive range [300, 900]', () => {
    expect(isValidBeaconScore(300)).toBe(true);
    expect(isValidBeaconScore(640)).toBe(true);
    expect(isValidBeaconScore(900)).toBe(true);
  });

  it('rejects out-of-range scores', () => {
    expect(isValidBeaconScore(299)).toBe(false);
    expect(isValidBeaconScore(901)).toBe(false);
    expect(isValidBeaconScore(0)).toBe(false);
  });
});

describe('validateDealNumber', () => {
  it('accepts exactly four digits', () => {
    expect(validateDealNumber('0247')).toBe(true);
    expect(validateDealNumber('9999')).toBe(true);
  });

  it('rejects wrong length or non-digits', () => {
    expect(validateDealNumber('247')).toBe(false);
    expect(validateDealNumber('02470')).toBe(false);
    expect(validateDealNumber('abcd')).toBe(false);
    expect(validateDealNumber('02 7')).toBe(false);
    expect(validateDealNumber('')).toBe(false);
  });

  it('rejects injection-shaped payloads', () => {
    expect(validateDealNumber("0247'; DROP TABLE deals;--")).toBe(false);
    expect(validateDealNumber('0247\n9999')).toBe(false);
  });
});

describe('dealStatusLabel', () => {
  it('maps known statuses', () => {
    expect(dealStatusLabel('negotiating')).toBe('Negotiating');
    expect(dealStatusLabel('funded')).toBe('Funded');
    expect(dealStatusLabel('draft')).toBe('Draft');
  });

  it('passes through unknown statuses unchanged', () => {
    expect(dealStatusLabel('mystery')).toBe('mystery');
  });
});

describe('offerStatusLabel', () => {
  it('maps known statuses', () => {
    expect(offerStatusLabel('countered')).toBe('Countered');
    expect(offerStatusLabel('accepted')).toBe('Accepted');
  });

  it('passes through unknown statuses unchanged', () => {
    expect(offerStatusLabel('weird')).toBe('weird');
  });
});

describe('matchScoreLabel', () => {
  it('buckets by threshold', () => {
    expect(matchScoreLabel(94)).toBe('Excellent'); // >= 80
    expect(matchScoreLabel(80)).toBe('Excellent'); // boundary
    expect(matchScoreLabel(72)).toBe('Good'); // >= 60
    expect(matchScoreLabel(60)).toBe('Good'); // boundary
    expect(matchScoreLabel(45)).toBe('Fair'); // >= 30
    expect(matchScoreLabel(30)).toBe('Fair'); // boundary
    expect(matchScoreLabel(10)).toBe('Poor');
  });
});

describe('matchScoreColor', () => {
  it('buckets by threshold', () => {
    expect(matchScoreColor(94)).toBe('bg-green-200');
    expect(matchScoreColor(60)).toBe('bg-amber-200');
    expect(matchScoreColor(30)).toBe('bg-yellow-200');
    expect(matchScoreColor(0)).toBe('bg-gray-200');
  });
});

describe('timeAgo', () => {
  // Inputs constructed relative to now so the test is deterministic regardless
  // of when it runs.
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('returns "just now" under a minute', () => {
    expect(timeAgo(ago(30 * 1000))).toBe('just now');
  });

  it('returns minutes bucket', () => {
    expect(timeAgo(ago(5 * 60 * 1000))).toBe('5m ago');
  });

  it('returns hours bucket', () => {
    expect(timeAgo(ago(2 * 60 * 60 * 1000))).toBe('2h ago');
  });

  it('returns days bucket', () => {
    expect(timeAgo(ago(3 * 24 * 60 * 60 * 1000))).toBe('3d ago');
  });

  it('falls back to a formatted date beyond a week', () => {
    const result = timeAgo(ago(10 * 24 * 60 * 60 * 1000));
    expect(result).not.toContain('ago');
    expect(result.length).toBeGreaterThan(0);
  });
});

describe('estimateMatchCount', () => {
  const base: CriteriaShape = {
    assets: ['Residential 1st'],
    provinces: ['ON'],
    loanMin: 150000,
    loanMax: 2000000,
    ltv1: 75,
    beacon: 640,
    bfs: false,
    exclusions: [],
  };

  it('returns a non-negative integer', () => {
    const n = estimateMatchCount(base);
    expect(Number.isInteger(n)).toBe(true);
    expect(n).toBeGreaterThanOrEqual(0);
  });

  it('never goes below zero even with heavy exclusions and minimal criteria', () => {
    const n = estimateMatchCount({
      assets: [],
      provinces: [],
      loanMin: 0,
      loanMax: 0,
      ltv1: 0,
      beacon: 900,
      bfs: false,
      exclusions: new Array(50).fill('x'),
    });
    expect(n).toBe(0);
  });

  it('matches the exact heuristic for a fixed input', () => {
    // n = 2 + 1*7 + 1*5.5 + (2000000-150000)/100000*0.4 + max(0,75-60)*0.55
    //     + max(0,700-640)*0.12 + 0 - 0
    //   = 2 + 7 + 5.5 + 7.4 + 8.25 + 7.2 = 37.35 -> round = 37
    expect(estimateMatchCount(base)).toBe(37);
  });

  it('increases when more asset classes are added', () => {
    const more = { ...base, assets: [...base.assets, 'Commercial'] };
    expect(estimateMatchCount(more)).toBeGreaterThan(estimateMatchCount(base));
  });

  it('increases when more provinces are added', () => {
    const more = { ...base, provinces: [...base.provinces, 'QC'] };
    expect(estimateMatchCount(more)).toBeGreaterThan(estimateMatchCount(base));
  });

  it('increases with higher LTV tolerance', () => {
    const higher = { ...base, ltv1: 90 };
    expect(estimateMatchCount(higher)).toBeGreaterThan(estimateMatchCount(base));
  });

  it('decreases with more exclusions', () => {
    const fewer = estimateMatchCount(base);
    const moreExclusions = estimateMatchCount({
      ...base,
      exclusions: ['Rural', 'Cannabis-related', 'Hospitality'],
    });
    expect(moreExclusions).toBeLessThan(fewer);
  });

  it('adds for BFS acceptance', () => {
    const withBfs = estimateMatchCount({ ...base, bfs: true });
    expect(withBfs).toBeGreaterThan(estimateMatchCount(base));
  });
});
