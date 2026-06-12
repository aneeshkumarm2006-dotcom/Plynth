-- ============================================================
-- Plynth — admin RLS policies, audit indexing, and admin RPCs
-- ============================================================
-- SECURITY MODEL (read before editing):
--
--  * Admin access is gated by current_user_role() = 'admin'
--    (the SECURITY DEFINER STABLE helper from 0005 that reads the
--    caller's own role without recursing through user_profiles
--    RLS). Never inline `(SELECT role FROM user_profiles WHERE
--    id = auth.uid())` inside a user_profiles policy — that
--    reintroduces the infinite-recursion 500s 0005 fixed.
--
--  * All admin policies are ADDITIVE. Postgres combines multiple
--    permissive policies with OR, so adding an admin SELECT policy
--    does not weaken or alter the existing broker/lender policies.
--    We never DROP a broker/lender policy here.
--
--  * Privilege-escalation guard: the existing
--    users_can_update_own_profile policy lets any user UPDATE their
--    own row. Without a guard a broker could set role='admin' on
--    themselves. A BEFORE UPDATE trigger blocks non-admins from
--    changing role / is_verified / verification_status.
--
--  * Admin RPCs are SECURITY DEFINER (they read across all rows /
--    touch auth.users), so each one re-checks current_user_role()
--    = 'admin' as its first statement, and EXECUTE is REVOKEd from
--    PUBLIC and GRANTed only to `authenticated`. SECURITY DEFINER
--    + an internal role check is the standard "admin endpoint"
--    pattern: definer rights let the function bypass RLS, the gate
--    ensures only admins reach the privileged body.
--
--  * auth.users exposure: admin_user_directory is the ONLY place
--    auth.users is read. It is admin-gated AND column-whitelisted
--    (never SELECT u.*). auth.users holds auth secrets/tokens; only
--    last_sign_in_at / email_confirmed_at are surfaced.
--
--  * PREREQUISITE: 0007 (ALTER TYPE user_role ADD VALUE 'admin')
--    must be COMMITTED before this file runs — the 'admin'
--    comparisons below will error otherwise.
-- ============================================================


-- ============================================================
-- 1. Self-privilege-escalation guard (do this first).
-- ============================================================
-- Blocks a non-admin from changing sensitive columns on their own
-- profile via users_can_update_own_profile. Admins (and the
-- service_role, which has current_user_role() = NULL but bypasses
-- RLS entirely and uses the admin_set_verification RPC) are not
-- restricted by this for the verification flow — but note: a NULL
-- role (no profile / service contexts) is also blocked here, which
-- is intentional. The admin_set_verification RPC runs as SECURITY
-- DEFINER and sets these columns; to let it through we explicitly
-- allow when the session is acting as the function owner is not
-- reliable, so instead we allow admins (current_user_role()='admin')
-- and rely on the RPC's own admin gate to authorize the change.

CREATE OR REPLACE FUNCTION trg_block_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Admins may change anything.
  IF current_user_role() = 'admin' THEN
    RETURN NEW;
  END IF;

  -- Non-admins may not touch role / verification fields.
  IF NEW.role IS DISTINCT FROM OLD.role
     OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
     OR NEW.verification_status IS DISTINCT FROM OLD.verification_status
  THEN
    RAISE EXCEPTION
      'Not permitted: only an admin may change role, is_verified, or verification_status';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS user_profiles_block_escalation ON user_profiles;
CREATE TRIGGER user_profiles_block_escalation
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION trg_block_profile_privilege_escalation();


-- ============================================================
-- 2. Additive admin policies.
-- ============================================================
-- One admin SELECT policy per domain table, plus an admin UPDATE
-- on user_profiles. current_user_role() is used everywhere so the
-- user_profiles policies stay recursion-free.

-- user_profiles: admin can see and edit every profile.
DROP POLICY IF EXISTS "admins_can_view_all_profiles" ON user_profiles;
CREATE POLICY "admins_can_view_all_profiles" ON user_profiles
  FOR SELECT USING (current_user_role() = 'admin');

DROP POLICY IF EXISTS "admins_can_update_all_profiles" ON user_profiles;
CREATE POLICY "admins_can_update_all_profiles" ON user_profiles
  FOR UPDATE USING (current_user_role() = 'admin')
  WITH CHECK (current_user_role() = 'admin');

-- deals
DROP POLICY IF EXISTS "admins_can_view_all_deals" ON deals;
CREATE POLICY "admins_can_view_all_deals" ON deals
  FOR SELECT USING (current_user_role() = 'admin');

