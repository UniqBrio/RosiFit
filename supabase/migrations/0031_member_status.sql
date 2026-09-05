-- 0031 · set_member_status -- the column that decided who gets mailed, given
--        a control
--
-- WHAT WAS WRONG
--   `members.status` was added in 0006 with a CHECK of
--   ('active','paused','inactive'), a default of 'active', a partial index,
--   and a sibling column `status_changed_at`. Then nothing ever wrote it.
--   create_member (0016) and bulk_import_members (0028) insert 'active'
--   literally; update_member (0027) does not touch it; no screen showed it
--   and no screen could change it.
--
--   Meanwhile follow_up_candidates() (0009) has carried
--   `where m.deleted_at is null and m.status = 'active'` since the day it was
--   written. So the column was NOT decorative: it decided, server-side, who
--   the send flow would ever reach -- and the app, which derives the same set
--   from the member list, had no idea it existed. The two agreed only because
--   every row happened to still hold its default.
--
--   That is the failure this closes on both sides at once: the app now READS
--   the column (src/data/followup.ts, isFollowable) and this is what lets
--   anybody WRITE it.
--
-- WHY AN RPC and not the UPDATE policy `members` already has
--   0006 grants authenticated UPDATE on members, so a client could set the
--   column directly. It could not set the other two things that have to move
--   with it:
--
--     * `status_changed_at`, which is the only record of WHEN she came off
--       the register -- a client clock is not evidence of that.
--     * `updated_by`, which needs the actor's public.app_users id. The client
--       holds an auth uid; resolving it is current_app_user_id()'s job, and
--       0023 made every member write attribute itself that way so the audit
--       log names a person rather than a session.
--
--   The audit trigger `audit_members` (0006) fires on the UPDATE either way;
--   routing through here is what makes the row it writes true.
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   It does not end her enrolment, and it does not touch a session, an
--   expectation or an attendance record. Inactive is a statement about
--   FOLLOW-UP -- stop writing to her -- not a deletion and not a departure.
--   Her history stays readable, her figures keep counting, and marking her
--   active again is the same call with the other value. Ending an enrolment
--   is delete_course's (0020) business and is a different act.
--
-- IDEMPOTENT: setting the status she already holds reports changed=false and
-- leaves status_changed_at alone, so a double tap on a slow connection does
-- not rewrite when she was taken off.

create or replace function public.set_member_status(
  p_member_id uuid,
  /** one of the three values members_status_check allows */
  p_status    text
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor  uuid := public.current_app_user_id();
  v_member record;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate members_update carries --
  -- is_active_app_user() and is_subscription_writable() -- is restated here
  -- or this function is a hole straight through it.
  if v_actor is null or not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can change a member''s status'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so her status was not changed'
      using errcode = '42501';
  end if;

  -- The CHECK would refuse a bad value anyway, with a constraint name for a
  -- message. A person reads this one.
  if p_status is null or p_status not in ('active', 'paused', 'inactive') then
    raise exception 'a member is active, paused or inactive -- % is not one of them', coalesce(p_status, 'nothing')
      using errcode = '22023';
  end if;

  select m.id, m.full_name, m.status into v_member
    from public.members m
   where m.id = p_member_id and m.deleted_at is null
   for update;
  if not found then
    raise exception 'that member is not on the register'
      using errcode = 'P0002';
  end if;

  if v_member.status = p_status then
    return jsonb_build_object(
      'member_id', p_member_id, 'full_name', v_member.full_name,
      'status', v_member.status, 'changed', false);
  end if;

  update public.members
     set status            = p_status,
         status_changed_at = now(),
         updated_by        = v_actor
   where id = p_member_id;

  return jsonb_build_object(
    'member_id', p_member_id, 'full_name', v_member.full_name,
    'status', p_status, 'changed', true);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks the
-- caller itself, above.
revoke all on function public.set_member_status(uuid, text) from public, anon;
grant execute on function public.set_member_status(uuid, text) to authenticated, service_role;

comment on function public.set_member_status(uuid, text) is
  'The ONLY write path for members.status -- the column follow_up_candidates() (0009) has always filtered on and nothing could set. Stamps status_changed_at and updated_by from the signed-in actor, so the audit row names who took her off the register. Touches no enrolment, session or attendance record: inactive means "stop following her up", not "she has left". Idempotent.';
