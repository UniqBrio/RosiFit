-- 0038 · staff run the register, so staff own what the register is kept for
--
-- THE DECISION THIS MIGRATION CARRIES
--   Asked why staff were restricted, the repo owner answered: "Allow crud we
--   are just hiding view of few fields such as overview and staff access and
--   audit log" (requests/2026-09-07-staff-write-access.md). So the boundary
--   moves from "the owner writes the organisation" to "the owner keeps the
--   ACCOUNT and its record; everyone active runs the academy".
--
--   That supersedes two dated rows in docs/registers/RBAC_MATRIX.md -- "Write
--   organisation" (02-Sep-2026) and "Bulk import members" (04-Sep-2026) -- and
--   both are amended there in place, with their old language kept.
--
-- WHAT THIS DOES *NOT* OPEN, deliberately
--   app_users, audit_logs, security questions, PIN issue/reset, academy
--   settings, follow-up rules, email templates, branches and holidays all keep
--   is_super_admin(). Overview, Staff & access and the Audit log stay withheld
--   from staff in the chrome, exactly as 2026-09-06 left them. The owner named
--   courses, members, imports and attendance; nothing else moved.
--
-- WHAT DOES NOT CHANGE AT ALL
--   is_subscription_writable(). Every write below still fails when the
--   subscription lapses -- that is a billing gate, not a role gate, and the
--   two are separate on purpose (0002).
--
-- WHY THE FUNCTION BODIES ARE REPRODUCED IN FULL
--   Postgres has no partial function edit: changing a guard means CREATE OR
--   REPLACE with the whole body. Each of the four below was lifted verbatim
--   from the migration that last defined it -- save_course from 0030,
--   set_offering_schedule from 0018, delete_course from 0020,
--   bulk_import_members from 0029 -- and the ONLY lines that differ are the
--   guard and the comment above it, each marked `0038:`.


-- ---------------------------------------------------------------- policies
-- 0005 wrote these through a loop over four tables. Two of the four move;
-- branches and holidays do not, so they are named one at a time here rather
-- than looped -- a loop would invite the next reader to add the other two.
--
-- offering_schedules is deliberately absent: 0005 left it with no write
-- policy at all and set_offering_schedule is still the only path in.
drop policy if exists courses_insert          on public.courses;
drop policy if exists courses_update          on public.courses;
drop policy if exists course_offerings_insert on public.course_offerings;
drop policy if exists course_offerings_update on public.course_offerings;

do $$
declare tbl text;
begin
  foreach tbl in array array['courses','course_offerings'] loop
    execute format($f$
      create policy %1$s_insert on public.%1$s
        for insert to authenticated
        with check (public.is_active_app_user() and public.is_subscription_writable());
      create policy %1$s_update on public.%1$s
        for update to authenticated
        using (public.is_active_app_user() and public.is_subscription_writable())
        with check (public.is_active_app_user() and public.is_subscription_writable());
    $f$, tbl);
  end loop;
end $$;

