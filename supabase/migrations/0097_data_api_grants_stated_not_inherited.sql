-- 0097 · every Data API grant this schema relies on is written down, and none is inherited
-- requests/2026-10-21-data-api-default-grants.md · T-145 · RC-124
--
-- WHY. From 30-Oct-2026 Supabase stops automatically granting anything on objects newly
-- created in `public`: no table privileges, no function EXECUTE, no sequence USAGE -- to
-- anon, authenticated OR service_role. Existing objects keep the grants they have; only what
-- is created afterwards starts empty.
--
-- 0015 (tables) and 0025/0069 (functions) already took anon and authenticated out of this
-- project's defaults, and every table migration since writes its own grants. What was still
-- inherited, measured read-only on production (lbyqipunsbzkcvdrxach, Mumbai, PG 17.11) on
-- 21-Oct-2026 and by replaying every migration under the NEW defaults in the harness
-- (HARNESS_PLATFORM_DEFAULTS=2026-10-30):
--
--   1. normalize_name(text) and normalize_email(text). authenticated and service_role hold
--      EXECUTE only because the old default handed it out -- 0069 revoked PUBLIC and anon and
--      said in as many words that authenticated keeps them "through its own direct grant",
--      which was the default's grant, not a migration's. They are load-bearing for the WRITING
--      role, not just for callers: members.name_normalized is GENERATED from normalize_name
--      (0006), and member_alias_normalize() is a SECURITY INVOKER trigger that calls both
--      (0011). PostgreSQL checks EXECUTE against the role doing the write in both places, so
--      on a project built after 30-Oct an authenticated insert or a name change through the
--      Data API fails with "permission denied for function normalize_name".
--
--   2. The project's own pg_default_acl entry (postgres, public) still hands service_role
--      everything on new tables and functions, and hands anon, authenticated AND
--      service_role rwU on every new sequence. So until the platform flips, a new object
--      here gets one set of grants, and after it, another -- and a fresh project gets a third.
--
--   3. The four identity sequences (audit_logs, audit_remarks, email_events,
--      mobile_number_changes) carry USAGE, SELECT and UPDATE for anon and authenticated --
--      the sequence default in 2 doing its work. An identity column needs no privilege on its
--      own sequence to fill itself in, so none of these is used. They are not reachable
--      through PostgREST or GraphQL either (neither exposes nextval/setval), so this is
--      least-privilege, not a live exposure. A fresh project never has them.
--
-- WHAT THIS DOES.
--   1. States the two helper grants (a no-op on production, where they already exist).
--   2. Sets this project's defaults for new TABLES and SEQUENCES to what the platform's will
--      be, now: nothing, for anon, authenticated and service_role. A new table or sequence then
--      gets the same grants before 30-Oct, after it, and on a fresh project, and every
--      migration from here grants what it means to grant, to service_role included.
--   3. Revokes the sequence privileges anon and authenticated never use.
--
-- WHAT IT DELIBERATELY DOES NOT DO.
--   * Re-grant every table to service_role. 0002-0010 and every later table migration already
--     grant service_role explicitly; a fresh replay under the new defaults gives every one of
--     the 34 tables exactly the privileges production has (harness, 21-Oct-2026).
--   * Touch the 12 trigger functions that hold service_role EXECUTE only by default. The trigger
--     mechanism does not check EXECUTE to fire one (0069), so nothing needs it.
--   * Touch audit_redact, week_bounds, email_log, reinstate_member_email,
--     staff_resubscribe_member_email or member_email_opt_out_before, whose remaining default
--     grants (authenticated and/or service_role) no caller uses: each is called only from a
--     SECURITY DEFINER function or not by that role at all. Granting them on a fresh project
--     would be granting for parity's sake, and revoking them on production is a change of its
--     own -- both recorded in T-145, neither made here.
--   * Take service_role out of the default for new FUNCTIONS. That is the platform's
--      direction, but this project's entry ('{service_role=X/postgres}', RC-042) is an
--      owner-approved state that supabase/tests/19_trigger_function_grants.sql pins, and specs
--      are append-only (CLAUDE.md). So 0097 STATES that entry instead of inheriting it: a new
--      function gets EXECUTE for service_role -- and only service_role -- on this project and on
--      one created after 30-Oct alike. Dropping it is an owner decision (T-145). Nothing the app
--      calls depends on it either way: every RPC an Edge Function calls is granted to
--      service_role by name, and src/data/dataApiGrants.test.ts fails the build if a new one is
--      not.
--   * Change any RLS policy, any anon privilege on a table or function (there are none), or
--     the supabase_admin default entries, which the platform owns.
--
-- PRODUCTION SAFETY. No table, column, index, constraint, row or policy is touched, so nothing
-- here scans or depends on existing data. Grants and ALTER DEFAULT PRIVILEGES take only brief
-- catalog locks. Every object named is owned by postgres on production (verified 21-Oct-2026),
-- which is the role both this file and the default entry it edits belong to. Re-runnable.

-- ── 1. the helpers the writing role evaluates ───────────────────────────────────────────────
-- authenticated: the generated column and the alias trigger above, on direct Data API writes.
-- service_role: the same two paths, for csv-import and the other Edge Functions' writes.
-- anon stays without them (0069).
grant execute on function public.normalize_name(text)  to authenticated, service_role;
grant execute on function public.normalize_email(text) to authenticated, service_role;

-- ── 2. new tables and sequences start empty, for every role, on every platform ──────────────
-- Scoped to the postgres entry for public, as 0015 and 0069 are: postgres is the role
-- migrations run as here and on Supabase, so it is the entry that governs their objects.
-- anon and authenticated are already out of the table default (0015); naming them again
-- makes this one statement the whole of the rule.
alter default privileges for role postgres in schema public revoke all on tables    from anon, authenticated, service_role;
alter default privileges for role postgres in schema public revoke all on sequences from anon, authenticated, service_role;
-- Functions: anon and authenticated are already out (0069). This states the service_role half
-- of the entry production has, so the platform's change cannot alter it (header, and spec 19).
alter default privileges for role postgres in schema public grant execute on functions to service_role;
--
-- NOT HERE, ON PURPOSE: `... in schema public revoke execute on functions from public`, which
-- Supabase's opt-in SQL includes. A per-schema entry is ADDED to the global default, never
-- subtracted from it (PostgreSQL docs, ALTER DEFAULT PRIVILEGES), and the global default is
-- PostgreSQL's own: EXECUTE to PUBLIC on every new function. So that statement is a no-op --
-- measured in the harness, where a new function still came out {=X/postgres,...} with it --
-- and writing it would read as a guarantee it does not give. Only a GLOBAL entry removes it,
-- and that would reach every function postgres creates in any schema, extension installs
-- included; not this migration's to change. The defence that does work is the one every
-- function here already has: an explicit `revoke ... from public, anon` in its own migration,
-- which src/data/dataApiGrants.test.ts now requires and spec 74 proves at runtime.

-- ── 3. the identity sequences, closed to the client roles ───────────────────────────────────
-- service_role keeps what it has: it is the trusted server role and nothing is gained by
-- churning it.
revoke all on sequence public.audit_logs_id_seq,
                       public.audit_remarks_id_seq,
                       public.email_events_id_seq,
                       public.mobile_number_changes_id_seq from anon, authenticated;
