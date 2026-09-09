import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "let there be another button as bulk import inactive dont allow it in bulk
 *  import itslef let that be there only to upload member and create their
 *  record" -- the requester, on where the two dates get set in bulk.
 *
 * The DATA half of this is specified already: statusImport.test.ts drives the
 * reader and the verdicts, and supabase/tests/42 drives the write. What was
 * missing was the surface -- the button that opens it and the screen it
 * opens -- and a surface is exactly where this feature can regress without a
 * single data spec noticing.
 *
 * What can silently regress, and is guarded below:
 *
 *   - the second button goes, or never reaches its own route, and Bulk Import
 *     Inactive becomes a module nothing can call;
 *   - somebody "tidies" the pair into one button, which is the merge the
 *     requester refused -- bulk_import_members SKIPS a name it already has,
 *     and that skip is what has stopped a re-uploaded file rewriting forty
 *     records since 0028;
 *   - the screen learns to CREATE -- one import call swapped for the other,
 *     and the most conservative path in the app becomes its most destructive;
 *   - a blank cell goes out as '' instead of null, and a re-uploaded export
 *     erases the columns nobody filled in ("blank means leave it alone");
 *   - the result stops naming what moved, and "3 updated" becomes a number
 *     the academy has to take on trust for a write no other screen lists;
 *   - a name that is not on the register is drawn as a failure rather than as
 *     the other button's job, and the boundary stops being readable.
 *
 * It reads source rather than rendering, for the reason
 * dayStripUploadButton.test.ts gives: there is no component harness here, and
 * every claim is about what is drawn where. One assertion per test, so a
 * failure names its own claim.
 */

const ROOT = process.env.BULK_IMPORT_INACTIVE_SPEC_ROOT ?? process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const workspace = read('app/(tabs)/courses.tsx');
const layout = read('app/_layout.tsx');
const screen = read('app/member/import-inactive.tsx');

/* ------------------------------------------------------- the second button */

test('the Attendance workspace carries a Bulk Import Inactive button', () => {
  assert.match(workspace, /'courses-bulk-import-inactive', 'Bulk Import Inactive'/,
    'the button the requester asked for is not on the workspace');
});

test('it opens its own route, never the member importer', () => {
  const at = workspace.indexOf('courses-bulk-import-inactive');
  assert.match(workspace.slice(at, at + 400), /'\/member\/import-inactive'/);
});

test('Bulk Import is untouched — it still opens the importer that creates', () => {
  assert.match(workspace, /'courses-bulk-import', 'Bulk Import',[\s\S]{0,200}'\/member\/import'/,
    'the first button stopped opening /member/import');
});

test('the two are separate buttons, which is the decision itself', () => {
  const first = workspace.indexOf("'courses-bulk-import',");
  const second = workspace.indexOf("'courses-bulk-import-inactive',");
  assert.ok(first !== -1 && second !== -1 && first !== second,
    'the pair was merged back into one button');
});

test('the route is registered, and as a dialog like every other importer', () => {
  assert.match(layout, /<Stack\.Screen name="member\/import-inactive" options=\{DIALOG_SCREEN\} \/>/);
});

/* ---------------------------------------------- the screen never creates */

test('the screen writes through the dates importer', () => {
  assert.match(screen, /bulkSetMemberDates\(/);
});

test('the screen never calls the importer that inserts members', () => {
  assert.doesNotMatch(screen, /bulkImportMembers/,
    'this screen must never create anybody — that is the other button');
});

test('the screen never calls createMember either', () => {
  assert.doesNotMatch(screen, /createMember/);
});

test('it reads the report, not the member template', () => {
  assert.match(screen, /parseStatusXlsx/);
});

test('there is no template to download — the file is the export', () => {
  assert.doesNotMatch(screen, /buildMemberTemplate|downloadTemplate/,
    'a template would ask the academy to re-key the register');
});

/* --------------------------------------- blank means leave it alone, out */

test('a blank Active from cell is sent as null, never as an empty string', () => {
  assert.match(screen, /active_from: cellValue\(v\.row\.activeFrom\) \|\| null/);
});

test('a blank Inactive from cell is sent as null too', () => {
  assert.match(screen, /inactive_from: cellValue\(v\.row\.inactiveFrom\) \|\| null/);
});

test('a blank Status cell is sent as null', () => {
  assert.match(screen, /status: v\.row\.status\.trim\(\) \|\| null/);
});

test('only rows judged ready are sent at all', () => {
  assert.match(screen, /const send = judged\.filter\(v => v\.state === 'ready'\)/);
});

test('a file with nothing to write does not call the server to agree with it', () => {
  assert.match(screen, /if \(send\.length === 0\) \{ setResult\(NOTHING_SENT\); return; \}/);
});

/* -------------------------------------------------------- what it reports */

test('the four counts are the ones this import has', () => {
  for (const label of ['"Updated"', '"Already correct"', '"Failed"', '"Not on the register"']) {
    assert.ok(screen.includes(`label=${label}`), `the ${label} count is not drawn`);
  }
});

test('the result names what moved, member by member', () => {
  assert.match(screen, /function MovedRow/,
    '"3 updated" on its own is a number nobody can check');
});

test('each change is shown as the field, the old value and the new one', () => {
  assert.match(screen, /\$\{ch\.field\} · \$\{ch\.from\} → \$\{ch\.to\}/);
});

test('only rows the SERVER reported updated are listed as moved', () => {
  const at = screen.indexOf('const moved = useMemo');
  assert.match(screen.slice(at, at + 600), /result\?\.rows \?\? \[\]\)\s*\.filter\(r => r\.status === 'updated'\)/,
    'the verdict decided what to send; the server decides what landed');
});

test('a name that is not on the register is its own outcome, not a failure', () => {
  assert.match(screen, /unknown:\s+\{ tone: 'cancelled', word: 'Not on the register'/);
});

test('every outcome carries its word, never the colour alone (guardrail 3)', () => {
  const at = screen.indexOf('const OUTCOME');
  const table = screen.slice(at, screen.indexOf('function ReportRow', at));
  // the entries, not the type above them: only a row has a quoted tone
  for (const line of table.split('\n').filter(l => /tone: '/.test(l))) {
    assert.match(line, /word: '[^']+'.*icon: '[^']+'/, `an outcome has no word and icon: ${line.trim()}`);
  }
});

test('the re-uploaded export reads as agreement, not as a failed import', () => {
  assert.match(screen, /Every row already matched the register/);
});

test('the help says in as many words that this import adds nobody', () => {
  assert.match(screen, /This import never adds anybody/);
});
