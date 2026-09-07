\echo 'set_attendance: the first way a person may write attendance, and the invariants it may not break'
--
-- Attendance has had one way in since 0008 -- a Google Meet export committed
-- by commit_csv_import -- and no way to correct. 0035 is the write path the
-- roster chips call.
--
-- What these assert is the set of things the client must NOT be able to
-- decide: whether she was expected, whether a session exists, what the
-- register said before somebody disagreed with it, and whether an absence on
-- a day nobody expected her is a thing that can be recorded at all.

begin;
  insert into auth.users (id) values ('dddddddd-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('dddddddd-1111-0000-0000-000000000001',
            'dddddddd-0000-0000-0000-000000000001','super_admin','Rosi Owner','+919994871158');

  insert into public.branches (name, code, city) values ('Coimbatore','CBE','Coimbatore');
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Prenatal Flow','06:00','07:00',3);
  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '06:00', '07:00' from public.courses c, public.branches b;
  -- Mon / Wed / Fri. Tuesday is deliberately NOT a class day: half this file
  -- is about what happens on a day she was never expected.
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, '2026-08-01', array[1,3,5]::smallint[] from public.course_offerings o;
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.create_member(
    'Anitha Rajesh',
    (select id from public.course_offerings),
    '2026-08-01'::date,
    array[]::text[],
    array['anitha@gmail.com']::text[],
    null);
commit;

-- ============================================ a day with no session at all
-- The course runs Monday, but nobody has generated or uploaded anything.
-- 0024 exists because "a session already existed" was the wrong assumption;
-- this is that lesson, applied to a chip.
select t.ok(not exists (select 1 from public.sessions
                         where session_date = date_trunc('week', current_date)::date),
  'the fixture starts with no session on that Monday -- the case a roster chip must survive');

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.eq((public.set_attendance(
                 (select id from public.members where full_name = 'Anitha Rajesh'),
                 date_trunc('week', current_date)::date, 'present') ->> 'session_created')::boolean,
    true,
    'marking her on a day with no session row creates the session it hangs off');
commit;

select t.eq((select count(*)::int from public.sessions
              where session_date = date_trunc('week', current_date)::date), 1,
  'exactly one session -- sessions_unique_live is what stops a rival of a real one');
select t.eq((select source from public.sessions
              where session_date = date_trunc('week', current_date)::date), 'manual',
  'and it says it was made by hand, not generated and not imported');
select t.eq((select expectation_mode from public.sessions
              where session_date = date_trunc('week', current_date)::date), 'schedule',
  'Monday is on the schedule, so the schedule decides who was expected (0024''s rule)');
select t.eq((select status from public.sessions
              where session_date = date_trunc('week', current_date)::date), 'completed',
  'and it is completed -- recompute_member_stats counts only completed sessions, so a '
  'session left scheduled would record the attendance and move none of her figures');

