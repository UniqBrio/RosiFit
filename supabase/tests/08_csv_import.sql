\echo 'csv-import: atomic commit, five outcomes, absentees, no partial writes'
begin;
insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
insert into public.app_users (auth_user_id, kind, name, phone_e164)
  values ('eeeeeeee-0000-0000-0000-000000000001','super_admin','Rosi','+919994871159');
insert into public.branches (name, code) values ('Salem','SLM');
insert into public.courses (name) values ('Prenatal Yoga');
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '06:00','07:00' from public.courses c, public.branches b;
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select id, '2026-08-01', array[1,3,5]::smallint[] from public.course_offerings;
-- Shazia: confirmed member, already enrolled, no email yet (outcome B)
insert into public.members (member_code, full_name) values ('RF-000118','Shazia Farheen');
insert into public.member_aliases (member_id, alias_type, alias_display, confirmed_by)
  select id, 'name', 'Shazia F', (select id from public.app_users) from public.members;
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01' from public.members m, public.course_offerings o;
commit;

select public.generate_sessions((select id from public.course_offerings), '2026-08-17','2026-08-17');

-- ---------------------------------------------------------------- outcome A/B/E in one file
-- row 1: Shazia F -> matched, no email (outcome B) -> continue_without_email (default)
-- row 2: unknown name -> unmatched (outcome E) -> add_as_new
begin;
insert into public.csv_imports (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'sample.csv', 'deadbeef', o.id, '2026-08-17', 2, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'noEmail', 'raw_name', 'Shazia F', 'minutes', 42,
      'candidates', jsonb_build_array(jsonb_build_object('member_id', (select id from public.members)))),
    jsonb_build_object('row', 2, 'kind', 'unmatched', 'raw_name', 'Kavi S', 'minutes', 30,
      'candidates', '[]'::jsonb)
  )),
  (select id from public.app_users)
  from public.course_offerings o
returning id as import_id \gset

commit;

-- committing without deciding the blocking row (row 2, unmatched) must fail,
-- and fail WHOLLY -- no attendance row for row 1 either
select t.rejects(format($$select public.commit_csv_import('%s'::uuid, (select id from public.app_users), '[]'::jsonb)$$, :'import_id'),
  'a blocking row (E) without a decision refuses the whole commit', 'needs a decision');
select t.eq((select count(*)::int from public.attendance_records), 0,
  'the refused commit left NO attendance rows -- not even for the row that had no decision to make');
select t.eq((select status from public.csv_imports where id=:'import_id'::uuid), 'previewed',
  'the import itself is still previewed, not half-completed');

-- now commit for real, with both decisions supplied
select public.commit_csv_import(:'import_id'::uuid, (select id from public.app_users),
  jsonb_build_array(
    jsonb_build_object('row', 2, 'action', 'add_as_new')
  ));

select t.eq((select status from public.csv_imports where id=:'import_id'::uuid), 'completed',
  'the import is completed once every blocking row has a decision');
select t.eq((select count(*)::int from public.members), 2,
  'row 2 (unmatched) created exactly one new member');
select t.eq((select count(*)::int from public.attendance_records a
             join public.members m on m.id=a.member_id and m.full_name='Shazia Farheen'
             where a.status='present'), 1,
  'row 1 (matched, no email) still recorded attendance -- C-76: imports regardless of email');
select t.eq((select count(*)::int from public.attendance_records a
             join public.members m on m.id=a.member_id and m.member_code like 'RF-0%'
             where m.full_name='Kavi S' and a.status='present'), 1,
  'the new member from row 2 has a present record, not absent');
select t.ok(exists (select 1 from public.member_aliases ma join public.members m on m.id=ma.member_id
             where m.full_name='Kavi S' and ma.alias_display='Kavi S'),
  'the CSV name became her display-name alias automatically (C-77)');

-- committing the SAME import again must be refused (it already completed)
select t.rejects(format($$select public.commit_csv_import('%s'::uuid, (select id from public.app_users), '[]'::jsonb)$$, :'import_id'),
  'a completed import cannot be committed a second time', 'cannot be committed again');

\echo 'csv-import: a second, later session for the same offering gets its own absentee'
-- Shazia is expected on the 19th too (Wed); if she is absent from that
-- file entirely, she must show up as an absent row, not silently vanish.
select public.generate_sessions((select id from public.course_offerings), '2026-08-19','2026-08-19');
begin;
insert into public.csv_imports (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'sample2.csv', 'cafebabe', o.id, '2026-08-19', 0, 'previewed',
  jsonb_build_object('rows', '[]'::jsonb),
  (select id from public.app_users)
  from public.course_offerings o
returning id as import_id2 \gset
commit;

select public.commit_csv_import(:'import_id2'::uuid, (select id from public.app_users), '[]'::jsonb);

select t.eq((select count(*)::int from public.attendance_records a
             join public.sessions s on s.id=a.session_id
             where s.session_date='2026-08-19' and a.status='absent'), 2,
  'nobody in the file on the 19th -- BOTH enrolled members recorded absent, nobody dropped');
select t.eq((select status from public.sessions where session_date='2026-08-19'), 'completed',
  'the session is marked completed once its import commits');
