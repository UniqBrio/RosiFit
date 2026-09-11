\echo 'course_week_day_status: seven rows, and the four uploaded days RC-039 hid'
--
-- 0067. The course screen's seven day statuses, computed in Postgres instead of
-- derived from a week of raw rows downloaded to a phone.
--
-- WHAT COULD GO WRONG THAT NOTHING ELSE WOULD CATCH:
--
--   1. A day with no records comes back as NO ROW instead of a row saying
--      "uploaded: false". That is the exact shape RC-039 handed the screen --
--      absence, to be interpreted -- and interpreting it is what printed
--      "Awaiting upload" over four days of uploaded attendance. Seven days in,
--      seven rows out, always, is the whole reason this function generates its
--      own dates rather than grouping whatever the join returns.
--   2. `uploaded` is computed as "present_count > 0". On a day where almost
--      everybody missed -- Tuesday 8 Sep in production was 42 present against
--      217 absent -- that is right by luck; on a day nobody attended it says
--      the file never arrived. Uploaded is the EXISTENCE of records.
--   3. 'extra' stops counting as present. Somebody who turned up unexpected
--      (0008) is present; the distinction is about EXPECTATION and it belongs
--      to expected_count. If it fell through to neither count, a day's numbers
--      would silently disagree with the roster below the strip.
--   4. A soft-deleted record, or a record on a soft-deleted session, is
--      counted. A reset SOFT-deletes (0056), so a day whose register was reset
--      would keep reading "uploaded" with the marks that were withdrawn.
--   5. Another course's records leak in, or the branch filter is ignored. This
--      function's entire job is to answer for ONE course, and the bug it
--      replaces was a screen being handed the wrong pile of rows.
--   6. It is SECURITY DEFINER, or executable by `anon`. It reads three tables
--      whose RLS says "an active staff member". Under INVOKER that rule still
--      applies to the caller; under DEFINER it would not, and `anon` would be
--      reading attendance.

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000001');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-1111-0000-0000-000000000001',
            'eeeeeeee-0000-0000-0000-000000000001','super_admin','Week Owner','+919994871191');

  insert into public.branches (name, code, city)
    values ('Salem','SLM','Salem'), ('Erode','ERD','Erode');

  -- The course under test, and a NEIGHBOUR that must never appear in its
  -- answer. Both run every day, so a leak shows up as a count rather than as
  -- a day that is merely present.
  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Week Under Test','07:00','08:00',7), ('Neighbour Week','07:00','08:00',7);

  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '07:00', '08:00'
      from public.courses c, public.branches b
     where c.name in ('Week Under Test','Neighbour Week') and b.code in ('SLM','ERD');

  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 400, array[1,2,3,4,5]::smallint[]
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name in ('Week Under Test','Neighbour Week');
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000001';
  -- Two members at Salem, one at Erode, so the branch filter has something to
  -- filter.
  select public.create_member(n.name,
           (select o.id from public.course_offerings o
              join public.courses c on c.id = o.course_id
              join public.branches b on b.id = o.branch_id
             where c.name = 'Week Under Test' and b.code = n.code),
           null, array[]::text[], array[n.email]::text[], null)
    from (values ('Asha Salem','asha.s@gmail.com','SLM'),
                 ('Bindu Salem','bindu.s@gmail.com','SLM'),
                 ('Chitra Erode','chitra.e@gmail.com','ERD')) as n(name, email, code);
commit;

-- ------------------------------------------------------------- the fixture week
-- A Monday, so the seven days line up with isodow the way the screen's week
-- does. Monday..Thursday get sessions; Friday gets none.
create temp table wk as select (date_trunc('week', current_date) - interval '7 days')::date as mon;

