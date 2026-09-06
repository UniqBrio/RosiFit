-- 0032 · merge_member_into -- "she is already on the register under another
--        name", made true instead of merely written down
--
-- WHAT WAS WRONG
--   The No email group's "Add display name to existing member" called
--   addMemberAlias() (src/data/repository.ts), which inserts ONE row into
--   member_aliases and stops. That was correct while the button only ever
--   taught the importer a spelling.
--
--   It stops being correct the moment the importer AUTO-CREATES a member for
--   a name it could not resolve (requests/2026-09-06-upload-flow-shorter-
--   no-email-resolution.md). The file marks "Rani Sham" present, so the
--   attendance record is on Rani Sham. Saying afterwards that "Rani Sham" is
--   a display name for Rani taught the matcher the right thing about every
--   FUTURE file and left THIS one wrong: Rani Sham holds the attendance, Rani
--   is still expected and therefore still absent, and the register says a
--   woman who came to class did not.
--
--   Two members, one person, one of them holding her attendance. The alias
--   was never the whole act -- it was the half of it that does not show.
--
-- WHAT THIS DOES, in one transaction
--   1. Every live attendance record on the stray moves to the target.
--   2. Where the target ALREADY has a record for that session, the stray's is
--      soft-deleted instead of moved. attendance_unique_live (0008) is one
--      record per member per session and it is not negotiable: a merge that
--      tried to move both would fail on the index, and a merge that moved the
--      stray's over the target's would overwrite evidence that was already
--      there. The target's record is the one that survives.
--   3. Her display names move too, and her canonical name becomes one of
--      them -- that is what makes the NEXT file match her without asking.
--   4. Her enrolments end and the stray is soft-deleted. She is not hard
--      deleted: her audit history references her, and this act has to stay
--      readable afterwards.
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   It does not merge email addresses. The stray comes from an import and has
--   none by construction -- that is WHY she is in the No email group -- and a
--   general address merge would need a primary-address rule this act has no
--   business inventing. If a stray somehow carries one, the merge refuses
--   rather than guessing which address wins.
--
--   It does not touch the target's own records, name, status or enrolments.
--   Merging is a statement about the stray.
--
-- NOT IDEMPOTENT, and it cannot be: the stray stops existing. Called twice,
-- the second call raises 'that member is not on the register' from the P0002
-- branch, which is the honest answer.

