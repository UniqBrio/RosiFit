-- 0039 · a course runs N meetings a day, and the meeting code says which one
--
-- WHAT THE REGISTER WAS KEYED ON, AND WHY THAT BROKE
--   `sessions_unique_live (offering_id, session_date)` (0007) makes one
--   session per offering per day a database invariant, and 0024 said so out
--   loud: "a second file for the same day updates that session; it cannot
--   create a rival one." That was right while a course ran once a day.
--
--   The academy runs Postnatal as SIX meetings on the same day, each with its
--   own members and its own Google Meet code, and uploads one file as each
--   meeting ends. Every one of those files landed on the SAME session row --
--   and since 0037 made a second file a full override, the second file
--   reverted the first meeting's members to `absent`, the third reverted the
--   second, and the day ended with only the SIXTH meeting's members present.
--   Five real classes were erased by the act of recording the sixth.
--
-- WHAT IDENTIFIES A REGISTER NOW
--   The meeting code identifies the GROUP that meets, and the group is a
--   `course_offerings` row -- the container the schema has had since 0005,
--   unique on (course_id, branch_id, batch_label) and never written by
--   anything but the demo seed. Bind the code to an offering and every rule
--   the requester asked for is an invariant that ALREADY EXISTS:
--
--     * N codes -> N offerings -> N sessions a day     sessions_unique_live
--     * a file touches only its own people             expected_members_for_session
--     * override only on the same code AND date        the supersede check and
--                                                      commit_csv_import already
--                                                      key on offering + date
--     * same code, later date = that day's register    sessions_unique_live
--
--   Nothing in the expectation engine, the frozen expectation, the streak,
--   `member_period_metrics` or the follow-up rule is touched. They are all
--   keyed per-offering already; they simply see one more offering.
--
-- THE COUNTING RULE THIS MUST NOT BREAK, and what keeps it
--   "7 days, attended 6, the count is 6 -- irrespective of how many meetings
--   in each day." A member's count is DAYS attended, never meetings attended.
--   `member_enrollments` allows one offering at a time per member (0006, the
--   `exclude using gist`), so she sits in exactly one group, therefore one
--   session a day, therefore one attendance row a day. The rule is not
--   defended by care here; it is defended by that constraint, which this
--   migration deliberately leaves exactly as it is.
--
-- THE ROSTER OF A GROUP IS THE FILE
--   The CSV carries no course and no branch -- only names (C-74) -- and the
--   operator picks the course on the upload screen. So within that course the
--   group's membership is whoever the file names, and `place_member_in_group`
--   below moves her: her previous enrolment is closed and one on the group is
--   opened. Without that she is not in the group, so
--   `expected_members_for_session` excludes her, she is written `extra`
--   rather than `present`, and she is never counted absent again -- which
--   silently switches off follow-up for her.
--
--   IT REFUSES TO CROSS A COURSE. Name matching is academy-WIDE (the matcher
--   loads every member and every alias), so a file uploaded against the wrong
--   course would otherwise relocate real members into it. A member whose
--   current enrolment is on a DIFFERENT COURSE is reported and left alone.
--
-- WHAT IS NOT LOOSENED, deliberately
--   * `member_enrollments`' exclusion constraint -- see above.
--   * `sessions_unique_live` and `attendance_unique_live` -- untouched. A
--     group gets its own session row; it does not get a rival one.
--   * `absent_must_be_expected` (0008).
--   * 0037's protections: a row a person marked by hand (`corrected_at`)
--     still outranks a file, and so does a row no file wrote.
--
-- ONE EXISTING FUNCTION IS RE-ISSUED: commit_csv_import (0037), gaining ONE
-- block -- the placement. See its own header below. Diff it against 0037 and
-- that block is the whole of the difference.
--
-- TWO OTHERS NEED A GUARD AND DO NOT GET IT HERE, deliberately.
--   save_course and bulk_import_members each resolve "the offering for this
--   course at this branch" with no filter, so once a group exists either
--   could pick the GROUP -- save_course would write the course's schedule
--   onto it, and a bulk upload would enrol its whole file into one meeting.
--   Both need `meet_code is null`.
--
--   They are NOT re-issued here because the only versions available to copy
--   are 0038_staff_write_access's, which also GRANT STAFF WRITE ACCESS to
--   courses and bulk import. That is a permission change belonging to a
--   different request (requests/2026-09-07-staff-write-access.md) and to a
--   different decision; carrying it inside this migration would ship it as a
--   side effect of an attendance change. This request's own DESIGN SURFACE
--   says PERMISSIONS: no, and it means it.
--
--   Where the guard lives instead:
--     * save_course -- 0040 already carries it (`meet_code is null`, naming
--       this migration as its baseline).
--     * bulk_import_members -- 0041, which re-issues it from the 0038
--       baseline with the guard, and applies when 0038 does.
--   Until those land, the hazard is real but narrow: it needs a group to
--   exist AND somebody to save that same course or bulk-import into it.
--   Recorded in docs/registers/TECH_DEBT.md.
--
-- NOT needing a guard, checked: delete_course takes every offering of the
-- course, so it takes the groups too; set_offering_schedule, create_member and
-- update_member take an offering id chosen in the UI, which only ever shows
-- the course's own offering.

