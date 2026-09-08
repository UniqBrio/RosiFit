-- 0051 · delete_member becomes a HARD delete, and gains a preview
--
-- WHAT CHANGED AND WHO DECIDED IT
--   requests/2026-09-08-hard-delete-member.md. The requester's words: "on
--   deleting a student delete that record entirely from database as
--   confirmation before delete". Asked the same day as, and in the same terms
--   as, the course decision in 0047 -- "delete course from db and all its
--   related data which will reduce chaos" -- and answered the same way.
--
-- WHY 0044'S SOFT DELETE COULD NOT SIMPLY BE MADE HARD
--   0044's header states, correctly, that a hard DELETE of a member is
--   REFUSED by the foreign keys. Read off production on 08-Sep-2026, these are
--   the three that refuse it:
--
--     attendance_records.member_id    -> members(id)        NO ACTION
--     session_expectations.member_id  -> members(id)        NO ACTION
--     email_messages.member_id        -> members(id)        NO ACTION
--     email_messages.member_email_id  -> member_emails(id)  NO ACTION   <-- the trap
--
--   and these are the five that come away on their own:
--
--     member_emails · member_aliases · member_enrollments ·
--     member_schedules · member_stats                      all CASCADE
--
--   THE TRAP IS THE FOURTH LINE. member_emails cascades from members, but
--   email_messages.member_email_id points AT member_emails with NO ACTION --
--   so deleting the member fires a cascade that is itself refused, and the
--   whole statement fails. It fails only for a member the academy has actually
--   EMAILED, which is every member the follow-up feature has ever worked on.
--   So her messages go FIRST, before anything else, and the order below is not
--   a preference: it is that constraint graph.
--
--   There is therefore no version of this request that spares her attendance.
--   Either those rows go or the deletion cannot happen at all. The requester
--   was shown that, with the live counts, and chose to remove everything of
--   hers -- 23 live members, 7 already flagged, 56 attendance records and 8
--   sent emails in the project at the time of asking.
--
-- WHAT IS NOT TOUCHED, AND WHY EACH SURVIVES
--   · The SESSIONS themselves, their dates and their completed status. A
--     session is the academy's class, not her attendance at it.
--   · email_batches. A batch is a send the academy performed; it survives
--     losing one of its recipients, and an empty batch is still a true record
--     that a send went out.
--   · csv_imports. An import is a file the academy processed. Her attendance
--     rows point at it; it does not point at her.
--   · audit_logs, which is append-only (0004) and which this function WRITES
--     to rather than deletes from.
--   · every other member. Nothing here reaches a row belonging to anybody
--     else -- asserted in 40_hard_delete_member.sql, because "surgical" is a
--     claim about code and a spec is evidence.
--
--   The consequence that must be stated plainly: the sessions she attended now
--   count one fewer person present. Her attendance was the academy's record of
--   who was in the room on a day, and removing it changes that day's figures.
--   The confirmation dialog says so before anybody taps, which is what
--   member_deletion_preview exists for.
--
-- member_stats IS NOT RECOMPUTED, and that is a real difference from 0047.
--   The cache is keyed by member and cascades away with her. Every column in
--   it derives from HER OWN attendance (0008), so no surviving member's
--   numbers move -- unlike the course purge, which took rows from fifteen
--   people who were staying. Calling recompute_member_stats here would walk
--   the academy to rebuild nothing.
--
-- IT WRITES ITS OWN AUDIT ROW. audit_members fires `after insert or update`
--   (0006), so a DELETE audits nothing at all -- the single most destructive
--   act available on a person, leaving no trace. The entry is written BY HAND
--   and BEFORE the rows go, inside the same transaction, so a failure below
--   rolls the entry back with everything else and the log never claims a
--   deletion that did not happen. audit_member_alias and audit_m_schedules do
--   fire on delete and add their own rows; that is additional detail, not a
--   substitute for the entry that names the person.
--
-- WHY THE WORK IS IN purge_member AND NOT IN delete_member ITSELF
--   Exactly 0047's reason. The members ALREADY soft-deleted in production need
--   the same removal, and delete_member -- rightly -- answers `already_deleted`
--   for a member who is flagged. Two copies of forty lines of destructive SQL
--   is one copy too many, so the removal is one function that delete_member
--   calls for a live member and 0052 calls for the flagged ones. purge_member
--   carries NO caller guard and is granted to service_role alone.
--
-- IDEMPOTENT, as 0044 was: deleting an already-deleted member reports zeroes
-- rather than erroring. Two taps on a slow connection is not a failure a
-- person needs to read about.
--
-- WHO MAY DO IT: unchanged from 0044 -- is_active_app_user() AND
--   is_subscription_writable(). This request did not touch the permission
--   boundary and neither does this file. Both guards are restated below
--   because SECURITY DEFINER bypasses RLS, and 33_delete_member_subscription_gate.sql
--   pins both from both sides.
--
-- This migration creates three functions and touches no row: no backfill, no
-- index build, no constraint validated over existing data. Safe on a live
-- database of any size. The one-off removal of the members ALREADY flagged is
-- 0052, a separate and separately-approved step, deliberately not in this file.


