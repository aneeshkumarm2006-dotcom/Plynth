-- ============================================================
-- Plynth — fix RLS on the app's write paths (offer / fund / match)
-- ============================================================
-- The deal lifecycle was only ever exercised with SEEDED data
-- (inserted as the superuser, which bypasses RLS). Driven from the
-- UI as a real broker / lender, several server-side writes are
-- blocked by row-level security:
--
--   1. notifications — the offer/counter/funding triggers INSERT a
--      notification for the OTHER party (e.g. lender's offer notifies
--      the broker). They ran SECURITY INVOKER, so the insert happened
--      as the lender, and notifications has no INSERT policy →
--      "new row violates row-level security policy for table
--      notifications" (the visible 403 on Submit offer).
--
--   2. lender_deal_interactions — when a BROKER submits a deal,
--      compute_deal_matches() inserts match rows with lender_id =
--      <each lender>. The INSERT policy requires lender_id =
--      auth.uid() (a lender acting for themselves), so a broker-
--      triggered match insert is denied and aborts the whole deal
--      submit.
--
--   3. fundings — accept() (run by the broker) inserts the funding
--      row directly, but fundings has no INSERT policy at all.
--
-- FIX:
--   * Make the server-side trigger/match functions SECURITY DEFINER
--     (they only write system-generated rows derived from the
--     triggering row — no arbitrary user input), with a pinned
--     search_path. This is the same pattern used by the admin and
--     audit-login functions.
--   * Add an INSERT policy on fundings for the deal's participants.
-- ============================================================


-- 1. Notification triggers — must write notifications for the other
--    party regardless of who triggered them.
ALTER FUNCTION trg_offer_inserted_notify() SECURITY DEFINER SET search_path = public;
ALTER FUNCTION trg_offer_history_notify()  SECURITY DEFINER SET search_path = public;
ALTER FUNCTION trg_funding_notify()        SECURITY DEFINER SET search_path = public;

-- 2. Matching — a broker submitting a deal must be able to create the
--    lender match rows (and a lender saving criteria, their own).
ALTER FUNCTION compute_deal_matches(uuid)   SECURITY DEFINER SET search_path = public;
ALTER FUNCTION compute_lender_matches(uuid) SECURITY DEFINER SET search_path = public;

-- 3. fundings — let the deal's broker or lender create the funding
--    record on accept. (SELECT is already covered by existing
--    participant/admin policies.)
DROP POLICY IF EXISTS "participants_can_create_funding" ON fundings;
CREATE POLICY "participants_can_create_funding" ON fundings
  FOR INSERT WITH CHECK (broker_id = auth.uid() OR lender_id = auth.uid());

-- Reload PostgREST's schema cache.
NOTIFY pgrst, 'reload schema';