-- offers
DROP POLICY IF EXISTS "admins_can_view_all_offers" ON offers;
CREATE POLICY "admins_can_view_all_offers" ON offers
  FOR SELECT USING (current_user_role() = 'admin');

-- offer_history
DROP POLICY IF EXISTS "admins_can_view_all_offer_history" ON offer_history;
CREATE POLICY "admins_can_view_all_offer_history" ON offer_history
  FOR SELECT USING (current_user_role() = 'admin');

-- fundings
DROP POLICY IF EXISTS "admins_can_view_all_fundings" ON fundings;
CREATE POLICY "admins_can_view_all_fundings" ON fundings
  FOR SELECT USING (current_user_role() = 'admin');

-- lender_criteria
DROP POLICY IF EXISTS "admins_can_view_all_lender_criteria" ON lender_criteria;
CREATE POLICY "admins_can_view_all_lender_criteria" ON lender_criteria
  FOR SELECT USING (current_user_role() = 'admin');

-- lender_deal_interactions
DROP POLICY IF EXISTS "admins_can_view_all_interactions" ON lender_deal_interactions;
CREATE POLICY "admins_can_view_all_interactions" ON lender_deal_interactions
  FOR SELECT USING (current_user_role() = 'admin');

-- notifications
DROP POLICY IF EXISTS "admins_can_view_all_notifications" ON notifications;
CREATE POLICY "admins_can_view_all_notifications" ON notifications
  FOR SELECT USING (current_user_role() = 'admin');

-- audit_log (powers the activity feed; broker/lender only see their own)
DROP POLICY IF EXISTS "admins_can_view_all_audit_log" ON audit_log;
CREATE POLICY "admins_can_view_all_audit_log" ON audit_log
  FOR SELECT USING (current_user_role() = 'admin');


-- ============================================================
-- 3. Global audit index for the activity feed.
-- ============================================================
-- The feed does `ORDER BY created_at DESC LIMIT n` across ALL rows.
-- The existing idx_audit_log_user_id is (user_id, created_at DESC)
-- which doesn't serve an un-filtered global ordering. Add a plain
-- created_at DESC index for the admin feed.
CREATE INDEX IF NOT EXISTS idx_audit_log_created_global
  ON audit_log(created_at DESC);


-- ============================================================
-- 4. Admin RPCs (SECURITY DEFINER + internal admin gate).
-- ============================================================

-- ---- admin_metrics() -> jsonb ----
-- Single jsonb_build_object so the keys map 1:1 to AdminMetrics
-- (camelCase, exactly as the TS interface expects).
CREATE OR REPLACE FUNCTION admin_metrics()
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
    'brokers',
      (SELECT count(*) FROM user_profiles WHERE role = 'broker'),
    'lenders',
      (SELECT count(*) FROM user_profiles WHERE role = 'lender'),
    'signupsThisWeek',
      (SELECT count(*) FROM user_profiles WHERE created_at >= now() - interval '7 days'),
    'activeDeals',
      (SELECT count(*) FROM deals
         WHERE is_deleted = false
           AND status IN ('active','matched','negotiating','offer')),
    'liveOffers',
      (SELECT count(*) FROM offers
         WHERE is_deleted = false
           AND status IN ('submitted','viewed','countered')),
    'fundings',
      (SELECT count(*) FROM fundings),
    'fundedVolumeCents',
      (SELECT COALESCE(SUM(d.loan_amount_cents), 0)
         FROM fundings f JOIN deals d ON d.id = f.deal_id),
    'weeklyActiveUsers',
      (SELECT count(DISTINCT user_id) FROM audit_log
         WHERE user_id IS NOT NULL
           AND created_at >= now() - interval '7 days')
  )
  INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION admin_metrics() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_metrics() TO authenticated;


-- ---- admin_signup_series(p_days int) -> TABLE(bucket text, value int) ----
-- Signups grouped by week over the last p_days days, chronological.
CREATE OR REPLACE FUNCTION admin_signup_series(p_days int)
RETURNS TABLE(bucket text, value int)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('week', p.created_at), 'Mon DD') AS bucket,
    count(*)::int                                       AS value
  FROM user_profiles p
  WHERE p.created_at >= now() - make_interval(days => p_days)
  GROUP BY date_trunc('week', p.created_at)
  ORDER BY date_trunc('week', p.created_at);
END;
$$;

