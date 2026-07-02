import { describe, it, expect } from 'vitest';
import { applyKeywordLinks } from '../../api/_keywordLinks';
import type { KeywordEntry } from '../../api/_supabaseAdmin';

const kw = (keyword: string, url: string, rel: KeywordEntry['rel'] = 'dofollow'): KeywordEntry => ({
  keyword,
  url,
  rel,
});

describe('applyKeywordLinks', () => {
  it('links the first occurrence only by default', () => {
    const html = '<p>A mortgage is a mortgage, and mortgage rates vary.</p>';
    const out = applyKeywordLinks(html, [kw('mortgage', 'https://x.test/m')], true);
    expect(out.match(/<a /g)?.length).toBe(1);
    expect(out).toContain('href="https://x.test/m"');
    // second/third "mortgage" stay plain text
    expect(out).toContain('is a mortgage,');
  });

  it('links all occurrences when link_first_only is false', () => {
    const html = '<p>rate and rate and rate</p>';
    const out = applyKeywordLinks(html, [kw('rate', 'https://x.test/r')], false);
    expect(out.match(/<a /g)?.length).toBe(3);
  });

  it('is case-insensitive but preserves the matched casing', () => {
    const html = '<p>Broker and broker</p>';
    const out = applyKeywordLinks(html, [kw('broker', 'https://x.test/b')], true);
    expect(out).toContain('>Broker</a>');
  });

  it('is word-boundary aware (does not match inside a longer word)', () => {
    const html = '<p>remortgaged homes</p>';
    const out = applyKeywordLinks(html, [kw('mortgage', 'https://x.test/m')], false);
    expect(out).not.toContain('<a ');
  });

  it('does not create nested links inside existing anchors', () => {
    const html = '<p>See <a href="https://old.test">mortgage advice</a> now, mortgage.</p>';
    const out = applyKeywordLinks(html, [kw('mortgage', 'https://x.test/m')], false);
    // existing anchor untouched
    expect(out).toContain('<a href="https://old.test">mortgage advice</a>');
    // only the outside occurrence gets linked
    expect(out.match(/x\.test\/m/g)?.length).toBe(1);
  });

  it('skips headings, code and pre blocks', () => {
    const html = '<h2>mortgage</h2><pre>mortgage</pre><code>mortgage</code><p>mortgage</p>';
    const out = applyKeywordLinks(html, [kw('mortgage', 'https://x.test/m')], false);
    expect(out.match(/<a /g)?.length).toBe(1);
    expect(out).toContain('<h2>mortgage</h2>');
    expect(out).toContain('<pre>mortgage</pre>');
  });

  it('sets rel per keyword setting and always opens in a new tab', () => {
    const html = '<p>alpha beta</p>';
    const out = applyKeywordLinks(
      html,
      [kw('alpha', 'https://a.test', 'nofollow'), kw('beta', 'https://b.test', 'sponsored')],
      true
    );
    expect(out).toMatch(/<a href="https:\/\/a\.test" target="_blank" rel="noopener nofollow">alpha<\/a>/);
    expect(out).toMatch(/<a href="https:\/\/b\.test" target="_blank" rel="noopener sponsored">beta<\/a>/);
  });

  it('leaves the body untouched when there are no keywords', () => {
    const html = '<p>nothing to do</p>';
    expect(applyKeywordLinks(html, [], true)).toBe(html);
  });

  it('ignores keyword entries with empty keyword or url', () => {
    const html = '<p>keep me</p>';
    const out = applyKeywordLinks(html, [kw('', 'https://x.test'), kw('keep', '')], true);
    expect(out).not.toContain('<a ');
  });
});
