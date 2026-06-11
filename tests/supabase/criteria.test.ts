import { describe, it, expect } from 'vitest';
import {
  builderToRow,
  rowToBuilder,
  type BuilderState,
  type CriteriaRow,
} from '@plynth/supabase/services';
import { LENDER_MOCK } from '@plynth/shared/mock';

function sampleBuilder(overrides: Partial<BuilderState> = {}): BuilderState {
  return {
    assets: ['Residential 1st', 'Residential 2nd'],
    provinces: ['ON', 'QC'],
    cities: ['Toronto', 'Ottawa'],
    loanMin: 150000,
    loanMax: 2000000,
    ltv1: 75,
    ltv2: 80,
    termMin: 6,
    termMax: 24,
    beacon: 640,
    bfs: true,
    exclusions: ['Rural', 'Hospitality'],
    monthlyTarget: 5000000,
    available: 18000000,
    closeSpeed: '7–10 days',
    ...overrides,
  };
}

describe('builderToRow', () => {
  it('converts dollar fields to cents (x100)', () => {
    const row = builderToRow(sampleBuilder());
    expect(row.loan_min_cents).toBe(150000 * 100);
    expect(row.loan_max_cents).toBe(2000000 * 100);
    expect(row.monthly_deployment_target_cents).toBe(5000000 * 100);
    expect(row.available_capital_cents).toBe(18000000 * 100);
  });

  it('parses the close-speed range using an en-dash separator', () => {
    const row = builderToRow(sampleBuilder({ closeSpeed: '7–10 days' }));
    expect(row.close_speed_days_min).toBe(7);
    expect(row.close_speed_days_max).toBe(10);
  });

  it('falls back to 7/10 when the close-speed string cannot be parsed', () => {
    // Note: a plain hyphen "7-10" is NOT the en-dash split char, so parsing
    // fails and the defaults kick in.
    const row = builderToRow(sampleBuilder({ closeSpeed: 'unknown' }));
    expect(row.close_speed_days_min).toBe(7);
    expect(row.close_speed_days_max).toBe(10);
  });

  it('passes array fields through unchanged', () => {
    const b = sampleBuilder();
    const row = builderToRow(b);
    expect(row.asset_classes).toEqual(b.assets);
    expect(row.provinces).toEqual(b.provinces);
    expect(row.cities).toEqual(b.cities);
    expect(row.exclusion_flags).toEqual(b.exclusions);
    expect(row.accept_bfs_borrowers).toBe(true);
  });
});

describe('rowToBuilder', () => {
  it('converts cents fields back to dollars', () => {
    const row: CriteriaRow = {
      asset_classes: ['Residential 1st'],
      provinces: ['ON'],
      cities: ['Toronto'],
      loan_min_cents: 15000000,
      loan_max_cents: 200000000,
      ltv_max_first_position: 75,
      ltv_max_second_position: 80,
      term_min_months: 6,
      term_max_months: 24,
      min_beacon_score: 640,
      accept_bfs_borrowers: false,
      monthly_deployment_target_cents: 500000000,
      available_capital_cents: 1800000000,
      close_speed_days_min: 7,
      close_speed_days_max: 10,
      exclusion_flags: ['Rural'],
    };
    const b = rowToBuilder(row);
    expect(b.loanMin).toBe(150000);
    expect(b.loanMax).toBe(2000000);
    expect(b.monthlyTarget).toBe(5000000);
    expect(b.available).toBe(18000000);
    expect(b.closeSpeed).toBe('7–10 days');
  });

  it('defaults missing array fields to empty arrays', () => {
    const row = {
      loan_min_cents: 0,
      loan_max_cents: 0,
      ltv_max_first_position: 0,
      ltv_max_second_position: 0,
      term_min_months: 0,
      term_max_months: 0,
      min_beacon_score: 0,
      accept_bfs_borrowers: false,
      monthly_deployment_target_cents: 0,
      available_capital_cents: 0,
      close_speed_days_min: 7,
      close_speed_days_max: 10,
      // arrays intentionally omitted to exercise the ?? [] fallback
    } as unknown as CriteriaRow;
    const b = rowToBuilder(row);
    expect(b.assets).toEqual([]);
    expect(b.provinces).toEqual([]);
    expect(b.cities).toEqual([]);
    expect(b.exclusions).toEqual([]);
  });
});

describe('builder <-> row round trip', () => {
  it('preserves logical values through builder -> row -> builder', () => {
    const original = sampleBuilder();
    const restored = rowToBuilder(builderToRow(original));
    expect(restored).toEqual(original);
  });

  it('round-trips the LENDER_MOCK.criteria fixture', () => {
    const original = LENDER_MOCK.criteria;
    const restored = rowToBuilder(builderToRow(original));
    expect(restored).toEqual(original);
  });
});
