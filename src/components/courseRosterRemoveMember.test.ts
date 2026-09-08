import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "give delete icon to delete member in members screen ... on member card"
 * (requests/2026-09-08-delete-member-from-course-roster.md).
 *
 * The roster card on the course detail screen carried Edit and the
 * Active/Inactive pill and no way to take a member off the register at all --
 * the Members tab's card had one, this one did not, so the same card in two
 * places offered two different sets of actions.
 *
 * WHAT CAN SILENTLY GO WRONG, AND IS GUARDED BELOW:
 *
 *   - the button loses its confirmation and deletes on the first tap. This is
 *     the only act on the card that cannot be undone from the app;
 *   - the screen grows its own wording for the four outcomes instead of
 *     calling removalOutcome/removalFailure, so this card and the Members
 *     tab's card start saying different things after the same result --
 *     exactly what src/data/memberRemoval.ts was extracted to stop;
 *   - the write stops being `delete_member` and becomes a flash that claims
 *     something happened, which is what the roster's delete used to be;
 *   - Remove and Edit end up told apart by colour alone. On a no-email card
 *     the Edit button is ALREADY drawn in the danger colour, so the two sit
 *     side by side in the same red and must each carry their own glyph and
 *     their own label (guardrail 3).
 *
 * It reads source rather than rendering, for the reason
 * memberCardAttendanceReadOnly.test.ts gives: there is no component harness in
 * this project, and the claim is about the shape of the row and what is in it.
 */

const ROOT = process.env.COURSE_ROSTER_REMOVE_SPEC_ROOT ?? process.cwd();
const SCREEN = 'app/course/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, SCREEN)),
    `${ROOT} is not the repository root: no ${SCREEN}. Run from the root, or set COURSE_ROSTER_REMOVE_SPEC_ROOT.`);
});

test('the roster card carries a remove control', () => {
  const src = read(SCREEN);
  assert.match(src, /testID=\{`course-member-remove-\$\{member\.id\}`\}/,
    'the roster card must offer a remove control, addressable per member');
  assert.match(src, /<Icon name="delete"/,
    'guardrail 3: the control carries the bin glyph, not the danger colour alone');
  assert.match(src, /accessibilityLabel=\{`Remove \$\{member\.name\} from the academy`\}/,
    'the label must name the member and the act -- Edit beside it is red too on a no-email card');
});

test('nothing is deleted without the question being asked', () => {
  const src = read(SCREEN);
  assert.match(src, /onPress=\{\(\) => setConfirmRemove\(true\)\}/,
    'the button must open the confirmation, never call the write directly');
  assert.match(src, /open=\{confirmRemove\}/,
    'the confirmation must be driven by that state');
  // AMENDED 08-Sep-2026 for requests/2026-09-08-member-delete-confirm-yes-no.md.
  // The words changed at the repo owner's asking -- "confirm that you are
  // deleting a member and its record entire[ly] ... yes or no" -- so the two
  // assertions that quoted the old ones are restated rather than dropped: what
  // they were guarding (the question names her; the busy label is distinct from
  // the idle one) is unchanged and still asserted here.
  assert.match(src, /title=\{`Delete \$\{member\.name\} and her records\?`\}/,
    'the question must name who is being deleted, and say that her records go with her');
  assert.match(src, /confirmLabel=\{removing \? 'Deleting…' : 'Yes'\}/,
    'a second tap while the write is in flight must not read as a fresh one');
  assert.match(src, /disabled=\{removing\}/,
    'the control must be inert while its own write is in flight');
});

/**
 * AMENDED 08-Sep-2026 FOR 0051. This asserted the screen carried the sentence
 * "Her attendance history stays" -- a promise the repo owner withdrew when the
 * deletion became a hard one (requests/2026-09-08-hard-delete-member.md). The
 * sentence itself has moved to src/data/memberRemoval.ts, where every branch
 * of it is asserted under node rather than matched as a string in a screen,
 * which is what this file's own header asked for. So what is checked here is
 * the DELEGATION and the counting that precedes it -- and, hardest of all, the
 * absence of the promise.
 */
test('the confirmation asks for the count, and states no promise of its own', () => {
  const src = read(SCREEN);
  assert.match(src, /body=\{deletionWarning\(previewState\)\}/,
    'the sentence belongs to src/data/memberRemoval.ts, so both member cards say the same thing');
  assert.match(src, /memberDeletionPreview\(member\.id\)/,
    'a dialog that can no longer promise anything has to state a quantity, so it must count first');
  assert.match(src, /setPreviewState\(\{ kind: 'uncounted' \}\)/,
    'a count that fails still offers the deletion -- it just cannot say how much');
  assert.doesNotMatch(src, /attendance history stays|records kept/i,
    'the withdrawn promise must not survive anywhere in the screen');
});

test('the write is delete_member, and its wording is the shared one', () => {
  const src = read(SCREEN);
  assert.match(src, /await deleteMember\(member\.id\)/,
    'the roster must make the real write, not flash a sentence about one');
  assert.match(src, /removalOutcome\(\s*\n?\s*member\.name, await deleteMember\(member\.id\), dataSource\)/,
    'the four outcomes belong to src/data/memberRemoval.ts, so both member cards say the same thing');
  assert.match(src, /removalFailure\(err\)/,
    'a refused or failed deletion must use the shared sentence, which says nothing was changed');
});
