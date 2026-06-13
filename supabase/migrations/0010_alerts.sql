-- ============================================================
-- Plynth — alert rules + fired alert events
-- ============================================================
-- Proactive monitoring: an admin defines threshold rules; a periodic
-- evaluator (0012, pg_cron) checks them and opens alert_events when a
-- rule breaches. This file is just the tables + admin CRUD/ack RPCs;
-- the evaluation logic lives in 0012 so the schema can ship first.
--
-- SECURITY: same admin-endpoint pattern as 0008 — SECURITY DEFINER
-- RPCs gated on current_user_role() = 'admin', EXECUTE revoked from
-- PUBLIC and granted to authenticated. RLS on both tables is
-- admin-read; all writes go through the RPCs.
--
-- PREREQUISITE: 0007 (admin role), 0005 (current_user_role()).
-- ============================================================


-- ============================================================
-- 1. Enums.
-- ============================================================
DO $$ BEGIN
  CREATE TYPE alert_kind AS ENUM (
    'error_rate_spike', 'signups_drop', 'deal_stuck',
    'offers_expiring_unhandled', 'zero_match_rate'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_severity AS ENUM ('low', 'medium', 'high');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'resolved');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 2. Tables.
-- ============================================================
CREATE TABLE IF NOT EXISTS alert_rules (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind              alert_kind NOT NULL,
  name              TEXT NOT NULL,
  is_enabled        BOOLEAN NOT NULL DEFAULT true,
  severity          alert_severity NOT NULL DEFAULT 'medium',
  params            JSONB NOT NULL DEFAULT '{}'::jsonb,
  cooldown_min      INT NOT NULL DEFAULT 60,
  last_evaluated_at TIMESTAMPTZ,
  last_fired_at     TIMESTAMPTZ,
  created_by        UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alert_events (
  id              BIGSERIAL PRIMARY KEY,
  rule_id         UUID NOT NULL REFERENCES alert_rules(id) ON DELETE CASCADE,
  severity        alert_severity NOT NULL,
  status          alert_status NOT NULL DEFAULT 'open',
  summary         TEXT NOT NULL,
  details         JSONB,
  fired_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  acknowledged_by UUID REFERENCES user_profiles(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,
  resolved_at     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_alert_events_status_fired ON alert_events(status, fired_at DESC);
CREATE INDEX IF NOT EXISTS idx_alert_events_rule_fired   ON alert_events(rule_id, fired_at DESC);


-- ============================================================
-- 3. RLS — admin read only; writes via RPCs.
-- ============================================================
ALTER TABLE alert_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE alert_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ar_admin_read" ON alert_rules;
CREATE POLICY "ar_admin_read" ON alert_rules
  FOR SELECT USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "ae_admin_read" ON alert_events;
CREATE POLICY "ae_admin_read" ON alert_events
  FOR SELECT USING (current_user_role() = 'admin');


-- ============================================================
-- 4. Admin RPCs.
-- ============================================================

CREATE OR REPLACE FUNCTION admin_list_alert_rules()
RETURNS SETOF alert_rules
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;
  RETURN QUERY SELECT * FROM alert_rules ORDER BY created_at DESC;
END;
$$;
REVOKE ALL ON FUNCTION admin_list_alert_rules() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_alert_rules() TO authenticated;


-- Upsert: p_id NULL creates, non-NULL updates.
CREATE OR REPLACE FUNCTION admin_upsert_alert_rule(
  p_id           uuid,
  p_kind         alert_kind,
  p_name         text,
  p_severity     alert_severity,
  p_params       jsonb,
  p_cooldown_min int,
  p_is_enabled   boolean
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  IF p_id IS NULL THEN
    INSERT INTO alert_rules (kind, name, severity, params, cooldown_min, is_enabled, created_by)
    VALUES (p_kind, p_name, p_severity, COALESCE(p_params, '{}'::jsonb),
            COALESCE(p_cooldown_min, 60), COALESCE(p_is_enabled, true), auth.uid())
    RETURNING id INTO new_id;
  ELSE
    UPDATE alert_rules
       SET kind = p_kind, name = p_name, severity = p_severity,
           params = COALESCE(p_params, '{}'::jsonb),
           cooldown_min = COALESCE(p_cooldown_min, cooldown_min),
           is_enabled = COALESCE(p_is_enabled, is_enabled),
           updated_at = now()
     WHERE id = p_id
    RETURNING id INTO new_id;
  END IF;

  RETURN new_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_upsert_alert_rule(uuid, alert_kind, text, alert_severity, jsonb, int, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_upsert_alert_rule(uuid, alert_kind, text, alert_severity, jsonb, int, boolean) TO authenticated;


CREATE OR REPLACE FUNCTION admin_set_alert_rule_enabled(p_id uuid, p_enabled boolean)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE alert_rules SET is_enabled = p_enabled, updated_at = now() WHERE id = p_id;
END;
$$;
REVOKE ALL ON FUNCTION admin_set_alert_rule_enabled(uuid, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_alert_rule_enabled(uuid, boolean) TO authenticated;


CREATE OR REPLACE FUNCTION admin_list_alert_events(p_status text DEFAULT NULL, p_limit int DEFAULT 100)
RETURNS TABLE(
  id bigint, rule_id uuid, rule_name text, kind alert_kind,
  severity alert_severity, status alert_status, summary text,
  details jsonb, fired_at timestamptz, acknowledged_at timestamptz, resolved_at timestamptz
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;
  RETURN QUERY
  SELECT e.id, e.rule_id, r.name, r.kind, e.severity, e.status, e.summary,
         e.details, e.fired_at, e.acknowledged_at, e.resolved_at
  FROM alert_events e
  JOIN alert_rules r ON r.id = e.rule_id
  WHERE (p_status IS NULL OR e.status = p_status::alert_status)
  ORDER BY e.fired_at DESC
  LIMIT greatest(least(p_limit, 500), 1);
END;
$$;
REVOKE ALL ON FUNCTION admin_list_alert_events(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_list_alert_events(text, int) TO authenticated;


-- Acknowledge / resolve a fired event. Writes an audit_log row.
CREATE OR REPLACE FUNCTION admin_update_alert_event(p_id bigint, p_status alert_status)
RETURNS void
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  UPDATE alert_events
     SET status = p_status,
         acknowledged_by = CASE WHEN p_status = 'acknowledged' THEN auth.uid() ELSE acknowledged_by END,
         acknowledged_at = CASE WHEN p_status = 'acknowledged' THEN now() ELSE acknowledged_at END,
         resolved_at     = CASE WHEN p_status = 'resolved' THEN now() ELSE resolved_at END
   WHERE id = p_id;

  INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
  VALUES (auth.uid(), 'admin.alert_' || p_status::text, 'alert_event', NULL,
          jsonb_build_object('alert_event_id', p_id, 'status', p_status));
END;
$$;
REVOKE ALL ON FUNCTION admin_update_alert_event(bigint, alert_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_update_alert_event(bigint, alert_status) TO authenticated;


-- ============================================================
-- 5. Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
