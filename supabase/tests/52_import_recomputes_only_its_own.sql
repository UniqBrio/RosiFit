\echo 'import: recomputes the members it touched, and only those (T-014, T-015)'

-- WHAT THIS PINS
--   commit_csv_import finishes with `perform public.recompute_member_stats();`
--   -- no argument, so every live member in the academy, each one's whole
--   attendance history walked by current_streak_for(), inside the import's
--   single transaction against statement_timeout. 0035 fixed exactly this for
--   set_attendance and wrote down why ("recompute_member_stats(null) walks
--   every member in the academy, which is right for an import of a whole
--   session and wrong for one tap on one card"); five migrations since pass
--   a scoped array. The import path was never swept.
--
--   The trouble with "it recomputes everybody" is that every assertion you
--   can write about the members it SHOULD touch passes either way. So this
--   file watches a member it should NOT touch: the seed's sentinel, enrolled
--   in a different offering, named in no file. Her stats row is the whole
--   test.
--
--   It also pins the two things the fix must not break: who the sweep marks
--   absent, and the status of the member the file itself creates.

\set members 500
\i db/harness/seed_scale.sql

-- Every stats row to a date no statement writes by accident. The seed already
-- pins the sentinel; this puts everybody on the same footing, so "moved" and
-- "did not move" are the only two answers and neither needs a clock.
update public.member_stats set updated_at = '2001-01-01 00:00:00+00';

select t.eq((select count(*)::int from public.member_stats where updated_at = '2001-01-01 00:00:00+00'),
            (select count(*)::int from public.member_stats),
  'every stats row starts pinned, so anything that moves was moved by the import');

-- ------------------------------------------------------------- the file
--
-- 2026-09-02 is a Wednesday, which offering A runs (Mon/Wed/Fri), and it is
-- past the seeded year -- so the import creates the session itself and no
-- earlier file has touched the day. Thirteen rows: twelve members the file
-- names by their Meet display name, and one name the register has never
-- seen, which the operator files as a new member.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'scale.csv', 'beef0052', '0e5d0000-0000-0000-0000-0000000000f1'::uuid, '2026-09-02', 13,
  'previewed',
  jsonb_build_object('rows',
    (select jsonb_agg(jsonb_build_object(
              'row', r.n, 'kind', 'noEmail', 'raw_name', a.alias_display, 'minutes', 45,
              'candidates', jsonb_build_array(jsonb_build_object('member_id', a.member_id)))
            order by r.n)
       from generate_series(1, 12) r(n)
       join lateral (
         select al.member_id, al.alias_display
           from public.member_aliases al
           join public.members m on m.id = al.member_id
          where m.id <> '0e5d0000-0000-0000-0000-0000000000aa'
          order by m.id
          offset r.n - 1 limit 1
       ) a on true)
    || jsonb_build_array(jsonb_build_object(
         'row', 13, 'kind', 'unmatched', 'raw_name', 'Brand New Person', 'minutes', 30,
         'candidates', '[]'::jsonb))),
  '0e5d0000-0000-0000-0000-00000000000a'::uuid
returning id as import_id \gset

commit;

-- The twelve the file names, remembered before the commit so the assertions
-- below can ask about them by name rather than by re-deriving the same query.
create temp table named_members as
select (c->>'member_id')::uuid as member_id
  from public.csv_imports i,
       jsonb_array_elements(i.summary->'rows') r,
       jsonb_array_elements(r->'candidates') c
 where i.id = :'import_id'::uuid;

select t.eq((select count(*)::int from named_members), 12,
  'the file names twelve members the register already holds');

-- ----------------------------------------------------------- the commit
select public.commit_csv_import(:'import_id'::uuid,
  '0e5d0000-0000-0000-0000-00000000000a'::uuid,
  jsonb_build_array(jsonb_build_object('row', 13, 'action', 'add_as_new')))
  as result \gset

select t.eq((select status from public.csv_imports where id = :'import_id'::uuid), 'completed',
  'the import completed');

-- ============================================================ T-014
--
-- THE SENTINEL. She is in offering B. No row of this file names her, the
-- sweep for offering A never expects her, and nothing about her attendance
-- changed. An import that rewrites her stats row rewrote every stats row in
-- the academy -- which is what `recompute_member_stats()` with no argument
-- does, and what this assertion exists to refuse.
select t.eq((select updated_at from public.member_stats
              where member_id = '0e5d0000-0000-0000-0000-0000000000aa'),
            '2001-01-01 00:00:00+00'::timestamptz,
  'a member in ANOTHER offering, named in no file, is not recomputed by this import');

-- The other half of the same claim: the members it DID touch must all move.
-- A scope that is too narrow is a different defect with the same shape, and
-- a fixture that only watched the sentinel would ship it.
select t.eq((select count(*)::int from public.member_stats s
              join named_members n on n.member_id = s.member_id
             where s.updated_at = '2001-01-01 00:00:00+00'), 0,
  'every member the file named was recomputed');

select t.ok((select s.updated_at > '2001-01-01 00:00:00+00'
               from public.member_stats s
               join public.members m on m.id = s.member_id
              where m.full_name = 'Brand New Person'),
  'and so was the member the file created');

-- The sweep marks everybody else absent, so their stats moved too -- which is
-- why the scope is v_present_ids || v_expected_ids and not v_present_ids.
select t.eq((select count(*)::int
               from public.member_enrollments e
               join public.member_stats s on s.member_id = e.member_id
              where e.offering_id = '0e5d0000-0000-0000-0000-0000000000f1'
                and s.updated_at = '2001-01-01 00:00:00+00'), 0,
  'everyone the sweep marked absent was recomputed as well -- expected, not just present');

-- ============================================================ T-015
--
-- The hoist moves expected_members_for_session(v_session_id) out of the row
-- loop, where it is called once per file row. These pin what that must not
-- change. The first is the trap: add_as_new creates a member AND enrols her
-- effective the session date, INSIDE the loop -- so a naive hoist computes
-- the expected set before she exists and files her as `extra`, which is a
-- different word on the register and a different follow-up.
select t.eq((select a.status from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Brand New Person'), 'present',
  'the member this file created is PRESENT, not extra -- she was enrolled by the same commit');

select t.ok((select a.expected from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Brand New Person'),
  'and she counts -- expected is true for her, as it is for everyone else on the day');

-- The register for the day, in full. 500 seeded members + the one this file
-- created, every one of them expected, twelve of them present.
select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-09-02'), 501,
  'every member of the offering has a row for the day -- the file named twelve, the sweep did the rest');
select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-09-02' and a.status = 'present'), 13,
  'thirteen present: the twelve named and the one created');
select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-09-02' and a.status = 'absent'), 488,
  'and 488 absent, every one of them expected');
