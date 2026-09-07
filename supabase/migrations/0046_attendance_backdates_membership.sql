-- 0046 · a register that names her is evidence she was there, so her joining
--        date moves back to meet it
--
-- REPORTED
--   "If a student is added on September 7, 2026, they should not appear when
--   viewing attendance or other date-based student data for September 6 or any
--   earlier date."
--
--   The client half of that shipped with RC-029: `members.joined_on` now
--   reaches the screens as a date, and every date-scoped view narrows to the
--   members who had joined by the date it is about.
--
-- WHAT THAT LEFT OPEN ON THIS SIDE
--   `commit_csv_import` matches a participant by alias or address and writes
--   her an attendance row for the session's date, WITHOUT ever looking at when
--   she joined. So a Meet export for 6 September naming a member whose
--   joined_on is the 7th wrote her a row dated the 6th -- and after RC-029 the
--   roster for the 6th no longer shows her, while a row for her sits in the
--   register for that day. Two answers to one question, which is the failure
--   guardrail 1 exists to prevent, arriving from the database's side.
--
-- WHY NOT REFUSE THE ROW, OR THE FILE
--   Because the file is the better evidence. The commonest way this arises is
--   ONBOARDING: an academy bulk-imports forty members today -- `joined_on`
--   defaults to current_date (0016/0026) and the import file carries no date
--   column (0029) -- and then uploads last month's Meet exports to backfill
--   the register. Every one of those files names members whose joining date is
--   after the session. Refusing the file would block the backfill entirely;
--   skipping the row would silently record almost nobody. Both would be the
--   app choosing paperwork over what actually happened.
--
--   So the paperwork moves. She was in the call: that is the fact, and her
--   joining date was simply entered later than the day she started.
--
-- THE RULE, EXACTLY
--   On INSERT of an attendance row, if the member's joining date -- or the
--   enrolment that row belongs to -- begins AFTER the session's date, it is
--   moved back to the session's date.
--
--   * ONLY EVER EARLIER. Nothing here can move a date forward, so a late file
--     can never shorten somebody's membership. The comparison is one-way and
--     that is the whole of the safety argument.
--   * The existing audit triggers (0006) record both writes as `member.update`
--     and `member_enrollment.update`, with the old and new dates, so the change
--     is visible on the audit screen. No second, hand-written entry is added:
--     one change should read as one entry.
--   * A member with NO joining date on record is left alone. Null means "not
--     recorded", and inventing one from a file is not the same as correcting
--     one that is wrong.
--
-- WHY A TRIGGER AND NOT A CHANGE TO commit_csv_import
--   Three reasons, in order of weight:
--     1. The rule is about the ROW, not about one writer of it. Today exactly
--        one writer can produce a pre-joining row -- commit_csv_import, which
--        matches a participant by alias or address and never consults her
--        joining date. set_attendance (0035) cannot: it reads her offering from
--        the enrolment in force on that date and refuses outright, "% was not
--        enrolled in a course on %". So this is not a sweep of several existing
--        callers; it is the rule stated once, where the NEXT writer will
--        inherit it rather than have to remember it.
--     2. commit_csv_import has been restated in full by every migration that
--        has ever touched it -- 0014, 0023, 0024, 0026, 0037, 0039, 0042 and
--        since. Restating it again to add four lines is how a concurrent change
--        to it gets silently reverted by whichever migration number is higher.
--     3. It is additive. Nothing existing is redefined, so nothing existing can
--        regress.
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   It does not touch `expected` or `status` on the row being written. The
--   caller has already resolved those against expected_members_for_session,
--   and expectation is a fact about what the academy expected AT THE TIME --
--   back-dating her membership does not retroactively make anybody expect her.
--   She is recorded 'extra' (turned up when nobody expected her), which is
--   precisely what happened and is never counted as a miss (0008's
--   extra_is_not_expected). The frozen session_expectations are untouched for
--   the same reason.
--
--   It does not fire on UPDATE. A re-import of the same day updates the row in
--   place (`on conflict ... do update`); the membership was already corrected
--   when the row was first written, and re-running the correction on every
--   overwrite would be work with no possible effect.

