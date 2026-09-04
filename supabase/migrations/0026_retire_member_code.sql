-- 0026 · the member code is retired -- nothing assigns one any more
--
-- WHAT IT WAS
--   0006 gave every member an RF-000123 code, NOT NULL and unique among the
--   live rows; 0014 added the sequence that minted them and 0016, 0023 and
--   0024 each carried the same 'RF-' || lpad(nextval(...), 6, '0') into
--   their INSERT. It was a second identity for a row that already has a
--   primary key, and the only place it earned its keep was on screen -- as
--   the thing that told two members with the same name apart.
--
-- WHY IT GOES
--   The academy does not use it. Nobody is asked for a code, nobody quotes
--   one, and the follow-up mail is addressed by email. Keeping it meant
--   every new member acquired an identifier that exists only so the UI has
--   something to print, and a screen that printed it was showing an operator
--   a string she has no way to act on. Her primary address does the
--   telling-apart job instead, and it is the address the send path already
--   uses.
--
-- WHAT IS DELIBERATELY *NOT* DONE
--   * The COLUMN STAYS. Every member created before today has a code, that
--     code is in the audit log and in exports somebody may still hold, and
--     dropping the column would destroy the only record of what those rows
--     were once called. It becomes nullable, unwritten and unread.
--   * members_code_live goes, because the rule it enforced -- "a live
--     member's code is unique" -- is no longer a rule this app maintains.
--     (It would not have failed: a partial unique index treats NULLs as
--     distinct, so any number of code-less members would have satisfied it.
--     It is dropped because it asserts something untrue, not because it
--     breaks.)
--   * member_code_seq STAYS, at zero grants. Dropping it would silently
--     reset the counter if anyone ever revived the idea, and re-minting a
--     code a former member already carries is worse than a dead sequence.
--
-- SAFE OVER EXISTING DATA: nothing here rewrites a row. Dropping NOT NULL
-- and dropping an index are catalogue-only; no existing code is altered and
-- no existing value is re-validated.

alter table public.members alter column member_code drop not null;

comment on column public.members.member_code is
  'HISTORICAL ONLY. Codes minted before 0026; nothing assigns one now and no screen reads one. Members added after 0026 have NULL here.';

drop index if exists public.members_code_live;

-- Nothing may mint another code. The two functions below are SECURITY
-- DEFINER and would bypass this anyway -- it is their rewritten INSERTs, not
-- this revoke, that actually stop the minting. This closes the direct path.
revoke all on sequence public.member_code_seq from public, anon, authenticated, service_role;

-- ---------------------------------------------------------------------------
-- create_member, re-issued from 0016 with TWO changes: the INSERT no longer
-- names member_code, and the returned object no longer carries one. Diff it
-- against 0016 and those are the whole of the difference.
-- ---------------------------------------------------------------------------

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
  -- No member_code (0026). Her id is her identity; her address is what an
  -- operator tells two same-named members apart by.
  insert into public.members (full_name, joined_on, status, created_by)
  values (btrim(p_full_name), p_joined_on, 'active', v_actor)
  returning id into v_member_id;

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

  return jsonb_build_object('member_id', v_member_id);
end $$;

revoke all on function public.create_member(text, uuid, date, text[], text[], smallint[])
  from public, anon;
grant execute on function public.create_member(text, uuid, date, text[], text[], smallint[])
  to authenticated, service_role;

comment on function public.create_member(text, uuid, date, text[], text[], smallint[]) is
  'Adds a member, her display names, her addresses, her enrolment and her optional weekday override in one transaction. SECURITY DEFINER: the is_active_app_user()/is_subscription_writable() checks inside are the policy, matching the table policies in 0006. Since 0026 no member code is assigned.';

-- ---------------------------------------------------------------------------
-- commit_csv_import, re-issued from 0024 with ONE change: the add_as_new
-- INSERT no longer names member_code. Diff it against 0024 and that insert
-- is the whole of the difference.
-- ---------------------------------------------------------------------------

