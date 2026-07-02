// GET /blog/:slug  (rewritten here in vercel.json)
// -----------------------------------------------------------------------------
// Public, server-rendered post page. Anon-key data layer only. The stored body
// is already sanitized at write time; we sanitize again here as defense in depth
// and then apply the keyword→backlink transform before rendering.

import type { VercelReq, VercelRes } from '../_http';
import { queryParam } from '../_http';
import { getPublished, incrementViews } from '../_blogData';
import { sanitizeBody } from '../_sanitize';
import { applyKeywordLinks } from '../_keywordLinks';
import { renderPost, renderNotFound, blogSecurityHeaders, makeNonce } from '../_seoRender';

function applyHeaders(res: VercelRes, nonce: string): void {
  for (const [k, v] of Object.entries(blogSecurityHeaders(nonce))) res.setHeader(k, v);
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
}

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (req.method !== 'GET') {
    res.status(405).send('method not allowed');
    return;
  }
  const nonce = makeNonce();
  const slug = queryParam(req, 'slug');
  if (!slug) {
    applyHeaders(res, nonce);
    res.status(404).send(renderNotFound(nonce));
    return;
  }

  try {
    const post = await getPublished(slug);
    if (!post) {
      applyHeaders(res, nonce);
      res.status(404).send(renderNotFound(nonce));
      return;
    }

    const safeBody = sanitizeBody(post.body);
    const linked = applyKeywordLinks(safeBody, post.keywords || [], post.link_first_only);
    const html = renderPost(post, linked, nonce);

    // Non-critical: don't let a failed counter block the response.
    incrementViews(slug).catch((e) => console.warn('view increment failed:', (e as Error).message));

    applyHeaders(res, nonce);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).send(html);
  } catch (e) {
    console.error('blog post render failed:', (e as Error).message);
    applyHeaders(res, nonce);
    res.status(500).send(renderNotFound(nonce));
  }
}
