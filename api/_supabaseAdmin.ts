// Service-role Supabase access for the cookie-guarded /api/seo/* endpoints.
// -----------------------------------------------------------------------------
// SECURITY: the service role BYPASSES RLS. This module must ONLY ever be
// imported by endpoints that sit behind requireSession() — never by the public
// api/blog/* or api/sitemap.ts functions (those use api/_blogData.ts + the anon
// key). Talks to PostgREST / Storage over raw fetch, matching notify-email.ts.

import { randomUUID } from 'node:crypto';

export interface KeywordEntry {
  keyword: string;
  url: string;
  rel: 'dofollow' | 'nofollow' | 'sponsored';
}

export interface PostRow {
  id: string;
  title: string;
  slug: string;
  template: string;
  body: string;
  excerpt: string | null;
  meta_title: string | null;
  cover_image: string | null;
  keywords: KeywordEntry[];
  link_first_only: boolean;
  status: 'draft' | 'published';
  author: string | null;
  views: number;
  created_at: string;
  updated_at: string;
  published_at: string | null;
}

function env(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not configured');
  }
  return { url: url.replace(/\/$/, ''), key };
}

function headers(key: string, extra: Record<string, string> = {}): Record<string, string> {
  return { apikey: key, Authorization: `Bearer ${key}`, ...extra };
}

// Raised for a unique-slug collision so the endpoint can map it to 409.
export class SlugConflictError extends Error {
  constructor() {
    super('slug already exists');
    this.name = 'SlugConflictError';
  }
}

const POST_COLUMNS =
  'id,title,slug,template,body,excerpt,meta_title,cover_image,keywords,link_first_only,status,author,views,created_at,updated_at,published_at';

export async function listPosts(
  opts: { status?: string; limit?: number; offset?: number } = {}
): Promise<PostRow[]> {
  const { url, key } = env();
  const params = new URLSearchParams({ select: POST_COLUMNS, order: 'updated_at.desc' });
  if (opts.status) params.set('status', `eq.${opts.status}`);
  if (opts.limit != null) params.set('limit', String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));
  const res = await fetch(`${url}/rest/v1/posts?${params}`, { headers: headers(key) });
  if (!res.ok) throw new Error(`listPosts failed (${res.status})`);
  return (await res.json()) as PostRow[];
}

export async function getPostById(id: string): Promise<PostRow | null> {
  const { url, key } = env();
  const res = await fetch(
    `${url}/rest/v1/posts?id=eq.${encodeURIComponent(id)}&select=${POST_COLUMNS}`,
    { headers: headers(key) }
  );
  if (!res.ok) throw new Error(`getPostById failed (${res.status})`);
  const rows = (await res.json()) as PostRow[];
  return rows[0] ?? null;
}

export async function insertPost(fields: Record<string, unknown>): Promise<PostRow> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/posts`, {
    method: 'POST',
    headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(fields),
  });
  if (res.status === 409) throw new SlugConflictError();
  if (!res.ok) throw new Error(`insertPost failed (${res.status}): ${await res.text()}`);
  const rows = (await res.json()) as PostRow[];
  return rows[0];
}

export async function updatePost(id: string, fields: Record<string, unknown>): Promise<PostRow | null> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/posts?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: headers(key, { 'Content-Type': 'application/json', Prefer: 'return=representation' }),
    body: JSON.stringify(fields),
  });
  if (res.status === 409) throw new SlugConflictError();
  if (!res.ok) throw new Error(`updatePost failed (${res.status}): ${await res.text()}`);
  const rows = (await res.json()) as PostRow[];
  return rows[0] ?? null;
}

export async function deletePost(id: string): Promise<void> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/posts?id=eq.${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(key),
  });
  if (!res.ok) throw new Error(`deletePost failed (${res.status})`);
}

const EXT_BY_MIME: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export function extForMime(mime: string): string | null {
  return EXT_BY_MIME[mime] ?? null;
}

// Upload image bytes to the public blog-media bucket, return the public URL.
export async function uploadMedia(bytes: Buffer, contentType: string): Promise<string> {
  const { url, key } = env();
  const bucket = process.env.BLOG_STORAGE_BUCKET || 'blog-media';
  const ext = extForMime(contentType);
  if (!ext) throw new Error(`unsupported media type: ${contentType}`);
  const objectPath = `${randomUUID()}.${ext}`;
  const res = await fetch(`${url}/storage/v1/object/${bucket}/${objectPath}`, {
    method: 'POST',
    headers: headers(key, { 'Content-Type': contentType, 'x-upsert': 'false' }),
    body: new Uint8Array(bytes),
  });
  if (!res.ok) throw new Error(`uploadMedia failed (${res.status}): ${await res.text()}`);
  return `${url}/storage/v1/object/public/${bucket}/${objectPath}`;
}
