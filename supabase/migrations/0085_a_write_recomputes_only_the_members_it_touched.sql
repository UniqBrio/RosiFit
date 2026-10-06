-- 0085 · a write recomputes the figures of the members it touched, and only those
--
-- THE DEFECT THIS CLOSES (T-014, T-015; RC-7 and RC-8 of
-- docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md)
--   update_member (0027:304) and commit_csv_import (0045:429, and the 0044
--   body production runs) both end with
--
--     perform public.recompute_member_stats();
--
--   -- no argument, so every live member in the academy: one lateral
--   aggregate over the member's whole attendance history and one
--   current_streak_for() window scan each, then an upsert of every
--   member_stats row, inside the write's own transaction and against
--   `authenticated`'s statement_timeout of 8 s (T-005). Measured: 170 ms and
--   52,846 buffers of SELECT before a 1,640-row upsert on production;
--   1.0 s at 1,500 members and 3.4 s at 5,000 in the harness; member_stats
--   rewritten 390,346 times for 1,640 rows. Renaming one member walks the
--   academy. 0035 said why that is wrong for set_attendance and scoped it;
--   0057, 0064 and 0082 pass a scoped array too. These two paths were never
--   swept.
--
--   commit_csv_import also asks expected_members_for_session(v_session_id)
--   ONCE PER FILE ROW inside its loop (R + 2 evaluations per commit, 58 ms
--   cold / 3-5 ms warm each) to decide present-or-extra for the row.
--
-- WHAT member_stats IS DERIVED FROM, which is what decides the scope
--   recompute_member_stats (0008) reads attendance_records joined to
--   completed sessions, and nothing else: current_streak, sessions_expected,
--   sessions_attended, last_present_date, last_countable_date are all
--   functions of one member's own attendance rows. An enrolment or a weekday
--   override changes who is EXPECTED AT FUTURE SESSIONS; it changes no
--   attendance row, so it changes no other member's figures. Therefore:
--
--   * update_member writes one member's name, aliases, addresses, enrolment
--     and override. The only stats row it can have any bearing on is that
--     member's own -- recomputed, as 0027 intended, scoped to the member.
--
--   * commit_csv_import writes attendance rows for exactly one session: the
--     named rows (present or extra), the absentee sweep, the revert and the
--     soft-delete of an earlier file's rows (0037). Every member whose
--     figures can move therefore holds a row for THAT SESSION when the
--     commit is done -- live, or soft-deleted by this very commit. That set,
--     read from the table after the override, is the scope: it is a strict
--     superset of v_present_ids || v_expected_ids (it also carries the
--     member who was due when an earlier file ran and is not due now, whose
--     row this commit just removed), and it can be nobody else.
--
-- THE EXPECTED SET, computed once -- and the trap, kept out of
--   The loop's per-row question "is this member expected at this session"
--   is now answered from an array read once before the loop. Two things
--   inside the loop can change the true answer between rows, and both are
--   handled by re-reading the array at exactly those points:
--
--   1. add_as_new creates a member AND enrols them effective the session
--      date, inside the loop. The array is re-read right after that
--      enrolment, before the row's own present-or-extra decision -- so the
--      member this file created is PRESENT, not extra, exactly as before
--      (52_import_recomputes_only_its_own.sql pins this).
--   2. attendance_backdates_membership (0046), a BEFORE INSERT trigger on
--      attendance_records, moves an enrolment in this offering that starts
--      AFTER the session back to the session date when a row is written for
--      the member. Such a member was not expected when their row was
--      decided (an enrolment starting later is not an enrolment on the
--      date), so only a row decided `extra` can have moved the set. After
--      such a row, if the member is now enrolled on the date in this
--      offering, the array is re-read. A file that names a member twice
--      therefore decides the second row exactly as the live call did.
--
--   The absentee sweep and the override still read
--   expected_members_for_session live, after the loop, as 0037 and 0045
--   wrote them -- spec 52 asserts the sweep does. A commit now evaluates the
--   function 3 + (members created) + (extra rows that became enrolled)
--   times instead of R + 2.
--
-- HOW THE FUNCTIONS ARE CHANGED, and why not by restating them
--   EDITED IN PLACE -- 0061's, 0071's and 0073's idiom, for their reason,
--   and for one more that is specific to these two bodies. T-120 measured
--   both as DIVERGENT between production and the harness replay: production
--   runs commit_csv_import as 0044 wrote it (0045_import_change_counts was
--   never applied -- T-125), and update_member's live body differs from the
--   replayed one (53_harness_body_matches_production.sql is red on it today).
--   A restated body would carry 0045's counters to production as a side
--   effect of a performance fix, or revert whatever the live update_member
--   carries that the replay does not. An in-place edit does neither: each
--   anchor below is present, once, in BOTH the 0044 and the 0045 body and in
--   the live and the replayed update_member (read-only against production
--   lhpzhkzbnquwjljmbylo, 05-Oct-2026: update_member md5 10915909..., 9625
--   bytes, one unscoped call; commit_csv_import md5 ff61afad..., 18,521
--   bytes, one unscoped call, three expected_members_for_session calls,
--   v_expected_ids present, 0045's counters absent).
--
--   Postgres reconstructs each live definition with pg_get_functiondef, ONE
--   anchor is replaced, and the result is executed; the next edit reads the
--   body the previous one left. An anchor found zero times or more than once
--   raises and rolls the whole migration back. After the edits, neither body
--   may carry an unscoped call and the loop may not carry the per-row call.
--
-- WHAT THIS DOES NOT CHANGE
--   Not one attendance row, not one count the result screen reports, not
--   who the sweep marks absent, not a figure in member_stats -- the scoped
--   recompute writes the same values the unscoped one wrote for every member
--   it still touches, and the members it no longer touches had nothing to
--   move. recompute_member_stats() itself is untouched; a repair of every
--   row is still `select public.recompute_member_stats();` by hand, as 0082
--   records. No table, index, policy or grant changes.
--
-- PRODUCTION SAFETY
--   No index or constraint is built over existing rows, so the harness
--   replay is the whole of the pre-flight for this file. It is a draft until
--   applied (D-8) and, under D-10, merges to main only on the day it is
--   applied, with its ledger row.

do $mig$
declare
  v_edits text[][] := array[

    -- ------------------------------------------------------- update_member
    -- One member changed; one member's figures recomputed.
    ['update_member',
     'uuid, text, uuid, text[], text[], smallint[]',
$a$  perform public.recompute_member_stats();$a$,
$b$  -- 0085: scoped to the member. member_stats is derived from the member's
  -- own attendance rows alone, so no other member's figures can have moved.
  perform public.recompute_member_stats(array[p_member_id]);$b$],

    -- --------------------------------------------------- commit_csv_import
    -- (1) the array the loop reads instead of asking per row
    ['commit_csv_import',
     'uuid, uuid, jsonb',
$a$  v_expected_ids  uuid[] := '{}';$a$,
$b$  v_expected_ids  uuid[] := '{}';
  -- 0085: who is expected at this session, read once before the loop and
  -- re-read only where the loop itself can change the answer.
  v_expected_now  uuid[] := '{}';$b$],

    -- (2) read it once, before the loop
    ['commit_csv_import',
     'uuid, uuid, jsonb',
$a$  for v_row in select * from jsonb_array_elements(v_rows)$a$,
$b$  -- 0085: the expected set, once. The loop used to evaluate this per row.
  select coalesce(array_agg(em.member_id), '{}') into v_expected_now
    from public.expected_members_for_session(v_session_id) em;
  for v_row in select * from jsonb_array_elements(v_rows)$b$],

    -- (3) re-read it after add_as_new enrols the member it just created --
    --     before that row's own present-or-extra decision
    ['commit_csv_import',
     'uuid, uuid, jsonb',
$a$      values (v_member_id, v_import.offering_id, v_import.session_date, p_actor);$a$,
$b$      values (v_member_id, v_import.offering_id, v_import.session_date, p_actor);
      -- 0085: the enrolment above puts the new member in the expected set
      -- from the session date, so the set is re-read before their row is
      -- decided. PRESENT, not extra, exactly as the per-row call answered.
      select coalesce(array_agg(em.member_id), '{}') into v_expected_now
        from public.expected_members_for_session(v_session_id) em;$b$],

    -- (4) the per-row question, answered from the array
    ['commit_csv_import',
     'uuid, uuid, jsonb',
$a$      v_expected := exists (
        select 1 from public.expected_members_for_session(v_session_id) em
         where em.member_id = v_member_id);$a$,
$b$      -- 0085: answered from the set read above, not by a call per row.
      v_expected := v_member_id = any (v_expected_now);$b$],

    -- (5) re-read it after a row the backdating trigger can have acted on
    ['commit_csv_import',
     'uuid, uuid, jsonb',
$a$      v_present_ids := array_append(v_present_ids, v_member_id);$a$,
$b$      -- 0085: attendance_backdates_membership (0046) may have just moved an
      -- enrolment in this offering back to the session date. Only a row
      -- decided `extra` can have done that (an enrolment starting later is
      -- not one on the date), so after such a row, if the member is now
      -- enrolled on the date, the set is re-read. A later row naming the
      -- same member is then decided exactly as the per-row call decided it.
      if not v_expected and exists (
           select 1 from public.member_enrollments e
            where e.member_id = v_member_id
              and e.offering_id = v_import.offering_id
              and e.effective_from <= v_import.session_date
              and (e.effective_to is null or e.effective_to >= v_import.session_date)) then
        select coalesce(array_agg(em.member_id), '{}') into v_expected_now
          from public.expected_members_for_session(v_session_id) em;
      end if;
      v_present_ids := array_append(v_present_ids, v_member_id);$b$],

    -- (6) the recompute, scoped to the members with a row for this session
    ['commit_csv_import',
     'uuid, uuid, jsonb',
$a$  perform public.recompute_member_stats();$a$,
$b$  -- 0085: scoped to every member holding a row for THIS session -- live or
  -- soft-deleted by the override above. The named rows, the sweep, the
  -- revert and the removal all write rows for this session and nothing
  -- else, so this is everyone whose figures can have moved, and nobody
  -- else's. Read after the override, so the member whose stale row it just
  -- removed is in it.
  perform public.recompute_member_stats((
    select coalesce(array_agg(distinct a.member_id), '{}'::uuid[])
      from public.attendance_records a
     where a.session_id = v_session_id));$b$]
  ];
  v_i    int;
  v_oid  oid;
  v_def  text;
  v_name text;
  v_args text;
  v_old  text;
  v_new  text;
  v_hits int;
begin
  for v_i in 1 .. array_length(v_edits, 1) loop
    v_name := v_edits[v_i][1];
    v_args := v_edits[v_i][2];
    -- CR stripped, as 0071 explains: a clone with core.autocrlf=true carries
    -- CRLF inside these literals while pg_get_functiondef returns LF.
    v_old  := replace(v_edits[v_i][3], chr(13), '');
    v_new  := replace(v_edits[v_i][4], chr(13), '');

    v_oid := ('public.' || v_name || '(' || v_args || ')')::regprocedure;
    v_def := pg_get_functiondef(v_oid);

    v_hits := (length(v_def) - length(replace(v_def, v_old, ''))) / length(v_old);
    if v_hits = 0 then
      raise exception
        '0085: %(%) does not contain the anchor this migration expects: "%"',
        v_name, v_args, v_old;
    end if;
    if v_hits <> 1 then
      raise exception
        '0085: %(%) contains the anchor % times, so the edit is ambiguous',
        v_name, v_args, v_hits;
    end if;

    execute replace(v_def, v_old, v_new);
  end loop;

  -- Belt and braces: no unscoped recompute survives in either body, and the
  -- loop no longer asks the expected set per row.
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('update_member', 'commit_csv_import')
       and p.prosrc like '%recompute_member_stats()%'
  ) then
    raise exception '0085: a write path still recomputes every member';
  end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public' and p.proname = 'commit_csv_import'
       and p.prosrc like '%v_expected := exists (%'
  ) then
    raise exception '0085: commit_csv_import still asks the expected set per row';
  end if;
end $mig$;

-- pg_get_functiondef reconstructs the whole CREATE OR REPLACE, grants and
-- comments included in effect (they are properties of the oid, which is
-- kept), so nothing is re-granted here. Stated so nobody adds it back.
