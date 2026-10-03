-- 0082 · a merge recomputes the figures of the member it lands on
--
-- WHAT WAS WRONG
--   "when user adds a no email member to existing member ... if we add them
--   under existing member who were under no email with status as present it
--   still shows absent" (the academy, 30-Sep-2026).
--
--   Since 0080 the attendance ROW is right after a merge: the import's absent
--   on the real member gives way and the stray's present moves across. But
--   `member_stats` -- the cache the roster, the streak line ("2 in a row
--   since Fri 25 Sep") and the follow-up rule read -- is rebuilt only by the
--   functions that call recompute_member_stats(): the import, set_attendance,
--   update_member, the resets and the purges. merge_member_into (0032) never
--   did. So the member it lands on kept the import's figures: attended 0,
--   the absent still counted in the streak, still flagged for follow-up --
--   and the same file cannot be uploaded again to repair it, because the
--   import refuses a file it has already committed.
--
-- THE RULE NOW
--   After the attendance has moved and before the audit row is written, the
--   target's figures are rebuilt from the records it now holds, and so are
--   the counts of every session the merge moved or dropped a record in --
--   the two caches every other attendance writer refreshes (the import,
--   set_attendance, the resets). Only the target's figures: the stray is
--   soft-deleted in the same transaction and nothing reads a deleted
--   member's figures.
--
-- HOW
--   0073's and 0080's idiom: the LIVE definition is reconstructed, one anchor
--   gains a statement in front of it, and the result is executed. Restating
--   the function would revert 0061's wording, 0073's alias upsert and 0080's
--   rule. The anchor must appear exactly once before and the marker exactly
--   once after; anything else refuses rather than guesses.
--
-- PRODUCTION SAFETY
--   Changes a function body only. No table, index or constraint is touched and
--   no existing row changes on apply. Members already merged keep stale
--   figures until the next import or correction recomputes them; the one-off
--   repair is `select public.recompute_member_stats();`, run by hand with the
--   owner's go-ahead -- it is not part of this migration. Idempotent: a second
--   run finds the marker and does nothing.

do $mig$
declare
  v_oid    constant oid  := 'public.merge_member_into(uuid, uuid)'::regprocedure;
  v_anchor constant text := 'perform public.audit_log(''member.merged''';
  v_marker constant text := '-- 0082: the merged-into member''s figures are rebuilt';
  v_insert constant text :=
$ins$-- 0082: the merged-into member's figures are rebuilt
  -- The rows moved above, and two caches are built from them. member_stats
  -- is read by the roster, the streak line and the follow-up rule; the
  -- session counts by the session calendar. Left alone, both go on saying
  -- the member missed the class this merge just gave them. The sessions are
  -- the ones this call touched: a row moved or dropped here carries this
  -- transaction's now() in updated_at or deleted_at.
  perform public.refresh_session_counts(s.session_id)
     from (select distinct a.session_id
             from public.attendance_records a
            where a.member_id in (p_target, p_stray)
              and (a.updated_at = now() or a.deleted_at = now())) s;
  perform public.recompute_member_stats(array[p_target]);

  $ins$;
  v_def  text;
  v_hits int;
begin
  v_def := pg_get_functiondef(v_oid);

  if position(v_marker in v_def) > 0 then
    raise notice '0082: merge_member_into already recomputes the figures; nothing to do';
    return;
  end if;

  v_hits := (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor);
  if v_hits <> 1 then
    raise exception
      '0082: the live merge_member_into() carries "%" % time(s); this migration expects exactly 1. Read the live body before applying anything -- a later migration has changed it.',
      v_anchor, v_hits;
  end if;

  execute replace(v_def, v_anchor, v_insert || v_anchor);

  v_def := pg_get_functiondef(v_oid);
  if (length(v_def) - length(replace(v_def, v_marker, ''))) / length(v_marker) <> 1 then
    raise exception '0082: after the edit merge_member_into does not carry the new rule exactly once';
  end if;
end $mig$;
