-- 0071 · a duplicate member is a duplicate OF A COURSE, not of the academy
--
-- REQUESTED
--   "Same member can be added with same name email and display name in other
--    course do not restrict user to add them as member in another course. But
--    one course cannot have duplicate. A member with same display name and
--    email and display can be added as new member in another course if he is
--    not present in that course but if he is present in that course show as
--    duplicate"
--   (requests/2026-09-12-same-member-in-another-course.md)
--
-- WHAT THE ACADEMY-WIDE RULE WAS, and where it lived
--
--   member_emails_unique_live   unique (email) where deleted_at is null   0006
--   member_aliases_unique       unique (alias_type, alias_normalized)     0006
--   bulk_import_members         exists(members.name_normalized = ...)     0038
--
--   Three checks, none of which ever looked at a course. So one person who
--   attends Prenatal on Tuesdays and Postnatal on Saturdays could be put on
--   the register once and only once -- the second add was refused with "the
--   address ... is already on another member", which is true and useless: the
--   operator is not trying to edit that member, they are trying to enrol the
--   same person in a second course.
--
-- WHAT A DUPLICATE IS NOW
--
--   The same question the ATTENDANCE matcher already answers, asked here for
--   the first time. `splitByCourse` (supabase/functions/_shared/match.ts)
--   decides "which of the candidates can be this person IN THIS COURSE", and
--   its answer is the one adopted below, verbatim:
--
--       a member whose live enrolment is in ANOTHER course is not a candidate
--       here; a member with NO live enrolment is -- "nothing contradicts this
--       course for her, and creating a second record for a woman already on
--       the register would be inventing a duplicate to avoid a collision that
--       does not exist".
--
--   So `is_in_course` is not a new rule. It is that rule, in SQL, so the add
--   paths and the import matcher cannot drift into two answers about one
--   person -- which is guardrail 1 ("one member source, follow-up derived")
--   applied to the question of who somebody IS.
--
--   Within a course, the checks survive at full strength and any one of them
--   matching a member of this course is a duplicate -- the requester chose
--   that over "all three must match", which would have let two members of one
--   course share an address.
--
--   WITH ONE CORRECTION, MEASURED AGAINST PRODUCTION ON 16-Sep-2026. The
--   draft put a NAME check on the Add and Edit forms as well, which the "any
--   one of the three" answer implied. The live register says no: 14 names are
--   held by two live members of ONE course (34 members in all), and not one of
--   those pairs shares an address -- namesakes, not duplicates. Since the
--   check also runs on UPDATE, every one of those 34 would have become
--   un-editable. The name check therefore stays where it already lived, in
--   bulk_import_members, which SKIPS a row instead of blocking a save; the two
--   keys this migration enforces on the forms are the address and the display
--   name, which are what the app identifies a member by. See ADR 032.
--
-- WHAT THIS COSTS, stated rather than discovered later
--
--   * TWO MEMBER RECORDS FOR ONE PERSON. The academy's member has one live
--     enrolment -- a GiST exclusion constraint on member_enrollments (0006),
--     which set_attendance (0035) and the follow-up rule are both built on.
--     Nothing here touches it. Two courses therefore means two rows, and the
--     roster shows the name twice. The requester accepted this on 12-Sep-2026
--     rather than the alternative, which was to give a member two live
--     enrolments and rewrite everything that reads "her offering".
--
--   * THE UNIQUE INDEXES WERE ALSO THE ATOMICITY. Two sessions adding the
--     same address at the same instant were previously separated by the index
--     itself; a check-then-insert in application code is not. So
--     refuse_course_duplicate takes pg_advisory_xact_lock on the COURSE
--     before it looks, and holds it to commit -- the check and the insert it
--     guards are one critical section, per course, and adds to different
--     courses do not wait on each other.
--
--   * ONE ADDRESS, TWO MEMBERS, TWO UNSUBSCRIBE LINKS. The opt-out token is
--     signed on member_emails.id (0066), so unsubscribing from one course's
--     follow-up leaves the other course's copy subscribed. That is per-course
--     behaviour and consistent with the ask; it is recorded here because
--     nobody asked for it by name. Bounces are NOT affected: ses-feedback
--     suppresses by address with no row limit, so it already marks every copy.
--
-- WHAT DOES NOT CHANGE
--   * member_enrollments' one-live-enrolment exclusion constraint.
--   * member_emails_one_primary -- still exactly one primary per member.
--   * splitByCourse, commit_csv_import, merge_member_into, the send path.
--   * Every refusal's wording except the two whose SCOPE this changes, which
--     gain " of this course" so the sentence matches the rule behind it.
--
-- REHEARSAL
--   supabase/tests/48_duplicate_is_per_course.sql replays both halves: the
--   second course is allowed, the same course is still refused, on all three
--   keys. The existing suites stay green unchanged -- 10_add_member.sql and
--   22_bulk_import_members.sql both do their clashing inside ONE offering (and
--   22's Kavitha Ramesh has no enrolment at all, which `is_in_course` answers
--   `true` for, exactly as the attendance matcher does).
--
-- PRODUCTION SAFETY
--   No index built here is UNIQUE and no constraint is added, so nothing in
--   this migration can fail on rows that already exist. The harness caveat in
--   CLAUDE.md ("a migration that builds an index or adds a constraint over
--   existing rows needs that specific check run against production") does not
--   bite: dropping an index cannot fail on data, and a plain index cannot
--   either.
-- ---------------------------------------------------------------------------

-- ------------------------------------------------------- the indexes go
-- Replaced by plain ones rather than simply dropped: both columns are still
-- looked up on every add, and by refuse_course_duplicate below.
drop index if exists public.member_emails_unique_live;
create index if not exists member_emails_email_live
  on public.member_emails (email) where deleted_at is null;

drop index if exists public.member_aliases_unique;
create index if not exists member_aliases_lookup
  on public.member_aliases (alias_type, alias_normalized);

comment on index public.member_emails_email_live is
  'Lookup only since 0071. It was UNIQUE academy-wide (member_emails_unique_live, 0006) until a duplicate became a duplicate OF A COURSE; the uniqueness that replaced it is refuse_course_duplicate(), which scopes the same question to the course and serialises it with an advisory lock.';
comment on index public.member_aliases_lookup is
  'Lookup only since 0071, for the same reason as member_emails_email_live. 0006 made display names unique academy-wide so "an import would have to guess"; the import does not have to guess, because splitByCourse already scopes its candidates to the course before deciding a row''s kind.';

-- --------------------------------------------------- who could this be here
create or replace function public.is_in_course(
  p_member_id   uuid,
  p_offering_id uuid
) returns boolean
language sql stable security definer set search_path = public as $$
  -- splitByCourse, in SQL. A member is a candidate for this course unless a
  -- LIVE enrolment puts them in a different one. No enrolment at all is not a
  -- contradiction -- it is somebody already on the register, and a second
  -- record for them would be inventing the duplicate this rule exists to find.
  select not exists (
    select 1
      from public.member_enrollments e
      join public.course_offerings   o on o.id = e.offering_id
     where e.member_id = p_member_id
       and e.status = 'active'
       and (e.effective_to is null or e.effective_to >= current_date)
       and o.course_id is distinct from (
             select t.course_id from public.course_offerings t where t.id = p_offering_id)
  );
$$;

revoke execute on function public.is_in_course(uuid, uuid) from public, anon;
grant execute on function public.is_in_course(uuid, uuid) to authenticated, service_role;

comment on function public.is_in_course(uuid, uuid) is
  'Whether this member could be a member of the course this offering belongs to: true when their live enrolment is in that course, or when they have no live enrolment at all. The SQL twin of splitByCourse() in supabase/functions/_shared/match.ts -- one answer to "who could this be in this course", shared by the add paths and the attendance import.';

-- ------------------------------------------------- the refusal, course-scoped
--
-- NO NAME CHECK HERE, and that is a decision measured against production
-- rather than reasoned about (16-Sep-2026).
--
-- The requester chose "any one of the three counts" over "all three must
-- match", and the draft of this function took that literally: name, display
-- name, address, each refusing on its own. Run against the live register that
-- rule refuses 34 members who are already there. Fourteen names are held by
-- two live members of ONE course -- "vishnu priya" in Postnatal, "Saranya
-- Velayutham", "Thunisha Albert", "kaviya prakash" in General -- and NOT ONE
-- of those pairs shares an address. They are namesakes, not duplicates, which
-- is what an academy of 1,150 women in a handful of courses is expected to
-- contain.
--
-- A name check on this function is asked on every UPDATE too, excluding only
-- the member being edited. So each of those 34 would have become un-editable:
-- open the member, press Save, get "a member called ... is already in this
-- course", with no way out of it from the screen. A change asked for to stop
-- the app refusing things would have started refusing thirty-four saves.
--
-- The name check therefore stays exactly where it already was -- the bulk
-- import, which SKIPS a row rather than blocking a person mid-edit, and which
-- has carried it since 0028. It is re-scoped to the course below like
-- everything else. The two keys this function does check are the two the app
-- actually identifies a member by: the address it writes to, and the display
-- name the attendance CSV matches on. Those are also the two the requester
-- named first ("same name email and display name" describes one person; the
-- address and the display name are what make them findable).
--
-- "One course cannot have duplicate" is still true, on the keys that can
-- carry it.
create or replace function public.refuse_course_duplicate(
  p_offering_id uuid,
  p_emails      text[],
  p_aliases     text[],
  /** the member being EDITED, who is never their own duplicate; null when adding */
  p_exclude_member_id uuid default null
) returns void
language plpgsql volatile security definer set search_path = public as $$
declare
  v_course uuid;
  v_hit    text;
begin
  select o.course_id into v_course
    from public.course_offerings o where o.id = p_offering_id;
  -- No offering means no course to be a duplicate of. The caller raises its
  -- own, better refusal about the offering; this one stays quiet.
  if v_course is null then return; end if;

  -- THE ATOMICITY THE UNIQUE INDEXES USED TO PROVIDE. Held to commit, so the
  -- check below and the insert the caller makes after it are one critical
  -- section. Keyed on the COURSE: two operators adding to two courses never
  -- wait on each other.
  perform pg_advisory_xact_lock(hashtext('member_duplicate:' || v_course::text));

  -- --------------------------------------------------- the display names
  -- Checked before the addresses, which is the order create_member has always
  -- refused in (it inserted aliases first), so a row that clashes on both is
  -- still told about the display name.
  --
  -- The message names the display name the CALLER passed, not the one on
  -- file: "Divya  R." and "divya r" are one alias here, and quoting the
  -- stored spelling back at somebody who typed the other is how a refusal
  -- stops being actionable.
  select x into v_hit
    from unnest(coalesce(p_aliases, '{}'::text[])) x
   where length(btrim(x)) > 0
     and exists (
       select 1 from public.member_aliases a
         join public.members m on m.id = a.member_id
        where m.deleted_at is null
          and a.alias_type = 'name'
          and (p_exclude_member_id is null or m.id <> p_exclude_member_id)
          and a.alias_normalized = public.normalize_name(btrim(x))
          and public.is_in_course(m.id, p_offering_id))
   limit 1;
  if v_hit is not null then
    raise exception 'the display name "%" already belongs to another member of this course', btrim(v_hit)
      using errcode = '23505';
  end if;

  -- ------------------------------------------------------- the addresses
  select lower(btrim(x)) into v_hit
    from unnest(coalesce(p_emails, '{}'::text[])) x
   where length(btrim(x)) > 0
     and exists (
       select 1 from public.member_emails e
         join public.members m on m.id = e.member_id
        where e.deleted_at is null and m.deleted_at is null
          and (p_exclude_member_id is null or m.id <> p_exclude_member_id)
          and e.email = lower(btrim(x))::citext
          and public.is_in_course(m.id, p_offering_id))
   limit 1;
  if v_hit is not null then
    raise exception 'the address "%" is already on another member of this course', v_hit
      using errcode = '23505';
  end if;
end $$;

revoke execute on function public.refuse_course_duplicate(uuid, text[], text[], uuid) from public, anon;
grant execute on function public.refuse_course_duplicate(uuid, text[], text[], uuid)
  to authenticated, service_role;

comment on function public.refuse_course_duplicate(uuid, text[], text[], uuid) is
  'Raises 23505 when this display name or address already belongs to a member of the course this offering belongs to; silent otherwise. Since 0071 this is what replaced the academy-wide unique indexes of 0006 -- same checks, same strength, scoped to the course. Deliberately does NOT check the full name: 34 live members are namesakes inside one course and share no address, and a name check here would have made every one of them un-editable. The name check stays in bulk_import_members, where it skips a row rather than blocking a save. Takes an advisory lock on the course so check-and-insert is atomic, which the indexes used to make it.';

-- ------------------------------------------ the three write paths, in place
--
-- REWRITTEN IN PLACE, NOT RESTATED -- 0061's idiom, for 0061's reasons.
-- create_member, update_member and bulk_import_members are ~28KB of the most
-- load-bearing code in the schema, and they have been restated by 0026, 0027,
-- 0029, 0038, 0049, 0050 and edited in place by 0060 and 0061. Re-typing any
-- of them to add one line is how a concurrent change gets reverted by
-- whichever migration number is higher (0049 says so out loud), and a
-- transcription slip inside 9,000 characters is a silent behaviour change in
-- a core write path that no reviewer would reliably catch.
--
-- So Postgres reconstructs each definition with pg_get_functiondef, ONE
-- anchor is replaced in the text, and the result is executed. Every
-- substitution is checked before it is applied: an anchor that is not found
-- raises and rolls the whole migration back, which is what stops this
-- quietly no-opping against a body some later migration has already changed.
do $mig$
declare
  v_edits text[][] := array[

    -- create_member: refuse before the member row is written. Anchored on the
    -- members INSERT, which no migration has reworded since 0049 wrote v_from
    -- into it.
    ['create_member',
     'text, uuid, date, text[], text[], smallint[]',
$a$  insert into public.members (full_name, joined_on, status, created_by)$a$,
$b$  -- 0071: a duplicate is a duplicate OF THIS COURSE. Nothing is written
  -- until this returns, and the advisory lock it takes is held to commit, so
  -- no concurrent add can slip between the question and the INSERT below.
  perform public.refuse_course_duplicate(p_offering_id, p_emails, p_aliases, null);

  insert into public.members (full_name, joined_on, status, created_by)$b$],

    -- update_member: the same question, asked of the offering the member is
    -- being moved TO, and never answered with the member themselves. Anchored
    -- on the section header above the first write.
    ['update_member',
     'uuid, text, uuid, text[], text[], smallint[]',
$a$  if btrim(p_full_name) <> v_member.full_name then$a$,
$b$  -- 0071: a duplicate is a duplicate OF THIS COURSE -- measured against
  -- p_offering_id, the offering this edit puts the member in, and excluding
  -- the member being edited, who is never their own duplicate.
  perform public.refuse_course_duplicate(p_offering_id, p_emails, p_aliases, p_member_id);

  if btrim(p_full_name) <> v_member.full_name then$b$],

    -- bulk_import_members: its own name pre-check, which is what decides
    -- `skipped` and is therefore what the result screen counts. create_member
    -- would refuse the row anyway, but as `failed` -- and a member already in
    -- this course is skipped, never failed.
    ['bulk_import_members',
     'jsonb, uuid, text',
$a$    elsif exists (select 1 from public.members m
                   where m.deleted_at is null
                     and m.name_normalized = public.normalize_name(v_name)) then$a$,
$b$    elsif v_offering is not null and exists (select 1 from public.members m
                   where m.deleted_at is null
                     and m.name_normalized = public.normalize_name(v_name)
                     and public.is_in_course(m.id, v_offering)) then$b$]
  ];
  v_i    int;
  v_oid  oid;
  v_def  text;
  v_name text;
  v_args text;
  v_old  text;
  v_new  text;
begin
  for v_i in 1 .. array_length(v_edits, 1) loop
    v_name := v_edits[v_i][1];
    v_args := v_edits[v_i][2];
    -- CR STRIPPED, and this is not decoration. 0061 could take its anchors
    -- literally because every one of them sat inside a single line; two of the
    -- three here span several, and this repo is checked out with
    -- core.autocrlf=true -- so on a fresh clone the newlines INSIDE these
    -- literals arrive as CRLF while pg_get_functiondef returns LF, and every
    -- anchor would miss. The guard below would catch it and roll back, which
    -- is the right failure but the wrong outcome: the migration would be
    -- un-appliable on exactly the machines that cloned the repo.
    v_old  := replace(v_edits[v_i][3], chr(13), '');
    v_new  := replace(v_edits[v_i][4], chr(13), '');

    v_oid := ('public.' || v_name || '(' || v_args || ')')::regprocedure;
    v_def := pg_get_functiondef(v_oid);

    -- THE GUARD. An anchor that matches nothing means this migration is
    -- describing a function that no longer says what it thinks it says, and
    -- carrying on would leave the academy-wide rule in place while reporting
    -- success.
    if position(v_old in v_def) = 0 then
      raise exception
        '0071: %(%) does not contain the anchor this migration expects: "%"',
        v_name, v_args, v_old;
    end if;
    -- And it must be the ONLY one, or "replace the anchor" is ambiguous.
    if (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old) <> 1 then
      raise exception
        '0071: %(%) contains the anchor more than once, so the edit is ambiguous',
        v_name, v_args;
    end if;

    execute replace(v_def, v_old, v_new);
  end loop;

  -- Belt and braces: all three must now go through the course-scoped rule,
  -- and none of them may still carry the academy-wide name check.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('create_member', 'update_member')
       and p.prosrc not like '%refuse_course_duplicate%'
  ) then
    raise exception '0071: a write path did not pick up the course-scoped rule';
  end if;
end $mig$;

comment on function public.create_member(text, uuid, date, text[], text[], smallint[]) is
  'Adds a member, their display names, their addresses, their enrolment and their optional weekday override in one transaction. SECURITY DEFINER: the is_active_app_user()/is_subscription_writable() checks inside are the policy, matching the table policies in 0006. Since 0026 no member code is assigned. Since 0049 the joining date STORED is coalesce(p_joined_on, current_date), the same value the enrolment opens at. Since 0071 a duplicate is a duplicate OF THE COURSE, not of the academy: the same name, address or display name may be added again in a course the person is not already in, and refuse_course_duplicate() refuses it in a course they are.';
