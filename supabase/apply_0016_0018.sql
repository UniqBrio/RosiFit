-- RosiFit — migrations 0016, 0017 and 0018, concatenated for one-shot application.
--
-- WHY THIS FILE EXISTS
--   0001–0015 are applied to the live project. 0016, 0017 and 0018 are not,
--   and nothing in the app says so until a form fails:
--
--     0016  public.create_member          -> Add Member returns
--           "Could not find the function public.create_member(...) in the
--           schema cache. Nothing has been saved."
--     0017  holidays DELETE + triggers    -> a holiday cannot be deleted.
--     0018  public.set_offering_schedule  -> a course cannot be given days.
--
--   `supabase db push` cannot place them: the live migration-history table
--   holds timestamp-named versions (20260901134714 …) while this directory
--   is numbered 0001…0018, so the CLI refuses without a history repair.
--
-- HOW TO APPLY
--   Supabase dashboard -> SQL editor -> paste this whole file -> Run.
--   One transaction: all three land, or none do.
--
--   Run it ONCE. 0017 creates triggers and a policy with bare CREATE, so a
--   second run fails on "trigger already exists" — which is the honest
--   outcome, not a silent half-apply.
--
-- Generated from supabase/migrations/ on 2026-09-02.

begin;

-- ===================================================================
-- 0016_create_member.sql
-- ===================================================================
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

-- ===================================================================
-- 0017_holiday_delete.sql
-- ===================================================================
-- 0017 · deleting a holiday, and keeping its sessions honest either way
--
-- WHAT WAS MISSING
--   C-92 says removing a holiday returns its sessions to `scheduled`, and
--   public.remove_holiday() has done exactly that since 0007. Nothing could
--   reach it. There was no way to delete a holidays row at all:
--
--     * no DELETE grant and no DELETE policy on public.holidays (0005 granted
--       insert and update only), so PostgREST refused the verb outright; and
--     * 0011/0012 revoked execute on apply_holiday() and remove_holiday()
--       from authenticated, deliberately -- both are SECURITY DEFINER and
--       bypass RLS, so a direct grant would let ANY active staff member
--       rewrite the status of every session in a date range.
--
--   So a holiday could be created and never removed, and the sessions it
--   marked could never come back.
--
-- WHY TRIGGERS RATHER THAN A GRANT OR AN EDGE FUNCTION
--   Granting the two RPCs to authenticated reopens exactly the hole 0012
--   closed. An Edge Function would work but needs a deploy to the live
--   project before anything functions, and it would put the "who may change
--   a holiday" rule in a second place -- the RLS policies on public.holidays
--   already state it.
--
--   Triggers keep ONE rule in ONE place. The client writes the holidays row
--   through the policies 0005 already wrote; the session effects follow from
--   the row automatically. apply_holiday/remove_holiday stay service_role-only
--   as direct calls, reachable now only from a table whose RLS decides who
--   may write it. Nothing can mark a session as a holiday without a holidays
--   row to answer for it.
--
-- BEFORE DELETE, NOT AFTER
--   sessions.holiday_id references holidays(id) with no ON DELETE clause, so
--   the FK is checked before an AFTER DELETE trigger would ever fire and the
--   delete fails while any session still points at the row. remove_holiday()
--   nulls holiday_id, so it has to run BEFORE. An AFTER trigger here is not a
--   style preference; it does not work.

-- ------------------------------------------------------------ session effects
create or replace function public.holidays_apply_effects() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    perform public.apply_holiday(new.id);
    return new;
  elsif tg_op = 'DELETE' then
    -- restores every session this holiday marked, and clears holiday_id so
    -- the foreign key permits the row to go
    perform public.remove_holiday(old.id);
    return old;
  else
    -- UPDATE. 0005 has granted authenticated UPDATE on holidays since the
    -- beginning, so a super admin can already move a holiday's dates or
    -- change its scope -- and until now that left the previously marked
    -- sessions marked and the newly covered ones untouched. A holiday whose
    -- dates disagree with the sessions it marked is the same drift the
    -- follow-up list is derived to avoid, so it is closed here rather than
    -- left for the first edit screen to discover.
    perform public.remove_holiday(old.id);
    perform public.apply_holiday(new.id);
    return new;
  end if;
end $$;