select t.eq((select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id
              where s.session_date = '2026-09-02' and not a.expected), 0,
  'nobody on this day is unexpected -- a hoist that answered `extra` would show here');

-- The counts the result screen reports. Pinned so the fix cannot buy its
-- scope by changing what the operator is told happened.
select t.eq(((:'result')::jsonb->>'new_members')::int, 1,
  'the result reports one new member');
select t.eq(((:'result')::jsonb->>'present_or_extra')::int, 13,
  'the result reports thirteen present or extra');
select t.eq(((:'result')::jsonb->'changes'->>'absent_added')::int, 488,
  'the result reports 488 marked absent by the sweep');

-- ============================================================ T-014, the second site
--
-- update_member ends with the same unscoped call (0027:304). One member's
-- name changing is not a reason to walk the academy.
update public.member_stats set updated_at = '2001-01-01 00:00:00+00';

-- Resolved BEFORE the role switch: named_members is a temp table owned by the
-- harness role, and `authenticated` cannot read it. 48_duplicate_is_per_course
-- is red for exactly this reason today ("permission denied for view t_pre").
select (select member_id from named_members order by member_id limit 1)::text as edit_id \gset

begin;
  set local role authenticated;
  set local request.jwt.claim.sub = '0e5d0000-0000-0000-0000-000000000001';
  select public.update_member(
    :'edit_id'::uuid,
    'Renamed For This Test',
    '0e5d0000-0000-0000-0000-0000000000f1'::uuid,
    '{}'::text[], '{}'::text[], null);
commit;

select t.eq((select updated_at from public.member_stats
              where member_id = '0e5d0000-0000-0000-0000-0000000000aa'),
            '2001-01-01 00:00:00+00'::timestamptz,
  'editing one member does not recompute a member in another offering');
select t.eq((select count(*)::int from public.member_stats
              where updated_at > '2001-01-01 00:00:00+00'), 1,
  'editing one member recomputes exactly one stats row');

-- (a) THE SWEEP IS STILL LIVE, and this is the assertion that says so.
--   The absentee sweep runs AFTER the row loop and reads
--   expected_members_for_session(v_session_id) itself -- not a hoisted array.
--   So a member created by add_as_new, enrolled by the same commit effective
--   the session date, is expected by the time the sweep runs and already has
--   a present row, which `on conflict do nothing` leaves alone. She is never
--   swept absent. A fix that hoisted the sweep's own call as well would turn
--   this green-to-red, which is the point of asserting it separately from her
--   status above.
select t.eq((select count(*)::int from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Brand New Person'), 1,
  'the member add_as_new created has exactly ONE row for the day -- the sweep did not add a second');
select t.eq((select count(*)::int from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Brand New Person' and a.status = 'absent'), 0,
  'and the sweep never marked her absent -- it reads the expected set live, after the loop that created her');

-- (b) and she is in the recompute's scope: v_present_ids || v_expected_ids
--   carries her twice over -- present because the file named her, expected
--   because the enrolment landed before the sweep read the set.
select t.ok((select s.updated_at > '2001-01-01 00:00:00+00'
               from public.member_stats s
               join public.members m on m.id = s.member_id
              where m.full_name = 'Brand New Person'),
  'and her stats were recomputed -- she is in v_present_ids || v_expected_ids, not outside both');
