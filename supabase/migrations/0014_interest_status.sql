-- ============================================================
-- Plynth — persist the lender's Interested / Pass signal
-- ============================================================
-- The lender's deal feed (Matched) and deal-detail page let a lender
-- mark a deal "Interested" or "Pass". Until now that was UI-only state
-- (a toast), lost on refresh and invisible to the pipeline. This adds a
-- durable column on lender_deal_interactions so the signal persists and
-- can drive the pipeline columns (Reviewing vs Dead).
--
-- NULL  = no signal yet (the default; deal sits in Reviewing)
-- 'interested' = lender flagged it for follow-up
-- 'passed'     = lender declined it (moves to Dead)

ALTER TABLE lender_deal_interactions
  ADD COLUMN IF NOT EXISTS interest_status TEXT
  CHECK (interest_status IN ('interested', 'passed'));

-- Lets "show me everything I've flagged" stay cheap as the table grows.
CREATE INDEX IF NOT EXISTS idx_lender_deal_interactions_interest
  ON lender_deal_interactions(lender_id, interest_status)
  WHERE interest_status IS NOT NULL;
