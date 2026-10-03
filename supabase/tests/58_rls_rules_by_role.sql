\echo 'RLS (T-043): helpers run once per statement, and who sees and writes what is unchanged'
--
-- WHAT THIS PINS -- ONE ASSERTION THAT FAILS BEFORE T-043, AND THE REST
-- WRITTEN TO PASS BOTH BEFORE AND AFTER IT
--   The first assertion is T-043 itself: no policy calls a helper bare.
--   Everything after it is the guarantee that the fix changed nothing else.
--   T-043 changes HOW the policy helpers are evaluated (once per statement,
--   as an InitPlan, instead of once per row). It must not change WHAT any
--   role may see or write. This file is that guarantee, stated as behaviour:
--   it was run against the tree before the T-043 migration and passed, and
--   runs after it unchanged. A rewrite that altered a single predicate --
--   dropped a clause, swapped a helper, lost an OR -- changes a count below.
--
--   Visibility is swept generically: every table in public that holds a row
--   is read as each persona, and the count is held to the class its read
--   policy puts it in. A table added later with rows and no class here fails
--   the "every seeded table is classified" assertion rather than passing
--   unexamined. Coverage is what is exercised here and no more: the anon
--   persona is refused by table GRANTS before any policy runs, so its -1 is a
--   grants probe; tables left empty by this fixture (email_events,
--   audit_remarks reads, and every table the engine alone writes) are covered
--   by the text equivalence recorded for 0079 in TEST_SUMMARY.md, not here.


-- ------------------------------------ T-043: every policy helper runs ONCE
-- A zero-argument function in a policy (is_active_app_user(),
-- is_super_admin(), is_subscription_writable(), current_app_user_id(),
-- auth.uid()) returns the same value for every row of a statement. Called
-- bare, Postgres still evaluates it per row: 158 ms against 1.3 ms for a
-- 1,000-row read in production (RUN_app-feels-slow.md). Wrapped in
-- `( select f() )` it becomes an InitPlan and runs once.
--
-- This walks the catalogue, not a lint: Supabase's auth_rls_initplan
-- advisor follows auth.* only and reported 0 findings with the defect fully
-- present (T-118). Any bare zero-argument call left after stripping the
-- wrapped ones names its policy in the failure. It is the FIRST assertion in
-- this file so no fixture failure can stop it running; T-043's Proof named
-- 09_grants.sql, which halts at a pre-existing grants failure before its end.
select t.eq(coalesce((
  select string_agg(format('%s.%s', p.tablename, p.policyname), ', ' order by p.tablename, p.policyname)
    from pg_policies p
   where p.schemaname = 'public'
     and regexp_replace(coalesce(p.qual, '') || ' ' || coalesce(p.with_check, ''),
           '\(\s*SELECT\s+(\w+\.)?\w+\(\)\s+AS\s+\w+\)', '', 'gi')
         ~* '\m(\w+\.)?\w+\(\)'), ''),
  '', 'no policy calls a helper bare -- each is wrapped in (select ...) and runs once per statement');
-- ...and not vacuously: with no policies at all the assertion above passes.
select t.eq((select count(*)::int from pg_policies where schemaname = 'public'), 62,
  'public still carries all 62 policies -- the check above has something to check');

