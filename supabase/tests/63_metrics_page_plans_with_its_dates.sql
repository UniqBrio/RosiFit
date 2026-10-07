\echo 'member_period_metrics_page: planned with its dates, so a week reads a week (0086; RC-9)'

-- WHAT THIS PINS
--   0075's function was SQL-language and SECURITY DEFINER: not inlinable, and
--   planned with its dates as unknown parameters. The planner then walked the
--   whole attendance table in member order (attendance_member) and discarded
--   every row outside the period at the join -- 158,396 buffers for one week
--   at 5,000 members in this harness, 13,999 in production, against 12,021
--   and 527 for the same SELECT with the dates written in. 0086 restates the
--   body in plpgsql behind EXECUTE ... USING, which plans every call with the
--   dates in hand.
--
--   A plan is not a result, so this file measures the plan: EXPLAIN (ANALYZE,
--   BUFFERS) of the function call against the same SELECT with constants, in
--   the same session, on the same pages. The function may read at most half
--   again what the constant plan reads. On 0075's body that ratio is 66 at
--   the 2,000 members seeded here (12,172 buffers against 183; at 1,001 the
--   planner happens to choose the same plan either way, which is why this
--   file seeds 2,000), which is what makes this a fail-first assertion
--   rather than a hope.
--   The answer is then pinned to the unpaged original row for row, as spec 56
--   pins it for the whole year, so the plan cannot have been bought with a
--   different number.

\set members 2000
\i db/harness/seed_scale.sql

-- A one-week period inside the seeded year, warmed once so both measurements
-- below read from the same cache state.
select count(*) as warm from public.member_period_metrics_page('2026-08-24','2026-08-30', null, 100000) \gset
select count(*) as warm2 from public.attendance_records a join public.sessions s on s.id = a.session_id
 where s.session_date between '2026-08-24' and '2026-08-30' \gset

-- ------------------------------------------------------------- the plan
create temp table plans (which text, hit bigint, rd bigint, ms numeric);
do $$
declare v_j jsonb;
begin
  execute $e$explain (analyze, buffers, format json)
    select * from public.member_period_metrics_page('2026-08-24','2026-08-30', null, 100000)$e$ into v_j;
  insert into plans values ('function',
    (v_j->0->'Plan'->>'Shared Hit Blocks')::bigint, (v_j->0->'Plan'->>'Shared Read Blocks')::bigint,
    (v_j->0->>'Execution Time')::numeric);
  execute $e$explain (analyze, buffers, format json)
    select a.member_id,
           count(*) filter (where a.expected)::int,
           count(*) filter (where a.expected and a.status = 'present')::int,
           count(*) filter (where a.status = 'absent')::int,
           case when count(*) filter (where a.expected) = 0 then null
                else round(100.0 * count(*) filter (where a.expected and a.status='present')
                                 / count(*) filter (where a.expected), 1) end,
           count(*) filter (where a.status = 'extra')::int
      from public.attendance_records a
      join public.sessions s  on s.id = a.session_id and s.deleted_at is null
      join public.course_offerings o on o.id = s.offering_id
     where a.deleted_at is null
       and s.session_date between '2026-08-24' and '2026-08-30'
       and s.status = 'completed'
       and (null::uuid is null or a.member_id > null::uuid)
     group by a.member_id
     order by a.member_id
     limit 100000$e$ into v_j;
  insert into plans values ('constants',
    (v_j->0->'Plan'->>'Shared Hit Blocks')::bigint, (v_j->0->'Plan'->>'Shared Read Blocks')::bigint,
    (v_j->0->>'Execution Time')::numeric);
end $$;

select which, hit + rd as buffers, ms from plans order by which;

select t.ok((select hit + rd from plans where which = 'function')
            <= 1.5 * (select hit + rd from plans where which = 'constants'),
  'the function reads at most half again the buffers the same SELECT reads with its dates written in -- it is planned with them');

-- ------------------------------------------------- it is what 0086 says
select t.eq((select l.lanname from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
               join pg_language l on l.oid = p.prolang
              where n.nspname = 'public' and p.proname = 'member_period_metrics_page'), 'plpgsql',
  'the body is plpgsql');
select t.ok((select p.prosrc like '%using p_from, p_to, p_after_member_id, p_limit%' from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'member_period_metrics_page'),
  'and plans through EXECUTE ... USING its four arguments');
select t.ok((select p.prosecdef from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'member_period_metrics_page'),
  'still SECURITY DEFINER -- the per-row policies are not re-entered');
select t.ok(not has_function_privilege('anon', 'public.member_period_metrics_page(date, date, uuid, int)', 'execute'),
  'anon still cannot execute it');
select t.ok(has_function_privilege('authenticated', 'public.member_period_metrics_page(date, date, uuid, int)', 'execute'),
  'and authenticated still can');

-- ------------------------------------------------------- the same answer
create temp table week_fn as
select * from public.member_period_metrics_page('2026-08-24','2026-08-30', null, 100000);
select t.eq((select count(*)::int from week_fn),
            (select count(*)::int from public.member_period_metrics('2026-08-24','2026-08-30')),
  'one row per member with attendance in the week, as the unpaged original returns');
select t.eq((select count(*)::int from public.member_period_metrics('2026-08-24','2026-08-30') m
               join week_fn u on u.member_id = m.member_id
              where u.expected is distinct from m.expected
                 or u.attended is distinct from m.attended
                 or u.missed   is distinct from m.missed
                 or u.extra    is distinct from m.extra
                 or u.attendance_pct is distinct from m.attendance_pct), 0,
  'every member''s six numbers are identical to the unpaged original, row for row');
select t.ok((select bool_and(ordered) from (
       select member_id > lag(member_id) over (order by member_id) as ordered from week_fn) x
      where ordered is not null),
  'and in member_id order, which the keyset cursor depends on');

-- The cursor and the limit, through the new body.
select t.eq((select count(*)::int from public.member_period_metrics_page('2026-08-24','2026-08-30', null, 1000)), 1000,
  'page one stops at its limit');
create temp table p1 as select * from public.member_period_metrics_page('2026-08-24','2026-08-30', null, 1000);
create temp table p2 as select * from public.member_period_metrics_page('2026-08-24','2026-08-30',
  (select member_id from p1 order by member_id desc limit 1), 1000);
select t.eq((select count(*)::int from p2), 1000, 'page two carries the next thousand');
select t.eq((select count(*)::int from public.member_period_metrics_page('2026-08-24','2026-08-30',
  (select member_id from p2 order by member_id desc limit 1), 1000)), 0, 'and page three is empty');
select t.eq((select count(distinct member_id)::int from (select member_id from p1 union all select member_id from p2) u), 2000,
  'two pages, 2,000 distinct members -- nobody twice, nobody lost at the seam');
select t.eq((select count(*)::int from public.member_period_metrics_page('1900-01-01','1900-01-02', null, 5)), 0,
  'a period with no sessions answers no rows');
