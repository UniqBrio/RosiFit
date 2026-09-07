-- 0044 · delete_member, shipped on its own
--
-- WHY THIS FILE EXISTS WHEN 0038 ALREADY DEFINES THIS FUNCTION
--   delete_member was written in 0038_staff_write_access, and the whole of the
--   member deletion feature -- the roster's bin, the confirmation, the
--   repository call, the spec in supabase/tests/30_delete_member.sql -- has
--   been committed and green since. It has never worked in the live app for
--   one reason: 0038_staff_write_access was never applied. Confirmed against
--   production on 2026-09-07 -- public.delete_member(uuid) does not exist
--   there, so the RPC behind the bin returns "function does not exist" and the
--   screen says "She could not be removed."
--
-- WHY NOT SIMPLY APPLY 0038
--   0038 is not only delete_member. It also does CREATE OR REPLACE on
--   save_course, set_offering_schedule, delete_course and bulk_import_members,
--   reproducing each body in full because Postgres has no partial function
--   edit. Those bodies were lifted from 0018/0020/0029/0030 -- and one of them
--   has since moved on. 0040 rewrote save_course so that an unchanged schedule
--   is no longer re-asserted on every save, and 0040 IS applied in production
--   (verified: the live save_course carries the 0040 conditional; 0038's copy
--   still carries the unconditional `perform public.set_offering_schedule`).
--
--   Applying 0038 now would therefore ship the wanted function AND silently
--   revert RC-027: renaming a course, or rewording its message, would once
--   again fail with "this offering has a completed session on <today>, so a
--   schedule cannot start on or before it" -- from a form with no date field.
--   supabase/tests/16_save_course.sql pins that fix and would fail, which is
--   the harness telling the truth about an out-of-order apply.
--
--   So the deletion capability is separated out here as its own additive
--   migration and applied alone. The body below is delete_member VERBATIM from
--   0038 -- not a variant -- so 30_delete_member.sql passes against either
--   file, and applying 0038 later is a no-op CREATE OR REPLACE of identical
--   text rather than a conflict. 0038 is left untouched on disk: it is not an
--   applied migration, and the RBAC decision it carries is a separate question
--   from whether a member can be removed.
--
-- CHECKED AGAINST PRODUCTION BEFORE WRITING (the harness has no live rows, so
-- these are the checks it cannot make -- see CLAUDE.md):
--   · members.deleted_at, member_emails.deleted_at, attendance_records.deleted_at
--     and member_enrollments.status/effective_from/effective_to all present.
--   · member_emails_unique_live is PARTIAL -- `WHERE (deleted_at IS NULL)` --
--     so flagging her address really does free it for the next holder.
--   · member_aliases has no deleted_at and member_aliases_unique is global on
--     (alias_type, alias_normalized), so the hard delete below is required, not
--     a choice.
--   · member_enrollments_check is `effective_to IS NULL OR effective_to >=
--     effective_from`, which is what the greatest() clamp is for.
--   · the members write policy is (is_active_app_user() AND
--     is_subscription_writable()) -- exactly the two guards restated below, so
--     this function opens nothing the table did not already allow.
--   · trigger audit_members -> audit_row_change fires on UPDATE, so the
--     deletion lands in the audit log without this function writing one, which
--     is what the confirmation dialog already promises the user.
--
-- This migration creates a function and touches no table and no row, so there
-- is no backfill, no index build and no constraint validated over existing
-- data. It is safe on a live database of any size.


