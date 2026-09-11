-- 0067 — seven day statuses instead of a week of raw rows
--
-- WHY
--   The course screen needs SEVEN DAY STATUSES. To get them it downloads every
--   attendance record in the week, for every course, and counts them in
--   JavaScript. In production that is 3,110 rows and ~673 kB per screen open,
--   and it is the same 673 kB whichever course is opened. Paging makes that
--   CORRECT (RC-039, RC-041); it does not make it sensible.
--
--   It is also the reason RC-039 was reachable at all. A screen that derives a
--   status from a pile of rows can be wrong about the status by receiving the
--   wrong pile. A screen that asks for the status cannot.
--
-- SECURITY INVOKER, deliberately, and this is a DEPARTURE from
-- member_period_metrics beside it.
--   The three tables read here carry one SELECT policy each, and all three are
--   the same: `is_active_app_user()` for `authenticated`. There is no row-level
--   tenant scoping to reproduce -- the rule is "an active staff member", and
--   RLS already says it. So INVOKER is not merely acceptable here, it is
--   STRICTLY SAFER: the function cannot return a row the caller could not have
--   read directly, and there is no SECURITY DEFINER escape hatch to revoke from
--   `anon` afterwards (which is what migrations 0011 and 0012 had to do for
--   every DEFINER function in this schema).
--   It still gets an explicit revoke/grant pair below, because the default
--   grant on a new function is EXECUTE to PUBLIC, and PUBLIC includes `anon`.
--
-- DEPENDS ON these RLS policies (unchanged by this migration):
--   attendance_records.attendance_read     SELECT, authenticated, is_active_app_user()
--   sessions.sessions_read                 SELECT, authenticated, is_active_app_user()
--   course_offerings.course_offerings_read SELECT, authenticated, is_active_app_user()
--   offering_schedules                     read by the same staff rule
--
-- ADDITIVE. It creates one function. No table, column, index or constraint is
-- touched, so there is no rewrite, no lock beyond the catalogue, and nothing
-- to check against existing rows before applying.
--
-- Rollback: supabase/rollback/0067_course_week_day_status.down.sql

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
  -- a day with no records is a row saying so rather than a row that is absent.
  -- "Absent from the result" is the shape the screen used to have to interpret,
  -- and interpreting it is what printed "Awaiting upload" over four uploaded
  -- days (RC-039).
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
         exists (select 1 from runs_on r
                  where r.weekday = extract(isodow from d.day)::int) as runs
    from days d
    left join marks m on m.day = d.day
   order by d.day
$$;

-- The default grant on a new function is EXECUTE to PUBLIC, and PUBLIC includes
-- anon. Same shape as migrations 0011/0012 for every other read function here.
revoke all on function public.course_week_day_status(uuid, date, uuid) from public;
grant execute on function public.course_week_day_status(uuid, date, uuid)
  to authenticated, service_role;

comment on function public.course_week_day_status(uuid, date, uuid) is
  'Seven rows, one per day of the week beginning p_week_start, for one course. '
  'SECURITY INVOKER: the SELECT policies on attendance_records, sessions and '
  'course_offerings already express the rule (is_active_app_user()), so this '
  'cannot return a row its caller could not read directly. Replaces the course '
  'screen downloading the whole week of raw records to count them client-side '
  '(RC-039, RC-041).';
