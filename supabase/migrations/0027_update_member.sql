-- 0027 · changing a member she already is
--
-- THE DEFECT THIS CLOSES
--   Edit Member has never been able to save. The form loaded her record,
--   accepted every keystroke, and disabled Save Changes behind a line that
--   said so out loud: "Changing a member she already is -- her course, her
--   branch, her days -- has no write path yet." Honest, and still a form
--   that cannot do the thing it is named after.
--
--   0016 said this in its own scope note: "the CREATE path only. Changing an
--   existing member's enrolment or her weekday override still has no RPC and
--   still cannot be done from the app; that is recorded as debt rather than
--   half-built here." This is that debt.
--
-- WHY IT IS AN RPC, the same reason create_member is one
--   member_enrollments and member_schedules carry a READ policy and nothing
--   else (0006). They "move only through RPCs that can check the subset rule
--   and protect history". A direct UPDATE from the client cannot: it would
--   have to be granted write access to enrolment history, and it could not
--   see the offering schedule the subset rule is measured against.
--
-- THE FORM SENDS THE WHOLE DESIRED STATE, not a patch. Her aliases and
-- addresses are lists on screen, so they are lists here, and this function
-- RECONCILES: what is in the list stays or arrives, what is not is removed.
-- A patch API for a screen that shows the whole set is how a removal turns
-- into a silent no-op.
--
-- WHAT "REMOVED" MEANS, and the two are different on purpose
--   * an alias is DELETED. 0006 gives member_aliases the only `for delete`
--     policy in the schema because an alias is a correction: a display name
--     pointed at the wrong member, and the record of that is worth nothing.
--   * an address is SOFT-deleted. It may have been mailed. email_messages
--     rows point at what was sent and to where, and a hard delete would
--     leave that history describing an address that no longer exists.
--
-- HISTORY IS NOT REWRITTEN
--   Both enrolment and the weekday override are date-ranged with a GiST
--   exclusion on (member_id, daterange) -- one offering at a time, one
--   override at a time, and ranges are INCLUSIVE. So a change ENDS the
--   standing row the day before and starts the new one today; it never
--   updates the old row's offering in place and never leaves the attendance
--   already recorded against the old course pointing somewhere else.
--
--   The one exception is a row that STARTED TODAY. Ending it yesterday would
--   violate `effective_to >= effective_from`, and it has no attendance to
--   protect, so it is corrected in place. That is somebody fixing a mistake
--   made minutes ago, which is a different act from moving her course.

