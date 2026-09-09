-- 0057 · ACTIVE FROM -- the day she goes ON the register, and the first write
--        path `members.joined_on` has ever had after the moment she was added
--
-- REPORTED
--   "We have inactive from date selection but not active from -- fix that."
--
-- WHAT WAS ACTUALLY MISSING
--   0045 gave the register its second half: `status` says WHAT, and
--   `inactive_from` says FROM WHEN, and `set_member_status` writes the pair.
--   The first half never got the same treatment. `members.joined_on` is
--   written once, by `create_member` (0016/0026/0049), and after that there is
--   no function anywhere that moves it:
--
--     * `update_member` (0027) takes no p_joined_on -- deliberately, and the
--       app says so out loud (src/data/repository.ts, `MemberUpdate` is
--       `Omit<MemberInput, 'joined_on'>`).
--     * the Edit form renders the date READ-ONLY, with a hint explaining that
--       a picker there would accept a change the form cannot save.
--     * the only writer in the whole schema is 0046's attendance trigger, and
--       it moves the date ONE WAY -- earlier, never later -- because it is
--       reconciling paperwork against evidence, not taking an instruction.
--
--   So the academy had no way to say when a member actually started. That is
--   not a cosmetic gap. `joined_on` is what `src/data/joined.ts` narrows every
--   date-scoped screen by, and it is what her enrolment opens at, so a wrong
--   one hides her from the roster of every day she really attended.
--
--   And it is wrong in bulk RIGHT NOW, by construction: 0049 made a
--   bulk-imported member join on the UPLOAD date, because the member file has
--   carried no date column since 0029. Forty members onboarded in one morning
--   all say they started that morning. 0049 said the back-fill "is a data
--   decision for the academy, not a side effect of a function change; the SQL
--   for it, if they want it, is a separate migration." This is that migration
--   -- as a function the academy drives, rather than a one-off UPDATE, because
--   the answer is different for every member and only they know it.
--
-- WHY A NEW FUNCTION AND NOT A PARAMETER ON update_member
--   Exactly 0045's reasoning for `set_member_status`. A date that decides who
--   is expected at which session gets ONE writer, with its refusals stated in
--   sentences, so every caller -- the Edit form, the bulk import, anything
--   later -- is refused the same way for the same reason. Bolting a nullable
--   p_joined_on onto update_member would also make null ambiguous: the form
--   sends null for "she has no date on record" and the caller means "leave it
--   alone", and those are not the same instruction.
--
-- THE NAME
--   `active_from` in the argument and in the UI; `joined_on` in the column.
--   The column is not renamed -- it is referenced by 0006, 0016, 0026, 0027,
--   0046, 0049, every read in repository.ts and two live indexes, and renaming
--   it would buy a word and cost a migration nobody can review. What the
--   academy calls it and what the schema calls it are allowed to differ; what
--   is NOT allowed is two columns meaning the same day.
--
-- APPLYING THIS TO PRODUCTION
--   Adds two functions and alters no table, so there is no existing row this
--   can fail against and no validation scan to run first. Nothing is
--   back-filled: every member keeps the joining date she has until somebody
--   states a different one.

-- ------------------------------------------------------- the derivation
-- The mirror of `member_status_on` (0045), and deliberately shaped like it:
-- one definition of what the pair (joined_on, on-day) means, so the roster, a
-- report and any future reader cannot each invent their own.
--
-- NULL joined_on is "not recorded", NOT "joined at the beginning of time" and
-- NOT "joined today". src/data/joined.ts already reads it as "paperwork is
-- thin, show her on every day" and this says the same thing in SQL.
create or replace function public.member_joined_by(
  p_joined_on date,
  p_on        date
) returns boolean
language sql immutable parallel safe as $$
  select p_joined_on is null or p_joined_on <= p_on
$$;

comment on function public.member_joined_by(date, date) is
  'Was she a member ON that day, from joined_on alone (0057). NULL means no date on record and reads as YES on every day, which is what src/data/joined.ts does and what every pre-0049 imported row relies on. The other end of the membership window is member_status_on (0045).';

revoke all on function public.member_joined_by(date, date) from public, anon;
grant execute on function public.member_joined_by(date, date) to authenticated, service_role;

-- --------------------------------------------------------- the write path
create or replace function public.set_member_active_from(
  p_member_id   uuid,
  /**
   * The first day she is on the register. NOT NULL: clearing a joining date
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
    raise exception 'the subscription is not writable, so her joining date was not changed'
      using errcode = '42501';
  end if;

  if p_active_from is null then
    raise exception 'a date is needed -- say which day she goes on the register'
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
    raise exception 'she becomes inactive on %, so she cannot go on the register from %',
      to_char(v_member.inactive_from, 'DD Mon YYYY'), to_char(p_active_from, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- ------------------------------------------------------------ refusal 3
  -- 0046's invariant, read forward. That trigger exists because a register
  -- naming her IS evidence she was there, and it moves her joining date back
  -- to meet the evidence. Moving the date FORWARD past a session she is
  -- recorded at would recreate exactly the contradiction 0046 was written to
  -- remove -- an attendance row for a day the roster says she was not a member
  -- -- and it would do it on purpose, from a form. So it is refused, and the
  -- refusal names the day that blocks it.
  select min(s.session_date) into v_first_att
    from public.attendance_records a
    join public.sessions s on s.id = a.session_id
   where a.member_id = p_member_id;

  if v_first_att is not null and p_active_from > v_first_att then
    raise exception 'she is on the register for %, so she cannot join later than that',
      to_char(v_first_att, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- --------------------------------------------------------------- write
  update public.members
     set joined_on  = p_active_from,
         updated_by = v_actor
   where id = p_member_id;

  -- ------------------------------------------------------- her enrolment
  -- 0049's whole point: the record and the enrolment state ONE day. Her
  -- joining date moving and her enrolment staying put is the same two-answers
  -- defect with a different pair of rows, so the EARLIEST enrolment follows.
  --
  -- Only the earliest, and only that one: it is the one her membership opens
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
      raise exception 'her enrolment ended on %, so she cannot join after it',
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
  'The ONLY write path for members.joined_on after create_member -- "Active from" in the UI (0057). Moves her earliest enrolment''s effective_from to the same day, so the record and the enrolment never state two joining dates (0049). Refuses a future date, a date after her inactive_from, and a date after the earliest session she is recorded at (0046 read forward). Idempotent. Touches no session, expectation or attendance record.';
