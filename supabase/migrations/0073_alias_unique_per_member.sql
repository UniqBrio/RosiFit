-- 0073 · the alias upsert names the key 0071 actually left standing
--
-- WHAT WAS WRONG
--   0071 dropped the academy-wide display-name index
--
--     member_aliases_unique   unique (alias_type, alias_normalized)   0006
--
--   and replaced it with the plain lookup index member_aliases_lookup. Its
--   blast radius named commit_csv_import and merge_member_into -- but read
--   them for the RULE they enforce, not for the index they NAME. Both still
--   said
--
--     on conflict (alias_type, alias_normalized) do nothing
--
--   and ON CONFLICT does not infer a rule, it infers an INDEX. With no unique
--   index on those two columns Postgres refuses the statement outright:
--
--     42P10  there is no unique or exclusion constraint matching the
--            ON CONFLICT specification
--
--   So since 0071 went live (16-Sep-2026 05:08 UTC) every attendance upload
--   that creates a member or remembers a display name has aborted, and the
--   whole file with it -- the commit is one transaction. Measured on
--   17-Sep-2026 (T-007): the one import that completed since 0071 carried no
--   new name; the five that did are still `previewed`, the only stranded
--   previews in the table's history. merge_member_into was broken by the same
--   line and had simply not been run yet. RC-046.
--
-- WHAT THIS ADDS
--   · member_aliases_member_name_unique  unique (member_id, alias_type,
--                                        alias_normalized)
--   · the three alias upserts -- two in commit_csv_import, one in
--     merge_member_into -- now name that index.
--
--   The index is the 0071 model written down rather than a retreat from it.
--   0071 decided the academy is the wrong SCOPE for the duplicate question,
--   because splitByCourse already narrows the candidates to the course. What
--   survives that move is the narrower fact nothing has ever wanted twice:
--   one member does not hold one display name on two rows. Two members may
--   both answer to "Rahul"; one member may not carry "Rahul" twice. That is
--   also exactly what the upserts MEAN -- `do nothing` is there to keep a
--   re-run from doubling the member's own row, never to yield the name to
--   somebody else.
--
-- HOW THE FUNCTIONS ARE CHANGED, and why not by restating them
--   EDITED IN PLACE -- 0061's and 0071's idiom, for their reason. The first
--   draft of this file restated both bodies from the migrations that last
--   wrote them (0045, 0032). That is how a later in-place edit gets reverted
--   by whichever migration number is higher: 0061 had already edited
--   merge_member_into in place to take its last two gendered refusals out,
--   and the restated 0032 body put them back. Production carries 0061's
--   words today; the draft would have undone that on apply (T-111, RC-047).
--   Corrected before first apply under D-8 -- a migration absent from every
--   ledger and executed only by the from-scratch harness is a draft.
--
--   So Postgres reconstructs each live definition with pg_get_functiondef,
--   ONE anchor is replaced, and the result is executed. Before the edit, each
--   body must carry the anchor exactly as many times as this migration
--   expects; after it, neither may carry it at all. A body that does not
--   match is a body some later migration has changed, and the migration
--   refuses rather than guess.
--
-- WHAT THIS DOES NOT DO
--   It does not restore academy-wide uniqueness. 0071 stands.
--   member_emails_unique_live, also dropped by 0071, is not part of this: no
--   ON CONFLICT names it, so it raises no 42P10 (T-062 owns it).
--
-- PRODUCTION SAFETY
--   This builds a UNIQUE index over rows that already exist -- the case the
--   harness cannot answer. So the guard below counts the offending groups IN
--   THE SAME TRANSACTION and raises with the count before the index is
--   attempted. It never deletes or edits an alias to make itself pass.
--   Read against production, read-only: 0 groups over 796 rows,
--   17-Sep-2026 11:23:52 UTC (T-008).
-- ---------------------------------------------------------------------------

-- ------------------------------------------------- refuse to build on sand
do $$
declare v_dups int;
begin
  select count(*) into v_dups from (
    select 1 from public.member_aliases
     group by member_id, alias_type, alias_normalized
    having count(*) > 1
  ) d;
  if v_dups > 0 then
    raise exception 'member_aliases already holds % (member, type, name) group(s) with more than one row, and member_aliases_member_name_unique would refuse them. Resolve them by hand: this migration will not choose which row to drop.', v_dups
      using errcode = '23505';
  end if;
end $$;

create unique index if not exists member_aliases_member_name_unique
  on public.member_aliases (member_id, alias_type, alias_normalized);

comment on index public.member_aliases_member_name_unique is
  'One member, one display name, once -- the uniqueness that survived 0071, which moved the DUPLICATE question from the academy to the course. Two members may share a display name; one member may not hold it twice. This is the index the alias upserts in commit_csv_import and merge_member_into infer; before it existed they named member_aliases_unique (0006, dropped by 0071) and raised 42P10 on every import that created a member.';

-- ------------------------------------------ the three upserts, in place
do $mig$
declare
  v_anchor  constant text := 'on conflict (alias_type, alias_normalized) do nothing';
  v_fixed   constant text := 'on conflict (member_id, alias_type, alias_normalized) do nothing';
  -- function, argument types, how many times the live body must carry the
  -- anchor. commit_csv_import upserts an alias for a member it created and
  -- for one the operator matched; merge_member_into for the survivor.
  v_targets constant text[][] := array[
    ['commit_csv_import', 'uuid, uuid, jsonb', '2'],
    ['merge_member_into', 'uuid, uuid',        '1']
  ];
  v_i    int;
  v_oid  oid;
  v_def  text;
  v_hits int;
begin
  for v_i in 1 .. array_length(v_targets, 1) loop
    v_oid  := ('public.' || v_targets[v_i][1] || '(' || v_targets[v_i][2] || ')')::regprocedure;
    v_def  := pg_get_functiondef(v_oid);
    v_hits := (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor);

    -- BEFORE: the live body is the one this migration was written against.
    if v_hits <> v_targets[v_i][3]::int then
      raise exception
        '0073: the live %() names the dropped index % time(s); this migration expects exactly %. Read the live body before applying anything -- a later migration has changed it.',
        v_targets[v_i][1], v_hits, v_targets[v_i][3];
    end if;

    execute replace(v_def, v_anchor, v_fixed);
  end loop;

  -- AFTER: neither body still infers the index 0071 dropped -- and no other
  -- function does either, which is the 42P10 class rather than the two sites.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosrc like '%' || v_anchor || '%'
  ) then
    raise exception '0073: a function still names the dropped academy-wide index after the edit';
  end if;
end $mig$;

-- Grants, as they stand: unchanged by CREATE OR REPLACE, restated so the
-- posture is in the file that touched the functions.
revoke all on function public.commit_csv_import(uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.commit_csv_import(uuid, uuid, jsonb) to service_role;
revoke all on function public.merge_member_into(uuid, uuid) from public, anon;
grant execute on function public.merge_member_into(uuid, uuid) to authenticated, service_role;
