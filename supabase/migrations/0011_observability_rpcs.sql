-- ============================================================
-- Plynth — admin observability read RPCs
-- ============================================================
-- Powers four admin pages:
--   * System Health  — admin_health_summary, admin_error_stream
--   * User 360       — admin_user_360
--   * Funnel/Matching— admin_funnel, admin_matching_health
--
-- All follow the established admin-endpoint pattern (see 0008):
-- SECURITY DEFINER + `current_user_role() = 'admin'` gate as the
-- first statement + REVOKE ALL FROM PUBLIC / GRANT EXECUTE TO
-- authenticated. Definer rights let them read across all rows /
-- the telemetry tables; the gate ensures only admins get there.
--
-- auth.users is read ONLY in admin_user_360, column-whitelisted to
-- last_sign_in_at / email_confirmed_at — same rule as
-- admin_user_directory in 0008. Never SELECT u.*.
--
-- PREREQUISITES: 0008 (admin pattern), 0009 (telemetry/error tables).
-- ============================================================


-- ============================================================
-- System Health
-- ============================================================

-- ---- admin_health_summary(p_window_min int) -> jsonb ----
-- Rolling counts over the last p_window_min minutes: total errors,
-- fatals, a per-app breakdown (errors + events), and the top error
-- groups by fingerprint. Keys are camelCase to match the TS type.
CREATE OR REPLACE FUNCTION admin_health_summary(p_window_min int DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(mins => greatest(p_window_min, 1));
  result jsonb;
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  SELECT jsonb_build_object(
    'windowMin', p_window_min,
    'errorCount',
      (SELECT count(*) FROM error_events WHERE created_at >= since),
    'fatalCount',
      (SELECT count(*) FROM error_events WHERE created_at >= since AND severity = 'fatal'),
    'eventCount',
      (SELECT count(*) FROM telemetry_events WHERE created_at >= since),
    'byApp',
      COALESCE((
        SELECT jsonb_agg(row_to_json(t))
        FROM (
          SELECT
            a.app::text AS app,
            (SELECT count(*) FROM error_events e
               WHERE e.created_at >= since AND e.app = a.app)     AS errors,
            (SELECT count(*) FROM telemetry_events ev
               WHERE ev.created_at >= since AND ev.app = a.app)   AS events
          FROM (SELECT unnest(enum_range(NULL::telemetry_app)) AS app) a
          ORDER BY a.app
        ) t
      ), '[]'::jsonb),
    'topFingerprints',
      COALESCE((
        SELECT jsonb_agg(row_to_json(t))
        FROM (
          SELECT
            e.fingerprint,
            (array_agg(e.name ORDER BY e.created_at DESC))[1]    AS name,
            (array_agg(e.message ORDER BY e.created_at DESC))[1] AS message,
            (array_agg(e.app ORDER BY e.created_at DESC))[1]     AS app,
            count(*)                                             AS count,
            max(e.created_at)                                    AS "lastSeen"
          FROM error_events e
          WHERE e.created_at >= since
          GROUP BY e.fingerprint
          ORDER BY count(*) DESC
          LIMIT 8
        ) t
      ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION admin_health_summary(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_health_summary(int) TO authenticated;


-- ---- admin_error_stream(...) -> TABLE ----
-- Most-recent error rows, optionally filtered by app / severity /
-- user. NULL filters mean "any".
CREATE OR REPLACE FUNCTION admin_error_stream(
  p_app      text DEFAULT NULL,
  p_severity text DEFAULT NULL,
  p_user     uuid DEFAULT NULL,
  p_limit    int  DEFAULT 100
)
RETURNS TABLE(
  id bigint,
  created_at timestamptz,
  app telemetry_app,
  severity event_severity,
  source text,
  name text,
  message text,
  route text,
  user_id uuid,
  fingerprint text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  RETURN QUERY
  SELECT e.id, e.created_at, e.app, e.severity, e.source, e.name,
         e.message, e.route, e.user_id, e.fingerprint
  FROM error_events e
  WHERE (p_app      IS NULL OR e.app = p_app::telemetry_app)
    AND (p_severity IS NULL OR e.severity = p_severity::event_severity)
    AND (p_user     IS NULL OR e.user_id = p_user)
  ORDER BY e.created_at DESC
  LIMIT greatest(least(p_limit, 500), 1);
END;
$$;

REVOKE ALL ON FUNCTION admin_error_stream(text, text, uuid, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_error_stream(text, text, uuid, int) TO authenticated;


-- ============================================================
-- User 360
-- ============================================================

-- ---- admin_user_360(p_user uuid) -> jsonb ----
-- One round trip for the per-user drill-down: profile (+ whitelisted
-- auth columns), their deals, offers, notifications, login history,
-- audit trail, and recent errors. Each list is capped at 25 rows.
CREATE OR REPLACE FUNCTION admin_user_360(p_user uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  SELECT jsonb_build_object(
    'profile', (
      SELECT jsonb_build_object(
        'id', p.id,
        'role', p.role,
        'email', p.email,
        'name', NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), ''),
        'firm', COALESCE(p.firm_name, p.brokerage_name),
        'isVerified', p.is_verified,
        'verificationStatus', p.verification_status,
        'createdAt', p.created_at,
        'lastSignInAt', u.last_sign_in_at,
        'emailConfirmedAt', u.email_confirmed_at
      )
      FROM user_profiles p
      LEFT JOIN auth.users u ON u.id = p.id
      WHERE p.id = p_user
    ),
    'deals', COALESCE((
      SELECT jsonb_agg(row_to_json(d) ORDER BY d.created_at DESC)
      FROM (
        SELECT deal_number, city, province, loan_amount_cents AS amount_cents,
               ltv, status, created_at
        FROM deals
        WHERE broker_id = p_user AND is_deleted = false
        ORDER BY created_at DESC LIMIT 25
      ) d
    ), '[]'::jsonb),
    'offers', COALESCE((
      SELECT jsonb_agg(row_to_json(o) ORDER BY o.created_at DESC)
      FROM (
        SELECT dl.deal_number, of.rate_percent AS rate,
               of.lender_fee_percent AS lender_fee, of.status,
               of.expires_at, of.created_at
        FROM offers of
        JOIN deals dl ON dl.id = of.deal_id
        WHERE of.lender_id = p_user AND of.is_deleted = false
        ORDER BY of.created_at DESC LIMIT 25
      ) o
    ), '[]'::jsonb),
    'notifications', COALESCE((
      SELECT jsonb_agg(row_to_json(n) ORDER BY n.created_at DESC)
      FROM (
        SELECT notification_type, title, message, is_read, created_at
        FROM notifications
        WHERE user_id = p_user
        ORDER BY created_at DESC LIMIT 25
      ) n
    ), '[]'::jsonb),
    'loginHistory', COALESCE((
      SELECT jsonb_agg(row_to_json(l) ORDER BY l.created_at DESC)
      FROM (
        SELECT created_at, ip_address::text AS ip, user_agent
        FROM audit_log
        WHERE user_id = p_user AND action = 'session.login'
        ORDER BY created_at DESC LIMIT 25
      ) l
    ), '[]'::jsonb),
    'audit', COALESCE((
      SELECT jsonb_agg(row_to_json(a) ORDER BY a.created_at DESC)
      FROM (
        SELECT created_at, action, entity_type, entity_id::text AS entity_id,
               ip_address::text AS ip
        FROM audit_log
        WHERE user_id = p_user
        ORDER BY created_at DESC LIMIT 25
      ) a
    ), '[]'::jsonb),
    'recentErrors', COALESCE((
      SELECT jsonb_agg(row_to_json(er) ORDER BY er.created_at DESC)
      FROM (
        SELECT created_at, app, severity, source, name, message, route
        FROM error_events
        WHERE user_id = p_user
        ORDER BY created_at DESC LIMIT 25
      ) er
    ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION admin_user_360(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_user_360(uuid) TO authenticated;


-- ============================================================
-- Funnel + Matching
-- ============================================================

-- ---- admin_funnel(p_days int) -> jsonb ----
-- Deal-lifecycle funnel over deals created in the last p_days days.
-- Stages are cumulative "reached at least": submitted -> matched
-- (>=1 lender interaction) -> offered (>=1 offer) -> funded. Plus
-- leakage counts (declined / expired) for context.
CREATE OR REPLACE FUNCTION admin_funnel(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  submitted bigint;
  matched   bigint;
  offered   bigint;
  funded    bigint;
  declined  bigint;
  expired   bigint;
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  SELECT count(*) INTO submitted
  FROM deals d
  WHERE d.is_deleted = false AND d.status <> 'draft' AND d.created_at >= since;

  SELECT count(DISTINCT d.id) INTO matched
  FROM deals d
  JOIN lender_deal_interactions i ON i.deal_id = d.id
  WHERE d.is_deleted = false AND d.status <> 'draft' AND d.created_at >= since;

  SELECT count(DISTINCT d.id) INTO offered
  FROM deals d
  JOIN offers o ON o.deal_id = d.id AND o.is_deleted = false
  WHERE d.is_deleted = false AND d.status <> 'draft' AND d.created_at >= since;

  SELECT count(*) INTO funded
  FROM deals d
  JOIN fundings f ON f.deal_id = d.id
  WHERE d.is_deleted = false AND d.created_at >= since;

  SELECT count(*) INTO declined
  FROM deals d WHERE d.is_deleted = false AND d.status = 'declined' AND d.created_at >= since;

  SELECT count(*) INTO expired
  FROM deals d WHERE d.is_deleted = false AND d.status = 'expired' AND d.created_at >= since;

  RETURN jsonb_build_object(
    'days', p_days,
    'stages', jsonb_build_array(
      jsonb_build_object('stage', 'Submitted', 'count', submitted),
      jsonb_build_object('stage', 'Matched',   'count', matched),
      jsonb_build_object('stage', 'Offered',   'count', offered),
      jsonb_build_object('stage', 'Funded',    'count', funded)
    ),
    'leakage', jsonb_build_object('declined', declined, 'expired', expired)
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_funnel(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_funnel(int) TO authenticated;


-- ---- admin_matching_health(p_days int) -> jsonb ----
-- Surfaces the silent failure mode where deals sit unmatched. Reads
-- lender_deal_interactions.match_score. Returns aggregate match
-- quality plus the zero-match and low-match deal lists.
CREATE OR REPLACE FUNCTION admin_matching_health(p_days int DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  since timestamptz := now() - make_interval(days => greatest(p_days, 1));
  result jsonb;
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  SELECT jsonb_build_object(
    'days', p_days,
    'avgMatchScore', (
      SELECT round(avg(i.match_score)::numeric, 1)
      FROM lender_deal_interactions i
      JOIN deals d ON d.id = i.deal_id
      WHERE d.created_at >= since
    ),
    'avgMatchesPerDeal', (
      SELECT round(
        (count(*)::numeric / NULLIF(count(DISTINCT d.id), 0)), 2)
      FROM deals d
      LEFT JOIN lender_deal_interactions i ON i.deal_id = d.id
      WHERE d.is_deleted = false AND d.status <> 'draft' AND d.created_at >= since
    ),
    'zeroMatch', COALESCE((
      SELECT jsonb_agg(row_to_json(z) ORDER BY z.created_at DESC)
      FROM (
        SELECT d.deal_number, d.city, d.province, d.status, d.created_at
        FROM deals d
        WHERE d.is_deleted = false
          AND d.status IN ('active', 'matched')
          AND d.created_at >= since
          AND NOT EXISTS (SELECT 1 FROM lender_deal_interactions i WHERE i.deal_id = d.id)
        ORDER BY d.created_at DESC LIMIT 50
      ) z
    ), '[]'::jsonb),
    'lowMatch', COALESCE((
      SELECT jsonb_agg(row_to_json(l) ORDER BY l."bestScore" ASC)
      FROM (
        SELECT d.deal_number, d.city,
               max(i.match_score) AS "bestScore",
               count(i.id)        AS "matchCount"
        FROM deals d
        JOIN lender_deal_interactions i ON i.deal_id = d.id
        WHERE d.is_deleted = false AND d.created_at >= since
        GROUP BY d.id, d.deal_number, d.city
        HAVING max(i.match_score) < 50
        ORDER BY max(i.match_score) ASC LIMIT 50
      ) l
    ), '[]'::jsonb)
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION admin_matching_health(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_matching_health(int) TO authenticated;


-- ============================================================
-- Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
