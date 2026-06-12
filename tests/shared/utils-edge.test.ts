import { describe, it, expect } from 'vitest';
import {
  formatCAD,
  centsToCAD,
  cadToCents,
  formatPercent,
  formatMoneyShort,
  isValidEmail,
  isValidPassword,
  isValidLTV,
  isValidBeaconScore,
  validateDealNumber,
  matchScoreColor,
  matchScoreLabel,
  buildCriteriaPreview,
  timeAgo,
  estimateMatchCount,
  effectiveAnnualCost,
  type CriteriaShape,
} from '@plynth/shared/utils';

describe('effectiveAnnualCost', () => {
  it('adds full fees when the term is 12 months', () => {
    expect(effectiveAnnualCost(9.25, 2.0, 1.0, 12)).toBeCloseTo(12.25, 5);
  });
  it('annualizes (halves) fees over a 24-month term', () => {
    expect(effectiveAnnualCost(9.25, 2.0, 1.0, 24)).toBeCloseTo(10.75, 5);
  });
  it('exposes that a lower headline rate can cost more', () => {
    const lowRateHighFee = effectiveAnnualCost(9.0, 2.5, 0.5, 12); // 12.0
    const highRateLowFee = effectiveAnnualCost(9.5, 0.5, 0.5, 12); // 10.5
    expect(highRateLowFee).toBeLessThan(lowRateHighFee);
  });
  it('defaults fees/term and handles a zero term without dividing by zero', () => {
    expect(effectiveAnnualCost(9)).toBe(9);
    expect(effectiveAnnualCost(9, 2, 1, 0)).toBe(12);
  });
});

// Strips non-breaking spaces / NARROW NO-BREAK SPACE that Intl can emit, so we
// can assert on the digits/symbols without locale-runtime whitespace flakiness.
const norm = (s: string) => s.replace(/ | /g, ' ');

// ============================================================
// formatCAD — zero, negative, fractional cents, very large, flag
// ============================================================
describe('formatCAD edge cases', () => {
  it('renders zero as $0 with no decimals by default', () => {
    expect(norm(formatCAD(0))).toBe('$0');
  });

  it('renders negative cents with a minus sign', () => {
    const out = norm(formatCAD(-42500000));
    expect(out).toContain('425,000');
    expect(out).toContain('-');
  });

  it('rounds fractional cents to whole dollars when showDecimals (default) — 12345c -> $123', () => {
    // 12345 cents = $123.45 -> rounds to $123 with min/max fraction digits 0
    expect(norm(formatCAD(12345))).toBe('$123');
  });

  it('rounds .50 up to the next dollar with no decimals', () => {
    // 12350 cents = $123.50 -> banker? Intl uses half-up -> $124
    expect(norm(formatCAD(12350))).toBe('$124');
  });

  it('handles very large amounts with grouping', () => {
    // 99_999_999_99 cents = $999,999,999.99 -> $1,000,000,000 rounded
    expect(norm(formatCAD(99999999999))).toContain('1,000,000,000');
  });

  it('showDecimals=false keeps the cents using default currency fraction digits', () => {
    // 12345 cents -> $123.45 (2 dp)
    expect(norm(formatCAD(12345, false))).toBe('$123.45');
  });

  it('showDecimals=false renders exact dollars with .00', () => {
    expect(norm(formatCAD(42500000, false))).toBe('$425,000.00');
  });
});

// ============================================================
// centsToCAD / cadToCents — round-trip, half-cent, zero, negative
// ============================================================
describe('centsToCAD / cadToCents edge cases', () => {
  it('round-trips zero', () => {
    expect(centsToCAD(cadToCents(0))).toBe(0);
  });

  it('round-trips a negative amount', () => {
    expect(centsToCAD(cadToCents(-123.45))).toBe(-123.45);
  });

  it('cadToCents rounds a half-cent up (positive)', () => {
    expect(cadToCents(0.005)).toBe(1); // 0.5c -> 1c (Math.round half-up)
  });

  it('cadToCents on a negative half-cent rounds toward +inf (Math.round)', () => {
    // Math.round(-0.5) === -0 ; -1.5 cents -> Math.round(-1.5) = -1
    expect(cadToCents(-0.015)).toBe(-1);
  });

  it('centsToCAD on zero is exactly 0', () => {
    expect(centsToCAD(0)).toBe(0);
  });

  it('centsToCAD on a negative value', () => {
    expect(centsToCAD(-9900)).toBe(-99);
  });
});

