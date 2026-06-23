-- ============================================================
-- Plynth — Email mirror for in-app notifications
-- ============================================================
-- Every row inserted into `notifications` (by the triggers in
-- 0004) should also reach the user's inbox. Rather than touch
-- those three triggers, we hang ONE more trigger off the
-- `notifications` table itself, so any present or future
-- notification source automatically gets an email too.
--
-- Flow:
--   notifications INSERT
--     -> trg_notification_send_email()  (SECURITY DEFINER)
--        - resolves recipient email + display name + opt-out
--        - POSTs the payload to the `notify-email` Edge Function
--          via pg_net (fire-and-forget, never blocks the insert)
--     -> Edge Function validates a shared secret and calls Resend
--
-- SAFE BEFORE CONFIGURED: if the Edge Function URL is not set in
-- `private.email_config`, the trigger is a no-op. So this migration
-- can be applied now and "switched on" later once the Resend key +
-- function URL exist — without any code change.
--
-- PREREQUISITES: 0001 (user_profiles), 0004 (notifications table).
-- pg_net must be available (it is on Supabase by default).
-- ============================================================


-- ============================================================
-- 1. Per-user opt-out. Defaults ON so existing users keep getting
--    mail; a Settings/Account toggle can flip this later.
-- ============================================================
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN NOT NULL DEFAULT TRUE;


-- ============================================================
-- 2. Private config: Edge Function URL + shared webhook secret.
--    Kept out of the client's reach — RLS on, no policies, so
--    anon/authenticated cannot read it. The SECURITY DEFINER
--    trigger below runs as the table owner and bypasses RLS
--    (RLS is enabled but NOT forced), so it can still read.
-- ============================================================
CREATE SCHEMA IF NOT EXISTS private;

CREATE TABLE IF NOT EXISTS private.email_config (
  id            INT PRIMARY KEY DEFAULT 1,
  function_url  TEXT,          -- e.g. https://<ref>.supabase.co/functions/v1/notify-email
  webhook_secret TEXT,         -- shared bearer secret the function checks
  CONSTRAINT email_config_singleton CHECK (id = 1)
);

ALTER TABLE private.email_config ENABLE ROW LEVEL SECURITY;
-- No policies on purpose: only the table owner (definer functions) reads it.

-- Seed the single empty row so UPDATEs in step 4 always have a target.
INSERT INTO private.email_config (id, function_url, webhook_secret)
VALUES (1, NULL, NULL)
ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 3. The trigger: mirror each notification to email via pg_net.
-- ============================================================
CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE OR REPLACE FUNCTION trg_notification_send_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private, extensions
AS $$
DECLARE
  cfg         private.email_config%ROWTYPE;
  recipient   user_profiles%ROWTYPE;
  display_name TEXT;
BEGIN
  SELECT * INTO cfg FROM private.email_config WHERE id = 1;

  -- Not configured yet → silently do nothing (in-app notif still stands).
  IF cfg.function_url IS NULL OR length(trim(cfg.function_url)) = 0 THEN
    RETURN NEW;
  END IF;

  SELECT * INTO recipient FROM user_profiles WHERE id = NEW.user_id;
  IF NOT FOUND OR recipient.email IS NULL OR NOT recipient.email_notifications THEN
    RETURN NEW;
  END IF;

  display_name := COALESCE(
    NULLIF(trim(COALESCE(recipient.first_name, '') || ' ' || COALESCE(recipient.last_name, '')), ''),
    recipient.firm_name,
    recipient.brokerage_name,
    split_part(recipient.email, '@', 1)
  );

  -- Fire-and-forget. Wrapped so a transport hiccup can never roll back
  -- the notification insert that triggered us.
  BEGIN
    PERFORM net.http_post(
      url     := cfg.function_url,
      headers := jsonb_build_object(
                   'Content-Type', 'application/json',
                   'Authorization', 'Bearer ' || COALESCE(cfg.webhook_secret, '')
                 ),
      body    := jsonb_build_object(
                   'notification', jsonb_build_object(
                     'id',                NEW.id,
                     'user_id',           NEW.user_id,
                     'notification_type', NEW.notification_type,
                     'entity_type',       NEW.entity_type,
                     'entity_id',         NEW.entity_id,
                     'title',             NEW.title,
                     'message',           NEW.message,
                     'created_at',        NEW.created_at
                   ),
                   'recipient', jsonb_build_object(
                     'email', recipient.email,
                     'name',  display_name,
                     'role',  recipient.role
                   )
                 ),
      timeout_milliseconds := 5000
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'notify-email dispatch failed for notification % : %', NEW.id, SQLERRM;
  END;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION trg_notification_send_email() FROM PUBLIC;

DROP TRIGGER IF EXISTS notifications_send_email ON notifications;
CREATE TRIGGER notifications_send_email
  AFTER INSERT ON notifications
  FOR EACH ROW EXECUTE FUNCTION trg_notification_send_email();


-- ============================================================
-- 4. Admin-gated helper to set the config without hand-writing SQL.
--    Call once after deploying the Edge Function:
--      SELECT admin_set_email_config(
--        'https://<ref>.supabase.co/functions/v1/notify-email',
--        '<the same secret you set as EMAIL_WEBHOOK_SECRET on the function>'
--      );
-- ============================================================
CREATE OR REPLACE FUNCTION admin_set_email_config(p_url TEXT, p_secret TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, private
AS $$
BEGIN
  IF current_user_role() <> 'admin' THEN RAISE EXCEPTION 'admin only'; END IF;
  UPDATE private.email_config
     SET function_url = p_url, webhook_secret = p_secret
   WHERE id = 1;
END;
$$;

REVOKE ALL ON FUNCTION admin_set_email_config(TEXT, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION admin_set_email_config(TEXT, TEXT) TO authenticated;


-- ============================================================
-- 5. Reload PostgREST's schema cache (new column + RPC).
-- ============================================================
NOTIFY pgrst, 'reload schema';
