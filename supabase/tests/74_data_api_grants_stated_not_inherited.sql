\echo 'Data API grants (T-145, 0097): every grant is stated, none is inherited from the platform'
--
-- WHAT THIS PINS
--   From 30-Oct-2026 Supabase stops granting anything automatically on objects
--   newly created in `public`. This file holds the schema to the same result on
--   BOTH platforms the harness can stand in for (db/harness/reset.sh,
--   HARNESS_PLATFORM_DEFAULTS): the one production was created on, and one
--   created after the change. It passes in both modes or it is not proving
--   anything about the second.
--
--   KL-008 still applies: on its own this file is evidence about the harness,
--   not about production. The production read is recorded in the T-145 row.

-- ---------------------------------------------------------- new objects
-- The defaults 0097 sets: a new table or sequence starts with no grant to any
-- Data API role -- service_role included -- on either platform. A new function
-- gets a DIRECT grant to service_role and nobody else, which 0097 STATES rather
-- than inherits (RC-042's entry, pinned by spec 19). It ALSO gets EXECUTE through
-- PUBLIC, on both platforms: that is PostgreSQL's own global default, which no
-- per-schema entry can remove (0097's header). Every function migration revokes
-- it explicitly; the "anon can execute no function" assertion below is the proof.
begin;
  create table public.zz_probe_74 (id int);
  create function public.zz_probe_74_fn() returns int language sql as 'select 1';
  create sequence public.zz_probe_74_seq;

  select t.eq((select count(*)::int from information_schema.role_table_grants
                where table_schema = 'public' and table_name = 'zz_probe_74'
                  and grantee in ('anon','authenticated','service_role')),
    0, 'a new table starts with no grant to anon, authenticated or service_role');
  select t.eq((select coalesce(string_agg(a.grantee::regrole::text, ',' order by a.grantee::regrole::text), '')
                 from pg_proc p, aclexplode(p.proacl) a
                where p.oid = 'public.zz_probe_74_fn()'::regprocedure
                  and a.grantee <> 0 and a.grantee <> p.proowner),
    'service_role', 'a new function is granted directly to service_role and to no client role');
  select t.ok(has_function_privilege('anon', 'public.zz_probe_74_fn()', 'EXECUTE'),
    'and PostgreSQL still hands it to PUBLIC -- which is why every function revokes from public, anon');
  select t.ok(not has_sequence_privilege('anon',          'public.zz_probe_74_seq', 'USAGE,SELECT,UPDATE')
          and not has_sequence_privilege('authenticated', 'public.zz_probe_74_seq', 'USAGE,SELECT,UPDATE')
          and not has_sequence_privilege('service_role',  'public.zz_probe_74_seq', 'USAGE,SELECT,UPDATE'),
    'a new sequence starts with no privilege for any of them');
rollback;

-- ------------------------------------------------------- service_role, table by table
-- What the Edge Functions run as. Every table is reachable for the four Data API
-- verbs, except the two append-only logs, which take INSERT and SELECT only (0004,
-- 0043). This is exactly production's state, read 21-Oct-2026; a fresh replay under
-- the new platform defaults must arrive at it from the migration text alone.
with want(tbl, privs) as (
  select c.relname::text,
         case when c.relname in ('audit_logs','audit_remarks') then 'INSERT,SELECT'
              else 'DELETE,INSERT,SELECT,UPDATE' end
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where n.nspname = 'public' and c.relkind = 'r'
), got as (
  select w.tbl, string_agg(p.priv, ',' order by p.priv) as privs
    from want w cross join (values ('SELECT'),('INSERT'),('UPDATE'),('DELETE')) p(priv)
   where has_table_privilege('service_role', format('public.%I', w.tbl), p.priv)
   group by w.tbl
)
select t.eq(coalesce((
  select string_agg(format('%s want[%s] got[%s]', w.tbl, w.privs, coalesce(g.privs, 'none')), '; ' order by w.tbl)
    from want w left join got g on g.tbl = w.tbl
   where g.privs is distinct from w.privs), ''),
  '', 'service_role holds exactly the table privileges the Edge Functions need, on every table');

select t.eq((select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
              where n.nspname = 'public' and c.relkind = 'r'),
  34, 'and the sweep above is not vacuous: all 34 tables are in it');

-- ------------------------------------------------------- the RPCs the Edge tree calls
-- Every `.rpc('…')` under supabase/functions/, as of 21-Oct-2026. Each one is
-- granted to service_role by name in its migration, so a fresh project keeps it.
select t.eq(coalesce((
  select string_agg(f, ', ' order by f) from unnest(array[
    'public.audit_log(text, text, text, jsonb, jsonb)',
    'public.audit_log_anon(text, text, text, jsonb, jsonb)',
    'public.audit_log_as(uuid, text, text, text, jsonb, jsonb)',
    'public.commit_csv_import(uuid, uuid, jsonb)',
    'public.effective_course_message(uuid)',
    'public.effective_follow_up_config(uuid)',
    'public.email_status_before_opt_out(uuid)',
    'public.member_period_metrics_page(date, date, uuid, integer)']) f
   where not has_function_privilege('service_role', f, 'EXECUTE')), ''),
  '', 'service_role can execute every function the Edge Functions call');

-- ----------------------------------------------------------------- anon
select t.eq((select count(*)::int from information_schema.role_table_grants
              where table_schema = 'public' and grantee = 'anon'),
  0, 'anon holds no privilege on any table');
select t.eq(coalesce((
  select string_agg(p.oid::regprocedure::text, ', ' order by p.oid::regprocedure::text)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and has_function_privilege('anon', p.oid, 'EXECUTE')
     and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')), ''),
  '', 'anon can execute no function in public, directly or through PUBLIC');

-- ------------------------------------------------------------- sequences
select t.eq(coalesce((
  select string_agg(c.relname || '/' || r.rolname, ', ' order by c.relname, r.rolname)
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
         cross join (values ('anon'), ('authenticated')) r(rolname)
   where n.nspname = 'public' and c.relkind = 'S'
     and has_sequence_privilege(r.rolname, c.oid, 'USAGE,SELECT,UPDATE')), ''),
  '', 'no public sequence is usable, readable or settable by anon or authenticated');

-- ------------------------------------------------- the helpers a write evaluates
-- normalize_name fills members.name_normalized (GENERATED, 0006); both helpers run
-- inside member_alias_normalize(), a SECURITY INVOKER trigger (0011). Postgres
-- checks EXECUTE against the writing role in both places.
select t.ok(has_function_privilege('authenticated', 'public.normalize_name(text)',  'EXECUTE')
        and has_function_privilege('authenticated', 'public.normalize_email(text)', 'EXECUTE')
        and has_function_privilege('service_role',  'public.normalize_name(text)',  'EXECUTE')
        and has_function_privilege('service_role',  'public.normalize_email(text)', 'EXECUTE'),
  'authenticated and service_role can run the two helpers their writes evaluate');
select t.ok(not has_function_privilege('anon', 'public.normalize_name(text)',  'EXECUTE')
        and not has_function_privilege('anon', 'public.normalize_email(text)', 'EXECUTE'),
  'and anon still cannot (0069)');

-- ------------------------------------------------------------- the fixture
begin;
  insert into auth.users (id) values
    ('eeeeeeee-0000-0000-0000-000000000741'),   -- super admin
    ('eeeeeeee-0000-0000-0000-000000000742');   -- active staff
  insert into public.app_users (auth_user_id, kind, name, phone_e164, is_active) values
    ('eeeeeeee-0000-0000-0000-000000000741','super_admin','Owner 74','+919994871174', true),
    ('eeeeeeee-0000-0000-0000-000000000742','staff','Staff 74','+919940633874', true);
  insert into public.members (full_name) values ('Member Seventy Four');
  select public.audit_log('probe.74', 'member', 'm74', '{}'::jsonb, '{}'::jsonb);
commit;

-- Row counts, not "it did not raise": RLS filters silently, so the count is the claim.
create temp table dapi74(label text, n int) on commit preserve rows;
grant all on dapi74 to authenticated, service_role;

-- ------------------------------------------- authenticated, through the Data API
-- Each of these is a call the app makes with a signed-in session.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000742';
  -- members.name_normalized is regenerated by this update.
  with u as (update public.members set full_name = 'Member Seventy-Four'
              where full_name = 'Member Seventy Four' returning 1)
    insert into dapi74 select 'staff renames a member', count(*) from u;
  -- member_alias_normalize() fires on this insert.
  with i as (insert into public.member_aliases (member_id, alias_display, source)
               select id, 'Seventy Four', 'member_form' from public.members
                where full_name = 'Member Seventy-Four' returning 1)
    insert into dapi74 select 'staff adds a display name', count(*) from i;
  insert into dapi74 select 'staff reads members', count(*)::int from public.members
    where full_name = 'Member Seventy-Four';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000741';
  -- audit_remarks.id is an identity column. authenticated holds nothing on its
  -- sequence after 0097, and the insert must still number itself.
  with i as (insert into public.audit_remarks (body, audit_log_id)
               select 'checked', id from public.audit_logs where action = 'probe.74' returning 1)
    insert into dapi74 select 'owner adds a remark', count(*) from i;
commit;

select t.eq((select n from dapi74 where label = 'staff renames a member'), 1,
  'a signed-in staff member renames a member -- the generated name column evaluates');
select t.eq((select name_normalized from public.members where full_name = 'Member Seventy-Four'),
  'member seventy four', 'and the normalised name was regenerated, as authenticated');
select t.eq((select n from dapi74 where label = 'staff adds a display name'), 1,
  'a signed-in staff member adds a display name -- the invoker trigger runs its helpers');
select t.eq((select alias_normalized from public.member_aliases where alias_display = 'Seventy Four'),
  'seventy four', 'and the trigger normalised it');
select t.eq((select n from dapi74 where label = 'staff reads members'), 1,
  'and reads the member back through RLS');
select t.eq((select n from dapi74 where label = 'owner adds a remark'), 1,
  'an identity column fills itself in with no sequence grant to the inserting role');

-- ------------------------------------------------- service_role, as the Edge Functions
begin;
  set local role service_role;
  with u as (update public.members set full_name = 'Member 74'
              where full_name = 'Member Seventy-Four' returning 1)
    insert into dapi74 select 'service renames a member', count(*) from u;
  with i as (insert into public.member_aliases (member_id, alias_display, source)
               select id, 'M Seventy Four', 'csv_import' from public.members
                where full_name = 'Member 74' returning 1)
    insert into dapi74 select 'service adds a display name', count(*) from i;
  insert into dapi74 select 'service reads recovery answers', count(*)::int
    from public.super_admin_recovery;
commit;

select t.eq((select n from dapi74 where label = 'service renames a member'), 1,
  'service_role renames a member, as csv-import does');
select t.eq((select n from dapi74 where label = 'service adds a display name'), 1,
  'service_role adds a display name -- the same trigger, as the Edge role');
select t.ok((select n from dapi74 where label = 'service reads recovery answers') is not null,
  'service_role can read the credential tables the anon and authenticated roles never reach');

-- --------------------------------------------------------- refusals still hold
begin;
  set local role anon;
  select t.rejects($q$select count(*) from public.members$q$,
    'anon is refused member data outright, before any policy runs', 'permission denied');
  select t.rejects($q$select public.normalize_name('x')$q$,
    'anon cannot call the helper either', 'permission denied');
rollback;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000742';
  select t.rejects($q$select count(*) from public.super_admin_recovery$q$,
    'authenticated is refused the recovery answers outright', 'permission denied');
  select t.rejects($q$select setval('public.audit_logs_id_seq', 1)$q$,
    'authenticated cannot reset the audit log''s numbering', 'permission denied');
  select t.rejects($q$insert into public.attendance_records (member_id) select id from public.members limit 1$q$,
    'authenticated still cannot write attendance', 'permission denied');
rollback;