// ============================================================
// formatPercent — zero, negative, default vs explicit decimals
// ============================================================
describe('formatPercent edge cases', () => {
  it('formats zero with default two decimals', () => {
    expect(formatPercent(0)).toBe('0.00%');
  });

  it('formats zero with zero decimals', () => {
    expect(formatPercent(0, 0)).toBe('0%');
  });

  it('formats a negative value', () => {
    expect(formatPercent(-3.5, 1)).toBe('-3.5%');
  });

  it('honours explicit higher precision', () => {
    expect(formatPercent(8.12345, 3)).toBe('8.123%');
  });
});

// ============================================================
// formatMoneyShort — 999/1000/999_999/1_000_000 boundaries
// ============================================================
describe('formatMoneyShort boundaries', () => {
  it('999 -> $1K (rounds via toFixed(0))', () => {
    // (999/1000).toFixed(0) = "1" -> "$1K"
    expect(formatMoneyShort(999)).toBe('$1K');
  });

  it('1000 -> $1K', () => {
    expect(formatMoneyShort(1000)).toBe('$1K');
  });

  it('999_999 -> $1000K (still under a million, K branch)', () => {
    // (999999/1000).toFixed(0) = "1000"
    expect(formatMoneyShort(999_999)).toBe('$1000K');
  });

  it('1_000_000 -> $1M exactly (no decimals on exact millions)', () => {
    expect(formatMoneyShort(1_000_000)).toBe('$1M');
  });

  it('exact 5M -> $5M', () => {
    expect(formatMoneyShort(5_000_000)).toBe('$5M');
  });

  it('fractional millions -> two decimals', () => {
    expect(formatMoneyShort(1_500_000)).toBe('$1.50M');
    expect(formatMoneyShort(2_340_000)).toBe('$2.34M');
  });

  it('zero -> $0K (K branch, since 0 < 1_000_000)', () => {
    expect(formatMoneyShort(0)).toBe('$0K');
  });
});

// ============================================================
// isValidEmail — additional false/boundary cases
// ============================================================
describe('isValidEmail additional cases', () => {
  it('rejects a trailing-dot domain with no TLD char', () => {
    expect(isValidEmail('user@domain.')).toBe(false);
  });

  it('rejects leading/trailing whitespace', () => {
    expect(isValidEmail(' user@domain.com')).toBe(false);
    expect(isValidEmail('user@domain.com ')).toBe(false);
  });

  it('rejects newline-injected addresses', () => {
    expect(isValidEmail('user@domain.com\nBCC: evil@x.com')).toBe(false);
  });

  it('accepts a minimal valid form', () => {
    expect(isValidEmail('a@b.c')).toBe(true);
  });
});

// ============================================================
// isValidPassword — exact 12 boundary
// ============================================================
describe('isValidPassword boundary', () => {
  it('11 chars invalid, 12 chars valid', () => {
    expect(isValidPassword('x'.repeat(11))).toBe(false);
    expect(isValidPassword('x'.repeat(12))).toBe(true);
  });

  it('empty string invalid', () => {
    expect(isValidPassword('')).toBe(false);
  });
});

// ============================================================
// isValidLTV — 0 invalid, 0.01 valid, 100 valid, 100.01 invalid
// ============================================================
describe('isValidLTV precise boundaries', () => {
  it('0 invalid, 0.01 valid', () => {
    expect(isValidLTV(0)).toBe(false);
    expect(isValidLTV(0.01)).toBe(true);
  });

  it('100 valid, 100.01 invalid', () => {
    expect(isValidLTV(100)).toBe(true);
    expect(isValidLTV(100.01)).toBe(false);
  });
});

