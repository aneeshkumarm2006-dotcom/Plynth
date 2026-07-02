// GET /sitemap.xml  (rewritten here in vercel.json)
// -----------------------------------------------------------------------------
// Dynamic sitemap: static marketing URLs + every published post. Replaces the
// old static public/sitemap.xml (which is no longer copied by the build, so
// this rewrite is not shadowed by a physical file). Anon-key data layer only.

import type { VercelReq, VercelRes } from './_http';
import { listPublished } from './_blogData';
import { escapeHtml } from './_http';

function origin(): string {
  return (process.env.SITE_URL || 'https://plynth.com').replace(/\/$/, '');
}

function urlEntry(loc: string, lastmod?: string | null): string {
  const lm = lastmod ? `<lastmod>${escapeHtml(lastmod)}</lastmod>` : '';
  return `<url><loc>${escapeHtml(loc)}</loc>${lm}</url>`;
}

export default async function handler(_req: VercelReq, res: VercelRes): Promise<void> {
  const base = origin();
  const staticUrls = [urlEntry(`${base}/`), urlEntry(`${base}/blog`)];

  let postUrls: string[] = [];
  try {
    const posts = await listPublished();
    postUrls = posts.map((p) => urlEntry(`${base}/blog/${encodeURIComponent(p.slug)}`, p.published_at));
  } catch (e) {
    // Degrade to the static URLs rather than 500 — a sitemap is best-effort.
    console.error('sitemap posts query failed:', (e as Error).message);
  }

  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    [...staticUrls, ...postUrls].join('') +
    `</urlset>`;

  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.setHeader('Cache-Control', 'public, s-maxage=300, stale-while-revalidate=600');
  res.status(200).send(xml);
}
