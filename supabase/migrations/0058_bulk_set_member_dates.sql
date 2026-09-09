-- 0058 · BULK IMPORT INACTIVE -- the register's two dates, set from a file
--
-- REPORTED
--   "For bulk import user downloads members list from reports and fills in the
--    active from and inactive from dates and reuploads ... if new member add as
--    new member if existing member updates records based on the file also the
--    active from and inactive from fields."
--
--   And then, on the shape of it:
--
--   "let there be another button as bulk import inactive dont allow it in bulk
--    import itslef let that be there only to upload member and create their
--    record"
--
-- WHY THIS IS A SECOND FUNCTION AND NOT A BRANCH IN bulk_import_members
--   Because the requester said so, and because the code agrees with them.
--   `bulk_import_members` (0028/0029/0038/0050) has exactly one verb: it
--   CREATES. A name already on the register is SKIPPED, never overwritten,
--   and that skip is the guard rail that has stopped a re-uploaded file
--   rewriting forty records ever since. Teaching it to update would turn the
--   most conservative path in the app into its most destructive one, decided
--   by which columns happened to be in the file.
--
--   So: two FUNCTIONS, one verb each. There is one button and one file --
--   the requester settled that: "Lets remove Bulk import Inactive button we
--   shall make this work with same bulk import button" -- and the screen is
--   what routes each row to the verb it needs: a name the register does not
--   have goes to bulk_import_members, a name it has comes here.
--
--   This function NEVER inserts. That is not a limitation to work around, it
--   is the guarantee that makes one button safe: whichever way the screen
--   routes a row, neither function can do the other's damage.
--
-- WHAT IT WRITES, AND THROUGH WHAT
--   Nothing directly. Every row goes through the two functions that already
--   own these columns:
--
--     set_member_status      (0045) -- status + inactive_from, as a pair
--     set_member_active_from (0057) -- joined_on + the earliest enrolment
--
--   so every refusal, every audit row and every constraint is the same one the
--   Edit form gets. A bulk path that validated for itself is a second opinion
--   about the same columns, and the first thing to drift.
--
-- BLANK MEANS LEAVE IT ALONE
--   This is the rule the whole file turns on. The person exports the register,
--   types into two columns and uploads the same sheet back -- so the great
--   majority of every row is untouched, and a blank cell has to mean "as you
--   were", never "clear it". A cell that cleared a date would make an export
--   into a bulk eraser, which is the one thing an accidental re-upload must
--   not be able to do.
--
--   The one inference, and it is the file's own name: an INACTIVE DATE with no
--   status beside it means inactive from that day. There is no other reading
--   -- members_inactive_from_needs_status (0045) will not hold a date beside
--   an active status -- and refusing the row instead would refuse the exact
--   thing this button is called after.
--
-- ROW BY ROW, IN ITS OWN SUB-TRANSACTION
--   0028's posture, for 0028's reason: one refusal must not roll back the
--   thirty-nine rows that were fine. The counts that come back are what the
--   database accepted, never what was sent.
--
-- NO RECEIPT TABLE
--   `member_import_runs` counts inserted/skipped/failed, which is not what
--   this does, and a second table would need its own RLS, its own purge in
--   0054's family and its own reason to exist. It does not need one: members
--   and member_enrollments each carry the audit trigger from 0006, so every
--   date this moves is already recorded with its old value, its new value and
--   the actor. One entry is added for the ACT -- the file, and what it did --
--   which is the only fact no per-row trigger can see.
--
-- APPLYING THIS TO PRODUCTION
--   Adds one function and alters no table. Depends on 0057 being applied
--   first: it calls set_member_active_from.

