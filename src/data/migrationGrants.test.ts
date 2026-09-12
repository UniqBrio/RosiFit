/**
 * EVERY FUNCTION THIS SCHEMA CREATES MUST BE TAKEN AWAY FROM `anon`, DIRECTLY.
 *
 * Run: npx tsx --test src/data/migrationGrants.test.ts
 *
 * WHY THIS FILE EXISTS, and it is not a pleasant reason. Migration 0067 ended
 * with `revoke all on function ... from public`, which is what 0011 does for
 * every read function in this schema. It passed the whole local suite,
 * including `supabase/tests/48`'s own explicit assertion that `anon` cannot
 * execute it. It was applied to production. And in production the function's
 * ACL read:
 *
 *     {postgres=X/postgres, anon=X/postgres, authenticated=X/postgres, ...}
 *
 * `anon=X` is a DIRECT grant. Supabase carries a default-privileges rule that
 * hands EXECUTE on every new `public` function straight to `anon`, not through
 * the PUBLIC pseudo-role — so `revoke ... from public` does not touch it.
 *
 * THE LESSON WAS ALREADY WRITTEN DOWN HERE. Migration 0012 is named
 * `harden_function_security_direct_grants` and its header says this in as many
 * words. 0067 was written against 0011's pattern and never looked at 0012's.
 * A register entry nobody reads at the moment it applies is a register entry
 * that does not work, so this is the mechanical version of it.
 *
 * WHY THE SQL SUITE CANNOT BE THE RUNG. The harness builds its roles in
 * `db/harness/000_local_shim.sql` and does not reproduce Supabase's default
 * privileges. The grant this is about never exists there, so the runtime
 * assertion has nothing to find and passes for the wrong reason — which is
 * worse than not asserting it, because it reads like proof. This checks the
 * migration TEXT instead, which is the same in both places (KL-008).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.MIGRATION_GRANTS_SPEC_ROOT ?? process.cwd();
const DIR = path.join(ROOT, 'supabase/migrations');

const files = fs.readdirSync(DIR).filter(f => f.endsWith('.sql')).sort();
const all = files.map(f => fs.readFileSync(path.join(DIR, f), 'utf8')).join('\n');

/** Strip comments, so a function NAMED in prose is not read as a statement. */
const statements = all.split('\n')
  .filter(l => !/^\s*--/.test(l))
  .join('\n');

/** Every `grant execute on function public.<name>(...)` in the schema. */
function granted(): { name: string; signature: string }[] {
  const out: { name: string; signature: string }[] = [];
  const re = /grant\s+execute\s+on\s+function\s+public\.([a-z0-9_]+)\s*\(([^)]*)\)/gi;
  for (const m of statements.matchAll(re)) {
    out.push({ name: m[1], signature: m[2].replace(/\s+/g, ' ').trim() });
  }
  return out;
}

test('the spec is looking at a real tree', () => {
  assert.ok(files.length > 10, `${DIR} does not look like the migration directory`);
});

/**
 * Functions with no explicit `revoke ... from anon`, which are nevertheless
 * NOT anon-callable in production today. Verified against the live project on
 * 12-Sep-2026 (`has_function_privilege('anon', …)` is false for every one).
 *
 * THEY ARE SAFE BY ACCIDENT OF TIMING, NOT BY DESIGN, and that is why they are
 * written down rather than ignored. Migration 0025 set
 *
 *     alter default privileges in schema public revoke execute on functions
 *       from anon, authenticated;
 *
 * and each of these was created while that was in force, so none ever received
 * the grant. **That default is no longer in force.** `pg_default_acl` for role
 * `postgres` on schema `public`, objtype `f`, currently reads
 * `{postgres=X, anon=X, authenticated=X, service_role=X}` — the revoke has been
 * undone, which is how 0067 acquired an `anon=X` the moment it was applied.
 *
 * So a `create or replace` of ANY function on this list re-acquires the grant,
 * silently. Each needs an explicit revoke, and the default privilege needs
 * restoring; both are RC-042's open items and neither is this change's to make
 * unasked. Listing them here means the number can only shrink.
 */
const NO_EXPLICIT_ANON_REVOKE = new Set([
  'attendance_reset_preview', 'bulk_import_members', 'bulk_set_member_dates',
  'course_deletion_preview', 'create_member', 'current_app_user_id',
  'delete_course', 'delete_member', 'effective_course_message',
  'is_subscription_writable', 'member_deletion_preview', 'member_joined_by',
  'member_status_on', 'merge_member_into', 'remove_branch',
  'reset_day_attendance', 'save_course', 'set_attendance',
  'set_member_active_from', 'set_member_status', 'set_offering_schedule',
  'subscription_state', 'update_member',
]);

