\echo 'a write recomputes the figures of the members it touched, and only those (0085; T-014, T-015)'

-- WHAT THIS PINS, beyond 52_import_recomputes_only_its_own.sql
--   Spec 52 watches the sentinel an import must NOT touch and the members it
--   must. This file pins the three things 0085 adds to that:
--
--   1. The scope is the SESSION'S ROWS, not only the file's names and the
--      sweep. A member who is not due today but holds an earlier file's row
--      for the day has that row soft-deleted by the override (0037), and
--      their figures move with it -- so they are recomputed, and the figure
--      they end with is what their live rows say.
--   2. The expected set is read ONCE per commit, not once per row, and the
--      loop still decides every row exactly as the per-row call did: the
--      member add_as_new creates is present, and a member whose enrolment
--      the backdating trigger (0046) moves is decided on the second row
--      naming them as the live call would have.
--   3. update_member recomputes one row, by calling the scoped function once.
--
--   Calls are COUNTED, not inferred: track_functions = 'all' and
--   pg_stat_xact_user_functions, which reports calls made in the current
--   transaction. expected_members_for_session is SECURITY DEFINER and
--   returns a table, so it is never inlined and every call is counted.

\set members 500
\i db/harness/seed_scale.sql

-- 2026-09-02 is a Wednesday, which offering A (Mon/Wed/Fri) runs, past the
-- seeded year. The session is created here, scheduled, so that an EARLIER
-- file's row can exist on it before the import under test runs.
select public.generate_sessions('0e5d0000-0000-0000-0000-0000000000f1'::uuid,
                                '2026-09-02', '2026-09-02') as created \gset
select t.eq(:created, 1, 'the day under test has one scheduled session on offering A');
select s.id::text as session_id from public.sessions s
 where s.offering_id = '0e5d0000-0000-0000-0000-0000000000f1' and s.session_date = '2026-09-02' \gset

-- --------------------------------------------- an earlier file's stale row
-- The sentinel is in offering B and is not due on A's Wednesday. An earlier
-- file for this day (same meeting: no code, no start -- `is not distinct
-- from` matches) marked them present and expected, as a file can when the
-- register was different. That row is exactly what the override removes.
insert into public.csv_imports
  (id, file_name, file_sha256, offering_id, session_id, session_date, row_count, status, summary, uploaded_by)
values ('0e5d0062-0000-0000-0000-000000000001', 'earlier.csv', 'beef0062a',
        '0e5d0000-0000-0000-0000-0000000000f1', :'session_id'::uuid, '2026-09-02', 1, 'completed',
        '{"rows": []}'::jsonb, '0e5d0000-0000-0000-0000-00000000000a');
insert into public.attendance_records
  (session_id, member_id, status, expected, import_id, created_by)
values (:'session_id'::uuid, '0e5d0000-0000-0000-0000-0000000000aa', 'present', true,
        '0e5d0062-0000-0000-0000-000000000001', '0e5d0000-0000-0000-0000-00000000000a');

-- A member of offering A whose enrolment in A starts AFTER the day: not due
-- on 2026-09-02, so a row naming them is `extra` -- and 0046 then moves the
-- enrolment back to the day. Made from the last seeded member, by ending the
-- standing enrolment before the day and opening one after it.
select m.id::text as late_id from public.members m
 where m.id <> '0e5d0000-0000-0000-0000-0000000000aa' order by m.id desc limit 1 \gset
update public.member_enrollments set effective_to = '2026-08-31', status = 'ended'
 where member_id = :'late_id'::uuid;
insert into public.member_enrollments (member_id, offering_id, effective_from, created_by)
values (:'late_id'::uuid, '0e5d0000-0000-0000-0000-0000000000f1', '2026-09-10',
        '0e5d0000-0000-0000-0000-00000000000a');
select t.ok(not exists (select 1 from public.expected_members_for_session(:'session_id'::uuid)
                         where member_id = :'late_id'::uuid),
  'the late member is not due on the day before the import runs');

-- Every stats row to a date no statement writes by accident; the sentinel's
-- figure as it stands, to compare with after.
select public.recompute_member_stats() as rebuilt \gset
update public.member_stats set updated_at = '2001-01-01 00:00:00+00';
select s.sessions_attended as sentinel_attended_before from public.member_stats s
 where s.member_id = '0e5d0000-0000-0000-0000-0000000000aa' \gset