-- ------------------------------------------------------- the preview
--
-- WHAT THE CONFIRMATION IS ALLOWED TO SAY. Until now it stated a promise it
-- could keep without asking anything -- "her attendance history stays". It can
-- no longer promise anything, so it states a QUANTITY instead, and the app
-- holds none of these numbers: the members read carries a roster and a status,
-- never her attendance rows or her sent mail. Read-only, and gated exactly as
-- the deletion is -- it answers only for somebody who could carry it out.
create or replace function public.member_deletion_preview(p_member_id uuid)
returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare
  v_name       text;
  v_attendance int := 0;
  v_sessions   int := 0;
  v_enrolments int := 0;
  v_emails     int := 0;
begin
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can delete a member'
      using errcode = '42501';
  end if;

  select m.full_name into v_name
    from public.members m
   where m.id = p_member_id and m.deleted_at is null;
  if not found then
    return jsonb_build_object('member_id', p_member_id, 'name', null,
      'attendance_records', 0, 'sessions_attended', 0, 'enrolments', 0,
      'emails_sent', 0, 'already_deleted', true);
  end if;

  -- EVERY row, not only the live ones: a soft-deleted attendance record is
  -- still a row this deletion removes for good, and a count that quietly
  -- excluded it would understate the damage on the one screen whose whole job
  -- is to state it.
  select count(*), count(distinct a.session_id) into v_attendance, v_sessions
    from public.attendance_records a where a.member_id = p_member_id;

  select count(*) into v_enrolments
    from public.member_enrollments e where e.member_id = p_member_id;

  -- What the academy actually SENT her, not what it queued: a message that
  -- never went out is not a thing anybody needs warning about losing.
  select count(*) into v_emails
    from public.email_messages x
   where x.member_id = p_member_id and x.sent_at is not null;

  return jsonb_build_object(
    'member_id',          p_member_id,
    'name',               v_name,
    'attendance_records', v_attendance,
    'sessions_attended',  v_sessions,
    'enrolments',         v_enrolments,
    'emails_sent',        v_emails,
    'already_deleted',    false);
end $$;

revoke all on function public.member_deletion_preview(uuid) from public, anon;
grant execute on function public.member_deletion_preview(uuid) to authenticated, service_role;

comment on function public.member_deletion_preview(uuid) is
  'Read-only. Counts exactly what delete_member would destroy -- her attendance records, the sessions they span, her enrolments and the mail the academy has sent her -- so the confirmation can name the damage before anybody confirms it. Gated on is_active_app_user(), the same guard as the deletion itself.';


