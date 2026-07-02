// Public blog data access — ANON key only.
// -----------------------------------------------------------------------------
// SECURITY: this is the only Supabase module the internet-facing api/blog/* and
// api/sitemap.ts functions may import. It uses the ANON key and calls the
// published-only SECURITY DEFINER RPCs from migration 0018, which hard-filter
// status='published'. It NEVER imports the service role, so a bug here cannot
// read or leak a draft.

import type { KeywordEntry } from './_supabaseAdmin';

export interface PublishedListItem {
  slug: string;
  title: string;
  excerpt: string | null;
  cover_image: string | null;
  published_at: string | null;
}

export interface PublishedPost {
  slug: string;
  title: string;
  body: string;
  excerpt: string | null;
  meta_title: string | null;
  cover_image: string | null;
  keywords: KeywordEntry[];
  link_first_only: boolean;
  author: string | null;
  published_at: string | null;
  updated_at: string | null;
}

function env(): { url: string; key: string } {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL / SUPABASE_ANON_KEY not configured');
  return { url: url.replace(/\/$/, ''), key };
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { url, key } = env();
  const res = await fetch(`${url}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) throw new Error(`rpc ${fn} failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as T;
}

export async function listPublished(): Promise<PublishedListItem[]> {
  return rpc<PublishedListItem[]>('blog_list_published', {});
}

export async function getPublished(slug: string): Promise<PublishedPost | null> {
  const rows = await rpc<PublishedPost[]>('blog_get_published', { p_slug: slug });
  return rows[0] ?? null;
}

// Fire-and-forget view bump; caller should swallow errors (non-critical).
export async function incrementViews(slug: string): Promise<void> {
  await rpc<void>('blog_increment_views', { p_slug: slug });
}
