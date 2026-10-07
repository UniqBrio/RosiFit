-- 0086 · member_period_metrics_page plans with its dates
--
-- THE DEFECT THIS CLOSES (RC-9 of docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md)
--   member_period_metrics_page (0075) is the most-called request in the
--   application: 5,221 calls a day, 14% of all traffic, read for every
--   member card, every Overview bucket and every report. It is a SQL-language
--   function, SECURITY DEFINER, so Postgres cannot inline it into the
--   caller's query, and the body is planned with its arguments as PARAMETERS
--   rather than as the dates they are. With the dates unknown the planner
--   cannot see that a week is three sessions out of a year, so it picks the
--   plan that satisfies `order by member_id limit N` fastest in the abstract:
--   walk attendance_member in member order over the WHOLE attendance table
--   and throw away every row outside the period at the join.
--
--   Measured. Production, read-only, 05-Oct-2026, the current week:
--     Function Scan on member_period_metrics_page: 13,999 buffers, 426 ms
--   (the report's pg_stat_statements mean: 11,675 buffers a call, 617 million
--   index tuples fetched for an 18,305-row table). The same SELECT with the
--   dates written as constants: 527 buffers, 23 ms (report §8). Local
--   harness, 5,000 members and 785,000 attendance rows, one week:
--     the function            158,396 buffers,  87 ms
--     the body as a generic plan (prepare + force_generic_plan)
--                             158,380 buffers, 152 ms  -- the same plan
--     the body with constants  12,021 buffers,  77 ms  -- sessions first
--   Cost grows with the academy's whole history, not with the period asked
--   about.
--
-- WHAT THIS CHANGES, and nothing else
--   The same function -- same name, same four arguments with the same names
--   and defaults, same six columns, same ordering, same SECURITY DEFINER,
--   same search_path, same grants (CREATE OR REPLACE keeps the oid, so the
--   grants and the comment 0075 set stay on it) -- restated in plpgsql, whose
--   body is `return query execute <the 0075 SELECT> using p_from, p_to,
--   p_after_member_id, p_limit`. EXECUTE ... USING plans the statement on
--   every call with the parameter values in hand, so the planner reads the
--   period off sessions_date first and joins the attendance of those few
--   sessions, instead of the other way round. Planning costs under a
--   millisecond; the call it replaces cost hundreds.
--
--   The SELECT is 0075's, character for character, with $1..$4 where 0075
--   had the parameter names. The select list, the joins, the filters, the
--   holiday and cancellation exclusions (C-92/C-93), the group by, the order
--   and the limit are unchanged, so every caller gets the rows it got.
--   supabase/tests/56 (the paged twin equals the unpaged original, row for
--   row) still holds and 63 pins the plan.
--
-- WHY NOT DROP SECURITY DEFINER SO IT INLINES
--   Without it, attendance_records' own policies apply -- and 59 of 62
--   policies evaluate is_active_app_user() per row (T-043). An inlined
--   function would trade one bad plan for a per-row policy call on every
--   attendance row of the period. Definer stays; the plan is fixed where the
--   plan is made.
--
-- GUARD
--   The body this replaces is read AT APPLY TIME and must be the one 0075
--   shipped (md5 66f8af1dbf4bdbaa4f1f44256f16dd4d, 1,202 bytes -- identical
--   in production and in the harness replay, read-only 05-Oct-2026). If it
--   has moved, this migration refuses rather than restate a body somebody
--   else changed.
--
-- PRODUCTION SAFETY
--   No table, index, policy or grant changes; no data touched. The replay is
--   the whole of the pre-flight. A draft until applied (D-8); under D-10 it
--   merges to main only on the day it is applied, with its ledger row.

do $source$
declare v_md5 text; v_len int;
begin
  select md5(p.prosrc), length(p.prosrc) into v_md5, v_len
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'member_period_metrics_page';
  if v_md5 is null then
    raise exception '0086: public.member_period_metrics_page does not exist here; 0075 has not been applied.';
  end if;
  if v_md5 <> '66f8af1dbf4bdbaa4f1f44256f16dd4d' or v_len <> 1202 then
    raise exception
      '0086: member_period_metrics_page is not the body 0075 shipped -- md5 % at % bytes, expected 66f8af1dbf4bdbaa4f1f44256f16dd4d at 1202. Re-derive this restatement from the live body before applying.', v_md5, v_len;
  end if;
