-- 0070 — a day a session was held on RUNS, whether or not the timetable says so
--
-- requests/2026-09-12-unscheduled-day-after-reset-offers-upload.md. The
-- requester's words: "when i upload a file on day when its not scheduled then
-- since for that day attendance was upload hen we should be able to reset
-- aattendance and show that upload again button right".
--
-- WHAT WENT WRONG
--   The course week strip asks 0067 one question of an un-uploaded day --
--   `runs` -- and turns the answer into a status: true is AWAITING UPLOAD,
--   with the press that opens the dated upload (ADR-036); false is NOT
--   EXPECTED, a dash, nothing to press. 0067 computed `runs` from
--   offering_schedules alone: "is this weekday on the timetable".
--
--   That is the right question for a day nothing ever happened on, and the
--   wrong one for a day a file was uploaded for and then RESET. An upload on
--   an unscheduled day creates a session for it (0024); a reset soft-deletes
--   the marks and puts that session back to 'scheduled' (0056). The session
--   is still there. fetchPendingSessions lists it as awaiting a file, because
--   it reads sessions.status. The strip drew a dash over it, because it read
--   the timetable. Two screens disagreeing about one day is the shape
--   guardrail 1 exists to prevent, and it is what the requester saw.
--
--   Production, 12-Sep-2026: Prenatal, Tue 8 Sep. Prenatal runs Mon/Wed/Fri;
--   a file was uploaded for the Tuesday and reset. sessions holds it as
--   scheduled / import / all_enrolled with zero live marks. The strip: a dash.
--
-- THE FIX, and it is one condition
--   `runs` is now "the timetable names this weekday" OR "a live session a
--   register can be uploaded against exists on this date". The second half is
--   scoped exactly as the first: this course, the branches in scope, live
--   offerings only. `status in ('scheduled','completed')` and nothing else --
--   0056 says of cancelled and holiday sessions that neither "ever held a
--   register", and neither is listed as awaiting anywhere in the app, so
--   neither may make the strip say a file is expected.
--
--   Nothing on the client changes. dayStatusKey (src/data/dayLoad.ts) already
--   maps runs-and-not-uploaded to `awaiting`, and the strip already draws the
--   press on an awaiting day of the current week that has arrived. The answer
--   is computed in one place and this is that place (CP-023).
--
-- WHAT DOES NOT CHANGE, and 48 goes on asserting it
--   The other five columns. Seven rows always. SECURITY INVOKER (the three
--   tables' RLS already says "an active staff member"; sessions is read under
--   the same policy). STABLE. A timetabled weekday with no session still runs;
--   a weekday the course does not run with no session still does not.
--
-- `create or replace`, SAME signature, SAME return type. PostgreSQL preserves
-- a function's ACL across CREATE OR REPLACE (0069 corrects the earlier claim
-- that it does not), so the revoke 0068 applied and the default 0069 restored
-- both stand. The revoke/grant pair is restated below anyway, naming anon
-- DIRECTLY as 0012 and 0068 do, so that this file is correct on its own and
-- src/data/migrationGrants.test.ts can read it as such.
--
-- ADDITIVE and reversible without data loss: nothing but a function body.
-- Rollback: supabase/rollback/0070_ad_hoc_day_runs_after_reset.down.sql

