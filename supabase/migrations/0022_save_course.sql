-- 0022 · saving a course, as ONE act
--
-- WHAT THE CANVAS ASKS FOR
--   The 3-Sep canvas' Add Course dialog collects, in one form: a name, a
--   branch, the weekdays it runs, a from-address, a message template, that
--   course's own subject and body, and its follow-up trigger. One Save.
--
-- WHY AN RPC AND NOT SIX CLIENT WRITES
--   Those seven fields land in FIVE tables -- courses, course_offerings,
--   offering_schedules, course_follow_up_config, course_communication -- and
--   offering_schedules has no direct write policy at all (0005 wrote a read
--   policy and, deliberately, nothing else; 0018 supplies the only path).
--
--   Sequenced from the client, a failure half way leaves a course with no
--   offering, or an offering with no schedule: expected at no session, in no
--   follow-up list, counted by nobody. That is RC-008's shape -- a form that
--   reports a save it did not complete -- one level up. create_member (0016)
--   exists for exactly this reason and this follows it.
--
--   The weekday subset rule, the completed-session guard and the schedule
--   versioning all stay where they are: this CALLS set_offering_schedule
--   rather than writing offering_schedules itself, so there is still one
--   place that decides when a schedule may move.
--
-- WHAT IT DOES NOT DO
--   It does not generate sessions. generate_sessions stays service_role-only
--   and csv-import still creates a session lazily when a file arrives for a
--   date (0014). Stating when a course runs and materialising dates are
--   different decisions, and this does not quietly make the second one.

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
  p_course_id   uuid default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor      uuid;
  v_course_id  uuid;
  v_offering   uuid;
  v_created    boolean := p_course_id is null;
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
  -- counts. 'week' fires at 4 in a week; 'consec' at 4 in a row.
  insert into public.course_follow_up_config
    (course_id, weekly_enabled, weekly_threshold,
     consecutive_enabled, consecutive_threshold, combination, updated_by)
  values (v_course_id, p_rule = 'week', 4, p_rule = 'consec', 4, 'OR', v_actor)
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
    'course_id', v_course_id, 'offering_id', v_offering, 'created', v_created);
end $$;

comment on function public.save_course is
  'The Add/Edit Course form as one transaction: course, offering, schedule (via set_offering_schedule), follow-up trigger and communication. Sequenced from the client a failure half way leaves a course expected at no session and counted by nobody -- RC-008 one level up.';

revoke all on function public.save_course(text, uuid, smallint[], text, text, uuid, text, text, uuid) from public, anon;
grant execute on function public.save_course(text, uuid, smallint[], text, text, uuid, text, text, uuid)
  to authenticated, service_role;