create or replace function public.commit_csv_import(
  p_import_id uuid, p_actor uuid, p_decisions jsonb
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_import        record;
  v_offering      record;
  v_holiday_id    uuid;
  v_session_id    uuid;
  v_on_schedule   boolean;
  v_rows          jsonb;
  v_row           jsonb;
  v_decision      jsonb;
  v_decisions_by_row jsonb;
  v_kind          text;
  v_action        text;
  v_member_id     uuid;
  v_alias_display text;
  v_expected      boolean;
  v_status        text;
  v_has_primary   boolean;
  v_new_email     text;
  v_present_ids   uuid[] := '{}';
  v_new_members   int := 0;
  v_skipped       int := 0;
begin
  select * into v_import from public.csv_imports where id = p_import_id for update;
  if not found then
    raise exception 'csv import % not found', p_import_id using errcode = 'P0002';
  end if;
  if v_import.status <> 'previewed' then
    raise exception 'this import is % and cannot be committed again', v_import.status using errcode = '55000';
  end if;

  select o.id, o.branch_id, o.start_time, o.end_time into v_offering
    from public.course_offerings o where o.id = v_import.offering_id;
  if not found then
    raise exception 'the offering for this import no longer exists' using errcode = 'P0002';
  end if;

  select coalesce(jsonb_object_agg(d->>'row', d), '{}'::jsonb) into v_decisions_by_row
    from jsonb_array_elements(coalesce(p_decisions, '[]'::jsonb)) d;

  -- ---------------------------------------------------------- the session
  select id into v_session_id from public.sessions
   where offering_id = v_import.offering_id and session_date = v_import.session_date
     and deleted_at is null;

  if v_session_id is null then
    select hh.id into v_holiday_id from public.holidays hh
     where v_import.session_date between hh.start_date and hh.end_date
       and (hh.branch_id is null or hh.branch_id = v_offering.branch_id)
     order by hh.branch_id nulls last limit 1;

    -- WHO WAS DUE AT A SESSION NOBODY SCHEDULED.
    -- The default expectation_mode is 'schedule', which asks the offering's
    -- weekdays who was expected. For a session the schedule does not contain
    -- -- the whole point of uploading a file for an ad-hoc class -- that
    -- answer is NOBODY: expected_count 0, not one absence recorded, and the
    -- follow-up engine blind to a class that really happened.
    -- So the schedule is used when it covers this date, and everyone enrolled
    -- is expected when it does not.
    select exists (
      select 1 from public.offering_schedules os
       where os.offering_id = v_import.offering_id
         and v_import.session_date >= os.effective_from
         and (os.effective_to is null or v_import.session_date <= os.effective_to)
         and extract(isodow from v_import.session_date)::smallint = any (os.weekdays)
    ) into v_on_schedule;

    insert into public.sessions
      (offering_id, session_date, start_time, end_time, status, source, holiday_id, import_id,
       expectation_mode)
    values
      (v_import.offering_id, v_import.session_date, v_offering.start_time, v_offering.end_time,
       case when v_holiday_id is not null then 'holiday' else 'scheduled' end,
       'import', v_holiday_id, p_import_id,
       case when v_on_schedule then 'schedule' else 'all_enrolled' end)
    returning id into v_session_id;
  else
    update public.sessions set import_id = p_import_id where id = v_session_id;
  end if;

  -- ------------------------------------------------------ walk every row
  v_rows := coalesce(v_import.summary->'rows', '[]'::jsonb);
  for v_row in select * from jsonb_array_elements(v_rows)
  loop
    v_kind     := v_row->>'kind';
    v_decision := v_decisions_by_row->(v_row->>'row');
    v_action   := coalesce(v_decision->>'action',
                    case v_kind when 'matched' then 'accept'
                                when 'noEmail' then 'continue_without_email'
                                else null end);
    v_member_id     := null;
    v_alias_display := v_row->>'raw_name';

    if v_kind in ('possible', 'ambiguous', 'unmatched') and v_action is null then
      raise exception 'row % (%) needs a decision before this import can be committed',
        v_row->>'row', v_kind using errcode = '55000';
    end if;

    if v_kind in ('matched', 'noEmail') then
      v_member_id := nullif(v_row->'candidates'->0->>'member_id', '')::uuid;

      if v_action = 'add_email' then
        v_new_email := v_decision->>'email';
        if v_new_email is null or v_new_email = '' then
          raise exception 'row %: add_email needs an email address', v_row->>'row' using errcode = '55000';
        end if;
        select exists (select 1 from public.member_emails
                        where member_id = v_member_id and is_primary and deleted_at is null)
          into v_has_primary;
        insert into public.member_emails (member_id, email, is_primary, status, source, created_by)
        values (v_member_id, v_new_email, not v_has_primary, 'unknown', 'csv_import', p_actor);
        perform public.audit_log_as(p_actor, 'csv_import.email_added', 'member', v_member_id::text,
          jsonb_build_array(jsonb_build_object('field', 'email', 'old', null, 'new', v_new_email)),
          jsonb_build_object('import_id', p_import_id, 'row', v_row->>'row'));
      end if;

    elsif v_action in ('use_existing', 'select_member', 'link_existing') then
      v_member_id := coalesce(nullif(v_decision->>'member_id', '')::uuid,
                               nullif(v_row->'candidates'->0->>'member_id', '')::uuid);
      if v_member_id is null then
        raise exception 'row %: % needs member_id', v_row->>'row', v_action using errcode = '55000';
      end if;
      if coalesce((v_decision->>'remember_alias')::boolean, true) then
        insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by, import_id)
        values (v_member_id, 'name', v_alias_display, 'csv_import', p_actor, p_import_id)
        on conflict (alias_type, alias_normalized) do nothing;
      end if;
      perform public.audit_log_as(p_actor, 'csv_import.matched_existing', 'member', v_member_id::text,
        '[]'::jsonb, jsonb_build_object('import_id', p_import_id, 'row', v_row->>'row', 'raw_name', v_alias_display));

    elsif v_action = 'add_as_new' then
      if jsonb_array_length(coalesce(v_row->'candidates', '[]'::jsonb)) > 0
         and not coalesce((v_decision->>'confirm_different_person')::boolean, false) then
        raise exception 'row %: a similar member already exists -- confirm this is a different person',
          v_row->>'row' using errcode = '55000';
      end if;
      -- No member_code (0026): a member the import creates is identified by
      -- her id and told apart by her name, course and branch, exactly like
      -- one added through the form.
      insert into public.members (full_name, joined_on, status, created_by)
      values (v_alias_display, v_import.session_date, 'active', p_actor)
      returning id into v_member_id;
      insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
      values (v_member_id, v_import.offering_id, v_import.session_date, p_actor);
      insert into public.member_aliases (member_id, alias_type, alias_display, source, confirmed_by, import_id)
      values (v_member_id, 'name', v_alias_display, 'csv_import', p_actor, p_import_id)
      on conflict (alias_type, alias_normalized) do nothing;
      v_new_members := v_new_members + 1;
      perform public.audit_log_as(p_actor, 'csv_import.member_created', 'member', v_member_id::text,
        jsonb_build_array(jsonb_build_object('field', 'full_name', 'old', null, 'new', v_alias_display)),
        jsonb_build_object('import_id', p_import_id, 'row', v_row->>'row'));

    elsif v_action in ('keep_unmatched', 'skip', 'not_a_member') then
      v_skipped := v_skipped + 1;
      perform public.audit_log_as(p_actor, 'csv_import.row_skipped', 'csv_import', p_import_id::text,
        '[]'::jsonb, jsonb_build_object('row', v_row->>'row', 'raw_name', v_alias_display, 'action', v_action));
    end if;

    if v_member_id is not null then
      v_expected := exists (
        select 1 from public.expected_members_for_session(v_session_id) em
         where em.member_id = v_member_id);
      v_status := case when v_expected then 'present' else 'extra' end;
      insert into public.attendance_records
        (session_id, member_id, status, expected, minutes_in_call, raw_display_name, import_id, created_by)
      values (v_session_id, v_member_id, v_status, v_expected,
              nullif(v_row->>'minutes', '')::int, v_alias_display, p_import_id, p_actor)
      on conflict (session_id, member_id) where deleted_at is null do update set
        status = excluded.status, minutes_in_call = excluded.minutes_in_call,
        raw_display_name = excluded.raw_display_name;
      v_present_ids := array_append(v_present_ids, v_member_id);
    end if;
  end loop;

  -- --------------------------------------------- everyone else was absent
  insert into public.attendance_records (session_id, member_id, status, expected, import_id, created_by)
  select v_session_id, em.member_id, 'absent', true, p_import_id, p_actor
    from public.expected_members_for_session(v_session_id) em
   where not (em.member_id = any (v_present_ids))
  on conflict (session_id, member_id) where deleted_at is null do nothing;

  perform public.refresh_session_counts(v_session_id);
  update public.sessions set status = 'completed', completed_at = now()
   where id = v_session_id and status = 'scheduled';
  perform public.recompute_member_stats();

  update public.csv_imports set
    status = 'completed', completed_at = now(), session_id = v_session_id,
    processed_count = jsonb_array_length(v_rows), decisions = p_decisions
   where id = p_import_id;

  perform public.audit_log_as(p_actor, 'csv_import.completed', 'csv_import', p_import_id::text, '[]'::jsonb,
    jsonb_build_object('session_id', v_session_id, 'new_members', v_new_members, 'skipped', v_skipped));

  return jsonb_build_object(
    'session_id', v_session_id, 'new_members', v_new_members, 'skipped', v_skipped,
    'present_or_extra', coalesce(array_length(v_present_ids, 1), 0));
end $$;

revoke all on function public.commit_csv_import(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.commit_csv_import(uuid, uuid, jsonb) to service_role;
