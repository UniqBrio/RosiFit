-- 0072 · a member goes back ON the register from a day, the way they come off from one
--
-- REQUESTED
--   "on click of inactive tag a pop up should be appearing as mark as active
--    same which is shown for clciking active but allow user to select active
--    from date in pop up and by default the date should be todays date"
--   (requests/2026-09-16-inactive-at-the-bottom-and-active-from.md)
--
-- WHAT WAS WRONG
--   0045 dated ONE direction of the pill. `members.inactive_from` says from
--   when a stated `inactive` applies, so a departure can be recorded a month
--   late or scheduled a month early, and `member_status_on` answers about a
--   DAY rather than about now. Coming back had no such date and could not
--   have one: `members_inactive_from_needs_status` forbids a date beside
--   status = 'active', and set_member_status clears the column on the way in.
--   Marking somebody active therefore meant "active, and always was" -- the
--   one reading the roster's own week strip can step 26 weeks back and
--   contradict.
--
--   So the popup asked for above had nowhere to put its date. This is that
--   place, and it is the exact mirror of 0045 rather than a second mechanism:
--   one date column per direction, one derivation reading both, and the two
--   mutually exclusive by their CHECKs, because a member is either on the
--   register or off it and never both.
--
-- WHAT THIS ADDS
--   · members.active_again_from            -- the first day a stated 'active' applies
--   · two CHECKs mirroring 0045's pair
--   · member_status_on(text, date, date, date) -- a 4-argument OVERLOAD
--   · follow_up_candidates()               -- replaced, to ask the 4-argument one
--   · set_member_status(uuid, text, date, date) -- replaces the 3-argument one
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   · It does not rename, drop or re-type `inactive_from`, and it does not
--     touch a single existing row. 0057 settled the house answer to "the UI
--     calls it something else now" -- keep the column, put the new name at the
--     RPC and UI layer -- and every spec written against 0045 goes on passing
--     because the 3-argument member_status_on is left exactly where it is.
--   · It moves no enrolment, session, expectation or attendance record. 0031
--     says out loud that the status means "stop following this member up", and
--     0045 says a DATE on it is that same fact, dated. A date on the way back
--     in is still that same fact, and `expected_members_for_session` (0007)
--     goes on resolving offering schedule -> enrolment window -> member
--     override, none of which is members.status.
--   · It adds no index. `active_again_from` is read per-row beside the status
--     the `members_status` index (0006) already covers, and an index over a
--     column that is NULL on every row is a page nobody reads.
--
-- APPLYING THIS TO PRODUCTION
--   The two CHECKs are validated against existing rows at ALTER time, so the
--   usual warning applies -- but it is answered here by construction rather
--   than by a query: both predicates are `active_again_from is null or ...`,
--   and the column is added in this same migration with no default, so it is
--   NULL on every row that exists. Neither CHECK can fail on live data.
--
--   Nothing else in this file is data-dependent: two CREATE OR REPLACEs and
--   one DROP/CREATE of functions.
--
-- WHAT THIS COSTS
--   `set_member_status(uuid, text, date)` is DROPPED and replaced by a
--   4-argument version whose fourth parameter defaults to NULL, exactly as
--   0045 dropped 0031's 2-argument version to widen it. Every existing caller
--   -- the app's RPC call, and bulk_set_member_dates (0058/0059/0062) --
--   passes three arguments and resolves to the new function through that
--   default, unchanged and unaware.

-- ---------------------------------------------------------------- the column
alter table public.members
  add column active_again_from date;

comment on column public.members.active_again_from is
  'The first day a member stated active is back ON the register (0072). NULL means the active status applies on every day, which is what every row written before 0072 carries and what a member who never went inactive means. The mirror of inactive_from, and mutually exclusive with it: that column may only sit beside a non-active status, this one only beside active.';

-- A return before an arrival is not a return. The exact mirror of
-- members_inactive_from_after_joined (0045), and it leans on the same column.
alter table public.members
  add constraint members_active_again_from_after_joined
  check (active_again_from is null or joined_on is null or active_again_from >= joined_on);

-- The mirror of members_inactive_from_needs_status, and the reason the two
-- dates can never both be set: that CHECK allows its date only where the
-- status is NOT active, this one only where it IS.
alter table public.members
  add constraint members_active_again_from_needs_status
  check (active_again_from is null or status = 'active');

