-- ============================================================
-- Plynth — security hardening: close the broker↔lender RLS holes
-- ============================================================
-- The apps talk to Postgres DIRECTLY with the anon key + the user's
-- JWT, so RLS is the ONLY security boundary — every policy gap is
-- exploitable by any logged-in user calling PostgREST/RPC with curl.
-- A multi-auditor review found that the broker↔lender domain tables
-- were wide open. This migration closes them.
--
-- Threat model: an authenticated broker or lender hitting the REST/RPC
-- API directly with their own token, bypassing the UI.
--
-- Strategy (mirrors the 0008/0013 pattern already in this codebase):
--   * Reads are scoped by RLS to rows the caller is entitled to.
--   * Privileged WRITES (accept/counter/reject/fund, reveal borrower,
--     set interest) go through SECURITY DEFINER RPCs that derive every
--     sensitive value (counterparties, terms, initiated_by) server-side
--     from trusted rows — never from caller input — and gate on the
--     caller's identity. Direct client writes to those tables are then
--     dropped + revoked, so the RPC is the only door.
--
-- What this does NOT yet do (tracked follow-ups, see report):
--   * Column-level gating of borrower IDENTITY (borrower_name /
--     property_address / notes) for matched lenders — needs a view/RPC
--     feed refactor. This migration restricts lenders to deals they are
--     matched to/engaged with, which removes the mass-leak; identity
--     columns still need a column-level gate.
--   * Cross-role profile column gating (H4), deal status-transition
--     validation (M1), FORCE ROW LEVEL SECURITY (H2).
-- ============================================================


-- ============================================================
-- 0. Make the audit triggers SECURITY DEFINER.
-- ============================================================
-- trg_audit_deal_change / trg_audit_offer_change run on every deal/
-- offer write and INSERT into audit_log. They were SECURITY INVOKER,
-- so they only worked because audit_log had a `WITH CHECK (true)`
-- INSERT policy (which let ANY user forge audit rows — see step 5).
-- Flip them to DEFINER (like the notify triggers in 0013) so they can
-- write the system-of-record audit row as the owner, after we revoke
-- direct client INSERT on audit_log.
ALTER FUNCTION trg_audit_deal_change()  SECURITY DEFINER SET search_path = public;
ALTER FUNCTION trg_audit_offer_change() SECURITY DEFINER SET search_path = public;


-- ============================================================
-- 1. deals — lenders may only see deals they're engaged with.  (C1)
-- ============================================================
-- BEFORE: `broker_id = auth.uid() OR <caller is a lender>` let EVERY
-- lender SELECT EVERY deal (all columns, all brokers, incl. drafts) —
-- the borrower-PII mass leak.
-- AFTER: brokers see their own deals; lenders see only deals they have
-- a match row for, or have an offer on (covers the negotiation/funded
-- lifecycle). Uses current_user_role() (the recursion-safe helper from
-- 0005) rather than inlining a user_profiles subquery.
DROP POLICY IF EXISTS "brokers_can_view_own_deals" ON deals;

CREATE POLICY "brokers_can_view_own_deals" ON deals
  FOR SELECT USING (broker_id = auth.uid());

DROP POLICY IF EXISTS "lenders_can_view_engaged_deals" ON deals;
CREATE POLICY "lenders_can_view_engaged_deals" ON deals
  FOR SELECT USING (
    current_user_role() = 'lender'
    AND is_deleted = false
    AND (
      EXISTS (
        SELECT 1 FROM lender_deal_interactions i
        WHERE i.deal_id = deals.id AND i.lender_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM offers o
        WHERE o.deal_id = deals.id AND o.lender_id = auth.uid()
      )
    )
  );


-- ============================================================
-- 2. offers — only the lender may directly update their own offer. (C4)
-- ============================================================
-- BEFORE: the deal's broker could UPDATE the LENDER's offer row —
-- rewrite rate/fee, flip is_best_offer, set status='accepted'.
-- AFTER: direct UPDATE is lender-only (needed for the resubmit upsert).
-- Broker accept/reject/counter now go through the RPCs below.
DROP POLICY IF EXISTS "can_update_own_offer" ON offers;
CREATE POLICY "lenders_can_update_own_offer" ON offers
  FOR UPDATE USING (lender_id = auth.uid())
  WITH CHECK (lender_id = auth.uid());


-- ============================================================
-- 3. offer_history — no direct client INSERT (forgeable initiated_by). (C5)
-- ============================================================
-- BEFORE: either party could INSERT a history row with a client-chosen
-- `initiated_by`, impersonating the counterparty and driving deal state
-- via the notify trigger.
-- AFTER: only counter_offer() writes here, deriving initiated_by from
-- the caller's identity.
DROP POLICY IF EXISTS "can_create_offer_history" ON offer_history;
REVOKE INSERT, UPDATE, DELETE ON offer_history FROM authenticated;
-- SELECT (participant + admin) policies are unchanged.


