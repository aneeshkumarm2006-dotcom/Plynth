-- ============================================================
-- Plynth — add 'admin' to the user_role enum
-- ============================================================
-- !!! APPLY CAVEAT — MUST RUN OUTSIDE A TRANSACTION BLOCK !!!
--
--   ALTER TYPE ... ADD VALUE cannot run inside a transaction
--   block in PostgreSQL. Run this file STANDALONE (psql with
--   autocommit on, or `\set ON_ERROR_STOP` without BEGIN/COMMIT).
--   Most migration runners wrap each file in a transaction — if
--   yours does, run this one by hand.
--
--   Furthermore, a newly-added enum value CANNOT be USED (in a
--   policy expression, function body, comparison, etc.) in the
--   SAME transaction that added it. That is precisely why all the
--   admin policies and RPCs that compare against 'admin' live in a
--   SEPARATE file (0008) — they must be applied after 0007 has
--   fully committed.
-- ============================================================

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'admin';