-- ---------------------------------------------------------- the fixture
begin;
  insert into auth.users (id) values
    ('ffffffff-0000-0000-0000-000000000581'),   -- super admin
    ('ffffffff-0000-0000-0000-000000000582'),   -- active staff
    ('ffffffff-0000-0000-0000-000000000583');   -- disabled staff
  insert into public.app_users (auth_user_id, kind, name, phone_e164, is_active) values
    ('ffffffff-0000-0000-0000-000000000581','super_admin','Owner 58','+919994871158', true),
    ('ffffffff-0000-0000-0000-000000000582','staff','Staff 58','+919940633858', true),
    ('ffffffff-0000-0000-0000-000000000583','staff','Disabled 58','+919940633859', false);
  insert into public.branches (name, code, city) values ('Adyar 58','AD58','Chennai');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Course 58','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b
     where c.name = 'Course 58' and b.code = 'AD58';
  insert into public.members (full_name) values ('Member Fifty Eight');
  insert into public.member_emails (member_id, email)
    select id, 'm58@example.com' from public.members where full_name = 'Member Fifty Eight';
  insert into public.member_aliases (member_id, alias_type, alias_display, alias_normalized)
    select id, 'name', 'Member 58', 'member 58' from public.members where full_name = 'Member Fifty Eight';
  -- One preference row, the STAFF account's own: the self-only policy is
  -- visible to exactly one persona, which is what makes it a real probe.
  insert into public.user_preferences (app_user_id)
    select id from public.app_users where name = 'Staff 58';
  -- Two number changes, one per account, so admin_or_self is a real probe:
  -- the owner must see both, staff exactly its own one.
  insert into public.mobile_number_changes (app_user_id, previous_phone_e164, new_phone_e164, initiated_by)
    select id, '+919940633858', '+919940633860', id from public.app_users where name = 'Staff 58';
  insert into public.mobile_number_changes (app_user_id, previous_phone_e164, new_phone_e164, initiated_by)
    select id, '+919994871158', '+919994871160', id from public.app_users where name = 'Owner 58';
  insert into public.pin_reset_requests (app_user_id)
    select id from public.app_users where name = 'Staff 58';
  insert into public.holidays (name, start_date, end_date) values ('Holiday 58', '2026-12-25', '2026-12-25');
commit;

-- ----------------------------------------------------- the visibility sweep
-- class: which read policy the table has.
--   active -> is_active_app_user(): owner and staff see every row, the
--             disabled account sees none
--   admin  -> is_super_admin(): only the owner sees rows
--   users  -> app_users_read: the owner sees all; anyone else sees only their own row
--   self   -> current_app_user_id() = app_user_id: only the account the row
--             belongs to, and only while that account is active
--   admin_or_self -> is_super_admin() OR app_user_id = current_app_user_id():
--             the owner sees all; staff sees its own rows; disabled sees none
create temp table rls58_class(tbl text primary key, cls text) on commit preserve rows;
insert into rls58_class values
  ('app_settings','active'), ('app_subscription','active'), ('branches','active'),
  ('courses','active'), ('course_offerings','active'), ('email_templates','active'),
  ('follow_up_config','active'), ('members','active'), ('member_emails','active'),
  ('member_aliases','active'), ('member_stats','active'), ('member_enrollments','active'),
  ('member_schedules','active'), ('offering_schedules','active'), ('sessions','active'),
  ('attendance_records','active'), ('course_follow_up_config','active'),
  ('course_communication','active'), ('csv_imports','active'), ('email_batches','active'),
  ('email_messages','active'), ('holidays','active'), ('session_expectations','active'),
  ('audit_logs','admin'), ('audit_remarks','admin'), ('email_events','admin'),
  ('member_import_runs','admin'), ('security_questions','admin'),
  ('pin_reset_requests','admin'),
  ('app_users','users'),
  ('user_preferences','self'), ('mobile_number_changes','admin_or_self');

create temp table rls58_seen(tbl text, persona text, n int) on commit preserve rows;


do $$
declare
  r record; p record; v int; total int;
begin
  for r in select c.relname::text as tbl from pg_class c
             join pg_namespace n on n.oid = c.relnamespace
            where n.nspname = 'public' and c.relkind = 'r' loop
    execute format('select count(*)::int from public.%I', r.tbl) into total;
    continue when total = 0;
    insert into rls58_seen values (r.tbl, 'all', total);
    for p in select * from (values
        ('owner',    'authenticated', 'ffffffff-0000-0000-0000-000000000581'),
        ('staff',    'authenticated', 'ffffffff-0000-0000-0000-000000000582'),
        ('disabled', 'authenticated', 'ffffffff-0000-0000-0000-000000000583'),
        ('anon',     'anon',          '')) as x(persona, rol, sub) loop
      perform set_config('request.jwt.claim.sub', p.sub, true);
      execute format('set local role %I', p.rol);
      begin
        execute format('select count(*)::int from public.%I', r.tbl) into v;
      exception when insufficient_privilege then
        v := -1;   -- refused before any policy: no table grant, or no execute on a helper
      end;
      reset role;
      insert into rls58_seen values (r.tbl, p.persona, v);
    end loop;
  end loop;
end $$;

select t.eq(
  (select count(distinct s.tbl)::int from rls58_seen s where s.persona = 'all'
      and s.tbl not in (select tbl from rls58_class)),
  0, 'every table that holds a row is classified -- nothing passes unexamined');