// ============================================================
// isValidBeaconScore — 299/300/900/901
// ============================================================
describe('isValidBeaconScore precise boundaries', () => {
  it('299 invalid, 300 valid', () => {
    expect(isValidBeaconScore(299)).toBe(false);
    expect(isValidBeaconScore(300)).toBe(true);
  });

  it('900 valid, 901 invalid', () => {
    expect(isValidBeaconScore(900)).toBe(true);
    expect(isValidBeaconScore(901)).toBe(false);
  });
});

// ============================================================
// validateDealNumber — spacing + injection
// ============================================================
describe('validateDealNumber spacing & injection', () => {
  it("accepts '0247'", () => {
    expect(validateDealNumber('0247')).toBe(true);
  });

  it('rejects leading or trailing space', () => {
    expect(validateDealNumber(' 0247')).toBe(false);
    expect(validateDealNumber('0247 ')).toBe(false);
  });

  it('rejects too-short / too-long', () => {
    expect(validateDealNumber('247')).toBe(false);
    expect(validateDealNumber('02470')).toBe(false);
  });

  it('rejects non-digits', () => {
    expect(validateDealNumber('abcd')).toBe(false);
    expect(validateDealNumber('02a7')).toBe(false);
  });

  it('rejects SQL/script injection shapes', () => {
    expect(validateDealNumber("0247' OR '1'='1")).toBe(false);
    expect(validateDealNumber('<script>0247</script>')).toBe(false);
    expect(validateDealNumber('0247;--')).toBe(false);
  });
});

// ============================================================
// matchScoreColor / matchScoreLabel — every boundary
// ============================================================
describe('matchScoreColor boundaries', () => {
  it.each([
    [0, 'bg-gray-200'],
    [29, 'bg-gray-200'],
    [30, 'bg-yellow-200'],
    [59, 'bg-yellow-200'],
    [60, 'bg-amber-200'],
    [79, 'bg-amber-200'],
    [80, 'bg-green-200'],
    [100, 'bg-green-200'],
  ])('score %i -> %s', (score, color) => {
    expect(matchScoreColor(score)).toBe(color);
  });
});

describe('matchScoreLabel boundaries', () => {
  it.each([
    [0, 'Poor'],
    [29, 'Poor'],
    [30, 'Fair'],
    [59, 'Fair'],
    [60, 'Good'],
    [79, 'Good'],
    [80, 'Excellent'],
    [100, 'Excellent'],
  ])('score %i -> %s', (score, label) => {
    expect(matchScoreLabel(score)).toBe(label);
  });
});

// ============================================================
// buildCriteriaPreview — normal + empty arrays
// ============================================================
describe('buildCriteriaPreview', () => {
  it('joins assets with & and provinces with comma', () => {
    expect(
      buildCriteriaPreview(['Residential 1st', 'Residential 2nd'], ['ON', 'QC'], 80, 75)
    ).toBe('Residential 1st & Residential 2nd · ON, QC · ≤ 80% LTV');
  });

  it('handles empty arrays without throwing', () => {
    expect(buildCriteriaPreview([], [], 65, 60)).toBe(' ·  · ≤ 65% LTV');
  });

  it('uses ltv1 (not ltv2) in the preview', () => {
    expect(buildCriteriaPreview(['Commercial'], ['ON'], 70, 99)).toContain('≤ 70% LTV');
  });
});

