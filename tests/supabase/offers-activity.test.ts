import { describe, it, expect } from 'vitest';
import { offersService } from '@plynth/supabase/services';
import { hasSupabase } from '@plynth/supabase/client';

// test.md §1, §2.5: offersService.activityForDeal mock-mode shape + the
// documented "newest first" contract. Under Vitest, Supabase is disabled so the
// service returns the BROKER_MOCK.activity fixture; the live newest-first sort
// path requires a real DB (documented as not-executed in the report).

describe('offersService.activityForDeal (mock mode)', () => {
  it('preconditions: Supabase is disabled', () => {
    expect(hasSupabase).toBe(false);
  });

  it('returns a non-empty array of {t, e} activity entries', async () => {
    const entries = await offersService.activityForDeal('any-deal-id');
    expect(Array.isArray(entries)).toBe(true);
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(typeof entry.t).toBe('string');
      expect(typeof entry.e).toBe('string');
      expect(entry.t.length).toBeGreaterThan(0);
      expect(entry.e.length).toBeGreaterThan(0);
    }
  });

  it('returns the same fixture regardless of deal id (mock mode ignores tenant)', async () => {
    const a = await offersService.activityForDeal('deal-1');
    const b = await offersService.activityForDeal('deal-2');
    expect(a).toEqual(b);
  });

  it('keeps counterparties anonymized (no raw lender firm names leak)', async () => {
    const entries = await offersService.activityForDeal('any-deal-id');
    // Entries refer to "Lender A/B/C" or "You", never a real firm name.
    for (const entry of entries) {
      expect(entry.e).not.toMatch(/Fortress MIC|Cardinal Private Capital/);
    }
  });

  it('presents the newest entry first (contract: newest-first ordering)', async () => {
    const entries = await offersService.activityForDeal('any-deal-id');
    // The fixture is authored newest-first; the live path sorts by ts desc.
    // Assert the leading entry is the most recent relative-time label.
    expect(entries[0].t).toBe('3 hours ago');
    expect(entries[entries.length - 1].e).toContain('submitted to the marketplace');
  });
});
