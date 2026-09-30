\echo 'merge_member_into: the member a merge lands on has figures rebuilt from the records it now holds (0082)'
--
-- The case, end to end through the real import rather than hand-written rows:
-- a Meet display name the file could not resolve becomes a no-email member
-- marked present, and the real member is marked absent for the same class.
-- The operator merges the one into the other. 0080 already moves the present
-- across; this file asserts that the member's FIGURES follow it -- the cache
-- the roster's streak line and the follow-up rule read.

begin;
  insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000059');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('dddddddd-1111-0000-0000-000000000059',
            'dddddddd-0000-0000-0000-000000000059','super_admin','Rosi Owner','+919994871259');
  insert into public.branches (name, code, city) values ('Main','MN','Salem');
  insert into public.courses (name) values ('Postnatal');
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-08-01', array[1,2,3,4,5,6]::smallint[] from public.course_offerings o;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000059';
  select public.create_member('Aarthi Krishnaswamy', (select id from public.course_offerings), '2026-08-01',
    array[]::text[], array['aarthi@example.com']::text[], null);
commit;

select public.generate_sessions((select id from public.course_offerings), '2026-08-17','2026-08-17');

begin;
insert into public.csv_imports (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'meet-17.csv', 'ff59', o.id, '2026-08-17', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'unmatched', 'raw_name', 'Aarthi K', 'minutes', 40,
      'candidates', '[]'::jsonb))),
  'dddddddd-1111-0000-0000-000000000059'
  from public.course_offerings o
returning id as import_id \gset
commit;

select public.commit_csv_import(:'import_id'::uuid, 'dddddddd-1111-0000-0000-000000000059'::uuid,
  jsonb_build_array(jsonb_build_object('row', 1, 'action', 'add_as_new')));

-- The starting point the academy reported: the real member absent, with a
-- run of one, having attended nothing.
select t.eq((select s.sessions_attended from public.member_stats s
               join public.members m on m.id = s.member_id
              where m.full_name = 'Aarthi Krishnaswamy'), 0,
  'before the merge the real member has attended nothing -- the import marked them absent');
select t.eq((select s.current_streak from public.member_stats s
               join public.members m on m.id = s.member_id
              where m.full_name = 'Aarthi Krishnaswamy'), 1,
  'and carries a missed run of one');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000059';
  select public.merge_member_into(
    (select id from public.members where full_name = 'Aarthi K' and deleted_at is null),
    (select id from public.members where full_name = 'Aarthi Krishnaswamy'));
commit;

select t.eq((select a.status from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Aarthi Krishnaswamy' and a.deleted_at is null),
  'present', 'the record for the class is present (0080 -- unchanged here)');
select t.eq((select s.sessions_attended from public.member_stats s
               join public.members m on m.id = s.member_id
              where m.full_name = 'Aarthi Krishnaswamy'), 1,
  'the member''s figures now count the class the merge gave them -- attended 1, not 0');
select t.eq((select s.current_streak from public.member_stats s
               join public.members m on m.id = s.member_id
              where m.full_name = 'Aarthi Krishnaswamy'), 0,
  'and the missed run is cleared -- the streak line no longer says they missed it');
select t.eq((select s.last_present_date from public.member_stats s
               join public.members m on m.id = s.member_id
              where m.full_name = 'Aarthi Krishnaswamy'), '2026-08-17'::date,
  'and the last day present is the class itself');

select t.eq((select present_count from public.sessions where session_date = '2026-08-17'), 1,
  'the session''s own counts follow too -- one present, which the calendar reads');
select t.eq((select absent_count from public.sessions where session_date = '2026-08-17'), 0,
  'and no absent left over from the import''s default mark');
select t.eq((select expected_count from public.sessions where session_date = '2026-08-17'), 1,
  'and one expected -- the stray is no longer counted beside the member it was');

-- 0082 applied again is a no-op: the function body does not change.
create temp table body_before_0082 as
  select md5(prosrc) as h from pg_proc where proname = 'merge_member_into';
\i supabase/migrations/0082_merge_recomputes_member_figures.sql
select t.eq((select md5(prosrc) from pg_proc where proname = 'merge_member_into'),
  (select h from body_before_0082), '0082 is idempotent -- a second apply leaves the function as it was');
select t.ok(has_function_privilege('authenticated', 'public.merge_member_into(uuid, uuid)', 'execute'),
  'the rewrite keeps EXECUTE for signed-in users');
select t.ok(not has_function_privilege('anon', 'public.merge_member_into(uuid, uuid)', 'execute'),
  'and still refuses it to anon');