select t.ok(
  (select count(distinct s.tbl) from rls58_seen s where s.persona = 'all') >= 17,
  'the sweep is not vacuous: at least 17 tables hold a row');
select t.eq((select count(*)::int from rls58_seen
              where tbl in ('mobile_number_changes','pin_reset_requests','holidays') and persona = 'all'), 3,
  'the shapes that are empty by default -- admin-or-self, admin-only, delete -- are seeded');

select t.eq(coalesce((
  select string_agg(format('%s/%s saw %s want %s', s.tbl, s.persona, s.n, w.want), '; ' order by s.tbl, s.persona)
    from rls58_seen s
    join rls58_class c on c.tbl = s.tbl
    join rls58_seen a on a.tbl = s.tbl and a.persona = 'all'
    cross join lateral (select case
        when s.persona = 'anon' then -1
        when c.cls = 'active' then case when s.persona in ('owner','staff') then a.n else 0 end
        when c.cls = 'admin'  then case when s.persona = 'owner' then a.n else 0 end
        when c.cls = 'users'  then case when s.persona = 'owner' then a.n else 1 end
        when c.cls = 'self'   then case when s.persona = 'staff' and s.tbl = 'user_preferences' then 1 else 0 end
        when c.cls = 'admin_or_self' then case when s.persona = 'owner' then a.n
                                               when s.persona = 'staff' then 1 else 0 end
      end as want) w
   where s.persona <> 'all' and s.n <> w.want), ''),
  '', 'each persona sees exactly what its class allows, table by table');

-- ------------------------------------------------------------- the writes
-- Row counts, not errors: an UPDATE that RLS filters touches 0 rows silently,
-- so "it did not raise" proves nothing. The count is the claim.
create temp table rls58_w(label text, n int) on commit preserve rows;
grant all on rls58_w to authenticated;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000582';
  with u as (update public.members set full_name = 'Member Fifty Eight' returning 1)
    insert into rls58_w select 'staff updates a member', count(*) from u;
  with u as (update public.app_settings set updated_at = updated_at returning 1)
    insert into rls58_w select 'staff updates app settings', count(*) from u;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000583';
  with u as (update public.members set full_name = 'Member Fifty Eight' returning 1)
    insert into rls58_w select 'disabled updates a member', count(*) from u;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000581';
  with u as (update public.app_settings set updated_at = updated_at returning 1)
    insert into rls58_w select 'owner updates app settings', count(*) from u;
commit;

select t.eq((select n from rls58_w where label = 'staff updates a member'), 1,
  'an active staff account updates a member');
select t.eq((select n from rls58_w where label = 'disabled updates a member'), 0,
  'a disabled account updates nothing');
select t.eq((select n from rls58_w where label = 'staff updates app settings'), 0,
  'staff cannot update app settings -- owner only');
select t.eq((select n from rls58_w where label = 'owner updates app settings'), 1,
  'the owner updates app settings');

-- WITH CHECK, as each role. The owner's id is read HERE, as postgres: under
-- staff RLS the owner's app_users row is invisible, so a sub-select inside
-- the insert would insert nothing and "pass" without testing the policy.
select id as owner58 from public.app_users where name = 'Owner 58' \gset
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000582';
  select t.rejects($q$insert into public.branches (name, code) values ('Staff Branch','SB58')$q$,
    'staff cannot add a branch -- owner only', 'row-level security');
  select t.rejects(format('insert into public.user_preferences (app_user_id) values (%L)', :'owner58'),
    'staff cannot write another account''s preferences', 'row-level security');
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000581';
  insert into public.branches (name, code) values ('Owner Branch','OB58');
  select t.eq((select count(*)::int from public.branches where code = 'OB58'), 1,
    'the owner adds a branch');
rollback;

-- ------------------------------------------- a lapsed subscription stops writes
update public.app_subscription set status = 'suspended' where id = 1;
create temp table rls58_s(label text, n int) on commit preserve rows;
grant all on rls58_s to authenticated;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000582';
  with u as (update public.members set full_name = 'Member Fifty Eight' returning 1)
    insert into rls58_s select 'staff, suspended', count(*) from u;
commit;
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000581';
  with u as (update public.app_settings set updated_at = updated_at returning 1)
    insert into rls58_s select 'owner, suspended', count(*) from u;
  select t.eq((select count(*)::int from public.members), 1,
    'a suspended subscription still reads -- only writes stop');
commit;

