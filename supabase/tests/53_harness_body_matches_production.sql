\echo 'harness: the reconstructed function body is the one production runs (T-120)'

-- WHY THIS FILE EXISTS
--   CLAUDE.md calls the harness replay "the pre-flight check -- the whole of
--   it". That claim has one load-bearing assumption nothing had ever tested:
--   that the body the replay BUILDS is the body production RUNS. On
--   18-Sep-2026 it was found not to be. Twelve migrations in the repository
--   have no row in production's supabase_migrations.schema_migrations, and
--   for one of them the function body settles it --
--   0045_import_change_counts' markers (`v_absent_added`, the `'changes'`
--   key) are absent from the live commit_csv_import while 0037's, 0039's and
--   0049's are all present. So a green replay proved less than it read as.
--
--   This is the two-function slice of T-120, pinned as an assertion rather
--   than left as a one-off read: commit_csv_import and update_member, the two
--   bodies 0074 edits. Everything else in public is T-120's full diff.
--
-- WHAT IS COMPARED, and what a failure means
--   md5(prosrc) -- the body text as stored, which is exactly what
--   pg_get_functiondef reconstructs and what every in-place migration
--   (0061, 0071, 0073, 0074) reads before it edits. Not the whole
--   pg_get_functiondef output: that carries the argument list and the
--   language and volatility clauses, which differ for reasons this file is
--   not about.
--
--   RED means production and the replay disagree about what this function
--   is. Before trusting any harness result about it, find out which way:
--     select md5(prosrc), length(prosrc) from pg_proc p
--       join pg_namespace n on n.oid = p.pronamespace
--      where n.nspname = 'public' and p.proname = '<name>';
--   run against production, read-only, and diff the bodies by eye.
--
-- RE-PINNING, which is this spec doing its job rather than failing
--   These hashes are a copy-lock on a function body. When a migration is
--   applied to production the live body changes, the replay changes with it,
--   and BOTH hashes move together -- so the expected value here is re-pinned
--   as part of that apply, from a read taken after it. The diff must show
--   only the two hex literals and the dated comment changing. If only one
--   side moved, that is the divergence this file is for, and re-pinning it
--   would be erasing the finding.
--
--   Pinned 18-Sep-2026 04:38:25 UTC, read-only on production
--   lhpzhkzbnquwjljmbylo, after 0073 was applied (17-Sep 12:58 UTC) and
--   before 0074.

select t.eq((select md5(p.prosrc) from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'commit_csv_import'),
            'ff61afadd104c0d507dfa9731e756a51',
  'commit_csv_import: the replayed body is byte-identical to production (18-Sep-2026, post-0073)');

select t.eq((select length(p.prosrc) from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'commit_csv_import'),
            18521,
  'commit_csv_import: and the same length, so a hash mismatch is a real difference, not an encoding one');

select t.eq((select md5(p.prosrc) from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'update_member'),
            '10915909963daa3824b58c4407f8c0fb',
  'update_member: the replayed body is byte-identical to production (18-Sep-2026, post-0073)');

select t.eq((select length(p.prosrc) from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'update_member'),
            9625,
  'update_member: and the same length');

-- The finding that prompted this file, asserted so it cannot quietly go away.
-- 0045 is in the repository and is replayed here, so the harness body DOES
-- carry its markers. Production does not. If this ever passes on production
-- too, 0045 has been applied and T-120's row should say so.
select t.ok((select p.prosrc like '%v_absent_added%' from pg_proc p
               join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.proname = 'commit_csv_import'),
  'the replayed body carries 0045''s absent counter -- production''s does not, which is T-120');
