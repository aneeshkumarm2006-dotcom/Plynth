-- ============================================================
-- Plynth — explicit table GRANTs for PostgREST roles
-- ============================================================
-- When tables are created via a direct DB connection (our
-- migrate script) instead of the Supabase dashboard, the
-- `authenticated` and `anon` roles don't always get the base
-- privileges PostgREST needs before RLS even runs. This grants
-- them. RLS still enforces row-level access — these GRANTs are
-- table-level access prerequisites.
-- ============================================================

-- Schema-level usage so PostgREST can resolve names.
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Tables: authenticated does the real work; anon only signs up
-- (insert profile during signup, which RLS still filters).
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public
  TO authenticated;

GRANT SELECT, INSERT ON user_profiles TO anon;

-- Sequences (for BIGSERIAL audit_log id).
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public
  TO authenticated;

-- Future tables created by migrations inherit the same GRANTs.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- Reload PostgREST's schema cache so policies and grants take
-- effect immediately rather than on the next idle window.
NOTIFY pgrst, 'reload schema';
