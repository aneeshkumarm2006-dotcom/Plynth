-- ============================================================
-- Plynth — Real-time matching algorithm
-- ============================================================
-- compute_lender_matches(p_lender_id) — re-evaluate every active deal
-- against a single lender's criteria and persist the result (with
-- a 0–100 match score) to lender_deal_interactions.
-- ============================================================

-- Score one (deal, criteria) pair. Mirrors the docs in ARCHITECTURE.md
-- and the heuristic in `estimateMatchCount()` so the live builder preview
-- doesn't drift from the server's authoritative number.
CREATE OR REPLACE FUNCTION plynth_score_deal(
  p_deal deals,
  p_criteria lender_criteria
) RETURNS INT AS $$
DECLARE
  s NUMERIC := 2;
  asset_in BOOLEAN;
  province_in BOOLEAN;
  loan_in BOOLEAN;
  ltv_limit INT;
  beacon_ok BOOLEAN;
  exclusion_hits INT;
BEGIN
  -- Hard filters: if any miss, score is 0 (no match recorded).
  asset_in := p_deal.asset_class = ANY(p_criteria.asset_classes);
  province_in := p_deal.province = ANY(p_criteria.provinces);
  loan_in := p_deal.loan_amount_cents BETWEEN p_criteria.loan_min_cents AND p_criteria.loan_max_cents;

  ltv_limit := CASE WHEN p_deal.position = 'first'::loan_position
                    THEN p_criteria.ltv_max_first_position
                    ELSE p_criteria.ltv_max_second_position END;

  IF NOT asset_in OR NOT province_in OR NOT loan_in OR p_deal.ltv > ltv_limit THEN
    RETURN 0;
  END IF;

  IF p_deal.term_months < p_criteria.term_min_months OR p_deal.term_months > p_criteria.term_max_months THEN
    RETURN 0;
  END IF;

  -- Beacon: allowed to be unknown, otherwise must meet floor.
  beacon_ok := p_deal.beacon_score IS NULL OR p_deal.beacon_score >= p_criteria.min_beacon_score;
  IF NOT beacon_ok THEN RETURN 0; END IF;

  -- BFS borrower preference (only filters out when criteria says no).
  IF p_deal.is_self_employed AND NOT p_criteria.accept_bfs_borrowers THEN
    RETURN 0;
  END IF;

  -- Exclusion intersection: any overlap eliminates the match.
  SELECT COUNT(*) INTO exclusion_hits
  FROM unnest(COALESCE(p_deal.exclusion_flags, ARRAY[]::TEXT[])) AS d(flag)
  WHERE d.flag = ANY(COALESCE(p_criteria.exclusion_flags, ARRAY[]::TEXT[]));
  IF exclusion_hits > 0 THEN RETURN 0; END IF;

  -- Soft scoring: closer fit → higher score, capped at 100.
  s := s + 7;                                              -- asset class match
  s := s + 5.5;                                            -- province match
  s := s + GREATEST(0, (ltv_limit - p_deal.ltv) * 0.55);   -- LTV headroom
  s := s + GREATEST(0,
    (p_criteria.loan_max_cents - p_deal.loan_amount_cents) / 100000.0 * 0.04
  );                                                       -- loan-size headroom
  IF p_deal.beacon_score IS NOT NULL THEN
    s := s + GREATEST(0, (p_deal.beacon_score - p_criteria.min_beacon_score) * 0.05);
  END IF;
  IF p_criteria.accept_bfs_borrowers AND p_deal.is_self_employed THEN
    s := s + 2;
  END IF;
  -- Recency bonus: brand-new deals get a small boost.
  s := s + GREATEST(0, 5 - EXTRACT(EPOCH FROM (NOW() - p_deal.created_at)) / 86400.0);

  RETURN GREATEST(0, LEAST(100, ROUND(s)::INT));
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================
-- compute_lender_matches — full rebuild for a single lender.
-- Called on criteria save (via RPC) and when new deals are submitted.
-- ============================================================
CREATE OR REPLACE FUNCTION compute_lender_matches(p_lender_id UUID)
RETURNS INT AS $$
DECLARE
  c lender_criteria;
  d deals;
  s INT;
  inserted_count INT := 0;
