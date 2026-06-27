import { describe, it, expect } from 'vitest';
import { buildLink, renderHtml, renderSubject, renderText } from '../../api/_render';

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

describe('notify-email render', () => {
  it('subject is branded and carries the title', () => {
    expect(renderSubject(notif)).toBe('Plynth · New offer on Deal № 1042');
  });

  it('link routes to the correct portal by role', () => {
    const opts = { brokerAppUrl: 'https://app.plynth.com/', lenderAppUrl: 'https://lender.plynth.com' };
    expect(buildLink(notif, broker, opts)).toBe('https://app.plynth.com/notifications');
    expect(buildLink(notif, lender, opts)).toBe('https://lender.plynth.com/notifications');
  });

  it('link is null when no base url configured', () => {
    expect(buildLink(notif, broker, {})).toBeNull();
  });

  it('html includes greeting, title, message and CTA when linkable', () => {
    const html = renderHtml(notif, broker, { brokerAppUrl: 'https://app.plynth.com' });
    expect(html).toContain('Hi Bob Broker,');
    expect(html).toContain('New offer on Deal № 1042');
    expect(html).toContain('Rate 9.5% · expires Jun 30');
    expect(html).toContain('https://app.plynth.com/notifications');
    expect(html).toContain('View in Plynth');
  });

  it('html omits CTA button when no link', () => {
    const html = renderHtml(notif, broker, {});
    expect(html).not.toContain('View in Plynth');
  });

  it('html escapes user-influenced content', () => {
    const evil = { ...notif, title: '<script>alert(1)</script>', message: 'a & b < c' };
    const html = renderHtml(evil, broker, {});
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;');
    expect(html).toContain('a &amp; b &lt; c');
  });

  it('text version is plain and includes the link', () => {
    const text = renderText(notif, lender, { lenderAppUrl: 'https://lender.plynth.com' });
    expect(text).toContain('Hi Lara Lender,');
    expect(text).toContain('New offer on Deal № 1042');
    expect(text).toContain('View in Plynth: https://lender.plynth.com/notifications');
    expect(text).not.toContain('<');
  });
});
