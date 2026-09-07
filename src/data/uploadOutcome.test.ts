/**
 * WHAT THE UPLOAD SAYS ABOUT A FILE IT HAS SEEN BEFORE.
 *
 * Run: npx tsx --test src/data/uploadOutcome.test.ts
 *
 * The requester: *"Improve the feedback when a user uploads the same CSV
 * again without any changes. Currently, the system does not provide enough
 * information. If the CSV was already imported and all attendance is already
 * marked, clearly tell the user that there is nothing new to update ... If a
 * file contains a combination of existing and new records, provide useful
 * feedback about what was added, skipped, or updated."*
 *
 * The three uploads that request names are the three sections below:
 * DUPLICATE (the same file, nothing to do), PARTLY DUPLICATE (some rows
 * already marked, some not), and NEW (a day the register has never seen).
 * The database half -- that none of them can write a second attendance row
 * for one member on one day -- is supabase/tests/33_reimport_feedback.sql;
 * these are the sentences she reads on the screen.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  alreadyImportedWords, nothingChanged, noChangeWords, changeSummary,
  type AlreadyImported, type ImportChanges,
} from './uploadOutcome';

/** the screen's own formatter, mirrored: '2026-08-31' -> 'Mon 31 Aug' */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DOW[new Date(y, m - 1, d).getDay()]} ${d} ${MON[m - 1]}`;
};
const ctx = { fileName: 'meet-31-aug.csv', course: 'Prenatal Flow · Coimbatore', label };

const imported: AlreadyImported = {
  file_name: 'meet-31-aug.csv',
  completed_at: '2026-09-01T04:00:00Z',
  session_date: '2026-08-31',
  course_name: 'Prenatal Flow', branch_name: 'Coimbatore', same_course: true,
  marked: 12, register_live: true,
};

// ------------------------------------------------------------- DUPLICATE
test('the same file again says there is nothing to update, in the requester s words', () => {
  const words = alreadyImportedWords(imported, ctx);
  assert.equal(words.title, 'Nothing to update');
  // HER SENTENCE, verbatim. It is the answer to the question that makes
  // somebody upload a file twice -- "did the first one work?" -- and if this
  // assertion has to be edited, that answer is being re-worded.
  assert.equal(words.lines[0],
    'File already imported. Attendance is already marked and there is nothing to update.');
  // and then the evidence for it, so the sentence can be checked rather than
  // taken on trust
  assert.equal(words.lines[1],
    'meet-31-aug.csv was imported for Prenatal Flow · Coimbatore — the Mon 31 Aug register — '
    + 'and 12 members are marked present on it now. Importing it again would mark exactly '
    + 'the same people.');
  assert.equal(words.lines.length, 2);
  assert.equal(words.note, 'Nothing was written, and no attendance record was duplicated.');
});

test('one member marked reads as one member', () => {
  const words = alreadyImportedWords({ ...imported, marked: 1 }, ctx);
  assert.match(words.lines[1], /and 1 member is marked present on it now/);
});

test('a file RosiFit filed under another name says which name', () => {
  // She picked meet-31-aug.csv; the copy already imported was saved as
  // something else. Same bytes, so the same file -- and she has to be able
  // to find the one RosiFit has.
  const words = alreadyImportedWords({ ...imported, file_name: 'attendance (3).csv' }, ctx);
  assert.match(words.lines[1],
    /^meet-31-aug\.csv was imported for Prenatal Flow · Coimbatore — the Mon 31 Aug register \(RosiFit has it as attendance \(3\)\.csv\) —/);
});

test('a file already imported for ANOTHER course says so outright', () => {
  // The fingerprint is unique across the whole table, so "already imported"
  // can be true of a course she is not looking at. Without this line she
  // goes hunting on the wrong register.
  const words = alreadyImportedWords(
    { ...imported, course_name: 'Postnatal Care', branch_name: 'Velachery', same_course: false },
    ctx);
  assert.equal(words.lines.length, 3);
  assert.equal(words.lines[2],
    'That is not the course you have open: nothing about this file has touched '
    + 'Prenatal Flow · Coimbatore.');
});

test('"attendance is already marked" is NOT said when nothing is marked', () => {
  // Somebody changed every mark by hand since. The comforting sentence would
  // be false, and false in a way she can check in two taps.
  const words = alreadyImportedWords({ ...imported, marked: 0 }, ctx);
  assert.equal(words.title, 'Already imported, but nobody is marked on that day');
  assert.doesNotMatch(words.lines.join(' '), /nothing to update/i);
  assert.match(words.lines[0], /nobody is marked present on it now/);
  // and it says what to do instead, because there IS something to do here
  assert.match(words.lines[1], /Mark her on the Mon 31 Aug roster, or export Mon 31 Aug again/);
});

test('and not when the register it wrote has been deleted', () => {
  const words = alreadyImportedWords({ ...imported, register_live: false, marked: 0 }, ctx);
  assert.equal(words.title, 'Already imported, and the register is gone');
  assert.match(words.lines[0], /that register has since been deleted/);
  assert.match(words.lines[1], /Export Mon 31 Aug again from Meet/);
});

// ------------------------------------------- THE SAME CLASS, EXPORTED AGAIN
// A second export of one class is a different FILE -- Meet writes a new one
// every time -- so the fingerprint misses, the import runs, and it writes a
// register that already says exactly what it says.
test('a run that moved nothing is reported as nothing, not as an import', () => {
  const changes: ImportChanges = { added: 0, updated: 0, unchanged: 12, absent_added: 0 };
  assert.equal(nothingChanged(changes, { reverted: 0, removed: 0, kept_by_hand: 0 }), true);

  const words = noChangeWords(changes,
    { day: '2026-08-31', course: 'Prenatal Flow · Coimbatore', label });
  assert.equal(words.title, 'Nothing to update');
  assert.equal(words.lines[0],
    'Every name in this file was already marked on the Mon 31 Aug register for '
    + 'Prenatal Flow · Coimbatore. 12 members matched what RosiFit already had, so nothing '
    + 'was added, changed or duplicated.');
  assert.equal(words.note,
    'A member cannot be in her own session twice — one attendance record per member per day.');
});

test('anything that moved is NOT nothing', () => {
  const none = { reverted: 0, removed: 0, kept_by_hand: 0 };
  assert.equal(nothingChanged({ added: 1, updated: 0, unchanged: 11, absent_added: 0 }, none), false);
  assert.equal(nothingChanged({ added: 0, updated: 1, unchanged: 11, absent_added: 0 }, none), false);
  // a member due today who had no row at all now has one: the register moved
  assert.equal(nothingChanged({ added: 0, updated: 0, unchanged: 12, absent_added: 3 }, none), false);
  // and so does an override taking somebody an earlier file marked back off
  assert.equal(nothingChanged({ added: 0, updated: 0, unchanged: 12, absent_added: 0 },
    { reverted: 2, removed: 0, kept_by_hand: 0 }), false);
  assert.equal(nothingChanged({ added: 0, updated: 0, unchanged: 12, absent_added: 0 },
    { reverted: 0, removed: 1, kept_by_hand: 0 }), false);
});

test('a mark kept by hand is not, on its own, a change', () => {
  // kept_by_hand counts what the import DID NOT touch. Reading it as a change
  // would report "the register moved" about the one row that provably did not.
  assert.equal(nothingChanged({ added: 0, updated: 0, unchanged: 12, absent_added: 0 },
    { reverted: 0, removed: 0, kept_by_hand: 4 }), true);
});

test('a server that does not count changes is never read as "nothing changed"', () => {
  // A project still on the previous commit_csv_import answers without the
  // key. Absence of evidence is not evidence, so the screen falls back to
  // the result it always showed.
  assert.equal(nothingChanged(null, { reverted: 0, removed: 0, kept_by_hand: 0 }), false);
  assert.equal(changeSummary(null), null);
});

// ------------------------------------------------------ PARTLY DUPLICATE
test('a file of new AND existing rows says what was added, updated and skipped', () => {
  assert.equal(changeSummary({ added: 3, updated: 2, unchanged: 9, absent_added: 4 }),
    '3 names added to the register; 2 already on it were updated by this file; '
    + '9 already marked exactly as this file says were skipped, not written twice; '
    + '4 due and not in the file were recorded absent.');
});

test('and says only the parts that happened', () => {
  assert.equal(changeSummary({ added: 0, updated: 0, unchanged: 0, absent_added: 0 }), null);
  assert.equal(changeSummary({ added: 5, updated: 0, unchanged: 0, absent_added: 0 }),
    '5 names added to the register.');
  // one of each, agreeing with itself
  assert.equal(changeSummary({ added: 1, updated: 1, unchanged: 1, absent_added: 1 }),
    '1 name added to the register; 1 already on it was updated by this file; '
    + '1 already marked exactly as this file says was skipped, not written twice; '
    + '1 due and not in the file was recorded absent.');
});

// -------------------------------------------------------------- A NEW FILE
test('a first import for a day says what it added and claims nothing was skipped', () => {
  const changes: ImportChanges = { added: 12, updated: 0, unchanged: 0, absent_added: 5 };
  assert.equal(nothingChanged(changes, { reverted: 0, removed: 0, kept_by_hand: 0 }), false);
  assert.equal(changeSummary(changes),
    '12 names added to the register; 5 due and not in the file were recorded absent.');
});
