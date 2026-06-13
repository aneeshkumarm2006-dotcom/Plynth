-- ============================================================
-- Plynth — alert evaluation + pg_cron scheduling + retention
-- ============================================================
-- The evaluation engine for the rules defined in 0010, plus the
-- scheduled jobs that drive it and enforce telemetry retention.
--
--   * evaluate_alert_rules()  — checks every enabled rule, opens an
--     alert_event on breach (respecting per-rule cooldown). Runs as
--     the table owner (SECURITY DEFINER, no client grant); pg_cron
--     invokes it every 5 minutes.
--   * admin_run_alert_eval()  — admin-gated wrapper for the "Run
--     evaluation now" button.
--   * pg_cron jobs            — 5-min evaluation + nightly purges:
--       telemetry_events 90d, error_events 180d, alert_events 1yr.
--       (audit_log is the 7-year legal record — never purged here.)
--
-- PREREQUISITES: 0009 (telemetry/error tables), 0010 (alert tables).
-- pg_cron must be available; the schedule block is defensive so the
-- migration still succeeds (functions installed) if it is not.
-- ============================================================


-- ============================================================
-- 1. evaluate_alert_rules() -> int (number of alerts fired)
-- ============================================================
CREATE OR REPLACE FUNCTION evaluate_alert_rules()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r          alert_rules%ROWTYPE;
  fired      int := 0;
  breached   boolean;
  summary    text;
  details    jsonb;
  observed   numeric;
  threshold  numeric;
  p          jsonb;
BEGIN
  FOR r IN SELECT * FROM alert_rules WHERE is_enabled LOOP
    breached := false;
    summary  := NULL;
    details  := NULL;
    p        := COALESCE(r.params, '{}'::jsonb);

    IF r.kind = 'error_rate_spike' THEN
      threshold := COALESCE((p->>'threshold')::numeric, 50);
      SELECT count(*) INTO observed
      FROM error_events
      WHERE created_at >= now() - make_interval(mins => COALESCE((p->>'window_min')::int, 15));
      IF observed >= threshold THEN
        breached := true;
        summary  := format('Error rate %s in %sm (threshold %s)',
                           observed, COALESCE((p->>'window_min')::int, 15), threshold);
        details  := jsonb_build_object('observed', observed, 'threshold', threshold);
      END IF;

    ELSIF r.kind = 'signups_drop' THEN
      -- Last 24h signups vs the prior-7-day daily average × factor.
      DECLARE
        recent numeric;
        avg7   numeric;
        factor numeric := COALESCE((p->>'factor')::numeric, 0.2);
      BEGIN
        SELECT count(*) INTO recent FROM user_profiles
          WHERE created_at >= now() - interval '24 hours';
        SELECT count(*)::numeric / 7 INTO avg7 FROM user_profiles
          WHERE created_at >= now() - interval '8 days'
            AND created_at <  now() - interval '24 hours';
        IF avg7 > 0 AND recent < avg7 * factor THEN
          breached := true;
          summary  := format('Signups %s in 24h, below %s%% of 7-day avg (%s/day)',
                             recent, round(factor * 100), round(avg7, 1));
          details  := jsonb_build_object('recent', recent, 'avg7', avg7, 'factor', factor);
        END IF;
      END;

    ELSIF r.kind = 'deal_stuck' THEN
      SELECT count(*) INTO observed FROM deals
        WHERE is_deleted = false
          AND status IN ('active', 'matched', 'negotiating', 'offer')
          AND updated_at < now() - make_interval(days => COALESCE((p->>'days')::int, 3));
      IF observed > 0 THEN
        breached := true;
        summary  := format('%s deal(s) stuck > %s days with no movement',
                           observed, COALESCE((p->>'days')::int, 3));
        details  := jsonb_build_object('count', observed);
      END IF;

    ELSIF r.kind = 'offers_expiring_unhandled' THEN
      SELECT count(*) INTO observed FROM offers
        WHERE is_deleted = false
          AND status IN ('submitted', 'viewed')
          AND expires_at IS NOT NULL
          AND expires_at BETWEEN now() AND now() + make_interval(hours => COALESCE((p->>'hours')::int, 12));
      IF observed > 0 THEN
        breached := true;
        summary  := format('%s offer(s) expire within %sh with no response',
                           observed, COALESCE((p->>'hours')::int, 12));
        details  := jsonb_build_object('count', observed);
      END IF;

    ELSIF r.kind = 'zero_match_rate' THEN
      SELECT count(*) INTO observed FROM deals d
        WHERE d.is_deleted = false
          AND d.status = 'active'
          AND d.created_at < now() - make_interval(hours => COALESCE((p->>'hours')::int, 24))
          AND NOT EXISTS (SELECT 1 FROM lender_deal_interactions i WHERE i.deal_id = d.id);
      IF observed > 0 THEN
        breached := true;
        summary  := format('%s active deal(s) with zero matches after %sh',
                           observed, COALESCE((p->>'hours')::int, 24));
        details  := jsonb_build_object('count', observed);
      END IF;
    END IF;

    UPDATE alert_rules SET last_evaluated_at = now() WHERE id = r.id;

    -- Fire only if breached AND outside the cooldown window.
    IF breached
       AND (r.last_fired_at IS NULL
            OR r.last_fired_at < now() - make_interval(mins => r.cooldown_min)) THEN
      INSERT INTO alert_events (rule_id, severity, summary, details)
      VALUES (r.id, r.severity, summary, details);
      UPDATE alert_rules SET last_fired_at = now() WHERE id = r.id;
      fired := fired + 1;
    END IF;
  END LOOP;

  RETURN fired;
