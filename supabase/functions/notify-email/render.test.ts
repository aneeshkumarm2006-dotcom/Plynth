// Run with: deno test supabase/functions/notify-email/render.test.ts
import { assert, assertEquals, assertStringIncludes } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { buildLink, renderHtml, renderSubject, renderText } from './render.ts';

const notif = {
  id: 'n-1',
  user_id: 'u-1',
  notification_type: 'offer_received',
  entity_type: 'offer',
  entity_id: 'o-1',
  title: 'New offer on Deal № 1042',
  message: 'Rate 9.5% · expires Jun 30',
  created_at: '2026-06-21T12:00:00Z',
};

const broker = { email: 'bob@brokers.ca', name: 'Bob Broker', role: 'broker' as const };
const lender = { email: 'lara@fund.ca', name: 'Lara Lender', role: 'lender' as const };

Deno.test('subject is branded and carries the title', () => {
  assertEquals(renderSubject(notif), 'Plynth · New offer on Deal № 1042');
});

Deno.test('link routes to the correct portal by role', () => {
  const opts = { brokerAppUrl: 'https://app.plynth.com/', lenderAppUrl: 'https://lender.plynth.com' };
  assertEquals(buildLink(notif, broker, opts), 'https://app.plynth.com/notifications');
  assertEquals(buildLink(notif, lender, opts), 'https://lender.plynth.com/notifications');
});

Deno.test('link is null when no base url configured', () => {
  assertEquals(buildLink(notif, broker, {}), null);
});

Deno.test('html includes greeting, title, message and CTA when linkable', () => {
  const html = renderHtml(notif, broker, { brokerAppUrl: 'https://app.plynth.com' });
  assertStringIncludes(html, 'Hi Bob Broker,');
  assertStringIncludes(html, 'New offer on Deal № 1042');
  assertStringIncludes(html, 'Rate 9.5% · expires Jun 30');
  assertStringIncludes(html, 'https://app.plynth.com/notifications');
  assertStringIncludes(html, 'View in Plynth');
});

Deno.test('html omits CTA button when no link', () => {
  const html = renderHtml(notif, broker, {});
  assert(!html.includes('View in Plynth'));
});

Deno.test('html escapes user-influenced content', () => {
  const evil = { ...notif, title: '<script>alert(1)</script>', message: 'a & b < c' };
  const html = renderHtml(evil, broker, {});
  assert(!html.includes('<script>alert(1)</script>'));
  assertStringIncludes(html, '&lt;script&gt;');
  assertStringIncludes(html, 'a &amp; b &lt; c');
});

Deno.test('text version is plain and includes the link', () => {
  const text = renderText(notif, lender, { lenderAppUrl: 'https://lender.plynth.com' });
  assertStringIncludes(text, 'Hi Lara Lender,');
  assertStringIncludes(text, 'New offer on Deal № 1042');
  assertStringIncludes(text, 'View in Plynth: https://lender.plynth.com/notifications');
  assert(!text.includes('<'));
});
