-- 0079 · every RLS policy evaluates its helpers once per statement, not per row (T-043)
--
-- WHAT WAS WRONG
--   Every policy in public called its helpers bare -- is_active_app_user(),
--   is_super_admin(), is_subscription_writable(), current_app_user_id().
--   They take no argument and return the same value for every row of a
--   statement, but a bare call in USING / WITH CHECK is evaluated per row,
--   and each one is SECURITY DEFINER over a scan of app_users. Measured in
--   production on 24-Sep-2026 (RUN_app-feels-slow.md):
--     1,000-row member_stats read   158 ms as written, 1.3 ms with the check hoisted
--     course_week_day_status RPC    403 ms under RLS, 13.5 ms without
--     app_users                     18.9 M sequential scans for 11 rows
--   0013 wrapped auth.uid() in the two policies that call it directly and
--   never generalised to the helpers. The auth_rls_initplan advisor follows
--   auth.* only, so it reported 0 findings throughout (T-118).
--
-- WHAT THIS DOES
--   ALTER POLICY on all 62 policies. Each call is wrapped as
--   (select public.f()), which the planner runs once as an InitPlan. Nothing
--   else in any expression changes: the same operators, the same columns, the
--   same literals, the same roles and commands (ALTER POLICY leaves roles and
--   command as they are when TO is not given). The statements were generated
--   from the catalogue of a harness whose 62 policies fingerprint identically
--   to production's (md5 4d21e86e7ef52d535c6e38167cb4a63d, read 24-Sep-2026).
--
-- PROOF -- supabase/tests/58_rls_rules_by_role.sql
--   first assertion   no bare zero-argument call in any policy: fails naming
--                     62 of 62 without this file, passes at 0 with it. (T-043's
--                     Proof named 09_grants.sql; that file halts at a
--                     pre-existing grants failure before its end, so the
--                     assertion lives where it runs.)
--   the rest          who sees and writes what, per role: passes before this
--                     file AND after it
--
-- The guard below refuses to run against a catalogue that has drifted from the
-- one these statements were generated from. FORWARD HAZARD: because the guard
-- pins the catalogue, no migration numbered BELOW 0079 may ever create, drop
-- or alter a policy -- a replay would stop here. Number any such change above
-- 0079. The $verify$ block re-proves equivalence at apply time, in production
-- as in the harness. No begin/commit of its own, like
-- every other migration here: the runner owns the transaction, and a COMMIT
-- inside a runner-wrapped migration would end it before the ledger row.

-- ALTER POLICY takes an ACCESS EXCLUSIVE lock per table. Bounded here so an
-- apply that meets a long read gives up in 5 s -- retry it -- instead of
-- queueing every app query behind it until authenticator's 8 s lock_timeout
-- fails them (T-005). Session-level SET, so it holds whether or not the runner
-- wraps this file in a transaction.
set lock_timeout = '5s';

-- The pre-image, kept so $verify$ can prove equivalence at apply time.
create temp table t0079_before as
  select tablename::text, policyname::text, cmd, permissive, roles::text as roles,
         coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
    from pg_policies where schemaname = 'public';

do $guard$
declare fp text; n int;
begin
  select count(*), md5(string_agg(tablename||'|'||policyname||'|'||cmd||'|'||permissive||'|'||roles::text||'|'||coalesce(qual,'')||'|'||coalesce(with_check,''), E'\n' order by tablename, policyname))
    into n, fp from pg_policies where schemaname = 'public';
  if fp is distinct from '4d21e86e7ef52d535c6e38167cb4a63d' then
    raise exception '0079: public has % policies with fingerprint %, not the 62 (4d21e86e...) these statements were generated from -- regenerate, do not apply', n, fp;
  end if;
end $guard$;

alter policy app_settings_read on public.app_settings
  using ((select public.is_active_app_user()));
alter policy app_settings_write on public.app_settings
  using (((select public.is_super_admin()) AND (select public.is_subscription_writable())))
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy app_subscription_read on public.app_subscription
  using ((select public.is_active_app_user()));
alter policy app_users_read on public.app_users
  using (((select public.is_super_admin()) OR (auth_user_id = (select auth.uid()))));
alter policy app_users_self_update on public.app_users
  using ((((select public.is_super_admin()) OR (auth_user_id = (select auth.uid()))) AND (select public.is_subscription_writable())))
  with check (((select public.is_super_admin()) OR (auth_user_id = (select auth.uid()))));
alter policy attendance_read on public.attendance_records
  using ((select public.is_active_app_user()));
alter policy audit_logs_read on public.audit_logs
  using ((select public.is_super_admin()));
alter policy audit_remarks_read on public.audit_remarks
  using ((select public.is_super_admin()));
alter policy audit_remarks_write on public.audit_remarks
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable()) AND (author_app_user_id = (select public.current_app_user_id()))));
alter policy branches_insert on public.branches
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy branches_read on public.branches
  using ((select public.is_active_app_user()));
alter policy branches_update on public.branches
  using (((select public.is_super_admin()) AND (select public.is_subscription_writable())))
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy course_comm_insert on public.course_communication
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy course_comm_read on public.course_communication
  using ((select public.is_active_app_user()));
alter policy course_comm_update on public.course_communication
  using (((select public.is_super_admin()) AND (select public.is_subscription_writable())))
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy cfuc_insert on public.course_follow_up_config
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy cfuc_read on public.course_follow_up_config
  using ((select public.is_active_app_user()));
alter policy cfuc_update on public.course_follow_up_config
  using (((select public.is_super_admin()) AND (select public.is_subscription_writable())))
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy course_offerings_insert on public.course_offerings
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy course_offerings_read on public.course_offerings
  using ((select public.is_active_app_user()));