-- --------------------------------------------------------------- the column
alter table public.course_offerings
  add column if not exists meet_code text;

-- Globally unique, not per course: a Google Meet code identifies one meeting
-- space in the world. That is also what lets offering_for_meeting() notice a
-- file being uploaded against the wrong course instead of silently splitting
-- a class in two.
create unique index if not exists offerings_meet_code_live
  on public.course_offerings (meet_code)
  where meet_code is not null and deleted_at is null;

-- The course's own offering -- the one every screen shows and every other
-- write path resolves. At most one per (course, branch), so "the parent" is
-- never ambiguous.
create unique index if not exists offerings_parent_live
  on public.course_offerings (course_id, branch_id)
  where meet_code is null and deleted_at is null;

comment on column public.course_offerings.meet_code is
  'The Google Meet code of the meeting this group runs on, or NULL for the course''s own offering. Non-null makes this row a MEETING GROUP: it is hidden from every picker, carries its own members and its own session per day, and is resolved from an uploaded file by offering_for_meeting(). A course with one meeting a day never has one.';

-- ------------------------------------------------ which group a file belongs to
-- Called by the csv-import function BEFORE the preview is staged, so that the
-- supersede check -- which keys on (offering_id, session_date) -- becomes the
-- requester's rule verbatim: override only on the same meeting code AND date.
create or replace function public.offering_for_meeting(
  p_course_id uuid, p_branch_id uuid, p_meet_code text, p_actor uuid default null
) returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_code     text := nullif(btrim(coalesce(p_meet_code, '')), '');
  v_parent   record;
  v_existing record;
  v_id       uuid;
begin
  select id, start_time, end_time into v_parent
    from public.course_offerings
   where course_id = p_course_id and branch_id = p_branch_id
     and meet_code is null and deleted_at is null;
  if not found then
    raise exception 'that course is not offered at that branch' using errcode = 'P0002';
  end if;

  -- A FILE WITH NO MEETING CODE lands on the course itself -- exactly where
  -- every file landed before this migration. An export without the "Meeting
  -- code" line is not evidence of a new group; it is evidence of nothing, and
  -- inventing a group from it would split a class on a missing header.
  if v_code is null then
    return v_parent.id;
  end if;

  select id, course_id into v_existing
    from public.course_offerings
   where meet_code = v_code and deleted_at is null;

  if found then
    -- The code is bound to a course already. If it is not THIS one, the
    -- operator picked the wrong course: refuse rather than move a whole
    -- meeting's members into it.
    if v_existing.course_id <> p_course_id then
      raise exception
        'meeting % already belongs to another course -- upload it there, or correct the course'
        , v_code using errcode = '55000';
    end if;
    return v_existing.id;
  end if;

  -- A code never seen before creates its group, silently and on first sight.
  -- The times are the course's until somebody sets the group's own; the
  -- label is the code, which is the only name the file offers.
  insert into public.course_offerings
    (course_id, branch_id, batch_label, meet_code, start_time, end_time)
  values
    (p_course_id, p_branch_id, v_code, v_code, v_parent.start_time, v_parent.end_time)
  returning id into v_id;

  perform public.audit_log_as(p_actor, 'meeting_group.created', 'offering', v_id::text,
    '[]'::jsonb,
    jsonb_build_object('meet_code', v_code, 'course_id', p_course_id, 'branch_id', p_branch_id));
  return v_id;
