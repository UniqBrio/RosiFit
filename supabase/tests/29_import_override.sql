\echo 'import override: a second file REPLACES the day it covers, except what a person marked by hand'
--
-- 0037. A corrected export for a day already imported has always been
-- allowed, and the upload screen now says so before it writes: *"show message
-- that you existing data will be overridden ... on click confirm override"*
-- (requests/2026-09-07-upload-override-confirm.md).
--
-- What was NOT true when that message was written: a member the FIRST file
-- marked present and the second does not name kept her present for ever,
-- because the absent sweep is `on conflict do nothing`. She is the entire
-- reason a corrected file gets uploaded, and she was the one row the
-- correction could not reach.
--
-- Four members, one day, two files. Everything below is about the three the
-- second file does NOT name.

begin;
insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
  values ('eeeeeeee-1111-0000-0000-000000000001','eeeeeeee-0000-0000-0000-000000000001',
          'super_admin','Override Owner','+919994871402');
insert into public.branches (name, code) values ('Adyar','ADY');
insert into public.courses (name) values ('Prenatal Flow');
insert into public.course_offerings (course_id, branch_id, start_time, end_time)
  select c.id, b.id, '18:00','19:00' from public.courses c, public.branches b;
-- Mon / Wed / Fri. 2026-08-31 is a MONDAY, so the day below is one the
-- schedule covers and everyone enrolled is due at it.
insert into public.offering_schedules (offering_id, effective_from, weekdays)
  select id, '2026-08-01', array[1,3,5]::smallint[] from public.course_offerings;

insert into public.members (full_name) values
  ('Divya Ramesh'), ('Aarthi Venkat'), ('Meenakshi Sundaram'), ('Kavya Balaji');
insert into public.member_aliases (member_id, alias_type, alias_display, confirmed_by)
  select id, 'name', full_name, 'eeeeeeee-1111-0000-0000-000000000001' from public.members;
-- KAVYA IS NOT ENROLLED. She is the visitor: named in the first file, never
-- expected, so her record is an 'extra' -- and 'extra' is the case the
-- override cannot answer by marking her absent.
insert into public.member_enrollments (member_id, offering_id, effective_from)
  select m.id, o.id, '2026-08-01' from public.members m, public.course_offerings o
   where m.full_name <> 'Kavya Balaji';
commit;

-- ===================================================== FILE ONE, as exported
-- Divya, Aarthi and the visitor Kavya. Meenakshi was not in the call.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
   row_count, status, summary, uploaded_by)
select 'meet_31-08.csv', 'sha-first', o.id, '2026-08-31', 'gzj-yhru-ehp',
       '2026-08-31 18:02:00+05:30', 3, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Divya Ramesh', 'minutes', 55,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Divya Ramesh')))),
    jsonb_build_object('row', 2, 'kind', 'matched', 'raw_name', 'Aarthi Venkat', 'minutes', 51,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Aarthi Venkat')))),
    jsonb_build_object('row', 3, 'kind', 'matched', 'raw_name', 'Kavya Balaji', 'minutes', 12,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Kavya Balaji'))))
  )),
  'eeeeeeee-1111-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
-- A FIRST file overrides nothing, and must say so with zeroes rather than
-- with silence -- the client tells "no override" from "this server does not
-- report one" by whether the key is there at all.
select t.eq(((public.commit_csv_import(
    (select id from public.csv_imports where file_sha256 = 'sha-first'),
    'eeeeeeee-1111-0000-0000-000000000001', '[]'::jsonb))->'overridden'->>'reverted')::int, 0,
  'a first file for a day reverts nobody');
commit;

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Aarthi Venkat')),
            'present',
  'the first file marks Aarthi present');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Kavya Balaji')),
            'extra',
  'and the visitor nobody expected is an extra, not a present');

-- ======================================== a person disagrees with the file
-- Meenakshi joined from her sister's phone and the file never saw her. This
-- is the correction set_attendance (0035) exists for, and the one thing an
-- override must not quietly undo.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_attendance(
    (select id from public.members where full_name = 'Meenakshi Sundaram'),
    '2026-08-31'::date, 'present');
commit;

select t.ok((select a.corrected_at is not null from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Meenakshi Sundaram')),
  'a mark made by hand is stamped as one');

-- ================================================ FILE TWO, the correction
-- Re-exported with the visitor and the wrong name removed: it names Divya and
-- nobody else. Every assertion below is about the three it leaves out.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
   row_count, status, summary, uploaded_by)
select 'meet_31-08_corrected.csv', 'sha-second', o.id, '2026-08-31', 'gzj-yhru-ehp',
       '2026-08-31 18:02:00+05:30', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Divya Ramesh', 'minutes', 55,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Divya Ramesh'))))
  )),
  'eeeeeeee-1111-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