-- ------------------------------------------------------------- the file
-- Twelve members the register holds (the late member is NOT among the first
-- twelve by id, and is named twice at the end), one name never seen.
begin;
insert into public.csv_imports
  (file_name, file_sha256, offering_id, session_date, row_count, status, summary, uploaded_by)
select 'scale.csv', 'beef0062b', '0e5d0000-0000-0000-0000-0000000000f1'::uuid, '2026-09-02', 15,
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
    || jsonb_build_array(
         jsonb_build_object('row', 13, 'kind', 'unmatched', 'raw_name', 'Brand New Person', 'minutes', 30,
                            'candidates', '[]'::jsonb),
         jsonb_build_object('row', 14, 'kind', 'noEmail', 'raw_name', 'Late Member', 'minutes', 20,
                            'candidates', jsonb_build_array(jsonb_build_object('member_id', :'late_id'))),
         jsonb_build_object('row', 15, 'kind', 'noEmail', 'raw_name', 'Late Member', 'minutes', 25,
                            'candidates', jsonb_build_array(jsonb_build_object('member_id', :'late_id'))))),
  '0e5d0000-0000-0000-0000-00000000000a'::uuid
returning id as import_id \gset
commit;

-- ----------------------------------------------------------- the commit
-- Inside one transaction, with function calls counted for that transaction.
set track_functions = 'all';
-- RE-POINTED 06-Oct-2026 (measurement, not expectation): pg_stat_xact_user_functions
-- is a per-backend buffer that Postgres 15+ flushes to the collector at most
-- once a second, so counts from the PREVIOUS transaction leak into the next
-- one when it starts inside the same second. Once 0089 made the recompute
-- fast enough for that to happen, this spec read 2 for a single call. Every
-- count below is therefore a DELTA against a baseline read at the top of its
-- own transaction. The expectations themselves (one call each) are unchanged.
begin;
select coalesce((select f.calls from pg_stat_xact_user_functions f
                  where f.funcname = 'expected_members_for_session'), 0)::int as expected_base,
       coalesce((select f.calls from pg_stat_xact_user_functions f
                  where f.funcname = 'recompute_member_stats'), 0)::int as recompute_base \gset
select public.commit_csv_import(:'import_id'::uuid,
  '0e5d0000-0000-0000-0000-00000000000a'::uuid,
  jsonb_build_array(jsonb_build_object('row', 13, 'action', 'add_as_new')))
  as result \gset
select coalesce((select f.calls from pg_stat_xact_user_functions f
                  where f.funcname = 'expected_members_for_session'), 0)::int - :expected_base as expected_calls,
       coalesce((select f.calls from pg_stat_xact_user_functions f
                  where f.funcname = 'recompute_member_stats'), 0)::int - :recompute_base as recompute_calls \gset
commit;

select t.eq((select status from public.csv_imports where id = :'import_id'::uuid), 'completed',
  'the import completed');

-- ============================================================ (1) the scope
select t.eq(((:'result')::jsonb->'overridden'->>'removed')::int, 1,
  'the override removed the earlier file''s row for the member who is not due');
select t.ok((select s.updated_at > '2001-01-01 00:00:00+00' from public.member_stats s
              where s.member_id = '0e5d0000-0000-0000-0000-0000000000aa'),
  'the member whose stale row this import removed was recomputed -- the scope is the session''s rows, not only the names and the sweep');
select t.eq((select s.sessions_attended from public.member_stats s
              where s.member_id = '0e5d0000-0000-0000-0000-0000000000aa'),
            (select count(*)::int from public.attendance_records a
               join public.sessions s on s.id = a.session_id and s.deleted_at is null
              where a.member_id = '0e5d0000-0000-0000-0000-0000000000aa'
                and a.deleted_at is null and a.expected and a.status = 'present'
                and s.status = 'completed'),
  'and their figure is what their live rows say');
select t.eq((select s.sessions_attended from public.member_stats s
              where s.member_id = '0e5d0000-0000-0000-0000-0000000000aa'),
            :sentinel_attended_before,
  'which is the figure they had before the stale row was written -- the removal took the row and the count with it');

-- Nobody outside the session's rows moved. Every seeded member is in A and
-- was swept, the sentinel held a row; so a row still pinned would be a
-- member with no row for the day, and there is none.
select t.eq((select count(*)::int from public.member_stats s
              where s.updated_at = '2001-01-01 00:00:00+00'
                and exists (select 1 from public.attendance_records a
                             where a.session_id = :'session_id'::uuid and a.member_id = s.member_id)), 0,
  'every member holding a row for the session -- live or removed -- was recomputed');
