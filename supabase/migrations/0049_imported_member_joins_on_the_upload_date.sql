-- 0049 · a bulk-imported member had no joining date, because create_member
--        stored the date it was PASSED and enrolled her from the date it
--        COMPUTED
--
-- REPORTED
--   "when member is imported from bulk import then joined on should be default
--    as the current uploaded date"
--
-- THE DEFECT, in four lines of 0016/0026
--
--     v_from date := coalesce(p_joined_on, current_date);   -- the computed one
--     ...
--     insert into public.members (full_name, joined_on, ...)
--     values (btrim(p_full_name), p_joined_on, ...);        -- the passed one
--     ...
--     insert into public.member_enrollments (..., effective_from, ...)
--     values (v_member_id, p_offering_id, v_from, v_actor); -- the computed one
--
--   `v_from` is what the enrolment opens at, what her own schedule starts on,
--   and what the future-date refusal is measured against. The members row --
--   the one the app READS, the one "Joined on" shows, the one
--   src/data/joined.ts narrows every date-scoped screen by -- got the raw
--   argument instead.
--
--   Every caller that names a date sees no difference at all: the two values
--   are then the same value. The one caller that names none sees the whole
--   defect, and that caller is the bulk import: the member file has carried no
--   Joined On column since 0029 ("today is the only answer, so there is no cell
--   left to write a date into the wrong shape"), so bulk_import_members hands
--   this function a null by design. Forty members imported this morning were
--   enrolled from this morning and dated NOTHING -- "—" on her record, and a
--   null that src/data/joined.ts reads, correctly, as "paperwork is thin" and
--   shows her on every past date.
--
--   Two answers to one question about one member, from inside one function.
--   That is guardrail 1's failure -- the derived fact and the stored fact
--   disagreeing -- and it was believed fixed on both sides of the boundary:
--   src/data/repository.ts said "create_member coalesces null to current_date,
--   so a bulk-imported member joins the day she was imported", and 0046's own
--   header said "`joined_on` defaults to current_date (0016/0026)". Both were
--   reading the declaration and neither was reading the INSERT.
--
-- THE FIX
--   Store the date that was computed. `v_from` in the members INSERT, and in
--   the audit entry that reports what was written, so the record, the
--   enrolment, the schedule and the audit log all state one day.
--
--   THE DEFAULT IS current_date, EVALUATED IN THE DATABASE. Not a date the
--   client sends: the upload date that matters is the one the enrolment
--   already starts from, and a browser in another timezone must not be able to
--   date her a day either side of the enrolment it is paired with. This is the
--   same reason 0026 computes v_from once and uses it everywhere.
--
-- WHAT DOES NOT CHANGE
--   * A member added through the form. Add Member has always sent a date (it
--     opens on today), so v_from = p_joined_on and the row is byte-identical.
--   * A future date is still refused, and still measured on v_from.
--   * bulk_import_members is NOT restated. It has been restated by 0028, 0029
--     and 0038 already, and 0046's second reason applies exactly: restating a
--     much-restated function to change a line that is not in it is how a
--     concurrent change to it gets reverted by whichever number is higher.
--   * commit_csv_import is NOT restated. Its add_as_new insert has always
--     dated a member by the session that names her (0026 §361, current in
--     0045); it was swept as a sibling site and needed nothing.
--   * MEMBERS ALREADY IMPORTED KEEP THEIR NULL. This migration writes no
--     existing row. Back-filling would mean deciding, for members created
--     before today, which day to write over "not recorded" -- and 0046 may
--     already have moved some of them to a session date that IS evidence. That
--     is a data decision for the academy, not a side effect of a function
--     change; the SQL for it, if they want it, is a separate migration.
--
-- REHEARSAL
--   supabase/tests/38_imported_member_joined_on.sql calls the function both
--   ways and reads the row back. src/data/importedMemberJoinedOn.test.ts holds
--   the same claim on the migration text and runs under plain node, because
--   the SQL suite needs Postgres (ADR 005) and RC-014 is what an unrun spec
--   costs.
--
-- create_member, re-issued from 0026 with TWO changes: the members INSERT
-- stores v_from, and the audit entry reports v_from. Diff it against 0026 and
-- those are the whole of the difference.
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
  --
  -- v_from, NOT p_joined_on (0049). It is the same value whenever a date was
  -- named, and it is current_date when none was -- which is every member the
  -- bulk import creates, the file having no Joined On column since 0029. The
  -- raw argument here is what dated her record NULL while her enrolment three
  -- inserts below opened today.
  insert into public.members (full_name, joined_on, status, created_by)
  values (btrim(p_full_name), v_from, 'active', v_actor)
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
    -- v_from (0049): the entry reports the day that was WRITTEN. Recording
    -- the argument would put a third answer -- null -- beside a record and
    -- an enrolment that both say today.
    jsonb_build_object('offering_id', p_offering_id, 'joined_on', v_from,
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
  'Adds a member, her display names, her addresses, her enrolment and her optional weekday override in one transaction. SECURITY DEFINER: the is_active_app_user()/is_subscription_writable() checks inside are the policy, matching the table policies in 0006. Since 0026 no member code is assigned. Since 0049 the joining date STORED on her record is coalesce(p_joined_on, current_date) -- the same value her enrolment opens at -- so a caller that names no date (the bulk import, whose file has no such column) dates her the day of the upload.';
