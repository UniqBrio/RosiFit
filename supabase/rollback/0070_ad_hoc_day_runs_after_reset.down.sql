-- ROLLBACK for 0070 — course_week_day_status, `runs` back to the timetable alone
--
-- Additive and reversible with no data loss: 0070 re-issued one function body
-- and nothing else. Undoing it is re-issuing 0067's body, which is what this
-- file is -- byte-for-byte the definition 0067 created, with the grants 0068
-- and 0069 left in force (a `create or replace` preserves the ACL either way).
--
-- WHAT COMES BACK IF YOU RUN THIS: a day the course is not timetabled on that
-- was uploaded and then reset reads as a dash again, with no upload press,
-- while the Attendance tab lists its session as awaiting a file. That is the
-- defect requests/2026-09-12-unscheduled-day-after-reset-offers-upload.md
-- describes. No screen breaks; the client never changed.
--
-- Run by hand:  psql "$DATABASE_URL" -f supabase/rollback/0070_ad_hoc_day_runs_after_reset.down.sql

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
  with days as (
    select (p_week_start + i)::date as day from generate_series(0, 6) i
  ),
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

comment on function public.course_week_day_status(uuid, date, uuid) is
  'Seven rows, one per day of the week beginning p_week_start, for one course. '
  'SECURITY INVOKER: the SELECT policies on attendance_records, sessions and '
  'course_offerings already express the rule (is_active_app_user()), so this '
  'cannot return a row its caller could not read directly. Replaces the course '
  'screen downloading the whole week of raw records to count them client-side '
  '(RC-039, RC-041).';
