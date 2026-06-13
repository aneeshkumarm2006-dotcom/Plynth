-- ============================================================
-- Plynth — product telemetry + error capture pipeline
-- ============================================================
-- PURPOSE: super-admin observability. Two append-only tables fed
-- by a thin client SDK (@plynth/supabase/telemetry) running in the
-- broker / lender / admin apps:
--
--   * telemetry_events — product analytics: page views, key
--     actions, timing samples, feature usage.
--   * error_events     — captured exceptions and failed RPC /
--     Supabase calls, with severity + fingerprint grouping.
--
-- SECURITY MODEL (read before editing):
--
--  * These are NOT the legal record. audit_log (immutable, 7-year
--    PIPEDA retention) remains the system of record for deal/offer/
--    login mutations. Telemetry is product-analytics grade and is
--    purged on a short retention (90d events / 180d errors — see
--    0012). Never move audit-grade events here.
--
--  * Asymmetric RLS: any authenticated user may INSERT only their
--    OWN rows (user_id = auth.uid() or NULL); only an admin may
--    SELECT. There is no UPDATE/DELETE policy, so rows are immutable
--    to every session role — only the retention purge job (runs as
--    the table owner / superuser) deletes them.
--
--  * The write path is the SECURITY DEFINER ingest_telemetry() RPC,
--    NOT direct table inserts. It is the single choke point that:
--      - forces user_id := auth.uid() (ignores any client-sent id,
--        so a user cannot attribute events to someone else),
--      - truncates message/stack and strips PII-prone free text,
--      - computes the error fingerprint,
--      - bulk-inserts whole batches in one round trip.
--    The INSERT policies below are defense-in-depth for that RPC.
--
--  * PII guardrail (STRICT): routes are stored without query string,
--    free-text message/stack are length-capped server-side, and the
--    SDK pre-sanitizes props/context to scalar, non-PII values. Do
--    NOT put borrower names, emails, addresses, or full request
--    bodies into props/context. This is enforced by code review +
--    the SDK allowlist; the server cap is the backstop.
--
--  * PREREQUISITE: current_user_role() (SECURITY DEFINER STABLE
--    helper from 0005) and the 'admin' user_role value (0007) must
--    both exist before this runs.
-- ============================================================


-- ============================================================
-- 1. Enums.
-- ============================================================
DO $$ BEGIN
  CREATE TYPE telemetry_app AS ENUM ('broker', 'lender', 'admin');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE event_severity AS ENUM ('info', 'warning', 'error', 'fatal');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 2. telemetry_events — high-write product analytics.