select t.eq((select a.status from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'), 'present',
  'her attendance is recorded');
select t.ok((select a.expected from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'),
  'and expected is TRUE -- derived from expected_members_for_session, never asserted by the caller');
select t.eq((select a.created_by from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'),
  'dddddddd-1111-0000-0000-000000000001'::uuid,
  'attributed to the signed-in actor, so a record never appears with nobody''s name on it');
select t.ok(exists (select 1 from public.audit_logs
                     where action = 'attendance.marked'),
  'and the first mark audits itself -- audit_attendance fires on UPDATE only, so an INSERT '
  'that did not say so would be a record in the register nobody logged');

select t.eq((select sessions_attended from public.member_stats ms
               join public.members m on m.id = ms.member_id
              where m.full_name = 'Anitha Rajesh'), 1,
  'her stats moved in the same call -- the card''s Missed line and the dashboard read these');

-- ================================================== idempotence
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.eq((public.set_attendance(
                 (select id from public.members where full_name = 'Anitha Rajesh'),
                 date_trunc('week', current_date)::date, 'present') ->> 'changed')::boolean, false,
    'marking the status she already holds reports changed = false');
commit;

select t.ok((select corrected_at is null from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'),
  'and a double tap does not stamp a correction that nobody made');

-- ============================================ correcting what the file said
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.set_attendance(
    (select id from public.members where full_name = 'Anitha Rajesh'),
    date_trunc('week', current_date)::date, 'absent');
commit;

select t.eq((select a.status from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'), 'absent',
  'a person may change what is recorded -- the file is evidence, not truth');
select t.eq((select a.original_status from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'), 'present',
  'and what it said BEFORE is kept -- the column 0008 created and nothing had ever written');
select t.eq((select a.corrected_by from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'),
  'dddddddd-1111-0000-0000-000000000001'::uuid,
  'named to the person who disagreed with the register');

-- A SECOND correction must not overwrite the original with the first
-- correction's answer, or "what it said before" becomes "what it said a
-- moment ago" and the evidence is gone.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select public.set_attendance(
    (select id from public.members where full_name = 'Anitha Rajesh'),
    date_trunc('week', current_date)::date, 'present');
commit;

select t.eq((select a.original_status from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Anitha Rajesh'), 'present',
  'original_status is stamped once and stays what the register first said');

-- ==================================== a day the course does not run at all
-- Tuesday. She was never expected, so 'absent' is not a fact that exists --
-- and absent_must_be_expected (0008) would refuse it with a constraint name.
-- The point of this pair is that a PERSON gets a sentence instead.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  select t.rejects($$select public.set_attendance(
                       (select id from public.members where full_name = 'Anitha Rajesh'),
                       (date_trunc('week', current_date) + interval '1 day')::date, 'absent')$$,
    'absent on a day she was not expected is refused, in words rather than by a CHECK',
    'was not expected');

  select t.eq(public.set_attendance(
                (select id from public.members where full_name = 'Anitha Rajesh'),
                (date_trunc('week', current_date) + interval '1 day')::date, 'present') ->> 'status',
    'extra',
    'present on a day she was not expected is stored as EXTRA -- she turned up when nobody '
    'expected her, and that never counts as a miss');
commit;

select t.eq((select expectation_mode from public.sessions
              where session_date = (date_trunc('week', current_date) + interval '1 day')::date),
  'all_enrolled',
  'the session it created is all_enrolled -- the schedule does not cover that day, and '
  'answering "nobody was expected" for a class that really happened blinds the follow-up engine');

-- ================================================== the refusals
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';

  select t.rejects($$select public.set_attendance(
                       (select id from public.members where full_name = 'Anitha Rajesh'),
                       current_date + 7, 'present')$$,
    'a day that has not happened cannot be marked',
    'has not happened yet');

  select t.rejects($$select public.set_attendance(
                       (select id from public.members where full_name = 'Anitha Rajesh'),
                       current_date, 'excused')$$,
    'a status outside present/absent is refused, naming what was passed',
    'present or absent');

  select t.rejects($$select public.set_attendance(
                       '00000000-0000-0000-0000-000000000000'::uuid,
                       current_date, 'present')$$,
    'a member who is not on the register is refused',
    'not on the register');
commit;

-- A cancelled class has no attendance. This is the one that would be easy to
-- allow by accident, and it would put presences on a class that did not run.
begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'dddddddd-0000-0000-0000-000000000001';
  update public.sessions set status = 'cancelled', cancellation_reason = 'coach ill'
   where session_date = date_trunc('week', current_date)::date;
  select t.rejects($$select public.set_attendance(
                       (select id from public.members where full_name = 'Anitha Rajesh'),
                       date_trunc('week', current_date)::date, 'present')$$,
    'a cancelled class cannot be marked',
    'cancelled');
rollback;

-- ================================================== the gate itself
-- SECURITY DEFINER bypasses RLS, so the predicates the table's policies carry
-- have to be restated inside the function or this is a hole through them.
select t.rejects($$select public.set_attendance(
                     (select id from public.members where full_name = 'Anitha Rajesh'),
                     current_date, 'present')$$,
  'nobody signed in cannot mark anybody''s attendance',
  'signed-in');

select t.ok(not has_function_privilege('anon', 'public.set_attendance(uuid, date, text)', 'execute'),
  'anon holds no execute grant -- the anon key is in the bundle, and this is the one '
  'function that could forge attendance with it');
select t.ok(has_function_privilege('authenticated', 'public.set_attendance(uuid, date, text)', 'execute'),
  'and a signed-in user does');

-- The guarantee this whole migration is shaped around: it did NOT widen a
-- table grant to get its write (RC-007).
select t.ok(not has_table_privilege('authenticated', 'public.attendance_records', 'insert')
        and not has_table_privilege('authenticated', 'public.attendance_records', 'update'),
  'authenticated STILL holds no write grant on attendance_records -- a stolen anon key '
  'cannot forge attendance, which is what 0015 repaired and this must not undo');