begin;
  insert into public.sessions (offering_id, session_date, start_time, end_time, status)
    select o.id, (select mon from wk) + d, '07:00', '08:00', 'completed'
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
      join public.branches b on b.id = o.branch_id,
           generate_series(0, 3) d
     where c.name = 'Week Under Test' and b.code = 'SLM';

  -- Monday: everybody present.
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s, public.members m
     where s.session_date = (select mon from wk)
       and m.full_name in ('Asha Salem','Bindu Salem');

  -- Tuesday: EVERYBODY ABSENT. The case that breaks `present_count > 0`.
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'absent', true
      from public.sessions s, public.members m
     where s.session_date = (select mon from wk) + 1
       and m.full_name in ('Asha Salem','Bindu Salem');

  -- Wednesday: one present, one EXTRA (turned up unexpected), one absent.
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'present', true
      from public.sessions s, public.members m
     where s.session_date = (select mon from wk) + 2 and m.full_name = 'Asha Salem';
  insert into public.attendance_records (session_id, member_id, status, expected)
    select s.id, m.id, 'extra', false
      from public.sessions s, public.members m
     where s.session_date = (select mon from wk) + 2 and m.full_name = 'Bindu Salem';

  -- Thursday: uploaded, then RESET. Soft-deleted rows, on a live session.
  insert into public.attendance_records (session_id, member_id, status, expected, deleted_at)
    select s.id, m.id, 'present', true, now()
      from public.sessions s, public.members m
     where s.session_date = (select mon from wk) + 3
       and m.full_name in ('Asha Salem','Bindu Salem');

  -- The NEIGHBOUR course, same Monday, so a leak is visible as a count.
  insert into public.sessions (offering_id, session_date, start_time, end_time, status)
    select o.id, (select mon from wk), '07:00', '08:00', 'completed'
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
      join public.branches b on b.id = o.branch_id
     where c.name = 'Neighbour Week' and b.code = 'SLM';
commit;

create temp table wk_rows as
  select * from public.course_week_day_status(
    (select id from public.courses where name = 'Week Under Test'),
    (select mon from wk));

-- --------------------------------------------------------------- 1. SEVEN ROWS
-- Defect 1. The screen must never have to read "this day is missing from the
-- answer" as a fact about a file.
select t.eq((select count(*)::int from wk_rows), 7,
  'SEVEN ROWS, one per day, whatever the data does -- absence is never the answer');

select t.eq((select count(distinct day)::int from wk_rows), 7,
  'and they are seven DIFFERENT days');

select t.eq((select min(day) from wk_rows), (select mon from wk),
  'the first row is the Monday asked for');

select t.eq((select max(day) from wk_rows), (select mon from wk) + 6,
  'and the last is six days later');

select t.ok((select bool_and(day = lag_day) from (
               select day, lag(day) over (order by day) + 1 as lag_day from wk_rows
              ) q where lag_day is not null),
  'the days are contiguous and ordered, so the strip can render them as it reads them');

-- ------------------------------------------------------- 2. uploaded, honestly
select t.eq((select uploaded from wk_rows where day = (select mon from wk)), true,
  'Monday has records, so it is uploaded');

-- Defect 2, and the one a naive implementation gets wrong.
select t.eq((select uploaded from wk_rows where day = (select mon from wk) + 1), true,
  'TUESDAY IS UPLOADED, and everybody was absent -- uploaded is the existence of records');
select t.eq((select present_count from wk_rows where day = (select mon from wk) + 1), 0,
  'with nobody present on it');
select t.eq((select absent_count from wk_rows where day = (select mon from wk) + 1), 2,
  'and both members marked absent');

select t.eq((select uploaded from wk_rows where day = (select mon from wk) + 4), false,
  'Friday has no session at all, so nothing was uploaded for it');
select t.eq((select present_count from wk_rows where day = (select mon from wk) + 4), 0,
  'and its counts are zero rather than null -- a cell cannot render NaN');
select t.eq((select absent_count from wk_rows where day = (select mon from wk) + 4), 0,
  'both of them');
select t.eq((select expected_count from wk_rows where day = (select mon from wk) + 4), 0,
  'all three of them');

-- ------------------------------------------------- 3. extra reads as present
-- Defect 3. She turned up when nobody expected her (0008). What HAPPENED is
-- that she was present; whether she was EXPECTED is a different column.
select t.eq((select present_count from wk_rows where day = (select mon from wk) + 2), 2,
  'EXTRA COUNTS AS PRESENT -- one expected, one who simply turned up');
