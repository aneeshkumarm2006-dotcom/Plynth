import { describe, it, expect } from 'vitest';
import {
  dealsService,
  offersService,
  fundingsService,
  lendersService,
  analyticsService,
} from '@plynth/supabase/services';
import { hasSupabase } from '@plynth/supabase/client';
import { LENDER_MOCK, BROKER_MOCK } from '@plynth/shared/mock';

describe('mock-mode precondition', () => {
  it('Supabase is disabled', () => {
    expect(hasSupabase).toBe(false);
  });
});

// ============================================================
// dealsService — number allocation + create shape
// ============================================================
describe('dealsService.nextDealNumber (mock)', () => {
  it('returns a zero-padded 4-digit string', async () => {
    const n = await dealsService.nextDealNumber('any');
    expect(n).toMatch(/^\d{4}$/);
  });

  it('equals 0252 (one past the 0251 fixture max)', async () => {
    expect(await dealsService.nextDealNumber('any')).toBe('0252');
  });

  it('is tenant-agnostic in mock mode', async () => {
    expect(await dealsService.nextDealNumber('broker-a')).toBe(
      await dealsService.nextDealNumber('broker-b')
    );
  });
});

describe('dealsService.create (mock)', () => {
  const input = {
    city: 'Toronto',
    province: 'ON',
    asset_class: 'Residential 1st',
    loan_amount_cents: 42500000,
    ltv: 72,
    position: 'first' as const,
    term_months: 12,
  };

  it('auto-allocates 0252 and returns active status with mock id', async () => {
    const deal = await dealsService.create('broker-1', input);
    expect(deal.deal_number).toBe('0252');
    expect(deal.status).toBe('active');
    expect(deal.id).toBe('mock-0252');
    expect(deal.broker_id).toBe('broker-1');
    expect(deal.loan_amount_cents).toBe(42500000);
    expect(typeof deal.created_at).toBe('string');
    expect(typeof deal.updated_at).toBe('string');
  });

  it('honours an explicit deal_number', async () => {
    const deal = await dealsService.create('broker-1', { ...input, deal_number: '0301' });
    expect(deal.deal_number).toBe('0301');
    expect(deal.id).toBe('mock-0301');
  });

  it('does not mutate the BROKER_MOCK.pipeline fixture across creates', async () => {
    const before = BROKER_MOCK.pipeline.length;
    await dealsService.create('broker-1', input);
    await dealsService.create('broker-1', input);
    expect(BROKER_MOCK.pipeline.length).toBe(before);
    // and still allocates 0252 because the fixture is unchanged
    expect(await dealsService.nextDealNumber('broker-1')).toBe('0252');
  });
});

// ============================================================
// offersService — mock activity + submit
// ============================================================
describe('offersService.activityForDeal (mock)', () => {
  it('returns the fixture activity array', async () => {
    const act = await offersService.activityForDeal('any-deal');
    expect(act).toEqual(BROKER_MOCK.activity);
    expect(act.length).toBeGreaterThan(0);
    for (const entry of act) {
      expect(typeof entry.t).toBe('string');
      expect(typeof entry.e).toBe('string');
    }
  });
});

describe('offersService.listForDeal (mock)', () => {
  it('returns the dealOffers fixture', async () => {
    const offers = await offersService.listForDeal('any-deal');
    expect(offers).toEqual(BROKER_MOCK.dealOffers);
  });
});

describe('offersService.submit (mock)', () => {
  it('returns a mock offer with status submitted, the passed rate, and a future expiry', async () => {
    const offer = await offersService.submit('lender-1', {
      deal_id: 'deal-1',
      rate_percent: 8.75,
      expires_in_days: 5,
    });
    expect(offer.id).toBe('mock-offer');
    expect(offer.deal_id).toBe('deal-1');
    expect(offer.lender_id).toBe('lender-1');
    expect(offer.rate_percent).toBe(8.75);
    expect(offer.status).toBe('submitted');
    expect(offer.is_best_offer).toBe(false);
    expect(new Date(offer.expires_at).getTime()).toBeGreaterThan(Date.now());
  });

  it('defaults optional fields to null', async () => {
    const offer = await offersService.submit('lender-1', {
      deal_id: 'deal-1',
      rate_percent: 9,
    });
    expect(offer.lender_fee_percent).toBeNull();
    expect(offer.broker_fee_percent).toBeNull();
    expect(offer.term_months).toBeNull();
    expect(offer.max_ltv).toBeNull();
    expect(offer.conditions_text).toBeNull();
  });

  it('expiry honours expires_in_days (10 days ~ 9-11 days out)', async () => {
    const offer = await offersService.submit('lender-1', {
      deal_id: 'd',
      rate_percent: 9,
      expires_in_days: 10,
    });
    const daysOut = (new Date(offer.expires_at).getTime() - Date.now()) / 86_400_000;
    expect(daysOut).toBeGreaterThan(9);
    expect(daysOut).toBeLessThan(11);
  });
});

