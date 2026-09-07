-- 0037 · a second file for a day REPLACES that day's register
--
-- WHAT WAS PROMISED AND WHAT WAS DONE
--   A corrected export for a day already imported has always been allowed:
--   0024 says so out loud -- "a second file for the same day updates that
--   session; it cannot create a rival one" -- and the upload screen now asks
--   before it does it, in the requester's own words: *"show message that you
--   existing data will be overridden ... on click confirm override"*
--   (requests/2026-09-07-upload-override-confirm.md).
--
--   The word in that message is OVERRIDDEN, and until this migration it was
--   not true. Every name in the new file was upserted, so anybody the two
--   files disagree ABOUT was corrected. Anybody the second file simply does
--   not name was not: the absent sweep is `on conflict do nothing`, so a
--   member the first file marked present KEPT that present for ever. She is
--   the whole reason a corrected file gets uploaded -- the wrong name, the
--   visitor who was never in the class -- and she was the one row the
--   correction could not reach.
--
-- WHAT THIS ADDS, and it is three statements
--   1. The upsert now carries `import_id`, so a row says which FILE last
--      wrote it. Without that, "not written by this import" is unaskable and
--      the reconciliation below cannot tell last week's row from this one's.
--   2. Anybody EXPECTED whose row an earlier file wrote, and this file does
--      not name, goes back to `absent`.
--   3. Anybody NOT expected in the same position -- an 'extra' -- has her row
--      soft-deleted. `absent_must_be_expected` (0008) forbids marking her
--      absent, and it is right: she was never due. A file that does not name
--      her is saying she was not there, and "not expected, not present" is
--      no row at all.
--
-- WHAT IT REFUSES TO TOUCH, deliberately
--   * A ROW SOMEBODY MARKED BY HAND. set_attendance (0035) stamps
--     `corrected_at` when a person disagrees with the register, and 0035
--     exists precisely because the file was wrong about her. A later import
--     silently reverting that would be the file overruling the person who
--     corrected it -- invisibly, which is the worst kind. The upload dialog
--     says so before she confirms: "Marks you made by hand on the roster are
--     kept."
--   * A ROW NO FILE WROTE (`import_id is null`) -- the same case seen from
--     the other side: a mark that arrived by hand and was never in a file.
--   * `attendance_unique_live` and `absent_must_be_expected` -- neither is
--     loosened. The soft delete in (3) is what keeps the second true.
--
-- NOT A SCHEMA CHANGE. No column, index, constraint or grant moves; this
-- re-issues commit_csv_import from 0026 with the three statements above and
-- three counts on the way out. Diff it against 0026 and that is the whole of
-- the difference.
--
-- The counts are returned because a promise that data will be replaced is
-- worth nothing if nobody can see what was replaced -- the result screen
-- reports them (src/data/uploadOverride.ts, overrideSummary).

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
  -- what replacing an existing register moved (0037)
  v_reverted      int := 0;
  v_removed       int := 0;
  v_kept_by_hand  int := 0;
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
        raw_display_name = excluded.raw_display_name,
        -- 0037: WHICH FILE last wrote this row. It was left at the first
        -- file's id, so a re-import could not tell a row it had just written
        -- from one last week's file left behind -- which is exactly the
        -- question the reconciliation below has to ask.
        import_id = excluded.import_id;
      v_present_ids := array_append(v_present_ids, v_member_id);
    end if;
  end loop;

  -- --------------------------------------------- everyone else was absent
  insert into public.attendance_records (session_id, member_id, status, expected, import_id, created_by)
  select v_session_id, em.member_id, 'absent', true, p_import_id, p_actor
    from public.expected_members_for_session(v_session_id) em
   where not (em.member_id = any (v_present_ids))
  on conflict (session_id, member_id) where deleted_at is null do nothing;

  -- ------------------------------------------- THE OVERRIDE (0037)
  -- Everything above makes the register agree with this file about everybody
  -- this file NAMES. What is left is everybody it does not: rows an earlier
  -- file wrote and this one has not touched. Until now they simply stayed,
  -- which is why "your existing data will be overridden" was not true.
  --
  -- Counted before it is changed, and counted separately from what is left
  -- alone, because the result screen reports all three.
  -- Only the rows the override WOULD have moved: a hand mark that already
  -- agrees with what the file implies was never "kept" from anything, and
  -- reporting it would inflate the number a person is asked to trust.
  select count(*) into v_kept_by_hand
    from public.attendance_records a
   where a.session_id = v_session_id and a.deleted_at is null
     and a.corrected_at is not null
     and not (a.member_id = any (v_present_ids))
     and (a.status <> 'absent' or not a.expected);

  -- SHE WAS DUE, an earlier file said present, this one does not name her.
  with reverted as (
    update public.attendance_records a
       set status           = 'absent',
           minutes_in_call  = null,
           raw_display_name = null,
           import_id        = p_import_id
     where a.session_id = v_session_id
       and a.deleted_at is null
       and a.status <> 'absent'
       and a.expected                       -- absent_must_be_expected (0008)
       and a.corrected_at is null           -- a person's mark outranks a file
       and a.import_id is not null          -- and so does a mark no file wrote
       and a.import_id <> p_import_id       -- an earlier file's row, not this one's
       and not (a.member_id = any (v_present_ids))
    returning 1)
  select count(*) into v_reverted from reverted;

  -- SHE WAS NEVER DUE ('extra'), and this file does not name her either. She
  -- cannot be marked absent -- absent_must_be_expected forbids it and is
  -- right -- so the row goes. Soft, like every delete here: audit_logs and
  -- the row itself both survive.
  with removed as (
    update public.attendance_records a
       set deleted_at = now()
     where a.session_id = v_session_id
       and a.deleted_at is null
       and not a.expected
       and a.corrected_at is null
       and a.import_id is not null
       and a.import_id <> p_import_id
       and not (a.member_id = any (v_present_ids))
    returning 1)
  select count(*) into v_removed from removed;

  if v_reverted > 0 or v_removed > 0 then
    perform public.audit_log_as(p_actor, 'csv_import.overrode_register', 'session', v_session_id::text,
      '[]'::jsonb,
      jsonb_build_object('import_id', p_import_id, 'reverted', v_reverted,
                         'removed', v_removed, 'kept_by_hand', v_kept_by_hand));
  end if;

  -- AFTER the override, never before: the counts have to describe the
  -- register this import leaves behind, not the one it replaced.
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
    'present_or_extra', coalesce(array_length(v_present_ids, 1), 0),
    -- Always present, zeroes included: a caller that has to tell "nothing was
    -- overridden" from "this server does not report overrides" reads the key,
    -- not the numbers.
    'overridden', jsonb_build_object(
      'reverted', v_reverted, 'removed', v_removed, 'kept_by_hand', v_kept_by_hand));
end $$;

revoke all on function public.commit_csv_import(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.commit_csv_import(uuid, uuid, jsonb) to service_role;

comment on function public.commit_csv_import(uuid, uuid, jsonb) is
  'Applies a staged CSV import in one transaction. A second file for a day already imported '
  'REPLACES that day''s register (0037): rows an earlier file wrote and this file does not name '
  'go back to absent, or are soft-deleted when the member was never expected. A row a person '
  'marked by hand (set_attendance, 0035 -- corrected_at) is never reverted, and neither is one '
  'no file wrote. Returns overridden.{reverted, removed, kept_by_hand}.';