-- ------------------------------------------------------------ delete_member
--
-- WHY A SOFT DELETE, AND WHY IT IS NOT OPTIONAL
--   attendance_records.member_id references members(id) with NO on-delete
--   clause, so a hard DELETE is refused by the foreign key regardless of what
--   anyone intends. Soft delete is the shape the schema already has:
--   members.deleted_at exists, every live index is `where deleted_at is null`,
--   and every read in src/data/repository.ts already filters on it. This
--   follows removeBranch (0019) and delete_course (0020).
--
-- WHAT ACTUALLY STOPS HER BEING EXPECTED
--   Not deleted_at. expected_members_for_session (0007) reads
--   member_enrollments and never looks at members.deleted_at, so a member
--   whose row is flagged but whose enrolment is still active would keep being
--   expected at every session, and keep being counted absent. ENDING the
--   enrolment is the mechanism; the flag is what takes her off the lists.
--
-- WHY THE ALIASES ARE HARD-DELETED WHEN NOTHING ELSE IS
--   member_aliases has no deleted_at and its unique index is global, not
--   partial. Leaving them would do two things, both wrong: a later upload of
--   the same display name would resolve to a deleted member and attach the
--   day's attendance to her, and a new member with that name could not be
--   registered at all. An alias is a lookup key, not history. The history is
--   in attendance_records, and that is untouched.
--
-- IDEMPOTENT, like delete_course: deleting an already-deleted member reports
-- zeroes rather than erroring. Two taps on a slow connection is not a failure
-- a person needs to read about.
create or replace function public.delete_member(p_member_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name        text;
  v_enrolments  int := 0;
  v_emails      int := 0;
  v_aliases     int := 0;
  v_attendance  int := 0;
  v_now         timestamptz := now();
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate members_write carries has
  -- to be restated here or this function is a hole straight through it. That
  -- predicate is is_active_app_user() and always has been (0006): writing
  -- members was never the owner's alone, and deleting one follows it.
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can delete a member'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the member was not deleted'
      using errcode = '42501';
  end if;

  select m.full_name into v_name
    from public.members m
   where m.id = p_member_id and m.deleted_at is null;
  if not found then
    return jsonb_build_object(
      'member_id', p_member_id, 'name', null, 'enrolments_ended', 0,
      'emails_removed', 0, 'aliases_removed', 0, 'attendance_kept', 0,
      'already_deleted', true);
  end if;

  -- 1. The enrolment ENDS. greatest(effective_from, ...) because a member may
  --    be enrolled from a future date -- a joining date read out of an
  --    imported file is not always in the past -- and member_enrollments
  --    checks effective_to >= effective_from.
  with ended as (
    update public.member_enrollments
       set status = 'ended',
           effective_to = greatest(
             effective_from,
             least(coalesce(effective_to, current_date), current_date))
     where member_id = p_member_id and status = 'active'
    returning 1)
  select count(*) into v_enrolments from ended;

  -- 2. Her addresses go, which FREES them: member_emails_unique_live is
  --    partial on deleted_at, so the same address can be used again by
  --    whoever holds it next.
  with gone as (
    update public.member_emails
       set deleted_at = v_now
     where member_id = p_member_id and deleted_at is null
    returning 1)
  select count(*) into v_emails from gone;

  -- 3. The lookup keys go for real -- see the note above.
  with gone as (
    delete from public.member_aliases
     where member_id = p_member_id
    returning 1)
  select count(*) into v_aliases from gone;

  -- 4. Counted, not touched. The caller says what SURVIVED, because that is
  --    the half of a deletion a person needs to hear before confirming it.
  select count(*) into v_attendance
    from public.attendance_records
   where member_id = p_member_id and deleted_at is null;

  -- 5. The member herself. audit_members (0006) fires on the UPDATE, so the
  --    deletion is in the log without this function writing one by hand.
  update public.members
     set deleted_at = v_now
   where id = p_member_id;

  return jsonb_build_object(
    'member_id', p_member_id, 'name', v_name,
    'enrolments_ended', v_enrolments, 'emails_removed', v_emails,
    'aliases_removed', v_aliases, 'attendance_kept', v_attendance,
    'already_deleted', false);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks its
-- caller itself, above.
revoke all on function public.delete_member(uuid) from public, anon;
grant execute on function public.delete_member(uuid) to authenticated, service_role;

comment on function public.delete_member(uuid) is
  'Deletes a member: her row and her addresses are flagged deleted, her active enrolment is ENDED so she stops being expected at sessions, and her lookup aliases are removed so a later upload of the same name cannot resolve to her. Every attendance record she has stays. Idempotent -- deleting an already-deleted member reports zeroes rather than erroring.';

