-- 0020 · delete_course -- what "the course and its sessions are removed" means
--
-- WHAT WAS MISSING
--   The canvas gives the Courses list a delete, and its confirmation states
--   the promise the deletion has to keep:
--
--     "N members are enrolled. Their attendance history stays, but the
--      course and its sessions are removed."
--
--   Nothing behind it existed. `confirmDelCourse` in the canvas flashes
--   "<name> deleted" and changes nothing, and the app had no delete at all.
--   A soft delete written from the client could not keep that promise either:
--
--     * `courses` has deleted_at and an UPDATE policy, so a client CAN hide
--       the course row. Its offerings would stay live, and every read of
--       expected attendance goes through course_offerings ->
--       offering_schedules -> sessions, not through courses. The course
--       would vanish from the list while its sessions went on being
--       expected, counted and followed up -- a course nobody can see still
--       emailing members about it.
--     * sessions cannot be hidden from the client at all. 0007 grants
--       authenticated `update (status, cancellation_reason)` and nothing
--       else, deliberately: deleted_at on a session is not a status change
--       and must not be one.
--
--   So the deletion has to happen in ONE transaction, at a level that can
--   reach all four tables, and it has to distinguish history from schedule.
--
-- WHERE THE LINE FALLS: COMPLETED, versus everything else
--   A completed session is history. It has a FROZEN expected set
--   (session_expectations, 0007) and attendance_records hanging off it, and
--   the reports read both. Removing it would rewrite what already happened,
--   which is the one thing this product does not do -- so a completed session
--   is left exactly as it is, and so is every attendance row anywhere.
--
--   Everything else -- scheduled, cancelled, holiday -- describes a future
--   the academy has just decided against. Those are soft-deleted, which is
--   what stops them being expected.
--
--   Enrolments are ENDED rather than deleted: member_enrollments has no
--   deleted_at, and ending one (status 'ended', effective_to today) is
--   already how a member leaves an offering. Deleting the row would take the
--   member's own history of having attended this course with it.
--
-- IDEMPOTENT on purpose: deleting an already-deleted course reports 0 of
-- everything rather than erroring. Two taps on a slow connection is not a
-- failure a person needs to read about.

create or replace function public.delete_course(p_course_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_course      record;
  v_offerings   uuid[];
  v_sessions    int := 0;
  v_kept        int := 0;
  v_enrolments  int := 0;
  v_now         timestamptz := now();
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate courses_update carries
  -- has to be restated here or this function is a hole straight through it.
  if not public.is_super_admin() then
    raise exception 'only the super admin can delete a course'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the course was not deleted'
      using errcode = '42501';
  end if;

  select c.id, c.name into v_course
    from public.courses c
   where c.id = p_course_id and c.deleted_at is null;
  if not found then
    -- Already gone, or never there. Report the shape the caller expects.
    return jsonb_build_object(
      'course_id', p_course_id, 'name', null, 'offerings', 0,
      'sessions_removed', 0, 'sessions_kept', 0, 'enrolments_ended', 0,
      'already_deleted', true);
  end if;

  select coalesce(array_agg(o.id), '{}') into v_offerings
    from public.course_offerings o
   where o.course_id = p_course_id and o.deleted_at is null;

  -- 1. Enrolments END. No deleted_at on the table, and ending one is already
  --    how a member leaves an offering -- so her history of having been in
  --    this course survives the course itself.
  if array_length(v_offerings, 1) > 0 then
    with ended as (
      update public.member_enrollments
         set status = 'ended',
             effective_to = least(coalesce(effective_to, current_date), current_date)
       where offering_id = any(v_offerings) and status = 'active'
      returning 1)
    select count(*) into v_enrolments from ended;

    -- 2. Sessions that have not happened yet go. A COMPLETED one is history
    --    and stays, with its frozen expectations and its attendance rows.
    with removed as (
      update public.sessions
         set deleted_at = v_now
       where offering_id = any(v_offerings)
         and deleted_at is null
         and status <> 'completed'
      returning 1)
    select count(*) into v_sessions from removed;

    select count(*) into v_kept
      from public.sessions
     where offering_id = any(v_offerings)
       and deleted_at is null
       and status = 'completed';

    -- 3. The offerings themselves. This is the one that actually stops the
    --    expectation: every read of expected attendance goes through here.
    update public.course_offerings
       set deleted_at = v_now
     where id = any(v_offerings);
  end if;

  -- 4. And the course. Last, so a failure anywhere above rolls the whole
  --    thing back rather than leaving a hidden course with live offerings.
  update public.courses set deleted_at = v_now where id = p_course_id;

  return jsonb_build_object(
    'course_id',        p_course_id,
    'name',             v_course.name,
    'offerings',        coalesce(array_length(v_offerings, 1), 0),
    'sessions_removed', v_sessions,
    'sessions_kept',    v_kept,
    'enrolments_ended', v_enrolments,
    'already_deleted',  false);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the app calls this as the
-- signed-in super admin -- the function re-checks that itself, above.
revoke all on function public.delete_course(uuid) from public, anon;
grant execute on function public.delete_course(uuid) to authenticated, service_role;

comment on function public.delete_course(uuid) is
  'The ONLY delete path for a course. Soft-deletes the course, its offerings and every not-yet-completed session in one transaction, and ENDS active enrolments. Completed sessions, their frozen expectations and all attendance records are left untouched -- which is what lets the confirmation promise that attendance history stays. Idempotent.';
