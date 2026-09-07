/**
 * What the upload asks before it writes, and what it says when it asks.
 *
 * Run: npx tsx --test src/data/uploadOverride.test.ts
 *
 * The requester's case, in her own words: *"if i am uploading attendance file
 * by selecting date as 3rd sep and i am uploading a csv file in which date is
 * 31 aug show pop up that the uploaded session is for 31aug on upload it will
 * override the 31st aug attendance record on click confirm override thats
 * all"* — requests/2026-09-07-upload-override-confirm.md.
 *
 * Two things are pinned here and neither is decoration:
 *   * an ORDINARY import still asks nothing (round 3's whole shape), and
 *   * the clash-only wording is round 3's, byte for byte, because a string
 *     that shipped is not re-written by a change nobody asked to re-write it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { importAsk, askWords, overrideSummary } from './uploadOverride';

/** the screen's own formatter, mirrored: '2026-08-31' -> 'Mon 31 Aug' */
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const label = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${DOW[new Date(y, m - 1, d).getDay()]} ${d} ${MON[m - 1]}`;
};
const ctx = { fileName: 'meet-31-aug.csv', course: 'Prenatal Flow · Coimbatore', label };
const already = { file_name: 'meet-31-aug-first.csv', completed_at: '2026-09-01T04:00:00Z' };

test('an ordinary import asks nothing at all', () => {
  // The day she opened IS the day in the file, and no register exists for it.
  // This is the case that must never grow a dialog: "directly import data no
  // confirmation" is round 3's request and it still binds.
  assert.equal(importAsk({
    fileDay: '2026-08-31', openedDay: '2026-08-31', supersedes: null,
  }), null);
});

test('and neither does one opened without choosing a day', () => {
  // From the course header or the Attendance tab there is no chosen day, so
  // there is nothing for the file to disagree with.
  assert.equal(importAsk({ fileDay: '2026-08-31', openedDay: null, supersedes: null }), null);
});

test('a file for another day is asked about, in round 3 s words exactly', () => {
  const ask = importAsk({ fileDay: '2026-08-31', openedDay: '2026-09-03', supersedes: null });
  assert.ok(ask);
  assert.equal(ask.clashWith, '2026-09-03');
  assert.equal(ask.overrides, null);

  const words = askWords(ask, ctx);
  assert.equal(words.title, 'This file is from Mon 31 Aug');
  assert.equal(words.lines.length, 1);
  // BYTE FOR BYTE what app/upload.tsx rendered before this change. If this
  // assertion has to be edited, a shipped string is being re-worded and that
  // is a product change, not a refactor.
  assert.equal(words.lines[0],
    'You opened Thu 3 Sep. meet-31-aug.csv says it covers Mon 31 Aug, so importing it '
    + 'updates the Mon 31 Aug register for Prenatal Flow · Coimbatore — not Thu 3 Sep.');
  assert.equal(words.note,
    'The day always comes from the file, never from the screen. Nothing has been written yet.');
  assert.equal(words.confirm, 'Import for Mon 31 Aug');
  assert.equal(words.cancel, 'Choose another file');
});

test('the requester s own case: 3 Sep opened, a 31 Aug file, and 31 Aug already has a register', () => {
  const ask = importAsk({
    fileDay: '2026-08-31', openedDay: '2026-09-03', supersedes: already,
  });
  assert.ok(ask);
  assert.equal(ask.clashWith, '2026-09-03');
  assert.equal(ask.overrides, 'meet-31-aug-first.csv');

  const words = askWords(ask, ctx);
  // ONE ask, carrying BOTH facts -- "on click confirm override thats all".
  assert.equal(words.title, 'This file overrides the Mon 31 Aug register');
  assert.equal(words.lines.length, 2);
  assert.match(words.lines[0], /^You opened Thu 3 Sep\./);
  assert.equal(words.lines[1],
    'meet-31-aug-first.csv was already imported for Prenatal Flow · Coimbatore on Mon 31 Aug. '
    + 'Importing meet-31-aug.csv OVERRIDES that register: the Mon 31 Aug attendance you have '
    + 'now is replaced by what this file says, and nobody is counted twice.');
  // The requester's word, and round 3's rule that the day is on the button.
  assert.equal(words.confirm, 'Override the Mon 31 Aug register');
});

test('a re-upload for the day she opened is still an override, and still asked', () => {
  // No clash at all -- same day -- but the register exists, so the ask is
  // owed. This is the "re uploading same csv with modified data" half.
  const ask = importAsk({
    fileDay: '2026-08-31', openedDay: '2026-08-31', supersedes: already,
  });
  assert.ok(ask);
  assert.equal(ask.clashWith, null);

  const words = askWords(ask, ctx);
  assert.equal(words.title, 'Mon 31 Aug already has a register');
  assert.equal(words.lines.length, 1);
  assert.match(words.lines[0], /OVERRIDES that register/);
  assert.equal(words.confirm, 'Override the Mon 31 Aug register');
});

test('an override says out loud what it will not take back', () => {
  const ask = importAsk({ fileDay: '2026-08-31', openedDay: null, supersedes: already });
  assert.ok(ask);
  // set_attendance (0035) is the only other way a mark gets there, and a
  // person who corrected the register by hand has to know an override leaves
  // her correction standing -- before she agrees to it.
  assert.equal(askWords(ask, ctx).note,
    'Marks you made by hand on the roster are kept. Nothing has been written yet.');
});

test('what the override did is reported, or not mentioned at all', () => {
  assert.equal(overrideSummary(null), null);
  assert.equal(overrideSummary({ reverted: 0, removed: 0, kept_by_hand: 0 }), null);
  assert.equal(overrideSummary({ reverted: 1, removed: 0, kept_by_hand: 0 }),
    '1 member the previous file marked present is now absent.');
  assert.equal(overrideSummary({ reverted: 3, removed: 0, kept_by_hand: 2 }),
    '3 members the previous file marked present are now absent; '
    + '2 marks made by hand on the roster were kept.');
  assert.equal(overrideSummary({ reverted: 0, removed: 1, kept_by_hand: 0 }),
    '1 person who was not expected and is not in this file is off the register.');
  // The plural agrees with itself, which "2 records for somebody" did not.
  assert.equal(overrideSummary({ reverted: 0, removed: 2, kept_by_hand: 0 }),
    '2 people who were not expected and are not in this file are off the register.');
});
