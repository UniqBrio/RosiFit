-- 0053 · the last soft-deleted rows leave the database
--
-- A DATA MIGRATION, and the whole of requests/2026-09-08-purge-remaining-soft-deleted-rows.md.
-- The requester's words: "from supabase delete all records deleted such as
-- course and members and all its related records such as attendance and all
-- its reference execute at earliest".
--
-- COURSES AND MEMBERS ARE ALREADY DONE, EARLIER THE SAME DAY. 0047/0048 took
-- the six flagged courses with their sessions, attendance, enrolments and
-- imports; 0051/0052 took the seven flagged members with their attendance,
-- enrolments and mail; and both changed the delete path itself, so nothing new
-- accumulates behind them. Measured on production at 06:20 UTC on 08-Sep-2026:
--
--   courses 0 flagged of 4      members 0 flagged of 27
--   course_offerings 0 of 4     sessions 0 of 6
--   attendance_records 0 of 22  app_users 0 of 7
--
--   and no orphan anywhere in the graph -- no offering without a course, no
--   session without an offering, no attendance, enrolment, stat, expectation,
--   message or import pointing at a row that is gone. Twelve orphan checks,
--   all zero. This file therefore does NOT re-do 0048 or 0052; it finishes the
--   ask on the two tables they never covered.
--
--   THE DATABASE IS IN USE WHILE THIS IS BEING PREPARED. A super_admin
--   hard-deleted the member "Priya" through the app at 06:13 UTC, between two
--   of the measurements above -- 0051's delete path working exactly as
--   intended, which is why the member counts move and why no soft-deleted
--   member ever appears again. Both loops below select on deleted_at at APPLY
--   time, not on any id written here, so they purge whatever is flagged when
--   they run rather than the snapshot this header describes.
--
-- WHAT IS ACTUALLY LEFT, measured on production at 06:20 UTC on 08-Sep-2026
-- (the harness has no live rows, so this is the check it cannot make):
--
--   branches        1 flagged of 3   "Chennai" (70e37863), removed 06-Sep-2026
--                                    0 course offerings, 0 holidays -- nothing
--                                    references it, so the foreign keys that
--                                    refuse a branch delete have nothing to
--                                    refuse. A SECOND, LIVE "Chennai"
--                                    (cbacccd2) exists and is NOT touched:
--                                    this file selects on deleted_at, never on
--                                    a name, which is what keeps those two
--                                    apart.
--
--   member_emails   3 flagged of 21  three addresses of ONE LIVE member,
--                                    Shazia Far (8154aaa9), removed by hand on
--                                    08-Sep-2026 between 04:42 and 04:45:
--                                    shazia.far@ · shaziafarheen75@ ·
--                                    shaziafarhee74@. 0 sent messages between
--                                    them.
--
-- THE SECOND ONE IS A DIFFERENT KIND OF THING AND WAS PUT TO THE REQUESTER AS
-- ONE. A flagged branch is a removed branch. A flagged member_email is a
-- correction to a member who is still on the register: she is not deleted, her
-- address was. "all records deleted" covers it in plain words, so it is here --
-- but it is named separately above rather than folded into a count, because
-- purging it edits the history of somebody who is staying, and that is the
-- requester's call to make with her eyes open. Nothing else of hers is touched:
-- her live address, her enrolment, her attendance and her stats all stay.
--
-- WHY HAND-WRITTEN DELETES HERE, WHEN 0048 AND 0052 REFUSED TO WRITE ANY.
-- Those two had purge_course and purge_member to call -- functions with specs,
-- got right once, and reused rather than copied. There is no purge_branch and
-- no purge_member_email, and this file must not invent one: creating a function
-- would change what removing a branch or an address DOES from now on, which is
-- a behaviour change nobody asked for. 0019 made branch removal a soft delete
-- deliberately, and that decision is not re-opened here. So the deletes are
-- written out, once, for rows that have no dependants at all -- and every
-- dependant is counted and asserted first rather than assumed away.
--
-- EACH ROW IS ITS OWN AUDIT ENTRY. audit_branches and audit_member_email both
-- fire `after insert or update` (0005, 0006), so a DELETE audits nothing by
-- itself -- exactly the hole 0047 and 0051 had to fill. The entries are written
-- BY HAND and BEFORE the rows go, inside the same transaction, so a failure
-- below rolls them back and the log never claims a deletion that did not
-- happen. `was_soft_deleted_at` carries the original removal time, so the log
-- records both that the row was removed (then) and that it was purged (now),
-- and tells the two apart.
--
-- WHAT IS NOT TOUCHED
--   · audit_logs, which is append-only (0004) and which this file WRITES to.
--   · the live "Chennai" branch, the live "Main" branch, and every live
--     address including Shazia Far's own.
--   · every course, member, session, attendance record, enrolment, import and
--     message in the database. None of them is flagged, and none is read here
--     except to assert that nothing was left dangling.
--
-- IDEMPOTENT: on a database with nothing flagged -- the harness, or a second
-- run -- both loops select nothing and do nothing.
--
-- NOT REVERSIBLE. There is no down migration because there is nothing to
-- restore from. That is stated to the requester at the gate, with the rows
-- above, before this file is applied.