-- ---------------------------------------------------------------- functions
create or replace function public.save_course(
  p_name        text,
  p_branch_id   uuid,
  p_weekdays    smallint[],
  p_rule        text,                      -- 'week' | 'consec'
  p_from_email  text,
  p_template_id uuid,
  p_subject     text default null,          -- null = use the template's
  p_body_text   text default null,
  /** null creates; an id edits that course in place */
  p_course_id   uuid default null,
  /** how many missed sessions trigger the follow-up: 1..7 (0030).
   *  Defaults to 4, which is what every call meant before it existed. */
  p_threshold   smallint default 4
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor      uuid;
  v_course_id  uuid;
  v_offering   uuid;
  v_created    boolean := p_course_id is null;
  v_threshold  smallint := coalesce(p_threshold, 4);
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate the organisation tables
  -- carry is restated here or this function is a hole straight through them.
  -- 0038: that predicate is is_active_app_user(), not is_super_admin() --
  -- staff run the register and now own the courses it is kept for.
  if not (public.is_active_app_user() and public.is_subscription_writable()) then
    raise exception 'only a signed-in, active user can add or change a course, and only while the subscription is active'
      using errcode = '42501';
  end if;
  select id into v_actor from public.app_users
   where auth_user_id = auth.uid() and is_active;

  if p_weekdays is null or array_length(p_weekdays, 1) is null then
    -- The canvas makes at least one day required, and the reason is not
    -- cosmetic: with no weekdays nothing is expected of anyone, so no absence
    -- can be counted and the course sits outside the engine entirely.
    raise exception 'a course needs at least one frequency day' using errcode = '23514';
  end if;
  if p_rule not in ('week', 'consec') then
    raise exception 'the follow-up trigger must be week or consec' using errcode = '23514';
  end if;
  -- Checked HERE and not only in the form: the form is one caller, and a
  -- threshold of 0 would flag every member who ever attended everything.
  if v_threshold < 1 or v_threshold > 7 then
    raise exception 'the follow-up threshold must be between 1 and 7, not %', v_threshold
      using errcode = '23514';
  end if;

  -- ------------------------------------------------------------ the course
  if v_created then
    insert into public.courses (name) values (btrim(p_name)) returning id into v_course_id;
  else
    v_course_id := p_course_id;
    update public.courses set name = btrim(p_name) where id = v_course_id;
    if not found then
      raise exception 'that course no longer exists' using errcode = 'P0002';
    end if;
  end if;

  -- ---------------------------------------------------------- the offering
  -- The course AT a branch. One per (course, branch): a second row for the
  -- same pair would split one class's members across two rosters.
  select id into v_offering from public.course_offerings
   where course_id = v_course_id and branch_id = p_branch_id and deleted_at is null;
  if v_offering is null then
    insert into public.course_offerings (course_id, branch_id)
    values (v_course_id, p_branch_id) returning id into v_offering;
  end if;

  -- ---------------------------------------------------------- the schedule
  -- Through 0018, never directly: it is the only thing that checks the
  -- completed-session guard and opens a new version rather than editing one.
  perform public.set_offering_schedule(v_offering, p_weekdays, current_date, 'saved with the course');

  -- -------------------------------------------------------------- the rule
  -- The canvas offers two triggers, one or the other, never both -- so the
  -- unchosen one is DISABLED rather than left at a threshold that still
  -- counts. The COUNT is now the academy's (0030); it lands on whichever
  -- trigger is enabled, and the disabled one keeps it only so that switching
  -- back does not silently reset the number.
  insert into public.course_follow_up_config
    (course_id, weekly_enabled, weekly_threshold,
     consecutive_enabled, consecutive_threshold, combination, updated_by)
  values (v_course_id, p_rule = 'week', v_threshold, p_rule = 'consec', v_threshold, 'OR', v_actor)
  on conflict (course_id) where is_active do update
    set weekly_enabled        = excluded.weekly_enabled,
        weekly_threshold      = excluded.weekly_threshold,
        consecutive_enabled   = excluded.consecutive_enabled,
        consecutive_threshold = excluded.consecutive_threshold,
        updated_by            = excluded.updated_by;

  -- ----------------------------------------------------- the communication
  insert into public.course_communication
    (course_id, from_email, template_id, subject, body_text, updated_by)
  values (v_course_id, p_from_email, p_template_id,
          nullif(btrim(coalesce(p_subject, '')), ''),
          nullif(btrim(coalesce(p_body_text, '')), ''), v_actor)
  on conflict (course_id) do update
    set from_email  = excluded.from_email,
        template_id = excluded.template_id,
        subject     = excluded.subject,
        body_text   = excluded.body_text,
        updated_by  = excluded.updated_by;

  return jsonb_build_object(
    'course_id', v_course_id, 'offering_id', v_offering, 'created', v_created,
    'threshold', v_threshold);
end $$;

create or replace function public.set_offering_schedule(
  p_offering_id   uuid,
  p_weekdays      smallint[],
  p_effective_from date,
  p_note          text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor          uuid;
  v_offering       record;
  v_last_completed date;
  v_weekdays       smallint[];
  v_existing       record;
  v_later          date;
  v_schedule_id    uuid;
  v_mode           text;
begin
  -- SECURITY DEFINER bypasses RLS, so the policy the org tables carry has to be
  -- restated here or this function would be a hole straight through it.
  -- 0038: is_active_app_user(), not is_super_admin(). save_course CALLS this
  -- function, so a staff grant on save_course alone would fail here instead --
  -- and /offering/edit already offers the screen to staff.
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can set an offering schedule'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the schedule was not changed'
      using errcode = '42501';
  end if;
  v_actor := public.current_app_user_id();

  select o.id, o.course_id, o.branch_id into v_offering
    from public.course_offerings o
   where o.id = p_offering_id and o.deleted_at is null;
  if not found then
    raise exception 'that offering does not exist' using errcode = 'P0002';
  end if;

  if p_effective_from is null then
    raise exception 'a schedule needs a date it takes effect from' using errcode = '22004';
  end if;

  -- Deduplicated and sorted, so [3,1,1] and [1,3] are the same schedule and
  -- read back the same way. The CHECK constraints still guard the rest.
  select array_agg(d order by d) into v_weekdays
    from (select distinct unnest(p_weekdays) as d) u
   where d is not null;

  if coalesce(array_length(v_weekdays, 1), 0) = 0 then
    raise exception 'a schedule needs at least one weekday'
      using errcode = '23514';
  end if;
  if not (v_weekdays <@ array[1,2,3,4,5,6,7]::smallint[]) then
    raise exception 'weekdays are 1 (Monday) to 7 (Sunday)'
      using errcode = '23514';
  end if;

  -- ---------------------------------------------- history may not be rewritten
  select max(s.session_date) into v_last_completed
    from public.sessions s
   where s.offering_id = p_offering_id
     and s.status = 'completed'
     and s.deleted_at is null;

  if v_last_completed is not null and p_effective_from <= v_last_completed then
    raise exception
      'this offering has a completed session on %, so a schedule cannot start on or before it. Choose % or later.',
      v_last_completed, v_last_completed + 1
      using errcode = '55000';
  end if;

  -- A schedule already starting LATER would overlap the open-ended row this
  -- inserts. Refused with the date, rather than surfacing an exclusion
  -- violation the operator cannot act on.
  select min(os.effective_from) into v_later
    from public.offering_schedules os
   where os.offering_id = p_offering_id and os.effective_from > p_effective_from;
  if v_later is not null then
    raise exception
      'a later schedule already starts on %. Remove or supersede it before setting one from %.',
      v_later, p_effective_from
      using errcode = '55000';
  end if;

  select os.id into v_existing
    from public.offering_schedules os
   where os.offering_id = p_offering_id and os.effective_from = p_effective_from;

  if found then
    -- Correction: nothing completed has run under it, so there is no history to
    -- preserve and a new version would only add an empty one.
    update public.offering_schedules
       set weekdays = v_weekdays,
           note     = coalesce(p_note, note),
           created_by = coalesce(created_by, v_actor)
     where id = v_existing.id
     returning id into v_schedule_id;
    v_mode := 'corrected';
  else
    -- Close the open row the day before, then open the new one.
    update public.offering_schedules
       set effective_to = p_effective_from - 1
     where offering_id = p_offering_id
       and effective_to is null
       and effective_from < p_effective_from;

    insert into public.offering_schedules
      (offering_id, effective_from, weekdays, note, created_by)
    values (p_offering_id, p_effective_from, v_weekdays, p_note, v_actor)
    returning id into v_schedule_id;
    v_mode := 'versioned';
  end if;

  -- audit_schedules (0005) fires on the row itself, so the change is recorded
  -- without a second, hand-written audit call that could drift from it.
  return jsonb_build_object(
    'schedule_id',       v_schedule_id,
    'offering_id',       p_offering_id,
    'effective_from',    p_effective_from,
    'weekdays',          v_weekdays,
    'sessions_per_week', coalesce(array_length(v_weekdays, 1), 0),
    'mode',              v_mode);
end $$;

create or replace function public.delete_course(p_course_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_course      record;
  v_offerings   uuid[];
  v_sessions    int := 0;
  v_kept        int := 0;
  v_enrolments  int := 0;
  v_now         timestamptz := now();
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate courses_update carries
  -- has to be restated here or this function is a hole straight through it.
  -- 0038: is_active_app_user(), not is_super_admin().
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can delete a course'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the course was not deleted'
      using errcode = '42501';
  end if;

  select c.id, c.name into v_course
    from public.courses c
   where c.id = p_course_id and c.deleted_at is null;
  if not found then
    -- Already gone, or never there. Report the shape the caller expects.
    return jsonb_build_object(
      'course_id', p_course_id, 'name', null, 'offerings', 0,
      'sessions_removed', 0, 'sessions_kept', 0, 'enrolments_ended', 0,
      'already_deleted', true);
  end if;

  select coalesce(array_agg(o.id), '{}') into v_offerings
    from public.course_offerings o
   where o.course_id = p_course_id and o.deleted_at is null;

  -- 1. Enrolments END. No deleted_at on the table, and ending one is already
  --    how a member leaves an offering -- so her history of having been in
  --    this course survives the course itself.
  if array_length(v_offerings, 1) > 0 then
    with ended as (
      update public.member_enrollments
         set status = 'ended',
             effective_to = least(coalesce(effective_to, current_date), current_date)
       where offering_id = any(v_offerings) and status = 'active'
      returning 1)
    select count(*) into v_enrolments from ended;

    -- 2. Sessions that have not happened yet go. A COMPLETED one is history
    --    and stays, with its frozen expectations and its attendance rows.
    with removed as (
      update public.sessions
         set deleted_at = v_now
       where offering_id = any(v_offerings)
         and deleted_at is null
         and status <> 'completed'
      returning 1)
    select count(*) into v_sessions from removed;

    select count(*) into v_kept
      from public.sessions
     where offering_id = any(v_offerings)
       and deleted_at is null
       and status = 'completed';

    -- 3. The offerings themselves. This is the one that actually stops the
    --    expectation: every read of expected attendance goes through here.
    update public.course_offerings
       set deleted_at = v_now
     where id = any(v_offerings);
  end if;

  -- 4. And the course. Last, so a failure anywhere above rolls the whole
  --    thing back rather than leaving a hidden course with live offerings.
  update public.courses set deleted_at = v_now where id = p_course_id;

  return jsonb_build_object(
    'course_id',        p_course_id,
    'name',             v_course.name,
    'offerings',        coalesce(array_length(v_offerings, 1), 0),
    'sessions_removed', v_sessions,
    'sessions_kept',    v_kept,
    'enrolments_ended', v_enrolments,
    'already_deleted',  false);
end $$;

create or replace function public.bulk_import_members(
  p_members             jsonb,
  p_default_offering_id uuid default null,
  p_file_name           text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor     uuid := public.current_app_user_id();
  v_run_id    uuid := gen_random_uuid();
  v_row       jsonb;
  v_rownum    int;
  v_name      text;
  v_course    text;
  v_branch    text;
  v_raw_date  text;
  v_offering  uuid;
  v_joined    date;
  v_aliases   text[];
  v_emails    text[];
  v_result    jsonb;
  v_verdicts  jsonb := '[]'::jsonb;
  v_inserted  int := 0;
  v_skipped   int := 0;
  v_failed    int := 0;
  v_total     int := 0;
begin
  if v_actor is null then
    raise exception 'only a signed-in, active user can import members' using errcode = '42501';
  end if;
  -- 0038: the owner-only guard is GONE. `v_actor is null` above is now the
  -- whole check -- the same one create_member (0016) has always carried, which
  -- is what this function writes every row through.
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing can be imported' using errcode = '42501';
  end if;
  if p_members is null or jsonb_typeof(p_members) <> 'array' then
    raise exception 'the import needs a list of rows' using errcode = '22023';
  end if;
  v_total := jsonb_array_length(p_members);
  if v_total = 0 then
    raise exception 'that file has no rows to import' using errcode = '22023';
  end if;
  if v_total > 500 then
    raise exception 'a file may carry at most 500 members; this one has %', v_total using errcode = '22023';
  end if;
  if p_default_offering_id is not null and not exists (
       select 1 from public.course_offerings o
        where o.id = p_default_offering_id and o.deleted_at is null) then
    raise exception 'that course is not offered at that branch' using errcode = 'P0002';
  end if;

  for v_row in select * from jsonb_array_elements(p_members) loop
    v_rownum  := coalesce((v_row->>'row')::int, 0);
    v_name    := btrim(coalesce(v_row->>'full_name', ''));
    v_course  := btrim(coalesce(v_row->>'course', ''));
    v_branch  := btrim(coalesce(v_row->>'branch', ''));
    v_offering := null;

    if v_course = '' then
      v_offering := p_default_offering_id;
    else
      select o.id into v_offering
        from public.course_offerings o
        join public.courses  c on c.id = o.course_id
        join public.branches b on b.id = o.branch_id
       where o.deleted_at is null and c.deleted_at is null and b.deleted_at is null
         and lower(c.name) = lower(v_course)
         and (v_branch = '' or lower(b.name) = lower(v_branch))
       order by (v_branch = '') desc, b.name
       limit 1;
    end if;

    if v_name = '' then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', 'no name in this row');
      continue;
    elsif exists (select 1 from public.members m
                   where m.deleted_at is null
                     and m.name_normalized = public.normalize_name(v_name)) then
      v_skipped := v_skipped + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'skipped', 'reason', 'already on the register — edit her instead');
      continue;
    elsif v_offering is null then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', case when v_course = ''
                       then 'no course, and this import was not opened from one'
                       else format('no course called "%s"%s', v_course,
                                   case when v_branch = '' then '' else format(' at %s', v_branch) end)
                  end);
      continue;
    end if;

    v_aliases := coalesce(array(select jsonb_array_elements_text(coalesce(v_row->'aliases', '[]'::jsonb))), '{}');
    v_emails  := case when coalesce(v_row->>'email', '') = '' then '{}'::text[]
                      else array[lower(btrim(v_row->>'email'))] end;

    -- ------------------------------------------------- the joining date
    -- THE SHAPE, BEFORE THE CAST (0029). `'01/09/2026'::date` does not
    -- raise -- Postgres reads it under DateStyle and returns a real date,
    -- just not the one she wrote. Only YYYY-MM-DD is accepted, which is
    -- what the template's own column says and what the client already
    -- enforces. A future date is still create_member's refusal, below.
    v_raw_date := nullif(btrim(coalesce(v_row->>'joined_on', '')), '');
    if v_raw_date is not null and v_raw_date !~ '^\d{4}-\d{2}-\d{2}$' then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('"%s" is not a date; write it as YYYY-MM-DD', v_raw_date));
      continue;
    end if;
    begin
      v_joined := v_raw_date::date;          -- shape is right; the DAY may not exist
    exception when others then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('"%s" is not a real date', v_raw_date));
      continue;
    end;

    begin
      v_result := public.create_member(v_name, v_offering, v_joined, v_aliases, v_emails, null);
      v_inserted := v_inserted + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'inserted', 'member_id', v_result->>'member_id');
    exception when others then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', sqlerrm);
    end;
  end loop;

  insert into public.member_import_runs
    (id, file_name, default_offering_id, total_rows, inserted_count, skipped_count, failed_count,
     rows, imported_by)
  values
    (v_run_id, p_file_name, p_default_offering_id, v_total, v_inserted, v_skipped, v_failed,
     v_verdicts, v_actor);

  perform public.audit_log('member.bulk_imported', 'member_import_run', v_run_id::text, '[]'::jsonb,
    jsonb_build_object('file_name', p_file_name, 'total', v_total, 'inserted', v_inserted,
                       'skipped', v_skipped, 'failed', v_failed));

  return jsonb_build_object(
    'run_id', v_run_id, 'total', v_total, 'inserted', v_inserted,
    'skipped', v_skipped, 'failed', v_failed, 'rows', v_verdicts);
