-- 0030 · the follow-up threshold is a number the academy sets, not a 4
--
-- WHAT WAS FIXED IN THE CODE
--   0022 wrote the trigger as a choice between two rules and hard-coded the
--   count at FOUR, in the values list, twice:
--
--       values (v_course_id, p_rule = 'week', 4, p_rule = 'consec', 4, ...)
--
--   `course_follow_up_config` has carried `weekly_threshold` and
--   `consecutive_threshold` as real columns since 0009 — the schema always
--   allowed any number. Only the form and this function insisted on four,
--   and the form is the only way an academy can reach it, so four is what
--   every course got.
--
-- WHY IT MATTERS, and it is not a preference
--   A course that runs ONCE a week can never reach four missed sessions in a
--   week. Its weekly trigger is unreachable by arithmetic, so the course
--   silently has no follow-up at all while the form shows it switched on.
--   The academy this was found on runs Postnatal on four days and Prenatal
--   on three; Prenatal's weekly rule could never have fired.
--
-- THE RANGE, and why 7
--   1 to 7. A week has seven days, so a weekly threshold above seven can
--   never fire either -- the same defect the other way up. The same bound is
--   applied to the consecutive count deliberately: a run longer than a week
--   is a member who has left, and the academy asked for one control, not two
--   with different limits.
--
-- The parameter is APPENDED and defaults to 4, so every existing call still
-- means what it meant. The old signature is dropped rather than left beside
-- the new one: two `save_course` functions differing only in a defaulted
-- trailing argument is an ambiguous call for PostgREST, which resolves by
-- name.

drop function if exists public.save_course(text, uuid, smallint[], text, text, uuid, text, text, uuid);

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
  if not (public.is_super_admin() and public.is_subscription_writable()) then
    raise exception 'only the super admin can add or change a course, and only while the subscription is active'
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

comment on function public.save_course is
  'The Add/Edit Course form as one transaction: course, offering, schedule (via set_offering_schedule), follow-up trigger and communication. Sequenced from the client a failure half way leaves a course expected at no session and counted by nobody -- RC-008 one level up. Since 0030 the follow-up threshold is the academy''s, 1..7.';

revoke all on function public.save_course(text, uuid, smallint[], text, text, uuid, text, text, uuid, smallint)
  from public, anon;
grant execute on function public.save_course(text, uuid, smallint[], text, text, uuid, text, text, uuid, smallint)
  to authenticated, service_role;