create temporary table override_result as
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-second'),
  'eeeeeeee-1111-0000-0000-000000000001', '[]'::jsonb) as r;
commit;

select t.eq((select (r->'overridden'->>'reverted')::int from override_result), 1,
  'the override reports the one member it put back to absent');
select t.eq((select (r->'overridden'->>'removed')::int from override_result), 1,
  'and the one record it removed for somebody who was never expected');
select t.eq((select (r->'overridden'->>'kept_by_hand')::int from override_result), 1,
  'and the one mark it deliberately left alone');

-- ------------------------------------------------------- what actually moved
select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Aarthi Venkat')),
            'absent',
  'a member the first file marked present and the second does not name is ABSENT -- the whole of 0037');

select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Kavya Balaji')), 0,
  'and the visitor who was never expected has no record at all -- she cannot be marked absent');

select t.ok((select a.deleted_at is not null from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31'
                and a.member_id = (select id from public.members where full_name = 'Kavya Balaji')),
  'removed SOFTLY -- the row and its history survive');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Meenakshi Sundaram')),
            'present',
  'a mark made by hand OUTRANKS a later file -- 0035 exists because the file was wrong about her');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Divya Ramesh')),
            'present',
  'and the member both files name is still present');

-- ------------------------------------------------- which file wrote the row
select t.eq((select a.import_id from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Divya Ramesh')),
            (select id from public.csv_imports where file_sha256 = 'sha-second'),
  'a re-imported row records the file that last wrote it, not the first one');

-- ------------------------------------------------------------ the invariants
select t.eq((select count(*)::int from public.sessions where session_date = '2026-08-31'), 1,
  'still one session for the day -- the override does not open a rival');

select t.ok(not exists (
    select 1 from public.attendance_records a
      join public.sessions s on s.id = a.session_id
     where s.session_date = '2026-08-31' and a.deleted_at is null
       and a.status = 'absent' and not a.expected),
  'and nothing it wrote breaks absent_must_be_expected');

-- ---------------------------------------------------------------- the record
select t.ok(exists (select 1 from public.audit_logs
                     where action = 'csv_import.overrode_register'),
  'replacing a register is in the audit log, with what it moved');

-- ===========================================================================
-- THE CASES THE FIRST DRAFT OF THIS FILE DID NOT COVER, and each of them is
-- a defect the review found in 0037 before anybody could run a query.
-- ===========================================================================

-- ------------------------------------------------------------------ counts
-- "Nothing breaks absent_must_be_expected" restates a CHECK constraint, so it
-- cannot fail -- a violation aborts the commit before the assertion runs.
-- What IS worth pinning is the register the override leaves behind, which is
-- where a member losing her record shows up.
select t.eq((select expected_count from public.sessions where session_date = '2026-08-31')::int, 3,
  'the three enrolled members are still expected after the override');

select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null), 3,
  'every member due that day still HAS a record -- an override never leaves a hole');

select t.eq((select a.import_id from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-31' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Aarthi Venkat')),
            (select id from public.csv_imports where file_sha256 = 'sha-second'),
  'and the row put BACK to absent records the file that did it');

-- ==================== A MARK BY HAND THAT NO FILE EVER WROTE
-- 2026-08-28 is a Friday the schedule covers, and nothing has been imported
-- for it. The mark below is the only thing on that register: import_id null.
-- set_attendance stamps corrected_at only when it CHANGES an existing row, so
-- it is marked twice to get one.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_attendance(
    (select id from public.members where full_name = 'Divya Ramesh'),
    '2026-08-28'::date, 'absent');
commit;
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_attendance(
    (select id from public.members where full_name = 'Divya Ramesh'),
    '2026-08-28'::date, 'present');
commit;

select t.ok((select a.import_id is null and a.corrected_at is not null
               from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-28'
                and a.member_id = (select id from public.members where full_name = 'Divya Ramesh')),
  'a register nobody uploaded holds a row no file wrote, marked by hand');

-- A file for THAT day, naming nobody who is already on it.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
   row_count, status, summary, uploaded_by)
select 'meet_28-08.csv', 'sha-handonly', o.id, '2026-08-28', 'gzj-yhru-ehp',
       '2026-08-28 18:02:00+05:30', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Aarthi Venkat', 'minutes', 44,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Aarthi Venkat'))))
  )),
  'eeeeeeee-1111-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
create temporary table handonly_result as
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-handonly'),
  'eeeeeeee-1111-0000-0000-000000000001', '[]'::jsonb) as r;
commit;

