import { describe, it, expect } from 'vitest';
import {
  builderToRow,
  rowToBuilder,
  pipelineService,
  type BuilderState,
} from '@plynth/supabase/services';

function sampleBuilder(overrides: Partial<BuilderState> = {}): BuilderState {
  return {
    assets: ['Residential 1st'],
    provinces: ['ON'],
    cities: ['Toronto'],
    loanMin: 150000,
    loanMax: 2000000,
    ltv1: 75,
    ltv2: 80,
    termMin: 6,
    termMax: 24,
    beacon: 640,
    bfs: true,
    exclusions: ['Rural'],
    monthlyTarget: 5000000,
    available: 18000000,
    closeSpeed: '7–10 days',
    ...overrides,
  };
}

// ============================================================
// closeSpeed parsing — robust against en-dash OR hyphen, honours 0 bounds
// ============================================================
describe('builderToRow closeSpeed parsing', () => {
  it('en-dash "7–10 days" parses to {7,10}', () => {
    const row = builderToRow(sampleBuilder({ closeSpeed: '7–10 days' }));
    expect(row.close_speed_days_min).toBe(7);
    expect(row.close_speed_days_max).toBe(10);
  });

  it('plain HYPHEN "7-10 days" parses correctly to {7,10}', () => {
    const row = builderToRow(sampleBuilder({ closeSpeed: '7-10 days' }));
    expect(row.close_speed_days_min).toBe(7);
    expect(row.close_speed_days_max).toBe(10);
  });

  it('hyphen "5-30 days" keeps the real max (30)', () => {
    const row = builderToRow(sampleBuilder({ closeSpeed: '5-30 days' }));
    expect(row.close_speed_days_min).toBe(5);
    expect(row.close_speed_days_max).toBe(30);
  });

  it('garbage string falls back to {7,10}', () => {
    const row = builderToRow(sampleBuilder({ closeSpeed: 'whenever' }));
    expect(row.close_speed_days_min).toBe(7);
    expect(row.close_speed_days_max).toBe(10);
  });

  it('"0–0 days" honours legitimate 0 bounds (no false fallback)', () => {
    const row = builderToRow(sampleBuilder({ closeSpeed: '0–0 days' }));
    expect(row.close_speed_days_min).toBe(0);
    expect(row.close_speed_days_max).toBe(0);
  });
});

// ============================================================
// cents conversion + empty arrays + synthetic round-trip
// ============================================================
describe('builderToRow / rowToBuilder cents conversion', () => {
  it('multiplies dollar fields by 100', () => {
    const row = builderToRow(sampleBuilder());
    expect(row.loan_min_cents).toBe(15000000);
    expect(row.loan_max_cents).toBe(200000000);
    expect(row.monthly_deployment_target_cents).toBe(500000000);
    expect(row.available_capital_cents).toBe(1800000000);
  });

  it('passes empty arrays through builderToRow', () => {
    const row = builderToRow(
      sampleBuilder({ assets: [], provinces: [], cities: [], exclusions: [] })
    );
    expect(row.asset_classes).toEqual([]);
    expect(row.provinces).toEqual([]);
    expect(row.cities).toEqual([]);
    expect(row.exclusion_flags).toEqual([]);
  });

  it('round-trips a synthetic state with an en-dash close speed', () => {
    const original = sampleBuilder({
      assets: ['Commercial', 'Land'],
      provinces: ['BC', 'AB'],
      cities: [],
      closeSpeed: '14–21 days',
    });
    const restored = rowToBuilder(builderToRow(original));
    expect(restored).toEqual(original);
  });
});

// ============================================================
// pipelineService.forLender — full shape (mock)
// ============================================================
describe('pipelineService.forLender (mock)', () => {
  it('returns the five columns with deal_id stamped from `no`', async () => {
    const cols = await pipelineService.forLender('lender-1');
    expect(Object.keys(cols).sort()).toEqual(
      ['Dead', 'Funded', 'In Negotiation', 'Offered', 'Reviewing'].sort()
    );
    const all = Object.values(cols).flat();
    expect(all.length).toBeGreaterThan(0);
    for (const c of all) {
      expect(c.deal_id).toBe(c.no); // mock stamps deal_id = no
      expect(typeof c.amount).toBe('string');
      expect(c.amount.startsWith('$')).toBe(true);
      expect(typeof c.score).toBe('number');
    }
  });

  it('Reviewing column has the expected fixture cards', async () => {
    const cols = await pipelineService.forLender('lender-1');
    expect(cols.Reviewing.map((c) => c.no).sort()).toEqual(['0236', '0251']);
  });

  it('is tenant-agnostic in mock mode', async () => {
    const a = await pipelineService.forLender('lender-a');
    const b = await pipelineService.forLender('lender-b');
    expect(a).toEqual(b);
  });
});
