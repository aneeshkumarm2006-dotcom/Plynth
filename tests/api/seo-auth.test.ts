import { describe, it, expect } from 'vitest';
import { createToken, verifyToken } from '../../api/_session';
import { slugify, normalizePostInput, ValidationError } from '../../api/_postInput';

const SECRET = 'test-secret-key';
const NOW = 1_800_000_000; // fixed unix seconds

describe('session token', () => {
  it('accepts a freshly minted, unexpired token', () => {
    const t = createToken(SECRET, NOW);
    expect(verifyToken(t, SECRET, NOW + 60)).toBe(true);
  });

  it('rejects a token signed with a different secret', () => {
    const t = createToken(SECRET, NOW);
    expect(verifyToken(t, 'other-secret', NOW + 60)).toBe(false);
  });

  it('rejects an expired token', () => {
    const t = createToken(SECRET, NOW);
    expect(verifyToken(t, SECRET, NOW + 8 * 24 * 3600)).toBe(false);
  });

  it('rejects tampered payloads and garbage', () => {
    const t = createToken(SECRET, NOW);
    const tampered = t.replace(/^[^.]+/, 'eyJleHAiOjk5OTk5OTk5OTl9'); // swap payload, keep sig
    expect(verifyToken(tampered, SECRET, NOW)).toBe(false);
    expect(verifyToken(undefined, SECRET, NOW)).toBe(false);
    expect(verifyToken('not-a-token', SECRET, NOW)).toBe(false);
  });
});

describe('slugify', () => {
  it('lowercases, strips accents and joins with hyphens', () => {
    expect(slugify('Café RÉSUMÉ Guide')).toBe('cafe-resume-guide');
  });
  it('collapses punctuation and trims hyphens', () => {
    expect(slugify('  Top 10: Private Lenders!! ')).toBe('top-10-private-lenders');
  });
});

describe('normalizePostInput', () => {
  it('derives a slug from the title on create', () => {
    const out = normalizePostInput({ title: 'Hello World' }, false);
    expect(out.slug).toBe('hello-world');
    expect(out.status).toBe('draft');
    expect(out.template).toBe('generic');
  });

  it('sanitizes the body on write', () => {
    const out = normalizePostInput({ title: 'X', body: '<p>ok</p><script>bad()</script>' }, false);
    expect(out.body).toBe('<p>ok</p>');
  });

  it('rejects an invalid explicit slug', () => {
    expect(() => normalizePostInput({ title: 'X', slug: 'Bad Slug' }, false)).toThrow(ValidationError);
  });

  it('rejects a non-http keyword URL and a bad rel', () => {
    expect(() =>
      normalizePostInput({ title: 'X', keywords: [{ keyword: 'a', url: 'javascript:x', rel: 'dofollow' }] }, false)
    ).toThrow(ValidationError);
    expect(() =>
      normalizePostInput({ title: 'X', keywords: [{ keyword: 'a', url: 'https://ok.test', rel: 'bogus' }] }, false)
    ).toThrow(ValidationError);
  });

  it('drops blank keyword rows but keeps valid ones', () => {
    const out = normalizePostInput(
      { title: 'X', keywords: [{ keyword: '', url: '' }, { keyword: 'a', url: 'https://ok.test', rel: 'nofollow' }] },
      false
    );
    expect(out.keywords).toEqual([{ keyword: 'a', url: 'https://ok.test', rel: 'nofollow' }]);
  });

  it('requires a title on create but not on patch', () => {
    expect(() => normalizePostInput({}, false)).toThrow(ValidationError);
    expect(normalizePostInput({ excerpt: 'just this' }, true)).toEqual({ excerpt: 'just this' });
  });
});
