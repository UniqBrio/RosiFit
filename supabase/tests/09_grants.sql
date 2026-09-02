\echo 'grants: authenticated holds exactly what 0002-0010 asked for; anon holds nothing'
begin;

-- Everything here would have passed vacuously before 000_local_shim.sql
-- reproduced Supabase's default privileges: the harness simply never had the
-- over-grant to take away. It has it now, so these assertions are real.

-- ---------------------------------------------------------------------- anon
select t.eq(
  (select count(*)::int from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon'),
  0, 'anon holds no privilege on any table in public -- user_preferences included');

-- ----------------------------------------------- authenticated, table by table
-- One assertion for all 30 tables: any table whose privileges differ from the
-- creating migration's intent names itself in the failure message.
with intended(tbl, privs) as (values
  ('app_settings','SELECT,UPDATE'),
  ('app_subscription','SELECT'),
  ('app_users','SELECT,UPDATE'),
  ('attendance_records','SELECT'),
  ('audit_logs','SELECT'),
  ('branches','INSERT,SELECT,UPDATE'),
  ('course_follow_up_config','INSERT,SELECT,UPDATE'),
  ('course_offerings','INSERT,SELECT,UPDATE'),
  ('courses','INSERT,SELECT,UPDATE'),
  ('csv_imports','INSERT,SELECT'),
  ('email_batches','SELECT'),
  ('email_events','SELECT'),
  ('email_messages','SELECT'),
  ('email_templates','INSERT,SELECT,UPDATE'),
  ('follow_up_config','SELECT,UPDATE'),
  ('holidays','INSERT,SELECT,UPDATE'),
  ('member_aliases','DELETE,INSERT,SELECT,UPDATE'),
  ('member_emails','INSERT,SELECT,UPDATE'),
  ('member_enrollments','SELECT'),
  ('member_schedules','SELECT'),
  ('member_stats','SELECT'),
  ('members','INSERT,SELECT,UPDATE'),
  ('mobile_number_changes','SELECT'),
  ('offering_schedules','SELECT'),
  ('security_questions','SELECT'),
  ('session_expectations','SELECT'),
  ('sessions','SELECT'),
  ('user_preferences','INSERT,SELECT,UPDATE')
), actual as (
  select table_name::text as tbl,
         string_agg(distinct privilege_type, ',' order by privilege_type) as privs
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee = 'authenticated'
  group by table_name
)
select t.eq(
  coalesce((select string_agg(
              coalesce(i.tbl, a.tbl) || ' want[' || coalesce(i.privs,'none') ||
              '] got[' || coalesce(a.privs,'none') || ']', '; ' order by coalesce(i.tbl, a.tbl))
            from intended i full join actual a on a.tbl = i.tbl
            where coalesce(i.privs,'') is distinct from coalesce(a.privs,'')), ''),
  '', 'authenticated holds exactly the table privileges 0002-0010 intended');

-- ------------------------------------------------- the two credential tables
-- No policy exists on either, so RLS alone would return zero rows -- but a
-- SELECT would still be ACCEPTED. Absent the grant, it is refused outright.
select t.eq(
  (select count(*)::int from information_schema.role_table_grants
     where table_schema='public' and grantee='authenticated'
       and table_name in ('super_admin_recovery','auth_rate_limits')),
  0, 'authenticated cannot so much as attempt to read recovery answers or rate limits');

-- ------------------------------------------------------ sessions, by column
-- The whole point of the migration: status may be changed from the client, the
-- figures may not. A row policy cannot express this -- only the grant can.
select t.eq(
  (select string_agg(column_name, ',' order by column_name)
     from information_schema.column_privileges
    where table_schema='public' and table_name='sessions'
      and grantee='authenticated' and privilege_type='UPDATE'),
  'cancellation_reason,status',
  'authenticated may update ONLY status and cancellation_reason on sessions');

select t.ok(
  not has_column_privilege('authenticated','public.sessions','present_count','UPDATE')
  and not has_column_privilege('authenticated','public.sessions','expected_count','UPDATE')
  and not has_column_privilege('authenticated','public.sessions','session_date','UPDATE')
  and not has_column_privilege('authenticated','public.sessions','deleted_at','UPDATE'),
  'attendance figures, the date and the soft-delete flag are beyond the client');

-- --------------------------------------------------------------- attendance
-- RBAC_MATRIX: "Write attendance -- nobody, through the client." Now true of
-- the grant layer too, not only of RLS.
select t.ok(
  not has_table_privilege('authenticated','public.attendance_records','INSERT')
  and not has_table_privilege('authenticated','public.attendance_records','UPDATE')
  and not has_table_privilege('authenticated','public.attendance_records','DELETE'),
  'attendance is read-only to every client role; it arrives only via csv-import');

-- ------------------------------------------------------------- service_role
select t.ok(
  has_table_privilege('service_role','public.attendance_records','INSERT')
  and has_table_privilege('service_role','public.sessions','UPDATE')
  and has_table_privilege('service_role','public.super_admin_recovery','SELECT'),
  'service_role keeps the reach the Edge Functions need -- they are unaffected');

-- ...and keeps the ONE narrowing 0004 made to it. A blanket re-grant to
-- service_role in a later migration would restore DELETE here and break the
-- append-only guarantee; this fails first if that happens.
select t.ok(
  not has_table_privilege('service_role','public.audit_logs','DELETE')
  and not has_table_privilege('service_role','public.audit_logs','UPDATE')
  and not has_table_privilege('service_role','public.audit_logs','TRUNCATE'),
  'audit_logs stays append-only even for service_role -- 0004 survives 0015');

-- ------------------------------------------------------------- force RLS
select t.eq(
  (select count(*)::int from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relkind='r' and not c.relforcerowsecurity),
  0, 'every table in public forces RLS -- user_preferences no longer the exception');

-- --------------------------------------------------- the class cannot recur
create table public.zz_grant_probe (id int);
select t.eq(
  (select count(*)::int from information_schema.role_table_grants
     where table_schema='public' and table_name='zz_grant_probe'
       and grantee in ('anon','authenticated')),
  0, 'a NEW table starts closed -- the default privilege that caused this is gone');
drop table public.zz_grant_probe;

rollback;
