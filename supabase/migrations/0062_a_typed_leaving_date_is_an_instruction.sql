-- 0062 · a leaving date typed into the report is an instruction, not a hint
--
-- REPORTED 09-Sep-2026, with the file: a 794-member export, an Inactive from
-- date typed against two members, uploaded. Nothing happened. Both rows came
-- back "already correct".
--
-- THE DEFECT. 0058 resolved the pair like this:
--
--   the status cell     -> what it says
--   blank, with a date  -> 'inactive'
--   blank, no date      -> what the record already says
--
-- The first line eats the other two. `memberDetailSheet` writes a Status for
-- EVERY row -- an active member's row says "Active" -- so on a report that
-- came out of this app there is never "a date with no status beside it". The
-- exported "Active" always won, `set_member_status` was then handed
-- active + null, and the date the academy had just typed was discarded in
-- silence. The one gesture the button exists for was the one it could not do.
--
-- THE RULE THAT REPLACES IT. Read both cells against what the register holds,
-- because that is the only way to tell a cell somebody TYPED from a cell the
-- export wrote and nobody touched:
--
--   the STATUS differs from the record  -> the status was edited; it decides,
--                                          and Active takes the date off
--   else the DATE differs from the record -> the date was edited; the member
--                                          is inactive from that day
--   else                                 -> nothing was edited; write nothing
--
-- Both gestures still work and the re-upload still writes nothing:
--   · type a leaving date, leave Status alone      -> inactive from that day
--   · set Status to Active, clear the date         -> back on the register
--   · send the export back untouched               -> every row unchanged
--
-- It matches src/data/statusImport.ts `wantedPair` line for line, which is
-- what supabase/tests/42 asserts the two against.
--
-- REWRITTEN IN PLACE, for 0061's reason and with 0061's guard: the substituted
-- text must be present or this migration raises and rolls back, so it cannot
-- silently no-op against a body some later migration has already changed.

do $mig$
declare
  v_old text := $old$    v_status := coalesce(v_raw_stat,
                         case when v_inactive is not null then 'inactive' else v_member.status end);$old$;
  v_new text := $new$    -- WHICH CELL WAS EDITED, measured against the record (0062). The export
    -- writes a Status on every row, so "a date with no status beside it" never
    -- happens on a real report and cannot be the test.
    if v_raw_stat is not null and v_raw_stat is distinct from v_member.status then
      v_status := v_raw_stat;                        -- the status was edited
    elsif v_inactive is not null and v_inactive is distinct from v_member.inactive_from then
      v_status := 'inactive';                        -- the date was edited
    else
      v_status := coalesce(v_raw_stat, v_member.status);
    end if;$new$;
  v_def text;
begin
  v_def := pg_get_functiondef('public.bulk_set_member_dates(jsonb, text)'::regprocedure);

  if position(v_old in v_def) = 0 then
    raise exception '0062: bulk_set_member_dates does not contain the block this migration expects';
  end if;

  execute replace(v_def, v_old, v_new);
end $mig$;

comment on function public.bulk_set_member_dates(jsonb, text) is
  'The UPDATE half of Bulk Import (0058): sets Active from / Inactive from / Status for members ALREADY on the register, from the members report re-uploaded. NEVER inserts -- bulk_import_members is the create half. A name it cannot find is sent to that other button BY NAME (0059). Writes only through set_member_status (0045) and set_member_active_from (0057), so every refusal and every audit row is the one the Edit form gets. WHICH CELL WAS EDITED decides what a row means (0062), measured against the record: an edited Status decides, else an edited leaving date makes the member inactive from that day, else the row wrote nothing. A blank cell is always left alone. Row by row in its own sub-transaction, so one refusal never rolls back the rest.';