-- ------------------------------------------------------------ the derivation
-- A 4-argument OVERLOAD, not a replacement. The 3-argument function is what
-- supabase/tests/34 pins the 0045 boundary with, and it is still exactly
-- right for a caller holding no return date; leaving it alone is what keeps
-- that spec a spec rather than a casualty.
--
-- THE NEW LINE IS FIRST, and the order is the whole of the rule. A row
-- carrying a return date states 'active', so without that line the second
-- branch would answer 'active' for every day including the ones before the
-- member came back -- which is the defect 0045 removed from the other
-- direction, arriving from this one.
--
-- 'inactive' is what a day before the return reads as, and it is a statement
-- about the register rather than a guess at what the member was doing: the
-- pair is on-the-register or off-it, and `paused` folds into off exactly as
-- every other reading in the app folds it (src/data/inactiveFrom.ts).
--
-- The comparison is a DATE comparison in SQL and a string comparison in the
-- app, which are the same comparison for ISO dates -- 0045's note on that
-- holds unchanged, and it is why neither side has a timezone in it.
create or replace function public.member_status_on(
  p_status            text,
  p_inactive_from     date,
  p_active_again_from date,
  p_on                date
) returns text
language sql immutable parallel safe as $$
  select case
           when p_active_again_from is not null and p_on < p_active_again_from then 'inactive'
           when p_status = 'active' then 'active'
           when p_inactive_from is not null and p_on < p_inactive_from then 'active'
           else p_status
         end
$$;

comment on function public.member_status_on(text, date, date, date) is
  'A member''s status ON a given day, from the stated status and BOTH status dates (0072). The 3-argument form (0045) is this one with no return date and stays the right question for a caller that holds none. NULL dates mean the stated status applies on every day, which is what every pre-0045 row relies on.';

revoke all on function public.member_status_on(text, date, date, date) from public, anon;
grant execute on function public.member_status_on(text, date, date, date) to authenticated, service_role;

-- ------------------------------------------------- who the engine may reach
-- 0045's function, restated in full with ONE line changed: the predicate now
-- asks the 4-argument derivation, so a member whose return date has not
-- arrived is not written to yet. The reason the day is `current_date` rather
-- than p_to is 0045's and is unchanged -- this list drives a send that leaves
-- NOW, so whether the academy may write to somebody is a question about
-- today even when the figures beside the name are a month old.
create or replace function public.follow_up_candidates(
  p_from date, p_to date,
  p_branch_id uuid default null,
  p_course_id uuid default null
) returns table (
  member_id uuid, full_name text, course_id uuid, course_name text,
  branch_name text, expected int, attended int, missed int,
  attendance_pct numeric, current_streak int,
  config_source text, reason text, has_email boolean
)
language sql stable security definer set search_path = public as $$
  with scope as (
    select distinct m.id as member_id, m.full_name, o.course_id, c.name as course_name,
           b.name as branch_name
      from public.members m
      join public.member_enrollments e on e.member_id = m.id
      join public.course_offerings   o on o.id = e.offering_id
      join public.courses  c on c.id = o.course_id
      join public.branches b on b.id = o.branch_id
     where m.deleted_at is null
       and public.member_status_on(m.status, m.inactive_from, m.active_again_from, current_date) = 'active'
       and (p_branch_id is null or o.branch_id = p_branch_id)
       and (p_course_id is null or o.course_id = p_course_id)
  ),
  metric as (
    select s.*, coalesce(pm.expected,0) as expected, coalesce(pm.attended,0) as attended,
           coalesce(pm.missed,0) as missed, pm.attendance_pct,
           coalesce(st.current_streak,0) as current_streak,
           exists (select 1 from public.member_emails me
                    where me.member_id = s.member_id and me.is_primary
                      and me.deleted_at is null and me.status <> 'bounced') as has_email
      from scope s
      left join lateral public.member_period_metrics(p_from, p_to, s.member_id) pm on true
      left join public.member_stats st on st.member_id = s.member_id
  ),
  judged as (
    select m.*, cfg.source as config_source,
           (cfg.weekly_enabled and m.missed >= cfg.weekly_threshold
                                and m.expected >= cfg.min_expected)      as weekly_hit,
           (cfg.consecutive_enabled and m.current_streak >= cfg.consecutive_threshold)
                                                                          as consecutive_hit,
           cfg.combination, cfg.weekly_threshold, cfg.consecutive_threshold
      from metric m
      join lateral public.effective_follow_up_config(m.course_id) cfg on true
  )
  select member_id, full_name, course_id, course_name, branch_name,
         expected, attended, missed, attendance_pct, current_streak, config_source,
         case
           when weekly_hit and consecutive_hit then
             format('Missed %s of %s this week and %s consecutive', missed, expected, current_streak)
           when weekly_hit then
             format('Missed %s of %s sessions this week', missed, expected)
           else
             format('%s consecutive missed sessions', current_streak)
         end,
         has_email
    from judged
   where case when combination = 'OR' then (weekly_hit or consecutive_hit)
              else (weekly_hit and consecutive_hit) end
$$;

