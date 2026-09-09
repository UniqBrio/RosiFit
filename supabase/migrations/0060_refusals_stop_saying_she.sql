-- 0060  The refusals stop saying "she"
--
-- "we have applied de gender so no where her should be used" -- the requester,
-- 09-Sep-2026.
--
-- CLAUDE.md has held this rule from the start: member-facing copy is written
-- about "the member", never "she". The academy is a women's academy; the
-- software is not, and every one of these sentences is one a licensee reads.
-- Six of them were written the other way.
--
-- WHY THESE TWO FUNCTIONS AND NOT ALL FOURTEEN. Fourteen live functions carry
-- gendered text; this migration takes the two that BULK IMPORT SHOWS. Every
-- row of a members-report upload is written through set_member_status (0045)
-- and set_member_active_from (0057), and bulk_set_member_dates returns their
-- `sqlerrm` verbatim as that row's reason -- so these six sentences are the
-- import screen's own output, printed next to a member's name. The other
-- twelve functions (create_member, update_member, commit_csv_import,
-- merge_member_into among them) are a larger sweep that wants its own change:
-- they are core write paths, several of the specs guarding them are red for
-- unrelated reasons, and replacing them blind is how a refusal stops firing.
--
-- ADDITIVE, because both are applied. Each function is restated in full
-- because that is the only way Postgres replaces one; `diff` against 0045 and
-- 0057 shows the six strings as the only differences. No signature, no
-- behaviour, no grant changes -- the same refusals fire on the same rows, and
-- say the same thing about the same dates.
--
-- NO SPEC IS EDITED, and that is worth stating because it was not obvious in
-- advance. supabase/tests/41 checks these refusals with `t.rejects(sql, what,
-- fragment)`, and its fragments are 'future', 'inactive' and 'register' --
-- the load-bearing NOUN of each sentence, never the pronoun. All three
-- survive the rewrite untouched, so every refusal goes on being asserted by
-- the same spec, unchanged. The specs' own descriptions still read "she";
-- those are developer-facing test names, not copy anybody is shown, and the
-- append-only rule leaves them alone.

