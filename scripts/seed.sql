-- Plynth demo enrichment seed.
-- The base seed (broker 1111…, lender 2222…, 5 active deals, lender criteria,
-- matched interactions) already exists. This ADDS offers, a counter, and a
-- couple of historical fundings so every screen has something to show. It
-- references the existing broker/lender/deals rather than duplicating them.
-- Notifications, status transitions, and audit entries are produced by the
-- triggers in migration 0004 — we don't insert those by hand.
--
-- Idempotent: ON CONFLICT / NOT EXISTS guards make re-runs safe.

-- ── Historical funded deals (broker track record) ───────────────────────────
INSERT INTO deals (id, broker_id, deal_number, city, province, asset_class,
                   loan_amount_cents, ltv, position, term_months, rate_min, rate_max,
                   status, submitted_at, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000231', '11111111-1111-1111-1111-111111111111',
   '0231', 'Hamilton', 'ON', 'Residential 1st', 54000000, 68.0, 'first', 12, 8.5, 9.5,
   'funded', now() - interval '42 days', now() - interval '45 days'),
  ('00000000-0000-0000-0000-000000000228', '11111111-1111-1111-1111-111111111111',
   '0228', 'Vaughan', 'ON', 'Residential 1st', 210000000, 55.0, 'first', 24, 8.0, 8.5,
   'funded', now() - interval '62 days', now() - interval '65 days')
ON CONFLICT (broker_id, deal_number) DO NOTHING;

-- ── Accepted offers backing those fundings ──────────────────────────────────
INSERT INTO offers (id, deal_id, lender_id, rate_percent, lender_fee_percent,
                    broker_fee_percent, term_months, max_ltv, conditions_text,
                    status, is_best_offer, expires_at, created_at)
VALUES
  ('00000000-0000-0000-0001-000000000231', '00000000-0000-0000-0000-000000000231',
   '22222222-2222-2222-2222-222222222222', 9.0, 2.0, 1.0, 12, 68.0,
   'Full appraisal, fire insurance, title', 'accepted', true,
   now() - interval '40 days', now() - interval '43 days'),
  ('00000000-0000-0000-0001-000000000228', '00000000-0000-0000-0000-000000000228',
   '22222222-2222-2222-2222-222222222222', 8.25, 1.5, 1.0, 24, 55.0,
   'Full appraisal', 'accepted', true,
   now() - interval '60 days', now() - interval '63 days')
ON CONFLICT (deal_id, lender_id) DO NOTHING;

-- ── Fundings (trigger notifies both parties) ────────────────────────────────
INSERT INTO fundings (id, deal_id, offer_id, broker_id, lender_id,
                      actual_rate_percent, actual_fee_percent, actual_term_months, closed_at)
VALUES
  ('00000000-0000-0000-0002-000000000231', '00000000-0000-0000-0000-000000000231',
   '00000000-0000-0000-0001-000000000231', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 9.0, 2.0, 12, now() - interval '35 days'),
  ('00000000-0000-0000-0002-000000000228', '00000000-0000-0000-0000-000000000228',
   '00000000-0000-0000-0001-000000000228', '11111111-1111-1111-1111-111111111111',
   '22222222-2222-2222-2222-222222222222', 8.25, 1.5, 24, now() - interval '55 days')
ON CONFLICT (deal_id) DO NOTHING;

-- ── Live offers on active deals (trigger: broker notification + status → offer) ─
INSERT INTO offers (id, deal_id, lender_id, rate_percent, lender_fee_percent,
                    broker_fee_percent, term_months, max_ltv, conditions_text,
                    status, is_best_offer, expires_at)
VALUES
  ('00000000-0000-0000-0001-000000000247',
   (SELECT id FROM deals WHERE broker_id='11111111-1111-1111-1111-111111111111' AND deal_number='0247'),
   '22222222-2222-2222-2222-222222222222', 9.25, 2.0, 1.0, 12, 72.0,
   'Full appraisal, fire insurance, title', 'submitted', true, now() + interval '3 days'),
  ('00000000-0000-0000-0001-000000000251',
   (SELECT id FROM deals WHERE broker_id='11111111-1111-1111-1111-111111111111' AND deal_number='0251'),
   '22222222-2222-2222-2222-222222222222', 8.95, 1.5, 1.0, 12, 65.0,
   'Full appraisal', 'submitted', false, now() + interval '5 days'),
  ('00000000-0000-0000-0001-000000000236',
   (SELECT id FROM deals WHERE broker_id='11111111-1111-1111-1111-111111111111' AND deal_number='0236'),
   '22222222-2222-2222-2222-222222222222', 10.5, 2.5, 0.5, 12, 80.0,
   'Drive-by appraisal acceptable', 'submitted', false, now() + interval '2 days')
ON CONFLICT (deal_id, lender_id) DO NOTHING;

-- ── Broker counter on 0236 (trigger: notify lender + status → negotiating) ──
INSERT INTO offer_history (offer_id, initiated_by, rate_percent, broker_note)
SELECT '00000000-0000-0000-0001-000000000236', 'broker', 9.75,
       'Strong borrower — can you improve toward 9.75%?'
WHERE NOT EXISTS (
  SELECT 1 FROM offer_history WHERE offer_id = '00000000-0000-0000-0001-000000000236'
);

-- ── Refresh the lender's matches against current deals (idempotent upsert) ──
SELECT compute_lender_matches('22222222-2222-2222-2222-222222222222');