describe('offersService counter/accept/reject (mock) resolve without throwing', () => {
  it('counter resolves', async () => {
    await expect(
      offersService.counter('offer-1', 'broker', { rate_percent: 9 })
    ).resolves.toBeUndefined();
  });

  it('accept resolves', async () => {
    await expect(offersService.accept('offer-1')).resolves.toBeUndefined();
  });

  it('reject resolves', async () => {
    await expect(offersService.reject('offer-1')).resolves.toBeUndefined();
  });
});

// ============================================================
// fundingsService — broker + lender shapes
// ============================================================
describe('fundingsService.listForBroker (mock)', () => {
  it('maps display dollars to cents and carries the lender as counterparty', async () => {
    const rows = await fundingsService.listForBroker('broker-1');
    expect(rows.length).toBe(BROKER_MOCK.funded.length);
    const hamilton = rows.find((r) => r.city.startsWith('Hamilton'));
    expect(hamilton?.loan_amount_cents).toBe(54000000);
    expect(hamilton?.counterparty).toBe('MIC · Ontario');
    expect(hamilton?.actual_fee_percent).toBe(2); // fee "2.0%" -> 2
  });

  it('every row has an integer cents amount and numeric rate/term', async () => {
    const rows = await fundingsService.listForBroker('broker-1');
    for (const r of rows) {
      expect(Number.isInteger(r.loan_amount_cents)).toBe(true);
      expect(typeof r.actual_rate_percent).toBe('number');
      expect(typeof r.actual_term_months).toBe('number');
    }
  });
});

describe('fundingsService.listForLender (mock)', () => {
  it('counterparty is the anonymized broker, fee is null', async () => {
    const rows = await fundingsService.listForLender('lender-1');
    expect(rows.length).toBe(LENDER_MOCK.funded.length);
    for (const r of rows) {
      expect(r.counterparty).toBe('Anonymized');
      expect(r.actual_fee_percent).toBeNull();
    }
  });
});

// ============================================================
// lendersService.listDirectory (mock)
// ============================================================
describe('lendersService.listDirectory (mock)', () => {
  it('returns a non-empty directory with every required field', async () => {
    const dir = await lendersService.listDirectory();
    expect(dir.length).toBe(BROKER_MOCK.lenders.length);
    for (const e of dir) {
      expect(typeof e.id).toBe('string');
      expect(e.id).toMatch(/^mock-lender-\d+$/);
      for (const field of ['name', 'type', 'region', 'assets', 'ltv', 'size', 'speed'] as const) {
        expect(typeof e[field]).toBe('string');
        expect(e[field].length).toBeGreaterThan(0);
      }
    }
  });

  it('assigns unique ids', async () => {
    const dir = await lendersService.listDirectory();
    const ids = dir.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

// ============================================================
// analyticsService (mock) — fixture shapes
// ============================================================
describe('analyticsService.lenderStats (mock)', () => {
  it('returns a 4-stat array, each with value + label', async () => {
    const stats = await analyticsService.lenderStats('lender-1');
    expect(stats.length).toBe(4);
    for (const s of stats) {
      expect(typeof s.value).toBe('string');
      expect(typeof s.label).toBe('string');
    }
    expect(stats).toEqual(LENDER_MOCK.stats);
  });
});

describe('analyticsService.brokerStats (mock)', () => {
  it('returns the broker stats fixture, length 4', async () => {
    const stats = await analyticsService.brokerStats('broker-1');
    expect(stats.length).toBe(4);
    expect(stats).toEqual(BROKER_MOCK.stats);
  });
});

describe('analyticsService.lenderSidebar (mock)', () => {
  it('returns winRate / avgResponse / criteria strings from the fixture', async () => {
    const sidebar = await analyticsService.lenderSidebar('lender-1');
    expect(sidebar).toEqual({
      winRate: LENDER_MOCK.sidebarStats.winRate,
      avgResponse: LENDER_MOCK.sidebarStats.avgResponse,
      criteria: LENDER_MOCK.sidebarStats.criteria,
    });
    expect(sidebar.winRate).toMatch(/%$/);
    expect(sidebar.avgResponse).toMatch(/hrs$/);
  });
});