create or replace function public.set_member_status(
  p_member_id uuid,
  /** one of the three values members_status_check allows */
  p_status    text,
  /**
   * The first day the status applies. NULL means no date on record -- the
   * member is inactive from now on and the past reads the same way, as the
   * one-tap roster pill has always meant.
   *
   * Ignored, and cleared, when p_status is 'active': coming back on has no
   * date to it, and a date left on an active row is a departure nobody
   * scheduled (members_inactive_from_needs_status).
   */
  p_inactive_from date default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor  uuid := public.current_app_user_id();
  v_member record;
  v_from   date;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate members_update carries --
  -- is_active_app_user() and is_subscription_writable() -- is restated here
  -- or this function is a hole straight through it.
  if v_actor is null or not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can change a member''s status'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the status was not changed'
      using errcode = '42501';
  end if;

  -- The CHECK would refuse a bad value anyway, with a constraint name for a
  -- message. A person reads this one.
  if p_status is null or p_status not in ('active', 'paused', 'inactive') then
    raise exception 'a member is active, paused or inactive -- % is not one of them', coalesce(p_status, 'nothing')
      using errcode = '22023';
  end if;

  select m.id, m.full_name, m.status, m.inactive_from, m.joined_on into v_member
    from public.members m
   where m.id = p_member_id and m.deleted_at is null
   for update;
  if not found then
    raise exception 'that member is not on the register'
      using errcode = 'P0002';
  end if;

  -- Marking active is not a dated act, so it takes the date OFF rather
  -- than leaving one behind for the next reader to interpret.
  v_from := case when p_status = 'active' then null else p_inactive_from end;

  -- A departure before an arrival. The CHECK says the same thing; this says
  -- it to a person, with both dates in it, because the form that sent it
  -- shows this sentence and cannot show a constraint name.
  if v_from is not null and v_member.joined_on is not null and v_from < v_member.joined_on then
    raise exception 'this member joined on %, so cannot become inactive from %',
      to_char(v_member.joined_on, 'DD Mon YYYY'), to_char(v_from, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- Idempotent on the PAIR, not on the status alone: re-sending the same
  -- status with a different date is a real change and must move
  -- status_changed_at, while a double tap on a slow connection -- same
  -- status, same date -- must not rewrite when the member came off.
  if v_member.status = p_status and v_member.inactive_from is not distinct from v_from then
    return jsonb_build_object(
      'member_id', p_member_id, 'full_name', v_member.full_name,
      'status', v_member.status, 'inactive_from', v_member.inactive_from,
      'changed', false);
  end if;

  update public.members
     set status            = p_status,
         inactive_from     = v_from,
         status_changed_at = now(),
         updated_by        = v_actor
   where id = p_member_id;

  return jsonb_build_object(
    'member_id', p_member_id, 'full_name', v_member.full_name,
    'status', p_status, 'inactive_from', v_from, 'changed', true);
end $$;

revoke all on function public.set_member_status(uuid, text, date) from public, anon;
grant execute on function public.set_member_status(uuid, text, date) to authenticated, service_role;

comment on function public.set_member_status(uuid, text, date) is
  'The ONLY write path for members.status and members.inactive_from -- the columns follow_up_candidates() filters on. Stamps status_changed_at and updated_by from the signed-in actor, so the audit row names who took the member off the register. The date says FROM WHEN the status applies: omit it and the status applies on every day, which is what every pre-0044 row means. Touches no enrolment, session, expectation or attendance record. Idempotent on the pair.';


-- ---------------------------------------------------------------------------

-- --------------------------------------------------------- the write path
create or replace function public.set_member_active_from(
  p_member_id   uuid,
  /**
   * The first day the member is on the register. NOT NULL: clearing a date
   * is un-recording a fact, which is a different act from correcting one, and
   * no screen asks for it.
   */
  p_active_from date
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor      uuid := public.current_app_user_id();
  v_member     record;
  v_enrol      record;
  v_first_att  date;
  v_moved      boolean := false;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate members_update carries is
  -- restated here or this function is a hole straight through it. Same two
  -- lines as set_member_status (0045) and for the same reason.
  if v_actor is null or not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can change when a member joined'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the joining date was not changed'
      using errcode = '42501';
  end if;

  if p_active_from is null then
    raise exception 'a date is needed -- say which day this member goes on the register'
      using errcode = '22023';
  end if;

  select m.id, m.full_name, m.joined_on, m.inactive_from into v_member
    from public.members m
   where m.id = p_member_id and m.deleted_at is null
   for update;
  if not found then
    raise exception 'that member is not on the register' using errcode = 'P0002';
  end if;

  -- Idempotent. A double tap on a slow connection is not a change, and must
  -- not restate the enrolment or stamp updated_by.
  if v_member.joined_on is not distinct from p_active_from then
    return jsonb_build_object(
      'member_id', p_member_id, 'full_name', v_member.full_name,
      'active_from', v_member.joined_on, 'enrolment_moved', false, 'changed', false);
  end if;

  -- ------------------------------------------------------------ refusal 1
  -- create_member's rule, where it cannot be skipped. A member cannot have
  -- started next week.
  if p_active_from > current_date then
    raise exception 'a joining date in the future cannot be recorded'
      using errcode = '55000';
  end if;

  -- ------------------------------------------------------------ refusal 2
  -- members_inactive_from_after_joined would raise this as a constraint name.
  -- A person reads this one, with both dates in it, because the form that
  -- sent it shows this sentence and cannot show a constraint.
  if v_member.inactive_from is not null and p_active_from > v_member.inactive_from then
    raise exception 'this member becomes inactive on %, so cannot go on the register from %',
      to_char(v_member.inactive_from, 'DD Mon YYYY'), to_char(p_active_from, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- ------------------------------------------------------------ refusal 3
  -- 0046's invariant, read forward. That trigger exists because a register
  -- naming a member IS evidence they were there, and it moves the joining
  -- date back to meet the evidence. Moving the date FORWARD past a session
  -- they are recorded at would recreate exactly the contradiction 0046 was
  -- written to remove -- an attendance row for a day the roster says they
  -- were not a member -- and it would do it on purpose, from a form. So it
  -- is refused, and the refusal names the day that blocks it.
  select min(s.session_date) into v_first_att
    from public.attendance_records a
    join public.sessions s on s.id = a.session_id
   where a.member_id = p_member_id;

  if v_first_att is not null and p_active_from > v_first_att then
    raise exception 'this member is on the register for %, so cannot join later than that',
      to_char(v_first_att, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- --------------------------------------------------------------- write
  update public.members
     set joined_on  = p_active_from,
         updated_by = v_actor
   where id = p_member_id;

  -- ---------------------------------------------------- the enrolment
  -- 0049's whole point: the record and the enrolment state ONE day. The
  -- joining date moving and the enrolment staying put is the same two-answers
  -- defect with a different pair of rows, so the EARLIEST enrolment follows.
  --
  -- Only the earliest, and only that one: it is the one membership opens
  -- at, and it is the only row that can be moved without the exclusion
  -- constraint `member_enrollments (member_id, daterange(...) with &&)` having
  -- an opinion -- nothing precedes it, so widening it backwards can overlap
  -- nothing, and narrowing it forwards only shrinks it.
  select e.id, e.effective_from, e.effective_to into v_enrol
    from public.member_enrollments e
   where e.member_id = p_member_id
   order by e.effective_from
   limit 1;

  if v_enrol.id is not null and v_enrol.effective_from is distinct from p_active_from then
    -- The one shape that will not go: an ENDED enrolment whose closing date is
    -- already before the new opening one. Refused rather than skipped, because
    -- silently leaving the enrolment behind is how the two dates disagree
    -- again with nobody told.
    if v_enrol.effective_to is not null and v_enrol.effective_to < p_active_from then
      raise exception 'this enrolment ended on %, so the member cannot join after it',
        to_char(v_enrol.effective_to, 'DD Mon YYYY')
        using errcode = '22023';
    end if;
    update public.member_enrollments
       set effective_from = p_active_from
     where id = v_enrol.id;
    v_moved := true;
  end if;

  -- No hand-written audit entry. members and member_enrollments each carry
  -- their own audit trigger from 0006, which records the old and the new date
  -- with the actor -- exactly as set_member_status (0045) relies on. A second,
  -- hand-rolled row would put the same change on the audit screen twice.

  return jsonb_build_object(
    'member_id', p_member_id, 'full_name', v_member.full_name,
    'active_from', p_active_from, 'enrolment_moved', v_moved, 'changed', true);
end $$;

revoke all on function public.set_member_active_from(uuid, date) from public, anon;
grant execute on function public.set_member_active_from(uuid, date) to authenticated, service_role;

comment on function public.set_member_active_from(uuid, date) is
  'The ONLY write path for members.joined_on after create_member -- "Active from" in the UI (0057). Moves the earliest enrolment''s effective_from to the same day, so the record and the enrolment never state two joining dates (0049). Refuses a future date, a date after the member''s inactive_from, and a date after the earliest session they are recorded at (0046 read forward). Idempotent. Touches no session, expectation or attendance record.';