end $$;
-- The 0028 comment still said OWNER-ONLY. A comment that contradicts the
-- function it sits on is worse than no comment: it is the thing the next
-- reader trusts instead of reading the guard.
comment on function public.bulk_import_members(jsonb, uuid, text) is
  'Imports a parsed member file in one call. Open to any active user since 0038 (was owner-only, 0028) -- each row is written by create_member in its own sub-transaction, which has always been open to staff, so one refusal never rolls back the rest; a name already on the register is SKIPPED, never overwritten. Returns {run_id, total, inserted, skipped, failed, rows[]} and records the run in member_import_runs, which stays readable by the academy admin only.';

comment on function public.save_course is
  'The Add/Edit Course form as one transaction: course, offering, schedule (via set_offering_schedule), follow-up trigger and communication. Sequenced from the client a failure half way leaves a course expected at no session and counted by nobody -- RC-008 one level up. Since 0030 the follow-up threshold is the academy''s, 1..7. Since 0038 any active user may call it, not the super admin alone.';

comment on function public.delete_course(uuid) is
  'Deletes a course: its offerings go, its future sessions go, its enrolments END, and every completed session with its attendance stays. Idempotent -- deleting an already-deleted course reports zeroes rather than erroring. Since 0038 any active user may call it, not the super admin alone.';

