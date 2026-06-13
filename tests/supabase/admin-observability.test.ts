import { describe, it, expect } from 'vitest';
import { adminService } from '@plynth/supabase/services';
import { hasSupabase } from '@plynth/supabase/client';
import {
  initTelemetry,
  track,
  captureError,
  trackPageView,
  flush,
} from '@plynth/supabase/telemetry';

// Mock mode (VITE_SUPABASE_* unset → hasSupabase false). These assert
// the observability service contract on mock fixtures and that the
// telemetry SDK is an inert no-op without Supabase.

describe('mock-mode precondition', () => {
  it('has Supabase disabled', () => {
    expect(hasSupabase).toBe(false);
  });
});

describe('adminService.healthSummary (mock)', () => {
  it('returns a summary with per-app breakdown and top fingerprints', async () => {
    const h = await adminService.healthSummary(60);
    expect(typeof h.errorCount).toBe('number');
    expect(typeof h.fatalCount).toBe('number');
    expect(Array.isArray(h.byApp)).toBe(true);
    expect(h.byApp.length).toBeGreaterThan(0);
    expect(Array.isArray(h.topFingerprints)).toBe(true);
    expect(h.topFingerprints[0]).toHaveProperty('fingerprint');
    expect(h.topFingerprints[0]).toHaveProperty('count');
  });
});

describe('adminService.errorStream (mock)', () => {
  it('returns error rows with the expected shape', async () => {
    const rows = await adminService.errorStream();
    expect(Array.isArray(rows)).toBe(true);
    expect(rows.length).toBeGreaterThan(0);
    const first = rows[0];
    expect(typeof first.id).toBe('number');
    expect(typeof first.app).toBe('string');
    expect(['info', 'warning', 'error', 'fatal']).toContain(first.severity);
    expect(typeof first.message).toBe('string');
  });

  it('filters by app and severity', async () => {
    const lender = await adminService.errorStream({ app: 'lender' });
    expect(lender.every((r) => r.app === 'lender')).toBe(true);
    const fatal = await adminService.errorStream({ severity: 'fatal' });
    expect(fatal.every((r) => r.severity === 'fatal')).toBe(true);
  });

  it('subscribeErrors is a no-op unsubscribe in mock mode', () => {
    const unsub = adminService.subscribeErrors(() => {});
    expect(typeof unsub).toBe('function');
    expect(() => unsub()).not.toThrow();
  });
});

describe('adminService.userDetail (mock)', () => {
  it('returns a full 360 view for a known broker', async () => {
    const u = await adminService.userDetail('11111111-1111-1111-1111-111111111111');
    expect(u.profile?.role).toBe('broker');
    expect(Array.isArray(u.deals)).toBe(true);
    expect(u.deals.length).toBeGreaterThan(0);
    expect(Array.isArray(u.loginHistory)).toBe(true);
    expect(Array.isArray(u.audit)).toBe(true);
    expect(Array.isArray(u.recentErrors)).toBe(true);
  });

  it('falls back to a directory-derived profile for an unknown id', async () => {
    const u = await adminService.userDetail('a3000000-0000-0000-0000-000000000003');
    // present in the users directory fixture, but no user360 entry
    expect(u.profile?.id).toBe('a3000000-0000-0000-0000-000000000003');
    expect(u.deals).toEqual([]);
  });
});

describe('adminService.funnel + matchingHealth (mock)', () => {
  it('funnel returns ordered stages and leakage', async () => {
    const f = await adminService.funnel(30);
    expect(f.stages.map((s) => s.stage)).toEqual(['Submitted', 'Matched', 'Offered', 'Funded']);
    expect(f.leakage).toHaveProperty('declined');
    expect(f.leakage).toHaveProperty('expired');
  });

  it('matching health surfaces zero-match and low-match lists', async () => {
    const m = await adminService.matchingHealth(30);
    expect(typeof m.avgMatchScore).toBe('number');
    expect(Array.isArray(m.zeroMatch)).toBe(true);
    expect(Array.isArray(m.lowMatch)).toBe(true);
  });
});

describe('adminService alerts (mock)', () => {
  it('lists rules and events', async () => {
    const rules = await adminService.listAlertRules();
    expect(rules.length).toBeGreaterThan(0);
    expect(rules[0]).toHaveProperty('kind');
    expect(typeof rules[0].isEnabled).toBe('boolean');

    const events = await adminService.listAlertEvents();
    expect(events.length).toBeGreaterThan(0);
    expect(['open', 'acknowledged', 'resolved']).toContain(events[0].status);
  });

  it('filters events by status', async () => {
    const open = await adminService.listAlertEvents('open');
    expect(open.every((e) => e.status === 'open')).toBe(true);
  });

  it('mutations resolve without throwing and runAlertEval returns 0 in mock mode', async () => {
    await expect(adminService.setAlertRuleEnabled('r1', false)).resolves.toBeUndefined();
    await expect(adminService.updateAlertEvent(5102, 'acknowledged')).resolves.toBeUndefined();
    await expect(adminService.runAlertEval()).resolves.toBe(0);
  });
});

describe('telemetry SDK (mock mode = inert no-op)', () => {
  it('init + emit + flush never throw and perform no network', async () => {
    expect(() => initTelemetry({ app: 'admin' })).not.toThrow();
    expect(() => track('test.event', { foo: 'bar', count: 1 })).not.toThrow();
    expect(() => trackPageView('/health')).not.toThrow();
    expect(() => captureError(new Error('boom'), { source: 'unhandled' })).not.toThrow();
    await expect(flush()).resolves.toBeUndefined();
  });
});