comment on function public.holidays_apply_effects() is
  'Keeps sessions.status in step with the holidays row that caused it. The only path from a client to apply_holiday/remove_holiday, which stay service_role-only as direct calls (0012).';

-- BEFORE DELETE for the foreign key (see the header). INSERT and UPDATE are
-- AFTER, so the row is settled and every CHECK has passed before any session
-- is touched.
create trigger holidays_effects_insert after insert on public.holidays
  for each row execute function public.holidays_apply_effects();

create trigger holidays_effects_update after update of start_date, end_date, branch_id
  on public.holidays
  for each row execute function public.holidays_apply_effects();

create trigger holidays_effects_delete before delete on public.holidays
  for each row execute function public.holidays_apply_effects();

-- ---------------------------------------------------------------- the verb
-- The same predicate as holidays_insert and holidays_update in 0005, stated
-- again rather than shared: a policy that reads differently from its
-- neighbours is how one of them quietly stops matching.
create policy holidays_delete on public.holidays
  for delete to authenticated
  using (public.is_super_admin() and public.is_subscription_writable());

-- 0015 revoked the default privileges that used to hand every new table to
-- authenticated, so this grant is load-bearing: without it the policy above
-- never gets the chance to allow anything.
grant delete on public.holidays to authenticated;

-- service_role already holds `all` on holidays from 0005; nothing to add.

-- The audit trigger from 0005 already covers delete -- audit_holidays is
-- `after insert or update or delete` -- so the removed holiday's name, range
-- and scope survive in audit_logs as PREVIOUS values (C-94), which is what
-- makes a hard delete acceptable here rather than a deleted_at column.

-- ===================================================================
-- 0018_offering_schedule_rpc.sql
-- ===================================================================
-- 0018 · set_offering_schedule -- the write path 0005 promised and never built
--
-- 0005 left offering_schedules deliberately RPC-only: "no direct INSERT/UPDATE
-- policy at all, because a schedule write has to be validated against completed
-- sessions first". The policy was written. The RPC was not. The result was that
-- offering_schedules -- described in 0005 as *** THE source of expected
-- attendance *** -- could not be written by anybody except service_role, so a
-- course could state a frequency and never acquire the weekdays that frequency
-- is an intent ABOUT. No sessions, no expected attendance, no follow-up.
--
-- WHAT "VALIDATED AGAINST COMPLETED SESSIONS" MEANS HERE
-- A completed session has a FROZEN expected set (0007 session_expectations).
-- Moving a schedule back over one would leave the frozen rows describing days
-- the schedule no longer contains -- history saying one thing and the schedule
-- that produced it saying another. So a schedule may only take effect AFTER the
-- last completed session. Earlier is refused, never silently clamped.
--
-- VERSIONING, not overwriting: an existing open schedule is CLOSED the day
-- before the new one starts and the new one is inserted. The exclusion
-- constraint in 0005 already makes overlap impossible; this function closes the
-- old row so the constraint is satisfied by construction rather than by luck.
--
-- The one in-place case is a CORRECTION: a schedule starting on the very day
-- being set, with no completed session on or after it, has produced no history
-- yet, so its weekdays are edited rather than versioned. Versioning a same-day
-- correction would leave a zero-length predecessor describing nothing.
--
-- Sessions are NOT generated here. generate_sessions stays service_role-only
-- and csv-import still creates a session lazily when a file arrives for a date
-- (0014). Setting a schedule states when an offering runs; it does not
-- materialise dates, and this function deliberately does not change that.

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
  if not public.is_super_admin() then
    raise exception 'only the super admin can set an offering schedule'
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

-- 0011/0012 posture: nothing reaches anon, and the app calls this as the
-- signed-in super admin -- the function re-checks that itself, above.
revoke all on function public.set_offering_schedule(uuid, smallint[], date, text)
  from public, anon;
grant execute on function public.set_offering_schedule(uuid, smallint[], date, text)
  to authenticated, service_role;

comment on function public.set_offering_schedule(uuid, smallint[], date, text) is
  'The ONLY write path to offering_schedules (0005 left the table policy-less on purpose). Refuses any effective_from on or before the offering''s last completed session, so a frozen expectation can never be contradicted by the schedule that produced it. Does not generate sessions.';

commit;

-- PostgREST reloads its schema cache on DDL by itself; this is belt and
-- braces so Add Member works the moment the run finishes.
notify pgrst, 'reload schema';