select t.eq((select (r->'overridden'->>'kept_by_hand')::int from handonly_result), 0,
  'a mark NO FILE wrote is not reported as kept -- it was never in reach of an override');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-28' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Divya Ramesh')),
            'present',
  'and it still stands -- the import had no claim on it either way');

-- ============== A HAND MARK ON SOMEBODY THE NEW FILE NAMES TOO
-- The dialog promises "marks you made by hand are kept" without qualifying
-- it, so it has to hold for a member the corrected file names -- where the
-- UPSERT, not the reconciliation, is the only thing between her mark and the
-- file's answer.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  select public.set_attendance(
    (select id from public.members where full_name = 'Aarthi Venkat'),
    '2026-08-28'::date, 'absent');
commit;

begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
   row_count, status, summary, uploaded_by)
select 'meet_28-08_again.csv', 'sha-namedmark', o.id, '2026-08-28', 'gzj-yhru-ehp',
       '2026-08-28 18:02:00+05:30', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Aarthi Venkat', 'minutes', 44,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Aarthi Venkat'))))
  )),
  'eeeeeeee-1111-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
create temporary table namedmark_result as
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-namedmark'),
  'eeeeeeee-1111-0000-0000-000000000001', '[]'::jsonb) as r;
commit;

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-28' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Aarthi Venkat')),
            'absent',
  'a file naming somebody a person marked absent by hand does NOT put her back to present');

select t.eq((select (r->'overridden'->>'kept_by_hand')::int from namedmark_result), 1,
  'and that mark is REPORTED as kept -- otherwise nothing on the screen mentions her');

select t.eq((select a.minutes_in_call from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-28' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Aarthi Venkat')), 44,
  'the file own evidence is still recorded against her -- only the STATUS is hers');

-- ======== AN EXTRA WHO BECAME EXPECTED BETWEEN THE TWO FILES
-- Kavya was an 'extra' on 31 Aug: named by a file, enrolled in nothing. She
-- enrols afterwards. A reconciliation reading the ROW's own `expected` column
-- would soft-delete her on the next corrected file -- and she is DUE, so the
-- register would simply be missing her.
-- 2026-08-26 is a Wednesday the schedule covers.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
   row_count, status, summary, uploaded_by)
select 'meet_26-08.csv', 'sha-becameexpected', o.id, '2026-08-26', 'gzj-yhru-ehp',
       '2026-08-26 18:02:00+05:30', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Kavya Balaji', 'minutes', 30,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Kavya Balaji'))))
  )),
  'eeeeeeee-1111-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-becameexpected'),
  'eeeeeeee-1111-0000-0000-000000000001', '[]'::jsonb);
commit;

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-26' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Kavya Balaji')),
            'extra',
  'she is an EXTRA on that day -- named by the file, enrolled in nothing');

-- ...and NOW she enrols. Her row still says expected = false, because that is
-- what was true when the file wrote it.
begin;
insert into public.member_enrollments (member_id, offering_id, effective_from)
select m.id, o.id, '2026-08-01' from public.members m, public.course_offerings o
 where m.full_name = 'Kavya Balaji';
commit;

-- A corrected file for the same day that does NOT name her.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, meeting_code, meeting_started_at,
   row_count, status, summary, uploaded_by)
select 'meet_26-08_corrected.csv', 'sha-becameexpected-2', o.id, '2026-08-26', 'gzj-yhru-ehp',
       '2026-08-26 18:02:00+05:30', 1, 'previewed',
  jsonb_build_object('rows', jsonb_build_array(
    jsonb_build_object('row', 1, 'kind', 'matched', 'raw_name', 'Divya Ramesh', 'minutes', 51,
      'candidates', jsonb_build_array(jsonb_build_object(
        'member_id', (select id from public.members where full_name = 'Divya Ramesh'))))
  )),
  'eeeeeeee-1111-0000-0000-000000000001'
  from public.course_offerings o;
commit;

begin;
set local role service_role;
select public.commit_csv_import(
  (select id from public.csv_imports where file_sha256 = 'sha-becameexpected-2'),
  'eeeeeeee-1111-0000-0000-000000000001', '[]'::jsonb);
commit;

select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-26' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Kavya Balaji')), 1,
  'a member enrolled BETWEEN the two files still has a record after the override');

select t.eq((select a.status from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-26' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Kavya Balaji')),
            'absent',
  'and she is ABSENT, not deleted -- she is due that day, whatever the old row said');

select t.ok((select a.expected from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-08-26' and a.deleted_at is null
                and a.member_id = (select id from public.members where full_name = 'Kavya Balaji')),
  'her row says expected too -- absent_must_be_expected is about the ROW, so the two must agree');
