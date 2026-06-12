import { describe, it, expect } from 'vitest';
import { fundingsService, pipelineService, dealsService } from '@plynth/supabase/services';
import { hasSupabase } from '@plynth/supabase/client';

// Under Vitest, VITE_SUPABASE_* env vars are unset, so hasSupabase is false and
// services return their mock fixtures. These tests assert that mock-mode
// contract.

describe('mock-mode preconditions', () => {
  it('runs with Supabase disabled so services use fixtures', () => {
    expect(hasSupabase).toBe(false);
  });
});

describe('fundingsService.listForLender (mock mode)', () => {
  it('returns a non-empty array of funding rows with the expected shape', async () => {
    const rows = await fundingsService.listForLender('any-lender-id');
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);

    const first = rows[0];
    expect(typeof first.id).toBe('string');
    expect(typeof first.deal_number).toBe('string');
    expect(typeof first.city).toBe('string');
    expect(typeof first.loan_amount_cents).toBe('number');
    expect(first.loan_amount_cents).toBeGreaterThan(0);
    expect(typeof first.actual_rate_percent).toBe('number');
    expect(typeof first.actual_term_months).toBe('number');
    expect(typeof first.counterparty).toBe('string');
  });

  it('parses display dollar strings into integer cents', async () => {
    const rows = await fundingsService.listForLender('any-lender-id');
    // Mock first row is Hamilton $540,000 => 54,000,000 cents.
    const hamilton = rows.find((r) => r.city.startsWith('Hamilton'));
    expect(hamilton?.loan_amount_cents).toBe(54000000);
    expect(Number.isInteger(hamilton?.loan_amount_cents)).toBe(true);
  });

  it('returns the same fixture regardless of lender id (mock mode ignores tenant)', async () => {
    const a = await fundingsService.listForLender('lender-a');
    const b = await fundingsService.listForLender('lender-b');
    expect(a).toEqual(b);
  });
});

describe('dealsService deal-number allocation (mock mode)', () => {
  it('allocates the next zero-padded 4-digit number after the broker max', async () => {
    // Mock pipeline tops out at 0251, so the next number is 0252.
    const next = await dealsService.nextDealNumber('any-broker-id');
    expect(next).toBe('0252');
  });

  it('create() without a deal_number auto-allocates one (regression: no hardcoded 0252)', async () => {
    const deal = await dealsService.create('any-broker-id', {
      city: 'Toronto',
      province: 'ON',
      asset_class: 'Residential 1st',
      loan_amount_cents: 42500000,
      ltv: 72,
      position: 'first',
      term_months: 12,
    });
    expect(deal.deal_number).toMatch(/^\d{4}$/);
    expect(deal.deal_number).toBe('0252');
  });

  it('create() honours an explicitly provided deal_number', async () => {
    const deal = await dealsService.create('any-broker-id', {
      deal_number: '0299',
      city: 'Ottawa',
      province: 'ON',
      asset_class: 'Residential 1st',
      loan_amount_cents: 50000000,
      ltv: 65,
      position: 'first',
      term_months: 12,
    });
    expect(deal.deal_number).toBe('0299');
  });

  it('create() defaults to active, and honours status="draft"', async () => {
    const base = {
      city: 'Toronto',
      province: 'ON',
      asset_class: 'Residential 1st' as const,
      loan_amount_cents: 42500000,
      ltv: 72,
      position: 'first' as const,
      term_months: 12,
    };
    const active = await dealsService.create('b', base);
    expect(active.status).toBe('active');
    const draft = await dealsService.create('b', base, 'draft');
    expect(draft.status).toBe('draft');
  });

  it('update() echoes the patch in mock mode (no throw)', async () => {
    const row = await dealsService.update('deal-1', { notes: 'updated', term_months: 18 });
    expect(row.id).toBe('deal-1');
    expect((row as { notes?: string }).notes).toBe('updated');
    expect(row.term_months).toBe(18);
  });

  it('submitDraft() resolves without throwing in mock mode', async () => {
    await expect(dealsService.submitDraft('deal-1')).resolves.toBeUndefined();
  });
});

describe('pipelineService.forLender (mock mode)', () => {
  it('returns exactly the five expected pipeline column keys', async () => {
    const cols = await pipelineService.forLender('any-lender-id');
    expect(Object.keys(cols).sort()).toEqual(
      ['Dead', 'Funded', 'In Negotiation', 'Offered', 'Reviewing'].sort()
    );
  });

  it('attaches a deal_id to every card', async () => {
    const cols = await pipelineService.forLender('any-lender-id');
    const allCards = Object.values(cols).flat();
    expect(allCards.length).toBeGreaterThan(0);
    for (const c of allCards) {
      expect(typeof c.deal_id).toBe('string');
      expect(c.deal_id.length).toBeGreaterThan(0);
      expect(typeof c.no).toBe('string');
      expect(typeof c.amount).toBe('string');
      expect(typeof c.score).toBe('number');
    }
  });
});
