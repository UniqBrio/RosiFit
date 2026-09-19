-- 0075 · member_period_metrics, one page at a time
--
-- WHAT WAS WRONG
--   member_period_metrics returns one row per member with attendance in the
--   period. PostgREST caps a response at db-max-rows -- 1,000 by default --
--   and says nothing when it truncates. repository.ts reads the function
--   unpaged at three call sites:
--
--     :229   fetchMembers        every member card's expected / missed
--     :1953  fetchBucketMetrics  the donut
--     :1977  fetchWeekRows       the week strip
--
--   Past row 1,000 the rows stop arriving, and fetchMembers falls back to
--   `metric?.expected ?? 0`. That reads as "attended nothing", not as "not
--   loaded": zero on the card, zero missed, never flagged for follow-up, and
--   the totals under-report. The academy passed 1,000 live members on
--   12-Sep-2026, so this is live now, not a future ceiling (A:F-02, B:F-02,
--   T-016, T-042).
--
--   RV-34's FIXED verdict covers `supabase.from(` table reads. An RPC is
--   outside it -- pagedReads.test.ts never scans `supabase.rpc(`, which is
--   T-030.
--
-- WHAT THIS ADDS, and what it deliberately leaves alone
--   A NEW function, member_period_metrics_page(p_from, p_to,
--   p_after_member_id, p_limit). The existing member_period_metrics is NOT
--   touched: not re-emitted, not edited, not dropped. Callers move across one
--   at a time, and until the last one has, both answers stay available and
--   comparable -- which is what supabase/tests/56 compares.
--
--   Keyset, not OFFSET. `where member_id > p_after_member_id order by
--   member_id limit p_limit` costs the same on page 900 as on page 1, and a
--   row inserted between two reads cannot shift a member from one page to the
--   next and out of the result. OFFSET does both badly.
--
--   The four optional filters the original carries -- p_member_id,
--   p_offering_id, p_branch_id, p_course_id -- are NOT reproduced here. No
--   caller passes them: all three sites named above pass p_from and p_to
--   alone, verified by reading them. The original keeps them for anything
--   that ever needs one, and a paged variant with six arguments that nobody
--   supplies is six ways to call it wrongly.
--
-- WHERE THE BODY CAME FROM
--   pg_get_functiondef on the LIVE member_period_metrics, read from
--   production 18-Sep-2026, not from any migration file -- RC-047's rule. It
--   is one of the 43 functions T-120 found identical in production and in the
--   harness replay (md5 02d953c35112fb1d9a847775c85d22f6, 1,212 bytes), so
--   for this one function the two databases agree and the derivation is sound
--   in both.
--
--   Three differences from that body, and nothing else:
--     + and (p_after_member_id is null or a.member_id > p_after_member_id)
--     + order by a.member_id
--     + limit p_limit
--   The select list, the joins, the filters, the holiday and cancellation
--   exclusions (C-92/C-93) and the group by are the original's, character for
--   character.
--
--   Guard 2 below re-reads that hash AT APPLY TIME. If member_period_metrics
--   has moved since, this migration refuses rather than add a paged twin of a
--   body that no longer exists.
--
-- REHEARSAL
--   supabase/tests/56_member_period_metrics_page.sql seeds 1,001 members --
--   one past the cap -- with a year of attendance, and asserts: two pages,
--   1,001 rows, 1,001 DISTINCT members, nobody the unpaged function returns
--   missing from the pages, the third page empty, every total equal, and
--   every member's six numbers identical row for row. A pager that swaps two
--   members' numbers passes every total and fails that last one.
-- ---------------------------------------------------------------------------

-- -------------------------------------------- guard 1: nothing to clobber
do $guard$
declare v_n int;
begin
  select count(*) into v_n
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'member_period_metrics_page';
  if v_n > 0 then
    raise exception
      '0075: public.member_period_metrics_page already exists (% overload(s)). This migration creates it; it will not choose between two bodies.', v_n;
  end if;
end $guard$;

-- ------------------------------ guard 2: the body this was derived from is live
do $source$
declare v_md5 text; v_len int;
begin
  select md5(p.prosrc), length(p.prosrc) into v_md5, v_len
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'member_period_metrics';

  if v_md5 is null then
    raise exception '0075: public.member_period_metrics does not exist here, so there is nothing to page.';
  end if;
  if v_md5 <> '02d953c35112fb1d9a847775c85d22f6' or v_len <> 1212 then
    raise exception
      '0075: member_period_metrics has changed since this migration was derived from it -- md5 % at % bytes, expected 02d953c35112fb1d9a847775c85d22f6 at 1212. Re-derive the paged body from the live one before applying.', v_md5, v_len;
  end if;
end $source$;

-- ------------------------------------------------------------- the function
create function public.member_period_metrics_page(
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
language sql stable security definer set search_path = public as $function$
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
     and s.session_date between p_from and p_to
     -- holidays and cancellations are NOT countable opportunities (C-92/C-93)
     and s.status = 'completed'
     -- 0075: the cursor. Null starts at the beginning; otherwise strictly
     -- after the last member the caller has already seen.
     and (p_after_member_id is null or a.member_id > p_after_member_id)
   group by a.member_id
   order by a.member_id
   limit p_limit
$function$;

-- The original's grants, unchanged: SECURITY DEFINER, and anon never reaches it.
revoke all on function public.member_period_metrics_page(date, date, uuid, int) from public, anon;
grant execute on function public.member_period_metrics_page(date, date, uuid, int)
  to authenticated, service_role;

comment on function public.member_period_metrics_page(date, date, uuid, int) is
  'member_period_metrics, keyset-paged by member_id. Same six numbers, same period filters, same holiday and cancellation exclusions; adds a cursor (p_after_member_id, exclusive) and a limit that defaults to PostgREST''s 1,000-row cap. Added by 0075 because the unpaged function is read at three call sites that silently lose every member past row 1,000, and a truncated read reaches the member card as "attended nothing" rather than "not loaded" (T-016, T-042). The unpaged function is deliberately left in place while callers move across one at a time.';

-- ------------------------------------ guard 3: it answers, and it stops where told
do $verify$
declare v_n int;
begin
  -- A period no session can fall in: this proves the function is callable and
  -- respects its limit without depending on any data being present.
  select count(*) into v_n
    from public.member_period_metrics_page('1900-01-01','1900-01-02', null, 5);
  if v_n <> 0 then
    raise exception '0075: the paged function returned % rows for a period with no sessions', v_n;
  end if;

  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'member_period_metrics_page'
       and pg_get_function_identity_arguments(p.oid)
           = 'p_from date, p_to date, p_after_member_id uuid, p_limit integer'
  ) then
    raise exception '0075: the created function does not carry the argument names the client will call it by';
  end if;
end $verify$;
