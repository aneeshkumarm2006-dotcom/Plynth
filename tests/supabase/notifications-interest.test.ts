import { describe, it, expect, beforeAll } from 'vitest';
import {
  notificationsService,
  matchedService,
} from '@plynth/supabase/services';
import { MOCK_NOTIFICATIONS, LENDER_MOCK } from '@plynth/shared/mock';

// The test environment is `node`, which has no localStorage. The interest
// signal persists there, so shim a minimal in-memory store before importing
// behaviour that depends on it.
beforeAll(() => {
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
    clear: () => store.clear(),
    key: () => null,
    length: 0,
  } as Storage;
});

describe('notificationsService (mock)', () => {
  it('seeds the inbox from the fixture', async () => {
    const rows = await notificationsService.list('user-1');
    expect(rows.length).toBe(MOCK_NOTIFICATIONS.length);
    expect(rows[0]).toHaveProperty('title');
    expect(rows[0]).toHaveProperty('created_at');
  });

  it('respects the limit argument', async () => {
    const rows = await notificationsService.list('user-1', 2);
    expect(rows.length).toBe(2);
  });

  it('markRead flips a single notification and persists across calls', async () => {
    const before = await notificationsService.list('user-1');
    const target = before.find((n) => !n.is_read);
    expect(target).toBeDefined();
    await notificationsService.markRead(target!.id);
    const after = await notificationsService.list('user-1');
    expect(after.find((n) => n.id === target!.id)!.is_read).toBe(true);
  });

  it('markAllRead clears every unread notification', async () => {
    await notificationsService.markAllRead('user-1');
    const rows = await notificationsService.list('user-1');
    expect(rows.every((n) => n.is_read)).toBe(true);
  });
});

describe('matchedService.setInterest (mock persistence)', () => {
  const dealNo = LENDER_MOCK.matched[0].no;

  it('defaults to no interest signal', async () => {
    const rows = await matchedService.listForLender('lender-1');
    const deal = rows.find((d) => d.deal_number === dealNo);
    expect(deal?.interest_status ?? null).toBeNull();
  });

  it('persists "passed" so it survives a re-fetch', async () => {
    await matchedService.setInterest('lender-1', dealNo, 'passed');
    const rows = await matchedService.listForLender('lender-1');
    expect(rows.find((d) => d.deal_number === dealNo)?.interest_status).toBe('passed');
  });

  it('overwrites a prior signal with "interested"', async () => {
    await matchedService.setInterest('lender-1', dealNo, 'interested');
    const deal = await matchedService.getForLender('lender-1', dealNo);
    expect(deal?.interest_status).toBe('interested');
  });
});
