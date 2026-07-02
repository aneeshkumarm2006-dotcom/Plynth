// GET /blog  (rewritten here in vercel.json)
// -----------------------------------------------------------------------------
// Public, server-rendered blog index. Uses ONLY the anon-key data layer
// (_blogData) — never the service role — so it can never surface a draft.

import type { VercelReq, VercelRes } from '../_http';
import { listPublished } from '../_blogData';
import { renderIndex, blogSecurityHeaders, makeNonce } from '../_seoRender';

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
  try {
    const items = await listPublished();
    applyHeaders(res, nonce);
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
    res.status(200).send(renderIndex(items, nonce));
  } catch (e) {
    console.error('blog index render failed:', (e as Error).message);
    applyHeaders(res, nonce);
    res.status(500).send(renderIndex([], nonce));
  }
}