-- 0011/0012 posture, restated because `create or replace` on a SECURITY
-- DEFINER function is exactly where a grant quietly reverts to the default.
revoke all on function public.follow_up_candidates(date, date, uuid, uuid) from public, anon;
grant execute on function public.follow_up_candidates(date, date, uuid, uuid) to authenticated, service_role;

-- ------------------------------------------------------- the write path
-- Widened the way 0045 widened 0031's: the narrower signature is dropped and
-- a defaulted parameter takes its place, so there is ONE write path for the
-- status and its dates rather than two that can disagree about what marking
-- somebody active clears.
drop function if exists public.set_member_status(uuid, text, date);

create or replace function public.set_member_status(
  p_member_id uuid,
  /** one of the three values members_status_check allows */
  p_status    text,
  /**
   * The first day a NON-ACTIVE status applies. NULL means no date on record --
   * the member is inactive from now on and the past reads the same way, as the
   * one-tap roster pill has always meant.
   *
   * Ignored, and cleared, when p_status is 'active'
   * (members_inactive_from_needs_status).
   */
  p_inactive_from date default null,
  /**
   * The first day an ACTIVE status applies -- the mirror, and new in 0072.
   * NULL means active on every day, which is what the one-tap pill has always
   * meant and what every row written before 0072 carries.
   *
   * Ignored, and cleared, when p_status is not 'active'
   * (members_active_again_from_needs_status). The two dates are therefore
   * never both set, whatever a caller sends.
   */
  p_active_again_from date default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor  uuid := public.current_app_user_id();
  v_member record;
  v_from   date;
  v_again  date;
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

  select m.id, m.full_name, m.status, m.inactive_from, m.active_again_from, m.joined_on
    into v_member
    from public.members m
   where m.id = p_member_id and m.deleted_at is null
   for update;
  if not found then
    raise exception 'that member is not on the register'
      using errcode = 'P0002';
  end if;

  -- Each date belongs to one side of the pill, and the other side takes it
  -- OFF rather than leaving one behind for the next reader to interpret.
  v_from  := case when p_status = 'active' then null else p_inactive_from end;
  v_again := case when p_status = 'active' then p_active_again_from else null end;

  -- A departure before an arrival. The CHECK says the same thing; this says
  -- it to a person, with both dates in it, because the form that sent it
  -- shows this sentence and cannot show a constraint name.
  if v_from is not null and v_member.joined_on is not null and v_from < v_member.joined_on then
    raise exception 'this member joined on %, so cannot become inactive from %',
      to_char(v_member.joined_on, 'DD Mon YYYY'), to_char(v_from, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- ...and a RETURN before an arrival, which is the same refusal read the
  -- other way and gets its own sentence for the same reason.
  if v_again is not null and v_member.joined_on is not null and v_again < v_member.joined_on then
    raise exception 'this member joined on %, so cannot go back on the register from %',
      to_char(v_member.joined_on, 'DD Mon YYYY'), to_char(v_again, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- Idempotent on the TRIPLE, not on the status alone: re-sending the same
  -- status with a different date is a real change and must move
  -- status_changed_at, while a double tap on a slow connection -- same
  -- status, same dates -- must not rewrite when the member came off.
  if v_member.status = p_status
     and v_member.inactive_from is not distinct from v_from
     and v_member.active_again_from is not distinct from v_again then
    return jsonb_build_object(
      'member_id', p_member_id, 'full_name', v_member.full_name,
      'status', v_member.status, 'inactive_from', v_member.inactive_from,
      'active_again_from', v_member.active_again_from,
      'changed', false);
  end if;

  update public.members
     set status            = p_status,
         inactive_from     = v_from,
         active_again_from = v_again,
         status_changed_at = now(),
         updated_by        = v_actor
   where id = p_member_id;

  return jsonb_build_object(
    'member_id', p_member_id, 'full_name', v_member.full_name,
    'status', p_status, 'inactive_from', v_from,
    'active_again_from', v_again, 'changed', true);
end $$;

revoke all on function public.set_member_status(uuid, text, date, date) from public, anon;
grant execute on function public.set_member_status(uuid, text, date, date) to authenticated, service_role;

comment on function public.set_member_status(uuid, text, date, date) is
  'The ONLY write path for members.status and its two dates -- the columns follow_up_candidates() filters on. Stamps status_changed_at and updated_by from the signed-in actor, so the audit row names who moved the member. Each date says FROM WHEN the status applies and belongs to one side of the pill: inactive_from to a non-active status, active_again_from (0072) to an active one, each cleared when the other side is stated. Omit both and the status applies on every day, which is what every pre-0045 row means. Touches no enrolment, session, expectation or attendance record. Idempotent on the triple.';
