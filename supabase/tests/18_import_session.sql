\echo 'import session: a class nobody scheduled still counts, for everyone enrolled'
--
-- 0024. A course whose classes are not on a fixed timetable has no scheduled
-- session rows, so there was nothing to upload a file AGAINST. The file itself
-- carries what identifies the session -- Meet's meeting code and its created
-- timestamp -- so the import creates the session from those.
--
-- The rule this pins: WHO WAS DUE at a session the schedule does not contain.
-- expectation_mode defaults to 'schedule', which asks the offering's weekdays,
-- and for a date they do not include the answer is NOBODY: expected_count 0,
-- not one absence recorded, and the follow-up engine blind to a class that
-- really happened. Attendance would be "recorded" and count for nothing.

begin;
insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
  values ('44444444-0000-0000-0000-000000000001','dddddddd-0000-0000-0000-000000000001',
          'super_admin','Import Owner','+919994871401');
insert into public.branches (name, code) values ('Velachery','VLC');
insert into public.courses (name) values ('Zumba Basics');
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '18:00','19:00' from public.courses c, public.branches b;
-- The offering runs Mon/Wed/Fri (isodow 1,3,5).
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select id, '2026-08-01', array[1,3,5]::smallint[] from public.course_offerings;

insert into public.members (member_code, full_name) values
  ('RF-000201','Divya Ramesh'), ('RF-000202','Aarthi Venkat');
insert into public.member_aliases (member_id, alias_type, alias_display, confirmed_by)
  select id, 'name', full_name, '44444444-0000-0000-0000-000000000001' from public.members;
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01' from public.members m, public.course_offerings o;
commit;

-- --------------------------------------------------- the new columns exist
select t.ok((select count(*) = 2 from information_schema.columns
              where table_name = 'csv_imports'
                and column_name in ('meeting_code','meeting_started_at')),
  'csv_imports records the meeting a file came from');

-- ============================================================ OFF SCHEDULE
-- 2026-08-31 is a MONDAY... isodow 1, which IS in the schedule. Use Sunday
-- 2026-08-30 (isodow 7) so the schedule genuinely does not cover it.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
   row_count, status, summary, uploaded_by)
select 'meet_30-08.csv', 'sha-adhoc', o.id, '2026-08-30', 'gzj-yhru-ehp',
       '2026-08-30 20:12:56+05:30', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Divya Ramesh', 'minutes', 0,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Divya Ramesh'))))
  )),
  '44444444-0000-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-adhoc'),
  '44444444-0000-0000-0000-000000000001', '[]'::jsonb);
commit;

select t.eq((select expectation_mode from public.sessions where session_date = '2026-08-30'),
            'all_enrolled',
  'a session the schedule does not cover expects EVERYONE ENROLLED, not nobody');

select t.eq((select source from public.sessions where session_date = '2026-08-30'), 'import',
  'and is marked as having come from an import');

select t.eq((select expected_count from public.sessions where session_date = '2026-08-30')::int, 2,
  'both enrolled members were due — this is the number that used to be 0');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-30'
                and a.member_id = (select id from public.members where full_name = 'Divya Ramesh')),
            'present',
  'the member in the file is PRESENT — and expected, so present rather than extra');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-30'
                and a.member_id = (select id from public.members where full_name = 'Aarthi Venkat')),
            'absent',
  'the enrolled member who was NOT in the file is absent — the follow-up engine can see her');

-- A zero-minute row still counts. Time in call decides nothing: the file
-- saying she was there is the evidence, and a 32-second reconnect is not
-- absence.
select t.eq((select minutes_in_call from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-30'
                and a.member_id = (select id from public.members where full_name = 'Divya Ramesh'))::int,
            0,
  'a zero-minute row is recorded present, with its zero kept for the record');

-- ============================================================ ON SCHEDULE
-- Wednesday 2026-08-26 IS in the offering's weekdays, so the schedule is the
-- authority and the mode must NOT be widened.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, row_count, status, summary, uploaded_by)
select 'meet_26-08.csv', 'sha-onsched', o.id, '2026-08-26', 'gzj-yhru-ehp', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Divya Ramesh', 'minutes', 45,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Divya Ramesh'))))
  )),
  '44444444-0000-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-onsched'),
  '44444444-0000-0000-0000-000000000001', '[]'::jsonb);
commit;

select t.eq((select expectation_mode from public.sessions where session_date = '2026-08-26'),
            'schedule',
  'a session the schedule DOES cover keeps schedule as the authority');

-- ====================================================== ONE PER DAY, TWICE
-- A second file for the same offering and date. sessions_unique_live means it
-- cannot open a rival session, and attendance_unique_live means it cannot
-- double-record a member: the import updates, and the counts stay honest.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, row_count, status, summary, uploaded_by)
select 'meet_30-08_again.csv', 'sha-adhoc-2', o.id, '2026-08-30', 'gzj-yhru-ehp', 2, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Divya Ramesh', 'minutes', 12,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Divya Ramesh')))),
    jsonb_build_object('row', 2, 'kind', 'matched', 'raw_name', 'Aarthi Venkat', 'minutes', 30,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Aarthi Venkat'))))
  )),
  '44444444-0000-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-adhoc-2'),
  '44444444-0000-0000-0000-000000000001', '[]'::jsonb);
commit;

select t.eq((select count(*)::int from public.sessions where session_date = '2026-08-30'), 1,
  'a second file for the same day does NOT open a second session');

select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-30'
                and a.member_id = (select id from public.members where full_name = 'Divya Ramesh')
                and a.deleted_at is null), 1,
  'and does NOT record the same member twice — one person, one session, one day');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-30'
                and a.member_id = (select id from public.members where full_name = 'Aarthi Venkat')),
            'present',
  'the member absent in the first file and present in the second is corrected, not duplicated');

select t.eq((select present_count from public.sessions where session_date = '2026-08-30')::int, 2,
  'and the session counts are recomputed rather than added to');

-- --------------------------------------------------------------- traceable
select t.eq((select meeting_code from public.csv_imports where file_sha256 = 'sha-adhoc'),
            'gzj-yhru-ehp',
  'the import remembers which meeting the file came from');

select t.ok((select session_id is not null from public.csv_imports where file_sha256 = 'sha-adhoc'),
  'and which session it landed in');
