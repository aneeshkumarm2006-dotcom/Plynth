// /api/seo/posts  — cookie-guarded (service role).
//   GET  ?status=&limit=&offset=   list posts (incl. drafts)
//   POST                            create a post (body sanitized, slug unique)

import type { VercelReq, VercelRes } from '../../_http';
import { jsonBody, queryParam } from '../../_http';
import { requireSession } from '../../_seoAuth';
import { normalizePostInput, ValidationError } from '../../_postInput';
import { listPosts, insertPost, SlugConflictError } from '../../_supabaseAdmin';

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (!requireSession(req, res)) return;

  if (req.method === 'GET') {
    const status = queryParam(req, 'status');
    const limit = Number(queryParam(req, 'limit')) || undefined;
    const offset = Number(queryParam(req, 'offset')) || undefined;
    try {
      const posts = await listPosts({
        status: status === 'draft' || status === 'published' ? status : undefined,
        limit,
        offset,
      });
      res.status(200).json({ posts });
    } catch (e) {
      console.error('list posts failed:', (e as Error).message);
      res.status(502).json({ error: 'could not load posts' });
    }
    return;
  }

  if (req.method === 'POST') {
    const body = jsonBody(req);
    if (!body) {
      res.status(400).json({ error: 'invalid JSON body' });
      return;
    }
    let fields;
    try {
      fields = normalizePostInput(body, false);
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }
    // Stamp publish time if creating as published.
    const insert: Record<string, unknown> = { ...fields };
    if (fields.status === 'published') insert.published_at = new Date().toISOString();

    try {
      const post = await insertPost(insert);
      res.status(201).json({ post });
    } catch (e) {
      if (e instanceof SlugConflictError) {
        res.status(409).json({ error: 'a post with that slug already exists' });
        return;
      }
      console.error('create post failed:', (e as Error).message);
      res.status(502).json({ error: 'could not create post' });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
