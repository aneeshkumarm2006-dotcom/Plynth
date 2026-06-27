-- ============================================================
-- Plynth — column-level borrower-identity gating, directory RPC,
-- status-transition guard, and PIPEDA scaffolding (consent / export /
-- deletion request).
-- ============================================================
-- Follows 0016. Where 0016 closed the row-level holes, this closes the
-- COLUMN-level ones (RLS can't hide individual columns, so the fix is
-- to split sensitive columns into their own table / serve via RPC) and
-- adds the privacy primitives.
--
-- Sections:
--   1. deal_private — borrower identity behind its own table + RLS.   (#1)
--   2. lender_directory() RPC + drop cross-role profile SELECT.       (#2)
--   3. deal status-transition guard (no faking 'funded').            (#3)
--   4. consent / data-export / deletion-request scaffolding.         (#6)
--   5. accept_offer() updated to set the funding flag for (3).
-- ============================================================


-- ============================================================
-- 1. Borrower identity → deal_private (column-level gating).        (#1)
-- ============================================================
-- borrower_name + property_address are the only borrower-IDENTIFYING
-- columns on deals. RLS can restrict which deal ROWS a lender sees
-- (done in 0016) but not which COLUMNS, so a matched lender could still
-- raw-select these via PostgREST. Move them into a side table that
-- only the deal's broker (and a lender the broker has explicitly
-- revealed to) can read.

CREATE TABLE IF NOT EXISTS deal_private (
  deal_id          uuid PRIMARY KEY REFERENCES deals(id) ON DELETE CASCADE,
  borrower_name    text,
  property_address text,
  created_at       timestamptz DEFAULT now(),
  updated_at       timestamptz DEFAULT now()
);

-- Backfill from the existing columns, then drop them off deals.
INSERT INTO deal_private (deal_id, borrower_name, property_address)
SELECT id, borrower_name, property_address
FROM deals
WHERE borrower_name IS NOT NULL OR property_address IS NOT NULL
ON CONFLICT (deal_id) DO NOTHING;

ALTER TABLE deals DROP COLUMN IF EXISTS borrower_name;
ALTER TABLE deals DROP COLUMN IF EXISTS property_address;

ALTER TABLE deal_private ENABLE ROW LEVEL SECURITY;

-- The deal's broker owns the row (read + write).
DROP POLICY IF EXISTS "broker_manages_deal_private" ON deal_private;
CREATE POLICY "broker_manages_deal_private" ON deal_private
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM deals d WHERE d.id = deal_private.deal_id AND d.broker_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM deals d WHERE d.id = deal_private.deal_id AND d.broker_id = auth.uid())
  );

-- A lender may READ identity only once the broker has revealed it to
-- them (their uid is in deals.borrower_details_revealed_to, written by
-- the reveal_borrower_to() RPC from 0016).
DROP POLICY IF EXISTS "revealed_lender_reads_deal_private" ON deal_private;
CREATE POLICY "revealed_lender_reads_deal_private" ON deal_private
  FOR SELECT
  USING (
    current_user_role() = 'lender'
    AND EXISTS (
      SELECT 1 FROM deals d
      WHERE d.id = deal_private.deal_id
        AND auth.uid()::text = ANY (d.borrower_details_revealed_to)
    )
  );

-- Admin read.
DROP POLICY IF EXISTS "admin_reads_deal_private" ON deal_private;
CREATE POLICY "admin_reads_deal_private" ON deal_private
  FOR SELECT
  USING (current_user_role() = 'admin');

CREATE INDEX IF NOT EXISTS idx_deal_private_deal_id ON deal_private(deal_id);


-- ============================================================
-- 2. lender_directory() RPC + drop cross-role profile SELECT.       (#2)
-- ============================================================
-- BEFORE: brokers_can_view_lender_directory / lenders_can_view_broker_profiles
-- let a broker SELECT every lender's full profile row (incl. email +
-- fsra_license_number) and vice-versa — a scraping vector. The UI only
-- needs a few non-PII columns. Serve those through a column-whitelisted
-- SECURITY DEFINER RPC and remove the broad cross-role SELECT policies.
-- (Own-profile + admin SELECT policies are unchanged.)

DROP POLICY IF EXISTS "brokers_can_view_lender_directory" ON user_profiles;
DROP POLICY IF EXISTS "lenders_can_view_broker_profiles"  ON user_profiles;

CREATE OR REPLACE FUNCTION lender_directory()
RETURNS TABLE(
  id                     uuid,
  firm_name              text,
  lender_type            lender_type,
  asset_classes          asset_class[],
  provinces              province_code[],
  ltv_max_first_position int,
  loan_min_cents         bigint,
  loan_max_cents         bigint,
  close_speed_days_min   int,
  close_speed_days_max   int
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  RETURN QUERY
  SELECT
    p.id, p.firm_name, p.lender_type,
    c.asset_classes, c.provinces, c.ltv_max_first_position,
    c.loan_min_cents, c.loan_max_cents, c.close_speed_days_min, c.close_speed_days_max
  FROM user_profiles p
  LEFT JOIN lender_criteria c ON c.lender_id = p.id
  WHERE p.role = 'lender';
END;
$$;
REVOKE ALL ON FUNCTION lender_directory() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION lender_directory() TO authenticated;


-- ============================================================
-- 3. Deal status-transition guard.                                 (#3)
-- ============================================================
-- A broker could PATCH their own deal's status to anything, e.g. jump
-- straight to 'funded' with no accepted offer. Block a non-admin from
-- setting 'funded' directly; only accept_offer() may, which signals via
-- a transaction-local flag (set in section 5). All other transitions
-- (draft->active, ->offer/negotiating from the notify triggers, etc.)
-- remain allowed.
CREATE OR REPLACE FUNCTION trg_validate_deal_status_transition()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF current_user_role() = 'admin' THEN RETURN NEW; END IF;

  IF NEW.status = 'funded'
     AND COALESCE(current_setting('plynth.funding_in_progress', true), '') <> '1' THEN
    RAISE EXCEPTION 'deal status "funded" can only be set by accepting an offer';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS deals_validate_status ON deals;
CREATE TRIGGER deals_validate_status
  BEFORE UPDATE OF status ON deals
  FOR EACH ROW EXECUTE FUNCTION trg_validate_deal_status_transition();


-- ============================================================
-- 4. PIPEDA scaffolding: consent, data export, deletion request.   (#6)
-- ============================================================
-- consent_version / consented_at — stamped at signup (auth.ts).
-- deletion_requested_at — set by request_account_deletion(); per the
--   product decision, this only MARKS the account; data is retained in
--   the DB for now and hard-deletion is handled later.
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS consent_version       text,
  ADD COLUMN IF NOT EXISTS consented_at          timestamptz,
  ADD COLUMN IF NOT EXISTS deletion_requested_at timestamptz;

-- export_my_data() — returns the caller's own data as JSON (PIPEDA
-- right of access / portability). SECURITY DEFINER so it can assemble
-- across tables, but every sub-query is pinned to auth.uid().
CREATE OR REPLACE FUNCTION export_my_data()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid    uuid := auth.uid();
  result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  SELECT jsonb_build_object(
    'exported_at',  now(),
    'profile',      (SELECT to_jsonb(p) FROM user_profiles p WHERE p.id = uid),
    'deals',        (SELECT COALESCE(jsonb_agg(to_jsonb(d)), '[]'::jsonb)
                       FROM deals d WHERE d.broker_id = uid),
    'deal_private', (SELECT COALESCE(jsonb_agg(to_jsonb(dp)), '[]'::jsonb)
                       FROM deal_private dp
                       JOIN deals d ON d.id = dp.deal_id
                      WHERE d.broker_id = uid),
    'offers',       (SELECT COALESCE(jsonb_agg(to_jsonb(o)), '[]'::jsonb)
                       FROM offers o WHERE o.lender_id = uid),
    'fundings',     (SELECT COALESCE(jsonb_agg(to_jsonb(f)), '[]'::jsonb)
                       FROM fundings f WHERE f.broker_id = uid OR f.lender_id = uid),
    'notifications',(SELECT COALESCE(jsonb_agg(to_jsonb(n)), '[]'::jsonb)
                       FROM notifications n WHERE n.user_id = uid)
  )
  INTO result;

  RETURN result;
END;
$$;
REVOKE ALL ON FUNCTION export_my_data() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION export_my_data() TO authenticated;

-- request_account_deletion() — marks the caller's account for deletion
-- (data retained for now) and records an audit entry.
CREATE OR REPLACE FUNCTION request_account_deletion()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'authentication required'; END IF;

  UPDATE user_profiles
     SET deletion_requested_at = now(),
         updated_at            = now()
   WHERE id = uid;

  INSERT INTO audit_log (user_id, action, entity_type, entity_id)
  VALUES (uid, 'account.deletion_requested', 'user_profile', uid);
END;
$$;
REVOKE ALL ON FUNCTION request_account_deletion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION request_account_deletion() TO authenticated;


-- ============================================================
-- 5. accept_offer() — re-defined to flag the funding transition so the
--    status guard in section 3 permits the funded write.
-- ============================================================
CREATE OR REPLACE FUNCTION accept_offer(p_offer_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer  offers;
  v_broker uuid;
BEGIN
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id AND is_deleted = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer not found'; END IF;

  SELECT broker_id INTO v_broker FROM deals WHERE id = v_offer.deal_id;
  IF v_broker IS NULL THEN RAISE EXCEPTION 'deal not found'; END IF;

  IF auth.uid() <> v_broker AND auth.uid() <> v_offer.lender_id THEN
    RAISE EXCEPTION 'not authorized to accept this offer';
  END IF;

  IF v_offer.status NOT IN ('submitted','viewed','countered') THEN
    RAISE EXCEPTION 'offer is not in an acceptable state';
  END IF;

  UPDATE offers SET status = 'accepted', is_best_offer = true WHERE id = p_offer_id;

  -- Authorize the 'funded' transition for the status guard (txn-local).
  PERFORM set_config('plynth.funding_in_progress', '1', true);
  UPDATE deals SET status = 'funded' WHERE id = v_offer.deal_id;

  INSERT INTO fundings (
    deal_id, offer_id, broker_id, lender_id,
    actual_rate_percent, actual_fee_percent, actual_term_months, closed_at
  )
  VALUES (
    v_offer.deal_id, v_offer.id, v_broker, v_offer.lender_id,
    v_offer.rate_percent, v_offer.lender_fee_percent, v_offer.term_months, now()
  )
  ON CONFLICT (deal_id) DO NOTHING;
END;
$$;
REVOKE ALL ON FUNCTION accept_offer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_offer(uuid) TO authenticated;


-- ============================================================
-- 6. Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
