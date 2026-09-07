-- 0044 · members.inactive_from -- the DATE a member comes off the register
--
-- WHAT WAS WRONG
--   0031 gave `members.status` its only write path and closed the hole where
--   a column that decided who gets mailed could not be set by anybody. What
--   it could not say was WHEN. `status_changed_at` is the moment somebody
--   pressed the control, which under a control that can only say "now" is
--   the same moment as the change itself -- so the two facts were welded
--   together and one of them was missing.
--
--   The academy knows about a departure before it happens. "She is active
--   today and leaves at the end of next month" had exactly two ways of being
--   recorded, and both are wrong: leave her active and remember to come back
--   on the day, or mark her inactive now and withhold five weeks of
--   follow-up she is still owed.
--
-- WHAT THIS ADDS
--   One nullable column, and one function that says what the pair means.
--   `status` stays the STATED answer; `inactive_from` says from when it
--   applies. Her status on a day D is:
--
--     status = 'active'                        -> active
--     inactive_from is not null and D < that   -> active
--     otherwise                                -> status
--
--   NULL IS NOT "TODAY". Every row that exists when this runs carries null,
--   and null goes on meaning exactly what those rows mean now: inactive with
--   no date on record, on every day anybody asks about. That is the whole of
--   the compatibility claim, and it is why the column is nullable rather
--   than defaulted.
--
-- WHAT IT DELIBERATELY DOES NOT DO
--   It does not end her enrolment and it does not move a session, an
--   expectation or an attendance record -- the same list 0031 wrote, for the
--   same reason. Which sessions expect her is
--   `expected_members_for_session` (0007) resolving offering schedule ->
--   enrolment window -> member override, and `members.status` is not one of
--   those three. So a member with a date next month goes on being expected
--   at every session her offering runs, before that date and after it, and
--   every attendance record she already has stays exactly where it is.
--   Un-enrolling her is `update_member` / `delete_course` business and is a
--   different act.
--
-- APPLYING THIS TO PRODUCTION
--   The column is new, so it is null on every existing row and both CHECKs
--   below hold for all of them by construction -- there is no data-shaped
--   way for this to fail a validation scan. `follow_up_candidates()` is
--   replaced, not altered: its signature, its columns and its behaviour for
--   every row with a null `inactive_from` are unchanged.

alter table public.members
  add column inactive_from date;

comment on column public.members.inactive_from is
  'The first day `status` applies -- she is on the register on every day before it. NULL means no date on record (every row written before 0044): the status applies on every day. Dates the FOLLOW-UP, never the enrolment -- expectation is offering schedule -> enrolment window -> member override (0007) and this column is none of the three.';

-- A departure cannot precede an arrival. Both sides nullable, and a null on
-- either side is not a violation: joined_on has always been optional, and a
-- member with no joining date on record simply has nothing to be before.
alter table public.members
  add constraint members_inactive_from_after_joined
  check (inactive_from is null or joined_on is null or inactive_from >= joined_on);

-- A date on an ACTIVE row is a departure nobody scheduled, and every reader
-- would have to decide for itself whether to honour it. There is one answer
-- and the column holds it: the date is cleared whenever the pick moves back
-- to active (set_member_status, below).
alter table public.members
  add constraint members_inactive_from_needs_status
  check (inactive_from is null or status <> 'active');

-- --------------------------------------------------------- the derivation
-- ONE definition of what the pair means, so the candidate query, any report
-- and any future reader cannot each invent their own reading of it. The app
-- has the same three lines in src/data/inactiveFrom.ts (statusOn) and the
-- two are asserted against each other in supabase/tests/33 and
-- src/data/inactiveFrom.test.ts.
--
-- IMMUTABLE, not STABLE: it reads no table and no setting, so it may be used
-- in an index or a generated column later without this having to be revised.
create or replace function public.member_status_on(
  p_status        text,
  p_inactive_from date,
  p_on            date
) returns text
language sql immutable parallel safe as $$
  select case
           when p_status = 'active' then 'active'
           when p_inactive_from is not null and p_on < p_inactive_from then 'active'
           else p_status
         end
$$;

comment on function public.member_status_on(text, date, date) is
  'A member''s status ON a given day, from the stated status and inactive_from (0044). NULL inactive_from means the status applies on every day, which is what every pre-0044 row relies on.';

revoke all on function public.member_status_on(text, date, date) from public, anon;
grant execute on function public.member_status_on(text, date, date) to authenticated, service_role;

-- ------------------------------------------------- who the engine may reach
-- Unchanged except for the one predicate. `m.status = 'active'` becomes the
-- same question asked about a DAY, and the day is `current_date` rather than
-- p_to: this list drives a send that leaves NOW, so whether the academy may
-- write to her is a question about today even when the figures beside her
-- name are a month old. A member whose date has not arrived is listed and
-- written to; she stops being listed on the day itself, with nobody having
-- to press anything.
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
       and public.member_status_on(m.status, m.inactive_from, current_date) = 'active'
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
-- Still the ONLY way the column moves, and now it carries the date.
--
-- WHY THE OLD SIGNATURE IS DROPPED RATHER THAN LEFT BESIDE THIS ONE
--   A 3-argument version with a default plus the surviving 2-argument one
--   makes `set_member_status(id, 'inactive')` ambiguous, and Postgres
--   refuses the call rather than picking -- which would break the roster
--   pill at run time and not at deploy time. One function, one meaning.
--   Every existing caller passes p_member_id and p_status by name and goes
--   on working unchanged: omitting the date means "no date on record", which
--   is the reading every row already has.
drop function if exists public.set_member_status(uuid, text);

create or replace function public.set_member_status(
  p_member_id uuid,
  /** one of the three values members_status_check allows */
  p_status    text,
  /**
   * The first day the status applies. NULL means no date on record -- she is
   * inactive from now on and her past reads the same way, which is what the
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
    raise exception 'the subscription is not writable, so her status was not changed'
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

  -- Marking her active is not a dated act, so it takes the date OFF rather
  -- than leaving one behind for the next reader to interpret.
  v_from := case when p_status = 'active' then null else p_inactive_from end;

  -- A departure before an arrival. The CHECK says the same thing; this says
  -- it to a person, with both dates in it, because the form that sent it
  -- shows this sentence and cannot show a constraint name.
  if v_from is not null and v_member.joined_on is not null and v_from < v_member.joined_on then
    raise exception 'she joined on %, so she cannot become inactive from %',
      to_char(v_member.joined_on, 'DD Mon YYYY'), to_char(v_from, 'DD Mon YYYY')
      using errcode = '22023';
  end if;

  -- Idempotent on the PAIR, not on the status alone: re-sending the same
  -- status with a different date is a real change and must move
  -- status_changed_at, while a double tap on a slow connection -- same
  -- status, same date -- must not rewrite when she came off.
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
  'The ONLY write path for members.status and members.inactive_from -- the columns follow_up_candidates() filters on. Stamps status_changed_at and updated_by from the signed-in actor, so the audit row names who took her off the register. The date says FROM WHEN the status applies: omit it and the status applies on every day, which is what every pre-0044 row means. Touches no enrolment, session, expectation or attendance record. Idempotent on the pair.';
