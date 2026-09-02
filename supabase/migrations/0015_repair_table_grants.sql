-- 0015 · the table grants 0002-0010 intended, actually applied.
--
-- Supabase ships DEFAULT PRIVILEGES that grant ALL on every new table in
-- `public` DIRECTLY to anon, authenticated and service_role -- not through the
-- PUBLIC pseudo-role. Every table therefore arrived fully open at CREATE time.
-- 0002-0010 then issued narrow grants on top of that (`grant select`,
-- `grant insert, update`, ...), which added nothing and removed nothing: each
-- of those statements was a no-op. Only their `revoke all ... from anon` lines
-- did any work, which is why `anon` is clean everywhere EXCEPT
-- user_preferences -- 0010 is the one migration with no revoke.
--
-- Live state before this migration: `authenticated` held DELETE, INSERT,
-- SELECT, TRUNCATE, UPDATE on 28 of 30 tables.
--
-- This is the same root cause 0012 fixed for FUNCTIONS. Tables were missed.
--
-- WHAT WAS AND WAS NOT REACHABLE
--
-- RLS denied almost all of it: a write with no permissive policy is refused
-- whatever the grant says. Two things were real:
--
--   1. sessions. 0007 granted `update (status, cancellation_reason)`. The
--      table-wide UPDATE swallowed that column list, and sessions_status_update
--      is a ROW predicate (is_active_app_user() and is_subscription_writable()),
--      not a column one. Any signed-in active staff member could therefore
--      rewrite present_count, expected_count, session_date, offering_id or
--      deleted_at on any session, through PostgREST. That is attendance
--      figures, and it contradicts RBAC_MATRIX's "Write attendance | nobody,
--      through the client".
--
--   2. super_admin_recovery and auth_rate_limits. RLS is on with no policy, so
--      a SELECT returns zero rows -- but it is ACCEPTED, not REJECTED, because
--      the SELECT grant is there. No answer hash ever leaves the database, so
--      nothing leaked; but supabase/tests/01_auth.sql asserts that the
--      statement is REFUSED, and that assertion passed only because the
--      harness did not reproduce Supabase's default privileges. It does now
--      (000_local_shim.sql), so the guarantee is enforced rather than assumed.
--
-- TRUNCATE is not subject to RLS at all. It was never reachable, because
-- PostgREST exposes no TRUNCATE verb and `authenticated` is only ever assumed
-- through PostgREST -- but it is the clearest statement of why the grant layer
-- has to be right rather than merely shadowed by RLS.

-- ---------------------------------------------------------------- the sweep
-- Take everything back, then hand out exactly what each creating migration
-- asked for. Revoke-then-grant, rather than a per-table diff, so the end state
-- is stated in one place and cannot drift from the reading above.
revoke all on all tables in schema public from anon, authenticated;

-- service_role is deliberately NOT re-granted here. The sweep above names only
-- anon and authenticated, so service_role keeps exactly what it already had --
-- which matters, because 0004 revoked UPDATE, DELETE and TRUNCATE on audit_logs
-- from service_role too, to make the append-only guarantee hold even for the
-- Edge Functions. A blanket `grant all ... to service_role` here would quietly
-- hand those back; supabase/tests/04_audit.sql catches it if anyone tries.

-- 0002
grant select         on public.app_settings, public.app_subscription       to authenticated;
grant update         on public.app_settings                                to authenticated;

-- 0003 -- super_admin_recovery and auth_rate_limits are deliberately absent:
-- no policy exists on either, and no role but service_role may reach them.
grant select         on public.app_users, public.security_questions,
                        public.mobile_number_changes                       to authenticated;
grant update         on public.app_users                                   to authenticated;

-- 0004 -- SELECT only. audit_logs is append-only and writes arrive through
-- audit_log(), which is SECURITY DEFINER and needs no grant on the caller.
grant select         on public.audit_logs                                  to authenticated;

-- 0005
grant select         on public.branches, public.courses, public.course_offerings,
                        public.offering_schedules, public.holidays         to authenticated;
grant insert, update on public.branches, public.courses, public.course_offerings,
                        public.holidays                                    to authenticated;

-- 0006
grant select         on public.members, public.member_emails, public.member_aliases,
                        public.member_enrollments, public.member_schedules,
                        public.member_stats                                to authenticated;
grant insert, update on public.members, public.member_emails,
                        public.member_aliases                              to authenticated;
grant delete         on public.member_aliases                              to authenticated;

-- 0007 -- the column list is the point of this migration. A session's status
-- may be changed from the client; its counts and its date may not.
grant select         on public.sessions, public.session_expectations       to authenticated;
grant update (status, cancellation_reason) on public.sessions              to authenticated;

-- 0008 -- attendance is READ-ONLY to every client. It arrives only through
-- csv-import running as service_role.
grant select         on public.attendance_records, public.csv_imports      to authenticated;
grant insert         on public.csv_imports                                 to authenticated;

-- 0009
grant select         on public.follow_up_config, public.course_follow_up_config,
                        public.email_templates, public.email_batches,
                        public.email_messages, public.email_events         to authenticated;
grant update         on public.follow_up_config                            to authenticated;
grant insert, update on public.course_follow_up_config,
                        public.email_templates                             to authenticated;

-- 0010 -- and the revoke 0010 never had. `anon` held ALL on this table alone.
grant select, insert, update on public.user_preferences                    to authenticated;

-- user_preferences is also the only table in the schema without FORCE RLS, so
-- the table owner bypasses its policies where it bypasses no others. Nothing
-- in the app connects as the owner; this removes the inconsistency rather than
-- a live exposure.
alter table public.user_preferences force row level security;

-- ------------------------------------------------------- stop it recurring
-- Without this, the NEXT table created in `public` starts fully open to anon
-- and authenticated and the whole class comes back. Scoped to the pg_default_acl
-- entry owned by `postgres`, which is the role migrations run as -- both here
-- and on Supabase -- and therefore the entry that governs their tables.
-- A future migration now grants what it means to grant, and nothing else.
alter default privileges in schema public revoke all on tables from anon, authenticated;
