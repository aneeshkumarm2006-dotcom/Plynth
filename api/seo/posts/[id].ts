// /api/seo/posts/:id — cookie-guarded (service role).
//   GET     fetch one post (incl. draft)
//   PATCH   update; publishing stamps published_at once
//   DELETE  remove

import type { VercelReq, VercelRes } from '../../_http';
import { jsonBody, queryParam } from '../../_http';
import { requireSession } from '../../_seoAuth';
import { normalizePostInput, ValidationError } from '../../_postInput';
import { getPostById, updatePost, deletePost, SlugConflictError } from '../../_supabaseAdmin';

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (!requireSession(req, res)) return;

  const id = queryParam(req, 'id');
  if (!id) {
    res.status(400).json({ error: 'missing post id' });
    return;
  }

  if (req.method === 'GET') {
    try {
      const post = await getPostById(id);
      if (!post) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      res.status(200).json({ post });
    } catch (e) {
      console.error('get post failed:', (e as Error).message);
      res.status(502).json({ error: 'could not load post' });
    }
    return;
  }

  if (req.method === 'PATCH') {
    const body = jsonBody(req);
    if (!body) {
      res.status(400).json({ error: 'invalid JSON body' });
      return;
    }
    let fields;
    try {
      fields = normalizePostInput(body, true);
    } catch (e) {
      if (e instanceof ValidationError) {
        res.status(400).json({ error: e.message });
        return;
      }
      throw e;
    }

    try {
      // Stamp published_at the first time a post goes live.
      const update: Record<string, unknown> = { ...fields };
      if (fields.status === 'published') {
        const current = await getPostById(id);
        if (!current) {
          res.status(404).json({ error: 'not found' });
          return;
        }
        if (!current.published_at) update.published_at = new Date().toISOString();
      }

      const post = await updatePost(id, update);
      if (!post) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      res.status(200).json({ post });
    } catch (e) {
      if (e instanceof SlugConflictError) {
        res.status(409).json({ error: 'a post with that slug already exists' });
        return;
      }
      console.error('update post failed:', (e as Error).message);
      res.status(502).json({ error: 'could not update post' });
    }
    return;
  }

  if (req.method === 'DELETE') {
    try {
      await deletePost(id);
      res.status(204).end();
    } catch (e) {
      console.error('delete post failed:', (e as Error).message);
      res.status(502).json({ error: 'could not delete post' });
    }
    return;
  }

  res.status(405).json({ error: 'method not allowed' });
}
