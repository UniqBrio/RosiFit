-- 0089 · recompute_member_stats in one pass
--
-- WHAT WAS SLOW (docs/PERFORMANCE_FIX_REPORT_2026-10-06.md §5.3)
--   recompute_member_stats (0008) is one INSERT ... SELECT over the members
--   in scope, and for each of them it calls current_streak_for(m.id) -- a
--   window scan of that member's whole attendance history, one function
--   call per member, each with its own plan and its own walk of
--   attendance_member. The lateral aggregate beside it reads the same rows
--   again. For a CSV commit the scope is every member the sweep touched,
--   which for an offering is the whole offering: 1.2-1.3 s for 1,500
--   members and 4.7 s for 5,000 in the harness, inside the commit's
--   transaction and against authenticated's statement_timeout of 8 s (T-005).
--
-- WHAT THIS CHANGES
--   The same five figures, computed ONCE for the whole scope by two set
--   queries over the scope's rows -- a window over each member's countable
--   rows for the streak (the exact predicate current_streak_for uses:
--   expected, not deleted, completed session, most recent first, the run
--   before the first present), and one grouped aggregate for the other four
--   -- joined to the members and upserted exactly as before. Same scope rule
--   (null = every live member, an array = those), same ON CONFLICT, same
--   updated_at, same return value (the rows written). current_streak_for
--   itself is untouched; nothing else calls it, and the spec uses it as the
--   reference the new body must equal.
--
--   Measured in the harness, every member in scope: 1,500 members 1.2-1.3 s
--   -> 0.39 s; 5,000 members 4.70 s -> 1.98 s. The remaining cost is the
--   window over the scope's whole history, which is the figure itself.
--
--   The tie-break inside the window (session_date desc, then a.id desc) is
--   added so two rows of one member on one date -- which attendance_unique_live
--   forbids for live rows, and which the streak would count identically either
--   way -- order deterministically. It changes no answer:
--   supabase/tests/66 proves the two bodies equal row for row over the
--   seed, over deleted rows, non-completed sessions, extra rows, members
--   with nothing, and both scope shapes.
--
-- GUARD
--   The body this replaces is read at apply time and must be 0008's
--   (md5 142f926f13f2c64db8ca6aab9c034ea9, 1,502 bytes -- identical in
--   production and in the harness replay, read-only 06-Oct-2026). Otherwise
--   this refuses rather than restate a body somebody else changed.
--
-- PRODUCTION SAFETY
--   One function body; no table, index, policy, grant or data change
--   (CREATE OR REPLACE keeps the oid and its grants). A draft until applied
--   (D-8); under D-10 it merges to main only on the day it is applied.

do $source$
declare v_md5 text; v_len int;
begin
  select md5(p.prosrc), length(p.prosrc) into v_md5, v_len
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'recompute_member_stats';
  if v_md5 is null then
    raise exception '0089: public.recompute_member_stats does not exist here.';
  end if;
  if v_md5 <> '142f926f13f2c64db8ca6aab9c034ea9' or v_len <> 1502 then
    raise exception
      '0089: recompute_member_stats is not the body 0008 shipped -- md5 % at % bytes, expected 142f926f13f2c64db8ca6aab9c034ea9 at 1502. Re-derive this restatement from the live body before applying.', v_md5, v_len;
  end if;
end $source$;

create or replace function public.recompute_member_stats(p_member_ids uuid[] default null)
returns int
language plpgsql security definer set search_path = public as $$
declare v_n int;
begin
  insert into public.member_stats as ms
    (member_id, current_streak, sessions_expected, sessions_attended,
     last_present_date, last_countable_date, updated_at)
  with countable as (
    -- current_streak_for's rows: countable opportunities, most recent first,
    -- with how many presents have been seen at or before each one.
    select a.member_id,
           sum(case when a.status = 'present' then 1 else 0 end)
             over (partition by a.member_id
                   order by s.session_date desc, a.id desc
                   rows between unbounded preceding and current row) as presents_seen
      from public.attendance_records a
      join public.sessions s on s.id = a.session_id and s.deleted_at is null
     where a.deleted_at is null
       and a.expected
       and s.status = 'completed'
       and (p_member_ids is null or a.member_id = any (p_member_ids))
  ),
  streak as (
    select member_id, count(*) filter (where presents_seen = 0)::int as current_streak
      from countable
     group by member_id
  ),
  agg as (
    select a.member_id,
           count(*) filter (where a.expected)                          as expected,
           count(*) filter (where a.expected and a.status='present')   as attended,
           max(s.session_date) filter (where a.status='present')       as last_present,
           max(s.session_date) filter (where a.expected)               as last_countable
      from public.attendance_records a
      join public.sessions s on s.id = a.session_id and s.deleted_at is null
     where a.deleted_at is null and s.status = 'completed'
       and (p_member_ids is null or a.member_id = any (p_member_ids))
     group by a.member_id
  )
  select m.id,
         coalesce(st.current_streak, 0),
         coalesce(ag.expected, 0),
         coalesce(ag.attended, 0),
         ag.last_present,
         ag.last_countable,
         now()
    from public.members m
    left join streak st on st.member_id = m.id
    left join agg    ag on ag.member_id = m.id
   where m.deleted_at is null
     and (p_member_ids is null or m.id = any (p_member_ids))
  on conflict (member_id) do update set
    current_streak      = excluded.current_streak,
    sessions_expected   = excluded.sessions_expected,
    sessions_attended   = excluded.sessions_attended,
    last_present_date   = excluded.last_present_date,
    last_countable_date = excluded.last_countable_date,
    updated_at          = now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

comment on function public.recompute_member_stats(uuid[]) is
  'Rebuilds member_stats for the members in scope (null = every live member) from their attendance rows: the current run of missed countable sessions, sessions expected and attended, last present and last countable dates. Since 0089 computed in one pass -- a window over the scope''s countable rows and one grouped aggregate -- instead of a current_streak_for() call per member; the same five figures, row for row (supabase/tests/66). Writers pass the members they touched (0035, 0057, 0064, 0082, 0085); a repair of every row is `select public.recompute_member_stats();` by hand.';

do $verify$
declare v_n int;
begin
  -- Callable, and the scope shape still honoured: an empty array touches nobody.
  select public.recompute_member_stats('{}'::uuid[]) into v_n;
  if v_n <> 0 then
    raise exception '0089: an empty scope rewrote % rows', v_n;
  end if;
end $verify$;