BEGIN
  SELECT * INTO c FROM lender_criteria WHERE lender_id = p_lender_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR d IN
    SELECT * FROM deals
    WHERE is_deleted = FALSE
      AND status IN ('active', 'matched', 'negotiating', 'offer')
  LOOP
    s := plynth_score_deal(d, c);

    IF s > 0 THEN
      INSERT INTO lender_deal_interactions (lender_id, deal_id, match_score, matched_at)
      VALUES (p_lender_id, d.id, s, NOW())
      ON CONFLICT (lender_id, deal_id) DO UPDATE
        SET match_score = EXCLUDED.match_score,
            matched_at = NOW();
      inserted_count := inserted_count + 1;
    ELSE
      -- Criteria changed and this deal no longer qualifies — remove the row.
      DELETE FROM lender_deal_interactions
      WHERE lender_id = p_lender_id AND deal_id = d.id;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- compute_deal_matches — when a new deal is submitted, score it
-- against every lender's criteria.
-- ============================================================
CREATE OR REPLACE FUNCTION compute_deal_matches(p_deal_id UUID)
RETURNS INT AS $$
DECLARE
  d deals;
  c lender_criteria;
  s INT;
  inserted_count INT := 0;
BEGIN
  SELECT * INTO d FROM deals WHERE id = p_deal_id;
  IF NOT FOUND OR d.is_deleted THEN RETURN 0; END IF;

  FOR c IN SELECT * FROM lender_criteria LOOP
    s := plynth_score_deal(d, c);
    IF s > 0 THEN
      INSERT INTO lender_deal_interactions (lender_id, deal_id, match_score, matched_at)
      VALUES (c.lender_id, d.id, s, NOW())
      ON CONFLICT (lender_id, deal_id) DO UPDATE
        SET match_score = EXCLUDED.match_score,
            matched_at = NOW();
      inserted_count := inserted_count + 1;
    END IF;
  END LOOP;

  RETURN inserted_count;
END;
$$ LANGUAGE plpgsql;

-- Increment view count for a (lender, deal) pair.
CREATE OR REPLACE FUNCTION increment_view_count(p_lender_id UUID, p_deal_id UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO lender_deal_interactions (lender_id, deal_id, views_count)
  VALUES (p_lender_id, p_deal_id, 1)
  ON CONFLICT (lender_id, deal_id) DO UPDATE
    SET views_count = lender_deal_interactions.views_count + 1;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Triggers
-- ============================================================

-- When a deal moves to 'active', compute matches across all lenders.
CREATE OR REPLACE FUNCTION trg_deal_recompute_matches() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    PERFORM compute_deal_matches(NEW.id);
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'active' THEN
    PERFORM compute_deal_matches(NEW.id);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deals_recompute_matches ON deals;
CREATE TRIGGER deals_recompute_matches
  AFTER INSERT OR UPDATE OF status ON deals
  FOR EACH ROW EXECUTE FUNCTION trg_deal_recompute_matches();

-- Keep updated_at fresh on every UPDATE.
CREATE OR REPLACE FUNCTION trg_set_updated_at() RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deals_set_updated_at ON deals;
CREATE TRIGGER deals_set_updated_at BEFORE UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS offers_set_updated_at ON offers;
CREATE TRIGGER offers_set_updated_at BEFORE UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();

DROP TRIGGER IF EXISTS criteria_set_updated_at ON lender_criteria;
CREATE TRIGGER criteria_set_updated_at BEFORE UPDATE ON lender_criteria
  FOR EACH ROW EXECUTE FUNCTION trg_set_updated_at();
