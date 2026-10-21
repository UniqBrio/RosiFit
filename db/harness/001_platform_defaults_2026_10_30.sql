-- LOCAL TEST HARNESS ONLY — never applied to Supabase.
--
-- Applied by reset.sh AFTER 000_local_shim.sql, and only when
-- HARNESS_PLATFORM_DEFAULTS=2026-10-30. It turns the shim's reproduction of
-- Supabase's OLD default privileges into the NEW ones.
--
-- From 30-Oct-2026 Supabase stops automatically granting anything on objects
-- newly created in `public`: no SELECT/INSERT/UPDATE/DELETE on tables, no
-- EXECUTE on functions, no USAGE/SELECT on sequences — to anon,
-- authenticated OR service_role. The statements below are the platform's own
-- documented opt-in SQL (supabase.com/docs/guides/api/securing-your-api,
-- "Default privileges for new tables and functions"), widened from the four
-- named privileges to ALL so that the shim's `grant all` is taken back
-- completely.
--
-- The last line is in the platform's SQL and is kept for fidelity, but it is a
-- no-op: a per-schema entry is added to PostgreSQL's global default, never
-- subtracted from it, and the global default gives EXECUTE on every new
-- function to PUBLIC. New functions therefore still reach PUBLIC in this mode,
-- as they do on production today, which has no global entry for postgres
-- (read 21-Oct-2026). Whether a project created after 30-Oct gets one is not
-- documented and not assumed; every function revokes PUBLIC by name either way
-- (0097's header, RC-124).
--
-- WHY THIS MODE EXISTS. The default shim reproduces the platform as it was
-- when production was created, so it can only prove a migration works on
-- THAT platform. A project created after 30-Oct-2026 — a disaster-recovery
-- rebuild, or another move like the one to Mumbai — replays the same files
-- against these defaults instead, and every grant this repository forgot to
-- write down is missing there. Running the suite in this mode is the only
-- way to find out which grants exist only because the platform handed them
-- out (KL-008: the harness answers privilege questions with whatever the shim
-- set up, so the shim has to be able to set up both).
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on functions from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke execute on functions from public;