create or replace function public.merge_member_into(
  /** the record created in error -- the Meet display name that became a member */
  p_stray  uuid,
  /** the member she actually is */
  p_target uuid
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor    uuid := public.current_app_user_id();
  v_stray    record;
  v_target   record;
  v_moved    int := 0;
  v_dropped  int := 0;
  v_aliases  int := 0;
  v_emails   int := 0;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicates the members and
  -- attendance_records policies carry are restated here, exactly as 0031
  -- restates them, or this function is a hole straight through them.
  if v_actor is null or not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can merge a member'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing was merged'
      using errcode = '42501';
  end if;

  if p_stray is null or p_target is null then
    raise exception 'a merge needs both a display name and the member it belongs to'
      using errcode = '22023';
  end if;
  if p_stray = p_target then
    raise exception 'that is the same member -- a member cannot be merged into herself'
      using errcode = '22023';
  end if;

  -- Locked in a fixed order (stray, then target) so two operators merging the
  -- same pair from opposite directions cannot deadlock each other.
  select m.id, m.full_name into v_stray
    from public.members m
   where m.id = p_stray and m.deleted_at is null
   for update;
  if not found then
    raise exception 'that member is not on the register'
      using errcode = 'P0002';
  end if;

  select m.id, m.full_name into v_target
    from public.members m
   where m.id = p_target and m.deleted_at is null
   for update;
  if not found then
    raise exception 'the member you picked is not on the register'
      using errcode = 'P0002';
  end if;

  -- An address is the one thing this act will not decide. See the header.
  select count(*) into v_emails from public.member_emails
   where member_id = p_stray and deleted_at is null;
  if v_emails > 0 then
    raise exception '% has an email address of her own, so merging her would have to choose which address wins. Add the display name by hand instead.',
      v_stray.full_name using errcode = '23505';
  end if;

  -- ---------------------------------------------------------- attendance
  -- The target already being in that session wins: her record was written
  -- against the member she is, and attendance_unique_live allows exactly one.
  with clash as (
    select a.id
      from public.attendance_records a
     where a.member_id = p_stray and a.deleted_at is null
       and exists (select 1 from public.attendance_records t
                    where t.member_id = p_target and t.session_id = a.session_id
                      and t.deleted_at is null)
  )
  update public.attendance_records a
     set deleted_at = now()
    from clash c
   where a.id = c.id;
  get diagnostics v_dropped = row_count;

  -- `expected` travels with the MEMBER, not with the row: the target may be
  -- enrolled where the stray was not, and absent_must_be_expected (0008) is
  -- checked on the row as it lands.
  update public.attendance_records a
     set member_id = p_target,
         expected  = exists (
           select 1 from public.expected_members_for_session(a.session_id) em
            where em.member_id = p_target),
         status    = case
                       when exists (select 1 from public.expected_members_for_session(a.session_id) em
                                     where em.member_id = p_target)
                       then a.status
                       -- an unexpected attendee is an 'extra', never 'present'
                       else case when a.status = 'absent' then 'absent' else 'extra' end
                     end,
         updated_at = now()
   where a.member_id = p_stray and a.deleted_at is null;
  get diagnostics v_moved = row_count;

  -- ------------------------------------------------------------- aliases
  -- Her own name first: that is the display name the file carried, and the
  -- whole point of the merge is that the next file resolves it silently.
  insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by)
  values (p_target, 'name', v_stray.full_name, 'merge', v_actor)
  on conflict (alias_type, alias_normalized) do nothing;

  update public.member_aliases
     set member_id = p_target
   where member_id = p_stray
     and not exists (
       select 1 from public.member_aliases t
        where t.alias_type = member_aliases.alias_type
          and t.alias_normalized = member_aliases.alias_normalized
          and t.member_id = p_target);
  get diagnostics v_aliases = row_count;

  -- Anything that would still collide belongs to the target already.
  delete from public.member_aliases where member_id = p_stray;

  -- -------------------------------------------------------------- retire
  -- Ended, never deleted -- the same act delete_course (0020) uses, and for
  -- the same reason: member_enrollments has no deleted_at, and the row is the
  -- record that she was once enrolled here.
  update public.member_enrollments
     set status = 'ended',
         effective_to = least(coalesce(effective_to, current_date), current_date)
   where member_id = p_stray and status = 'active';

  update public.members
     set status            = 'inactive',
         status_changed_at = now(),
         deleted_at        = now(),
         updated_by        = v_actor
   where id = p_stray;

  perform public.audit_log('member.merged', 'member', p_target::text,
    jsonb_build_array(jsonb_build_object(
      'field', 'display_name', 'old', null, 'new', v_stray.full_name)),
    jsonb_build_object(
      'merged_member_id', p_stray, 'merged_full_name', v_stray.full_name,
      'attendance_moved', v_moved, 'attendance_dropped_as_duplicate', v_dropped,
      'aliases_moved', v_aliases));

  return jsonb_build_object(
    'member_id', p_target, 'full_name', v_target.full_name,
    'display_name', v_stray.full_name,
    'attendance_moved', v_moved,
    'attendance_dropped', v_dropped,
    'aliases_moved', v_aliases);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks the
-- caller itself, above.
revoke all on function public.merge_member_into(uuid, uuid) from public, anon;
grant execute on function public.merge_member_into(uuid, uuid) to authenticated, service_role;

comment on function public.merge_member_into(uuid, uuid) is
  'Folds a member created in error -- a Google Meet display name the importer could not resolve -- into the member she actually is. Moves her live attendance (the target''s own record wins where both were in one session), moves her display names and adds her name as one, ends her enrolments and soft-deletes her. Refuses when the stray carries an email address, because choosing a primary is not this act''s decision. The alias alone was never the whole act: without the attendance move the real member stays marked absent from a class she attended.';
