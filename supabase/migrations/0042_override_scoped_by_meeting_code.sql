-- 0042 · a corrected file overwrites only what its own earlier version wrote
--
-- WHAT 0039 GOT WRONG, in the requester's words
--   "We are uploading attendance based on date and member, not on meeting
--   code -- it is just a distinguisher for member."
--
--   0039 read the meeting code as the IDENTITY of a group that meets, and
--   bound it to a course_offerings row. That holds only while a class keeps
--   one Meet link. The academy's codes change from day to day for the same
--   women -- so 0039 would have created a new offering every day, moved the
--   attendees into it, and left anyone who MISSED that day enrolled in
--   yesterday's group: not expected, not swept, not absent. A missed class
--   would vanish instead of counting as a miss. Caught before a single file
--   went through it; no meeting group was ever created in production.
--
-- THE MODEL, restated
--   A session is (course offering, date) -- one a day, as it has been since
--   0007. In the requester's words: "on each member there are 3 statuses --
--   present, absent, yet to mark. Show yet to mark only if for today's date
--   no csv file is uploaded. If the user uploads a csv, mark everyone in the
--   file present and the rest absent. When they upload again, check the
--   members marked absent: if they are in that file, mark them present. Same
--   flow goes on."
--
--   That is what 0014 has done since the first upload: the file's people go
--   present, the sweep marks everyone else due absent, and a later file's
--   upsert flips its own people from absent to present. "Yet to mark" is a
--   day with NO FILE -- no session from an import, no rows -- and is a
--   reading, not a stored status. Six files for six meetings converge on one
--   correct register by the end of the day, one attendance row per member
--   per day, which is the counting rule made structural: "7 days, attended
--   6, the count is 6, irrespective of how many meetings in each day."
--
--   THE MEETING CODE HAS ONE JOB. 0037 made a second file for a day a full
--   override: everyone due whose row an EARLIER file wrote, and this file
--   does not name, goes back to absent. That was right for a corrected
--   export and destructive for a second meeting -- file two erased file one.
--   The code is what tells those two cases apart. The override now reaches
--   only rows whose writing file carried THE SAME meeting code as this one.
--   A corrected export still corrects its own earlier version in full; a
--   different meeting's file is not its earlier version and is left alone.
--
--   `is not distinct from`, deliberately: a file with no meeting code
--   overrides rows written by other no-code files, which is exactly what
--   every file did before 0024 started recording the code. Nothing that
--   works today changes.
--
-- WHAT THIS RE-ISSUES
--   commit_csv_import, from 0037. Three statements -- kept_by_hand,
--   reverted, removed -- each gain one EXISTS clause on the writing file's
--   meeting code. The placement block 0039 added is removed with the model
--   it served. Diff against 0037 and those four hunks are the whole of it.
--
-- WHAT THIS DROPS
--   offering_for_meeting() and place_member_in_group() (0039). Nothing calls
--   them once csv-import is redeployed, and a function that moves enrolments
--   on the evidence of a name should not sit callable with no caller.
--
-- WHAT THIS KEEPS, deliberately
--   course_offerings.meet_code and its two partial indexes (0039). The
--   column stays NULL everywhere; offerings_parent_live is a sound invariant
--   on its own (one offering per course per branch) and is what 0040's
--   save_course guard relies on. Dropping an index other code names is not
--   a cleanup.