-- --------------------------------------------------------- the removal
--
-- NO CALLER GUARD, ON PURPOSE, AND THEREFORE service_role ONLY. This is the
-- part that deletes; the part that decides whether the caller may is
-- delete_member, below. It takes a member in ANY state -- live or already
-- flagged -- because 0052 needs it for the flagged ones, and reports what it
-- removed. A member id matching no row removes nothing and says so.
--
-- p_note goes into the audit entry's metadata. audit_log attributes a call
-- from inside a SECURITY DEFINER function run by a migration to no app user,
-- so without a note the log would show seven members hard-deleted by nobody in
-- particular. 0052 says who decided and when; delete_member passes nothing,
-- because there the actor IS the signed-in user and the log already has her.
create or replace function public.purge_member(p_member_id uuid, p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_member      record;
  v_sessions    uuid[];
  v_messages    int := 0;
  v_attendance  int := 0;
  v_expect      int := 0;
  v_enrolments  int := 0;
  v_emails      int := 0;
  v_aliases     int := 0;
  v_schedules   int := 0;
begin
  select m.id, m.full_name, m.member_code, m.deleted_at into v_member
    from public.members m where m.id = p_member_id;
  if not found then
    return jsonb_build_object(
      'member_id', p_member_id, 'name', null, 'member_code', null,
      'attendance_removed', 0, 'sessions_touched', 0, 'expectations_removed', 0,
      'messages_removed', 0, 'enrolments_removed', 0, 'emails_removed', 0,
      'aliases_removed', 0, 'schedules_removed', 0, 'found', false);
  end if;

  -- COLLECTED BEFORE ANYTHING IS DELETED, because afterwards there is nothing
  -- left to collect it from. The sessions are reported rather than touched:
  -- they are the academy's classes and they survive her, but the person
  -- confirming is owed the number of days whose figures are about to change.
  select coalesce(array_agg(distinct a.session_id), '{}') into v_sessions
    from public.attendance_records a where a.member_id = p_member_id;

  -- THE AUDIT ROW COMES FIRST. audit_members fires on insert or update only,
  -- so the DELETE below audits nothing by itself, and after the transaction
  -- there is no row left to describe. Written here it is inside the same
  -- transaction: a failure below rolls it back with everything else.
  -- `was_soft_deleted_at` tells 0052's rows apart from a live deletion.
  perform public.audit_log('member.hard_deleted', 'member', p_member_id::text,
    '[]'::jsonb,
    jsonb_build_object(
      'name',                v_member.full_name,
      'member_code',         v_member.member_code,
      'was_soft_deleted_at', v_member.deleted_at,
      'note',                p_note,
      'session_ids',         to_jsonb(v_sessions),
      'sessions_touched',    coalesce(array_length(v_sessions, 1), 0),
      'attendance_records',  (select count(*) from public.attendance_records
                               where member_id = p_member_id),
      'enrolments',          (select count(*) from public.member_enrollments
                               where member_id = p_member_id),
      'emails_sent',         (select count(*) from public.email_messages
                               where member_id = p_member_id and sent_at is not null)));

  -- 1. HER MAIL FIRST, and this is the step whose order is not negotiable.
  --    email_messages.member_email_id references member_emails, which
  --    CASCADES from members -- so deleting her fires a cascade that this
  --    constraint refuses, and the whole statement fails. It fails only for a
  --    member the academy has emailed, which is exactly the members that
  --    matter. The batch itself is not touched: a send happened whether or not
  --    one of its recipients is still on the register.
  with gone as (
    delete from public.email_messages where member_id = p_member_id
    returning 1)
  select count(*) into v_messages from gone;

  -- 2. Her attendance. NO ACTION, so it goes by hand, and this is the half of
  --    the deletion the confirmation had to warn about: the academy's record
  --    of who was in the room on those days changes here.
  with gone as (
    delete from public.attendance_records where member_id = p_member_id
    returning 1)
  select count(*) into v_attendance from gone;

  -- 3. The frozen expected-set rows. NO ACTION as well. Without this the
  --    deletion fails on any session that was ever generated for her -- and
  --    with it, a completed session stops expecting somebody who no longer
  --    exists.
  with gone as (
    delete from public.session_expectations where member_id = p_member_id
    returning 1)
  select count(*) into v_expect from gone;

  -- 4-7. These five cascade from members, but they are deleted by hand so the
  --      counts are REPORTED rather than inferred -- the toast says what went,
  --      and a number nobody measured is a number nobody should print.
  with gone as (
    delete from public.member_enrollments where member_id = p_member_id
    returning 1)
  select count(*) into v_enrolments from gone;

  with gone as (
    delete from public.member_emails where member_id = p_member_id
    returning 1)
  select count(*) into v_emails from gone;

  with gone as (
    delete from public.member_aliases where member_id = p_member_id
    returning 1)
  select count(*) into v_aliases from gone;

  with gone as (
    delete from public.member_schedules where member_id = p_member_id
    returning 1)
  select count(*) into v_schedules from gone;

  -- 8. And the member herself, last, so a failure anywhere above rolls the
  --    whole thing back rather than leaving half a person in the tables.
  --    member_stats cascades from here; it is a rebuildable cache keyed by
  --    member (0008) and there is no member left to key it to.
  delete from public.members where id = p_member_id;

  -- NO recompute_member_stats. Every column of that cache derives from the
  -- member's OWN attendance, so no surviving member's numbers moved. This is
  -- the one place purge_member is deliberately not purge_course.

  return jsonb_build_object(
    'member_id',            p_member_id,
    'name',                 v_member.full_name,
    'member_code',          v_member.member_code,
    'attendance_removed',   v_attendance,
    'sessions_touched',     coalesce(array_length(v_sessions, 1), 0),
    'expectations_removed', v_expect,
    'messages_removed',     v_messages,
    'enrolments_removed',   v_enrolments,
    'emails_removed',       v_emails,
    'aliases_removed',      v_aliases,
    'schedules_removed',    v_schedules,
    'found',                true);
end $$;

-- service_role ONLY. No signed-in account reaches this except through
-- delete_member, which checks the caller first and then runs as its definer.
revoke all on function public.purge_member(uuid, text) from public, anon, authenticated;
grant execute on function public.purge_member(uuid, text) to service_role;

comment on function public.purge_member(uuid, text) is
  'The row removal behind delete_member, with NO caller guard of its own -- which is why only service_role may execute it. Removes a member in any state (live or already flagged) together with her sent mail, attendance records, expected-slots, enrolments, addresses, aliases, schedules and stats -- her messages FIRST, because email_messages.member_email_id refuses the cascade from member_emails. Writes an audit entry before the rows go, since audit_members fires only on insert and update. Sessions, batches, imports and every other member are untouched. Called by delete_member for a live member and by 0052 for the members soft-deleted before 0051.';


-- -------------------------------------------------------- the deletion
create or replace function public.delete_member(p_member_id uuid)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_result jsonb;
begin
  -- SECURITY DEFINER bypasses RLS, so the predicate members_write carries has
  -- to be restated here or this function is a hole straight through it. BOTH
  -- guards, unchanged from 0044 and pinned from both sides by
  -- 30_delete_member.sql and 33_delete_member_subscription_gate.sql: the role
  -- gate and the billing gate are different questions (0002) and neither
  -- stands in for the other.
  if not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can delete a member'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so the member was not deleted'
      using errcode = '42501';
  end if;

  if not exists (select 1 from public.members m
                  where m.id = p_member_id and m.deleted_at is null) then
    -- Already gone, or never there. Report the shape the caller expects.
    return jsonb_build_object(
      'member_id', p_member_id, 'name', null, 'member_code', null,
      'attendance_removed', 0, 'sessions_touched', 0, 'expectations_removed', 0,
      'messages_removed', 0, 'enrolments_removed', 0, 'emails_removed', 0,
      'aliases_removed', 0, 'schedules_removed', 0, 'already_deleted', true);
  end if;

  v_result := public.purge_member(p_member_id);
  return (v_result - 'found') || jsonb_build_object('already_deleted', false);
end $$;

-- 0011/0012 posture: nothing reaches anon, and the function re-checks its
-- caller itself, above.
revoke all on function public.delete_member(uuid) from public, anon;
grant execute on function public.delete_member(uuid) to authenticated, service_role;

comment on function public.delete_member(uuid) is
  'The ONLY delete path for a member, and a HARD one since 0051. Checks the caller -- any signed-in active user, on a writable subscription, exactly as 0044 -- and then removes her record entirely through purge_member in one transaction: her sent mail, attendance records, expected-slots, enrolments, addresses, aliases, schedules and stats. Nothing of her is left in any table. The sessions she attended survive, with their figures changed. Writes its own audit entry before the rows go. Idempotent -- deleting an already-deleted member reports zeroes rather than erroring.';
