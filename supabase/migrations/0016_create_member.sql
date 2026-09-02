-- 0016 · adding a member, as one transaction
--
-- THE DEFECT THIS CLOSES
--   app/member/edit.tsx flashed "<name> added" and called router.back(). It
--   wrote nothing. Same shape as the Add Course defect (RC-008): the form
--   reported a save, the record was never there, and nothing distinguishes
--   that from a working form until somebody goes looking for the member.
--
-- WHY THIS IS AN RPC AND NOT A DIRECT WRITE
--   0006 gives `authenticated` INSERT on members, member_emails and
--   member_aliases, so those three could be written straight through
--   PostgREST the way createCourse writes public.courses. member_enrollments
--   and member_schedules deliberately have a READ policy and nothing else --
--   0006's own comment: they "move only through RPCs that can check the
--   subset rule and protect history". No such RPC was ever written.
--
--   So a member added by direct insert lands with NO ENROLMENT. She is
--   expected at no session, appears in no follow-up list and is counted by
--   nothing -- a save that looks like it worked and produces a member the
--   engine cannot see. That is the same lie one layer down, which is why the
--   whole thing is one function: her record, her display names, her
--   addresses, her enrolment and her own days all land together, or none of
--   them do.
--
-- SECURITY DEFINER means RLS is bypassed inside, so the checks below ARE the
-- policy. They are deliberately the same two predicates the table policies
-- use -- is_active_app_user() and is_subscription_writable() -- so there is
-- one rule, not a second one that can drift.
--
-- SCOPE: the CREATE path only. Changing an existing member's enrolment or
-- her weekday override still has no RPC and still cannot be done from the
-- app; that is recorded as debt rather than half-built here.