-- ------------------------------------------------------ the flagged branch
do $$
declare
  v_branch    record;
  v_offerings int;
  v_holidays  int;
  v_count     int := 0;
begin
  for v_branch in
    select b.id, b.name, b.code, b.deleted_at
      from public.branches b
     where b.deleted_at is not null
     order by b.deleted_at
  loop
    -- EVERY offering, not only the live ones. branches_guard_removal (0019)
    -- counts live offerings alone, because a soft delete only has to worry
    -- about what is still running. A hard delete is refused by the foreign key
    -- for a soft-deleted offering just the same, so the count here is wider
    -- than the guard's on purpose.
    select count(*) into v_offerings
      from public.course_offerings where branch_id = v_branch.id;
    select count(*) into v_holidays
      from public.holidays where branch_id = v_branch.id;

    -- A flagged branch that still has either should not exist -- 0019's guard
    -- refuses to create one. If production holds one anyway, that is a fact
    -- somebody needs to look at, not a row this file may quietly skip or
    -- forcibly strand. Rolls the whole file back.
    if v_offerings > 0 or v_holidays > 0 then
      raise exception
        '0053: removed branch % still has % offering(s) and % holiday(s) -- not purged, nothing in this file was applied',
        v_branch.name, v_offerings, v_holidays;
    end if;

    perform public.audit_log('branch.hard_deleted', 'branch', v_branch.id::text,
      '[]'::jsonb,
      jsonb_build_object(
        'name',                v_branch.name,
        'code',                v_branch.code,
        'was_soft_deleted_at', v_branch.deleted_at,
        'offerings',           v_offerings,
        'holidays',            v_holidays,
        'note', '0053_purge_soft_deleted_branches_and_emails: a branch removed under 0019''s '
             || 'soft delete, purged on the repo owner''s explicit go-ahead of 08-Sep-2026 '
             || '(requests/2026-09-08-purge-remaining-soft-deleted-rows.md)'));

    delete from public.branches where id = v_branch.id;
    v_count := v_count + 1;
    raise notice '0053: purged branch % (%) removed % -- 0 offerings, 0 holidays',
      v_branch.name, v_branch.code, v_branch.deleted_at;
  end loop;

  raise notice '0053: % soft-deleted branch(es) purged', v_count;
end $$;

-- ------------------------------------------------- the flagged addresses
do $$
declare
  v_email    record;
  v_messages int;
  v_count    int := 0;
