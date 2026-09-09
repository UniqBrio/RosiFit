import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "this in imported using bulk import button itself where on click you can
 *  import excel file but it should not break the existing bulk import members
 *  feature where multible members are uploaded as new members"
 *  -- the requester, 09-Sep-2026.
 *
 * ONE button, two files. The day before there were two buttons; that shape is
 * withdrawn, and app/member/import-inactive.tsx and its spec went with it --
 * this file replaces that spec rather than sitting beside it, because the
 * behaviour it pinned no longer exists to pin.
 *
 * What can silently regress, and is guarded below:
 *
 *   - a second import button comes back, or the withdrawn route is
 *     re-registered, and the requester's instruction is quietly reversed;
 *   - THE CREATE PATH BREAKS -- the named risk in the request. The template
 *     must still reach parseMemberXlsx and bulkImportMembers, unconditionally
 *     and by default;
 *   - the dates path learns to create, or the create path learns to update,
 *     and one button becomes one verb doing two jobs;
 *   - a blank cell goes out as '' instead of null, and a report sent back
 *     erases the columns nobody filled in;
 *   - the two results are drawn with one set of counts, so a file that created
 *     nobody reports "Imported".
 *
 * It reads source rather than rendering, for the reason
 * dayStripUploadButton.test.ts gives. One assertion per test.
 */

const ROOT = process.env.BULK_IMPORT_SPEC_ROOT ?? process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p: string) => fs.existsSync(path.join(ROOT, p));

const workspace = read('app/(tabs)/courses.tsx');
const layout = read('app/_layout.tsx');
const screen = read('app/member/import.tsx');

/* ------------------------------------------------------------ one button */

test('there is exactly one bulk import button on the workspace', () => {
  const hits = workspace.match(/'courses-bulk-import[^']*'/g) ?? [];
  assert.deepEqual(hits, ["'courses-bulk-import'"],
    'the second button was withdrawn on 09-Sep-2026 and must not come back');
});

test('it opens the one import screen', () => {
  const at = workspace.indexOf("'courses-bulk-import',");
  assert.match(workspace.slice(at, at + 300), /'\/member\/import'/);
});

test('the withdrawn screen is gone', () => {
  assert.equal(exists('app/member/import-inactive.tsx'), false);
});

test('and its route is not registered', () => {
  assert.doesNotMatch(layout, /member\/import-inactive/);
});

/* ------------------------------- THE CREATE PATH, which must not break */

test('the template still reaches the member parser', () => {
  assert.match(screen, /parseMemberXlsx\(picked\.bytes\)/);
});

test('and still reaches the importer that inserts', () => {
  assert.match(screen, /bulkImportMembers\(\{/);
});

test('the template is still offered for download', () => {
  assert.match(screen, /buildMemberTemplate\(/);
});

test('the dates branch is the only thing that can divert a file from it', () => {
  // one guard, reading one word, and it returns -- nothing else short-circuits
  const at = screen.indexOf('const which = await detectImportKind');
  assert.match(screen.slice(at, at + 260),
    /if \(which === 'dates'\) \{ await importDates\(picked\); return; \}/);
});

test('the detector is asked before either parser runs', () => {
  assert.ok(screen.indexOf('detectImportKind') < screen.indexOf('parseMemberXlsx(picked.bytes)'),
    'the file must be identified before it is parsed as anything');
});

/* --------------------------------------- one button, still two verbs */

test('the dates path never calls the importer that inserts', () => {
  const from = screen.indexOf('const importDates =');
  const to = screen.indexOf('const choose =');
  assert.doesNotMatch(screen.slice(from, to), /bulkImportMembers|createMember/,
    'the report must never create anybody');
});

test('the dates path writes through the dates importer', () => {
  assert.match(screen, /bulkSetMemberDates\(\{/);
});

test('a blank Active from cell is sent as null, never as an empty string', () => {
  assert.match(screen, /active_from: cellValue\(v\.row\.activeFrom\) \|\| null/);
});

test('a blank Inactive from cell is sent as null too', () => {
  assert.match(screen, /inactive_from: cellValue\(v\.row\.inactiveFrom\) \|\| null/);
});

test('a report with nothing to write does not call the server to agree with it', () => {
  assert.match(screen, /if \(send\.length === 0\) \{ setDateResult\(NO_DATES_SENT\); return; \}/);
});

/* -------------------------------------------------- two results, kept apart */

test('the dates result has its own flag, not the create path’s', () => {
  assert.match(screen, /const showDates = kind === 'dates' && dateResult !== null && file !== null/);
});

test('the dates result has its own four counts', () => {
  for (const id of ['import-dates-updated', 'import-dates-unchanged',
                    'import-dates-failed', 'import-dates-unknown']) {
    assert.ok(screen.includes(id), `the ${id} count is not drawn`);
  }
});

test('the result names what moved, member by member', () => {
  assert.match(screen, /function MovedRow/);
});

test('each change is shown as the field, the old value and the new one', () => {
  assert.match(screen, /\$\{ch\.field\} \\u00b7 \$\{ch\.from\} \\u2192 \$\{ch\.to\}/);
});

test('a name that is not on the register is its own outcome, not a failure', () => {
  assert.match(screen, /unknown:\s+\{ tone: 'cancelled', word: 'Not on the register'/);
});

test('the help describes both files, so neither is a surprise', () => {
  assert.match(screen, /This button takes TWO files/);
});