REVOKE ALL ON FUNCTION admin_signup_series(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_signup_series(int) TO authenticated;


-- ---- admin_funding_series(p_months int) -> TABLE(bucket text, value bigint) ----
-- Funded volume (sum of funded deals' loan_amount_cents) grouped by
-- month over the last p_months months, chronological.
CREATE OR REPLACE FUNCTION admin_funding_series(p_months int)
RETURNS TABLE(bucket text, value bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  RETURN QUERY
  SELECT
    to_char(date_trunc('month', f.closed_at), 'Mon')      AS bucket,
    COALESCE(SUM(d.loan_amount_cents), 0)::bigint         AS value
  FROM fundings f
  JOIN deals d ON d.id = f.deal_id
  WHERE f.closed_at >= now() - make_interval(months => p_months)
  GROUP BY date_trunc('month', f.closed_at)
  ORDER BY date_trunc('month', f.closed_at);
END;
$$;

REVOKE ALL ON FUNCTION admin_funding_series(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_funding_series(int) TO authenticated;


-- ---- admin_user_directory() -> TABLE(...) ----
-- The ONLY surface that reads auth.users. Admin-gated and
-- column-whitelisted: never SELECT u.* — only the three auth
-- timestamps the directory needs are exposed.
CREATE OR REPLACE FUNCTION admin_user_directory()
RETURNS TABLE(
  id uuid,
  role user_role,
  email text,
  firm text,
  name text,
  is_verified boolean,
  verification_status verification_status,
  created_at timestamptz,
  last_sign_in_at timestamptz,
  email_confirmed_at timestamptz,
  deals_count int,
  offers_count int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  RETURN QUERY
  SELECT
    p.id,
    p.role,
    p.email,
    COALESCE(p.firm_name, p.brokerage_name)                                  AS firm,
    NULLIF(TRIM(COALESCE(p.first_name,'') || ' ' || COALESCE(p.last_name,'')), '') AS name,
    p.is_verified,
    p.verification_status,
    p.created_at,
    -- Whitelisted auth.users columns only.
    u.last_sign_in_at,
    u.email_confirmed_at,
    (SELECT count(*)::int FROM deals d  WHERE d.broker_id = p.id)            AS deals_count,
    (SELECT count(*)::int FROM offers o WHERE o.lender_id = p.id)            AS offers_count
  FROM user_profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  ORDER BY p.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION admin_user_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_user_directory() TO authenticated;


-- ---- admin_set_verification(target uuid, new_status verification_status) -> void ----
-- Approves/rejects a user. Mutates the profile and writes an audit
-- row attributed to the acting admin (auth.uid()).
CREATE OR REPLACE FUNCTION admin_set_verification(target uuid, new_status verification_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;

  UPDATE user_profiles
     SET verification_status = new_status,
         is_verified         = (new_status = 'approved'),
         updated_at          = now()
   WHERE id = target;

  INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
  VALUES (
    auth.uid(),
    'admin.set_verification',
    'user_profile',
    target,
    jsonb_build_object('status', new_status)
  );
END;
$$;

REVOKE ALL ON FUNCTION admin_set_verification(uuid, verification_status) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_verification(uuid, verification_status) TO authenticated;


-- ============================================================
-- 5. session.login audit trigger on auth.users.
-- ============================================================
-- Supabase updates auth.users.last_sign_in_at on every successful
-- login. We mirror that into audit_log so "who signed in when"
-- shows up in the activity feed. SECURITY DEFINER so the trigger
-- (which fires in the GoTrue/auth context) can write into the
-- public.audit_log table regardless of the session role.
--
-- NOTE: this requires the migration to be applied by a role that
-- owns / can create triggers on auth.users (the Supabase postgres
-- superuser, which our direct-connection migrate script uses). If
-- you apply migrations as a less-privileged role and this CREATE
-- TRIGGER fails with "must be owner of relation users", FALLBACK:
-- comment out the trigger block below and instead surface logins
-- via admin_user_directory.last_sign_in_at (already whitelisted),
-- or run this trigger creation once by hand as the superuser. The
-- rest of this migration does not depend on the trigger.

CREATE OR REPLACE FUNCTION trg_audit_auth_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.last_sign_in_at IS DISTINCT FROM OLD.last_sign_in_at THEN
    INSERT INTO audit_log (user_id, action, entity_type, entity_id)
    VALUES (NEW.id, 'session.login', NULL, NULL);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auth_users_audit_login ON auth.users;
CREATE TRIGGER auth_users_audit_login
  AFTER UPDATE ON auth.users
  FOR EACH ROW EXECUTE FUNCTION trg_audit_auth_login();


-- ============================================================
-- 6. Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
