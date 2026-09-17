import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * RC: "there is no unique or exclusion constraint matching the ON CONFLICT
 * specification" (42P10), on every attendance upload that created a member.
 *
 * 0071 dropped `member_aliases_unique` -- the academy-wide index on
 * (alias_type, alias_normalized) -- because a duplicate became a duplicate OF
 * A COURSE. Two functions defined three migrations earlier still said
 *
 *     on conflict (alias_type, alias_normalized) do nothing
 *
 * and ON CONFLICT infers an INDEX, not a rule. With the index gone Postgres
 * refuses the whole statement, and `commit_csv_import` is one transaction per
 * file, so the operator was told nothing imported. 0073 adds the narrower
 * index that 0071 actually left standing -- (member_id, alias_type,
 * alias_normalized) -- and repoints the upserts at it.
 *
 * WHY THIS TEST IS ON THE SOURCE. No Postgres under node (ADR 005), the same
 * reason duplicatePerCourse.test.ts asserts on migration text. The DB proof is
 * supabase/tests/51_alias_unique_per_member.sql, which executes all of it.
 *
 * WHAT IT GUARDS, and why it is not just a string search. The fault was not
 * that a bad line existed -- it was that the line lived in the LAST definition
 * of a function while the index it named was dropped somewhere else, and
 * nothing in the repo read both. So this resolves each function the way
 * Postgres does, last definition wins, and asks what that definition infers.
 */

const MIGRATIONS = path.join(process.cwd(), 'supabase', 'migrations');

/** Every migration, in the order the harness applies them. */
function migrationFiles(): string[] {
  return fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();
}

const read = (f: string) => fs.readFileSync(path.join(MIGRATIONS, f), 'utf8');

/**
 * What Postgres would execute. Every migration here opens with a prose header
 * that quotes the SQL it is fixing, so a scan of the raw text finds the very
 * line the migration exists to remove.
 */
const code = (sql: string) => sql.replace(/--[^\n]*/g, '');

/**
 * The body Postgres would be running: the LAST `create or replace function`
 * for this name, from its opening `$$` to the `end $$;` that closes it.
 */
function liveBody(fn: string): { file: string; body: string } {
  const opener = new RegExp(`create or replace function public\\.${fn}\\s*\\(`);
  let found: { file: string; body: string } | null = null;
  for (const file of migrationFiles()) {
    const src = read(file);
    const at = src.search(opener);
    if (at < 0) continue;
    const from = src.indexOf('$$', at);
    const to = src.indexOf('end $$;', from);
    assert.ok(from > 0 && to > from, `${file}: could not bound the body of ${fn}`);
    found = { file, body: code(src.slice(from, to)) };   // later files overwrite earlier
  }
  assert.ok(found, `no migration defines ${fn}`);
  return found;
}

/** Every conflict target in a body, as the column list Postgres would infer. */
const conflictTargets = (body: string): string[] =>
  [...body.matchAll(/on conflict \(([^)]*)\)/gi)].map(m => m[1].trim());

const PER_MEMBER = 'member_id, alias_type, alias_normalized';
const ACADEMY_WIDE = 'alias_type, alias_normalized';

// ------------------------------------------- the functions that broke
for (const fn of ['commit_csv_import', 'merge_member_into']) {
  test(`the live ${fn} does not infer the index 0071 dropped`, () => {
    const { file, body } = liveBody(fn);
    assert.ok(!conflictTargets(body).includes(ACADEMY_WIDE),
      `${file} defines ${fn} with "on conflict (${ACADEMY_WIDE})", and no unique index ` +
      'has covered those columns since 0071. Postgres answers 42P10 and the whole import aborts.');
  });

  test(`the live ${fn} remembers an alias against the member it resolved`, () => {
    const { file, body } = liveBody(fn);
    assert.ok(conflictTargets(body).includes(PER_MEMBER),
      `${file} defines ${fn} without an "on conflict (${PER_MEMBER})" upsert — ` +
      'the alias write is how a Meet display name is learned, so losing it is silent.');
  });
}

test('the attendance upsert is untouched — it was never part of this fault', () => {
  const { body } = liveBody('commit_csv_import');
  const attendance = conflictTargets(body).filter(c => c.startsWith('session_id'));
  assert.equal(attendance.length, 2,
    'commit_csv_import upserts attendance twice (the present sweep and the absent sweep); ' +
    'attendance_unique_live is still UNIQUE and neither may be repointed by an alias fix.');
});

// -------------------------------------------------- the index 0073 adds
const FIX = '0073_alias_unique_per_member.sql';

test('0073 creates the per-member unique index, on exactly those columns', () => {
  assert.match(read(FIX),
    /create unique index if not exists member_aliases_member_name_unique\s+on public\.member_aliases \(member_id, alias_type, alias_normalized\);/,
    'ON CONFLICT infers an index by its columns, so the index and the upserts must agree exactly.');
});

test('0073 does NOT restore the academy-wide rule 0071 removed', () => {
  const src = read(FIX);
  const created = [...src.matchAll(/create unique index[^;]*?on public\.member_aliases \(([^)]*)\)/gi)]
    .map(m => m[1].trim());
  assert.deepEqual(created, [PER_MEMBER],
    'a unique index on (alias_type, alias_normalized) under any name would re-impose the ' +
    'academy-wide display-name rule and undo 0071.');
});

test('0073 refuses to build on duplicate rows rather than deleting any', () => {
  // The guard and the index only: everything past the first function is
  // 0045's and 0032's bodies, re-emitted, and merge_member_into clears the
  // stray's aliases by design once it has moved them.
  const src = code(read(FIX));
  const upToTheFunctions = src.slice(0, src.indexOf('create or replace function'));

  assert.match(upToTheFunctions, /having count\(\*\) > 1/,
    '0073 must count the offending groups before it builds a UNIQUE index over rows that ' +
    'already exist — the harness has no production data, so this is the only check there is.');
  assert.match(upToTheFunctions, /raise exception/,
    'and it must raise, so the migration rolls back and a person decides which row goes.');
  assert.ok(!/delete from public\.member_aliases/i.test(upToTheFunctions),
    '0073 must never delete an alias to make itself pass.');
  assert.ok(!/update public\.member_aliases\s+set/i.test(upToTheFunctions),
    '0073 must never rewrite an alias to make itself pass.');
});

// ------------------------------------------------------ the general guard
test('no migration after 0071 reintroduces the dropped conflict target', () => {
  const offenders = migrationFiles()
    .filter(f => /^00(7[3-9]|[89]\d)|^0[1-9]\d\d/.test(f))
    .filter(f => new RegExp(`on conflict \\(${ACADEMY_WIDE}\\)`, 'i').test(code(read(f))));
  assert.deepEqual(offenders, [],
    'a migration written after 0073 has gone back to the academy-wide conflict target. ' +
    'The index behind it has not existed since 0071.');
});
