-- 0081 · pin_reset_requests forces row-level security, like every other table
--
-- WHAT WAS WRONG (T-138, found by supabase/tests/09_grants.sql)
--   0015 made FORCE ROW LEVEL SECURITY the rule for every table in public, and
--   09_grants asserts it: "every table in public forces RLS". 0034 created
--   pin_reset_requests later and ENABLED row-level security without FORCING
--   it -- the only table that does not. Without FORCE, the table's OWNER is
--   not bound by its policies; only the admin-read policy stands between the
--   list of accounts with an open PIN reset and anybody running as the owner.
--
-- WHAT THIS CHANGES
--   One flag on one table. The service role the Edge Functions write with has
--   BYPASSRLS (read on production, T-005), so their writes are unaffected;
--   superusers bypass RLS whatever the flag says. No row, policy or grant
--   changes. Idempotent: forcing an already-forced table is a no-op.

alter table public.pin_reset_requests force row level security;
