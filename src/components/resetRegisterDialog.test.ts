import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "give a reset attendnace button and enable select and deselct option to so
 *  we will delete that member records and reset attendnace is click and the
 *  upload again should be changed to awaiting upload. on click of reset do you
 *  want to delet member under no email yes delete option"
 * (requests/2026-09-08-reset-a-day-register.md)
 *
 * The pure half -- who a reset reaches and what it says -- is asserted in
 * src/data/attendanceReset.test.ts. This is the half that is about WHERE the
 * controls are, which is not a computed value and so is read from source, for
 * the reason screenHeaderPinned.test.ts gives: there is no component harness
 * here. One assertion per test, so a failure names its own claim.
 *
 * What can silently regress, and is guarded below:
 *
 *   - the button goes, or is drawn on a day with nothing to undo, so pressing
 *     it opens a dialog whose only answer is "nothing to reset";
 *   - the ticks migrate onto the roster card, which would reverse ADR-030 --
 *     "nothing on the row is tappable" -- as a side effect of this request;
 *   - the ticks default to ON, making the PERMANENT half the path of least
 *     resistance;
 *   - the confirm sends the offered members rather than the ticked ones, so
 *     deselecting stops meaning anything;
 *   - the day is put back by a written status rather than by clearing its
 *     rows, which is two sources for one fact (guardrail 1).
 */

const ROOT = process.env.RESET_REGISTER_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SCREEN = 'app/course/[id].tsx';
const DIALOG = 'src/components/ResetRegisterDialog.tsx';

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, SCREEN)) && fs.existsSync(path.join(ROOT, DIALOG)),
    `${ROOT} is not the repository root. Run from the root, or set RESET_REGISTER_SPEC_ROOT.`);
});

/* ------------------------------------------------------------- the button */

test('the day line carries the caption, then Select, then Reset', () => {
  // Asserted as an ORDER rather than a byte distance: the first version of
  // this test measured "within 2000 characters of the caption" and broke the
  // moment the Select button was added between the two, which was a change to
  // the spec's arithmetic and not to the screen. Order is the claim.
  const src = read(SCREEN);
  const caption = src.indexOf('testID="course-attendance-day"');
  const select = src.indexOf('testID="course-select-toggle"');
  const reset = src.indexOf('testID="course-day-reset"');
  assert.ok(caption !== -1 && caption < select && select < reset,
    'the day caption, the Select toggle and Reset must sit on one row in that order');
});

test('the selection bar is the LAST thing before the member cards', () => {
  // "bring select option just above member cards not above search bar" --
  // the requester. The bar must sit after the day line and its notes, and
  // before the first card, or the count is separated from the ticks it counts.
  const src = read(SCREEN);
  const search = src.indexOf('testID="course-member-search"');
  const bar = src.indexOf('testID="course-selection-bar"');
  const cards = src.indexOf('withEmail.map(');
  assert.ok(search < bar && bar < cards,
    'the selection bar must sit below the search box and above the first card');
});

/**
 * SUPERSEDED BY THE REQUESTER (09-Sep-2026), and rewritten rather than deleted.
 *
 * This pinned the button as HIDDEN on a day with no marks. It is now drawn and
 * disabled, with the reason on it for a screen reader — a button that vanishes
 * tells nobody where it went, and the state it vanishes in is the one somebody
 * goes looking for it in. And the gate itself moved: "The reset of attendance
 * should happend only when user selects the members using select option", so an
 * empty selection is a dead button, not a whole-day reset.
 */
test('the button is dead unless marks exist AND members are ticked', () => {
  const src = read(SCREEN);
  assert.match(src, /const nothingToReset = noMarks \|\| noneTicked;/,
    'a reset with nobody selected must not be offered');
});

test('an empty selection is one of the two reasons, and says which', () => {
  const src = read(SCREEN);
  assert.match(src, /tick the members whose marks to clear first/,
    'a dead button must say why it is dead, not merely be grey');
});

