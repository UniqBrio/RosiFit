-- 0073 · the alias upsert names the key 0071 actually left standing
--
-- WHAT WAS WRONG
--   0071 moved "a duplicate is a duplicate of a course" and, to do it, dropped
--   the academy-wide display-name index:
--
--     member_aliases_unique   unique (alias_type, alias_normalized)   0006
--
--   replacing it with the plain lookup index member_aliases_lookup. Its own
--   blast radius named commit_csv_import and merge_member_into -- but read
--   them for the RULE they enforce, not for the index they NAME. Both still
--   said
--
--     on conflict (alias_type, alias_normalized) do nothing
--
--   and ON CONFLICT does not infer a rule, it infers an INDEX. With no unique
--   index on those two columns Postgres refuses the statement outright:
--
--     42P10  there is no unique or exclusion constraint matching the
--            ON CONFLICT specification
--
--   So since 0071 went live EVERY attendance upload that creates a member or
--   remembers a display name has aborted, and the whole file with it -- the
--   commit is one transaction, so the operator is told nothing imported
--   rather than that one row was awkward. merge_member_into was broken by the
--   same line and had simply not been run yet.
--
-- WHAT THIS ADDS
--   · member_aliases_member_name_unique  unique (member_id, alias_type,
--                                        alias_normalized)
--   · commit_csv_import   -- replaced, the two alias upserts name that index
--   · merge_member_into   -- replaced, the one alias upsert names that index
--
--   The index is the 0071 model written down rather than a retreat from it.
--   0071 did not decide that a display name is unconstrained; it decided the
--   academy is the wrong SCOPE for the question, because splitByCourse
--   already narrows the candidates to the course before it judges a row. What
--   survives that move is the narrower fact nothing has ever wanted twice:
--   one member cannot hold the same display name twice over. Two members may
--   now both answer to "Rahul"; one member may not carry "Rahul" on two rows.
--
--   That is also exactly what the upserts MEAN. Each one is inserting an
--   alias for a member it has already resolved, and `do nothing` is there to
--   keep a re-run from doubling that member's own row -- never to yield the
--   name to somebody else. Naming the per-member index makes each statement
--   say what its own comment already said.
--
-- WHAT THIS DOES NOT DO
--   It does not restore academy-wide uniqueness. 0071 stands.
--
-- BLAST RADIUS
--   · attendance_unique_live -- untouched, and still unique. The attendance
--     upserts in commit_csv_import were never part of this fault; they are
--     re-emitted byte for byte with the rest of the body.
--   · merge_member_into's alias MOVE (the `update ... where not exists`) was
--     already scoped to the target member and is re-emitted unchanged. The
--     collision rule it applies is the rule this index now enforces, which is
--     why nothing there had to be decided.
--   · create_member (0049) and update_member (0027) catch unique_violation by
--     hand rather than naming an index, so neither could raise 42P10. Both
--     regain a live per-member guard here; update_member already tested for
--     the member's own duplicate before inserting, so only a race reaches it.
--   · Grants, security-definer posture and search_path are re-emitted as they
--     stand in production today. Comments are left alone: CREATE OR REPLACE
--     keeps them.
--   · member_emails_unique_live, also dropped by 0071, is NOT part of this.
--     No ON CONFLICT anywhere names it -- the import inserts emails plainly --
--     so it raises no 42P10 and this migration leaves it as 0071 left it.
--
-- PRODUCTION SAFETY
--   This migration builds a UNIQUE index over rows that already exist, which
--   is the case CLAUDE.md says the harness cannot answer. So it does not ask
--   the harness: the guard below counts the offending groups IN THE SAME
--   TRANSACTION and raises with the count before the index is attempted, and
--   the whole file rolls back. It never deletes or edits an alias to make
--   itself pass -- if this raises, a person decides which row goes.
--
--   Run against production on 17-Sep-2026, read-only, the count was 0.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------- refuse to build on sand
do $$
declare v_dups int;
begin
  select count(*) into v_dups from (
    select 1 from public.member_aliases
     group by member_id, alias_type, alias_normalized
    having count(*) > 1
  ) d;
  if v_dups > 0 then
    raise exception 'member_aliases already holds % (member, type, name) group(s) with more than one row, and member_aliases_member_name_unique would refuse them. Resolve them by hand: this migration will not choose which row to drop.', v_dups
      using errcode = '23505';
  end if;
end $$;

create unique index if not exists member_aliases_member_name_unique
  on public.member_aliases (member_id, alias_type, alias_normalized);

comment on index public.member_aliases_member_name_unique is
  'One member, one display name, once -- the uniqueness that survived 0071, which moved the DUPLICATE question from the academy to the course. Two members may share a display name; one member may not hold it twice. This is the index the alias upserts in commit_csv_import and merge_member_into infer; before it existed they named member_aliases_unique (0006, dropped by 0071) and raised 42P10 on every import that created a member.';

