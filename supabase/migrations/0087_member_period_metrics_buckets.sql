-- 0087 · the Overview's buckets in one read
--
-- WHAT WAS WRONG (RC-9 and RC-2 of docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md)
--   The Overview's "based on period" bars ask member_period_metrics_page once
--   PER BUCKET: seven day-buckets for a week, each a paged read of its own
--   (⌈members/1,000⌉ + 1 requests), all in parallel -- 21 requests at 1,644
--   members and 42 at 5,000, plus the week's own read beside them. Every
--   bucket is the same aggregate over the same table for an adjacent slice
--   of the same period. The function is the most-called request in the
--   application (5,221 a day); seven of every eight calls from the Overview
--   are these.
--
-- WHAT THIS ADDS
--   member_period_metrics_buckets(p_from date[], p_to date[], p_after text,
--   p_limit int): the SAME aggregate as member_period_metrics_page, for
--   every bucket at once. The buckets are two parallel arrays (from and to,
--   inclusive, one bucket per index); a row is one member in one bucket:
--
--     bucket     the bucket's 1-based index in the arrays
--     member_id, expected, attended, missed, extra -- as the page function
--     cursor     member_id || ':' || bucket, two digits -- the keyset
--
--   KEYSET, like 0075, so pageAllByKey can drive it unchanged: rows are
--   ordered by (member_id, bucket), the cursor names the last row seen, and
--   the next page starts strictly after it. The cursor is text because the
--   pager hands back exactly what it was given and compares nothing; the
--   function decodes it. uuid text order is uuid order (hex, fixed width),
--   and the bucket is zero-padded, so the text cursor sorts as the row
--   tuple does. p_limit bounds ROWS, never members, so a page never exceeds
--   what PostgREST will deliver whatever the bucket count.
--
--   attendance_pct is not returned: no bucket caller reads it (buckets.ts
--   takes expected and attended), and it is a function of two columns that
--   are.
--
--   plpgsql behind EXECUTE ... USING for 0086's reason: planned with the
--   arrays in hand.
--
-- WHAT IT DOES NOT CHANGE
--   member_period_metrics and member_period_metrics_page stay as they are;
--   the week read, the reports and the member cards keep using them. This
--   function is read ONLY by the bucket caller, and supabase/tests/64 pins
--   that its answer equals the page function's, bucket for bucket, member
--   for member, and that it pages without a seam.
--
-- PRODUCTION SAFETY
--   A new function, no table, index, policy or data change. Guard 1 refuses
--   to clobber an existing function of the name. Anon never reaches it;
--   authenticated and service_role may execute it, as with 0075. A draft
--   until applied (D-8); under D-10 it merges to main only on the day it is
--   applied, with its ledger row.

do $guard$
declare v_n int;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'member_period_metrics_buckets';
  if v_n > 0 then
    raise exception
      '0087: public.member_period_metrics_buckets already exists (% overload(s)). This migration creates it; it will not choose between two bodies.', v_n;
  end if;
end $guard$;

create function public.member_period_metrics_buckets(
  /** bucket starts, one per bucket */
  p_from   date[],
  /** bucket ends (inclusive), one per bucket, same length as p_from */
  p_to     date[],
  /** the `cursor` of the last row of the previous page; null starts at the beginning */
  p_after  text default null,
  /** at most this many ROWS. The default is PostgREST's own cap. */
  p_limit  int  default 1000
) returns table (
  bucket     integer,
  member_id  uuid,
  expected   integer,
  attended   integer,
  missed     integer,
  extra      integer,
  cursor     text
)
language plpgsql stable security definer set search_path = public as $function$
declare
  v_after_member uuid := nullif(split_part(p_after, ':', 1), '')::uuid;
  v_after_bucket int  := nullif(split_part(p_after, ':', 2), '')::int;
begin
  if coalesce(array_length(p_from, 1), 0) <> coalesce(array_length(p_to, 1), 0) then
    raise exception 'member_period_metrics_buckets: p_from and p_to must have one entry per bucket'
      using errcode = '22023';
  end if;
  if coalesce(array_length(p_from, 1), 0) > 99 then
    raise exception 'member_period_metrics_buckets: at most 99 buckets per call'
      using errcode = '22023';
  end if;
  return query execute $q$
  with b as (
    select u.n::int as bucket, u.f, u.t
      from unnest($1, $2) with ordinality as u(f, t, n)
  )
  select b.bucket,
         a.member_id,
         count(*) filter (where a.expected)                            ::int,
         count(*) filter (where a.expected and a.status = 'present')   ::int,
         count(*) filter (where a.status = 'absent')                   ::int,
         count(*) filter (where a.status = 'extra')                    ::int,
         a.member_id::text || ':' || lpad(b.bucket::text, 2, '0')
    from b
    join public.sessions s
      on s.session_date between b.f and b.t
     and s.deleted_at is null
     -- holidays and cancellations are NOT countable opportunities (C-92/C-93)
     and s.status = 'completed'
    join public.attendance_records a on a.session_id = s.id and a.deleted_at is null
    join public.course_offerings o on o.id = s.offering_id
   where ($3::uuid is null or (a.member_id, b.bucket) > ($3::uuid, $4::int))
   group by a.member_id, b.bucket
   order by a.member_id, b.bucket
   limit $5
  $q$ using p_from, p_to, v_after_member, v_after_bucket, p_limit;
end $function$;

revoke all on function public.member_period_metrics_buckets(date[], date[], text, int) from public, anon;
grant execute on function public.member_period_metrics_buckets(date[], date[], text, int)
  to authenticated, service_role;

comment on function public.member_period_metrics_buckets(date[], date[], text, int) is
  'member_period_metrics_page for several buckets in one read: one row per member per bucket (bucket = index into p_from/p_to, inclusive ranges), the same four counts, keyset-paged by a text cursor (member_id:bucket) with p_limit bounding rows. Added by 0087 so the Overview''s seven day-buckets are one paged read rather than seven (RC-9, RC-2). Answers exactly what the page function answers bucket by bucket; supabase/tests/64 pins it.';

-- ------------------------------------------------- it answers, and it stops where told
do $verify$
declare v_n int;
begin
  select count(*) into v_n
    from public.member_period_metrics_buckets(array['1900-01-01','1900-01-03']::date[], array['1900-01-02','1900-01-04']::date[], null, 5);
  if v_n <> 0 then
    raise exception '0087: the bucket function returned % rows for periods with no sessions', v_n;
  end if;
  if has_function_privilege('anon', 'public.member_period_metrics_buckets(date[], date[], text, int)', 'execute') then
    raise exception '0087: anon can execute member_period_metrics_buckets';
  end if;
end $verify$;
