-- 0052 · the members soft-deleted before 0051 leave the database too
--
-- A DATA MIGRATION, and the second half of requests/2026-09-08-hard-delete-member.md.
-- 0051 changed what deleting a student does from now on. This applies the same
-- rule, once, to the students deleted under the old one who are still in the
-- tables. The requester chose it explicitly, having been shown the seven rows
-- below and what each one costs.
--
-- WHAT IT REMOVES, measured on production on 08-Sep-2026 before this was
-- written (the harness has no live rows, so this is the check it cannot make):
--
--   nitha    4 attendance records · 1 enrolment · 0 sent emails
--   Pooja    0 · 1 · 0
--   Rahul    0 · 1 · 0        <-- two rows, same name
--   Rahul    0 · 1 · 0
--   Raja     0 · 1 · 0        <-- two rows, same name
--   Raja     0 · 1 · 0
--   Sunny    0 · 1 · 0
--
--   Seven flagged members, 4 attendance records across 4 sessions, 7
--   enrolments, no sent mail. The 23 members whose deleted_at is null are NOT
--   touched: this file selects on deleted_at and never on a name -- which
--   matters more here than it did in 0048, because two of these names are
--   duplicated and one of the duplicates could easily be a live member.
--
--   The four sessions nitha attended survive. Their figures for those four
--   days change by one person, which is the whole of what this file costs
--   anybody still on the register.
--
-- WHY THROUGH purge_member AND NOT HAND-WRITTEN DELETES. The removal order is
-- dictated by foreign keys, and the one that bites -- email_messages pointing
-- at member_emails, which cascades from members -- is invisible unless you
-- have read the constraint graph. 0051 got that order right once, with a spec.
-- A second copy here would be a second place to get it wrong, and this one
-- runs exactly once, against production, with no harness rows to catch it. The
-- migration runner is superuser / service_role, which is precisely who
-- purge_member is granted to.
--
-- EVERY MEMBER IS HER OWN AUDIT ENTRY. purge_member writes one each, with
-- `was_soft_deleted_at` carrying the original deletion time, so the log records
-- both that she was deleted (then) and that her rows were removed (now), and
-- tells the two apart.
--
-- IDEMPOTENT: on a database with no flagged member -- the harness, or a second
-- run -- this selects nothing and does nothing.
--
-- NOT REVERSIBLE. There is no down migration because there is nothing to
-- restore from. That is stated to the requester at the gate, with the counts
-- above, before this file is applied.

do $$
declare
  v_member record;
  v_result jsonb;
  v_members int := 0;
  v_attendance int := 0;
  v_enrolments int := 0;
begin
  for v_member in
    select m.id, m.full_name, m.deleted_at
      from public.members m
     where m.deleted_at is not null
     order by m.deleted_at
  loop
    v_result := public.purge_member(v_member.id,
      '0052_purge_soft_deleted_members: a member soft-deleted under 0044, removed under the '
      || 'hard-delete rule the repo owner chose on 08-Sep-2026 '
      || '(requests/2026-09-08-hard-delete-member.md), on their explicit go-ahead');
    v_members := v_members + 1;
    v_attendance := v_attendance + (v_result->>'attendance_removed')::int;
    v_enrolments := v_enrolments + (v_result->>'enrolments_removed')::int;
    raise notice '0052: purged % (deleted %) -- % attendance records over % sessions, % enrolments, % messages',
      v_member.full_name, v_member.deleted_at,
      v_result->>'attendance_removed', v_result->>'sessions_touched',
      v_result->>'enrolments_removed', v_result->>'messages_removed';
  end loop;

  raise notice '0052: % soft-deleted members purged, % attendance records and % enrolments removed',
    v_members, v_attendance, v_enrolments;
end $$;

-- What "nothing left behind" means, asserted at the end of the same
-- transaction rather than trusted. A failure here rolls the whole file back.
do $$
begin
  if exists (select 1 from public.members where deleted_at is not null) then
    raise exception '0052: a soft-deleted member survived the purge';
  end if;
  if exists (select 1 from public.attendance_records a
              left join public.members m on m.id = a.member_id
             where m.id is null) then
    raise exception '0052: an attendance record is left without a member';
  end if;
  if exists (select 1 from public.member_enrollments e
              left join public.members m on m.id = e.member_id
             where m.id is null) then
    raise exception '0052: an enrolment is left without a member';
  end if;
  if exists (select 1 from public.email_messages x
              left join public.members m on m.id = x.member_id
             where m.id is null) then
    raise exception '0052: a sent message is left without a member';
  end if;
end $$;
