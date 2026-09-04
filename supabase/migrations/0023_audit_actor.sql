-- 0023 · the audit log learns who did it
--
-- THE DEFECT
-- audit_log() reads the actor from current_app_user_id(), which reads
-- auth.uid(). Every Edge Function calls it through the service-role client,
-- where auth.uid() is null -- so a send, a CSV preview, a CSV commit and
-- every match decision inside it were all written with actor_app_user_id
-- NULL and actor_kind 'anon', and the audit screen rendered every one of
-- them as "System". The log recorded WHAT happened and never WHO, for
-- precisely the actions a person performs deliberately.
--
-- Worse than it looks: 'anon' is the label an UNAUTHENTICATED request would
-- carry. A batch of emails sent by the super admin was indistinguishable, in
-- the one table that is append-only and cannot be edited, from a batch sent
-- by nobody. (Reproduced on the harness: `set local role service_role;
-- select public.audit_log('communication.batch_sent','email_batch','b1');`
-- returns a row with a null actor and kind 'anon'.)
--
-- THE FIX
-- audit_log_as() takes the actor EXPLICITLY. The functions that call it have
-- already authenticated the caller -- requireCaller / requireSuperAdmin, or
-- commit_csv_import's own p_actor -- so the identity is known at the call
-- site and only the log was throwing it away.
--
-- WHY A SECOND FUNCTION AND NOT A SIXTH PARAMETER
-- Adding `p_actor uuid default null` to audit_log() would create a second
-- overload that every existing five-argument call matches EQUALLY WELL, and
-- Postgres refuses an ambiguous call. Every caller in the tree would break at
-- once. A distinct name is additive in the way this repo means it: nothing
-- already applied is edited, and no existing call changes meaning.
--
-- WHY service_role ONLY
-- Naming your own actor is forging a signature. `authenticated` must never
-- reach this: a client that could pass p_actor could write an entry blaming
-- somebody else into a table that by design cannot be corrected. The
-- callers granted it are functions that verified a session first, and
-- audit_log() -- which derives the actor and cannot be told one -- stays the
-- path for everything reached directly from a browser.

create or replace function public.audit_log_as(
  p_actor       uuid,
  p_action      text,
  p_entity_type text,
  p_entity_id   text    default null,
  p_changes     jsonb   default '[]'::jsonb,
  p_metadata    jsonb   default '{}'::jsonb
) returns bigint
language plpgsql security definer set search_path = public, auth as $$
declare
  v_kind text;
  v_id   bigint;
begin
  -- No silent fallback to an unattributed entry. A caller that reaches here
  -- with no actor has lost the identity it was supposed to be carrying, and
  -- writing "System" would hide that in the one table nobody can correct.
  -- audit_log() is the honest path when there genuinely is no actor.
  if p_actor is null then
    raise exception 'audit_log_as requires an actor -- use audit_log() when there is none';
  end if;

  -- Deliberately NOT filtered by is_active or deleted_at. Who performed an
  -- action is a fact about the past; a member of staff who leaves next month
  -- still did this today, and a log that forgot her on the way out would be
  -- rewriting history by omission.
  select u.kind into v_kind from public.app_users u where u.id = p_actor;
  if v_kind is null then
    raise exception 'audit_log_as: % is not an app user', p_actor;
  end if;

  insert into public.audit_logs (actor_app_user_id, actor_kind, action, entity_type,
                                 entity_id, changes, metadata)
  values (p_actor, v_kind, p_action, p_entity_type, p_entity_id,
          public.audit_redact(p_changes), coalesce(p_metadata, '{}'::jsonb))
  returning id into v_id;
  return v_id;
end $$;

revoke all on function public.audit_log_as(uuid, text, text, text, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.audit_log_as(uuid, text, text, text, jsonb, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- commit_csv_import, re-issued so its five entries carry p_actor.
--
-- This is the "match decided" half: every decision the operator takes on an
-- ambiguous or unknown row is audited individually (C-95), and every one of
-- them said System. The body below is 0014's, unchanged except that the five
-- audit_log() calls are audit_log_as(p_actor, ...) -- p_actor was already a
-- parameter and already lands in member_emails.added_by,
-- member_aliases.confirmed_by and attendance_records; only the log itself
-- was discarding it. Diff it against 0014 and those five lines are the whole
-- of the difference.
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

    insert into public.sessions
      (offering_id, session_date, start_time, end_time, status, source, holiday_id, import_id)
    values
      (v_import.offering_id, v_import.session_date, v_offering.start_time, v_offering.end_time,
       case when v_holiday_id is not null then 'holiday' else 'scheduled' end,
       'import', v_holiday_id, p_import_id)
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
      insert into public.members (member_code, full_name, joined_on, status, created_by)
      values ('RF-' || lpad(nextval('public.member_code_seq')::text, 6, '0'),
              v_alias_display, v_import.session_date, 'active', p_actor)
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
