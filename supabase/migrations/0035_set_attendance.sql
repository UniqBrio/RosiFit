-- 0035 · set_attendance -- the first way a person may write attendance
--
-- WHAT WAS MISSING
--   Attendance has had exactly one way in since 0008: a Google Meet export,
--   parsed and committed by commit_csv_import. That is the right default --
--   `authenticated` holds only `select` on attendance_records, so a stolen
--   anon key cannot forge attendance -- but it left no way to correct the
--   register. A member who joined the class from another device is missing
--   from the file, is recorded absent, counts towards the follow-up rule and
--   is emailed about sessions she attended. Nobody could fix that anywhere.
--
--   The roster card now carries three chips -- Present · Absent · Yet to
--   mark -- for the day the week strip has selected, and this is what they
--   call.
--
-- WHY AN RPC and not a grant on the table
--   Widening `authenticated` to update attendance_records would put four
--   invariants in the client's hands, where every one of them is one bug
--   from being wrong:
--
--     * `expected` decides whether a row counts towards her attendance
--       percentage and towards the follow-up rule. Derived here from
--       expected_members_for_session(), it cannot be asserted by a caller.
--     * absent_must_be_expected and extra_is_not_expected (0008) would be
--       met by a CHECK violation with a constraint name for a message
--       instead of a sentence a person can act on.
--     * a session must EXIST before a record can hang off it, and 0024 is
--       the migration that exists because "a session already existed" was
--       the wrong assumption.
--     * `corrected_by` needs the actor's public.app_users id, which the
--       client does not hold -- it has an auth uid, and resolving it is
--       current_app_user_id()'s job (0023).
--
--   RC-007 is the other half of the reason: every narrow table grant in
--   0002-0010 was a no-op over Supabase's default privileges, and the repair
--   in 0015 is what makes "authenticated cannot write attendance" true. This
--   migration does not touch a single table grant, so that stays true.
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   It cannot clear an attendance record. The three chips offer Present and
--   Absent; "yet to mark" is a state, not an action, because a deleted
--   record is a hole in the register rather than a correction -- and the
--   mistake it would fix is already fixed by picking the other chip.
--   It refuses a future date, a cancelled class and a holiday, and it never
--   invents an enrolment: a member with no offering in force on that date is
--   told so rather than filed against a guess.
--
-- IDEMPOTENT: marking the status she already holds returns changed=false and
-- leaves corrected_at alone, so a double tap on a slow connection does not
-- rewrite when the correction was made.