-- ------------------------------------------- the import, verbatim but for the key
-- Body copied from 0045 unchanged except the two alias upserts below; the
-- attendance upserts, the counts and the refusals are 0045's own.
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
  -- 0045: what this file CHANGED, per named row, decided before it is written
  v_prior_status  text;
  v_prior_by_hand boolean;
  v_added         int := 0;
  v_updated       int := 0;
  v_unchanged     int := 0;
  v_absent_added  int := 0;
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
        on conflict (member_id, alias_type, alias_normalized) do nothing;
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
      on conflict (member_id, alias_type, alias_normalized) do nothing;
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

      -- 0045: WHAT THIS ROW IS ABOUT TO DO, asked before it does it. After
      -- the upsert the row says what this file says and the question can no
      -- longer be answered -- which is why "nothing changed" could never be
      -- reported. Cleared first: `select into` does null both targets when it
      -- finds nothing, and a counter that depends on remembering that is a
      -- counter the next edit to this loop can break silently.
      v_prior_status  := null;
      v_prior_by_hand := false;
      select a.status, a.corrected_at is not null
        into v_prior_status, v_prior_by_hand
        from public.attendance_records a
       where a.session_id = v_session_id and a.member_id = v_member_id
         and a.deleted_at is null;
      if v_prior_status is null then
        v_added := v_added + 1;
      elsif v_prior_by_hand or v_prior_status = v_status then
        -- Already says what this file says, or says what a person said and
        -- the upsert below leaves her alone. Either way the register does not
        -- move for her: this is the count that makes a second upload of the
        -- same file readable as "there is nothing to update".
        v_unchanged := v_unchanged + 1;
      else
        v_updated := v_updated + 1;
      end if;

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
  --
  -- 0045 counts what it INSERTS. On a second upload of the same file this is
  -- zero -- every expected member already has her row -- and on the first
  -- file for a day it is the rest of the register. Same statement, one
  -- `returning`.
  with swept as (
    insert into public.attendance_records (session_id, member_id, status, expected, import_id, created_by)
    select v_session_id, em.member_id, 'absent', true, p_import_id, p_actor
      from public.expected_members_for_session(v_session_id) em
     where not (em.member_id = any (v_present_ids))
    on conflict (session_id, member_id) where deleted_at is null do nothing
    returning 1)
  select count(*) into v_absent_added from swept;

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
                          and ci.meeting_code is not distinct from v_import.meeting_code
                          -- 0044: AND the same meeting INSTANCE. Two calls on one link are
                          -- two meetings; only a re-export of this one is its earlier version.
                          and ci.meeting_started_at is not distinct from v_import.meeting_started_at)
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
                      and ci.meeting_code is not distinct from v_import.meeting_code
                      -- 0044: AND the same meeting INSTANCE. Two calls on one link are
                      -- two meetings; only a re-export of this one is its earlier version.
                      and ci.meeting_started_at is not distinct from v_import.meeting_started_at)
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
                      and ci.meeting_code is not distinct from v_import.meeting_code
                      -- 0044: AND the same meeting INSTANCE. Two calls on one link are
                      -- two meetings; only a re-export of this one is its earlier version.
                      and ci.meeting_started_at is not distinct from v_import.meeting_started_at)
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

  -- 0045: the change counts are audited with the completion, so "the second
  -- upload changed nothing" is answerable a week later from the audit screen
  -- and not only from a result panel somebody has already closed.
  perform public.audit_log_as(p_actor, 'csv_import.completed', 'csv_import', p_import_id::text, '[]'::jsonb,
    jsonb_build_object('session_id', v_session_id, 'new_members', v_new_members, 'skipped', v_skipped,
                       'added', v_added, 'updated', v_updated, 'unchanged', v_unchanged,
                       'absent_added', v_absent_added));

  return jsonb_build_object(
    'session_id', v_session_id, 'new_members', v_new_members, 'skipped', v_skipped,
    'present_or_extra', coalesce(array_length(v_present_ids, 1), 0),
    -- Always present, zeroes included: a caller that has to tell "nothing was
    -- overridden" from "this server does not report overrides" reads the key,
    -- not the numbers.
    'overridden', jsonb_build_object(
      'reverted', v_reverted, 'removed', v_removed, 'kept_by_hand', v_kept_by_hand),
    -- 0045, and read the same way: the KEY says this server counts changes,
    -- the numbers say whether anything actually moved.
    'changes', jsonb_build_object(
      'added', v_added, 'updated', v_updated, 'unchanged', v_unchanged,
      'absent_added', v_absent_added));
end $$;
revoke all on function public.commit_csv_import(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.commit_csv_import(uuid, uuid, jsonb) to service_role;

-- ------------------------------------------- the merge, verbatim but for the key
-- Body copied from 0032 unchanged except the one alias upsert below. The alias
-- MOVE under it already asked its question of the target member only.
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
  on conflict (member_id, alias_type, alias_normalized) do nothing;

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

revoke all on function public.merge_member_into(uuid, uuid) from public, anon;
grant execute on function public.merge_member_into(uuid, uuid) to authenticated, service_role;
