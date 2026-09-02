-- 0018 · set_offering_schedule -- the write path 0005 promised and never built
--
-- 0005 left offering_schedules deliberately RPC-only: "no direct INSERT/UPDATE
-- policy at all, because a schedule write has to be validated against completed
-- sessions first". The policy was written. The RPC was not. The result was that
-- offering_schedules -- described in 0005 as *** THE source of expected
-- attendance *** -- could not be written by anybody except service_role, so a
-- course could state a frequency and never acquire the weekdays that frequency
-- is an intent ABOUT. No sessions, no expected attendance, no follow-up.
--
-- WHAT "VALIDATED AGAINST COMPLETED SESSIONS" MEANS HERE
-- A completed session has a FROZEN expected set (0007 session_expectations).
-- Moving a schedule back over one would leave the frozen rows describing days
-- the schedule no longer contains -- history saying one thing and the schedule
-- that produced it saying another. So a schedule may only take effect AFTER the
-- last completed session. Earlier is refused, never silently clamped.
--
-- VERSIONING, not overwriting: an existing open schedule is CLOSED the day
-- before the new one starts and the new one is inserted. The exclusion
-- constraint in 0005 already makes overlap impossible; this function closes the
-- old row so the constraint is satisfied by construction rather than by luck.
--
-- The one in-place case is a CORRECTION: a schedule starting on the very day
-- being set, with no completed session on or after it, has produced no history
-- yet, so its weekdays are edited rather than versioned. Versioning a same-day
-- correction would leave a zero-length predecessor describing nothing.
--
-- Sessions are NOT generated here. generate_sessions stays service_role-only
-- and csv-import still creates a session lazily when a file arrives for a date
-- (0014). Setting a schedule states when an offering runs; it does not
-- materialise dates, and this function deliberately does not change that.

create or replace function public.set_offering_schedule(
  p_offering_id   uuid,
  p_weekdays      smallint[],
  p_effective_from date,
  p_note          text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor          uuid;
  v_offering       record;
  v_last_completed date;
  v_weekdays       smallint[];
  v_existing       record;
  v_later          date;
  v_schedule_id    uuid;
  v_mode           text;
begin
  -- SECURITY DEFINER bypasses RLS, so the policy the org tables carry has to be
  -- restated here or this function would be a hole straight through it.
  if not public.is_super_admin() then
    raise exception 'only the super admin can set an offering schedule'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the schedule was not changed'
      using errcode = '42501';
  end if;
  v_actor := public.current_app_user_id();

  select o.id, o.course_id, o.branch_id into v_offering
    from public.course_offerings o
   where o.id = p_offering_id and o.deleted_at is null;
  if not found then
    raise exception 'that offering does not exist' using errcode = 'P0002';
  end if;

  if p_effective_from is null then
    raise exception 'a schedule needs a date it takes effect from' using errcode = '22004';
  end if;

  -- Deduplicated and sorted, so [3,1,1] and [1,3] are the same schedule and
  -- read back the same way. The CHECK constraints still guard the rest.
  select array_agg(d order by d) into v_weekdays
    from (select distinct unnest(p_weekdays) as d) u
   where d is not null;

  if coalesce(array_length(v_weekdays, 1), 0) = 0 then
    raise exception 'a schedule needs at least one weekday'
      using errcode = '23514';
  end if;
  if not (v_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]) then
    raise exception 'weekdays are 1 (Monday) to 7 (Sunday)'
      using errcode = '23514';
  end if;

  -- ---------------------------------------------- history may not be rewritten
  select max(s.session_date) into v_last_completed
    from public.sessions s
   where s.offering_id = p_offering_id
     and s.status = 'completed'
     and s.deleted_at is null;

  if v_last_completed is not null and p_effective_from <= v_last_completed then
    raise exception
      'this offering has a completed session on %, so a schedule cannot start on or before it. Choose % or later.',
      v_last_completed, v_last_completed + 1
      using errcode = '55000';
  end if;

  -- A schedule already starting LATER would overlap the open-ended row this
  -- inserts. Refused with the date, rather than surfacing an exclusion
  -- violation the operator cannot act on.
  select min(os.effective_from) into v_later
    from public.offering_schedules os
   where os.offering_id = p_offering_id and os.effective_from > p_effective_from;
  if v_later is not null then
    raise exception
      'a later schedule already starts on %. Remove or supersede it before setting one from %.',
      v_later, p_effective_from
      using errcode = '55000';
  end if;

  select os.id into v_existing
    from public.offering_schedules os
   where os.offering_id = p_offering_id and os.effective_from = p_effective_from;

  if found then
    -- Correction: nothing completed has run under it, so there is no history to
    -- preserve and a new version would only add an empty one.
    update public.offering_schedules
       set weekdays = v_weekdays,
           note     = coalesce(p_note, note),
           created_by = coalesce(created_by, v_actor)
     where id = v_existing.id
     returning id into v_schedule_id;
    v_mode := 'corrected';
  else
    -- Close the open row the day before, then open the new one.
    update public.offering_schedules
       set effective_to = p_effective_from - 1
     where offering_id = p_offering_id
       and effective_to is null
       and effective_from < p_effective_from;

    insert into public.offering_schedules
      (offering_id, effective_from, weekdays, note, created_by)
    values (p_offering_id, p_effective_from, v_weekdays, p_note, v_actor)
    returning id into v_schedule_id;
    v_mode := 'versioned';
  end if;

  -- audit_schedules (0005) fires on the row itself, so the change is recorded
  -- without a second, hand-written audit call that could drift from it.
  return jsonb_build_object(
    'schedule_id',       v_schedule_id,
    'offering_id',       p_offering_id,
    'effective_from',    p_effective_from,
    'weekdays',          v_weekdays,
    'sessions_per_week', coalesce(array_length(v_weekdays, 1), 0),
    'mode',              v_mode);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the app calls this as the
-- signed-in super admin -- the function re-checks that itself, above.
revoke all on function public.set_offering_schedule(uuid, smallint[], date, text)
  from public, anon;
grant execute on function public.set_offering_schedule(uuid, smallint[], date, text)
  to authenticated, service_role;

comment on function public.set_offering_schedule(uuid, smallint[], date, text) is
  'The ONLY write path to offering_schedules (0005 left the table policy-less on purpose). Refuses any effective_from on or before the offering''s last completed session, so a frozen expectation can never be contradicted by the schedule that produced it. Does not generate sessions.';
