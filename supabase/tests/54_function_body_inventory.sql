\echo 'harness: every application function body, hashed, for the T-120 diff'

-- WHAT THIS IS FOR
--   T-120: production's function bodies, diffed against the bodies a full
--   migration replay builds. The production half is one read. The harness
--   half has nowhere else to come from -- the replay only exists inside this
--   job -- so this file emits it.
--
--   Each line is an assertion that always passes; the payload is the LABEL.
--   test.sh greps the output for PASS/FAIL/ERROR, so a plain `select` would
--   be filtered out and never reach the log. A passing assertion whose label
--   carries the data is the one shape that survives the pipe.
--
--   Extension-owned functions are excluded -- citext, btree_gist, unaccent
--   and the like are installed by CREATE EXTENSION, are identical wherever
--   the same version is installed, and would bury the twenty-odd functions
--   this project actually writes. pg_depend deptype='e' is what marks them,
--   which is exact rather than a name pattern.
--
--   This file asserts nothing about whether the hashes MATCH. That comparison
--   belongs to 53, which pins the two bodies 0074 edits, and to T-120's row,
--   which carries the full table. This one only reports, so it stays green
--   and never hides a real failure behind a churn of hash changes.

select t.ok(true,
  'BODY ' || p.proname || ' ' || md5(p.prosrc) || ' ' || length(p.prosrc)::text)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.prokind = 'f'
   and not exists (
     select 1 from pg_depend d
      where d.objid = p.oid and d.deptype = 'e')
 order by p.proname, p.oid;

select t.ok(true, 'BODYCOUNT ' || count(*)::text)
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
 where n.nspname = 'public'
   and p.prokind = 'f'
   and not exists (
     select 1 from pg_depend d
      where d.objid = p.oid and d.deptype = 'e');
