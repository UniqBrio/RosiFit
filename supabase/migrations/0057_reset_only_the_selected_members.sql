-- 0057 · a reset acts on the members who were SELECTED, not on the whole day
--
-- WHAT CHANGED AND WHO DECIDED IT
--   requests/2026-09-09-reset-only-the-selected-members.md. The requester's
--   words: "The reset of attendance should happend only when user selects the
--   members using select option and when they select members and click on
--   reset only those members attendance should be reset."
--
--   0056 cleared the DAY. Pressing Reset undid every mark on every member of
--   that course on that date, which is the right shape for "this file went to
--   the wrong course" and much too blunt for "these three rows are wrong". The
--   roster already grew a selection in the same round of work; this makes the
--   selection the thing the reset acts on.
--
-- THE SIGNATURE CHANGES MEANING, SO THE OLD ONE IS DROPPED
--   `p_delete_member_ids` named the members to DELETE; `p_member_ids` names
--   the members to RESET. Same type, opposite instruction. Left in place as an
--   overload, a stale caller passing the old argument would delete members it
--   meant to spare -- so 0056's function is removed rather than shadowed, and
--   any caller that has not been updated fails loudly with "function does not
--   exist" instead of quietly doing the worst possible thing.
--
-- THE DELETION LEAVES THIS FUNCTION ENTIRELY
--   The requester asked for it as its own control -- "enable multi selection
--   for no email section and enable delete option i.e bulk delete ask for
--   confirmation before delete". Deleting a member is not a variety of
--   resetting attendance; it is the irreversible act 0051 built delete_member
--   for, and folding it into a reset is what made one button carry two
--   different sizes of consequence. Bulk delete now calls delete_member once
--   per member, through the audited path, with its own confirmation.
--
-- THE DAY GOES BACK TO AWAITING ONLY WHEN NOTHING IS LEFT ON IT
--   This is the half that a per-member reset makes newly delicate. 0056 could
--   revert the session and the import unconditionally, because it had just
--   removed every row. Resetting three of eight members leaves a register that
--   is still a register: marking that session `scheduled` would put it back in
--   fetchPendingSessions as "awaiting a file" while five marks stand on it,
--   and releasing the import fingerprint would invite a re-upload on top of
--   them. So both steps are now conditional on the session holding no live
--   attendance row afterwards -- counted after the delete, never assumed.
--
--   The week strip needs no such condition: it derives `awaiting` from the
--   day holding no rows, so a partial reset simply leaves the day looking like
--   what it is. One fact, one source (guardrail 1).

-- 0056's signature is gone -- see the note above. drop, not replace: the
-- argument list differs, so `create or replace` would leave both callable.
drop function if exists public.reset_day_attendance(uuid, date, uuid[]);


