-- ============================================================
-- Plynth — Notification triggers + audit log helpers
-- ============================================================
-- Server-side triggers create notifications and audit entries
-- so the frontend never has to do bookkeeping for these events.
-- ============================================================

-- On new offer → notify the deal's broker.
CREATE OR REPLACE FUNCTION trg_offer_inserted_notify() RETURNS TRIGGER AS $$
DECLARE
  broker UUID;
  deal_no TEXT;
BEGIN
  SELECT broker_id, deal_number INTO broker, deal_no FROM deals WHERE id = NEW.deal_id;
  IF broker IS NULL THEN RETURN NEW; END IF;

  INSERT INTO notifications (user_id, notification_type, entity_type, entity_id, title, message)
  VALUES (
    broker,
    'offer_received',
    'offer',
    NEW.id,
    'New offer on Deal № ' || deal_no,
    'Rate ' || NEW.rate_percent::TEXT || '% · expires ' || to_char(NEW.expires_at, 'Mon DD')
  );

  -- Move the deal status forward if it was just sitting active.
  UPDATE deals SET status = 'offer'
   WHERE id = NEW.deal_id AND status IN ('active', 'matched');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_notify_inserted ON offers;
CREATE TRIGGER offers_notify_inserted
  AFTER INSERT ON offers
  FOR EACH ROW EXECUTE FUNCTION trg_offer_inserted_notify();

-- On counter-offer (offer_history insert) → notify the other party.
CREATE OR REPLACE FUNCTION trg_offer_history_notify() RETURNS TRIGGER AS $$
DECLARE
  offer_row offers;
  broker UUID;
  deal_no TEXT;
  notify_user UUID;
BEGIN
  SELECT * INTO offer_row FROM offers WHERE id = NEW.offer_id;
  IF NOT FOUND THEN RETURN NEW; END IF;

  SELECT broker_id, deal_number INTO broker, deal_no FROM deals WHERE id = offer_row.deal_id;

  IF NEW.initiated_by = 'broker' THEN
    notify_user := offer_row.lender_id;
  ELSE
    notify_user := broker;
  END IF;

  IF notify_user IS NOT NULL THEN
    INSERT INTO notifications (user_id, notification_type, entity_type, entity_id, title, message)
    VALUES (
      notify_user,
      'offer_countered',
      'offer',
      NEW.offer_id,
      'Counter on Deal № ' || deal_no,
      COALESCE(NEW.broker_note, 'Terms updated.')
    );
  END IF;

  -- Mark the deal as negotiating once counters start flying.
  UPDATE deals SET status = 'negotiating'
   WHERE id = offer_row.deal_id AND status IN ('offer', 'matched', 'active');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offer_history_notify ON offer_history;
CREATE TRIGGER offer_history_notify
  AFTER INSERT ON offer_history
  FOR EACH ROW EXECUTE FUNCTION trg_offer_history_notify();

-- On funding → notify both broker and lender.
CREATE OR REPLACE FUNCTION trg_funding_notify() RETURNS TRIGGER AS $$
DECLARE
  deal_no TEXT;
BEGIN
  SELECT deal_number INTO deal_no FROM deals WHERE id = NEW.deal_id;

  INSERT INTO notifications (user_id, notification_type, entity_type, entity_id, title, message)
  VALUES
    (NEW.broker_id, 'deal_funded', 'funding', NEW.id, 'Deal № ' || deal_no || ' funded', 'Closing complete.'),
    (NEW.lender_id, 'deal_funded', 'funding', NEW.id, 'Deal № ' || deal_no || ' funded', 'Funds deployed.');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS fundings_notify ON fundings;
CREATE TRIGGER fundings_notify
  AFTER INSERT ON fundings
  FOR EACH ROW EXECUTE FUNCTION trg_funding_notify();

-- ============================================================
-- Audit log triggers — immutable record on key state changes.
-- ============================================================
CREATE OR REPLACE FUNCTION trg_audit_deal_change() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
    VALUES (NEW.broker_id, 'deal.created', 'deal', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
    VALUES (NEW.broker_id, 'deal.status_changed', 'deal', NEW.id,
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS deals_audit ON deals;
CREATE TRIGGER deals_audit
  AFTER INSERT OR UPDATE ON deals
  FOR EACH ROW EXECUTE FUNCTION trg_audit_deal_change();

CREATE OR REPLACE FUNCTION trg_audit_offer_change() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
    VALUES (NEW.lender_id, 'offer.created', 'offer', NEW.id, to_jsonb(NEW));
  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (user_id, action, entity_type, entity_id, changes)
    VALUES (NEW.lender_id, 'offer.status_changed', 'offer', NEW.id,
            jsonb_build_object('from', OLD.status, 'to', NEW.status));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS offers_audit ON offers;
CREATE TRIGGER offers_audit
  AFTER INSERT OR UPDATE ON offers
  FOR EACH ROW EXECUTE FUNCTION trg_audit_offer_change();

-- ============================================================
-- Hourly expiry sweep (call from pg_cron or a Supabase scheduled
-- function). Marks past-due offers as expired and bumps the deal
-- status back to 'active' if no live offers remain.
-- ============================================================
CREATE OR REPLACE FUNCTION expire_offers() RETURNS INT AS $$
DECLARE
  expired INT;
BEGIN
  WITH e AS (
    UPDATE offers SET status = 'expired'
     WHERE status IN ('submitted', 'viewed', 'countered')
       AND expires_at < NOW()
    RETURNING id
  )
  SELECT COUNT(*) INTO expired FROM e;
  RETURN expired;
END;
$$ LANGUAGE plpgsql;