-- ============================================================
-- 4. fundings — no direct client INSERT (forged closed loans). (C3)
-- ============================================================
-- BEFORE: any participant could INSERT a funding pairing themselves
-- with ANY counterparty/deal/offer at attacker-chosen terms.
-- AFTER: only accept_offer() writes here, with counterparties + terms
-- taken from the trusted offer/deal rows.
DROP POLICY IF EXISTS "participants_can_create_funding" ON fundings;
REVOKE INSERT, UPDATE, DELETE ON fundings FROM authenticated;
-- SELECT (participant + admin) policies are unchanged.


-- ============================================================
-- 5. audit_log — no direct client writes (forged legal record). (C2)
-- ============================================================
-- BEFORE: `WITH CHECK (true)` + the blanket grant let any user INSERT
-- arbitrary audit rows (spoof user_id/action/ip), poisoning the
-- 7-year system of record and the admin feed.
-- AFTER: only the (now DEFINER) audit triggers and admin RPCs write.
DROP POLICY IF EXISTS "audit_log_insert" ON audit_log;
REVOKE INSERT, UPDATE, DELETE ON audit_log FROM authenticated;
-- SELECT (own + admin) policies are unchanged.


-- ============================================================
-- 6. lender_deal_interactions — no direct client writes (self-matches). (C6)
-- ============================================================
-- BEFORE: a lender could INSERT/UPSERT a row for ANY deal with a
-- self-chosen match_score and borrower_details_revealed=true,
-- manufacturing a match and bypassing the reveal gate.
-- AFTER: matches are written only by the (DEFINER) compute_* functions;
-- the lender's interest signal + view counts go through RPCs (below).
DROP POLICY IF EXISTS "lenders_can_create_interactions" ON lender_deal_interactions;
DROP POLICY IF EXISTS "lenders_can_update_own_interactions" ON lender_deal_interactions;
REVOKE INSERT, UPDATE, DELETE ON lender_deal_interactions FROM authenticated;
-- SELECT (own + admin) policies are unchanged.


-- ============================================================
-- 7. telemetry — no direct client writes (bypassed the ingest choke). (C8)
-- ============================================================
-- The SECURITY DEFINER ingest_telemetry() RPC is the intended single
-- write path (it pins user_id := auth.uid() and truncates free text).
-- The blanket grant let clients also INSERT directly, defeating that.
DROP POLICY IF EXISTS "te_insert_own" ON telemetry_events;
DROP POLICY IF EXISTS "ee_insert_own" ON error_events;
REVOKE INSERT, UPDATE, DELETE ON telemetry_events FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON error_events     FROM authenticated;


-- ============================================================
-- 8. Privileged-write RPCs (SECURITY DEFINER + caller-identity gate).
-- ============================================================

-- ---- accept_offer(p_offer_id) ----
-- Either participant (the deal's broker or the offer's lender) may
-- accept the counterparty's current terms. Sets the offer accepted,
-- funds the deal, and records the funding — all terms/counterparties
-- read from the trusted offer/deal rows, never from the caller.
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
  UPDATE deals  SET status = 'funded' WHERE id = v_offer.deal_id;

  INSERT INTO fundings (
    deal_id, offer_id, broker_id, lender_id,
    actual_rate_percent, actual_fee_percent, actual_term_months, closed_at
  )
  VALUES (
    v_offer.deal_id, v_offer.id, v_broker, v_offer.lender_id,
    v_offer.rate_percent, v_offer.lender_fee_percent, v_offer.term_months, now()
  )
  ON CONFLICT (deal_id) DO NOTHING;  -- deal_id is UNIQUE; ignore double-accept
END;
$$;
REVOKE ALL ON FUNCTION accept_offer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION accept_offer(uuid) TO authenticated;


-- ---- reject_offer(p_offer_id) ----
-- Either participant may reject. (Broker declines a lender's offer; a
-- lender may withdraw their own.)
CREATE OR REPLACE FUNCTION reject_offer(p_offer_id uuid)
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

  IF auth.uid() <> v_broker AND auth.uid() <> v_offer.lender_id THEN
    RAISE EXCEPTION 'not authorized to reject this offer';
  END IF;

  UPDATE offers SET status = 'rejected' WHERE id = p_offer_id;