end $source$;

create or replace function public.member_period_metrics_page(
  p_from             date,
  p_to               date,
  /** the last member_id of the previous page; null starts at the beginning */
  p_after_member_id  uuid default null,
  /** at most this many rows. The default is PostgREST's own cap, so a caller
   *  that passes nothing still gets a page the transport can deliver. */
  p_limit            int  default 1000
) returns table (
  member_id       uuid,
  expected        integer,
  attended        integer,
  missed          integer,
  attendance_pct  numeric,
  extra           integer
)
language plpgsql stable security definer set search_path = public as $function$
begin
  -- 0086: EXECUTE ... USING, so the dates are known when the plan is made.
  -- The SELECT is 0075's with $1..$4 for its parameter names.
  return query execute $q$
  select a.member_id,
         count(*) filter (where a.expected)                            ::int,
         count(*) filter (where a.expected and a.status = 'present')   ::int,
         count(*) filter (where a.status = 'absent')                   ::int,
         case when count(*) filter (where a.expected) = 0 then null
              else round(100.0 * count(*) filter (where a.expected and a.status='present')
                               / count(*) filter (where a.expected), 1) end,
         count(*) filter (where a.status = 'extra')                    ::int
    from public.attendance_records a
    join public.sessions s  on s.id = a.session_id and s.deleted_at is null
    join public.course_offerings o on o.id = s.offering_id
   where a.deleted_at is null
     and s.session_date between $1 and $2
     -- holidays and cancellations are NOT countable opportunities (C-92/C-93)
     and s.status = 'completed'
     -- 0075: the cursor. Null starts at the beginning; otherwise strictly
     -- after the last member the caller has already seen.
     and ($3::uuid is null or a.member_id > $3)
   group by a.member_id
   order by a.member_id
   limit $4
  $q$ using p_from, p_to, p_after_member_id, p_limit;
end $function$;

comment on function public.member_period_metrics_page(date, date, uuid, int) is
  'member_period_metrics, keyset-paged by member_id. Same six numbers, same period filters, same holiday and cancellation exclusions; adds a cursor (p_after_member_id, exclusive) and a limit that defaults to PostgREST''s 1,000-row cap. Added by 0075 because the unpaged function is read at three call sites that silently lose every member past row 1,000 (T-016, T-042). Since 0086 the body is plpgsql running 0075''s SELECT through EXECUTE ... USING, so each call is planned with its dates known and reads the period''s sessions first instead of walking the whole attendance history in member order (RC-9).';

-- ------------------------------------------- it is what it says it is
do $verify$
declare v_n int; v_lang text; v_src text;
begin
  select l.lanname, p.prosrc into v_lang, v_src
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace join pg_language l on l.oid = p.prolang
   where n.nspname = 'public' and p.proname = 'member_period_metrics_page';
  if v_lang <> 'plpgsql' or position('using p_from, p_to, p_after_member_id, p_limit' in v_src) = 0 then
    raise exception '0086: the restated function does not plan through EXECUTE ... USING';
  end if;
  select count(*) into v_n
    from public.member_period_metrics_page('1900-01-01','1900-01-02', null, 5);
  if v_n <> 0 then
    raise exception '0086: the function returned % rows for a period with no sessions', v_n;
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'member_period_metrics_page'
       and pg_get_function_identity_arguments(p.oid)
           = 'p_from date, p_to date, p_after_member_id uuid, p_limit integer'
  ) then
    raise exception '0086: the function no longer carries the argument names the client calls it by';
  end if;
  -- anon still cannot reach it; authenticated still can (0075's grants, kept by CREATE OR REPLACE)
  if has_function_privilege('anon', 'public.member_period_metrics_page(date, date, uuid, int)', 'execute') then
    raise exception '0086: anon can execute member_period_metrics_page';
  end if;
  if not has_function_privilege('authenticated', 'public.member_period_metrics_page(date, date, uuid, int)', 'execute') then
    raise exception '0086: authenticated lost execute on member_period_metrics_page';
  end if;
end $verify$;