end $$;

comment on function public.offering_for_meeting(uuid, uuid, text, uuid) is
  'The meeting group an uploaded file belongs to, created on first sight of its code (0039). A file with no meeting code returns the course''s own offering, which is where every file landed before 0039. A code already bound to another course RAISES rather than moving that meeting''s members.';

-- ----------------------------------------------- the group''s roster is the file
-- Returns what it did, so commit_csv_import can report it:
--   already | placed | moved | other_course | not_a_group
create or replace function public.place_member_in_group(
  p_member_id uuid, p_offering_id uuid, p_on date, p_actor uuid default null
) returns text
language plpgsql security definer set search_path = public as $$
declare
  v_group   record;
  v_current record;
  v_next    date;
begin
  select id, course_id, meet_code into v_group
    from public.course_offerings where id = p_offering_id and deleted_at is null;
  -- The course's own offering is not a group, and enrolment into it is the
  -- roster screen's business, never a file's. A single-meeting course reaches
  -- here and leaves unchanged, which is why this migration cannot alter the
  -- behaviour of any course that does not use meeting codes.
  if not found or v_group.meet_code is null then
    return 'not_a_group';
  end if;

  -- her enrolment in force on the DAY OF THE CLASS, not today: a file for a
  -- past day must be placed against what was true then.
  select e.id, e.offering_id, e.effective_from, o.course_id
    into v_current
    from public.member_enrollments e
    join public.course_offerings o on o.id = e.offering_id
   where e.member_id = p_member_id
     and p_on >= e.effective_from
     and (e.effective_to is null or p_on <= e.effective_to)
   limit 1;

  if not found then
    insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
    values (p_member_id, p_offering_id, p_on, p_actor);
    return 'placed';
  end if;

  if v_current.offering_id = p_offering_id then
    return 'already';
  end if;

  -- SHE BELONGS TO ANOTHER COURSE. Name matching is academy-wide, so this is
  -- reachable by uploading a file against the wrong course -- and moving her
  -- would take a real member out of a course she is really in, on the
  -- evidence of a name. Reported by the caller, never moved.
  if v_current.course_id <> v_group.course_id then
    return 'other_course';
  end if;

  -- An enrolment that has not started by the day of the class is REPOINTED
  -- rather than closed: closing it would need effective_to < effective_from,
  -- which its own CHECK forbids.
  if v_current.effective_from >= p_on then
    update public.member_enrollments
       set offering_id = p_offering_id where id = v_current.id;
    return 'moved';
  end if;

  -- The new row must not overlap a LATER enrolment, or the exclusion
  -- constraint aborts the whole import over one member.
  select min(effective_from) into v_next from public.member_enrollments
   where member_id = p_member_id and effective_from > p_on;

  update public.member_enrollments
     set effective_to = p_on - 1, status = 'ended'
   where id = v_current.id;
  insert into public.member_enrollments
    (member_id, offering_id, effective_from, effective_to, created_by)
  values
    (p_member_id, p_offering_id, p_on,
     case when v_next is null then null else v_next - 1 end, p_actor);
  return 'moved';
end $$;

comment on function public.place_member_in_group(uuid, uuid, date, uuid) is
  'Puts a member the file names into the meeting group the file belongs to, closing her previous enrolment (0039). Refuses to move a member enrolled in a DIFFERENT COURSE -- name matching is academy-wide, so that case is an upload against the wrong course, not a transfer. A no-op for an offering that is not a meeting group.';