select t.eq((select count(*)::int from public.member_stats s
              where s.updated_at > '2001-01-01 00:00:00+00'
                and not exists (select 1 from public.attendance_records a
                                 where a.session_id = :'session_id'::uuid and a.member_id = s.member_id)), 0,
  'and nobody without a row for the session was');

-- ====================================================== (2) the expected set
-- Thirteen named rows and two more naming the late member: fifteen per-row
-- calls plus the sweep and the override before 0085. After: one before the
-- loop, one after add_as_new, one after the late member's first (extra) row
-- moved their enrolment, the sweep, the override -- five.
select t.eq(:expected_calls, 5,
  'expected_members_for_session was evaluated five times for a fifteen-row file, not seventeen');
select t.eq(:recompute_calls, 1,
  'and the figures were recomputed by one scoped call');

-- The decisions the per-row call used to make, unchanged.
select t.eq((select a.status from public.attendance_records a
               join public.members m on m.id = a.member_id
              where m.full_name = 'Brand New Person' and a.deleted_at is null), 'present',
  'the member this file created is PRESENT -- the set was re-read after their enrolment');
select t.eq((select e.effective_from from public.member_enrollments e
              where e.member_id = :'late_id'::uuid and e.offering_id = '0e5d0000-0000-0000-0000-0000000000f1'
                and e.status = 'active'), '2026-09-02'::date,
  'the late member''s enrolment was moved back to the day by their first row (0046)');
select t.eq((select a.status from public.attendance_records a
              where a.session_id = :'session_id'::uuid and a.member_id = :'late_id'::uuid
                and a.deleted_at is null), 'present',
  'and their second row was decided against the moved enrolment: present, as the per-row call answered');
select t.ok((select not a.expected from public.attendance_records a
              where a.session_id = :'session_id'::uuid and a.member_id = :'late_id'::uuid
                and a.deleted_at is null),
  'while `expected` still carries the first row''s answer -- the upsert never rewrote it, before or after');
select t.eq(((:'result')::jsonb->>'present_or_extra')::int, 15,
  'the result still counts every named row');
select t.eq(((:'result')::jsonb->>'new_members')::int, 1,
  'and the one member it created');

-- ========================================================= (3) update_member
update public.member_stats set updated_at = '2001-01-01 00:00:00+00';
select m.id::text as edit_id from public.members m
 where m.id <> '0e5d0000-0000-0000-0000-0000000000aa' order by m.id limit 1 \gset

begin;
  select coalesce((select f.calls from pg_stat_xact_user_functions f
                    where f.funcname = 'recompute_member_stats'), 0)::int as edit_recompute_base,
         coalesce((select f.calls from pg_stat_xact_user_functions f
                    where f.funcname = 'current_streak_for'), 0)::int as edit_streak_base \gset
  set local role authenticated;
  set local request.jwt.claim.sub = '0e5d0000-0000-0000-0000-000000000001';
  select public.update_member(
    :'edit_id'::uuid,
    'Renamed By Spec Sixty-Two',
    '0e5d0000-0000-0000-0000-0000000000f1'::uuid,
    '{}'::text[], '{}'::text[], null);
  reset role;
  select coalesce((select f.calls from pg_stat_xact_user_functions f
                    where f.funcname = 'recompute_member_stats'), 0)::int - :edit_recompute_base as edit_recompute_calls,
         coalesce((select f.calls from pg_stat_xact_user_functions f
                    where f.funcname = 'current_streak_for'), 0)::int - :edit_streak_base as edit_streak_calls \gset
commit;

select t.eq(:edit_recompute_calls, 1, 'editing one member calls the recompute once');
-- RE-POINTED 06-Oct-2026 with 0089: the one-pass body (supabase/tests/66)
-- no longer calls current_streak_for at all -- it walks the SCOPED rows in
-- one window -- so "one call" became "at most one". The claim it carries,
-- that an edit walks one member's history and not the academy's, is now
-- made by the row count two lines down and by spec 66's scoped case.
select t.ok(:edit_streak_calls <= 1, 'and walks at most one member''s history, never the academy''s');
select t.eq((select count(*)::int from public.member_stats where updated_at > '2001-01-01 00:00:00+00'), 1,
  'editing one member rewrites exactly one stats row');
select t.ok((select s.updated_at > '2001-01-01 00:00:00+00' from public.member_stats s
              where s.member_id = :'edit_id'::uuid),
  'and it is that member''s');
