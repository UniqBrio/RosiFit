import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "enable multi selection for no email section and enable delete option i.e
 *  bulk delete ask for confirmation before delete" -- the requester,
 *  09-Sep-2026, in the same breath as splitting the reset off from it.
 *
 * Deleting is now its own control, and this is the spec for it. It is the
 * dangerous half of that day's work: `delete_member` (0051) is a HARD delete
 * -- the member's attendance on every day, enrolments, addresses, aliases and
 * the mail the academy sent -- so every assertion here is about one of the two
 * ways that goes wrong.
 *
 *   IT DELETES SOMEBODY IT SHOULD NOT. A member with an email is somebody the
 *   academy can still reach; no bulk control may remove them. The control is
 *   drawn over `selectedNoEmail`, never `selected`, and this pins that.
 *
 *   IT DELETES WITHOUT ASKING. The requester asked for the confirmation by
 *   name, so the press opens a dialog rather than writing, the dialog says who
 *   goes and what goes with them, and its weight sits on the answer that keeps
 *   them.
 *
 * It reads source rather than rendering, for the reason dayStripUploadButton
 * gives. One assertion per test.
 */

const ROOT = process.env.BULK_DELETE_SPEC_ROOT ?? process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const screen = read('app/course/[id].tsx');
const repo = read('src/data/repository.ts');

/* ------------------------------------------- only the addressless, ever */

test('the delete acts on the ticked members WITH NO EMAIL, not on the selection', () => {
  assert.match(screen, /bulkDeleteMembers\(selectedNoEmail\.map\(m => m\.id\)\)/,
    'a member with an address must never be removed by a bulk control');
});

test('that list is derived from the no-email roster, not from a second set', () => {
  assert.match(screen,
    /const selectedNoEmail = useMemo\(\s*\(\) => withoutEmail\.filter\(m => selected\.has\(m\.id\)\)/,
    'one selection, read two ways — never two sets free to disagree (guardrail 1)');
});

test('the control is not drawn when the ticks include nobody it may delete', () => {
  assert.match(screen, /\{selectedNoEmail\.length > 0 \? \(\s*<Pressable testID="course-selection-delete"/,
    'a dead delete button over a selection it cannot act on is a control that lies');
});

/* --------------------------------------------------- it asks, every time */

test('pressing it opens the confirmation and writes nothing', () => {
  const at = screen.indexOf('testID="course-selection-delete"');
  assert.match(screen.slice(at, at + 200), /onPress=\{\(\) => setConfirmBulkDelete\(true\)\}/,
    'the press must ask, never delete');
});

test('the confirmation says who goes and what goes with them', () => {
  assert.match(screen, /body=\{deleteWarning\(selectedNoEmail\.map\(/,
    'a hard delete owes its other-days count out loud');
});

test('its weight is on the answer that keeps them', () => {
  const at = screen.indexOf('open={confirmBulkDelete}');
  assert.match(screen.slice(at, at + 700), /emphasis="cancel"/);
});

test('the answers are Yes and No, as the requester asked', () => {
  const at = screen.indexOf('open={confirmBulkDelete}');
  const block = screen.slice(at, at + 700);
  assert.ok(/cancelLabel="No"/.test(block) && /'Yes'/.test(block));
});

test('the button carries its word, never the colour alone (guardrail 3)', () => {
  const at = screen.indexOf('testID="course-selection-delete"');
  assert.match(screen.slice(at, at + 1200), /\{`Delete \$\{selectedNoEmail\.length\}`\}/);
});

/* ------------------------------------------ the write path it goes through */

test('it deletes through the audited per-member path, not a bulk RPC of its own', () => {
  const at = repo.indexOf('export async function bulkDeleteMembers');
  assert.match(repo.slice(at, at + 700), /await deleteMember\(id\)/,
    'a second definition of "delete a member" is free to drift from the first');
});

test('one member failing does not abandon the rest', () => {
  const at = repo.indexOf('export async function bulkDeleteMembers');
  assert.match(repo.slice(at, at + 900), /catch \(err\) \{\s*failed\.push/,
    'the ones already deleted are gone whatever happens to the twelfth');
});

test('the toast names both numbers when some did not go', () => {
  assert.match(screen, /\$\{deleted\} deleted, \$\{failed\.length\} could not be/,
    '"3 deleted" over a selection of five is how somebody thinks the other two went');
});

test('the selection cannot survive the write that removed its members', () => {
  const at = screen.indexOf('const runBulkDelete');
  assert.match(screen.slice(at, at + 1400), /setSelected\(new Set\(\)\)/);
});