-- ---------------------------------------------------------------- the trigger
create or replace function public.attendance_backdates_membership()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_session_date date;
  v_offering_id  uuid;
  v_joined_on    date;
  v_enrol_id     uuid;
  v_enrol_from   date;
begin
  select s.session_date, s.offering_id into v_session_date, v_offering_id
    from public.sessions s
   where s.id = new.session_id;

  -- No session, no date to compare against. Cannot happen through the foreign
  -- key, and answering "leave it alone" costs nothing if it ever does.
  if v_session_date is null then
    return new;
  end if;

  -- ------------------------------------------------------- the joining date
  select m.joined_on into v_joined_on
    from public.members m
   where m.id = new.member_id;

  -- Null is "not recorded", not "joined later than every date you can ask
  -- about". Filling it in from a file would be inventing a fact, which is a
  -- different act from correcting one that is demonstrably wrong.
  if v_joined_on is not null and v_joined_on > v_session_date then
    -- updated_at is left to members_updated_at (0006). Setting it here as well
    -- would be a second writer of one column.
    update public.members
       set joined_on = v_session_date
     where id = new.member_id;
  end if;

  -- --------------------------------------------------------- the enrolment
  -- Her enrolment in THIS offering that starts after the session -- the
  -- earliest such, because that is the one this attendance belongs in front
  -- of. Matched by offering, so a member who has since moved to another course
  -- has the enrolment the session is actually part of moved, and not her
  -- current one.
  select e.id, e.effective_from into v_enrol_id, v_enrol_from
    from public.member_enrollments e
   where e.member_id = new.member_id
     and e.offering_id = v_offering_id
     and e.effective_from > v_session_date
   order by e.effective_from
   limit 1;

  if v_enrol_id is null then
    return new;
  end if;

  -- THE EXCLUSION CONSTRAINT IS THE REASON THIS IS NOT A BARE UPDATE.
  -- member_enrollments carries `exclude using gist (member_id with =,
  -- daterange(effective_from, effective_to, '[]') with &&)`: one offering at a
  -- time per member. Stretching this enrolment back over a range she spent in
  -- ANOTHER offering would violate it, and a constraint violation raised from
  -- a trigger would take the whole import down with a message naming a GiST
  -- index -- exactly the class of failure CP-003 exists to keep away from a
  -- person (RC-023).
  --
  -- So the overlap is tested first, and where the move would collide the
  -- enrolment is left exactly as it stands. The attendance row is still
  -- written and still records what happened; only the correction is declined,
  -- because in that case the record is not obviously wrong -- she genuinely
  -- was somewhere else that day.
  if exists (
    select 1
      from public.member_enrollments other
     where other.member_id = new.member_id
       and other.id <> v_enrol_id
       and daterange(other.effective_from, other.effective_to, '[]')
        && daterange(v_session_date, v_enrol_from - 1, '[]')
  ) then
    return new;
  end if;

  update public.member_enrollments
     set effective_from = v_session_date
   where id = v_enrol_id;

  return new;
end;
$$;

-- BEFORE, not AFTER: the correction is part of writing the row, so a caller
-- that rolls back its transaction takes the correction back with it. There is
-- no version of this where the attendance is discarded and the moved date
-- survives.
-- Dropped first so the whole migration is re-runnable: the function above is
-- `create or replace` and a bare `create trigger` is not, which would make a
-- second run fail on the trigger alone -- half-applied, and confusing.
drop trigger if exists attendance_backdates_membership on public.attendance_records;
create trigger attendance_backdates_membership
  before insert on public.attendance_records
  for each row execute function public.attendance_backdates_membership();

-- 0025's standing rule: EVERY migration that creates a function revokes it
-- from PUBLIC explicitly. CREATE FUNCTION grants EXECUTE to PUBLIC by default
-- and that half cannot be closed by ALTER DEFAULT PRIVILEGES, so it is closed
-- by hand, here, or supabase/tests/19_trigger_function_grants.sql fails.
revoke execute on function public.attendance_backdates_membership()
  from public, anon, authenticated;
