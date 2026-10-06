\echo 'member_period_metrics_buckets: every bucket in one read, the same numbers, no seam (0087)'

-- WHAT THIS PINS
--   0087 adds a function that answers several buckets at once -- the
--   Overview's seven day-buckets, which were seven paged reads. It must say
--   exactly what member_period_metrics_page says for each bucket, member for
--   member, and page by its text cursor without losing or doubling a row at
--   a seam. Both are asserted, as spec 56 asserts them for the page function.

\set members 1001
\i db/harness/seed_scale.sql

-- The seeded week 2026-08-24..2026-08-30 as seven day-buckets.
create temp table days as
select g::date as d, (row_number() over (order by g))::int as bucket
  from generate_series('2026-08-24'::date, '2026-08-30', '1 day') g;

-- ------------------------------------------------------------- same answer
create temp table per_day as
select d.bucket, p.member_id, p.expected, p.attended, p.missed, p.extra
  from days d, lateral public.member_period_metrics_page(d.d, d.d, null, 100000) p;

create temp table at_once as
select bucket, member_id, expected, attended, missed, extra, cursor
  from public.member_period_metrics_buckets(
    (select array_agg(d order by d) from days), (select array_agg(d order by d) from days), null, 100000);

select t.eq((select count(*)::int from at_once), (select count(*)::int from per_day),
  'one row per member per bucket with attendance -- as many as seven page reads return');
select t.ok((select count(*) from at_once) > 1000,
  'and more than one page of them, so the paging below is exercised');
select t.eq((select count(*)::int from (
               select bucket, member_id, expected, attended, missed, extra from per_day
               except
               select bucket, member_id, expected, attended, missed, extra from at_once) x), 0,
  'nothing the page function answers is missing or different');
select t.eq((select count(*)::int from (
               select bucket, member_id, expected, attended, missed, extra from at_once
               except
               select bucket, member_id, expected, attended, missed, extra from per_day) x), 0,
  'and nothing extra is answered');
select t.eq((select count(*)::int from at_once where bucket not between 1 and 7), 0,
  'every bucket index is one of the seven asked for');

-- --------------------------------------------------------------- the seam
create temp table walked (like at_once);
do $$
declare v_after text := null; v_n int; v_pages int := 0;
begin
  loop
    insert into walked
    select bucket, member_id, expected, attended, missed, extra, cursor
      from public.member_period_metrics_buckets(
        (select array_agg(d order by d) from days), (select array_agg(d order by d) from days), v_after, 1000);
    get diagnostics v_n = row_count;
    v_pages := v_pages + 1;
    exit when v_n = 0;
    if v_n > 1000 then raise exception 'a page of % rows exceeds its limit', v_n; end if;
    select max(cursor) into v_after from walked;
  end loop;
  create temp table walk_stats as select v_pages as pages;
end $$;

select t.eq((select count(*)::int from walked), (select count(*)::int from at_once),
  'walking by cursor in pages of 1,000 reads every row once');
select t.eq((select count(distinct (bucket, member_id))::int from walked), (select count(*)::int from at_once),
  'and no (member, bucket) twice -- nobody doubled at a seam');
select t.eq((select count(*)::int from (select * from walked except select * from at_once) x), 0,
  'nothing crossed the seam changed');
select t.ok((select bool_and(cursor > prev) from (
               select cursor, lag(cursor) over (order by member_id, bucket) as prev from walked) y
              where prev is not null),
  'the text cursor orders exactly as (member_id, bucket) does');
select t.eq((select pages from walk_stats), (select ceil(count(*) / 1000.0)::int + 1 from at_once),
  'the walk took one page per thousand rows plus the empty one that ends it');

-- The limit bounds ROWS, whatever the bucket count: seven buckets, limit
-- 10, ten rows -- not ten members.
select t.eq((select count(*)::int from public.member_period_metrics_buckets(
               (select array_agg(d order by d) from days), (select array_agg(d order by d) from days), null, 10)), 10,
  'p_limit bounds rows, not members');

-- ------------------------------------------------------------ the edges
select t.eq((select count(*)::int from public.member_period_metrics_buckets(
               array['1900-01-01']::date[], array['1900-01-07']::date[], null, 1000)), 0,
  'a bucket with no sessions answers no rows');
select t.rejects($$select * from public.member_period_metrics_buckets(array['2026-08-24','2026-08-25']::date[], array['2026-08-24']::date[], null, 10)$$,
  'arrays of different lengths are refused', 'one entry per bucket');

-- ------------------------------------------------------------- the grants
select t.ok(not has_function_privilege('anon', 'public.member_period_metrics_buckets(date[], date[], text, int)', 'execute'),
  'anon cannot execute it');
select t.ok(has_function_privilege('authenticated', 'public.member_period_metrics_buckets(date[], date[], text, int)', 'execute'),
  'authenticated can');
select t.ok((select p.prosecdef from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'member_period_metrics_buckets'),
  'SECURITY DEFINER, as the page function is');

-- The two it leaves alone.
select t.eq((select md5(p.prosrc) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'member_period_metrics'),
            '02d953c35112fb1d9a847775c85d22f6',
  'member_period_metrics is untouched');