END;
$$;

REVOKE ALL ON FUNCTION evaluate_alert_rules() FROM PUBLIC;
-- No grant to authenticated: only the cron owner + the admin wrapper call it.


-- ---- admin_run_alert_eval() -> int ----
CREATE OR REPLACE FUNCTION admin_run_alert_eval()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;
  RETURN evaluate_alert_rules();
END;
$$;

REVOKE ALL ON FUNCTION admin_run_alert_eval() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_run_alert_eval() TO authenticated;


-- ============================================================
-- 2. Seed default alert rules (only if none exist yet).
-- ============================================================
INSERT INTO alert_rules (kind, name, severity, params, cooldown_min)
SELECT * FROM (VALUES
  ('error_rate_spike'::alert_kind,        'Error-rate spike',          'high'::alert_severity,   '{"threshold":50,"window_min":15}'::jsonb, 30),
  ('deal_stuck'::alert_kind,              'Deals stuck > 3 days',      'medium'::alert_severity, '{"days":3}'::jsonb,                        720),
  ('offers_expiring_unhandled'::alert_kind,'Offers expiring unhandled','medium'::alert_severity, '{"hours":12}'::jsonb,                      360),
  ('zero_match_rate'::alert_kind,         'Deals with zero matches',   'medium'::alert_severity, '{"hours":24}'::jsonb,                      360),
  ('signups_drop'::alert_kind,            'Signups dropped sharply',   'low'::alert_severity,    '{"factor":0.2}'::jsonb,                    1440)
) AS v(kind, name, severity, params, cooldown_min)
WHERE NOT EXISTS (SELECT 1 FROM alert_rules);


-- ============================================================
-- 3. pg_cron — evaluation every 5 min + nightly retention purges.
-- ============================================================
-- Defensive: if pg_cron is unavailable, the functions above are
-- still installed and the admin "Run now" button works; only the
-- automatic schedule is skipped (a NOTICE is raised).
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- cron.schedule upserts by job name on recent pg_cron; on older
  -- versions a duplicate name errors — unschedule first, ignoring
  -- "job not found".
  BEGIN PERFORM cron.unschedule('plynth-alert-eval');        EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('plynth-purge-telemetry');   EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('plynth-purge-errors');      EXCEPTION WHEN OTHERS THEN NULL; END;
  BEGIN PERFORM cron.unschedule('plynth-purge-alert-events');EXCEPTION WHEN OTHERS THEN NULL; END;

  PERFORM cron.schedule('plynth-alert-eval', '*/5 * * * *',
    $cron$ SELECT evaluate_alert_rules(); $cron$);

  PERFORM cron.schedule('plynth-purge-telemetry', '15 3 * * *',
    $cron$ DELETE FROM telemetry_events WHERE created_at < now() - interval '90 days'; $cron$);

  PERFORM cron.schedule('plynth-purge-errors', '20 3 * * *',
    $cron$ DELETE FROM error_events WHERE created_at < now() - interval '180 days'; $cron$);

  PERFORM cron.schedule('plynth-purge-alert-events', '25 3 * * *',
    $cron$ DELETE FROM alert_events WHERE fired_at < now() - interval '365 days'; $cron$);
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg_cron unavailable (%); alert eval + retention must run via the admin "Run now" button or an external scheduler.', SQLERRM;
END $$;


-- ============================================================
-- 4. Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
