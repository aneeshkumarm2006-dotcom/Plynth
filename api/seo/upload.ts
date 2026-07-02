// POST /api/seo/upload — cookie-guarded image upload (service role → Storage).
// -----------------------------------------------------------------------------
// Accepts JSON { contentType, dataBase64 } from the editor (base64 keeps this
// dependency-free — no multipart parser). Validates the MIME allowlist and a
// size cap, then stores the bytes in the public blog-media bucket and returns
// the public URL. Only images can ever land in the bucket (extForMime gate).

import type { VercelReq, VercelRes } from '../_http';
import { jsonBody } from '../_http';
import { requireSession } from '../_seoAuth';
import { uploadMedia, extForMime } from '../_supabaseAdmin';

// Kept under Vercel's ~4.5 MB request-body limit once base64-inflated (~33%).
const MAX_BYTES = 3 * 1024 * 1024;

export default async function handler(req: VercelReq, res: VercelRes): Promise<void> {
  if (!requireSession(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  const body = jsonBody(req);
  const contentType = typeof body?.contentType === 'string' ? body.contentType : '';
  const dataBase64 = typeof body?.dataBase64 === 'string' ? body.dataBase64 : '';

  if (!extForMime(contentType)) {
    res.status(400).json({ error: 'unsupported image type (png, jpeg, webp, gif only)' });
    return;
  }
  if (!dataBase64) {
    res.status(400).json({ error: 'missing image data' });
    return;
  }

  let bytes: Buffer;
  try {
    bytes = Buffer.from(dataBase64, 'base64');
  } catch {
    res.status(400).json({ error: 'invalid base64 image data' });
    return;
  }
  if (bytes.length === 0) {
    res.status(400).json({ error: 'empty image' });
    return;
  }
  if (bytes.length > MAX_BYTES) {
    res.status(400).json({ error: 'image too large (max 3 MB)' });
    return;
  }

  try {
    const url = await uploadMedia(bytes, contentType);
    res.status(201).json({ url });
  } catch (e) {
    console.error('media upload failed:', (e as Error).message);
    res.status(502).json({ error: 'upload failed' });
  }
}
