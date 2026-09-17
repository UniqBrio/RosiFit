\echo 'alias uniqueness: per member since 0071, and the upserts name the index that says so'
--
-- The defect this closes (0073). 0071 dropped member_aliases_unique, the
-- academy-wide index on (alias_type, alias_normalized), because a duplicate
-- became a duplicate OF A COURSE. commit_csv_import and merge_member_into
-- still said `on conflict (alias_type, alias_normalized)`, and ON CONFLICT
-- infers an INDEX rather than a rule -- so Postgres refused the statement
-- with 42P10 and the whole file with it. Every attendance upload that
-- created a member, or remembered a display name, told the operator that
-- nothing imported.
--
-- These assert the rule that survived 0071 rather than the one it removed:
-- one member cannot hold a display name twice; two members may share one.

begin;
  insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('cccccccc-1111-0000-0000-000000000001',
            'cccccccc-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871159');
  insert into public.branches (name, code, city) values ('Salem','SLM','Salem');
  insert into public.courses (name) values ('Prenatal Yoga');
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-08-01', array[1,2,3,4,5,6]::smallint[] from public.course_offerings o;

  insert into public.members (id, full_name)
    values ('cccccccc-2222-0000-0000-00000000000a','Shazia Farheen'),
           ('cccccccc-2222-0000-0000-00000000000b','Kavitha Ramesh');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01' from public.members m, public.course_offerings o;
commit;

-- ----------------------------------------------------------------- the shape
-- TEST 8: the migration replayed. reset.sh applies every migration in order
-- before this file opens, so reaching this line at all is the replay; what is
-- asserted here is what the replay was FOR.
select t.ok(exists (select 1 from pg_indexes
             where schemaname='public' and indexname='member_aliases_member_name_unique'),
  'member_aliases_member_name_unique exists');
select t.ok((select i.indisunique from pg_class c
             join pg_index i on i.indexrelid = c.oid
             where c.relname='member_aliases_member_name_unique'),
  'and it is UNIQUE -- a lookup index would infer nothing and 42P10 would be back');
select t.eq((select array_to_string(array_agg(a.attname order by k.ord), ',')
             from pg_class c
             join pg_index i on i.indexrelid = c.oid
             cross join lateral unnest(i.indkey) with ordinality k(attnum, ord)
             join pg_attribute a on a.attrelid = i.indrelid and a.attnum = k.attnum
             where c.relname='member_aliases_member_name_unique'),
  'member_id,alias_type,alias_normalized',
  'on exactly the columns the upserts infer, in that order');
select t.ok(not exists (select 1 from pg_indexes
             where schemaname='public' and indexname='member_aliases_unique'),
  'and 0071 still stands -- the academy-wide index was NOT brought back');

-- The structural guard. This is the assertion that would have caught 0071:
-- an index can be dropped in one migration and go on naming itself in a
-- function body three migrations away, and nothing reads both.
select t.eq((select count(*)::int from pg_proc p
             join pg_namespace n on n.oid = p.pronamespace
             where n.nspname='public' and p.prokind='f'
               and pg_get_functiondef(p.oid) ~* 'on conflict \(alias_type, alias_normalized\)'),
  0, 'NO function still infers the dropped academy-wide index');

-- --------------------------------------------------------- TEST 1: it accepts
begin;
  insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by)
  values ('cccccccc-2222-0000-0000-00000000000a','name','Shazia F','member_form',
          'cccccccc-1111-0000-0000-000000000001');
commit;
select t.eq((select count(*)::int from public.member_aliases
             where member_id='cccccccc-2222-0000-0000-00000000000a'), 1,
  'a display name new to the register is accepted');

-- ------------------------------------------- TEST 2: not twice on one member
select t.rejects($$insert into public.member_aliases (member_id, alias_type, alias_display)
    values ('cccccccc-2222-0000-0000-00000000000a','name','Shazia F')$$,
  'the same member cannot hold the same display name twice',
  'member_aliases_member_name_unique');
select t.rejects($$insert into public.member_aliases (member_id, alias_type, alias_display)
    values ('cccccccc-2222-0000-0000-00000000000a','name','  shazia   f  ')$$,
  'and the refusal survives case and spacing -- it is the NORMALISED name that is the key',
  'member_aliases_member_name_unique');

-- ------------------------------------ TEST 3: but two members may share one
begin;
  insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by)
  values ('cccccccc-2222-0000-0000-00000000000b','name','Shazia F','member_form',
          'cccccccc-1111-0000-0000-000000000001');
commit;
select t.eq((select count(*)::int from public.member_aliases where alias_normalized='shazia f'), 2,
  'two members may answer to one display name -- this is 0071, and it must stay true');

-- ------------------------------------------------ the import: TEST 4, 5, 6
select public.generate_sessions((select id from public.course_offerings), '2026-08-17','2026-08-17');

