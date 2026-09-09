-- 0063 · a branch that runs courses can be removed, by moving them
--
-- "Enable delete branch" -- the requester, 09-Sep-2026, asked which of the two
-- locks to open and chose this one: a branch with courses on it could not be
-- deleted at all.
--
-- WHAT BLOCKED IT. `branches_guard_removal` (0019) refuses the soft-delete
-- while the branch still has live course_offerings or holidays scoped to it,
-- and its own message already names the way out: "move or remove them first".
-- The app had no way to move them, so for a branch that runs anything the
-- delete was simply unavailable and the message was advice nobody could act on.
--
-- WHAT THIS DOES, AND WHAT IT DELIBERATELY DOES NOT
--   It MOVES the branch's offerings to another branch and then removes it.
--   Courses go on running, at the new branch. Every enrolment, every session
--   and every attendance record is untouched -- they hang off the OFFERING,
--   which survives with a new branch_id.
--
--   It does NOT delete the courses. Destroying courses, sessions and members'
--   attendance as a side effect of removing a LOCATION is a far bigger act
--   than a branch delete says it is, and the app already has a control for
--   genuinely destroying a course -- delete_course (0047), with its own
--   preview and its own confirmation. If the courses should go, they go there
--   first, and then the branch removes itself with nothing left on it.
--
--   The holidays scoped to the branch move WITH the offerings. A closure was
--   scoped to where those classes ran, and they now run at the target, so the
--   closure follows them rather than being dropped or left pointing at a
--   branch that no longer exists.
--
-- THE COLLISION, refused rather than merged. `offerings_unique_live`
-- (course_id, branch_id, batch_label) and `offerings_parent_live`
-- (course_id, branch_id) both admit one live row per course per branch. If the
-- course ALREADY runs at the target, moving it there is a duplicate -- and the
-- two offerings are different registers with different members. Merging them
-- would be inventing a decision nobody asked for, so the move is refused and
-- the course is named, which is something a person can act on.
--
-- STILL OWNER-ONLY. The requester was asked about branches on 08-Sep-2026 and
-- chose to keep them super-admin (0050 records it). Nothing here reopens that:
-- the gate is restated below exactly as the RLS policy carries it.

create or replace function public.remove_branch(
  p_branch_id uuid,
  /** where this branch's courses go. NULL keeps 0019's behaviour: the branch
   *  is removed only if nothing is left on it. */
  p_move_to   uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor    uuid := public.current_app_user_id();
  v_branch   record;
  v_target   record;
  v_clash    text;
  v_moved    int := 0;
  v_holidays int := 0;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate the branches policy
  -- carries is restated here or this function is a hole straight through it.
  -- Branches are super-admin, by the owner's own decision of 08-Sep-2026.
  if v_actor is null or not public.is_super_admin() then
    raise exception 'only the academy admin can remove a branch'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the branch was not removed'
      using errcode = '42501';
  end if;

  select b.id, b.name into v_branch
    from public.branches b
   where b.id = p_branch_id and b.deleted_at is null
   for update;
  if not found then
    raise exception 'that branch is not on the register' using errcode = 'P0002';
  end if;

  if p_move_to is not null then
    if p_move_to = p_branch_id then
      raise exception 'a branch cannot be moved into itself' using errcode = '22023';
    end if;

    select b.id, b.name into v_target
      from public.branches b
     where b.id = p_move_to and b.deleted_at is null;
    if not found then
      raise exception 'the branch to move the courses to is not on the register'
        using errcode = 'P0002';
    end if;

    -- THE COLLISION, named before anything is written. One live offering per
    -- course per branch per batch, so a course that already runs at the target
    -- cannot also arrive there from here.
    select string_agg(distinct c.name, ', ' order by c.name) into v_clash
      from public.course_offerings o
      join public.courses c on c.id = o.course_id
     where o.branch_id = p_branch_id and o.deleted_at is null
       and exists (
         select 1 from public.course_offerings t
          where t.branch_id = p_move_to
            and t.course_id = o.course_id
            and t.deleted_at is null
            and t.batch_label is not distinct from o.batch_label);
    if v_clash is not null then
      raise exception
        '% already runs at % -- move or remove that one first, or the two registers would collide',
        v_clash, v_target.name using errcode = '55000';
    end if;

    -- Neither branches nor course_offerings carries updated_by; the actor is
    -- on the audit row below, and on the audit_row_change trigger's own entry.
    update public.course_offerings
       set branch_id = p_move_to
     where branch_id = p_branch_id and deleted_at is null;
    get diagnostics v_moved = row_count;

    -- The closures follow the classes they were scoped to.
    update public.holidays
       set branch_id = p_move_to
     where branch_id = p_branch_id;
    get diagnostics v_holidays = row_count;
  end if;

  -- The removal itself. branches_guard_removal (0019) still fires and still
  -- refuses if anything is left -- which is the point: this function moves
  -- things out of the way, it does not get to skip the check.
  update public.branches
     set deleted_at = now()
   where id = p_branch_id and deleted_at is null;

  perform public.audit_log('branch.removed', 'branch', p_branch_id::text, '[]'::jsonb,
    jsonb_build_object('name', v_branch.name,
                       'moved_to', case when p_move_to is null then null else v_target.name end,
                       'offerings_moved', v_moved,
                       'holidays_moved', v_holidays));

  return jsonb_build_object(
    'branch_id', p_branch_id, 'name', v_branch.name,
    'moved_to', case when p_move_to is null then null else v_target.name end,
    'offerings_moved', v_moved, 'holidays_moved', v_holidays);
end $$;

revoke all on function public.remove_branch(uuid, uuid) from public, anon;
grant execute on function public.remove_branch(uuid, uuid) to authenticated, service_role;

comment on function public.remove_branch(uuid, uuid) is
  'Removes a branch (0063). With p_move_to, the branch''s live offerings and the holidays scoped to it are moved to that branch first, so a branch that runs courses can be removed without destroying anything -- enrolments, sessions and attendance hang off the offering and travel with it. Refuses when a course already runs at the target, because one live offering per course per branch means the two registers would collide. NEVER deletes a course: delete_course (0047) is that control. Super-admin only, by the owner''s decision of 08-Sep-2026. branches_guard_removal still fires, so nothing here skips the check.';
