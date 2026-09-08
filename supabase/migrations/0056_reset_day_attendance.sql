-- 0056 · reset_day_attendance -- the first way a register can be UNDONE
--
-- WHAT WAS MISSING, AND WHO ASKED FOR IT
--   requests/2026-09-08-reset-a-day-register.md. The requester's words:
--   "give a reset attendnace button and enable select and deselct option to
--   so we will delete that member records and reset attendnace is click and
--   the upload again should be changed to awaiting upload. on click of reset
--   do you want to delet member under no email yes delete option".
--
--   Attendance has had two ways IN -- commit_csv_import (0014) and
--   set_attendance (0035) -- and no way back. 0044 says so as a property
--   rather than a gap: "the register is the union of its files and no file
--   undoes another's". A file imported into the wrong course could be
--   CORRECTED by a second file for the same meeting and could not be REMOVED.
--   0035 declined the job on purpose -- "it cannot clear an attendance
--   record ... the mistake it would fix is already fixed by picking the other
--   chip" -- which is true of ONE mark made by hand and false of a whole file
--   that should never have landed. This is that second case, and only that
--   one: it works on a DAY, never on a single member.
--
-- THE DAY RETURNS TO AWAITING BY DERIVATION, IN BOTH PLACES THAT CLAIM IT
--   The week strip gives a day `awaiting` when it holds no attendance rows,
--   so clearing the rows is most of it. The upload screen's own list is the
--   other place, and it does NOT read the rows: fetchPendingSessions queries
--   `sessions.status = 'scheduled'`. A session left `completed` would vanish
--   from the waiting list while the strip said it was waiting -- the two
--   screens disagreeing about one day, which is the shape of defect
--   guardrail 1 exists to prevent. So the session goes back to `scheduled`
--   and its completed_at is cleared.
--
--   Only a COMPLETED session is reverted. `cancelled` is the academy's
--   decision and `holiday` is the calendar (0017's triggers own that column);
--   neither is something a reset may argue with, and neither ever held a
--   register to clear.
--
-- THE FILE MUST BE UPLOADABLE AGAIN, and the schema already allowed for it
--   csv_imports.status has carried 'reverted' as a legal value since 0008,
--   and csv_imports_sha_completed is a PARTIAL unique index -- `where status
--   = 'completed'`. So moving the day's imports to 'reverted' releases the
--   fingerprint, and re-uploading the very same export works rather than
--   being met with "already imported". Without this step the reset would
--   clear the register and then refuse the file that would refill it, which
--   is a worse place to stand than not resetting at all.
--
-- SOFT, NOT HARD, for the attendance rows
--   attendance_unique_live is `where deleted_at is null`, so a soft delete
--   frees the slot for the re-import while leaving the row for anybody
--   reading the table directly. It is also what member_deletion_preview
--   (0051) already counts -- "every attendance row of hers, soft-deleted ones
--   included" -- so the two functions agree about what a member's history is.
--
-- THE DELETE HALF IS NOT DRIVEN BY THE ROSTER, and that is the whole point
--   The obvious reading of "delete member under no email" is the members
--   drawn under the No email heading on the course. That reading MISSES the
--   case it was asked about. On 08-Sep-2026 the requester's three names --
--   Rani, Rossy, UniqBotz Infotech -- were marked on the Yoda Advance
--   register while enrolled in NO course, so the roster, which is built from
--   enrolments, never listed them; the screen read "Members (1)" over a
--   register holding four. A delete offer driven by that list would have
--   found nothing to delete on the day it was asked for.
--
--   So the offer is driven by the REGISTER: every member the day's rows mark
--   who has no address on file. On ordinary data that is the same set the No
--   email heading shows; on the requester's data it is the set she meant.
--
-- THE CLIENT'S TICK LIST IS NEVER TRUSTED
--   p_delete_member_ids is INTERSECTED with the deletable set computed here,
--   not taken as given. An id that is not marked on this day, or that belongs
--   to a member who has an address, is ignored -- silently, because it is not
--   a thing a person can do through the screen and a caller that sends one is
--   not somebody to write an error message for. Without the intersection this
--   function would be a hard-delete-any-member endpoint wearing a reset's
--   name.
--
-- DELETION GOES THROUGH delete_member, NEVER ROUND IT
--   delete_member (0051) is a HARD delete and carries the guards, the audit
--   entry and the constraint-ordered removal that email_messages forces. This
--   function calls it. It is called AFTER the rows are cleared and the
--   session reverted, so a member whose deletion fails leaves a reset that
--   still happened rather than a half-cleared register -- and it is one
--   transaction either way, so a failure takes both back together.

-- ------------------------------------------------------------- the preview
-- What a reset would move, before anything is written. Its own function so
-- the dialog can state quantities BEFORE the tap rather than after, exactly
-- as member_deletion_preview (0051) and course_deletion_preview do.
create or replace function public.attendance_reset_preview(
  p_course_id    uuid,
  p_session_date date
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_marks     int := 0;
  v_members   int := 0;
  v_keeping   int := 0;
  v_deletable jsonb := '[]'::jsonb;
begin
  -- A preview writes nothing, but it READS names and addresses, so it is
  -- gated exactly as the write is. is_subscription_writable is deliberately
  -- NOT asked here: reading what a reset would do is not a write, and an
  -- academy whose billing has lapsed should still be able to see the number
  -- before it renews.
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
  ), marked as (
    select distinct member_id from day_rows
  )
  select
    (select count(*) from day_rows),
    (select count(*) from marked),
    -- The with-email half, counted separately: the dialog states it as its
    -- own sentence, because "4 members" cannot say which of them merely lose
    -- a mark and which are about to be deleted.
    (select count(*) from marked
       join public.members m2 on m2.id = marked.member_id
      where m2.deleted_at is null
        and exists (select 1 from public.member_emails me2
                     where me2.member_id = m2.id and me2.deleted_at is null)),
    coalesce((
      select jsonb_agg(t order by t->>'name')
        from (
          select jsonb_build_object(
                   'member_id', m.id,
                   'name',      m.full_name,
                   'has_email', false,
                   -- Every OTHER day her attendance is recorded on. Named
                   -- because delete_member reaches all of them, and a dialog
                   -- that offers the delete without this number is describing
                   -- a smaller write than the one it performs.
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
             -- no LIVE address on file. A bounced address is still an
             -- address: send.ts stops using it, but she is a member the
             -- academy has contact details for and she is not swept up here.
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

revoke all on function public.attendance_reset_preview(uuid, date) from public, anon;
grant execute on function public.attendance_reset_preview(uuid, date)
  to authenticated, service_role;

comment on function public.attendance_reset_preview(uuid, date) is
  'What resetting one day of one course would move, before anything is written: the marks, the members they name, and which of those members have no address on file and are therefore offered for deletion -- each with the count of OTHER days her attendance is recorded on, because delete_member is a hard delete and reaches all of them. Driven by the REGISTER and not by the roster, so a member marked while enrolled in no course is still reachable (the 08-Sep-2026 case). Writes nothing.';


-- --------------------------------------------------------------- the reset
create or replace function public.reset_day_attendance(
  p_course_id         uuid,
  p_session_date      date,
  /** the members the operator ticked. Intersected with the deletable set
   *  computed here -- never taken as given. */
  p_delete_member_ids uuid[] default '{}'::uuid[]
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor      uuid := public.current_app_user_id();
  v_sessions   uuid[];
  v_members    uuid[];
  v_deletable  uuid[];
  v_targets    uuid[];
  v_cleared    int := 0;
  v_reverted   int := 0;
  v_imports    int := 0;
  v_deleted    int := 0;
  v_session_id uuid;
  v_member_id  uuid;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicates the tables' own policies
  -- carry are restated here or this function is a hole straight through them.
  -- Both guards, the shape set_attendance (0035) and delete_member (0051)
  -- use: the role gate and the billing gate are different questions (0002)
  -- and neither stands in for the other.
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
    return jsonb_build_object('cleared', 0, 'deleted', 0, 'sessions_touched', 0,
                              'imports_reverted', 0);
  end if;

  -- Who the register names, and which of them the delete may be offered for.
  -- Computed BEFORE the rows are cleared, because afterwards there is nothing
  -- left to read it from.
  select coalesce(array_agg(distinct a.member_id), '{}'::uuid[]) into v_members
    from public.attendance_records a
   where a.session_id = any (v_sessions) and a.deleted_at is null;

  select coalesce(array_agg(m.id), '{}'::uuid[]) into v_deletable
    from public.members m
   where m.id = any (v_members)
     and m.deleted_at is null
     and not exists (select 1 from public.member_emails me
                      where me.member_id = m.id and me.deleted_at is null);

  -- THE INTERSECTION. Without it this is a hard-delete-any-member endpoint
  -- wearing a reset's name.
  select coalesce(array_agg(id), '{}'::uuid[]) into v_targets
    from unnest(v_deletable) id
   where id = any (coalesce(p_delete_member_ids, '{}'::uuid[]));

  -- ------------------------------------------------------- clear the marks
  -- Soft, so attendance_unique_live frees the slot for the re-import while
  -- the row survives for anybody reading the table directly.
  update public.attendance_records a
     set deleted_at = now()
   where a.session_id = any (v_sessions) and a.deleted_at is null;
  get diagnostics v_cleared = row_count;

  -- ------------------------------------------------ the day goes back
  -- Only a COMPLETED session. `cancelled` and `holiday` are decisions this
  -- function has no business reversing, and neither ever held a register.
  update public.sessions s
     set status = 'scheduled', completed_at = null
   where s.id = any (v_sessions) and s.status = 'completed';
  get diagnostics v_reverted = row_count;

  -- ------------------------------------------- release the fingerprints
  -- 'reverted' has been a legal status since 0008 and csv_imports_sha_completed
  -- is partial on 'completed', so this is what lets the same export be
  -- uploaded again afterwards.
  update public.csv_imports i
     set status = 'reverted'
   where i.session_date = p_session_date
     and i.status = 'completed'
     and i.offering_id in (
       select o.id from public.course_offerings o where o.course_id = p_course_id);
  get diagnostics v_imports = row_count;

  foreach v_session_id in array v_sessions loop
    perform public.refresh_session_counts(v_session_id);
  end loop;

  perform public.audit_log_as(v_actor, 'attendance.day_reset', 'course',
    p_course_id::text, '[]'::jsonb,
    jsonb_build_object('session_date', p_session_date,
                       'sessions', v_sessions,
                       'marks_cleared', v_cleared,
                       'sessions_reverted', v_reverted,
                       'imports_reverted', v_imports,
                       'members_deleted', coalesce(array_length(v_targets, 1), 0)));

  -- ------------------------------------------------------ the permanent half
  -- Through delete_member, never round it: it carries the guards, the audit
  -- entry and the constraint-ordered removal email_messages forces. Last, so
  -- that the reset above is already true when it runs -- and in the same
  -- transaction, so a failure takes both back together.
  if array_length(v_targets, 1) is not null then
    foreach v_member_id in array v_targets loop
      perform public.delete_member(v_member_id);
      v_deleted := v_deleted + 1;
    end loop;
  end if;

  -- Every member the day named, less the ones who no longer exist. Her
  -- figures are derived from the rows this just cleared, so leaving them
  -- would put a Missed count on a card over a register that says nothing.
  select coalesce(array_agg(m.id), '{}'::uuid[]) into v_members
    from public.members m
   where m.id = any (v_members) and m.deleted_at is null;
  if array_length(v_members, 1) is not null then
    perform public.recompute_member_stats(v_members);
  end if;

  return jsonb_build_object(
    'cleared', v_cleared,
    'deleted', v_deleted,
    'sessions_touched', v_reverted,
    'imports_reverted', v_imports);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks its
-- caller itself, above.
revoke all on function public.reset_day_attendance(uuid, date, uuid[]) from public, anon;
grant execute on function public.reset_day_attendance(uuid, date, uuid[])
  to authenticated, service_role;

comment on function public.reset_day_attendance(uuid, date, uuid[]) is
  'Undoes ONE day of ONE course''s register, the counterpart commit_csv_import never had. Soft-deletes every attendance record on that day''s sessions, returns a COMPLETED session to ''scheduled'' with completed_at cleared (so fetchPendingSessions lists it as awaiting again, agreeing with the week strip), and moves the day''s completed csv_imports to ''reverted'' -- which releases csv_imports_sha_completed and lets the same export be uploaded again. Then hard-deletes, through delete_member, whichever of the ticked members are BOTH marked on that day AND have no address on file; the caller''s list is intersected with that set and never trusted. Refreshes session counts and recomputes the stats of every member the day named. One transaction: a failed deletion takes the whole reset back with it. Cancelled and holiday sessions are left alone.';
