\echo 'course_week_day_status: a day a session was held on runs, timetable or not'
--
-- 0070. `runs` was "is this weekday on the timetable". The strip uses it to
-- decide whether an un-uploaded day is AWAITING a file or NOT EXPECTED, and a
-- day the course was not timetabled on but a file was uploaded for -- and then
-- reset -- is a day a file can be uploaded for. requests/2026-09-12-
-- unscheduled-day-after-reset-offers-upload.md; the production case is
-- Prenatal on Tue 8 Sep 2026.
--
-- WHAT COULD GO WRONG THAT NOTHING ELSE WOULD CATCH:
--
--   1. The fix is not there: an ad-hoc day whose marks were reset reads
--      runs = false, the strip draws a dash, and the Attendance tab lists the
--      same session as awaiting. This is the defect, and it is the assertion
--      that must FAIL against 0067.
--   2. It over-reaches: a weekday the course does not run and never held a
--      session starts reading "awaiting" -- which promises an upload that is
--      never coming (ADR-023 gives that reason for the roster's Not expected).
--   3. A soft-deleted session, or a cancelled one, counts. Neither can take a
--      file -- 0056 says cancelled and holiday "never held a register" -- and
--      neither is listed as awaiting anywhere else.
--   4. The branch filter is ignored for the new condition: a session held at
--      Erode makes Salem's strip say the day runs.
--   5. The timetable half regresses: a timetabled weekday with no session
--      stops reading runs = true.
--   6. The re-issue changes something else about the function: a second
--      overload, DEFINER, VOLATILE, or a grant it should not carry.

begin;
  insert into auth.users (id) values ('eeeeeeee-0000-0000-0000-000000000002');
  insert into public.app_users (id, auth_user_id, kind, name, phone_e164)
    values ('eeeeeeee-1111-0000-0000-000000000002',
            'eeeeeeee-0000-0000-0000-000000000002','super_admin','Ad Hoc Owner','+919994871192');

  insert into public.branches (name, code, city)
    values ('Salem','SLM','Salem'), ('Erode','ERD','Erode');

  insert into public.courses (name, default_start_time, default_end_time, default_frequency)
    values ('Ad Hoc Week','07:00','08:00',5);

  insert into public.course_offerings (course_id, branch_id, start_time, end_time)
    select c.id, b.id, '07:00', '08:00'
      from public.courses c, public.branches b
     where c.name = 'Ad Hoc Week' and b.code in ('SLM','ERD');

  -- Monday to Friday, at both branches. Saturday and Sunday are OFF the
  -- timetable, which is what the whole file is about.
  insert into public.offering_schedules (offering_id, effective_from, weekdays)
    select o.id, current_date - 400, array[1,2,3,4,5]::smallint[]
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where c.name = 'Ad Hoc Week';
commit;

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = 'eeeeeeee-0000-0000-0000-000000000002';
  select public.create_member(n.name,
           (select o.id from public.course_offerings o
              join public.courses c on c.id = o.course_id
              join public.branches b on b.id = o.branch_id
             where c.name = 'Ad Hoc Week' and b.code = 'SLM'),
           null, array[]::text[], array[n.email]::text[], null)
    from (values ('Asha Salem','asha.adhoc@gmail.com'),
                 ('Bindu Salem','bindu.adhoc@gmail.com')) as n(name, email);
commit;

-- ------------------------------------------------------------- the fixture week
-- Last week's Monday, so the seven days line up with isodow the way the
-- screen's week does and none of them is in the future.
create temp table wk as select (date_trunc('week', current_date) - interval '7 days')::date as mon;

begin;
  -- SATURDAY: an ad-hoc class. The file landed (0024 created the session with
  -- source 'import' and expected everyone enrolled), and then the day was
  -- RESET (0056): the marks are soft-deleted and the session is back to
  -- 'scheduled'. This is exactly the shape of Prenatal on Tue 8 Sep 2026.
  insert into public.sessions (offering_id, session_date, start_time, end_time, status, source, expectation_mode)
    select o.id, (select mon from wk) + 5, '07:00', '08:00', 'scheduled', 'import', 'all_enrolled'
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
      join public.branches b on b.id = o.branch_id
     where c.name = 'Ad Hoc Week' and b.code = 'SLM';
  insert into public.attendance_records (session_id, member_id, status, expected, deleted_at)
    select s.id, m.id, 'present', true, now()
      from public.sessions s, public.members m
     where s.session_date = (select mon from wk) + 5
       and m.full_name in ('Asha Salem','Bindu Salem');

  -- SUNDAY: two sessions that must NOT make the day run. One is CANCELLED --
  -- the academy's decision, never a register -- and one, at the other branch,
  -- is SOFT-DELETED. sessions_unique_live is partial on deleted_at, so the
  -- deleted one sits beside a live one on the same offering without conflict.
  insert into public.sessions (offering_id, session_date, start_time, end_time, status, source)
    select o.id, (select mon from wk) + 6, '07:00', '08:00', 'cancelled', 'manual'
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
      join public.branches b on b.id = o.branch_id
     where c.name = 'Ad Hoc Week' and b.code = 'SLM';
  insert into public.sessions (offering_id, session_date, start_time, end_time, status, source, deleted_at)
    select o.id, (select mon from wk) + 6, '07:00', '08:00', 'scheduled', 'import', now()
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
      join public.branches b on b.id = o.branch_id
     where c.name = 'Ad Hoc Week' and b.code = 'ERD';
commit;

create temp table adhoc_rows as
  select * from public.course_week_day_status(
    (select id from public.courses where name = 'Ad Hoc Week'),
    (select mon from wk));

-- --------------------------------------------------------------- still a week
select t.eq((select count(*)::int from adhoc_rows), 7,
  'SEVEN ROWS, still -- the re-issue changes one column and not the shape');

-- ---------------------------------------------------------- 1. THE DEFECT
-- The assertion that fails against 0067. Saturday holds a live session a file
-- can be uploaded for, and its marks were withdrawn; the strip must offer the
-- upload again rather than draw a dash over a session the Attendance tab
-- lists as awaiting.
select t.eq((select uploaded from adhoc_rows where day = (select mon from wk) + 5), false,
  'Saturday was reset, so nothing is uploaded for it');
select t.eq((select runs from adhoc_rows where day = (select mon from wk) + 5), true,
  'AND SATURDAY RUNS: a session was held that day, timetable or not, so the day awaits a file');

-- ------------------------------------------------- 2. no over-reach
-- Sunday holds a cancelled session and a soft-deleted one. Neither can take a
-- file, so the day is still "not expected".
select t.eq((select runs from adhoc_rows where day = (select mon from wk) + 6), false,
  'Sunday does NOT run -- a cancelled session and a deleted one are not a day awaiting a file');
select t.eq((select uploaded from adhoc_rows where day = (select mon from wk) + 6), false,
  'and nothing is uploaded for it either');

-- ------------------------------------------------- 3. the timetable half holds
select t.eq((select runs from adhoc_rows where day = (select mon from wk)), true,
  'Monday runs by the timetable alone -- no session was ever created for it');
select t.eq((select runs from adhoc_rows where day = (select mon from wk) + 4), true,
  'so does Friday');
select t.eq((select count(*)::int from adhoc_rows where runs), 6,
  'SIX running days: the five the timetable names plus the Saturday a class was held on');

-- ------------------------------------------------- 4. the branch filter binds
-- The Saturday session is at Salem. Asked about Erode, the day does not run.
create temp table adhoc_erode as
  select * from public.course_week_day_status(
    (select id from public.courses where name = 'Ad Hoc Week'),
    (select mon from wk),
    (select id from public.branches where code = 'ERD'));

select t.eq((select runs from adhoc_erode where day = (select mon from wk) + 5), false,
  'Erode held no class that Saturday, so ERODE''S strip does not say the day runs');
select t.eq((select runs from adhoc_erode where day = (select mon from wk)), true,
  'while its Monday still runs, by the timetable');

create temp table adhoc_salem as
  select * from public.course_week_day_status(
    (select id from public.courses where name = 'Ad Hoc Week'),
    (select mon from wk),
    (select id from public.branches where code = 'SLM'));

select t.eq((select runs from adhoc_salem where day = (select mon from wk) + 5), true,
  'and Salem''s strip does, because the session is at Salem');

-- ------------------------------------------------- 5. the re-issue changed nothing else
select t.eq((select count(*)::int from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'course_week_day_status'),
            1,
  'exactly one course_week_day_status exists -- no overload crept in beside it');

select t.eq((select prosecdef from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'course_week_day_status'),
            false,
  'still SECURITY INVOKER -- it cannot return a row its caller could not read directly');

select t.ok((select provolatile = 's' from pg_proc p
              join pg_namespace n on n.oid = p.pronamespace
             where n.nspname = 'public' and p.proname = 'course_week_day_status'),
  'still STABLE');

-- Grants: worth having, and worth nothing as evidence about production (KL-008).
-- The rung that binds is src/data/migrationGrants.test.ts, which reads the text.
select t.eq(has_function_privilege('anon',
              'public.course_week_day_status(uuid, date, uuid)', 'EXECUTE'),
            false,
  'anon cannot execute it HERE -- which proves nothing about production, see KL-008');
select t.eq(has_function_privilege('authenticated',
              'public.course_week_day_status(uuid, date, uuid)', 'EXECUTE'),
            true,
  'signed-in staff can');