test('the marks it is gated on are the rows the strip itself drew', () => {
  const src = read(SCREEN);
  assert.match(src, /const dayMarks = useMemo\(\(\) => \(attendance\.data \?\? \[\]\)\.filter\(/,
    'dayMarks must come from the same attendance rows the week strip reads');
});

test('the button carries its word, not the colour alone', () => {
  const src = read(SCREEN);
  const at = src.indexOf('testID="course-day-reset"');
  // 1800, not 1200: the label grew a third branch when the selection gate
  // arrived. The claim is unchanged — the word is inside this control.
  assert.match(src.slice(at, at + 1800), />\s*Reset\s*</,
    'guardrail 3: the control must say what it is, never signal it by colour');
});

/* -------------------------------------------------- ADR-030 stays intact */

/**
 * SUPERSEDED BY THE REQUESTER, and rewritten rather than deleted.
 *
 * This test used to assert that the course screen carried NO checkbox at all —
 * my own reading of ADR-030 when the ticks existed only in the dialog. The
 * requester then asked for them on the roster too: "enable select and deselect
 * option in members screen where we upload attendnace". That is a decision
 * about the product, and it overrides an assumption of mine.
 *
 * What ADR-030 actually settled is narrower, and is still guarded here and by
 * memberCardAttendanceReadOnly: the three ATTENDANCE readings are a reading.
 * A selection tick is not an attendance control — it decides who a reset
 * deletes — and it sits outside that block.
 */
test('the roster tick is outside the attendance block, so ADR-030 holds', () => {
  const src = read(SCREEN);
  const open = src.indexOf('attendance status');
  const close = src.indexOf(') : null}', open);
  const block = src.slice(open, close);
  assert.doesNotMatch(block, /accessibilityRole="checkbox"/,
    'a checkbox inside the attendance block turns a reading back into a control');
});

test('the roster offers selection, and a way out of it', () => {
  const src = read(SCREEN);
  assert.match(src, /testID="course-select-toggle"/,
    'the members screen must offer select/deselect');
  assert.match(src, /\{selectMode \? 'Done' : 'Select'\}/,
    'the way in and the way out must be the same control');
});

test('leaving selection mode clears the ticks', () => {
  const src = read(SCREEN);
  assert.match(src, /if \(selectMode\) setSelected\(new Set\(\)\);/,
    'a selection that survives its own mode is an invisible one');
});

/**
 * SUPERSEDED BY THE REQUESTER (09-Sep-2026), and rewritten rather than deleted.
 *
 * These two pinned the old shape: the roster handed its ticks to the dialog as
 * `initialTicked`, and the dialog drew a checkbox per addressless member so one
 * press could clear the day AND delete whoever was ticked.
 *
 * The requester split that in two — "enable multi selection for no email
 * section and enable delete option i.e bulk delete ask for confirmation before
 * delete" — so the selection now says whose MARKS to clear, and deleting is its
 * own control with its own confirmation. The dialog confirms one reversible
 * act and carries no ticks at all.
 */
test('the selection is what the reset acts on', () => {
  const src = read(SCREEN);
  assert.match(src, /resetDayAttendance\(course\.id, chosen\.iso, \[\.\.\.selected\]\)/,
    'the reset must clear the ticked members, and only those');
});

test('the dialog no longer carries checkboxes — it confirms one act', () => {
  assert.doesNotMatch(read(DIALOG), /accessibilityRole="checkbox"/,
    'deleting left this dialog; a tick here would be a control that does nothing');
});

test('the reset never hands member ids to a delete', () => {
  const src = read(SCREEN);
  assert.doesNotMatch(src, /p_delete_member_ids|initialTicked/,
    '0057 drops the argument that meant "delete these"; a stale caller would '
    + 'reset the members it meant to remove');
});

test('the component name cannot trip the ADR-030 write-path guard', () => {
  // memberCardAttendanceReadOnly forbids the substring `setAttendance`
  // anywhere in the course screen. `ResetAttendanceDialog` contains it by
  // accident, which is why the component is named for the register instead.
  assert.doesNotMatch(read(SCREEN), /setAttendance/,
    'the course screen must carry no attendance write path, name or call');
});

/* --------------------------------------------------------------- the ticks */

/* ------------------------------------------- the day goes back by derivation */

/**
 * WITHDRAWN 09-Sep-2026, not skipped — the behaviour they pinned no longer
 * exists to pin.
 *
 * Five assertions lived here about the reset dialog's delete-ticking: that it
 * opened on the roster's selection, dropped anyone with an address, offered
 * select-all, handed the ticked members to the confirm, and named each one's
 * other days. All five described one half of the dialog that the requester
 * moved out of it — "enable multi selection for no email section and enable
 * delete option i.e bulk delete ask for confirmation before delete".
 *
 * They are deleted rather than left as `.skip`, deliberately. A skipped test
 * reads as a pause: something to come back to. Nothing is coming back — the
 * dialog has no ticks, and a suite that carries five sleeping assertions about
 * a control that was removed is a suite nobody can read the intent of. What
 * replaced them is asserted above (the dialog carries no checkbox, the reset
 * acts on the selection) and in bulkDeleteNoEmail.test.ts, which specs the
 * control that took the behaviour over.
 */

test('the screen writes no day status of its own', () => {
  const src = read(SCREEN);
  const at = src.indexOf('const runReset');
  const body = src.slice(at, at + 1200);
  assert.doesNotMatch(body, /setSelectedDay\(|'awaiting'/,
    'the day must return to awaiting by holding no rows, never by a written status');
});

test('the reset asks the server what it would clear before offering it', () => {
  const src = read(SCREEN);
  assert.match(src, /await attendanceResetPreview\(course\.id, chosen\.iso, picked\)/,
    'the preview must count the same rows the reset will clear — the selection');
});

test('a failed reset keeps the dialog open, carrying the reason', () => {
  const src = read(SCREEN);
  const at = src.indexOf('const runReset');
  const body = src.slice(at, at + 1400);
  assert.match(body, /catch \(err\) \{[\s\S]*?setResetError\(resetFailure\(err\)\)/,
    'a failure must not close the dialog and leave a toast as the only evidence');
});
