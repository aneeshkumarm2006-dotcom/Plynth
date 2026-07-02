// On-page SEO checks (no external APIs). Produces simple pass / warn signals so
// a non-technical writer knows whether a post is "SEO-ready" before publishing.

import type { KeywordEntry } from './api';

export interface SeoCheck {
  label: string;
  status: 'pass' | 'warn';
  detail: string;
}

export interface DraftForCheck {
  title: string;
  metaTitle: string;
  excerpt: string;
  bodyHtml: string;
  keywords: KeywordEntry[];
  coverImage: string;
}

function parse(html: string): Document {
  return new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html');
}

export function runSeoChecks(d: DraftForCheck): SeoCheck[] {
  const doc = parse(d.bodyHtml);
  const text = (doc.body.textContent || '').replace(/\s+/g, ' ').trim();
  const words = text ? text.split(' ').length : 0;
  const checks: SeoCheck[] = [];

  const metaTitle = (d.metaTitle || d.title).trim();
  const mt = metaTitle.length;
  checks.push({
    label: 'Meta title length',
    status: mt >= 50 && mt <= 60 ? 'pass' : 'warn',
    detail: `${mt} chars (aim 50–60)`,
  });

  const md = d.excerpt.trim().length;
  checks.push({
    label: 'Meta description length',
    status: md >= 150 && md <= 160 ? 'pass' : 'warn',
    detail: `${md} chars (aim 150–160)`,
  });

  checks.push({
    label: 'Content length',
    status: words >= 300 ? 'pass' : 'warn',
    detail: `${words} words${words < 300 ? ' (thin — aim 300+)' : ''}`,
  });

  const haystack = text.toLowerCase();
  const missing = d.keywords
    .map((k) => k.keyword.trim())
    .filter((k) => k && !haystack.includes(k.toLowerCase()));
  checks.push({
    label: 'Keywords in body',
    status: missing.length === 0 ? 'pass' : 'warn',
    detail:
      d.keywords.length === 0
        ? 'no keywords added yet'
        : missing.length === 0
          ? 'all keywords appear in the body'
          : `missing: ${missing.join(', ')}`,
  });

  const anchors = Array.from(doc.querySelectorAll('a'));
  let internal = 0;
  let external = 0;
  for (const a of anchors) {
    const href = a.getAttribute('href') || '';
    if (/^https?:\/\//i.test(href)) external += 1;
    else if (href) internal += 1;
  }
  checks.push({
    label: 'Links',
    status: 'pass',
    detail: `${internal} internal · ${external} external`,
  });

  const imgs = Array.from(doc.querySelectorAll('img'));
  const noAlt = imgs.filter((img) => !(img.getAttribute('alt') || '').trim()).length;
  checks.push({
    label: 'Image alt text',
    status: noAlt === 0 ? 'pass' : 'warn',
    detail: imgs.length === 0 ? 'no images' : noAlt === 0 ? 'all images have alt text' : `${noAlt} missing alt`,
  });

  checks.push({
    label: 'Cover image',
    status: d.coverImage.trim() ? 'pass' : 'warn',
    detail: d.coverImage.trim() ? 'set' : 'not set',
  });

  return checks;
}