select t.eq((select expected_count from wk_rows where day = (select mon from wk) + 2), 1,
  'but only one of the two was EXPECTED, which is the distinction extra carries');
select t.eq((select absent_count from wk_rows where day = (select mon from wk) + 2), 0,
  'and nobody on that day was absent');

-- ------------------------------------------------- 4. a reset day is not uploaded
-- Defect 4. A reset SOFT-deletes (0056). Counting raw rows would keep the day
-- reading "uploaded" with marks that were deliberately withdrawn -- which is
-- the same lie as RC-039, pointing the other way.
select t.eq((select uploaded from wk_rows where day = (select mon from wk) + 3), false,
  'THURSDAY WAS RESET: its records are soft-deleted, so the day is not uploaded');
select t.eq((select present_count from wk_rows where day = (select mon from wk) + 3), 0,
  'and none of the withdrawn marks is counted');
select t.eq((select count(*)::int from public.attendance_records
              where deleted_at is not null), 2,
  'the rows themselves are still there, which is what soft delete means');

-- ------------------------------------------ 5. one course, and one branch
-- Defect 5. The bug being replaced was a screen handed the wrong pile of rows.
select t.eq((select sum(present_count + absent_count)::int from wk_rows), 6,
  'SIX MARKS IN TOTAL -- the neighbour course ran the same Monday and is absent from this answer');

create temp table erode_rows as
  select * from public.course_week_day_status(
    (select id from public.courses where name = 'Week Under Test'),
    (select mon from wk),
    (select id from public.branches where code = 'ERD'));

select t.eq((select count(*)::int from erode_rows), 7,
  'the branch-scoped answer is still seven rows');
select t.eq((select sum(present_count + absent_count)::int from erode_rows), 0,
  'and Erode recorded nothing that week, which is a real answer and not an error');
select t.eq((select bool_or(uploaded) from erode_rows), false,
  'so no day of it reads as uploaded');

-- --------------------------------------------------------------- 6. runs
select t.eq((select runs from wk_rows where day = (select mon from wk)), true,
  'Monday is a day this course runs, by its schedule');
select t.eq((select runs from wk_rows where day = (select mon from wk) + 5), false,
  'Saturday is not, so its cell is "not expected" rather than "awaiting upload"');
select t.eq((select count(*)::int from wk_rows where runs), 5,
  'five running days, which is what the schedule says');

-- ------------------------------------------------- 7. the security properties
-- Defect 6. Three tables whose RLS says "an active staff member". Under INVOKER
-- that rule still binds the caller.
select t.eq((select prosecdef from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'course_week_day_status'),
            false,
  'SECURITY INVOKER -- it cannot return a row its caller could not read directly');

select t.eq(has_function_privilege('anon',
              'public.course_week_day_status(uuid, date, uuid)', 'EXECUTE'),
            false,
  'anon cannot execute it -- the default grant to PUBLIC is revoked');

select t.eq(has_function_privilege('authenticated',
              'public.course_week_day_status(uuid, date, uuid)', 'EXECUTE'),
            true,
  'signed-in staff can');

select t.eq(has_function_privilege('service_role',
              'public.course_week_day_status(uuid, date, uuid)', 'EXECUTE'),
            true,
  'and so can service_role, which is what every Edge Function runs as');

select t.ok((select provolatile = 's' from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'course_week_day_status'),
  'STABLE, not VOLATILE -- it writes nothing, and a planner that knows that can hold it still within a statement');

-- ------------------------------------------- 8. re-applying 0067 is harmless
-- The harness replays every migration before every test file, so a
-- non-idempotent one shows up here. `create or replace` plus an explicit
-- revoke/grant is idempotent by construction; this asserts it stays that way.
select t.eq((select count(*)::int from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'course_week_day_status'),
            1,
  'exactly one course_week_day_status exists -- no overload crept in beside it');
