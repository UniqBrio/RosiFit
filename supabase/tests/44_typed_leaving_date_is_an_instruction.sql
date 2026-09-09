\echo 'bulk_set_member_dates: a leaving date typed into the report is obeyed (0062)'
--
-- REPORTED 09-Sep-2026 with the file: a 794-member export, an Inactive from
-- date typed against two members, uploaded, and nothing happened -- both rows
-- came back "already correct".
--
-- 0058 read "an inactive date with NO STATUS beside it means inactive from
-- that day". The report writes a Status on every row, so on a real export
-- there is never no status beside it: the exported "Active" won and the typed
-- date was discarded. 0062 reads WHICH CELL WAS EDITED instead, against the
-- record. These are the three cases it has to tell apart, server-side, in the
-- same order src/data/statusImport.ts resolves them.

begin;
  insert into auth.users (id) values ('cccccccc-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('cccccccc-1111-0000-0000-000000000001',
            'cccccccc-0000-0000-0000-000000000001','super_admin','Dates Owner','+919994871123');
  insert into public.branches (name, code, city) values ('Erode','ERD','Erode');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Dates Flow','06:00','07:00',6);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00'
      from public.courses c, public.branches b
     where c.name = 'Dates Flow' and b.code = 'ERD';
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 400, array[1,2,3,4,5,6,7]::smallint[]
      from public.course_offerings o join public.courses c on c.id = o.course_id
     where c.name = 'Dates Flow';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  select public.create_member('Sam Peters',
           (select o.id from public.course_offerings o
              join public.courses c on c.id = o.course_id where c.name = 'Dates Flow'),
           null, array[]::text[], array['sam.p@gmail.com']::text[], null);
commit;

-- ============ THE REPORTED CASE: a date typed, Status left as exported
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  create temporary table t1(result jsonb) on commit drop;
  insert into t1
  select public.bulk_set_member_dates(
    jsonb_build_array(jsonb_build_object(
      'row', 2, 'full_name', 'Sam Peters',
      'active_from', null,
      'inactive_from', to_char(current_date + 31, 'YYYY-MM-DD'),
      -- "Active" is what the export wrote; nobody edited this cell
      'status', 'Active')),
    'members-report.xlsx');

  select t.eq((select (result->>'updated')::int from t1), 1,
    'THE REPORTED BUG: a typed leaving date is a real change, not "already correct"');
commit;

select t.eq((select m.status::text from public.members m where m.full_name = 'Sam Peters'),
  'inactive', 'and the member is inactive, not left active by the exported Status');

select t.eq((select m.inactive_from from public.members m where m.full_name = 'Sam Peters'),
  (current_date + 31)::date, 'from the day that was typed');

-- ============ THE RE-UPLOAD still writes nothing
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  create temporary table t2(result jsonb) on commit drop;
  insert into t2
  select public.bulk_set_member_dates(
    jsonb_build_array(jsonb_build_object(
      'row', 2, 'full_name', 'Sam Peters',
      'active_from', null,
      'inactive_from', to_char(current_date + 31, 'YYYY-MM-DD'),
      'status', 'Inactive')),
    'members-report.xlsx');

  select t.eq((select (result->>'unchanged')::int from t2), 1,
    'the same export sent back a second time writes nothing');
  select t.eq((select (result->>'updated')::int from t2), 0,
    'and reports no update');
commit;

-- ============ AN EDITED STATUS still wins: this is how you reactivate
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'cccccccc-0000-0000-0000-000000000001';
  create temporary table t3(result jsonb) on commit drop;
  insert into t3
  select public.bulk_set_member_dates(
    jsonb_build_array(jsonb_build_object(
      'row', 2, 'full_name', 'Sam Peters',
      'active_from', null,
      -- the stale date is left in the cell; only Status was changed
      'inactive_from', to_char(current_date + 31, 'YYYY-MM-DD'),
      'status', 'Active')),
    'members-report.xlsx');

  select t.eq((select (result->>'updated')::int from t3), 1,
    'setting Status back to Active is an edit, and it lands');
commit;

select t.eq((select m.status::text from public.members m where m.full_name = 'Sam Peters'),
  'active', 'the member is back on the register');

select t.ok((select m.inactive_from is null from public.members m where m.full_name = 'Sam Peters'),
  'and Active took the leaving date off, stale cell or not');