create or replace function public.set_attendance(
  p_member_id uuid,
  /** the day being marked -- the one selected in the week strip */
  p_date      date,
  /** what the person chose: 'present' or 'absent'. What is STORED may be
   *  'extra' -- see below; the caller does not get to say so. */
  p_status    text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor        uuid := public.current_app_user_id();
  v_member       record;
  v_offering     record;
  v_session      record;
  v_session_id   uuid;
  v_on_schedule  boolean;
  v_expected     boolean;
  v_stored       text;
  v_existing     record;
  v_new_session  boolean := false;
  v_dayname      text := to_char(p_date, 'FMDay');
begin
  -- SECURITY DEFINER bypasses RLS, so the predicates the table's own policies
  -- carry are restated here or this function is a hole straight through them.
  -- Same shape as set_member_status (0031).
  if v_actor is null or not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can mark attendance'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so her attendance was not changed'
      using errcode = '42501';
  end if;

  if p_status is null or p_status not in ('present', 'absent') then
    raise exception 'attendance is marked present or absent -- % is not one of them',
      coalesce(p_status, 'nothing') using errcode = '22023';
  end if;
  if p_date is null then
    raise exception 'a day must be named for attendance to be marked against'
      using errcode = '22023';
  end if;
  -- A class that has not happened has no attendance to record. The screen
  -- disables the chips on a future date; this is the same rule where it
  -- cannot be got round.
  if p_date > current_date then
    raise exception '% has not happened yet', to_char(p_date, 'FMDD FMMon YYYY')
      using errcode = '22023';
  end if;

  select m.id, m.full_name into v_member
    from public.members m
   where m.id = p_member_id and m.deleted_at is null;
  if not found then
    raise exception 'that member is not on the register' using errcode = 'P0002';
  end if;

  -- Her OFFERING is read from the enrolment in force on that date, never
  -- passed in: the course and branch a caller sends are a caller's opinion,
  -- and one active enrolment (0006) means there is nothing to choose.
  select o.id, o.start_time, o.end_time into v_offering
    from public.member_enrollments e
    join public.course_offerings o on o.id = e.offering_id and o.deleted_at is null
   where e.member_id = p_member_id
     and e.status = 'active'
     and p_date >= e.effective_from
     and (e.effective_to is null or p_date <= e.effective_to)
   order by e.effective_from desc
   limit 1;
  if not found then
    raise exception '% was not enrolled in a course on %',
      v_member.full_name, to_char(p_date, 'FMDD FMMon YYYY') using errcode = 'P0002';
  end if;

  -- ------------------------------------------------------- find or create
  -- 0024 exists because the upload assumed a session already existed. A
  -- course whose classes are not on a fixed timetable has no scheduled rows
  -- at all, so marking somebody on one has to be able to create the session
  -- it hangs off. sessions_unique_live (offering_id, session_date) is what
  -- stops that becoming a rival of a real one.
  select s.id, s.status into v_session
    from public.sessions s
   where s.offering_id = v_offering.id and s.session_date = p_date
     and s.deleted_at is null
   for update;

  if found then
    v_session_id := v_session.id;
    -- A class that did not run has no attendance. Saying which of the two it
    -- was matters: "cancelled" is the academy's decision and "closed" is the
    -- holiday calendar, and neither is something to argue with from a chip.
    if v_session.status = 'cancelled' then
      raise exception 'that class was cancelled, so there is no attendance to mark'
        using errcode = '55000';
    end if;
    if v_session.status = 'holiday' then
      raise exception 'the academy was closed on %, so there is no attendance to mark',
        to_char(p_date, 'FMDD FMMon YYYY') using errcode = '55000';
    end if;
  else
    -- The same expectation rule 0024 landed on: the schedule decides when it
    -- covers the date, and everyone enrolled is expected when it does not.
    -- Answering "nobody was expected" for a class that really happened is
    -- how a session records no absences and the follow-up engine goes blind.
    select exists (
      select 1 from public.offering_schedules os
       where os.offering_id = v_offering.id
         and p_date >= os.effective_from
         and (os.effective_to is null or p_date <= os.effective_to)
         and extract(isodow from p_date)::smallint = any (os.weekdays)
    ) into v_on_schedule;

    insert into public.sessions
      (offering_id, session_date, start_time, end_time, status, source,
       expectation_mode, created_by)
    values
      (v_offering.id, p_date, v_offering.start_time, v_offering.end_time,
       'completed', 'manual',
       case when v_on_schedule then 'schedule' else 'all_enrolled' end,
       v_actor)
    returning id into v_session_id;
    v_new_session := true;

    perform public.audit_log_as(v_actor, 'attendance.session_created', 'session',
      v_session_id::text, '[]'::jsonb,
      jsonb_build_object('offering_id', v_offering.id, 'session_date', p_date,
                         'on_schedule', v_on_schedule));
  end if;

  -- A session that is still 'scheduled' has now been marked by a person, so
  -- it has happened. It matters beyond tidiness: recompute_member_stats
  -- counts only records on COMPLETED sessions, so leaving it scheduled would
  -- record the attendance and move none of her figures.
  update public.sessions
     set status = 'completed', completed_at = now()
   where id = v_session_id and status = 'scheduled';

  -- ------------------------------------------------------------ expected
  -- Never the caller's word. This is what satisfies both CHECK constraints
  -- on 0008 without a constraint name ever reaching a person.
  v_expected := exists (
    select 1 from public.expected_members_for_session(v_session_id) em
     where em.member_id = p_member_id);

  if p_status = 'absent' and not v_expected then
    raise exception '% was not expected on % -- mark her present and it is recorded as extra',
      v_member.full_name, v_dayname using errcode = '22023';
  end if;
  -- She turned up when she was not expected. That is what 'extra' is, and it
  -- never counts as a miss.
  v_stored := case when p_status = 'present' and not v_expected then 'extra' else p_status end;

  -- ------------------------------------------------------------- the row
  select a.id, a.status, a.original_status, a.import_id into v_existing
    from public.attendance_records a
   where a.session_id = v_session_id and a.member_id = p_member_id
     and a.deleted_at is null
   for update;

  if found then
    if v_existing.status = v_stored then
      return jsonb_build_object(
        'member_id', p_member_id, 'full_name', v_member.full_name,
        'date', p_date, 'status', v_existing.status, 'expected', v_expected,
        'changed', false, 'session_created', v_new_session);
    end if;
    -- The correction columns 0008 created and nothing has ever written.
    -- original_status is stamped ONCE: it is what the register said before a
    -- person first disagreed with it, and a second correction must not
    -- overwrite that with the first correction's answer.
    update public.attendance_records
       set status            = v_stored,
           expected          = v_expected,
           original_status   = coalesce(v_existing.original_status, v_existing.status),
           correction_reason = 'marked by hand on the course roster',
           corrected_by      = v_actor,
           corrected_at      = now()
     where id = v_existing.id;
    -- audit_attendance (0008) is an AFTER UPDATE trigger, so the change above
    -- is already in the log with its old and new values.
  else
    insert into public.attendance_records
      (session_id, member_id, status, expected, created_by)
    values (v_session_id, p_member_id, v_stored, v_expected, v_actor)
    on conflict (session_id, member_id) where deleted_at is null do update
      set status = excluded.status, expected = excluded.expected;
    -- There is no INSERT trigger on this table -- audit_attendance fires on
    -- UPDATE only -- so the first mark says so itself, or a record appears
    -- in the register with nobody's name on it.
    perform public.audit_log_as(v_actor, 'attendance.marked', 'member',
      p_member_id::text,
      jsonb_build_array(jsonb_build_object('field', 'status', 'old', null, 'new', v_stored)),
      jsonb_build_object('session_id', v_session_id, 'session_date', p_date,
                         'expected', v_expected));
  end if;

  perform public.refresh_session_counts(v_session_id);
  -- ONE member. recompute_member_stats(null) walks every member in the
  -- academy, which is right for an import of a whole session and wrong for
  -- one tap on one card.
  perform public.recompute_member_stats(array[p_member_id]);

  return jsonb_build_object(
    'member_id', p_member_id, 'full_name', v_member.full_name,
    'date', p_date, 'status', v_stored, 'expected', v_expected,
    'changed', true, 'session_created', v_new_session);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks its
-- caller itself, above.
revoke all on function public.set_attendance(uuid, date, text) from public, anon;
grant execute on function public.set_attendance(uuid, date, text) to authenticated, service_role;

comment on function public.set_attendance(uuid, date, text) is
  'The ONLY client-reachable write path into attendance_records. Marks one member present or absent on one date: resolves her offering from the enrolment in force, finds or creates that day''s session (0024''s rule for expectation_mode), derives `expected` from expected_members_for_session so the caller cannot assert it, stores an unexpected attender as ''extra'', and records a change to an existing row in original_status/corrected_by/corrected_at. Refuses a future date, a cancelled class and a holiday. Idempotent. No table grant is widened by this: authenticated still holds only SELECT on attendance_records.';
