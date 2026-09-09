import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "Enable delete branch" -- the requester, 09-Sep-2026, choosing which of the
 * two locks to open: a branch that ran courses could not be deleted at all.
 *
 * The delete now moves them. What makes that safe is one claim, and every
 * assertion here defends it: REMOVING A LOCATION MUST NOT DESTROY A REGISTER.
 * The offerings are reassigned, so the courses, their sessions, their
 * enrolments and every attendance record travel with them.
 *
 * What can silently regress:
 *
 *   - the padlock comes back and an occupied branch is un-deletable again;
 *   - the move loses its destination -- a remove that fires with no target
 *     falls through to the bare removal, which the trigger refuses, so the
 *     button would simply stop working;
 *   - somebody "simplifies" the two dialogs into one, and the branch that
 *     runs forty classes is removed behind a sentence rather than a choice;
 *   - the screen starts deleting courses to make the branch removable, which
 *     is the one thing this design refuses to do.
 *
 * Source-reading, per dayStripUploadButton.test.ts. One assertion per test.
 */

const ROOT = process.env.BRANCH_REMOVE_SPEC_ROOT ?? process.cwd();
const read = (p: string) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const screen = read('app/branches.tsx');
const repo = read('src/data/repository.ts');

/* --------------------------------------------- the lock is actually gone */

test('an occupied branch opens the dialog instead of refusing', () => {
  assert.match(screen, /onPress=\{\(\) => \{ setMoveTo\(null\); setConfirmRemove\(b\); \}\}/,
    'pressing remove must always ask, never flash "move them first" and stop');
});

test('the padlock is gone — the control is a delete in both states', () => {
  assert.doesNotMatch(screen, /name=\{inUse \? 'lock'/,
    'a padlock says un-deletable, and it no longer is');
});

/* ------------------------------------------- the move names its destination */

test('the remove carries where the courses go', () => {
  assert.match(screen, /await removeBranch\(branch\.id, branch\.name, target\)/);
});

test('the destination is only sent for a branch that actually runs something', () => {
  assert.match(screen, /const target = branch\.courses > 0 \? moveTo : null;/,
    'an empty branch must keep 0019 behaviour exactly');
});

test('the confirm cannot fire before a destination is chosen', () => {
  const at = screen.indexOf('testID="branch-move-confirm"');
  assert.match(screen.slice(at, at + 260), /disabled=\{!moveTo\}/,
    'a move with no target falls through to a removal the trigger refuses');
});

test('the only-branch case is said, not left as a dead picker', () => {
  assert.match(screen, /There is nowhere to move them: this is the only branch/);
});

/* ---------------------------------- two dialogs, because two different acts */

test('the occupied branch gets the picker dialog', () => {
  assert.match(screen, /\{confirmRemove && confirmRemove\.courses > 0 \? \(\s*<FormDialog/);
});

test('and the empty one keeps the plain confirmation', () => {
  assert.match(screen, /open=\{confirmRemove !== null && confirmRemove\.courses === 0\}/,
    'one dialog for both would remove forty classes behind a sentence');
});

/* -------------------------------------------- nothing is destroyed, ever */

test('the screen never deletes a course to make the branch removable', () => {
  assert.doesNotMatch(screen, /deleteCourse|purgeCourse|hardDeleteCourse/,
    'delete_course (0047) is that control, with its own preview');
});

test('the dialog promises what the migration actually does', () => {
  assert.match(screen, /Nothing is deleted\./);
});

test('and it warns about the one refusal the server still makes', () => {
  assert.match(screen, /cannot move there — the two\s*\n?\s*registers would collide/,
    'the collision is worth saying before the press, not only after it');
});

/* ------------------------------------------------ the write path it takes */

test('removeBranch goes through the RPC, not a bare UPDATE', () => {
  const at = repo.indexOf('export async function removeBranch');
  assert.match(repo.slice(at, at + 1400), /supabase\.rpc\('remove_branch'/,
    'the move and the removal have to be one act, or a failed removal strands the courses');
});

test('it says so plainly when the migration is not applied', () => {
  const at = repo.indexOf('export async function removeBranch');
  assert.match(repo.slice(at, at + 1600), /migration 0063 has not been applied/);
});

test('the courses moved, so the course reads are invalidated too', () => {
  const at = repo.indexOf('export async function removeBranch');
  assert.match(repo.slice(at, at + 1800), /coursesChanged\(\)/,
    'a course list still showing the old branch is two answers to one question');
});