drop function if exists public.place_member_in_group(uuid, uuid, date, uuid);
drop function if exists public.offering_for_meeting(uuid, uuid, text, uuid);

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
  -- who is due at this session, asked ONCE and asked LIVE. The `expected`
  -- column on a row is what was true when a file wrote it; enrolments move
  -- between one file and its correction, and reconciling against the stale
  -- copy is how a member ends up with no record at all.
  v_expected_ids  uuid[] := '{}';
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
        -- A MARK SOMEBODY MADE BY HAND SURVIVES A FILE THAT NAMES HER, which
        -- is the half of the rule the two statements below cannot reach.
        -- set_attendance (0035) exists because the file was wrong about her:
        -- she joined from another device, or Meet listed somebody who never
        -- came. Letting the next export put that back would be the file
        -- overruling the person who corrected it -- and silently, because she
        -- is named, so nothing on the result screen would mention her.
        -- The file's own evidence (minutes, the spelling it used, which file
        -- wrote last) is still recorded; only the STATUS is hers.
        status = case when public.attendance_records.corrected_at is not null
                      then public.attendance_records.status
                      else excluded.status end,
        minutes_in_call = excluded.minutes_in_call,
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
  -- `on conflict do nothing`: a member an earlier file today marked present
  -- stays present. Only the upsert above moves a row, and only to present.
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
  -- WHO IS DUE, live. Everything below reconciles against this rather than
  -- against the `expected` column a previous file stamped on the row.
  select coalesce(array_agg(em.member_id), '{}') into v_expected_ids
    from public.expected_members_for_session(v_session_id) em;

  -- Only the rows the override WOULD have moved: a hand mark that already
  -- agrees with what the file says was never "kept" from anything, and
  -- reporting it would inflate the number a person is asked to trust.
  select count(*) into v_kept_by_hand
    from public.attendance_records a
   where a.session_id = v_session_id and a.deleted_at is null
     and a.corrected_at is not null
     and (
       -- NAMED by this file, and her mark disagrees with it. A named row is
       -- written present or extra, so 'absent' is the whole of the
       -- disagreement -- and the upsert above is what let it stand.
       (a.member_id = any (v_present_ids) and a.status = 'absent')
       -- NOT named, and the two statements below would have moved her but
       -- for the mark. A row no file ever wrote is not "kept" from an
       -- override either: it was never in reach of one.
       or (not (a.member_id = any (v_present_ids))
           and a.import_id is not null
           and a.import_id <> p_import_id
           -- 0042: and written by an earlier version of THIS meeting's file.
           and exists (select 1 from public.csv_imports ci
                        where ci.id = a.import_id
                          and ci.meeting_code is not distinct from v_import.meeting_code)
           and (case when a.member_id = any (v_expected_ids)
                     then a.status <> 'absent' else true end))
     );

  -- SHE IS DUE, an earlier file said present, this one does not name her.
  --
  -- `expected` is REWRITTEN as well as read: the row may carry what was true
  -- when the first file landed, and absent_must_be_expected (0008) is a
  -- statement about the row, so the two have to agree.
  with reverted as (
    update public.attendance_records a
       set status           = 'absent',
           expected         = true,
           minutes_in_call  = null,
           raw_display_name = null,
           import_id        = p_import_id
     where a.session_id = v_session_id
       and a.deleted_at is null
       and a.status <> 'absent'
       and a.member_id = any (v_expected_ids)   -- due TODAY, not when a file said so
       and a.corrected_at is null               -- a person's mark outranks a file
       and a.import_id is not null              -- and so does a mark no file wrote
       and a.import_id <> p_import_id           -- an earlier file's row, not this one's
       -- 0042: THE MEETING CODE'S ONE JOB. Only a row written by an earlier
       -- version of THIS meeting's file is this file's to revert. A row
       -- another meeting's file wrote on the same day is not an earlier
       -- version of anything -- it is a different class, and it stands.
       and exists (select 1 from public.csv_imports ci
                    where ci.id = a.import_id
                      and ci.meeting_code is not distinct from v_import.meeting_code)
       and not (a.member_id = any (v_present_ids))
    returning 1)
  select count(*) into v_reverted from reverted;

  -- SHE IS NOT DUE, and this file does not name her either. She cannot be
  -- marked absent -- absent_must_be_expected forbids it and is right, she was
  -- never expected -- so the row goes. Soft, like every delete here:
  -- audit_logs and the row itself both survive.
  --
  -- Keyed on the LIVE answer, so a member enrolled since the first file is
  -- never deleted here: she is due, so the statement above owns her.
  with removed as (
    update public.attendance_records a
       set deleted_at = now()
     where a.session_id = v_session_id
       and a.deleted_at is null
       and not (a.member_id = any (v_expected_ids))
       and a.corrected_at is null
       and a.import_id is not null
       and a.import_id <> p_import_id
       -- 0042: same scope as the revert above, for the same reason.
       and exists (select 1 from public.csv_imports ci
                    where ci.id = a.import_id
                      and ci.meeting_code is not distinct from v_import.meeting_code)
       and not (a.member_id = any (v_present_ids))
    returning 1)
  select count(*) into v_removed from removed;

  if v_reverted > 0 or v_removed > 0 or v_kept_by_hand > 0 then
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
