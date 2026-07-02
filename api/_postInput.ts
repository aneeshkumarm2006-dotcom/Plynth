// Validation + normalization for post writes (create/update).
// -----------------------------------------------------------------------------
// Runs server-side in the cookie-guarded CRUD endpoints. The dashboard UI
// enforces the same rules softly (char counts etc.), but this is the hard gate:
// it sanitizes the body, whitelists templates/rel/status, checks URL schemes,
// and derives a slug. Throws ValidationError (→ 400) on bad input.

import { sanitizeBody } from './_sanitize';
import type { KeywordEntry } from './_supabaseAdmin';

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

const TEMPLATES = new Set(['how-to', 'listicle', 'comparison', 'review', 'news', 'generic']);
const RELS = new Set(['dofollow', 'nofollow', 'sponsored']);
const STATUSES = new Set(['draft', 'published']);

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function isHttpUrl(v: string): boolean {
  return /^https?:\/\//i.test(v);
}

function asString(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}

function normalizeKeywords(raw: unknown): KeywordEntry[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) throw new ValidationError('keywords must be an array');
  const out: KeywordEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Record<string, unknown>;
    const keyword = asString(rec.keyword)?.trim();
    const url = asString(rec.url)?.trim();
    const rel = asString(rec.rel) ?? 'dofollow';
    if (!keyword) continue; // skip blank rows the UI may send
    if (!url || !isHttpUrl(url)) throw new ValidationError(`keyword "${keyword}" needs a valid http(s) URL`);
    if (!RELS.has(rel)) throw new ValidationError(`invalid rel "${rel}" for keyword "${keyword}"`);
    out.push({ keyword, url, rel: rel as KeywordEntry['rel'] });
  }
  return out;
}

export interface NormalizedPost {
  title?: string;
  slug?: string;
  template?: string;
  body?: string;
  excerpt?: string | null;
  meta_title?: string | null;
  cover_image?: string | null;
  keywords?: KeywordEntry[];
  link_first_only?: boolean;
  status?: string;
  author?: string | null;
}

// Build the DB field set from a request body. `partial` allows omitting
// required fields (PATCH); a create must supply a title.
export function normalizePostInput(body: Record<string, unknown>, partial: boolean): NormalizedPost {
  const out: NormalizedPost = {};

  if (!partial || 'title' in body) {
    const title = asString(body.title)?.trim();
    if (!title) throw new ValidationError('title is required');
    if (title.length > 300) throw new ValidationError('title is too long');
    out.title = title;
  }

  // Slug: explicit value validated; otherwise derived from title on create.
  if ('slug' in body && asString(body.slug)?.trim()) {
    const slug = asString(body.slug)!.trim();
    if (!/^[a-z0-9-]+$/.test(slug)) throw new ValidationError('slug may contain only lowercase letters, numbers and hyphens');
    out.slug = slug;
  } else if (!partial && out.title) {
    const slug = slugify(out.title);
    if (!slug) throw new ValidationError('could not derive a slug from the title');
    out.slug = slug;
  }

  if ('template' in body) {
    const t = asString(body.template) ?? 'generic';
    if (!TEMPLATES.has(t)) throw new ValidationError(`invalid template "${t}"`);
    out.template = t;
  } else if (!partial) {
    out.template = 'generic';
  }

  if ('body' in body) {
    out.body = sanitizeBody(asString(body.body) ?? '');
  } else if (!partial) {
    out.body = '';
  }

  if ('excerpt' in body) {
    const v = asString(body.excerpt)?.trim() ?? null;
    if (v && v.length > 320) throw new ValidationError('excerpt is too long');
    out.excerpt = v || null;
  }

  if ('meta_title' in body) {
    const v = asString(body.meta_title)?.trim() ?? null;
    if (v && v.length > 120) throw new ValidationError('meta title is too long');
    out.meta_title = v || null;
  }

  if ('cover_image' in body) {
    const v = asString(body.cover_image)?.trim() ?? null;
    if (v && !isHttpUrl(v)) throw new ValidationError('cover image must be an http(s) URL');
    out.cover_image = v || null;
  }

  if ('keywords' in body) {
    out.keywords = normalizeKeywords(body.keywords);
  } else if (!partial) {
    out.keywords = [];
  }

  if ('link_first_only' in body) {
    out.link_first_only = Boolean(body.link_first_only);
  }

  if ('author' in body) {
    const v = asString(body.author)?.trim() ?? null;
    if (v && v.length > 120) throw new ValidationError('author is too long');
    out.author = v || null;
  }

  if ('status' in body) {
    const s = asString(body.status) ?? 'draft';
    if (!STATUSES.has(s)) throw new ValidationError(`invalid status "${s}"`);
    out.status = s;
  } else if (!partial) {
    out.status = 'draft';
  }

  return out;
}