-- ------------------------------------------------------------- the preview
-- Narrowed to the selected members when any are named, so the dialog counts
-- what is about to happen rather than what the day happens to hold.
create or replace function public.attendance_reset_preview(
  p_course_id    uuid,
  p_session_date date,
  /** the members the operator selected. Empty means the whole day. */
  p_member_ids   uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_marks     int := 0;
  v_members   int := 0;
  v_keeping   int := 0;
  v_deletable jsonb := '[]'::jsonb;
  v_all       boolean := coalesce(array_length(p_member_ids, 1), 0) = 0;
begin
  -- A preview writes nothing, but it READS names and addresses, so it is
  -- gated exactly as the write is. is_subscription_writable is deliberately
  -- NOT asked here: reading what a reset would do is not a write, and an
  -- academy whose billing has lapsed should still see the number first.
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can preview a reset'
      using errcode = '42501';
  end if;
  if p_course_id is null or p_session_date is null then
    raise exception 'a course and a day must both be named for a reset preview'
      using errcode = '22023';
  end if;

  with day_rows as (
    select a.id, a.member_id
      from public.attendance_records a
      join public.sessions s          on s.id = a.session_id and s.deleted_at is null
      join public.course_offerings o  on o.id = s.offering_id and o.deleted_at is null
     where o.course_id = p_course_id
       and s.session_date = p_session_date
       and a.deleted_at is null
       -- the selection, when there is one
       and (v_all or a.member_id = any (p_member_ids))
  ), marked as (
    select distinct member_id from day_rows
  )
  select
    (select count(*) from day_rows),
    (select count(*) from marked),
    (select count(*) from marked
       join public.members m2 on m2.id = marked.member_id
      where m2.deleted_at is null
        and exists (select 1 from public.member_emails me2
                     where me2.member_id = m2.id and me2.deleted_at is null)),
    coalesce((
      select jsonb_agg(t order by t->>'name')
        from (
          select jsonb_build_object(
                   'member_id',  m.id,
                   'name',       m.full_name,
                   'has_email',  false,
                   'other_days', (
                     select count(distinct s2.session_date)
                       from public.attendance_records a2
                       join public.sessions s2 on s2.id = a2.session_id
                                              and s2.deleted_at is null
                      where a2.member_id = m.id
                        and a2.deleted_at is null
                        and s2.session_date <> p_session_date)
                 ) as t
            from marked
            join public.members m on m.id = marked.member_id
           where m.deleted_at is null
             -- no LIVE address on file. A bounced address is still an address:
             -- send.ts stops using it, but the member is somebody the academy
             -- has contact details for and is not swept up here.
             and not exists (
               select 1 from public.member_emails me
                where me.member_id = m.id and me.deleted_at is null)
        ) rows
    ), '[]'::jsonb)
  into v_marks, v_members, v_keeping, v_deletable;

  return jsonb_build_object(
    'marks', v_marks, 'members', v_members, 'keeping', v_keeping,
    'deletable', v_deletable);
end $$;

revoke all on function public.attendance_reset_preview(uuid, date, uuid[]) from public, anon;
grant execute on function public.attendance_reset_preview(uuid, date, uuid[])
  to authenticated, service_role;

comment on function public.attendance_reset_preview(uuid, date, uuid[]) is
  'What resetting one day of one course would move, before anything is written -- narrowed to the selected members when any are named. Returns the marks, the members they name, how many of those have an address (the ones a reset only un-marks), and which have none. Writes nothing.';


-- --------------------------------------------------------------- the reset
create or replace function public.reset_day_attendance(
  p_course_id    uuid,
  p_session_date date,
  /** the members whose marks are cleared. Empty means every member on the
   *  day -- 0056's behaviour, kept for a caller that genuinely means the
   *  whole register. The app always names a selection. */
  p_member_ids   uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor      uuid := public.current_app_user_id();
  v_sessions   uuid[];
  v_members    uuid[];
  v_cleared    int := 0;
  v_reverted   int := 0;
  v_imports    int := 0;
  v_left       int := 0;
  v_all        boolean := coalesce(array_length(p_member_ids, 1), 0) = 0;
  v_session_id uuid;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicates the tables' own policies
  -- carry are restated here or this function is a hole straight through them.
  -- Both guards, the shape set_attendance (0035) and delete_member (0051) use:
  -- the role gate and the billing gate are different questions (0002) and
  -- neither stands in for the other.
  if v_actor is null or not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can reset a register'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the register was not reset'
      using errcode = '42501';
  end if;
  if p_course_id is null or p_session_date is null then
    raise exception 'a course and a day must both be named for a reset'
      using errcode = '22023';
  end if;

  -- Every live session this course ran that day, across every offering it
  -- has. A course that meets twice a day at two branches has two sessions on
  -- the date, and the day the operator is looking at is both of them.
  select coalesce(array_agg(s.id), '{}'::uuid[]) into v_sessions
    from public.sessions s
    join public.course_offerings o on o.id = s.offering_id and o.deleted_at is null
   where o.course_id = p_course_id
     and s.session_date = p_session_date
     and s.deleted_at is null;

  if array_length(v_sessions, 1) is null then
    return jsonb_build_object('cleared', 0, 'sessions_touched', 0,
                              'imports_reverted', 0, 'marks_left', 0);
  end if;

  -- Whose figures will need recomputing. Read BEFORE the rows go, because
  -- afterwards there is nothing left to read it from.
  select coalesce(array_agg(distinct a.member_id), '{}'::uuid[]) into v_members
    from public.attendance_records a
   where a.session_id = any (v_sessions) and a.deleted_at is null
     and (v_all or a.member_id = any (p_member_ids));

  -- ------------------------------------------------------- clear the marks
  -- Soft, so attendance_unique_live frees the slot for a re-import while the
  -- row survives for anybody reading the table directly. It is also what
  -- member_deletion_preview (0051) already counts, so the two functions agree
  -- about what a member's history is.
  update public.attendance_records a
     set deleted_at = now()
   where a.session_id = any (v_sessions) and a.deleted_at is null
     and (v_all or a.member_id = any (p_member_ids));
  get diagnostics v_cleared = row_count;

  -- WHAT IS STILL STANDING. The whole reason the two steps below are
  -- conditional: a partial reset leaves a register, and a register that is
  -- still a register must not be advertised as awaiting a file.
  select count(*) into v_left
    from public.attendance_records a
   where a.session_id = any (v_sessions) and a.deleted_at is null;

  if v_left = 0 then
    -- Only a COMPLETED session. `cancelled` is the academy's decision and
    -- `holiday` is the calendar (0017's triggers own that column); neither is
    -- something a reset may argue with, and neither ever held a register.
    update public.sessions s
       set status = 'scheduled', completed_at = null
     where s.id = any (v_sessions) and s.status = 'completed';
    get diagnostics v_reverted = row_count;

    -- 'reverted' has been a legal status since 0008 and
    -- csv_imports_sha_completed is partial on 'completed', so this is what
    -- lets the same export be uploaded again afterwards. Held back on a
    -- partial reset: releasing the fingerprint while marks still stand would
    -- invite a re-upload on top of them.
    update public.csv_imports i
       set status = 'reverted'
     where i.session_date = p_session_date
       and i.status = 'completed'
       and i.offering_id in (
         select o.id from public.course_offerings o where o.course_id = p_course_id);
    get diagnostics v_imports = row_count;
  end if;

  foreach v_session_id in array v_sessions loop
    perform public.refresh_session_counts(v_session_id);
  end loop;

  perform public.audit_log_as(v_actor, 'attendance.day_reset', 'course',
    p_course_id::text, '[]'::jsonb,
    jsonb_build_object('session_date', p_session_date,
                       'sessions', v_sessions,
                       'members_selected', coalesce(array_length(p_member_ids, 1), 0),
                       'marks_cleared', v_cleared,
                       'marks_left', v_left,
                       'sessions_reverted', v_reverted,
                       'imports_reverted', v_imports));

  -- Their figures are derived from the rows this just cleared, so leaving them
  -- would put a Missed count on a card over a register that no longer says it.
  if array_length(v_members, 1) is not null then
    perform public.recompute_member_stats(v_members);
  end if;

  return jsonb_build_object(
    'cleared', v_cleared,
    'sessions_touched', v_reverted,
    'imports_reverted', v_imports,
    'marks_left', v_left);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks its
-- caller itself, above.
revoke all on function public.reset_day_attendance(uuid, date, uuid[]) from public, anon;
grant execute on function public.reset_day_attendance(uuid, date, uuid[])
  to authenticated, service_role;

comment on function public.reset_day_attendance(uuid, date, uuid[]) is
  'Clears the marks of the SELECTED members on one day of one course (0057; 0056 cleared the whole day and its signature is dropped, because p_delete_member_ids and p_member_ids mean opposite things). Soft-deletes their attendance records, then -- ONLY if no live mark is left on the day''s sessions -- returns a COMPLETED session to ''scheduled'' and moves the day''s completed csv_imports to ''reverted'', which releases csv_imports_sha_completed so the same export can be uploaded again. A partial reset leaves both alone, because a register that still holds marks must not be advertised as awaiting a file. Deletes nobody: bulk deletion is delete_member''s job, with its own confirmation. Recomputes the stats of every member whose marks moved.';
