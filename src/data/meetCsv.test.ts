/**
 * Cases for reading a Google Meet attendance export.
 *
 * Run: npx tsx --test src/data/meetCsv.test.ts
 *
 * The first block is a defect, not a feature: this parser read lines[0] as
 * the header, and a real Meet export does not begin with the table. It
 * begins with the meeting code and the created/ended times. So a genuine
 * file was refused with "that file has no Full Name column" -- the reader
 * was wrong and the message blamed the file, which is the worst possible
 * combination for somebody uploading attendance at 9pm.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMeetCsv, parseMinutes, CSV_REQUIRED_COLUMN } from './meetCsv';

/** A real-shaped export: preamble, blank line, then the table. */
const WITH_PREAMBLE = [
  'Meeting code,abc-defg-hij',
  'Created at,2026-08-22 17:55:00',
  'Ended at,2026-08-22 19:10:00',
  '',
  'Full Name,First Seen,Time in Call',
  'Divya Ramesh,5:58 PM,52 min',
  'Aarthi Venkat,6:01 PM,1 hr 3 min',
].join('\n');

/** The shape the old parser assumed: header first, no preamble. */
const HEADER_FIRST = [
  'Full Name,First Seen,Time in Call',
  'Divya Ramesh,5:58 PM,52 min',
].join('\n');

// ------------------------------------------------------- reading the table
test('a REAL export with a preamble is read, not refused', () => {
  const f = parseMeetCsv(WITH_PREAMBLE);
  assert.equal(f.rows.length, 2);
  assert.equal(f.rows[0].full_name, 'Divya Ramesh');
  assert.equal(f.rows[1].minutes_in_call, 63);
});

test('the preamble lines are counted, not silently swallowed', () => {
  // 4 lines precede the header once the blank is dropped by the filter... the
  // blank does not survive, so the header sits at index 3.
  assert.equal(parseMeetCsv(WITH_PREAMBLE).skipped, 3);
});

test('a file that DOES start with the header still works', () => {
  const f = parseMeetCsv(HEADER_FIRST);
  assert.equal(f.skipped, 0);
  assert.equal(f.rows.length, 1);
});

test('a preamble row is never mistaken for a member', () => {
  // The one that would corrupt an import: "Meeting code" imported as a person.
  const names = parseMeetCsv(WITH_PREAMBLE).rows.map(r => r.full_name);
  assert.deepEqual(names, ['Divya Ramesh', 'Aarthi Venkat']);
});

// -------------------------------------------------------------- the meta
test('the meeting code is captured, because it is the only evidence of WHICH meeting', () => {
  assert.equal(parseMeetCsv(WITH_PREAMBLE).meta.code, 'abc-defg-hij');
});

test('created and ended times are captured verbatim', () => {
  const { meta } = parseMeetCsv(WITH_PREAMBLE);
  assert.equal(meta.created, '2026-08-22 17:55:00');
  assert.equal(meta.ended, '2026-08-22 19:10:00');
});

test('a file with no preamble reports null meta rather than inventing it', () => {
  // The upload screen shows "mapped to this session" from these. A guessed
  // code would claim the file matches a meeting nobody can check.
  assert.deepEqual(parseMeetCsv(HEADER_FIRST).meta,
    { code: null, created: null, ended: null });
});

test('an unquoted timestamp split across commas is rejoined, not truncated', () => {
  // Half a date is worse than no date: it would read as a mismatch.
  const f = parseMeetCsv([
    'Created at,Sat 22 Aug 2026, 5:55 PM',
    'Full Name,Time in Call',
    'A,10 min',
  ].join('\n'));
  assert.equal(f.meta.created, 'Sat 22 Aug 2026, 5:55 PM');
});

// ------------------------------------------------------------- the refusal
test('a file with no name column is still refused, and says what is expected', () => {
  assert.throws(() => parseMeetCsv('Email,Duration\na@b.com,10'),
    new RegExp(CSV_REQUIRED_COLUMN));
});

test('an empty file is refused as empty', () => {
  assert.throws(() => parseMeetCsv('   \n\n'), /empty/i);
});

test('a preamble-only file is refused -- there is no table in it', () => {
  assert.throws(() => parseMeetCsv('Meeting code,abc-defg-hij\nCreated at,x'),
    new RegExp(CSV_REQUIRED_COLUMN));
});

// ------------------------------------------------------------ the columns
test('a quoted name containing a comma stays one member', () => {
  const f = parseMeetCsv('Full Name,Time in Call\n"Sundaram, Meenakshi",30 min');
  assert.equal(f.rows.length, 1);
  assert.equal(f.rows[0].full_name, 'Sundaram, Meenakshi');
});

test('a nameless row is skipped rather than imported as a blank member', () => {
  const f = parseMeetCsv('Full Name,Time in Call\n,30 min\nDivya,20 min');
  assert.deepEqual(f.rows.map(r => r.full_name), ['Divya']);
});

test('columns are found by NAME, so Meet reordering them changes nothing', () => {
  const f = parseMeetCsv('Time in Call,Full Name,First Seen\n52 min,Divya,5:58 PM');
  assert.equal(f.rows[0].full_name, 'Divya');
  assert.equal(f.rows[0].minutes_in_call, 52);
  assert.equal(f.rows[0].first_seen, '5:58 PM');
});

// ----------------------------------------------------------- the durations
test('every duration shape Meet has used reads as whole minutes', () => {
  assert.equal(parseMinutes('52 min'), 52);
  assert.equal(parseMinutes('1 hr 3 min'), 63);
  assert.equal(parseMinutes('0:52:14'), 52);
  assert.equal(parseMinutes('45'), 45);
});

test('an unreadable duration is 0, so the 15-minute rule drops it', () => {
  // Importing a row whose duration nobody could read is worse than dropping
  // it: it becomes attendance evidence with no basis.
  assert.equal(parseMinutes('ages'), 0);
  assert.equal(parseMinutes(''), 0);
});

// -------------------------------------------------- the file's own date
import { meetCreatedDate, meetMatchesSession } from './meetCsv';

test('an ISO timestamp gives its date', () => {
  assert.equal(meetCreatedDate('2026-08-22 17:55:00'), '2026-08-22');
});

test('a written date gives the LOCAL day, not a UTC-shifted one', () => {
  // An evening session must not be filed under the next day. This is the bug
  // toISOString would introduce anywhere east of UTC -- which is everywhere
  // this product runs.
  assert.equal(meetCreatedDate('Aug 22, 2026, 11:30 PM'), '2026-08-22');
});

test('an unreadable line is null, never a guessed date', () => {
  assert.equal(meetCreatedDate('some time last week'), null);
  assert.equal(meetCreatedDate(null), null);
  assert.equal(meetCreatedDate(''), null);
});

test('a matching file and session agree', () => {
  assert.equal(meetMatchesSession('2026-08-22 17:55:00', '2026-08-22'), true);
});

test('the WRONG file is caught -- this is the case the panel exists for', () => {
  assert.equal(meetMatchesSession('2026-08-21 17:55:00', '2026-08-22'), false);
});

test('an unknown date is null, not false', () => {
  // Warning when nothing can be checked trains people to click past the
  // warning that matters.
  assert.equal(meetMatchesSession(null, '2026-08-22'), null);
  assert.equal(meetMatchesSession('gibberish', '2026-08-22'), null);
  assert.equal(meetMatchesSession('2026-08-22', null), null);
});

test('a session date carrying a time still compares by day', () => {
  assert.equal(meetMatchesSession('2026-08-22 17:55:00', '2026-08-22T18:00:00Z'), true);
});
