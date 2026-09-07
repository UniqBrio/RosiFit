-- 0047 · delete_course becomes a HARD delete, and gains a preview
--
-- WHAT CHANGED AND WHO DECIDED IT
--   requests/2026-09-08-hard-delete-course.md. The requester, shown in the
--   live data exactly what this destroys -- 8 completed sessions, 39
--   attendance records across 15 members, 11 import records -- and shown that
--   it contradicts the promise the confirmation dialog has made since 0020,
--   chose it anyway and in those words: "if course is deleted then delete
--   course from db and all its related data which will reduce chaos".
--
--   The chaos is real and this is what it looked like on 8 Sep 2026: THREE
--   course rows named `Postnatal` at branch `Main`, two of them soft-deleted;
--   8 completed sessions hanging off deleted offerings, reachable from no
--   screen in the app; and a Meet export whose fingerprint was pinned to a
--   deleted course, so it could never be imported into the live one. Every one
--   of those is a soft-deleted row outliving its purpose.
--
-- WHAT 0020 DID, AND WHY THAT IS NOW GONE
--   0020 drew its line at COMPLETED: a completed session is history, so it and
--   its frozen expectations and its attendance rows were left exactly as they
--   were, and the dialog promised as much -- "Their attendance history stays".
--   That promise is withdrawn here, deliberately and by the requester's
--   decision, and app/(tabs)/courses.tsx says so before anything is deleted.
--   Nothing about this file is an accident of implementation.
--
-- THE ORDER IS NOT A PREFERENCE. IT IS THE FOREIGN KEYS.
--   Read off the live constraint graph on 8 Sep 2026, not from memory:
--
--     attendance_records.import_id  -> csv_imports(id)        NO ACTION
--     csv_imports.session_id        -> sessions(id)           NO ACTION
--     csv_imports.offering_id       -> course_offerings(id)   NO ACTION
--     sessions.offering_id          -> course_offerings(id)   NO ACTION
--     member_enrollments.offering_id-> course_offerings(id)   NO ACTION
--     member_import_runs.default_offering_id -> ...           NO ACTION
--     course_offerings.course_id    -> courses(id)            NO ACTION
--     attendance_records.session_id -> sessions(id)           CASCADE
--     session_expectations.session_id -> sessions(id)         CASCADE
--     offering_schedules.offering_id -> course_offerings(id)  CASCADE
--     course_follow_up_config.course_id -> courses(id)        CASCADE
--     course_communication.course_id -> courses(id)           CASCADE
--
--   The trap is the first two together. attendance_records cascades from
--   sessions -- but csv_imports must be deleted BEFORE sessions, and
--   attendance_records must be deleted BEFORE csv_imports. So the cascade
--   fires too late to be useful and the attendance rows are deleted by hand,
--   first. An implementation that leaned on the cascade would fail at the
--   csv_imports delete, in production, on a course somebody had imported
--   attendance into -- which is every course that matters.
--
-- TWO THINGS THE SOFT DELETE NEVER HAD TO DO, AND THIS ONE MUST
--   1. RECOMPUTE THE STATS. member_stats is a rebuildable cache of streak,
--      sessions expected and sessions attended (0008). 0020 never touched it
--      because it never removed an attendance row. Removing 39 of them without
--      a recompute would leave every affected member counting sessions that no
--      longer exist -- and the follow-up list is derived from those counts, so
--      the academy would go on emailing about a course nobody can see. The
--      member ids are collected BEFORE the deletes, because afterwards there
--      is nothing left to collect them from.
--   2. WRITE ITS OWN AUDIT ROW. audit_courses and audit_offerings (0005) are
--      `after insert or update` triggers -- a DELETE fires nothing at all. A
--      soft delete was an UPDATE and audited itself; this one would be the
--      single most destructive operation in the product and the only one
--      leaving no trace. So the entry is written by hand, BEFORE the rows go,
--      carrying the name, the ids and every count. audit_logs is append-only
--      (0004) and nothing here deletes from it.
--
-- WHY THE WORK IS IN purge_course AND NOT IN delete_course ITSELF
--   The courses ALREADY soft-deleted in production need the same removal, and
--   delete_course -- rightly -- answers `already_deleted` for a course that is
--   flagged. Two copies of forty lines of destructive SQL is one copy too
--   many, so the row removal is one function, purge_course, that delete_course
--   calls for a live course and 0048 calls for the flagged ones. purge_course
--   carries NO caller guard of its own and is therefore executable by
--   service_role alone: delete_course is SECURITY DEFINER, so it reaches it as
--   the definer after checking the caller itself, and nothing a signed-in
--   account holds can call it directly. 36_hard_delete_course.sql asserts
--   that.
--
-- WHAT IS STILL NOT TOUCHED
--   The members themselves, their addresses, aliases and schedules. Only their
--   enrolment IN THIS COURSE goes. A member of two courses keeps the other
--   one, and keeps every attendance record on it. member_import_runs is a
--   member-import audit trail of its own and outlives any one course, so its
--   default_offering_id is NULLED rather than the run deleted.
--
-- IDEMPOTENT, as 0020 was: deleting an already-deleted course reports zeroes
-- rather than erroring. Two taps on a slow connection is not a failure a
-- person needs to read about.
--
-- WHO MAY DO IT: is_active_app_user(), which is 0038's boundary and NOT 0020's
--   is_super_admin(). This is not a decision taken here. The repo owner moved
--   the whole course path to staff on 07-Sep-2026 -- "Allow crud we are just
--   hiding view of few fields such as overview and staff access and audit log"
--   (requests/2026-09-07-staff-write-access.md), recorded in
--   docs/registers/RBAC_MATRIX.md and asserted by supabase/tests/14_delete_course.sql
--   ("a staff account CAN delete a course, since 0038"). Restating 0020's
--   is_super_admin() here would revert that decision silently, and the harness
--   would say so.
--
--   IT DOES MEAN ONE THING THE REQUESTER MUST BE TOLD BEFORE THIS IS APPLIED.
--   0038 is not applied in production (0044_delete_member.sql, TD-023), so the
--   LIVE delete_course is still 0020's owner-only body. Applying this file to
--   production therefore lands two changes at once: the delete becomes hard,
--   AND staff gain it. The second is a decision already made and not yet
--   delivered rather than a new one -- but it is not this request's subject,
--   and it is named at the pre-apply gate rather than discovered afterwards.
--
-- TD-038 IS PAID OFF HERE, incidentally and completely. 0020 ended an
-- enrolment with `least(coalesce(effective_to, current_date), current_date)`,
-- which drops below effective_from for a member enrolled from a future date
-- and raises member_enrollments' own check -- so a course could not be deleted
-- at all while anyone in it had a future joining date, and the person deleting
-- saw a raw constraint failure. This function deletes the enrolment rather
-- than dating it closed, so the expression and its failure are both gone.
--
-- This migration creates three functions and touches no row. There is no
-- backfill, no index build and no constraint validated over existing data, so
-- it is safe on a live database of any size. The one-off cleanup of the
-- courses ALREADY soft-deleted is 0048, a separate and separately-approved
-- step, and is deliberately not in this file.


