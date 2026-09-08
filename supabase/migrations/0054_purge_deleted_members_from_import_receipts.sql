-- 0054 · the deleted members leave the import receipts too
--
-- A DATA MIGRATION, and the whole of
-- requests/2026-09-08-deleted-members-still-in-database.md. The requester's
-- words: "Deleted members are still in database clean all delete members
-- records along with attendance email and all related records of that member
-- do it at earliest" -- and, shown the choice between redacting the person out
-- of each receipt and removing the receipts entirely: "delete them as well i
-- just want to delete all records".
--
-- WHAT WAS ALREADY TRUE WHEN THIS WAS WRITTEN, and it matters, because the
-- report and the finding are not the same thing. Measured on production at
-- 07:00 UTC on 08-Sep-2026:
--
--   · public.members holds THIRTY rows and NOT ONE has deleted_at set. There
--     is no soft-deleted member anywhere in the database. 0051 made the delete
--     hard and 0052 took the seven that predated it.
--   · ELEVEN members have been hard-deleted through the app (audit_logs,
--     action 'member.hard_deleted'): nitha, Rahul x2, Raja x2, Sunny, Pooja,
--     Sumathi, kkjkj, Rajesh, Priya.
--   · For all eleven, EVERY table that references members holds ZERO rows --
--     attendance_records, email_messages, member_emails, member_enrollments,
--     member_aliases, member_schedules, member_stats, session_expectations.
--     Counted one table at a time, not inferred from the foreign keys.
--
--   So the attendance and the email the request names were already gone. The
--   delete path is not leaking.
--
-- WHERE THEY ACTUALLY SURVIVED. public.member_import_runs.rows is a jsonb
-- receipt of a member upload -- one element per spreadsheet row, shaped
-- {row, status, full_name, member_id}. It has NO foreign key to members
-- (0028 gave it only default_offering_id and imported_by), so purge_member
-- never reached it and no cascade ever will. Fourteen elements across eight
-- runs; SEVEN of them still carry the name and the id of a member who no
-- longer exists:
--
--   run c0a09d45  4 of 4 elements   Raja · Sunny · Rahul · Pooja
--   run 08e413fb  2 of 2 elements   Raja · Rahul
--   run 434124d5  1 of 1 element    Priya
--
--   That is the whole of "deleted members are still in database", and it is a
--   real finding: a person removed from the register still had her name
--   sitting in a jsonb column that no delete path has ever reached.
--
-- THE RECEIPT GOES, NOT JUST THE NAME. Offered the surgical option -- keep the
-- run, drop {full_name, member_id} from the seven elements -- the requester
-- chose the whole row: "i just want to delete all records". So this deletes
-- the member_import_runs row itself.
--
--   WHAT THAT COSTS, STATED RATHER THAN GLOSSED: a run is the academy's record
--   that a FILE was uploaded and how many rows it carried. 0051 spared
--   csv_imports for exactly that reason ("An import is a file the academy
--   processed"). Removing these three means the academy can no longer show
--   that those three uploads ever happened. The cost is bounded here and only
--   here: ALL THREE runs consist ENTIRELY of deleted members (4 of 4, 2 of 2,
--   1 of 1), so no surviving member loses the record of how she was added.
--   The five other runs are untouched.
--
--   IF A MIXED RUN EVER EXISTED -- some rows deleted members, some live -- this
--   file would take it whole, and a live member would lose her import
--   provenance. None exists today. The audit entry below therefore RECORDS the
--   number of live members in each deleted run, so that if this file is ever
--   replayed against a database where that is not zero, the log says what it
--   cost rather than leaving it to be discovered.
--
-- WHAT THIS FILE DOES NOT DO, AND WHY
--
--   · IT DOES NOT TOUCH audit_logs, which still holds each member's name in
--     the 'member.hard_deleted' entry that records her removal. That table is
--     append-only by construction (0004, three immutability triggers) and the
--     entry is the PROOF the deletion happened. Destroying it would leave the
--     academy unable to show that it honoured the removal at all. That is a
--     different request with a different answer, and it is named here rather
--     than done quietly.
--
--   · IT DOES NOT TOUCH attendance_records.raw_display_name. Three rows there
--     carry a name that matches a deleted member -- "Sumathi" twice and
--     "nitha" once -- and every one belongs to a LIVE member (Sumathi
--     5f1a0dba, Ani 061c5f48). They are name collisions, not residue. This is
--     the trap in the whole request: matching on a NAME would have destroyed
--     three live members' attendance. Every selection in this file is by ID,
--     and by the ABSENCE of that id from members.
--
-- HOW A RUN IS CHOSEN, and why not from audit_logs. A run is deleted when any
-- of its elements names a member_id that is NOT in public.members. That is
-- self-describing -- it does not care which delete path removed her, or
-- whether the removal predates the audit action name -- and it is what makes
-- the file idempotent: afterwards no run names a missing member, so a second
-- run selects nothing.
--
-- NOTHING IS HARD-CODED TO THE SNAPSHOT ABOVE. The database is in active use
-- while this is being prepared -- members were imported and deleted through
-- the app between two of the measurements -- so the counts are captured at
-- APPLY time and the assertions compare before against after. A number typed
-- into this file would be stale the moment somebody used the app.
--
-- IDEMPOTENT · NOT REVERSIBLE. No down migration; there is nothing to restore
-- from. Stated to the requester at the gate before this was applied.

do $$
declare
  v_run          record;
  v_dead         int;
  v_live         int;
  v_runs_before  int;
  v_runs_after   int;
  v_mem_before   int;
  v_mem_after    int;
  v_runs_gone    int := 0;
  v_elements     int := 0;
  v_live_lost    int := 0;
begin
  select count(*) into v_runs_before from public.member_import_runs;
  select count(*) into v_mem_before  from public.members;

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
    -- Counted BEFORE the delete, because afterwards there is nothing left to
    -- count. v_live is the number of elements naming a member who IS still on
    -- the register -- the cost of taking the whole run rather than redacting
    -- it. It is zero for all three runs today; it is measured rather than
    -- assumed so that a replay elsewhere reports the truth.
    select
      count(*) filter (
        where e.value->>'member_id' is not null
          and not exists (select 1 from public.members m
                           where m.id = (e.value->>'member_id')::uuid)),
      count(*) filter (
        where e.value->>'member_id' is not null
          and exists (select 1 from public.members m
                       where m.id = (e.value->>'member_id')::uuid))
      into v_dead, v_live
      from jsonb_array_elements(v_run.rows) e;

    -- The audit entry names the RUN, its FILE and COUNTS, and deliberately not
    -- the people: writing the names here would put back into the database
    -- exactly what this file exists to take out of it. audit_logs already
    -- carries each name once, in the member.hard_deleted entry that proves the
    -- removal. member_import_runs has no delete trigger of its own, so without
    -- this entry the removal would leave no trace at all.
    perform public.audit_log('member_import_run.hard_deleted', 'member_import_run',
      v_run.id::text, '[]'::jsonb,
      jsonb_build_object(
        'file_name',              v_run.file_name,
        'run_created_at',         v_run.created_at,
        'total_rows',             v_run.total_rows,
        'inserted_count',         v_run.inserted_count,
        'elements',               jsonb_array_length(v_run.rows),
        'elements_deleted_member', v_dead,
        'elements_live_member',   v_live,
        'note', '0054_purge_deleted_members_from_import_receipts: an import receipt naming '
             || 'members who no longer exist, removed whole on the repo owner''s explicit '
             || 'go-ahead of 08-Sep-2026 ("delete them as well i just want to delete all '
             || 'records"), requests/2026-09-08-deleted-members-still-in-database.md'));

    delete from public.member_import_runs where id = v_run.id;

    v_runs_gone := v_runs_gone + 1;
    v_elements  := v_elements + jsonb_array_length(v_run.rows);
    v_live_lost := v_live_lost + v_live;
    raise notice '0054: deleted run % (%) -- % element(s), % naming a deleted member, % naming a live one',
      v_run.id, v_run.file_name, jsonb_array_length(v_run.rows), v_dead, v_live;
  end loop;

  select count(*) into v_runs_after from public.member_import_runs;
  select count(*) into v_mem_after  from public.members;

  -- Compared against what was measured at the start of THIS transaction, not
  -- against a number typed into the file.
  if v_runs_after <> v_runs_before - v_runs_gone then
    raise exception '0054: import runs went from % to %, expected % -- the delete reached past its loop',
      v_runs_before, v_runs_after, v_runs_before - v_runs_gone;
  end if;
  if v_mem_after <> v_mem_before then
    raise exception '0054: the members table changed from % to % rows -- nothing here may touch a member',
      v_mem_before, v_mem_after;
  end if;

  raise notice '0054: % import receipt(s) deleted, % element(s) in total, % belonging to a live member',
    v_runs_gone, v_elements, v_live_lost;
end $$;

-- ------------------------------------------------------------ the assertions
-- Asserted at the end of the same transaction rather than trusted. A failure
-- here rolls the whole file back.
do $$
begin
  -- 1. No surviving receipt names a member who is not in the members table.
  if exists (
    select 1 from public.member_import_runs r
    cross join lateral jsonb_array_elements(r.rows) e
     where e.value->>'member_id' is not null
       and not exists (select 1 from public.members m
                        where m.id = (e.value->>'member_id')::uuid)) then
    raise exception '0054: an import receipt still names a member who does not exist';
  end if;

  -- 2. Every surviving receipt is intact -- this file deletes whole rows and
  --    edits none, so a run with a null or emptied `rows` would mean something
  --    else happened.
  if exists (select 1 from public.member_import_runs where rows is null) then
    raise exception '0054: a surviving run lost its receipt';
  end if;

  -- 3. The rest of the member graph is untouched. This file names no member
  --    and no child table, so any movement here is a reach far past its scope.
  if exists (select 1 from public.members where deleted_at is not null) then
    raise exception '0054: a soft-deleted member is present -- 0052 did not hold';
  end if;
  if exists (select 1 from public.attendance_records a
              left join public.members m on m.id = a.member_id
             where m.id is null) then
    raise exception '0054: an attendance record is left without a member';
  end if;
  if exists (select 1 from public.member_enrollments e
              left join public.members m on m.id = e.member_id
             where m.id is null) then
    raise exception '0054: an enrolment is left without a member';
  end if;
  if exists (select 1 from public.email_messages x
              left join public.members m on m.id = x.member_id
             where m.id is null) then
    raise exception '0054: a sent message is left without a member';
  end if;
end $$;