-- ============================================================
CREATE TABLE IF NOT EXISTS telemetry_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_id  UUID NOT NULL,
  app         telemetry_app NOT NULL,
  event_type  TEXT NOT NULL,
  route       TEXT,
  duration_ms INT,
  props       JSONB,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_created          ON telemetry_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_app_type_created ON telemetry_events(app, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_user_created     ON telemetry_events(user_id, created_at DESC);


-- ============================================================
-- 3. error_events — captured exceptions / failed calls.
-- ============================================================
CREATE TABLE IF NOT EXISTS error_events (
  id          BIGSERIAL PRIMARY KEY,
  user_id     UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  session_id  UUID NOT NULL,
  app         telemetry_app NOT NULL,
  severity    event_severity NOT NULL DEFAULT 'error',
  source      TEXT NOT NULL,              -- unhandled | rpc | supabase | react_boundary
  name        TEXT,                       -- error class, e.g. PostgrestError
  message     TEXT NOT NULL,              -- truncated to 2000 chars in the RPC
  stack       TEXT,                       -- truncated to 8000 chars in the RPC
  route       TEXT,
  context     JSONB,
  fingerprint TEXT,                       -- md5(app||name||first stack frame)
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_error_created           ON error_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_app_sev_created   ON error_events(app, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_fingerprint       ON error_events(fingerprint, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_user_created      ON error_events(user_id, created_at DESC);


-- ============================================================
-- 4. RLS — insert-own / admin-read, no update/delete.
-- ============================================================
ALTER TABLE telemetry_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE error_events     ENABLE ROW LEVEL SECURITY;

-- telemetry_events
DROP POLICY IF EXISTS "te_insert_own" ON telemetry_events;
CREATE POLICY "te_insert_own" ON telemetry_events
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "te_admin_read" ON telemetry_events;
CREATE POLICY "te_admin_read" ON telemetry_events
  FOR SELECT USING (current_user_role() = 'admin');

-- error_events
DROP POLICY IF EXISTS "ee_insert_own" ON error_events;
CREATE POLICY "ee_insert_own" ON error_events
  FOR INSERT WITH CHECK (user_id IS NULL OR user_id = auth.uid());

DROP POLICY IF EXISTS "ee_admin_read" ON error_events;
CREATE POLICY "ee_admin_read" ON error_events
  FOR SELECT USING (current_user_role() = 'admin');


-- ============================================================
-- 5. ingest_telemetry(p_events, p_errors) — the write choke point.
-- ============================================================
-- Both args are jsonb ARRAYS (each element one event/error object).
-- Either may be NULL or '[]'. SECURITY DEFINER so it can write
-- regardless of the caller's per-row RLS, but it pins user_id to
-- auth.uid() and caps free text, so a caller gains nothing beyond
-- inserting their own bounded rows. Granted to `authenticated`
-- (the user write path) — NOT admin-gated, every signed-in user
-- emits their own telemetry.
--
-- Element shapes (keys the SDK sends; unknown keys ignored):
--   event: { session_id, app, event_type, route?, duration_ms?, props? }
--   error: { session_id, app, severity?, source, name?, message,
--            stack?, route?, context? }
CREATE OR REPLACE FUNCTION ingest_telemetry(p_events jsonb DEFAULT '[]'::jsonb,
                                            p_errors jsonb DEFAULT '[]'::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  -- Anonymous (pre-auth) callers cannot reach here (EXECUTE granted
  -- to authenticated only); uid is therefore always the caller.

  IF p_events IS NOT NULL AND jsonb_typeof(p_events) = 'array' THEN
    INSERT INTO telemetry_events (user_id, session_id, app, event_type, route, duration_ms, props)
    SELECT
      uid,
      (e->>'session_id')::uuid,
      (e->>'app')::telemetry_app,
      left(e->>'event_type', 120),
      -- strip query string / fragment defensively (SDK already does)
      left(split_part(split_part(e->>'route', '?', 1), '#', 1), 300),
      NULLIF(e->>'duration_ms', '')::int,
      CASE WHEN jsonb_typeof(e->'props') = 'object' THEN e->'props' ELSE NULL END
    FROM jsonb_array_elements(p_events) AS e
    WHERE e ? 'session_id' AND e ? 'app' AND e ? 'event_type';
  END IF;

  IF p_errors IS NOT NULL AND jsonb_typeof(p_errors) = 'array' THEN
    INSERT INTO error_events (user_id, session_id, app, severity, source, name, message, stack, route, context, fingerprint)
    SELECT
      uid,
      (e->>'session_id')::uuid,
      (e->>'app')::telemetry_app,
      COALESCE(NULLIF(e->>'severity', '')::event_severity, 'error'),
      left(COALESCE(e->>'source', 'unhandled'), 40),
      left(e->>'name', 200),
      left(COALESCE(e->>'message', '(no message)'), 2000),
      left(e->>'stack', 8000),
      left(split_part(split_part(e->>'route', '?', 1), '#', 1), 300),
      CASE WHEN jsonb_typeof(e->'context') = 'object' THEN e->'context' ELSE NULL END,
      -- group by app + error class + first stack frame
      md5(
        COALESCE(e->>'app', '') || '|' ||
        COALESCE(e->>'name', '') || '|' ||
        COALESCE(split_part(e->>'stack', E'\n', 2), e->>'message', '')
      )
    FROM jsonb_array_elements(p_errors) AS e
    WHERE e ? 'session_id' AND e ? 'app' AND e ? 'message';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION ingest_telemetry(jsonb, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION ingest_telemetry(jsonb, jsonb) TO authenticated;


-- ============================================================
-- 6. Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
