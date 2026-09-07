import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "bring awaiting upload button as earlier for each day if uplaoded on top of
 *  each day show tick mark" -- "Its a button with text on click of it user
 *  should be able to uplaod" (requests/2026-09-07-awaiting-upload-button-on-each-day.md)
 *
 * Third round on this surface. Round 1 put an Upload button on the day card
 * under the strip for every day; round 2 removed the card, the message and
 * the button together because the message read as a dialog in the way. What
 * round 2 missed is that the button and the message were two things, and only
 * one of them was the complaint. So the button comes back ON THE DAY -- a
 * card that is awaiting a file carries a labelled press that opens the upload
 * for that date -- and nothing comes back under the strip.
 *
 * What can silently regress, and is guarded below:
 *
 *   - the button goes again, or renders for every day instead of the
 *     awaiting ones (an uploaded day shows its tick and nothing to press);
 *   - the press drops the date and opens the undated course upload the bar
 *     already has, so a file for the wrong day stops being ASKED about (0024);
 *   - the word is retyped as a literal instead of read from STATUS, and the
 *     legend and the button start disagreeing;
 *   - the button is nested inside the card's own select press -- a button in
 *     a button, which a screen reader announces as one control;
 *   - the clock comes back on a day still to come.
 *
 * It reads source rather than rendering, for the reason
 * screenHeaderPinned.test.ts gives: there is no component harness here, and
 * every claim is about what is drawn where, not about a computed value.
 * One assertion per test, so a failure names its own claim.
 */

const ROOT = process.env.DAY_STRIP_UPLOAD_SPEC_ROOT ?? process.cwd();
const src = fs.readFileSync(path.join(ROOT, 'app/course/[id].tsx'), 'utf8');

/** the strip's cell loop -- everything from `days.map(` to the arrow after it */
const strip = src.slice(src.indexOf('{days.map(d => {'), src.indexOf('course-week-next'));
const selectAt = strip.indexOf('testID={`course-day-${d.iso}`}');
const uploadAt = strip.indexOf('testID={`course-day-upload-${d.iso}`}');
/** the upload button, from its testID to the end of the strip */
const button = uploadAt === -1 ? '' : strip.slice(uploadAt);

test('the spec is looking at a real tree', () => {
  assert.notEqual(selectAt, -1, 'the strip no longer draws a course-day-<iso> cell');
});

test('an awaiting day carries an upload button of its own', () => {
  assert.notEqual(uploadAt, -1, 'no course-day-upload-<iso> on the strip');
});

test('the button is drawn only for a day that is awaiting a file', () => {
  const guard = strip.lastIndexOf("d.key === 'awaiting'", uploadAt);
  assert.notEqual(guard, -1, 'the upload button is not gated on the awaiting state');
});

test('an uploaded day keeps its icon in the cell, with nothing to press', () => {
  // The icon is drawn for the NON-awaiting branch inside the select press;
  // the awaiting branch hands its slot to the button instead.
  const cell = strip.slice(selectAt, uploadAt);
  assert.match(cell, /waiting \? null : <Icon name=\{tone\.icon\}/,
    'the uploaded day no longer draws its status icon in the cell');
});

test('the press opens the upload for THAT date, not the undated course upload', () => {
  assert.match(button, /pathname: '\/upload', params: \{ courseId: course\.id, date: d\.iso \}/,
    'the upload push has lost its date parameter');
});

test('the button says the status word, read from STATUS and not retyped', () => {
  assert.match(button, /\{tone\.word\}/, 'the button word is not STATUS.awaiting.word');
});

test('"Awaiting upload" is never a literal on this screen', () => {
  assert.doesNotMatch(src, /['"`]Awaiting upload/, 'a retyped copy of the status word');
});

test('the upload button is a SIBLING of the select press, never inside it', () => {
  // With no button at all there is nothing to be nested, and a slice to -1
  // would read as a pass -- so an absent button fails here too, on purpose.
  const between = uploadAt === -1 ? '' : strip.slice(selectAt, uploadAt);
  assert.ok(between.includes('</Pressable>'),
    'the select press does not close before the upload button opens -- a button inside a button');
});

test('the select press is still there and still selects the day', () => {
  const select = strip.slice(selectAt, selectAt + 200);
  assert.match(select, /onPress=\{\(\) => setSelectedDay\(d\.iso\)\}/);
});

test('the button names its day for a screen reader', () => {
  assert.match(button, /accessibilityLabel=\{`Upload a session for \$\{dayWords\}`\}/);
});

test('the strip never draws the clock', () => {
  assert.doesNotMatch(src, /'scheduled'/, 'STATUS.scheduled is back on the course screen');
});

/* ------------------------------------------- THE WEEK THE BUTTON IS OFFERED IN
 *
 * "Fix the Awaiting Upload button visibility on the date cards. It should
 *  only be shown for dates in the current week. It must not appear on future
 *  weeks."
 *
 * Round 3 above put the button on every AWAITING day. The strip steps 26
 * weeks either way, and an un-uploaded day wears the cloud whether the date
 * has passed or not (0034) -- so stepping forward gave next week's cards a
 * button each, offering to upload a file for a class that had not happened.
 * `fetchPendingSessions` never returns those days (`session_date <= today`),
 * so the press landed on "That session is no longer waiting for a file"
 * about a session that had not started.
 *
 * The window is now derived, not drawn: `src/data/uploadWindow` answers it
 * from the same Monday-start week the rest of the app uses, and the cell
 * carries the answer as `canUpload`. These guard the wiring -- the arithmetic
 * itself is src/data/uploadWindow.test.ts.
 */

test('the cell carries a canUpload of its own, not just a status', () => {
  assert.match(src, /canUpload: boolean;/,
    'DayCell no longer records whether the day may offer an upload');
});

test('canUpload is derived from the shared window, not computed in the strip', () => {
  assert.match(src, /canUpload: offersUpload\(dateIso, todayIso\)/,
    'the day cells no longer ask uploadWindow which days may offer an upload');
});

test('the window module is the one the specs cover', () => {
  assert.match(src, /import \{ offersUpload \} from '\.\.\/\.\.\/src\/data\/uploadWindow';/);
});

test('the button is gated on that window as well as on the awaiting state', () => {
  const gate = strip.slice(strip.lastIndexOf('const waiting =', uploadAt));
  assert.match(gate, /const waiting = d\.key === 'awaiting' && d\.canUpload;/,
    'the upload button is drawn for an awaiting day the file cannot exist for yet');
});

test('the visibility is not a UI-only test of the step counter', () => {
  // `weekOffset === 0` would answer "is this the current week" a second time,
  // in the render, from a counter rather than from the calendar -- and it
  // would still offer Sunday's button on Monday.
  assert.doesNotMatch(strip, /weekOffset === 0/,
    'the strip decides the current week from the arrow counter');
});

test('the screen reads the clock once, and the strip shares it', () => {
  assert.match(src, /const todayIso = iso\(new Date\(\)\);/,
    'the course screen no longer holds one todayIso for the strip');
});

test('a day whose file cannot exist yet keeps its icon in the cell', () => {
  // Same branch as an uploaded day: `waiting` is now "awaiting AND
  // pressable", so a future day falls through to the icon rather than
  // leaving the slot empty. Colour is never the only signal (guardrail 3).
  const cell = strip.slice(selectAt, uploadAt);
  assert.match(cell, /waiting \? null : <Icon name=\{tone\.icon\}/,
    'a day with nothing to press draws no status icon either');
});