test('EVERY function granted to `authenticated` is also revoked from `anon` DIRECTLY', () => {
  /*
   * The defect this exists for, in one assertion. `revoke ... from public` is
   * not enough and never was: Supabase's default privileges grant EXECUTE to
   * `anon` directly, so only a direct revoke removes it.
   */
  const missing: string[] = [];
  for (const { name } of granted()) {
    if (!/\bto\s+[^;]*authenticated/i.test(
      statements.match(new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${name}[^;]*;`, 'i'))?.[0] ?? '',
    )) continue;                                      // service_role only — no anon grant to strip

    const revoked = new RegExp(
      `revoke\\s+execute\\s+on\\s+function\\s+public\\.${name}\\s*\\([^)]*\\)\\s*from\\s+[^;]*\\banon\\b`, 'i',
    ).test(statements);
    if (!revoked && !NO_EXPLICIT_ANON_REVOKE.has(name)) missing.push(name);
  }

  assert.deepEqual(missing, [],
    'These functions are granted to `authenticated` but never revoked from `anon`:\n'
    + missing.map(n => `    public.${n}`).join('\n')
    + '\n\n  `revoke all ... from public` does NOT remove them. Supabase grants EXECUTE on every\n'
    + '  new public function DIRECTLY to anon, so the revoke must name anon:\n'
    + '      revoke execute on function public.<name>(<args>) from anon;\n'
    + '  See migration 0012, which exists for exactly this, and RC-042.');
});

test('and `revoke ... from public` alone is never treated as sufficient', () => {
  // The shape that fooled 0067: a revoke from PUBLIC with no anon anywhere.
  // Named as its own case so a failure says WHICH mistake was made, rather
  // than only that a function is exposed.
  const fromPublicOnly = granted().filter(({ name }) => {
    const anyRevoke = new RegExp(
      `revoke\\s+(all|execute)[^;]*on\\s+function\\s+public\\.${name}[^;]*;`, 'gi');
    const revokes = statements.match(anyRevoke) ?? [];
    return revokes.length > 0 && !revokes.some(r => /\banon\b/i.test(r));
  }).filter(f => !NO_EXPLICIT_ANON_REVOKE.has(f.name));
  assert.deepEqual(fromPublicOnly.map(f => f.name), [],
    'revoked from PUBLIC but never from anon — the 0067 mistake');
});

test('no migration hands a function to `anon` on purpose', () => {
  // If one ever should, it needs a line here saying why, not silence.
  const toAnon = statements.match(
    /grant\s+execute\s+on\s+function\s+public\.[a-z0-9_]+\s*\([^)]*\)\s*to\s+[^;]*\banon\b[^;]*;/gi) ?? [];
  assert.deepEqual(toAnon, [],
    'a function granted to anon must be argued for here first');
});

test('0067 carries its correction, and the correction names anon', () => {
  // A copy-lock on the fix itself: 0067 is applied and may never be edited
  // (CLAUDE.md), so the revoke lives in 0068 and must stay there.
  const fix = fs.readFileSync(
    path.join(DIR, '0068_course_week_day_status_revoke_anon.sql'), 'utf8');
  assert.match(fix,
    /revoke execute on function public\.course_week_day_status\(uuid, date, uuid\) from anon;/);
});

test('the accidental-safety list may only SHRINK, and every name on it is real', () => {
  /*
   * A list like this rots two ways: a name stays after it is fixed, or a name
   * is added to silence a new finding. The first is caught here -- a function
   * that now HAS its revoke has no business being listed.
   *
   * The second cannot be caught by a machine, and is not pretended otherwise:
   * the only thing stopping it is that adding a line to this file is a visible
   * act in a diff, which is the whole argument for writing it down instead of
   * loosening the assertion above.
   */
  const stale = [...NO_EXPLICIT_ANON_REVOKE].filter(name => new RegExp(
    `revoke\\s+execute\\s+on\\s+function\\s+public\\.${name}\\s*\\([^)]*\\)\\s*from\\s+[^;]*\\banon\\b`, 'i',
  ).test(statements));
  assert.deepEqual(stale, [],
    'these now carry an explicit revoke and must be removed from NO_EXPLICIT_ANON_REVOKE');
});