select t.eq((select n from rls58_s where label = 'staff, suspended'), 0,
  'suspended: staff updates no member');
select t.eq((select n from rls58_s where label = 'owner, suspended'), 0,
  'suspended: the owner updates no setting either');

-- ------------------------------------ every other write shape, by role
-- The policies above are not the only shapes: DELETE, a self-update on
-- app_users, and an insert that checks its own author column. Each is probed
-- as the role it admits AND a role it refuses. Subscription restored first.
update public.app_subscription set status = 'active' where id = 1;
select id as staff58 from public.app_users where name = 'Staff 58' \gset
-- Read as postgres: audit_logs is owner-only, so under staff RLS a sub-select
-- for its id finds nothing and an insert of zero rows would "pass".
select id as log58 from public.audit_logs order by id limit 1 \gset
create temp table rls58_x(label text, n int) on commit preserve rows;
grant all on rls58_x to authenticated;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000582';
  with u as (update public.app_users set name = 'Staff Fifty Eight' where name = 'Staff 58' returning 1)
    insert into rls58_x select 'staff renames itself', count(*) from u;
  with u as (update public.app_users set name = 'Owner Renamed' where name = 'Owner 58' returning 1)
    insert into rls58_x select 'staff renames the owner', count(*) from u;
  with u as (delete from public.holidays where name = 'Holiday 58' returning 1)
    insert into rls58_x select 'staff deletes a holiday', count(*) from u;
  with u as (update public.course_offerings set end_time = '07:00' returning 1)
    insert into rls58_x select 'staff updates an offering', count(*) from u;
  with u as (insert into public.courses (name, default_start_time, default_end_time, default_frequency)
               values ('Staff Course 58','07:00','08:00',2) returning 1)
    insert into rls58_x select 'staff adds a course', count(*) from u;
  with u as (delete from public.member_aliases where alias_display = 'Member 58' returning 1)
    insert into rls58_x select 'staff deletes an alias', count(*) from u;
  select t.rejects(format('insert into public.audit_remarks (audit_log_id, body) values (%s, %L)', :'log58', 'staff remark'),
    'staff cannot remark on the audit log -- owner only', 'row-level security');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000583';
  with u as (delete from public.member_aliases returning 1)
    insert into rls58_x select 'disabled deletes an alias', count(*) from u;
  with u as (update public.app_users set name = 'Disabled Renamed' where name = 'Disabled 58' returning 1)
    insert into rls58_x select 'disabled renames itself', count(*) from u;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'ffffffff-0000-0000-0000-000000000581';
  with u as (delete from public.holidays where name = 'Holiday 58' returning 1)
    insert into rls58_x select 'owner deletes a holiday', count(*) from u;
  select t.rejects(format('insert into public.audit_remarks (audit_log_id, body, author_app_user_id) values (%s, %L, %L)', :'log58', 'forged', :'staff58'),
    'the owner cannot write a remark in another account''s name', 'row-level security');
  with u as (insert into public.audit_remarks (audit_log_id, body) select id, 'owner remark' from public.audit_logs limit 1 returning 1)
    insert into rls58_x select 'owner remarks as itself', count(*) from u;
commit;

select t.eq((select n from rls58_x where label = 'staff renames itself'), 1, 'staff updates its own app_users row');
select t.eq((select n from rls58_x where label = 'staff renames the owner'), 0, 'staff cannot update the owner''s row');
select t.eq((select n from rls58_x where label = 'disabled renames itself'), 1, 'a disabled account still matches its own app_users row -- that policy asks auth.uid(), not is_active');
select t.eq((select n from rls58_x where label = 'staff deletes a holiday'), 0, 'staff deletes no holiday -- owner only');
select t.eq((select n from rls58_x where label = 'owner deletes a holiday'), 1, 'the owner deletes a holiday');
select t.eq((select n from rls58_x where label = 'staff updates an offering'), 1, 'staff updates a course offering');
select t.eq((select n from rls58_x where label = 'staff adds a course'), 1, 'staff adds a course');
select t.eq((select n from rls58_x where label = 'staff deletes an alias'), 1, 'staff deletes a member alias');
select t.eq((select n from rls58_x where label = 'disabled deletes an alias'), 0, 'a disabled account deletes no alias');
select t.eq((select n from rls58_x where label = 'owner remarks as itself'), 1, 'the owner remarks on an audit entry as itself');
