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

test('the button is drawn only for a day that has something to undo', () => {
  const src = read(SCREEN);
  assert.match(src, /\{dayMarks > 0 \? \(\s*<Pressable testID="course-day-reset"/,
    'the reset button must be gated on the day actually holding marks');
});

test('the marks it is gated on are the rows the strip itself drew', () => {
  const src = read(SCREEN);
  assert.match(src, /const dayMarks = useMemo\(\(\) => \(attendance\.data \?\? \[\]\)\.filter\(/,
    'dayMarks must come from the same attendance rows the week strip reads');
});

test('the button carries its word, not the colour alone', () => {
  const src = read(SCREEN);
  const at = src.indexOf('testID="course-day-reset"');
  assert.match(src.slice(at, at + 1200), />\s*Reset\s*</,
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

test('the roster selection is carried into the dialog, not acted on from the roster', () => {
  const src = read(SCREEN);
  assert.match(src, /initialTicked=\{\[\.\.\.selected\]\}/,
    'the roster must hand its selection to the dialog, which is what states the cost');
});

test('the dialog is what carries the checkboxes', () => {
  assert.match(read(DIALOG), /accessibilityRole="checkbox"/,
    'the select/deselect option is missing from the reset dialog');
});

test('the component name cannot trip the ADR-030 write-path guard', () => {
  // memberCardAttendanceReadOnly forbids the substring `setAttendance`
  // anywhere in the course screen. `ResetAttendanceDialog` contains it by
  // accident, which is why the component is named for the register instead.
  assert.doesNotMatch(read(SCREEN), /setAttendance/,
    'the course screen must carry no attendance write path, name or call');
});

/* --------------------------------------------------------------- the ticks */

test('the dialog opens on the roster’s selection and nothing else', () => {
  const dialog = read(DIALOG);
  assert.match(dialog, /setTicked\(new Set\(initialTicked\.filter\(id => offered\.has\(id\)\)\)\);/,
    'the dialog must start from the roster selection, narrowed to who is actually deletable');
});

test('a selected member who has an address is never a delete target', () => {
  const dialog = read(DIALOG);
  assert.match(dialog, /const offered = new Set\(\(preview\?\.deletable \?\? \[\]\)\.map\(t => t\.member_id\)\);/,
    'the roster can select anyone; only the addressless may be deleted');
});

test('select all is offered, and toggles back to deselect all', () => {
  const dialog = read(DIALOG);
  assert.match(dialog, /\{allTicked \? 'Deselect all' : 'Select all'\}/,
    'the requester asked for select AND deselect');
});

test('the confirm hands over the TICKED members, not the offered ones', () => {
  const dialog = read(DIALOG);
  assert.match(dialog, /onPress=\{\(\) => onConfirm\(chosen\)\}/,
    'the confirm must send `chosen` -- sending `deletable` would ignore every deselect');
});

test('each tick names the days its deletion would also reach', () => {
  const dialog = read(DIALOG);
  assert.match(dialog, /other_days === 0 \? 'this day only'/,
    'a hard delete reaches every day of hers, and the row has to say so');
});

/* ------------------------------------------- the day goes back by derivation */

test('the screen writes no day status of its own', () => {
  const src = read(SCREEN);
  const at = src.indexOf('const runReset');
  const body = src.slice(at, at + 1200);
  assert.doesNotMatch(body, /setSelectedDay\(|'awaiting'/,
    'the day must return to awaiting by holding no rows, never by a written status');
});

test('the reset asks the server what it would clear before offering it', () => {
  const src = read(SCREEN);
  assert.match(src, /await attendanceResetPreview\(course\.id, chosen\.iso\)/,
    'the dialog must state quantities from the database, not from the roster alone');
});

test('a failed reset keeps the dialog open, carrying the reason', () => {
  const src = read(SCREEN);
  const at = src.indexOf('const runReset');
  const body = src.slice(at, at + 1400);
  assert.match(body, /catch \(err\) \{[\s\S]*?setResetError\(resetFailure\(err\)\)/,
    'a failure must not close the dialog and leave a toast as the only evidence');
});