// ============================================================
// timeAgo — boundaries + future timestamp
// ============================================================
describe('timeAgo boundaries & future', () => {
  const ago = (ms: number) => new Date(Date.now() - ms).toISOString();

  it('exactly 59s -> just now', () => {
    expect(timeAgo(ago(59 * 1000))).toBe('just now');
  });

  it('exactly 60s -> 1m ago', () => {
    expect(timeAgo(ago(60 * 1000))).toBe('1m ago');
  });

  it('59m59s -> 59m ago (still minutes bucket)', () => {
    expect(timeAgo(ago((59 * 60 + 59) * 1000))).toBe('59m ago');
  });

  it('exactly 1h -> 1h ago', () => {
    expect(timeAgo(ago(60 * 60 * 1000))).toBe('1h ago');
  });

  it('23h59m -> 23h ago', () => {
    expect(timeAgo(ago((23 * 60 + 59) * 60 * 1000))).toBe('23h ago');
  });

  it('exactly 24h -> 1d ago', () => {
    expect(timeAgo(ago(24 * 60 * 60 * 1000))).toBe('1d ago');
  });

  it('6d -> 6d ago, 7d -> formatted date', () => {
    expect(timeAgo(ago(6 * 24 * 60 * 60 * 1000))).toBe('6d ago');
    expect(timeAgo(ago(7 * 24 * 60 * 60 * 1000))).not.toContain('ago');
  });

  it('does not crash on a future timestamp; returns "just now" (seconds negative < 60)', () => {
    const future = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    // seconds is negative, < 60, so the first branch matches.
    expect(timeAgo(future)).toBe('just now');
  });
});

// ============================================================
// estimateMatchCount — extremes, clamping, monotonicity in BFS/loan
// ============================================================
describe('estimateMatchCount extremes', () => {
  it('empty criteria still yields >= 0 (base 2, beacon boost from default 0 capped)', () => {
    const n = estimateMatchCount({
      assets: [],
      provinces: [],
      loanMin: 0,
      loanMax: 0,
      ltv1: 0,
      beacon: 700,
      bfs: false,
      exclusions: [],
    });
    expect(n).toBeGreaterThanOrEqual(0);
    expect(Number.isInteger(n)).toBe(true);
    // base 2 only
    expect(n).toBe(2);
  });

  it('all asset classes + all provinces + max LTV produces a large count', () => {
    const big: CriteriaShape = {
      assets: ['a', 'b', 'c', 'd', 'e', 'f'],
      provinces: ['ON', 'QC', 'BC', 'AB', 'MB', 'SK', 'NS', 'NB'],
      loanMin: 0,
      loanMax: 20_000_000,
      ltv1: 100,
      beacon: 300,
      bfs: true,
      exclusions: [],
    };
    expect(estimateMatchCount(big)).toBeGreaterThan(100);
  });

  it('clamps to 0 and never goes negative regardless of exclusion count', () => {
    const n = estimateMatchCount({
      assets: [],
      provinces: [],
      loanMin: 0,
      loanMax: 0,
      ltv1: 0,
      beacon: 900,
      bfs: false,
      exclusions: new Array(1000).fill('x'),
    });
    expect(n).toBe(0);
  });

  it('is monotonic non-decreasing in BFS', () => {
    const base: CriteriaShape = {
      assets: ['a'], provinces: ['ON'], loanMin: 0, loanMax: 1_000_000,
      ltv1: 70, beacon: 640, bfs: false, exclusions: [],
    };
    expect(estimateMatchCount({ ...base, bfs: true })).toBeGreaterThan(
      estimateMatchCount(base)
    );
  });

  it('is monotonic non-decreasing in loanMax span', () => {
    const base: CriteriaShape = {
      assets: ['a'], provinces: ['ON'], loanMin: 0, loanMax: 1_000_000,
      ltv1: 70, beacon: 640, bfs: false, exclusions: [],
    };
    expect(
      estimateMatchCount({ ...base, loanMax: 5_000_000 })
    ).toBeGreaterThanOrEqual(estimateMatchCount(base));
  });

  it('beacon below 700 raises the estimate; at/above 700 the boost is clamped to 0', () => {
    const base: CriteriaShape = {
      assets: ['a'], provinces: ['ON'], loanMin: 0, loanMax: 0,
      ltv1: 0, beacon: 700, bfs: false, exclusions: [],
    };
    expect(estimateMatchCount({ ...base, beacon: 500 })).toBeGreaterThan(
      estimateMatchCount(base)
    );
    // beacon 750 vs 700: both clamp the (700-beacon) term to 0 -> equal
    expect(estimateMatchCount({ ...base, beacon: 750 })).toBe(
      estimateMatchCount(base)
    );
  });
});
