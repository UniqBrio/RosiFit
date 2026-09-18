\echo 'member_period_metrics_page: two pages, nobody missing, nobody twice, same totals (T-042)'

-- WHAT THIS PINS
--   member_period_metrics returns one row per member with attendance in the
--   period, and PostgREST caps a response at db-max-rows (1,000 by default).
--   repository.ts reads it unpaged at three call sites -- :229 fetchMembers,
--   :1953 fetchBucketMetrics, :1977 fetchWeekRows -- so past row 1,000 the
--   rows simply stop arriving. fetchMembers then falls back to
--   `metric?.expected ?? 0`, which reads as "attended nothing" rather than
--   "not loaded": zero on the card, zero missed, never flagged for follow-up.
--   The academy passed 1,000 live members on 12-Sep-2026 (A:F-02, B:F-02).
--
--   0075 adds member_period_metrics_page, keyset by member_id. This file is
--   the proof that paging returns the SAME answer as one unpaged call -- not
--   merely that it returns something. The three things a keyset pager gets
--   wrong are a member appearing twice at the seam, a member falling through
--   it, and totals that no longer add up; all three are asserted below.
--
--   The existing function is NOT touched by 0075, so the comparison here is
--   against a live, unchanged baseline rather than against itself.

-- 1,001 members, one more than the cap, each with a year of attendance.
\set members 1001
\i db/harness/seed_scale.sql

-- The period: the whole seeded year. Every seeded member has attendance in
-- it; the sentinel is enrolled in offering B, which has no completed
-- sessions, so she has no attendance rows and appears in NEITHER function.
-- That is correct and is asserted, because "1,001 not 1,002" is the kind of
-- off-by-one that a pager quietly introduces.
select t.eq((select count(*)::int from public.member_period_metrics('2025-09-01','2026-08-31')), 1001,
  'the unpaged function returns one row per member with attendance -- 1,001, one past the PostgREST cap');

-- ------------------------------------------------------------- page one
create temp table page1 as
select * from public.member_period_metrics_page('2025-09-01','2026-08-31', null, 1000);

select t.eq((select count(*)::int from page1), 1000,
  'page one stops at the limit it was given, rather than at whatever the transport allows');

select t.ok((select bool_and(ordered) from (
       select member_id > lag(member_id) over (order by member_id) as ordered from page1) x
      where ordered is not null),
  'and it comes back in member_id order, which is what makes the next page''s cursor meaningful');

-- ------------------------------------------------------------- page two
create temp table page2 as
select * from public.member_period_metrics_page(
  '2025-09-01','2026-08-31',
  -- Postgres has no max(uuid) aggregate; the cursor is the last row
  -- of the page in the order the page came back.
  (select member_id from page1 order by member_id desc limit 1),
  1000);

select t.eq((select count(*)::int from page2), 1,
  'page two carries the remainder -- 1,001 rows over two pages of at most 1,000');

select t.eq((select count(*)::int from public.member_period_metrics_page(
               '2025-09-01','2026-08-31', (select member_id from page2 order by member_id desc limit 1), 1000)), 0,
  'and a third page is empty, so a caller knows when to stop');

-- --------------------------------------------------- nobody twice, nobody lost
select t.eq((select count(*)::int from (
               select member_id from page1 union all select member_id from page2) u), 1001,
  'the two pages hold 1,001 rows between them');
select t.eq((select count(distinct member_id)::int from (
               select member_id from page1 union all select member_id from page2) u), 1001,
  'and 1,001 DISTINCT members -- nobody appears at both sides of the seam');
select t.eq((select count(*)::int from public.member_period_metrics('2025-09-01','2026-08-31') m
              where not exists (select 1 from page1 p where p.member_id = m.member_id)
                and not exists (select 1 from page2 p where p.member_id = m.member_id)), 0,
  'and nobody the unpaged function returns is missing from the pages -- the seam loses no one');

-- ------------------------------------------------------------ same answer
select t.eq((select sum(expected)::int from (select * from page1 union all select * from page2) u),
            (select sum(expected)::int from public.member_period_metrics('2025-09-01','2026-08-31')),
  'the paged expected totals equal the unpaged ones');
select t.eq((select sum(attended)::int from (select * from page1 union all select * from page2) u),
            (select sum(attended)::int from public.member_period_metrics('2025-09-01','2026-08-31')),
  'and so do attended');
select t.eq((select sum(missed)::int from (select * from page1 union all select * from page2) u),
            (select sum(missed)::int from public.member_period_metrics('2025-09-01','2026-08-31')),
  'and missed -- the number the follow-up rule is derived from');
select t.eq((select sum(extra)::int from (select * from page1 union all select * from page2) u),
            (select sum(extra)::int from public.member_period_metrics('2025-09-01','2026-08-31')),
  'and extra');

-- Row for row, not just in aggregate: a pager that swapped two members'
-- numbers would pass every total above.
select t.eq((select count(*)::int from public.member_period_metrics('2025-09-01','2026-08-31') m
               join (select * from page1 union all select * from page2) u on u.member_id = m.member_id
              where u.expected is distinct from m.expected
                 or u.attended is distinct from m.attended
                 or u.missed   is distinct from m.missed
                 or u.extra    is distinct from m.extra
                 or u.attendance_pct is distinct from m.attendance_pct), 0,
  'every member''s six numbers are identical in both functions, row for row');

-- --------------------------------------------------- the original is untouched
select t.eq((select md5(p.prosrc) from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'member_period_metrics'),
            '02d953c35112fb1d9a847775c85d22f6',
  'member_period_metrics itself is byte-identical to production -- 0075 adds, it does not edit');

-- The default limit is the cap the transport imposes, so a caller that passes
-- no limit gets a page that can actually be delivered.
select t.eq((select count(*)::int from public.member_period_metrics_page('2025-09-01','2026-08-31')), 1000,
  'called with no cursor and no limit, it returns at most 1,000 -- the PostgREST default cap');