begin
  for v_email in
    select e.id, e.member_id, e.email, e.is_primary, e.deleted_at,
           m.full_name, m.deleted_at as member_deleted_at
      from public.member_emails e
      left join public.members m on m.id = e.member_id
     where e.deleted_at is not null
     order by e.deleted_at
  loop
    -- email_messages.member_email_id is NO ACTION (0009) -- the same constraint
    -- that made purge_member delete a member's mail first. Here there is no
    -- member being removed and so no mail to remove with her: a flagged address
    -- the academy actually sent to keeps the message that proves the send, and
    -- the address stays rather than the record of the send disappearing.
    select count(*) into v_messages
      from public.email_messages where member_email_id = v_email.id;

    if v_messages > 0 then
      raise exception
        '0053: removed address % of % still carries % sent message(s) -- not purged, nothing in this file was applied',
        v_email.email, coalesce(v_email.full_name, '(unknown member)'), v_messages;
    end if;

    perform public.audit_log('member_email.hard_deleted', 'member_email', v_email.id::text,
      '[]'::jsonb,
      jsonb_build_object(
        'email',               v_email.email,
        'member_id',           v_email.member_id,
        'member_name',         v_email.full_name,
        'member_is_deleted',   (v_email.member_deleted_at is not null),
        'was_primary',         v_email.is_primary,
        'was_soft_deleted_at', v_email.deleted_at,
        'note', '0053_purge_soft_deleted_branches_and_emails: an address removed from a member '
             || 'who remains on the register, purged on the repo owner''s explicit go-ahead of '
             || '08-Sep-2026 (requests/2026-09-08-purge-remaining-soft-deleted-rows.md)'));

    delete from public.member_emails where id = v_email.id;
    v_count := v_count + 1;
    raise notice '0053: purged address % of % (removed %)',
      v_email.email, coalesce(v_email.full_name, '(unknown member)'), v_email.deleted_at;
  end loop;

  raise notice '0053: % soft-deleted address(es) purged', v_count;
end $$;

-- ------------------------------------------------------------ the assertions
-- What "nothing deleted is left, and nothing live was touched" means, asserted
-- at the end of the same transaction rather than trusted. A failure here rolls
-- the whole file back.
do $$
declare
  v_live_branches int;
begin
  -- 1. Nothing flagged survives, in any of the eight tables that can flag.
  if exists (select 1 from public.branches where deleted_at is not null) then
    raise exception '0053: a soft-deleted branch survived the purge';
  end if;
  if exists (select 1 from public.member_emails where deleted_at is not null) then
    raise exception '0053: a soft-deleted address survived the purge';
  end if;
  if exists (select 1 from public.courses where deleted_at is not null) then
    raise exception '0053: a soft-deleted course is present -- 0048 did not hold';
  end if;
  if exists (select 1 from public.members where deleted_at is not null) then
    raise exception '0053: a soft-deleted member is present -- 0052 did not hold';
  end if;
  if exists (select 1 from public.course_offerings where deleted_at is not null) then
    raise exception '0053: a soft-deleted offering is present';
  end if;
  if exists (select 1 from public.sessions where deleted_at is not null) then
    raise exception '0053: a soft-deleted session is present';
  end if;
  if exists (select 1 from public.attendance_records where deleted_at is not null) then
    raise exception '0053: a soft-deleted attendance record is present';
  end if;
  if exists (select 1 from public.app_users where deleted_at is not null) then
    raise exception '0053: a soft-deleted app user is present';
  end if;

  -- 2. Nothing was left dangling by what this file removed.
  if exists (select 1 from public.course_offerings o
              left join public.branches b on b.id = o.branch_id
             where o.branch_id is not null and b.id is null) then
    raise exception '0053: an offering is left without a branch';
  end if;
  if exists (select 1 from public.holidays h
              left join public.branches b on b.id = h.branch_id
             where h.branch_id is not null and b.id is null) then
    raise exception '0053: a holiday is left without a branch';
  end if;
  if exists (select 1 from public.email_messages x
              left join public.member_emails e on e.id = x.member_email_id
             where x.member_email_id is not null and e.id is null) then
    raise exception '0053: a sent message is left without an address';
  end if;
  if exists (select 1 from public.member_emails e
              left join public.members m on m.id = e.member_id
             where m.id is null) then
    raise exception '0053: an address is left without a member';
  end if;

  -- 3. And the branches that were NOT flagged are all still here. The whole
  --    risk in the branch half is a WHERE clause that reaches one row too far,
  --    and "Chennai" exists twice -- once removed, once live. Production held
  --    two live branches when this was written; the harness holds none, so the
  --    check is on losing them, not on the number.
  select count(*) into v_live_branches from public.branches;
  if v_live_branches = 0 and exists (select 1 from public.course_offerings) then
    raise exception '0053: every branch is gone but offerings remain -- the purge over-reached';
  end if;
end $$;
