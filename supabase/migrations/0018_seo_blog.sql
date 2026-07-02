-- ============================================================
-- Plynth — SEO blog: posts table, default-deny RLS, published-only
-- SECURITY DEFINER read RPCs, and a public storage bucket for media.
-- ============================================================
-- Follows 0017. The public blog (/blog, /sitemap.xml) is served by
-- INTERNET-FACING serverless functions using only the ANON key. So the
-- posts table is default-deny for anon/authenticated, and the only way
-- those roles can read is through the three RPCs below, each of which
-- HARD-FILTERS status='published'. A bug in a public function therefore
-- cannot leak a draft.
--
-- The /seoteam dashboard is NOT a Supabase user; its writes go through
-- cookie-guarded serverless functions that use the SERVICE ROLE key
-- (which bypasses RLS). The service role is confined to those functions
-- and is never imported into the public blog functions.
--
-- Mirrors the 0017 pattern: SECURITY DEFINER + column whitelist +
-- pinned search_path, REVOKE ALL then GRANT to the minimal role.
-- ============================================================


-- ============================================================
-- 1. posts table.
-- ============================================================
CREATE TABLE IF NOT EXISTS posts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text NOT NULL,
  slug            text NOT NULL UNIQUE,
  template        text NOT NULL DEFAULT 'generic'
                    CHECK (template IN ('how-to','listicle','comparison','review','news','generic')),
  body            text NOT NULL DEFAULT '',            -- sanitized HTML (authoritative post-sanitize copy)
  excerpt         text,                                 -- also used as the meta description
  meta_title      text,                                 -- render falls back to title when null
  cover_image     text,                                 -- Supabase Storage URL
  keywords        jsonb NOT NULL DEFAULT '[]'::jsonb,   -- [{keyword,url,rel:'dofollow'|'nofollow'|'sponsored'}]
  link_first_only boolean NOT NULL DEFAULT true,
  status          text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  author          text,
  views           integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  published_at    timestamptz
);

-- Index the public listing's access pattern (published, newest first).
CREATE INDEX IF NOT EXISTS idx_posts_status_pub ON posts(status, published_at DESC);

-- Reuse the existing updated_at trigger (defined in 0003).
DROP TRIGGER IF EXISTS posts_set_updated_at ON posts;
CREATE TRIGGER posts_set_updated_at BEFORE UPDATE ON posts
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();


-- ============================================================
-- 2. Default-deny RLS.
-- ============================================================
-- No policies for anon/authenticated → both are denied all direct
-- access. Reads happen only through the RPCs in section 3; writes only
-- through the service role (which bypasses RLS) in the /seoteam funcs.
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- 3. Published-only read RPCs (SECURITY DEFINER, granted to anon).
-- ============================================================
-- Column-whitelisted, status-filtered, search_path pinned — same shape
-- as lender_directory() / export_my_data() in 0017.

-- 3a. Listing for /blog and the sitemap.
CREATE OR REPLACE FUNCTION blog_list_published()
RETURNS TABLE(
  slug         text,
  title        text,
  excerpt      text,
  cover_image  text,
  published_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, title, excerpt, cover_image, published_at
  FROM posts
  WHERE status = 'published'
  ORDER BY published_at DESC NULLS LAST;
$$;

-- 3b. Single post for /blog/:slug. Whitelists the columns the public
--     page renders (never exposes anything draft-only). Returns 0 rows
--     for a draft or missing slug.
CREATE OR REPLACE FUNCTION blog_get_published(p_slug text)
RETURNS TABLE(
  slug            text,
  title           text,
  body            text,
  excerpt         text,
  meta_title      text,
  cover_image     text,
  keywords        jsonb,
  link_first_only boolean,
  author          text,
  published_at    timestamptz,
  updated_at      timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT slug, title, body, excerpt, meta_title, cover_image, keywords,
         link_first_only, author, published_at, updated_at
  FROM posts
  WHERE slug = p_slug AND status = 'published';
$$;

-- 3c. View counter — only ticks published posts, cannot reveal data.
CREATE OR REPLACE FUNCTION blog_increment_views(p_slug text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE posts SET views = views + 1
  WHERE slug = p_slug AND status = 'published';
$$;

REVOKE ALL ON FUNCTION blog_list_published()            FROM PUBLIC;
REVOKE ALL ON FUNCTION blog_get_published(text)         FROM PUBLIC;
REVOKE ALL ON FUNCTION blog_increment_views(text)       FROM PUBLIC;
GRANT EXECUTE ON FUNCTION blog_list_published()          TO anon, authenticated;
GRANT EXECUTE ON FUNCTION blog_get_published(text)       TO anon, authenticated;
GRANT EXECUTE ON FUNCTION blog_increment_views(text)     TO anon, authenticated;


-- ============================================================
-- 4. Public media bucket.
-- ============================================================
-- Blog images must be world-readable, so the bucket is public. There
-- are NO anon insert/update/delete policies on storage.objects, so the
-- only write path is the service role in api/seo/upload.ts (MIME + size
-- validated there).
INSERT INTO storage.buckets (id, name, public)
VALUES ('blog-media', 'blog-media', true)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 5. Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