revoke all on function public.offering_for_meeting(uuid, uuid, text, uuid) from public, anon, authenticated;
grant execute on function public.offering_for_meeting(uuid, uuid, text, uuid) to service_role;
revoke all on function public.place_member_in_group(uuid, uuid, date, uuid) from public, anon, authenticated;
grant execute on function public.place_member_in_group(uuid, uuid, date, uuid) to service_role;
-- =====================================================================
-- commit_csv_import, re-issued from 0037. THE DIFF IS ONE BLOCK: every
-- member the file names is placed into the meeting group the file belongs to
-- BEFORE she is asked whether she was expected. Everything else -- the five
-- outcomes, the override, the hand-mark protection, the counts -- is 0037
-- byte for byte.
--
-- WHY IT SITS INSIDE THE ROW LOOP and not before it: the members a file
-- names are only known by walking it. expected_members_for_session is asked
-- per row and again for the absent sweep, so a placement made here is
-- visible to both -- which is the whole point. A placement made after the
-- loop would be too late for the row that needed it.
-- =====================================================================

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
  -- where each named member ended up, when this import belongs to a meeting
  -- group (0039). 'not_a_group' is the whole of a single-meeting course's
  -- experience of this migration, and it is counted nowhere.
  v_placement     text;
  v_moved         int := 0;
  v_placed        int := 0;
  v_other_course  int := 0;
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
      -- ------------------------------------------------- THE PLACEMENT (0039)
      -- THE GROUP'S ROSTER IS THE FILE. She is put into the meeting group this
      -- import belongs to BEFORE the question below is asked, because the
      -- question is asked of her enrolment: a member the file names who is not
      -- in the group is not expected, so she is written 'extra' instead of
      -- 'present', is never counted absent again, and drops out of follow-up
      -- silently. A no-op unless this import belongs to a meeting group, which
      -- is why no course that ships today changes behaviour.
      v_placement := public.place_member_in_group(
        v_member_id, v_import.offering_id, v_import.session_date, p_actor);
      if v_placement = 'moved' then
        v_moved := v_moved + 1;
      elsif v_placement = 'placed' then
        v_placed := v_placed + 1;
      elsif v_placement = 'other_course' then
        -- NOT moved, and said out loud. Name matching is academy-wide, so this
        -- is what an upload against the wrong course looks like from in here.
        -- She still gets her attendance row -- as an 'extra', which is what she
        -- is until somebody says otherwise -- but her enrolment is untouched.
        v_other_course := v_other_course + 1;
        perform public.audit_log_as(p_actor, 'csv_import.member_in_other_course',
          'member', v_member_id::text, '[]'::jsonb,
          jsonb_build_object('import_id', p_import_id, 'offering_id', v_import.offering_id));
      end if;

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
      'reverted', v_reverted, 'removed', v_removed, 'kept_by_hand', v_kept_by_hand),
    -- 0039, and reported for the same reason `overridden` is: enrolments MOVED
    -- by an upload is the one consequence of this migration a person could not
    -- otherwise see. `other_course` is the number that matters -- it is what an
    -- upload against the wrong course looks like from the outside.
    'placement', jsonb_build_object(
      'moved', v_moved, 'placed', v_placed, 'other_course', v_other_course));
end $$;

revoke all on function public.commit_csv_import(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.commit_csv_import(uuid, uuid, jsonb) to service_role;

comment on function public.commit_csv_import(uuid, uuid, jsonb) is
  'Applies a staged CSV import in one transaction. Since 0039 an import may belong to a MEETING GROUP -- a course_offerings row bound to a Google Meet code -- and every member the file names is placed into that group before she is asked whether she was expected; a member enrolled in a different COURSE is reported, never moved. Everything 0037 established is unchanged: a second file for the same group and day REPLACES that register, a row a person marked by hand keeps its status, and overridden.{reverted, removed, kept_by_hand} is returned. Adds placement.{moved, placed, other_course}.';
