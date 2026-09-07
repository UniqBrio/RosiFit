-- 0040 · rewording a course is not rescheduling it
--
-- REPORTED
--   Edit course -> Postnatal -> open "Wording for this course", tap a detail
--   chip, Save Changes:
--
--     this offering has a completed session on 2026-09-07, so a schedule
--     cannot start on or before it. Choose 2026-09-08 or later.
--     Nothing has been saved.
--
--   Nothing about the schedule had been touched. The days were the same days
--   the course already ran.
--
-- ROOT CAUSE
--   save_course (0022, last re-issued by 0039) ends the offering block with an
--   UNCONDITIONAL
--
--     perform public.set_offering_schedule(v_offering, p_weekdays, current_date, ...)
--
--   so EVERY save -- a renamed course, a changed sender, a different template,
--   a reworded message, a moved threshold -- asks to open a schedule version
--   starting today. set_offering_schedule then applies its history guard
--   ("history may not be rewritten") and refuses, correctly, because a session
--   for this offering has already been marked completed today.
--
--   The guard is right. The call was wrong: an unchanged schedule was being
--   re-asserted as a change. That made the completed-session refusal reachable
--   from a form that has no date field and no schedule field open -- a dead end
--   with nothing on screen to act on -- and it took the wording down with it,
--   because save_course is one transaction.
--
-- THE FIX -- ONE BLOCK CHANGED
--   Compare the days being saved against the schedule in effect TODAY and call
--   set_offering_schedule only when they actually differ. A no-op is not sent.
--
--   set_offering_schedule keeps every guard it has and stays the only write
--   path into offering_schedules (0005 leaves that table with no write policy
--   at all). Nothing is relaxed here: a real change of days on a day that
--   already has a completed session is still refused, in the same words, and
--   that refusal is still the correct one -- it names a date the operator can
--   act on.
--
--   The comparison mirrors set_offering_schedule's own normalisation --
--   distinct, sorted, nulls dropped -- so [3,1,1] and [1,3] are the same
--   schedule to this check exactly as they are to the writer. Comparing the
--   raw p_weekdays would make a reordered array look like a change and put the
--   refusal straight back.
--
-- WHY THE WHOLE BODY IS REPRODUCED
--   Postgres has no partial function edit. The body below is 0039's verbatim,
--   and the ONLY lines that differ are the schedule block and the declarations
--   it needs, each marked `0040:`.

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
  v_actor       uuid;
  v_course_id   uuid;
  v_offering    uuid;
  v_created     boolean := p_course_id is null;
  v_threshold   smallint := coalesce(p_threshold, 4);
  v_wanted      smallint[];        -- 0040: the days being saved, normalised
  v_in_force    smallint[];        -- 0040: the days in effect today, or null
  v_rescheduled boolean := false;  -- 0040: reported, so a caller can say so
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
   where course_id = v_course_id and branch_id = p_branch_id and deleted_at is null
     and meet_code is null;                                  -- 0039: never a group
  if v_offering is null then
    insert into public.course_offerings (course_id, branch_id)
    values (v_course_id, p_branch_id) returning id into v_offering;
  end if;

  -- ---------------------------------------------------------- the schedule
  -- Through 0018, never directly: it is the only thing that checks the
  -- completed-session guard and opens a new version rather than editing one.
  --
  -- 0040: and only when the DAYS CHANGE. Every other field on this form saves
  -- without touching history; re-asserting an unchanged schedule made the
  -- completed-session refusal reachable from a dialog with no date field, and
  -- took the wording down with it.
  select array_agg(d order by d) into v_wanted
    from (select distinct unnest(p_weekdays) as d) u
   where d is not null;

  select os.weekdays into v_in_force
    from public.offering_schedules os
   where os.offering_id = v_offering
     and os.effective_from <= current_date
     and (os.effective_to is null or os.effective_to >= current_date)
   order by os.effective_from desc
   limit 1;

  -- A brand-new offering has no row at all, so v_in_force is null, which is
  -- distinct from any weekday array -- the first schedule is always written.
  if v_in_force is distinct from v_wanted then
    perform public.set_offering_schedule(v_offering, p_weekdays, current_date, 'saved with the course');
    v_rescheduled := true;
  end if;

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

  -- 0040: `rescheduled` is ADDED, nothing is removed. Every existing caller
  -- reads course_id / created / threshold and is unaffected.
  return jsonb_build_object(
    'course_id', v_course_id, 'offering_id', v_offering, 'created', v_created,
    'threshold', v_threshold, 'rescheduled', v_rescheduled);
end $$;