begin;
insert into public.csv_imports (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'meet-01.csv', 'aa01', o.id, '2026-08-17', 2, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'unmatched', 'raw_name', 'Nithya R', 'minutes', 40,
      'candidates', '[]'::jsonb),
    jsonb_build_object('row', 2, 'kind', 'unmatched', 'raw_name', 'Kavi S', 'minutes', 35,
      'candidates', '[]'::jsonb)
  )),
  'cccccccc-1111-0000-0000-000000000001'
  from public.course_offerings o
returning id as import_one \gset
commit;

-- TEST 4 (add_as_new) and TEST 5 (remember_alias on an existing member) in the
-- one commit, because the one commit is what 42P10 was aborting.
select public.commit_csv_import(:'import_one'::uuid, 'cccccccc-1111-0000-0000-000000000001'::uuid,
  jsonb_build_array(
    jsonb_build_object('row', 1, 'action', 'add_as_new'),
    jsonb_build_object('row', 2, 'action', 'use_existing',
      'member_id', 'cccccccc-2222-0000-0000-00000000000b', 'remember_alias', true)
  ));

select t.eq((select status from public.csv_imports where id=:'import_one'::uuid), 'completed',
  'the import COMMITTED -- this is the 42P10 regression, and the whole point of 0073');
select t.ok(exists (select 1 from public.members where full_name='Nithya R'),
  'add_as_new created the member the file could not resolve');
select t.ok(exists (select 1 from public.member_aliases ma
             join public.members m on m.id = ma.member_id
             where m.full_name='Nithya R' and ma.alias_display='Nithya R'),
  'and add_as_new registered that display name for the member it created');
select t.ok(exists (select 1 from public.member_aliases
             where member_id='cccccccc-2222-0000-0000-00000000000b' and alias_display='Kavi S'),
  'remember_alias registered the file spelling against the member the operator chose');
select t.eq((select count(*)::int from public.attendance_records where status='present'), 2,
  'and both rows are marked present -- the attendance write is downstream of the alias write');

-- TEST 6: a second file the same day, naming the same member the same way.
-- The alias upsert must hit the conflict and DO NOTHING, not raise.
begin;
insert into public.csv_imports (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'meet-02.csv', 'aa02', o.id, '2026-08-17', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'unmatched', 'raw_name', 'Kavi S', 'minutes', 20,
      'candidates', '[]'::jsonb)
  )),
  'cccccccc-1111-0000-0000-000000000001'
  from public.course_offerings o
returning id as import_two \gset
commit;

select public.commit_csv_import(:'import_two'::uuid, 'cccccccc-1111-0000-0000-000000000001'::uuid,
  jsonb_build_array(
    jsonb_build_object('row', 1, 'action', 'use_existing',
      'member_id', 'cccccccc-2222-0000-0000-00000000000b', 'remember_alias', true)
  ));
select t.eq((select status from public.csv_imports where id=:'import_two'::uuid), 'completed',
  're-remembering a display name already held is idempotent, not an error');
select t.eq((select count(*)::int from public.member_aliases
             where member_id='cccccccc-2222-0000-0000-00000000000b' and alias_normalized='kavi s'), 1,
  'and it left ONE row, not two -- `do nothing` is doing the work the index now backs');

-- ------------------------------------------------------- TEST 7: the merge
begin;
  insert into public.members (id, full_name)
    values ('cccccccc-2222-0000-0000-00000000000c','Rani Sharma'),
           ('cccccccc-2222-0000-0000-00000000000d','Rani Sham');
  insert into public.member_enrollments (member_id, offering_id, effective_from)
    select m.id, o.id, '2026-08-01' from public.members m, public.course_offerings o
     where m.id in ('cccccccc-2222-0000-0000-00000000000c','cccccccc-2222-0000-0000-00000000000d');
  -- A third member already answers to the stray's name. Before 0071 that
  -- alone would have made the merge skip the alias; under the per-member
  -- rule it is somebody else's row and has no bearing on this one.
  insert into public.member_aliases (member_id, alias_type, alias_display, source)
    values ('cccccccc-2222-0000-0000-00000000000a','name','Rani Sham','member_form');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select public.merge_member_into(
    'cccccccc-2222-0000-0000-00000000000d'::uuid,
    'cccccccc-2222-0000-0000-00000000000c'::uuid);
commit;

select t.ok(exists (select 1 from public.member_aliases
             where member_id='cccccccc-2222-0000-0000-00000000000c'
               and alias_normalized='rani sham'),
  'the merge gave the surviving member the display name the file carried');
select t.eq((select count(*)::int from public.member_aliases where alias_normalized='rani sham'), 2,
  'and it did NOT take that name off the unrelated member who also answers to it');
select t.eq((select count(*)::int from public.member_aliases
             where member_id='cccccccc-2222-0000-0000-00000000000c'
               and alias_normalized='rani sham'), 1,
  'the surviving member holds it once -- the index is what makes that structural');
