\echo 'member code: nothing assigns one, and the column no longer demands one'
--
-- 0026 retired the member code. Three things have to be true together, and
-- any one of them alone is not enough:
--
--   1. the COLUMN no longer demands a value -- otherwise a code-less insert
--      is refused by the schema rather than simply not happening;
--   2. create_member does not mint one -- the Add Member form path;
--   3. commit_csv_import does not mint one either -- the add_as_new path,
--      which is the OTHER place a member is born, and the one that is easy
--      to forget because it lives inside a 200-line function.
--
-- The historical codes are not asserted away. A member who already carries
-- RF-000118 keeps it; that is the point of leaving the column standing.

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-1111-0000-0000-000000000001',
            'eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00'
      from public.courses c, public.branches b where c.name='Prenatal Flow';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select id, '2026-01-01', array[1,3,5]::smallint[] from public.course_offerings;
commit;

-- ------------------------------------------------------------- the column
select t.eq((select is_nullable from information_schema.columns
              where table_schema='public' and table_name='members'
                and column_name='member_code'), 'YES',
  'members.member_code no longer demands a value');

-- A plain insert naming no code at all is accepted. Without this the two
-- functions below could only pass by minting something.
begin;
  insert into public.members (full_name) values ('Codeless Direct');
  select t.ok((select member_code from public.members where full_name='Codeless Direct') is null,
    'a member can be written with no code whatsoever');
rollback;

-- The uniqueness rule went with it. It asserted something this app no longer
-- maintains, and an index nobody maintains is a claim nobody checks.
select t.ok(not exists (select 1 from pg_indexes
             where schemaname='public' and indexname='members_code_live'),
  'members_code_live is gone -- there is no code-uniqueness rule left to keep');

-- --------------------------------------------------------- create_member
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';

  select public.create_member(
    'Anitha Rajesh',
    (select id from public.course_offerings),
    current_date - 30,
    array['Anitha R']::text[],
    array['anitha@gmail.com']::text[],
    null);
commit;

select t.eq((select count(*)::int from public.members where full_name='Anitha Rajesh'), 1,
  'she is still added -- retiring the code did not break the form path');
select t.ok((select member_code from public.members where full_name='Anitha Rajesh') is null,
  'create_member assigns NO member code');

-- The RPC used to hand the code back for the confirmation toast. It must not
-- hand back a key whose value the caller would print as "undefined".
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select t.ok(not jsonb_exists(public.create_member(
      'Second Member', (select id from public.course_offerings),
      current_date - 10, '{}'::text[], '{}'::text[], null), 'member_code'),
    'the returned object carries no member_code key at all');
rollback;

-- ----------------------------------------------------- commit_csv_import
-- The add_as_new branch: a name in the file that matches nobody becomes a
-- member. That is the second birth path, and it minted codes too.
begin;
  insert into public.csv_imports
    (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
  select 'meet.csv', 'sha-no-code', o.id, current_date - 2, 1, 'previewed',
         jsonb_build_object('rows', jsonb_build_array(
           jsonb_build_object('row', 1, 'kind', 'unmatched',
                              'raw_name', 'Brand New Person', 'minutes', 42,
                              'candidates', '[]'::jsonb))),
         'eeeeeeee-1111-0000-0000-000000000001'
    from public.course_offerings o;
commit;

begin;
  set local role service_role;
  select public.commit_csv_import(
    (select id from public.csv_imports where file_sha256='sha-no-code'),
    'eeeeeeee-1111-0000-0000-000000000001',
    jsonb_build_array(jsonb_build_object('row', 1, 'action', 'add_as_new')));
commit;

select t.eq((select count(*)::int from public.members where full_name='Brand New Person'), 1,
  'the import still creates the member it could not match');
select t.ok((select member_code from public.members where full_name='Brand New Person') is null,
  'commit_csv_import assigns NO member code either');

-- ---------------------------------------------------------- the sequence
-- Left standing on purpose (0026): dropping it would reset the counter, and
-- a revived scheme re-minting a code a former member already carries is
-- worse than a dead sequence. Nobody may turn it, though.
select t.ok(exists (select 1 from pg_class where relname='member_code_seq' and relkind='S'),
  'member_code_seq still exists -- the old codes stay unrepeatable');
select t.ok(not has_sequence_privilege('authenticated', 'public.member_code_seq', 'USAGE')
        and not has_sequence_privilege('anon', 'public.member_code_seq', 'USAGE')
        and not has_sequence_privilege('service_role', 'public.member_code_seq', 'USAGE'),
  'no app role may turn it -- there is no direct path to another code');
