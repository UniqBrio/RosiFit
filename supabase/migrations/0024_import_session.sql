-- 0024 · attendance from the file, for a session nobody scheduled
--
-- WHAT THE UPLOAD ASSUMED
-- That a session already existed to upload against. The screen listed
-- `sessions` rows with status 'scheduled' and offered those; the import
-- carried an offering and a date chosen from that list. A course whose
-- classes are not on a fixed timetable has no such rows, so the screen said
-- "Every session has a file" and there was no way in at all.
--
-- The file already carries what identifies the session: Google Meet writes
-- its meeting code and the created/ended timestamps above the table. Those
-- are recorded here so an import is traceable to the meeting it came from,
-- and so a second file for a meeting-and-date already imported can be
-- RECOGNISED and said out loud rather than silently overwriting the first.
--
-- WHAT IS NOT CHANGED, deliberately:
--   * attendance_unique_live (session_id, member_id) already makes one
--     record per member per session a database invariant, and the commit
--     already resolves a re-import with ON CONFLICT DO UPDATE. Nothing here
--     loosens either -- the duplicate is reported, never double-counted.
--   * sessions_unique_live (offering_id, session_date) already makes one
--     session per offering per day an invariant. A second file for the same
--     day updates that session; it cannot create a rival one.

alter table public.csv_imports
  add column if not exists meeting_code       text,
  add column if not exists meeting_started_at timestamptz;

comment on column public.csv_imports.meeting_code is
  'The Google Meet code the file names, when it carries one. Evidence of WHICH meeting, kept so an import can be traced back to it.';
comment on column public.csv_imports.meeting_started_at is
  'The created-on timestamp from the file. The session date is derived from this rather than chosen.';

-- Finding a completed import for a meeting on a date -- what "this session
-- already has a file" is answered from.
create index if not exists csv_imports_meeting
  on public.csv_imports (meeting_code, session_date) where meeting_code is not null;

-- ---------------------------------------------------------------------------
-- commit_csv_import, re-issued from 0023 with ONE change: the expectation
-- mode of a session the import itself creates. Diff it against 0023 and the
-- declaration plus that one insert are the whole of the difference.
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