END;
$$;
REVOKE ALL ON FUNCTION reject_offer(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reject_offer(uuid) TO authenticated;


-- ---- counter_offer(p_offer_id, terms…) ----
-- Either participant may counter. `initiated_by` is derived from the
-- caller's identity (never trusted from the client), closing the
-- negotiation-spoofing hole. The AFTER INSERT trigger on offer_history
-- handles notifying the other party + advancing deal status.
CREATE OR REPLACE FUNCTION counter_offer(
  p_offer_id           uuid,
  p_rate_percent       numeric DEFAULT NULL,
  p_lender_fee_percent numeric DEFAULT NULL,
  p_broker_fee_percent numeric DEFAULT NULL,
  p_broker_note        text    DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offer     offers;
  v_broker    uuid;
  v_initiator offer_initiator;
BEGIN
  SELECT * INTO v_offer FROM offers WHERE id = p_offer_id AND is_deleted = false;
  IF NOT FOUND THEN RAISE EXCEPTION 'offer not found'; END IF;

  SELECT broker_id INTO v_broker FROM deals WHERE id = v_offer.deal_id;

  IF auth.uid() = v_offer.lender_id THEN
    v_initiator := 'lender';
  ELSIF auth.uid() = v_broker THEN
    v_initiator := 'broker';
  ELSE
    RAISE EXCEPTION 'not authorized to counter this offer';
  END IF;

  IF v_offer.status NOT IN ('submitted','viewed','countered') THEN
    RAISE EXCEPTION 'offer is not counterable';
  END IF;

  INSERT INTO offer_history (
    offer_id, initiated_by, rate_percent, lender_fee_percent, broker_fee_percent, broker_note
  )
  VALUES (
    p_offer_id, v_initiator, p_rate_percent, p_lender_fee_percent, p_broker_fee_percent, p_broker_note
  );

  UPDATE offers SET status = 'countered', updated_at = now() WHERE id = p_offer_id;
END;
$$;
REVOKE ALL ON FUNCTION counter_offer(uuid, numeric, numeric, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION counter_offer(uuid, numeric, numeric, numeric, text) TO authenticated;


-- ---- reveal_borrower_to(p_deal_id, p_lender_ids) ----
-- Only the deal's broker may reveal borrower identity, and the append
-- is atomic (fixes the read-modify-write TOCTOU in the old client path).
CREATE OR REPLACE FUNCTION reveal_borrower_to(p_deal_id uuid, p_lender_ids text[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_broker uuid;
BEGIN
  SELECT broker_id INTO v_broker FROM deals WHERE id = p_deal_id;
  IF v_broker IS NULL THEN RAISE EXCEPTION 'deal not found'; END IF;
  IF auth.uid() <> v_broker THEN
    RAISE EXCEPTION 'only the deal broker may reveal borrower details';
  END IF;

  UPDATE deals
     SET borrower_details_revealed_to = (
       SELECT ARRAY(
         SELECT DISTINCT unnest(
           COALESCE(borrower_details_revealed_to, ARRAY[]::text[]) || COALESCE(p_lender_ids, ARRAY[]::text[])
         )
       )
     )
   WHERE id = p_deal_id;

  UPDATE lender_deal_interactions
     SET borrower_details_revealed = true
   WHERE deal_id = p_deal_id
     AND lender_id = ANY (p_lender_ids::uuid[]);
END;
$$;
REVOKE ALL ON FUNCTION reveal_borrower_to(uuid, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reveal_borrower_to(uuid, text[]) TO authenticated;


-- ---- set_interest(p_deal_id, p_status) ----
-- The lender's Interested/Pass signal, scoped to the caller's own match
-- row. Update-only: a lender can only flag a deal they were matched to
-- (the feed only ever surfaces matched deals), so it cannot fabricate
-- interaction rows for arbitrary deals.
CREATE OR REPLACE FUNCTION set_interest(p_deal_id uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_status NOT IN ('interested','passed') THEN
    RAISE EXCEPTION 'invalid interest status';
  END IF;

  UPDATE lender_deal_interactions
     SET interest_status = p_status
   WHERE lender_id = auth.uid()
     AND deal_id   = p_deal_id;
END;
$$;
REVOKE ALL ON FUNCTION set_interest(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION set_interest(uuid, text) TO authenticated;


-- ---- increment_view_count(p_lender_id, p_deal_id) — harden in place ----
-- Was SECURITY INVOKER and trusted p_lender_id, letting a lender inflate
-- another lender's view counts (and, via the old INSERT policy, create
-- rows). Now DEFINER, ignores p_lender_id in favour of auth.uid(), and
-- is update-only (no row creation). Signature kept for client compat.
CREATE OR REPLACE FUNCTION increment_view_count(p_lender_id uuid, p_deal_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE lender_deal_interactions
     SET views_count = views_count + 1
   WHERE lender_id = auth.uid()
     AND deal_id   = p_deal_id;
END;
$$;
REVOKE ALL ON FUNCTION increment_view_count(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_view_count(uuid, uuid) TO authenticated;


-- ============================================================
-- 9. Reload PostgREST's schema cache.
-- ============================================================
NOTIFY pgrst, 'reload schema';