create or replace function public.update_member(
  p_member_id   uuid,
  p_full_name   text,
  p_offering_id uuid,
  /** Google Meet display names, the WHOLE list. Anything not here is deleted. */
  p_aliases     text[]     default '{}',
  /** Her addresses, the WHOLE list, primary first. Anything not here is
   *  soft-deleted. An empty list is a real answer -- she stays listed and is
   *  counted as excluded from every send (C-76). */
  p_emails      text[]     default '{}',
  /** NULL means she follows the offering's days, which is not the same as an
   *  empty list. NULL ends any standing override. */
  p_weekdays    smallint[] default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor       uuid := public.current_app_user_id();
  v_today       date := current_date;
  v_member      record;
  v_enrol       record;
  v_sched       record;
  v_days        smallint[];
  v_alias       text;
  v_email       text;
  v_norm        text;
  v_first       boolean := true;
  v_wanted      text[];
  v_changed     jsonb := '[]'::jsonb;
  v_moved       boolean := false;
  v_days_change boolean := false;
begin
  -- ------------------------------------------------------------ the gate
  -- Deliberately the same two predicates create_member uses, and the same
  -- two the table policies use. One rule, not a second one that can drift.
  if v_actor is null then
    raise exception 'only a signed-in, active user can change a member'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing can be changed'
      using errcode = '42501';
  end if;

  select * into v_member from public.members
   where id = p_member_id and deleted_at is null;
  if not found then
    raise exception 'that member is not on the register' using errcode = 'P0002';
  end if;

  if p_full_name is null or length(btrim(p_full_name)) < 2 then
    raise exception 'her name is needed' using errcode = '55000';
  end if;
  if length(btrim(p_full_name)) > 120 then
    raise exception 'her name is longer than 120 characters' using errcode = '55000';
  end if;

  if not exists (select 1 from public.course_offerings o
                  where o.id = p_offering_id and o.deleted_at is null) then
    raise exception 'that course is not offered at that branch'
      using errcode = 'P0002';
  end if;

  -- ------------------------------------------------------------- her name
  if btrim(p_full_name) <> v_member.full_name then
    update public.members
       set full_name = btrim(p_full_name), updated_by = v_actor
     where id = p_member_id;
    v_changed := v_changed || jsonb_build_object(
      'field', 'full_name', 'old', v_member.full_name, 'new', btrim(p_full_name));
  end if;

  -- ---------------------------------------------------------- her enrolment
  select * into v_enrol from public.member_enrollments
   where member_id = p_member_id and status = 'active'
   order by effective_from desc limit 1;

  if v_enrol.id is null then
    -- No standing enrolment at all. She was invisible to the engine; this is
    -- the same repair create_member does for a new member.
    insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
    values (p_member_id, p_offering_id, v_today, v_actor);
    v_moved := true;
  elsif v_enrol.offering_id <> p_offering_id then
    if v_enrol.effective_from >= v_today then
      -- started today: a correction, not a move. No attendance can exist
      -- against it, so the row is repointed rather than closed and reopened.
      update public.member_enrollments set offering_id = p_offering_id
       where id = v_enrol.id;
    else
      update public.member_enrollments
         set effective_to = v_today - 1, status = 'ended',
             note = coalesce(note, '') || case when note is null then '' else ' · ' end
                    || 'moved to another offering'
       where id = v_enrol.id;
      insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
      values (p_member_id, p_offering_id, v_today, v_actor);
    end if;
    v_moved := true;
    v_changed := v_changed || jsonb_build_object(
      'field', 'offering', 'old', v_enrol.offering_id::text, 'new', p_offering_id::text);
  end if;

  -- ------------------------------------------------------------- her days
  -- The subset rule lives here for the reason 0006 gives: it needs the
  -- offering schedule effective on the same dates, which no CHECK can see.
  -- Measured against the NEW offering, because that is the one she will be
  -- expected at.
  select s.weekdays into v_days
    from public.offering_schedules s
   where s.offering_id = p_offering_id
     and s.effective_from <= v_today
     and (s.effective_to is null or s.effective_to >= v_today)
   order by s.effective_from desc
   limit 1;

  if p_weekdays is not null then
    if coalesce(array_length(p_weekdays, 1), 0) = 0 then
      raise exception 'pick at least one day, or leave her days blank to follow the course'
        using errcode = '55000';
    end if;
    if v_days is null then
      raise exception 'that offering has no schedule on %, so there are no days to choose from', v_today
        using errcode = '55000';
    end if;
    if not (p_weekdays <@ v_days) then
      raise exception 'her days must be days the course actually runs (%)', v_days
        using errcode = '55000';
    end if;
  end if;

  select * into v_sched from public.member_schedules
   where member_id = p_member_id
     and effective_from <= v_today
     and (effective_to is null or effective_to >= v_today)
   order by effective_from desc limit 1;

  if p_weekdays is null then
    -- back to following the course. The override is ENDED, not deleted:
    -- sessions she was expected at under it have already been counted.
    if v_sched.id is not null and v_sched.effective_to is null then
      if v_sched.effective_from >= v_today then
        delete from public.member_schedules where id = v_sched.id;
      else
        update public.member_schedules set effective_to = v_today - 1 where id = v_sched.id;
      end if;
      v_days_change := true;
      v_changed := v_changed || jsonb_build_object(
        'field', 'own_days', 'old', v_sched.weekdays::text, 'new', null);
    end if;
  elsif v_sched.id is null or v_sched.weekdays <> p_weekdays then
    if v_sched.id is not null then
      if v_sched.effective_from >= v_today then
        delete from public.member_schedules where id = v_sched.id;
      else
        update public.member_schedules set effective_to = v_today - 1 where id = v_sched.id;
      end if;
    end if;
    insert into public.member_schedules (member_id, effective_from, weekdays, note, created_by)
    values (p_member_id, v_today, p_weekdays, 'changed on the member form', v_actor);
    v_days_change := true;
    v_changed := v_changed || jsonb_build_object(
      'field', 'own_days', 'old', v_sched.weekdays::text, 'new', p_weekdays::text);
  end if;

  -- ---------------------------------------------------- her display names
  -- Reconciled on the NORMALISED name, because that is what the unique index
  -- and the importer both match on: re-typing "Divya  R." when "divya r" is
  -- already stored is the same alias, not a new one to insert and an old one
  -- to delete.
  v_wanted := '{}'::text[];
  foreach v_alias in array coalesce(p_aliases, '{}'::text[]) loop
    if length(btrim(v_alias)) > 0 then
      v_wanted := array_append(v_wanted, public.normalize_name(btrim(v_alias)));
    end if;
  end loop;

  delete from public.member_aliases
   where member_id = p_member_id and alias_type = 'name'
     and not (alias_normalized = any (v_wanted));

  foreach v_alias in array coalesce(p_aliases, '{}'::text[]) loop
    if length(btrim(v_alias)) > 0 then
      v_norm := public.normalize_name(btrim(v_alias));
      if not exists (select 1 from public.member_aliases
                      where alias_type = 'name' and alias_normalized = v_norm
                        and member_id = p_member_id) then
        begin
          insert into public.member_aliases
            (member_id, alias_type, alias_display, source, confirmed_by)
          values (p_member_id, 'name', btrim(v_alias), 'member_form', v_actor);
        exception when unique_violation then
          -- Named, not swallowed. Dropping it silently would leave an import
          -- matching her rows to somebody else.
          raise exception 'the display name "%" already belongs to another member', btrim(v_alias)
            using errcode = '23505';
        end;
      end if;
    end if;
  end loop;

  -- --------------------------------------------------------- her addresses
  -- Soft-deleted, never removed: email_messages records what was sent and to
  -- where, and a hard delete would leave that history pointing at nothing.
  v_wanted := '{}'::text[];
  foreach v_email in array coalesce(p_emails, '{}'::text[]) loop
    if length(btrim(v_email)) > 0 then
      v_wanted := array_append(v_wanted, btrim(lower(v_email)));
    end if;
  end loop;

  update public.member_emails
     set deleted_at = now(), is_primary = false, updated_at = now()
   where member_id = p_member_id and deleted_at is null
     and not (lower(email::text) = any (v_wanted));

  -- The first address in the list is primary. Cleared first, so the partial
  -- unique index (one primary per live member) can never see two at once.
  update public.member_emails set is_primary = false, updated_at = now()
   where member_id = p_member_id and deleted_at is null and is_primary;

  foreach v_email in array coalesce(p_emails, '{}'::text[]) loop
    if length(btrim(v_email)) > 0 then
      v_email := btrim(lower(v_email));
      if exists (select 1 from public.member_emails
                  where member_id = p_member_id and deleted_at is null
                    and lower(email::text) = v_email) then
        update public.member_emails set is_primary = v_first, updated_at = now()
         where member_id = p_member_id and deleted_at is null
           and lower(email::text) = v_email;
      else
        begin
          insert into public.member_emails
            (member_id, email, is_primary, status, source, created_by)
          values (p_member_id, v_email, v_first, 'unknown', 'member_form', v_actor);
        exception when unique_violation then
          raise exception 'the address "%" is already on another member', v_email
            using errcode = '23505';
        end;
      end if;
      v_first := false;
    end if;
  end loop;

  -- Every table above carries its own audit trigger from 0006, so the row
  -- changes are recorded either way. This line records the ACT: one person
  -- changed one member, once, and which of the four things they changed.
  perform public.audit_log('member.updated', 'member', p_member_id::text, v_changed,
    jsonb_build_object('offering_id', p_offering_id,
                       'aliases', coalesce(array_length(p_aliases, 1), 0),
                       'emails', coalesce(array_length(p_emails, 1), 0),
                       'moved_offering', v_moved,
                       'own_days_changed', v_days_change));

  -- Her expected-session figures are derived from the enrolment and the
  -- override that just moved, so they are stale the moment this returns.
  perform public.recompute_member_stats();

  return jsonb_build_object(
    'member_id', p_member_id, 'moved_offering', v_moved, 'own_days_changed', v_days_change,
    'changes', jsonb_array_length(v_changed));
end $$;

revoke all on function public.update_member(uuid, text, uuid, text[], text[], smallint[])
  from public, anon;
grant execute on function public.update_member(uuid, text, uuid, text[], text[], smallint[])
  to authenticated, service_role;

comment on function public.update_member(uuid, text, uuid, text[], text[], smallint[]) is
  'Changes a member: her name, her display names, her addresses, her enrolment and her optional weekday override, in one transaction. The arrays are the WHOLE desired list, not a patch. SECURITY DEFINER: the is_active_app_user()/is_subscription_writable() checks inside are the policy, matching 0006 and create_member.';
