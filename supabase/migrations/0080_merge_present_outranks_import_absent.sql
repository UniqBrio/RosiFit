-- 0080 · a merge keeps the day the member actually attended
--
-- WHAT WAS WRONG (T-139, found by supabase/tests/25_merge_member.sql)
--   0032 exists for one case: an import could not match a display name, so it
--   created a stray member and marked THE STRAY present -- and marked the real
--   member ABSENT, because since 0014 the import writes 'absent' for everybody
--   expected but not named. Merging the stray into the real member is how the
--   academy says "that was her". 0032's own header calls the absent "the lie".
--
--   But its clash rule was "the target already being in that session wins",
--   unconditionally. On exactly the day the merge exists for, the target DOES
--   have a record -- the import's absent -- so the stray's present was the one
--   soft-deleted, and the merge left the real member absent from a class she
--   attended. 25_merge_member.sql has asserted the opposite since 0032 and has
--   never passed: "the 17th now says PRESENT … this is the whole point of the
--   merge -- got absent".
--
-- THE RULE NOW
--   Before the existing clash rule runs, the target's record for a session is
--   dropped when ALL of these hold:
--     · it is 'absent'                       -- the import's default mark
--     · nobody corrected it (corrected_at is null) -- a person's 'absent' is a
--       decision, and set_attendance (0035) outranks any file; a merge must too
--     · the stray has a live 'present' or 'extra' record in that session
--   The stray's record then moves to the target through the existing path,
--   which recomputes `expected` and the status for the member it lands on.
--   Every other clash is unchanged: the target's own present, extra, or
--   corrected record still wins, and the stray's is dropped.
--
-- HOW, AND WHY NOT BY RESTATING THE FUNCTION
--   In place, 0061's and 0073's idiom (RC-047): restating merge_member_into
--   from 0032 would revert 0061's refusal wording and 0073's alias upsert.
--   Postgres reconstructs the LIVE definition, one anchor gains a statement in
--   front of it, and the result is executed. The anchor must appear exactly
--   once before and the new statement exactly once after; anything else means
--   a later migration changed the body, and this refuses rather than guess.
--
-- PRODUCTION SAFETY
--   Changes a function body only. No table, index or constraint is touched,
--   and no existing row changes on apply -- the new rule acts only inside a
--   future merge. Idempotent: a second run finds the marker and does nothing.

do $mig$
declare
  v_oid    constant oid  := 'public.merge_member_into(uuid, uuid)'::regprocedure;
  v_anchor constant text := 'with clash as (';
  v_marker constant text := '-- 0080: an attended day outranks the import''s absent';
  v_insert constant text :=
$ins$-- 0080: an attended day outranks the import's absent
  -- The real member's UNCORRECTED 'absent' for a session the stray attended is
  -- the import's default mark, and it is the lie this merge exists to undo --
  -- drop it so the stray's record moves across below (T-139). A corrected
  -- absent is a person's decision and still wins.
  update public.attendance_records t
     set deleted_at = now()
   where t.member_id = p_target and t.deleted_at is null
     and t.status = 'absent' and t.corrected_at is null
     and exists (select 1 from public.attendance_records s
                  where s.member_id = p_stray and s.session_id = t.session_id
                    and s.deleted_at is null and s.status in ('present', 'extra'));

  $ins$;
  v_def  text;
  v_hits int;
begin
  v_def := pg_get_functiondef(v_oid);

  if position(v_marker in v_def) > 0 then
    raise notice '0080: merge_member_into already carries the rule; nothing to do';
    return;
  end if;

  v_hits := (length(v_def) - length(replace(v_def, v_anchor, ''))) / length(v_anchor);
  if v_hits <> 1 then
    raise exception
      '0080: the live merge_member_into() carries "%" % time(s); this migration expects exactly 1. Read the live body before applying anything -- a later migration has changed it.',
      v_anchor, v_hits;
  end if;

  execute replace(v_def, v_anchor, v_insert || v_anchor);

  v_def := pg_get_functiondef(v_oid);
  if (length(v_def) - length(replace(v_def, v_marker, ''))) / length(v_marker) <> 1 then
    raise exception '0080: after the edit merge_member_into does not carry the new rule exactly once';
  end if;
end $mig$;