-- ------------------------------------------------------- the preview
--
-- WHAT THE CONFIRMATION IS ALLOWED TO SAY. The dialog used to state a promise
-- it could keep without asking anything ("attendance history stays"). It can
-- no longer make a promise, so it has to state a QUANTITY instead, and the app
-- holds none of these numbers -- the courses read carries offerings and a
-- roster, never sessions or attendance. Read-only, and gated exactly as the
-- deletion is: it answers only for somebody who could carry it out.
create or replace function public.course_deletion_preview(p_course_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_name        text;
  v_offerings   uuid[];
  v_sessions    uuid[];
  v_completed   int := 0;
  v_attendance  int := 0;
  v_members     int := 0;
  v_imports     int := 0;
begin
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can delete a course'
      using errcode = '42501';
  end if;

  select c.name into v_name
    from public.courses c
   where c.id = p_course_id and c.deleted_at is null;
  if not found then
    return jsonb_build_object('course_id', p_course_id, 'name', null,
      'offerings', 0, 'members_enrolled', 0, 'sessions', 0,
      'sessions_completed', 0, 'attendance_records', 0, 'imports', 0,
      'already_deleted', true);
  end if;

  select coalesce(array_agg(o.id), '{}') into v_offerings
    from public.course_offerings o
   where o.course_id = p_course_id and o.deleted_at is null;

  select coalesce(array_agg(s.id), '{}') into v_sessions
    from public.sessions s where s.offering_id = any(v_offerings);

  select count(*) filter (where s.status = 'completed') into v_completed
    from public.sessions s where s.id = any(v_sessions);

  -- Every row that goes, not only the live ones: a soft-deleted attendance
  -- record is still a row this deletion removes for good, and a count that
  -- quietly excluded it would understate the damage on the one screen whose
  -- whole job is to state it.
  select count(*) into v_attendance
    from public.attendance_records a where a.session_id = any(v_sessions);

  -- The people, not the enrolments -- one member enrolled at two branches of
  -- the same course is one person losing her history, and "2 members" would
  -- be a lie in the only sentence anybody reads before confirming. ACTIVE
  -- ones, because "N members are enrolled" is what the dialog has always
  -- said and an ended enrolment is somebody who already left.
  select count(distinct e.member_id) into v_members
    from public.member_enrollments e
   where e.offering_id = any(v_offerings) and e.status = 'active';

  select count(*) into v_imports
    from public.csv_imports i
   where i.offering_id = any(v_offerings) or i.session_id = any(v_sessions);

  return jsonb_build_object(
    'course_id',          p_course_id,
    'name',               v_name,
    'offerings',          coalesce(array_length(v_offerings, 1), 0),
    'members_enrolled',   v_members,
    'sessions',           coalesce(array_length(v_sessions, 1), 0),
    'sessions_completed',  v_completed,
    'attendance_records', v_attendance,
    'imports',            v_imports,
    'already_deleted',    false);
end $$;

revoke all on function public.course_deletion_preview(uuid) from public, anon;
grant execute on function public.course_deletion_preview(uuid) to authenticated, service_role;

comment on function public.course_deletion_preview(uuid) is
  'Read-only. Counts exactly what delete_course would destroy -- offerings, distinct members with an active enrolment, sessions, completed sessions, attendance records and import records -- so the confirmation dialog can name the damage before anybody confirms it. Gated on is_active_app_user(), the same guard as the deletion itself: it answers only for somebody who could carry it out.';


-- --------------------------------------------------------- the removal
--
-- NO CALLER GUARD, ON PURPOSE, AND THEREFORE service_role ONLY. This is the
-- part that deletes; the part that decides whether the caller may is
-- delete_course, below. It takes a course in ANY state -- live or already
-- flagged -- because 0048 needs it for the flagged ones, and reports what it
-- removed. Not idempotent on its own and not meant to be: a course id that
-- matches no row removes nothing and says so with zeroes.
--
-- p_note goes into the audit entry's metadata. audit_log attributes a call
-- from inside a SECURITY DEFINER function run by a migration to no app user,
-- so without a note the log would show six courses hard-deleted by nobody in
-- particular. 0048 says who decided and when; delete_course passes nothing,
-- because there the actor IS the signed-in user and the log already has her.
create or replace function public.purge_course(p_course_id uuid, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_course      record;
  v_offerings   uuid[];
  v_sessions    uuid[];
  v_members     uuid[];
  v_attendance  int := 0;
  v_expect      int := 0;
  v_imports     int := 0;
  v_sess_gone   int := 0;
  v_enrolments  int := 0;
  v_offer_gone  int := 0;
begin
  select c.id, c.name, c.deleted_at into v_course
    from public.courses c where c.id = p_course_id;
  if not found then
    return jsonb_build_object(
      'course_id', p_course_id, 'name', null, 'offerings', 0,
      'sessions_removed', 0, 'attendance_removed', 0, 'expectations_removed', 0,
      'imports_removed', 0, 'enrolments_removed', 0, 'members_recomputed', 0,
      'found', false);
  end if;

  -- A soft-deleted offering is still this course's offering and its rows are
  -- still in the tables. `deleted_at is null` here would leave exactly the
  -- orphans this change exists to stop making.
  select coalesce(array_agg(o.id), '{}') into v_offerings
    from public.course_offerings o where o.course_id = p_course_id;

  select coalesce(array_agg(s.id), '{}') into v_sessions
    from public.sessions s where s.offering_id = any(v_offerings);

  -- COLLECTED BEFORE ANYTHING IS DELETED, because afterwards there is nothing
  -- left to collect them from. Both sides matter: a member with attendance but
  -- no live enrolment still has stats to rebuild, and a member enrolled who
  -- never attended still has an expected-count to drop.
  select coalesce(array_agg(distinct m), '{}') into v_members from (
    select a.member_id as m from public.attendance_records a
     where a.session_id = any(v_sessions)
    union
    select e.member_id from public.member_enrollments e
     where e.offering_id = any(v_offerings)
  ) both_sides;

  -- THE AUDIT ROW COMES FIRST. The triggers on courses and course_offerings
  -- fire on insert or update only, so a DELETE audits nothing by itself, and
  -- after the transaction there is no row left to describe. Written here, it
  -- is inside the same transaction: a failure below rolls the entry back with
  -- everything else, so the log never claims a deletion that did not happen.
  -- `was_soft_deleted_at` tells 0048's rows apart from a live deletion.
  perform public.audit_log('course.hard_deleted', 'course', p_course_id::text,
    '[]'::jsonb,
    jsonb_build_object(
      'name', v_course.name,
      'was_soft_deleted_at', v_course.deleted_at,
      'note', p_note,
      'offering_ids', to_jsonb(v_offerings),
      'session_ids', to_jsonb(v_sessions),
      'member_ids', to_jsonb(v_members),
      'sessions', coalesce(array_length(v_sessions, 1), 0),
      'attendance_records', (select count(*) from public.attendance_records
                              where session_id = any(v_sessions)),
      'imports', (select count(*) from public.csv_imports
                   where offering_id = any(v_offerings) or session_id = any(v_sessions))));

  if array_length(v_offerings, 1) > 0 then
    -- 1. ATTENDANCE FIRST, by hand. It cascades from sessions, but csv_imports
    --    has to go before sessions and attendance_records.import_id points at
    --    csv_imports -- so the cascade would fire one step too late.
    with gone as (
      delete from public.attendance_records
       where session_id = any(v_sessions)
      returning 1)
    select count(*) into v_attendance from gone;

    -- 2. The frozen expected set. Cascades too; deleted here so the count is
    --    reported rather than inferred.
    with gone as (
      delete from public.session_expectations
       where session_id = any(v_sessions)
      returning 1)
    select count(*) into v_expect from gone;

    -- 3. The import records, which is also what FREES THE FILE. csv_imports
    --    carries a globally unique fingerprint over completed imports (0008),
    --    so while these rows stand, a Meet export that landed in this course
    --    can never be imported into any other -- the defect that started this
    --    request. Matched on either key: an import is reachable by its
    --    offering or by the session it wrote, and both must be clear before
    --    the sessions go.
    --
    --    The nulling above it is defensive, not decorative. An attendance row
    --    outside this course cannot reference an import inside it -- an import
    --    only ever writes onto its own offering's session -- but "cannot" is a
    --    claim about code, and this is a foreign key. If one ever exists, the
    --    reference drops and the row survives, rather than the whole deletion
    --    failing with a constraint error nobody can act on.
    update public.attendance_records
       set import_id = null
     where import_id in (select id from public.csv_imports
                          where offering_id = any(v_offerings)
                             or session_id = any(v_sessions));

    with gone as (
      delete from public.csv_imports
       where offering_id = any(v_offerings) or session_id = any(v_sessions)
      returning 1)
    select count(*) into v_imports from gone;

    -- 4. The sessions. Completed ones included -- that is the whole change.
    with gone as (
      delete from public.sessions where offering_id = any(v_offerings)
      returning 1)
    select count(*) into v_sess_gone from gone;

    -- 5. The enrolments go for real now. 0020 ENDED them so that a member's
    --    history of having been in this course survived the course; there is
    --    no such history left to protect.
    with gone as (
      delete from public.member_enrollments where offering_id = any(v_offerings)
      returning 1)
    select count(*) into v_enrolments from gone;

    -- 6. A member-import run is its own audit trail and outlives any one
    --    course, so the pointer drops and the run stays.
    update public.member_import_runs
       set default_offering_id = null
     where default_offering_id = any(v_offerings);

    -- 7. The offerings. offering_schedules cascades from here.
    with gone as (
      delete from public.course_offerings where id = any(v_offerings)
      returning 1)
    select count(*) into v_offer_gone from gone;
  end if;

  -- 8. And the course, last, so a failure anywhere above rolls the whole thing
  --    back rather than leaving half a course in the tables.
  --    course_follow_up_config and course_communication cascade from here.
  delete from public.courses where id = p_course_id;

  -- 9. The cache, rebuilt for exactly the people whose numbers moved. Never
  --    recompute_member_stats(null) here: that walks every member in the
  --    academy for a change that touched a handful of them.
  if array_length(v_members, 1) > 0 then
    perform public.recompute_member_stats(v_members);
  end if;

  return jsonb_build_object(
    'course_id',            p_course_id,
    'name',                 v_course.name,
    'offerings',            v_offer_gone,
    'sessions_removed',     v_sess_gone,
    'attendance_removed',   v_attendance,
    'expectations_removed', v_expect,
    'imports_removed',      v_imports,
    'enrolments_removed',   v_enrolments,
    'members_recomputed',   coalesce(array_length(v_members, 1), 0),
    'found',                true);
end $$;

-- service_role ONLY. No signed-in account reaches this except through
-- delete_course, which checks the caller first and then runs as its definer.
revoke all on function public.purge_course(uuid, text) from public, anon, authenticated;
grant execute on function public.purge_course(uuid, text) to service_role;

comment on function public.purge_course(uuid, text) is
  'The row removal behind delete_course, with NO caller guard of its own -- which is why only service_role may execute it. Removes a course in any state (live or already flagged) together with its offerings, schedules, every session, expectations, attendance records, enrolments and import records, children first because most of the foreign keys are NO ACTION; writes an audit entry before the rows go and rebuilds member_stats for the members it touched. Called by delete_course for a live course and by 0048 for the courses that were soft-deleted before 0047.';


-- -------------------------------------------------------- the deletion
create or replace function public.delete_course(p_course_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate courses_update carries
  -- has to be restated here or this function is a hole straight through it.
  -- 0038's boundary, not 0020's -- see the header.
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can delete a course'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the course was not deleted'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.courses c
                  where c.id = p_course_id and c.deleted_at is null) then
    -- Already gone, or never there. Report the shape the caller expects.
    return jsonb_build_object(
      'course_id', p_course_id, 'name', null, 'offerings', 0,
      'sessions_removed', 0, 'attendance_removed', 0, 'expectations_removed', 0,
      'imports_removed', 0, 'enrolments_removed', 0, 'members_recomputed', 0,
      'already_deleted', true);
  end if;

  v_result := public.purge_course(p_course_id);
  return (v_result - 'found') || jsonb_build_object('already_deleted', false);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks its
-- caller itself, above.
revoke all on function public.delete_course(uuid) from public, anon;
grant execute on function public.delete_course(uuid) to authenticated, service_role;

comment on function public.delete_course(uuid) is
  'The ONLY delete path for a course, and a HARD one since 0047. Checks the caller -- any signed-in active user (0038''s boundary), on a writable subscription -- and then removes the course, its offerings and schedules, every session including completed ones, their expectations and attendance records, the enrolments, and the csv_import rows that landed in it, through purge_course in one transaction. Writes its own audit entry before the rows go, since the audit triggers fire only on insert and update, and rebuilds member_stats for the members whose counts it changed. Members, their addresses and their other courses are untouched. Idempotent.';