create or replace function public.create_member(
  p_full_name   text,
  p_offering_id uuid,
  p_joined_on   date       default null,
  /** Google Meet display names (C-71). Academy-wide unique: one display name
   *  can never point at two members, or an import would have to guess. */
  p_aliases     text[]     default '{}',
  /** The FIRST address becomes primary; there is always exactly one (C-73).
   *  An empty list is a real answer -- she is listed and counted as excluded
   *  from every send, never quietly dropped (C-76). */
  p_emails      text[]     default '{}',
  /** Her own days. NULL means she follows the offering's schedule, which is
   *  not the same as an empty list. */
  p_weekdays    smallint[] default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor     uuid := public.current_app_user_id();
  v_from      date := coalesce(p_joined_on, current_date);
  v_member_id uuid;
  v_code      text;
  v_days      smallint[];
  v_alias     text;
  v_email     text;
  v_first     boolean := true;
begin
  -- ------------------------------------------------------------ the gate
  if v_actor is null then
    raise exception 'only a signed-in, active user can add a member'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing can be added'
      using errcode = '42501';
  end if;

  if p_full_name is null or length(btrim(p_full_name)) < 2 then
    raise exception 'her name is needed' using errcode = '55000';
  end if;
  -- the same bound the column carries, said in words rather than as a
  -- constraint name nobody outside the schema can read
  if length(btrim(p_full_name)) > 120 then
    raise exception 'her name is longer than 120 characters' using errcode = '55000';
  end if;
  -- A member cannot have started next week. The form does not offer a future
  -- day; this is the same rule where it cannot be skipped.
  if v_from > current_date then
    raise exception 'a joining date in the future cannot be recorded'
      using errcode = '55000';
  end if;

  -- ------------------------------------------------------- the offering
  -- She joins a course AT ONE BRANCH -- that pair is the offering, and if it
  -- does not exist there is nothing to enrol her into. Naming it is better
  -- than a foreign-key error nobody can read.
  if not exists (select 1 from public.course_offerings o
                  where o.id = p_offering_id and o.deleted_at is null) then
    raise exception 'that course is not offered at that branch'
      using errcode = 'P0002';
  end if;

  -- the schedule effective on the day she joins, if there is one
  select s.weekdays into v_days
    from public.offering_schedules s
   where s.offering_id = p_offering_id
     and s.effective_from <= v_from
     and (s.effective_to is null or s.effective_to >= v_from)
   order by s.effective_from desc
   limit 1;

  -- 0006 puts the subset rule here on purpose: it needs the offering schedule
  -- effective on the same dates, which a CHECK constraint cannot see. An
  -- override that is not a subset would make her expected at a session that
  -- does not run.
  if p_weekdays is not null then
    if coalesce(array_length(p_weekdays, 1), 0) = 0 then
      raise exception 'pick at least one day, or leave her days blank to follow the course'
        using errcode = '55000';
    end if;
    if v_days is null then
      raise exception 'that offering has no schedule on %, so there are no days to choose from', v_from
        using errcode = '55000';
    end if;
    if not (p_weekdays <@ v_days) then
      raise exception 'her days must be days the course actually runs (%)', v_days
        using errcode = '55000';
    end if;
  end if;

  -- --------------------------------------------------------- her record
  insert into public.members (member_code, full_name, joined_on, status, created_by)
  values ('RF-' || lpad(nextval('public.member_code_seq')::text, 6, '0'),
          btrim(p_full_name), p_joined_on, 'active', v_actor)
  returning id, member_code into v_member_id, v_code;

  -- ------------------------------------------------------ display names
  foreach v_alias in array coalesce(p_aliases, '{}'::text[]) loop
    if length(btrim(v_alias)) > 0 then
      begin
        insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by)
        values (v_member_id, 'name', btrim(v_alias), 'member_form', v_actor);
      exception when unique_violation then
        -- Named, not swallowed: the operator has to know WHICH name clashed,
        -- and dropping it silently would leave an import matching her rows
        -- to somebody else.
        raise exception 'the display name "%" already belongs to another member', btrim(v_alias)
          using errcode = '23505';
      end;
    end if;
  end loop;

  -- ---------------------------------------------------------- addresses
  foreach v_email in array coalesce(p_emails, '{}'::text[]) loop
    if length(btrim(v_email)) > 0 then
      begin
        insert into public.member_emails (member_id, email, is_primary, status, source, created_by)
        values (v_member_id, btrim(lower(v_email)), v_first, 'unknown', 'member_form', v_actor);
      exception when unique_violation then
        raise exception 'the address "%" is already on another member', btrim(lower(v_email))
          using errcode = '23505';
      end;
      v_first := false;
    end if;
  end loop;

  -- ---------------------------------------------------------- enrolment
  insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
  values (v_member_id, p_offering_id, v_from, v_actor);

  -- --------------------------------------------------------- her own days
  if p_weekdays is not null then
    insert into public.member_schedules (member_id, effective_from, weekdays, note, created_by)
    values (v_member_id, v_from, p_weekdays, 'set when she was added', v_actor);
  end if;

  -- Every table above carries its own audit trigger from 0006, so the row
  -- changes are recorded either way. This one line records the ACT, which no
  -- per-row trigger can see: one person added one member, once.
  perform public.audit_log('member.created', 'member', v_member_id::text,
    jsonb_build_array(jsonb_build_object('field', 'full_name', 'old', null, 'new', btrim(p_full_name))),
    jsonb_build_object('offering_id', p_offering_id, 'joined_on', p_joined_on,
                       'aliases', coalesce(array_length(p_aliases, 1), 0),
                       'emails', coalesce(array_length(p_emails, 1), 0),
                       'own_days', p_weekdays is not null));

  return jsonb_build_object('member_id', v_member_id, 'member_code', v_code);
end $$;

revoke all on function public.create_member(text, uuid, date, text[], text[], smallint[])
  from public, anon;
grant execute on function public.create_member(text, uuid, date, text[], text[], smallint[])
  to authenticated, service_role;

-- The sequence is read only through the function above; nothing else may
-- burn codes, and anon may not touch it at all.
revoke all on sequence public.member_code_seq from public, anon, authenticated;
grant usage on sequence public.member_code_seq to service_role;

comment on function public.create_member(text, uuid, date, text[], text[], smallint[]) is
  'Adds a member, her display names, her addresses, her enrolment and her optional weekday override in one transaction. SECURITY DEFINER: the is_active_app_user()/is_subscription_writable() checks inside are the policy, matching the table policies in 0006.';