create or replace function public.bulk_set_member_dates(
  /**
   * The parsed sheet. Each element:
   *   { row: int, full_name: text,
   *     active_from: text|null, inactive_from: text|null, status: text|null }
   * Dates are TEXT, checked for shape here before anything casts them (0029).
   */
  p_rows      jsonb,
  p_file_name text default null
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_actor     uuid := public.current_app_user_id();
  v_row       jsonb;
  v_rownum    int;
  v_name      text;
  v_member    record;
  v_raw_act   text;
  v_raw_ina   text;
  v_raw_stat  text;
  v_active    date;
  v_inactive  date;
  v_status    text;
  v_matches   int;
  v_touched   boolean;
  v_verdicts  jsonb := '[]'::jsonb;
  v_updated   int := 0;
  v_same      int := 0;
  v_failed    int := 0;
  v_total     int := 0;
begin
  -- The gate bulk_import_members carries since 0038/0050: an active user, and
  -- a writable subscription. The two functions this calls restate it again --
  -- they are SECURITY DEFINER too -- and that repetition is deliberate: this
  -- one refuses the FILE, so nobody reads forty identical row failures to
  -- discover the subscription is read-only.
  if v_actor is null or not public.is_active_app_user() then
    raise exception 'only a signed-in, active user can import member dates'
      using errcode = '42501';
  end if;
  if not public.is_subscription_writable() then
    raise exception 'the subscription is not writable, so nothing can be imported'
      using errcode = '42501';
  end if;
  if p_rows is null or jsonb_typeof(p_rows) <> 'array' then
    raise exception 'the import needs a list of rows' using errcode = '22023';
  end if;
  v_total := jsonb_array_length(p_rows);
  if v_total = 0 then
    raise exception 'that file has no rows to import' using errcode = '22023';
  end if;
  if v_total > 500 then
    raise exception 'a file may carry at most 500 members; this one has %', v_total using errcode = '22023';
  end if;

  for v_row in select * from jsonb_array_elements(p_rows) loop
    v_rownum   := coalesce((v_row->>'row')::int, 0);
    v_name     := btrim(coalesce(v_row->>'full_name', ''));
    v_raw_act  := nullif(btrim(coalesce(v_row->>'active_from', '')), '');
    v_raw_ina  := nullif(btrim(coalesce(v_row->>'inactive_from', '')), '');
    v_raw_stat := nullif(lower(btrim(coalesce(v_row->>'status', ''))), '');
    v_active   := null;
    v_inactive := null;
    v_status   := null;
    v_touched  := false;

    if v_name = '' then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', 'no name in this row');
      continue;
    end if;

    -- ------------------------------------------------------- who she is
    -- By NORMALISED NAME, the same key bulk_import_members matches on, so the
    -- two files agree about who is already on the register. Never by an id
    -- from the file: an exported id that has been edited in a spreadsheet is
    -- how one member's dates land on another.
    select count(*) into v_matches
      from public.members m
     where m.deleted_at is null
       and m.name_normalized = public.normalize_name(v_name);

    if v_matches = 0 then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', 'not on the register — nothing of hers to change');
      continue;
    elsif v_matches > 1 then
      -- Two live members normalise to one name. This file cannot say which,
      -- and guessing would date the wrong person.
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('more than one member is called "%s" — change their dates on their own records', v_name));
      continue;
    end if;

    select m.id, m.full_name, m.status, m.inactive_from, m.joined_on into v_member
      from public.members m
     where m.deleted_at is null
       and m.name_normalized = public.normalize_name(v_name);

    -- ---------------------------------------------------- the two dates
    -- THE SHAPE BEFORE THE CAST (0029). '01/09/2026' does not raise --
    -- Postgres reads it under DateStyle, which on this project is MDY -- so a
    -- British or Indian date becomes 9 January, silently, on the column that
    -- decides every session she was ever expected at.
    if v_raw_act is not null and v_raw_act !~ '^\d{4}-\d{2}-\d{2}$' then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('"%s" is not a date; write Active from as YYYY-MM-DD', v_raw_act));
      continue;
    end if;
    if v_raw_ina is not null and v_raw_ina !~ '^\d{4}-\d{2}-\d{2}$' then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('"%s" is not a date; write Inactive from as YYYY-MM-DD', v_raw_ina));
      continue;
    end if;
    begin
      v_active   := v_raw_act::date;          -- shape is right; the DAY may not exist
      v_inactive := v_raw_ina::date;
    exception when others then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', 'that row carries a date that does not exist');
      continue;
    end;

    -- ------------------------------------------------------- the status
    -- The sheet writes the words the report writes. 'paused' is accepted
    -- because the column's CHECK allows it and a record may already hold it --
    -- every reader folds it in with inactive (0031).
    if v_raw_stat is not null and v_raw_stat not in ('active', 'inactive', 'paused') then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed',
        'reason', format('"%s" is not a status — write Active or Inactive', v_row->>'status'));
      continue;
    end if;

    -- BLANK MEANS LEAVE IT ALONE, resolved here once so the two write calls
    -- below never have to ask what a null meant.
    --
    --   the status cell     -> what it says
    --   blank, with a date  -> 'inactive'; an inactive date is what the date IS
    --   blank, no date      -> what her record already says
    v_status := coalesce(v_raw_stat,
                         case when v_inactive is not null then 'inactive' else v_member.status end);
    -- Her stored date is the default, so a row that only moves the JOINING
    -- date cannot wipe the leaving one on its way past.
    v_inactive := coalesce(v_inactive, v_member.inactive_from);
    -- Active takes the date OFF, exactly as set_member_status does with it --
    -- said here as well so the comparison two lines down is against the pair
    -- that will actually be written.
    if v_status = 'active' then v_inactive := null; end if;

    -- ------------------------------------------------------- the writes
    -- One sub-transaction per ROW, not per write: a row whose status lands and
    -- whose joining date is then refused must leave the register as it found
    -- it, or the file has half-applied itself and nobody can tell which half.
    begin
      -- THE STATUS FIRST, then the joining date -- the order app/member/edit.tsx
      -- uses, and for its reason: set_member_status refuses an inactive date
      -- earlier than the joining date, so a row moving BOTH ends forward only
      -- goes through if the far end is written first.
      if v_status is distinct from v_member.status
         or v_inactive is distinct from v_member.inactive_from then
        perform public.set_member_status(v_member.id, v_status, v_inactive);
        v_touched := true;
      end if;

      if v_active is not null and v_active is distinct from v_member.joined_on then
        perform public.set_member_active_from(v_member.id, v_active);
        v_touched := true;
      end if;
    exception when others then
      v_failed := v_failed + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_name,
        'status', 'failed', 'reason', sqlerrm);
      continue;
    end;

    if v_touched then
      v_updated := v_updated + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_member.full_name,
        'status', 'updated', 'member_id', v_member.id,
        'active_from', v_active, 'inactive_from', v_inactive, 'member_status', v_status);
    else
      -- The re-upload case, and it is the COMMON one: the same export sent
      -- twice. It is not a failure and it is not a write -- it is the file
      -- agreeing with the register, and the screen says so in those words
      -- (0045's "nothing to update", the same lesson).
      v_same := v_same + 1;
      v_verdicts := v_verdicts || jsonb_build_object('row', v_rownum, 'full_name', v_member.full_name,
        'status', 'unchanged', 'member_id', v_member.id);
    end if;
  end loop;

  -- The ACT, which no per-row trigger can see: one person uploaded one file,
  -- once, and this is what it did. The per-column history is already in
  -- audit_logs from the 0006 triggers on members and member_enrollments.
  perform public.audit_log('member.dates_imported', 'member_dates_import', null, '[]'::jsonb,
    jsonb_build_object('file_name', p_file_name, 'total', v_total,
                       'updated', v_updated, 'unchanged', v_same, 'failed', v_failed));

  return jsonb_build_object(
    'total', v_total, 'updated', v_updated, 'unchanged', v_same,
    'failed', v_failed, 'rows', v_verdicts);
end $$;

revoke all on function public.bulk_set_member_dates(jsonb, text) from public, anon;
grant execute on function public.bulk_set_member_dates(jsonb, text) to authenticated, service_role;

comment on function public.bulk_set_member_dates(jsonb, text) is
  'The UPDATE half of Bulk Import (0058): sets Active from / Inactive from / Status for members ALREADY on the register, from the members report re-uploaded. NEVER inserts -- bulk_import_members is the create half, and the screen routes each row to one of the two by whether the register already has the name. One verb each is what makes a single button safe. Writes only through set_member_status (0045) and set_member_active_from (0057), so every refusal and every audit row is the one the Edit form gets. A BLANK cell means leave it alone; an inactive date with no status beside it means inactive from that day. Row by row in its own sub-transaction, so one refusal never rolls back the rest.';
