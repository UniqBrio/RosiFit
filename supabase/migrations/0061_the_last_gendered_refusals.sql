-- 0061 · the last refusals a member ever reads stop saying "she"
--
-- "we have applied de gender so no where her should be used" -- the requester.
-- 0060 took the two functions Bulk Import shows. These are the rest of the
-- ones a person actually READS: eleven strings across four functions, found by
-- reading every quoted literal in every live function rather than by grepping
-- the repo, because the repo holds superseded copies and the database holds
-- the one that talks to people.
--
--   create_member       4 refusals -- the Add Member form
--   update_member       4 refusals -- the Edit form, same four sentences
--   merge_member_into   2 refusals -- the upload's "same person twice" flow
--   bulk_import_members 1 reason   -- printed per row on the import result
--
-- WHY THIS MIGRATION REWRITES IN PLACE INSTEAD OF RESTATING THE FUNCTIONS
--
-- The honest way to change one string in a function is normally to restate the
-- whole function, and that is what 0059 and 0060 did. It is the wrong tool
-- here. These four bodies are 28KB of the most load-bearing code in the schema
-- -- create_member and update_member are how every member gets on the register
-- and how every edit lands -- and restating them means re-typing 28KB by hand
-- to change 11 short strings. A single transcription slip in that volume is a
-- silent behaviour change in a core write path, and no reviewer reading a
-- 9,000-character function body would reliably catch it.
--
-- So the bodies are never retyped. Postgres reconstructs each definition with
-- pg_get_functiondef, the named substitutions are applied to that text, and
-- the result is executed. The function that comes out differs from the one
-- that went in by exactly these strings and nothing else -- by construction,
-- not by inspection.
--
-- IT CANNOT SILENTLY DO NOTHING. Every substitution is checked before it is
-- applied: a string this migration expects and does not find raises and rolls
-- the whole thing back. That is what stops it quietly no-opping against a
-- function some later migration has already rewritten -- the failure mode a
-- blind replace() would have, and the one worth guarding, since a migration
-- that appears to succeed while changing nothing is worse than one that fails.
--
-- Signatures, grants, volatility, SECURITY DEFINER and search_path all ride
-- along in the reconstructed definition, so none of them can drift.

do $mig$
declare
  -- function name, argument types, the string as it is, the string as it should be
  v_edits text[][] := array[
    ['create_member',
     'text, uuid, date, text[], text[], smallint[]',
     'her name is needed',
     'a name is needed'],
    ['create_member',
     'text, uuid, date, text[], text[], smallint[]',
     'her name is longer than 120 characters',
     'that name is longer than 120 characters'],
    ['create_member',
     'text, uuid, date, text[], text[], smallint[]',
     'pick at least one day, or leave her days blank to follow the course',
     'pick at least one day, or leave the days blank to follow the course'],
    ['create_member',
     'text, uuid, date, text[], text[], smallint[]',
     'her days must be days the course actually runs (%)',
     'the days chosen must be days the course actually runs (%)'],

    ['update_member',
     'uuid, text, uuid, text[], text[], smallint[]',
     'her name is needed',
     'a name is needed'],
    ['update_member',
     'uuid, text, uuid, text[], text[], smallint[]',
     'her name is longer than 120 characters',
     'that name is longer than 120 characters'],
    ['update_member',
     'uuid, text, uuid, text[], text[], smallint[]',
     'pick at least one day, or leave her days blank to follow the course',
     'pick at least one day, or leave the days blank to follow the course'],
    ['update_member',
     'uuid, text, uuid, text[], text[], smallint[]',
     'her days must be days the course actually runs (%)',
     'the days chosen must be days the course actually runs (%)'],

    ['merge_member_into',
     'uuid, uuid',
     'that is the same member -- a member cannot be merged into herself',
     'that is the same member -- a member cannot be merged into themselves'],
    ['merge_member_into',
     'uuid, uuid',
     '% has an email address of her own, so merging her would have to choose which address wins. Add the display name by hand instead.',
     '% has an email address on file, so merging would have to choose which address wins. Add the display name by hand instead.'],

    ['bulk_import_members',
     'jsonb, uuid, text',
     'already on the register — edit her instead',
     'already on the register — edit that member instead']
  ];
  v_i     int;
  v_oid   oid;
  v_def   text;
  v_name  text;
  v_args  text;
  v_old   text;
  v_new   text;
begin
  for v_i in 1 .. array_length(v_edits, 1) loop
    v_name := v_edits[v_i][1];
    v_args := v_edits[v_i][2];
    v_old  := v_edits[v_i][3];
    v_new  := v_edits[v_i][4];

    v_oid := ('public.' || v_name || '(' || v_args || ')')::regprocedure;
    v_def := pg_get_functiondef(v_oid);

    -- THE GUARD. A substitution that matches nothing means this migration is
    -- describing a function that no longer says what it thinks it says, and
    -- carrying on would leave a gendered string in place while reporting
    -- success.
    if position(v_old in v_def) = 0 then
      raise exception
        '0061: %(%) does not contain the string this migration expects: "%"',
        v_name, v_args, v_old;
    end if;

    execute replace(v_def, v_old, v_new);
  end loop;

  -- Belt and braces, and cheap: nothing this migration touched may still carry
  -- a gendered pronoun in a string a person is shown.
  if exists (
    select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in ('create_member','update_member','merge_member_into','bulk_import_members')
       and p.prosrc ~* 'raise exception ''[^'']*\y(she|her|hers|herself)\y'
  ) then
    raise exception '0061: a gendered refusal survived the rewrite';
  end if;
end $mig$;