comment on function public.set_offering_schedule(uuid, smallint[], date, text) is
  'The ONLY write path to offering_schedules (0005 left the table policy-less on purpose). Refuses any effective_from on or before the offering''s last completed session, so a frozen expectation can never be contradicted by the schedule that produced it. Does not generate sessions. Since 0038 any active user may call it -- save_course calls this, so the two guards have to agree.';

-- ------------------------------------------------------------ delete_member
--
-- WHY A SOFT DELETE, AND WHY IT IS NOT OPTIONAL
--   attendance_records.member_id references members(id) with NO on-delete
--   clause, so a hard DELETE is refused by the foreign key regardless of what
--   anyone intends. Soft delete is the shape the schema already has:
--   members.deleted_at exists, every live index is `where deleted_at is null`,
--   and every read in src/data/repository.ts already filters on it. This
--   follows removeBranch (0019) and delete_course (0020).
--
-- WHAT ACTUALLY STOPS HER BEING EXPECTED
--   Not deleted_at. expected_members_for_session (0007) reads
--   member_enrollments and never looks at members.deleted_at, so a member
--   whose row is flagged but whose enrolment is still active would keep being
--   expected at every session, and keep being counted absent. ENDING the
--   enrolment is the mechanism; the flag is what takes her off the lists.
--
-- WHY THE ALIASES ARE HARD-DELETED WHEN NOTHING ELSE IS
--   member_aliases has no deleted_at and its unique index is global, not
--   partial. Leaving them would do two things, both wrong: a later upload of
--   the same display name would resolve to a deleted member and attach the
--   day's attendance to her, and a new member with that name could not be
--   registered at all. An alias is a lookup key, not history. The history is
--   in attendance_records, and that is untouched.
--
-- IDEMPOTENT, like delete_course: deleting an already-deleted member reports
-- zeroes rather than erroring. Two taps on a slow connection is not a failure
-- a person needs to read about.
create or replace function public.delete_member(p_member_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_name        text;
  v_enrolments  int := 0;
  v_emails      int := 0;
  v_aliases     int := 0;
  v_attendance  int := 0;
  v_now         timestamptz := now();
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate members_write carries has
  -- to be restated here or this function is a hole straight through it. That
  -- predicate is is_active_app_user() and always has been (0006): writing
  -- members was never the owner's alone, and deleting one follows it.
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can delete a member'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the member was not deleted'
      using errcode = '42501';
  end if;

  select m.full_name into v_name
    from public.members m
   where m.id = p_member_id and m.deleted_at is null;
  if not found then
    return jsonb_build_object(
      'member_id', p_member_id, 'name', null, 'enrolments_ended', 0,
      'emails_removed', 0, 'aliases_removed', 0, 'attendance_kept', 0,
      'already_deleted', true);
  end if;

  -- 1. The enrolment ENDS. greatest(effective_from, ...) because a member may
  --    be enrolled from a future date -- a joining date read out of an
  --    imported file is not always in the past -- and member_enrollments
  --    checks effective_to >= effective_from.
  with ended as (
    update public.member_enrollments
       set status = 'ended',
           effective_to = greatest(
             effective_from,
             least(coalesce(effective_to, current_date), current_date))
     where member_id = p_member_id and status = 'active'
    returning 1)
  select count(*) into v_enrolments from ended;

  -- 2. Her addresses go, which FREES them: member_emails_unique_live is
  --    partial on deleted_at, so the same address can be used again by
  --    whoever holds it next.
  with gone as (
    update public.member_emails
       set deleted_at = v_now
     where member_id = p_member_id and deleted_at is null
    returning 1)
  select count(*) into v_emails from gone;

  -- 3. The lookup keys go for real -- see the note above.
  with gone as (
    delete from public.member_aliases
     where member_id = p_member_id
    returning 1)
  select count(*) into v_aliases from gone;

  -- 4. Counted, not touched. The caller says what SURVIVED, because that is
  --    the half of a deletion a person needs to hear before confirming it.
  select count(*) into v_attendance
    from public.attendance_records
   where member_id = p_member_id and deleted_at is null;

  -- 5. The member herself. audit_members (0006) fires on the UPDATE, so the
  --    deletion is in the log without this function writing one by hand.
  update public.members
     set deleted_at = v_now
   where id = p_member_id;

  return jsonb_build_object(
    'member_id', p_member_id, 'name', v_name,
    'enrolments_ended', v_enrolments, 'emails_removed', v_emails,
    'aliases_removed', v_aliases, 'attendance_kept', v_attendance,
    'already_deleted', false);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks its
-- caller itself, above.
revoke all on function public.delete_member(uuid) from public, anon;
grant execute on function public.delete_member(uuid) to authenticated, service_role;

comment on function public.delete_member(uuid) is
  'Deletes a member: her row and her addresses are flagged deleted, her active enrolment is ENDED so she stops being expected at sessions, and her lookup aliases are removed so a later upload of the same name cannot resolve to her. Every attendance record she has stays. Idempotent -- deleting an already-deleted member reports zeroes rather than erroring.';