alter policy course_offerings_update on public.course_offerings
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())))
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy courses_insert on public.courses
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy courses_read on public.courses
  using ((select public.is_active_app_user()));
alter policy courses_update on public.courses
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())))
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy csv_imports_insert on public.csv_imports
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable()) AND (status = 'previewed'::text)));
alter policy csv_imports_read on public.csv_imports
  using ((select public.is_active_app_user()));
alter policy batches_read on public.email_batches
  using ((select public.is_active_app_user()));
alter policy events_read on public.email_events
  using ((select public.is_super_admin()));
alter policy messages_read on public.email_messages
  using ((select public.is_active_app_user()));
alter policy tmpl_insert on public.email_templates
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy tmpl_read on public.email_templates
  using ((select public.is_active_app_user()));
alter policy tmpl_update on public.email_templates
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())))
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy fuc_read on public.follow_up_config
  using ((select public.is_active_app_user()));
alter policy fuc_write on public.follow_up_config
  using (((select public.is_super_admin()) AND (select public.is_subscription_writable())))
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy holidays_delete on public.holidays
  using (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy holidays_insert on public.holidays
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy holidays_read on public.holidays
  using ((select public.is_active_app_user()));
alter policy holidays_update on public.holidays
  using (((select public.is_super_admin()) AND (select public.is_subscription_writable())))
  with check (((select public.is_super_admin()) AND (select public.is_subscription_writable())));
alter policy member_aliases_delete on public.member_aliases
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy member_aliases_insert on public.member_aliases
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy member_aliases_read on public.member_aliases
  using ((select public.is_active_app_user()));
alter policy member_aliases_update on public.member_aliases
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())))
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy member_emails_insert on public.member_emails
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy member_emails_read on public.member_emails
  using ((select public.is_active_app_user()));
alter policy member_emails_update on public.member_emails
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())))
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy member_enrollments_read on public.member_enrollments
  using ((select public.is_active_app_user()));
alter policy member_import_runs_read on public.member_import_runs
  using ((select public.is_super_admin()));
alter policy member_schedules_read on public.member_schedules
  using ((select public.is_active_app_user()));
alter policy member_stats_read on public.member_stats
  using ((select public.is_active_app_user()));
alter policy members_insert on public.members
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy members_read on public.members
  using ((select public.is_active_app_user()));
alter policy members_update on public.members
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())))
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy mobile_changes_read on public.mobile_number_changes
  using (((select public.is_super_admin()) OR (app_user_id = (select public.current_app_user_id()))));
alter policy offering_schedules_read on public.offering_schedules
  using ((select public.is_active_app_user()));
alter policy pin_reset_requests_read on public.pin_reset_requests
  using ((select public.is_super_admin()));
alter policy security_questions_read on public.security_questions
  using ((select public.is_super_admin()));
alter policy session_expectations_read on public.session_expectations
  using ((select public.is_active_app_user()));
alter policy sessions_read on public.sessions
  using ((select public.is_active_app_user()));
alter policy sessions_status_update on public.sessions
  using (((select public.is_active_app_user()) AND (select public.is_subscription_writable())))
  with check (((select public.is_active_app_user()) AND (select public.is_subscription_writable())));
alter policy user_preferences_self_insert on public.user_preferences
  with check ((app_user_id = (select public.current_app_user_id())));
alter policy user_preferences_self_read on public.user_preferences
  using ((app_user_id = (select public.current_app_user_id())));
alter policy user_preferences_self_update on public.user_preferences
  using ((app_user_id = (select public.current_app_user_id())))
  with check ((app_user_id = (select public.current_app_user_id())));

do $verify$
declare bare text; n int;
begin
  select count(*) into n from pg_policies where schemaname = 'public';
  if n <> 62 then raise exception '0079: expected 62 policies after, found %', n; end if;
  select string_agg(format('%s.%s', tablename, policyname), ', ') into bare
    from pg_policies
   where schemaname = 'public'
     and regexp_replace(coalesce(qual, '') || ' ' || coalesce(with_check, ''),
           '\(\s*SELECT\s+(\w+\.)?\w+\(\)\s+AS\s+\w+\)', '', 'gi')
         ~* '\m(\w+\.)?\w+\(\)';
  if bare is not null then raise exception '0079: bare helper call still in %', bare; end if;

  -- EQUIVALENCE: un-wrap every "( SELECT f() AS f)" back to "f()" and the
  -- result must equal the pre-image exactly -- same policies, commands,
  -- permissive flag, roles and predicates. auth.uid() was wrapped before
  -- and is left wrapped, so it is only un-wrapped where it was bare.
  select string_agg(format('%s.%s', a.tablename, a.policyname), ', ') into bare
    from (select * from pg_policies where schemaname = 'public') a
    full join t0079_before b on b.tablename = a.tablename::text and b.policyname = a.policyname::text
   where (b.tablename is null or a.tablename is null
      or a.cmd <> b.cmd or a.permissive <> b.permissive or a.roles::text <> b.roles
      or regexp_replace(coalesce(a.qual, ''), '\( SELECT (public\.)?(is_active_app_user|is_super_admin|is_subscription_writable|current_app_user_id)\(\) AS \w+\)', '\2()', 'g') <> b.qual
      or regexp_replace(coalesce(a.with_check, ''), '\( SELECT (public\.)?(is_active_app_user|is_super_admin|is_subscription_writable|current_app_user_id)\(\) AS \w+\)', '\2()', 'g') <> b.with_check);
  if bare is not null then raise exception '0079: a policy is not equivalent to its pre-image: %', bare; end if;
end $verify$;

drop table t0079_before;
reset lock_timeout;