create or replace function public.course_week_day_status(
  p_course_id  uuid,
  p_week_start date,
  p_branch_id  uuid default null
) returns table (
  day            date,
  uploaded       boolean,
  present_count  int,
  absent_count   int,
  expected_count int,
  runs           boolean
)
language sql stable security invoker set search_path = public as $$
  -- SEVEN ROWS, ALWAYS. Generated from the week rather than from the data, so
  -- a day with no records is a row saying so rather than a row that is absent
  -- (0067, RC-039).
  with days as (
    select (p_week_start + i)::date as day from generate_series(0, 6) i
  ),
  -- The weekdays this course runs, at the branches in scope. 1..7 with Monday
  -- = 1, which is what offering_schedules.weekdays stores and what isodow
  -- returns. A schedule that had not started, or had ended, before this week
  -- does not count.
  runs_on as (
    select distinct unnest(os.weekdays)::int as weekday
      from public.offering_schedules os
      join public.course_offerings co on co.id = os.offering_id
     where co.course_id = p_course_id
       and co.deleted_at is null
       and (p_branch_id is null or co.branch_id = p_branch_id)
       and (os.effective_from is null or os.effective_from <= p_week_start + 6)
       and (os.effective_to   is null or os.effective_to   >= p_week_start)
  ),
  -- THE DATES A SESSION WAS HELD ON, timetable or not. A file uploaded for a
  -- day the course is not timetabled on creates a session for it (0024), and
  -- a reset leaves that session in place, back at 'scheduled' (0056). Such a
  -- day is one a file can be uploaded for, and the strip must say so rather
  -- than draw a dash over a session the Attendance tab lists as awaiting.
  -- Only a session a register can be uploaded against: cancelled and holiday
  -- sessions "never held a register" (0056) and are listed as awaiting nowhere.
  held_on as (
    select distinct s.session_date as day
      from public.sessions s
      join public.course_offerings co on co.id = s.offering_id
     where s.deleted_at is null
       and s.status in ('scheduled', 'completed')
       and co.course_id = p_course_id
       and co.deleted_at is null
       and (p_branch_id is null or co.branch_id = p_branch_id)
       and s.session_date between p_week_start and p_week_start + 6
  ),
  -- 'extra' reads as present, because that is what happened: somebody turned
  -- up when nobody expected them (0008). The distinction is about EXPECTATION
  -- and it is carried by expected_count, exactly as dayAttendance does it
  -- client-side today -- one derivation, two places, same answer.
  marks as (
    select s.session_date                                              as day,
           count(*) filter (where a.status in ('present','extra'))::int as present_count,
           count(*) filter (where a.status = 'absent')::int             as absent_count,
           count(*) filter (where a.expected)::int                      as expected_count
      from public.attendance_records a
      join public.sessions s          on s.id = a.session_id and s.deleted_at is null
      join public.course_offerings co on co.id = s.offering_id
     where a.deleted_at is null
       and co.course_id = p_course_id
       and (p_branch_id is null or co.branch_id = p_branch_id)
       and s.session_date between p_week_start and p_week_start + 6
     group by s.session_date
  )
  select d.day,
         -- UPLOADED IS THE EXISTENCE OF RECORDS, not a count above zero. A day
         -- whose file arrived and recorded nothing but absences has
         -- present_count 0, and it is not an un-uploaded day.
         (m.day is not null)            as uploaded,
         coalesce(m.present_count, 0),
         coalesce(m.absent_count, 0),
         coalesce(m.expected_count, 0),
         -- RUNS: the timetable names this weekday, OR a class was actually
         -- held on this date. Either way a file is expected for it.
         (exists (select 1 from runs_on r
                   where r.weekday = extract(isodow from d.day)::int)
          or exists (select 1 from held_on h where h.day = d.day)) as runs
    from days d
    left join marks m on m.day = d.day
   order by d.day
$$;

-- Restated so this file stands on its own. Both halves, as RC-042 taught:
-- the PUBLIC grant AND the direct one Supabase's default privileges hand out.
revoke all on function public.course_week_day_status(uuid, date, uuid) from public;
revoke execute on function public.course_week_day_status(uuid, date, uuid) from anon;
grant execute on function public.course_week_day_status(uuid, date, uuid)
  to authenticated, service_role;

comment on function public.course_week_day_status(uuid, date, uuid) is
  'Seven rows, one per day of the week beginning p_week_start, for one course. '
  'SECURITY INVOKER: the SELECT policies on attendance_records, sessions and '
  'course_offerings already express the rule (is_active_app_user()), so this '
  'cannot return a row its caller could not read directly. Replaces the course '
  'screen downloading the whole week of raw records to count them client-side '
  '(RC-039, RC-041). Since 0070, `runs` is true for a weekday the timetable names '
  'OR a date a live scheduled/completed session exists on -- so a day uploaded '
  'off the timetable and then reset reads as awaiting a file, agreeing with the '
  'Attendance tab, instead of as a dash.';
