-- 0055 · every member leaves the register
--
-- A DATA MIGRATION, and the whole of requests/2026-09-08-delete-every-member.md.
-- The requester's words: "delete all member and all corresponding records",
-- sent with a screenshot of the Supabase table editor -- all 30 rows of
-- public.members ticked, "Delete 30 rows" pressed, and the dashboard refusing:
--
--   "Unable to delete rows as one of them is currently referenced by a foreign
--    key constraint from the table `attendance_records` ... Key (id)=(28e2fc9e
--    -632a-4a15-9a5c-f36336b630a4) is still referenced from table
--    attendance_records."
--
-- THIS IS NOT A SOFT-DELETE CLEANUP. 0048, 0052, 0053 and 0054 each removed
-- rows that were ALREADY deleted. This removes THE ENTIRE STUDENT REGISTER --
-- thirty live members, every one of them currently on it. Nothing here selects
-- on deleted_at, because nothing in the database has it set. It was chosen
-- explicitly, with the counts below in front of the requester.
--
-- WHAT IT REMOVES, measured on production at 07:35 UTC on 08-Sep-2026:
--
--   members                30      the whole register
--   member_aliases         34
--   member_emails          19
--   member_enrollments     12
--   member_stats           30      a derived cache, one row per member
--   member_schedules        2
--   email_messages         10      of which SIX WERE ACTUALLY SENT
--   attendance_records      0      -- see below
--   session_expectations    0      -- see below
--
-- ATTENDANCE IS ALREADY GONE, AND NOT BY ANY CODE IN THIS REPO. It held 25
-- rows at 07:00 UTC and 0 at 07:35, and audit_logs records NOTHING between
-- 0054 at 07:16 and now: no attendance.delete, no member.hard_deleted, no
-- entry of any kind. audit_attendance fires on insert and update only, so rows
-- removed straight from the Supabase table editor leave no trace at all --
-- which is exactly what happened, and is why this file goes through
-- purge_member instead of a hand-written DELETE. Recorded here because a
-- migration that says "0 attendance records removed" would otherwise read as
-- though there had never been any.
--
-- WHY IT MUST NOT BE A BARE DELETE, which is the whole reason the dashboard
-- refused. The removal order is dictated by foreign keys, and the one that
-- bites is invisible unless you have read the constraint graph:
--
--   email_messages.member_id       -> members(id)        NO ACTION
--   email_messages.member_email_id -> member_emails(id)  NO ACTION   <-- the trap
--   attendance_records.member_id   -> members(id)        NO ACTION
--   session_expectations.member_id -> members(id)        NO ACTION
--
--   member_emails CASCADES from members -- so deleting a member fires a cascade
--   that email_messages then refuses, and the whole statement fails. It fails
--   only for a member the academy has actually emailed. `delete from members`
--   cannot be made to work by ticking boxes in any order.
--
-- WHY THROUGH purge_member AND NOT HAND-WRITTEN DELETES. Identical to 0052's
-- reason. 0051 got that order right once, with a spec (40_hard_delete_member.sql).
-- A second copy here would be a second place to get it wrong, and this one runs
-- against production with no harness rows to catch it. The migration runner is
-- superuser / service_role, which is precisely who purge_member is granted to.
-- It also means EVERY MEMBER IS HER OWN AUDIT ENTRY -- thirty of them, written
-- before her rows go -- so unlike the attendance that vanished from the
-- dashboard, this removal is on the record.
--
-- WHAT SURVIVES, and why each one is not the member's to take with her:
--   · sessions, courses, course_offerings, offering_schedules -- the academy's
--     classes. A class happened whether or not anybody is still enrolled.
--   · csv_imports and email_batches -- a file the academy processed and a send
--     it performed. 0051 spared both for that reason and so does this.
--   · app_users, branches, holidays, templates, settings, subscription.
--   · audit_logs, append-only (0004), which this file WRITES to.
--
--   The register comes back empty. Every screen that lists students will show
--   nothing until somebody is added or imported, and every session's figures
--   become "0 present" because there is nobody left to have attended.
--
-- THE IMPORT RECEIPTS GO WITH THEM, and this is not scope creep -- it is the
-- invariant 0054 established one hour earlier, applied to the rows this file
-- creates. member_import_runs.rows names members by id with no foreign key, so
-- emptying the register would leave all five surviving receipts naming members
-- who no longer exist: precisely the "deleted members are still in database"
-- the requester reported, recreated by this file. So the same rule runs again
-- at the end, on the same terms they chose then ("delete them as well i just
-- want to delete all records").
--
-- IDEMPOTENT: on a database with no members -- the harness, or a second run --
-- both loops select nothing and do nothing.
--
-- NOT REVERSIBLE, and this is the one to read twice. There is no down
-- migration and nothing to restore from. Thirty living records, six sent
-- emails and the whole register go, and no backup of them is taken here.
-- Stated to the requester at the gate, with the counts above, before this file
-- was applied.

do $$
declare
  v_member     record;
  v_result     jsonb;
  v_members    int := 0;
  v_attendance int := 0;
  v_enrolments int := 0;
  v_messages   int := 0;
  v_emails     int := 0;
  v_aliases    int := 0;
begin
  for v_member in
    select m.id, m.full_name from public.members m order by m.created_at
  loop
    v_result := public.purge_member(v_member.id,
      '0055_purge_every_member: the entire register removed at the repo owner''s explicit '
      || 'request of 08-Sep-2026 ("delete all member and all corresponding records"), '
      || 'requests/2026-09-08-delete-every-member.md');

    v_members    := v_members + 1;
    v_attendance := v_attendance + (v_result->>'attendance_removed')::int;
    v_enrolments := v_enrolments + (v_result->>'enrolments_removed')::int;
    v_messages   := v_messages + (v_result->>'messages_removed')::int;
    v_emails     := v_emails + (v_result->>'emails_removed')::int;
    v_aliases    := v_aliases + (v_result->>'aliases_removed')::int;
  end loop;

  raise notice '0055: % member(s) purged -- % attendance, % enrolments, % messages, % addresses, % aliases',
    v_members, v_attendance, v_enrolments, v_messages, v_emails, v_aliases;
end $$;

-- ------------------------------------------------ the receipts follow them
-- 0054's rule, re-run: a member_import_runs row naming a member who no longer
-- exists is removed whole. Emptying the register turns every surviving receipt
-- into one of those, so without this the file would recreate by hand the exact
-- complaint 0054 was written to answer.
do $$
declare
  v_run  record;
  v_runs int := 0;
begin
  for v_run in
    select r.id, r.file_name, r.created_at, r.total_rows, r.inserted_count, r.rows
      from public.member_import_runs r
     where exists (
       select 1 from jsonb_array_elements(r.rows) e
        where e.value->>'member_id' is not null
          and not exists (select 1 from public.members m
                           where m.id = (e.value->>'member_id')::uuid))
     order by r.created_at
  loop
    perform public.audit_log('member_import_run.hard_deleted', 'member_import_run',
      v_run.id::text, '[]'::jsonb,
      jsonb_build_object(
        'file_name',      v_run.file_name,
        'run_created_at', v_run.created_at,
        'total_rows',     v_run.total_rows,
        'inserted_count', v_run.inserted_count,
        'elements',       jsonb_array_length(v_run.rows),
        'note', '0055_purge_every_member: an import receipt left naming members who no longer '
             || 'exist once the register was emptied, removed under the rule the repo owner '
             || 'chose for 0054 on 08-Sep-2026'));

    delete from public.member_import_runs where id = v_run.id;
    v_runs := v_runs + 1;
  end loop;

  raise notice '0055: % import receipt(s) removed behind the register', v_runs;
end $$;

-- ------------------------------------------------------------ the assertions
-- Asserted at the end of the same transaction rather than trusted. A failure
-- here rolls the whole file back and the register is untouched.
do $$
declare
  v_left int;
begin
  -- 1. The register is empty, and so is everything keyed to a member.
  select count(*) into v_left from public.members;
  if v_left <> 0 then
    raise exception '0055: % member(s) survived the purge', v_left;
  end if;
  if exists (select 1 from public.attendance_records) then
    raise exception '0055: an attendance record survived the register';
  end if;
  if exists (select 1 from public.member_enrollments) then
    raise exception '0055: an enrolment survived the register';
  end if;
  if exists (select 1 from public.member_emails) then
    raise exception '0055: an address survived the register';
  end if;
  if exists (select 1 from public.member_aliases) then
    raise exception '0055: an alias survived the register';
  end if;
  if exists (select 1 from public.member_schedules) then
    raise exception '0055: a member schedule survived the register';
  end if;
  if exists (select 1 from public.member_stats) then
    raise exception '0055: a member stat row survived the register';
  end if;
  if exists (select 1 from public.session_expectations) then
    raise exception '0055: an expected-slot row survived the register';
  end if;
  if exists (select 1 from public.email_messages) then
    raise exception '0055: a message survived the register';
  end if;

  -- 2. No import receipt names somebody who is gone -- 0054's invariant, held.
  if exists (
    select 1 from public.member_import_runs r
    cross join lateral jsonb_array_elements(r.rows) e
     where e.value->>'member_id' is not null
       and not exists (select 1 from public.members m
                        where m.id = (e.value->>'member_id')::uuid)) then
    raise exception '0055: an import receipt still names a member who does not exist';
  end if;

  -- 3. The academy's own records are untouched. This is the half of the file
  --    that is a claim about what did NOT happen, so it is checked rather than
  --    asserted in a comment: a purge that reached the classes, the uploads or
  --    the sends would be a different and much worse event than the one asked
  --    for, and it would show up here and nowhere else.
  if not exists (select 1 from public.sessions) then
    raise exception '0055: the sessions are gone -- the purge reached the academy''s classes';
  end if;
  if not exists (select 1 from public.courses) then
    raise exception '0055: the courses are gone -- the purge reached past the register';
  end if;
  if not exists (select 1 from public.course_offerings) then
    raise exception '0055: the offerings are gone -- the purge reached past the register';
  end if;
  if not exists (select 1 from public.csv_imports) then
    raise exception '0055: the imports are gone -- they are the academy''s record, not the members''';
  end if;
  if not exists (select 1 from public.email_batches) then
    raise exception '0055: the send batches are gone -- a send happened whether or not its recipients remain';
  end if;
  if not exists (select 1 from public.app_users) then
    raise exception '0055: the app users are gone -- nobody could sign in again';
  end if;
end $$;
