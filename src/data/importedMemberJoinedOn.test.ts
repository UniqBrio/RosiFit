/**
 * A BULK-IMPORTED MEMBER JOINS ON THE DAY SHE WAS IMPORTED.
 *
 * Run: npx tsx --test src/data/importedMemberJoinedOn.test.ts
 *
 * THE DEFECT (RC-033)
 *   `create_member` computes one joining date and stores another. `v_from` is
 *   `coalesce(p_joined_on, current_date)` and is what the ENROLMENT opens at,
 *   what her own schedule starts on, and what the future-date refusal is
 *   measured against -- but the `members` row is inserted with the RAW
 *   `p_joined_on`. Every caller that passes a date sees no difference; the one
 *   caller that passes none does.
 *
 *   That caller is the bulk import. The member file has carried no Joined On
 *   column since 0029 ("today is the only answer, so there is no cell left to
 *   write a date into the wrong shape"), so `bulk_import_members` hands
 *   `create_member` a null and the imported member gets an enrolment that
 *   starts today and a joining date that is blank -- two answers to one
 *   question about one member, which is guardrail 1's failure arriving from
 *   inside a single function.
 *
 *   The comment in repository.ts asserted the opposite in so many words
 *   ("create_member coalesces null to current_date, so a bulk-imported member
 *   joins the day she was imported") and 0046's header repeated it. Both were
 *   reading `v_from` and neither was reading the INSERT four lines below it.
 *
 * WHY THE ASSERTIONS ARE ON SQL TEXT
 *   The behaviour itself belongs to supabase/tests/38_imported_member_joined_on.sql,
 *   which calls the function and reads the row back. That suite needs Postgres
 *   (ADR 005: no psql, no Docker on this machine) and has never been executed,
 *   which is exactly how 22_bulk_import_members.sql sat asserting a true thing
 *   nobody had run (RC-014). This spec runs under plain node on every
 *   `npm run check`, so the one line that matters is guarded on every commit.
 *
 *   It resolves the LATEST migration that defines the function rather than
 *   naming one, because a re-issue is how this project changes a function and
 *   a spec pinned to 0049 would go quiet the moment somebody restates it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.IMPORTED_JOINED_SPEC_ROOT ?? process.cwd();
const MIGRATIONS = 'supabase/migrations';
const REPO = 'src/data/repository.ts';

const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set IMPORTED_JOINED_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};

/**
 * The definition that is actually in force: the highest-numbered migration
 * that re-issues the function, and the body of that definition alone -- a
 * migration may restate several functions in one file (0038 restates nine).
 */
function currentDefinition(fn: string): { file: string; body: string } {
  const files = fs.readdirSync(path.join(ROOT, MIGRATIONS))
    .filter(f => f.endsWith('.sql')).sort();
  const marker = `create or replace function public.${fn}(`;
  let found: { file: string; body: string } | null = null;
  for (const file of files) {
    const sql = fs.readFileSync(path.join(ROOT, MIGRATIONS, file), 'utf8');
    const open = sql.indexOf(marker);
    if (open === -1) continue;
    // to the end of the function body: `end $$;` closes it in every one here.
    const close = sql.indexOf('end $$;', open);
    assert.notEqual(close, -1, `${file}: ${fn} is opened and never closed`);
    found = { file, body: sql.slice(open, close) };
  }
  assert.ok(found, `no migration defines ${fn}`);
  return found;
}

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, MIGRATIONS)), 'no migrations folder');
  read(REPO);
});

/* --------------------------------------- 1. one date, written to both rows */

test('the member row stores the same date the enrolment opens at', () => {
  const { file, body } = currentDefinition('create_member');
  assert.match(body, /insert into public\.members \(full_name, joined_on, status, created_by\)\s*\n\s*values \(btrim\(p_full_name\), v_from, 'active', v_actor\)/,
    `${file}: create_member must store v_from -- the raw p_joined_on is null for `
    + 'every bulk-imported member, so her record says "not recorded" while her '
    + 'enrolment says today');
});

test('that one date is still today when the caller names none', () => {
  const { file, body } = currentDefinition('create_member');
  assert.match(body, /v_from\s+date\s*:=\s*coalesce\(p_joined_on, current_date\)/,
    `${file}: the default IS the coalesce; without it there is no upload date to store`);
});

test('the audit entry records the date that was written, not the one that was passed', () => {
  const { body } = currentDefinition('create_member');
  const entry = body.slice(body.indexOf("audit_log('member.created'"));
  assert.notEqual(entry.length, 0, 'create_member no longer records the act');
  assert.match(entry, /'joined_on', v_from/,
    'an audit entry saying joined_on: null beside a record dated today is a '
    + 'third answer to the same question');
});

test('a date in the future is still refused, on the same value that is stored', () => {
  const { body } = currentDefinition('create_member');
  assert.match(body, /if v_from > current_date then/,
    'the refusal must measure the date that gets stored');
});

/* ------------------------------------- 2. the import still sends no date */

test('the bulk import sends no joining date, so the default is what decides', () => {
  const src = read(REPO);
  const open = src.indexOf("supabase.rpc('bulk_import_members', {");
  assert.notEqual(open, -1, 'bulkImportMembers no longer calls the RPC');
  // Comments stripped: the block EXPLAINS that no joined_on is sent, and a
  // spec that cannot tell the explanation from the argument would fail on the
  // sentence saying the right thing.
  const call = src.slice(open, src.indexOf('});', open)).replace(/\/\/.*/g, '');
  assert.doesNotMatch(call, /joined_on/,
    'the file has no Joined On column (0029): a date sent from here would be one '
    + 'the operator never typed');
});

test('offline says the same thing the database now says', () => {
  const src = read(REPO);
  const open = src.indexOf('export async function bulkImportMembers');
  assert.notEqual(open, -1, 'bulkImportMembers is gone');
  const offline = src.slice(open, src.indexOf("supabase.rpc('bulk_import_members'", open));
  assert.match(offline, /joinedOn: iso\(new Date\(\)\), joined: joinedLabel\(iso\(new Date\(\)\)\)/,
    'the offline register must date an imported member today, as the database does');
});

/* --------------------------- 3. the sibling site, swept and left as it was */

test('the import that creates a member from a Meet export dates her that session', () => {
  const { body } = currentDefinition('commit_csv_import');
  const add = body.slice(body.indexOf("elsif v_action = 'add_as_new'"));
  assert.match(add, /insert into public\.members \(full_name, joined_on, status, created_by\)\s*\n\s*values \(v_alias_display, v_import\.session_date,/,
    'the other creator of members has always dated her by the register that names '
    + 'her; it is swept here so a later edit cannot quietly null it');
});
