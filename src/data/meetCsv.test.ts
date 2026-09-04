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
import {
  parseMeetCsv, parseMinutes, CSV_REQUIRED_COLUMN,
  meetCreatedDate, meetCreatedTime, dedupeRows,
} from './meetCsv';

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
import { meetMatchesSession } from './meetCsv';

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

// ===================================================================
// The real export shape: a '*' marker column, and the label and value
// together in ONE cell. Against this file every meta field used to come back
// null -- the rows parsed, so nothing looked broken, while the file's only
// evidence of WHICH meeting and WHEN was silently discarded.
// ===================================================================
const REAL_EXPORT = [
  '*,Meet',
  '*,Meeting code: gzj-yhru-ehp',
  '*,Created on 2026-08-31 20:12:56',
  '*,Ended on 2026-08-31 20:15:25',
  'Full Name,First Seen,Time in Call',
  'RosiFit,2026-08-31 20:12:56,00:00:32',
  'UniqBotz Info,2026-08-31 20:12:58,00:02:28',
].join('\n');

test('the meeting code is read from a starred, single-cell preamble', () => {
  assert.equal(parseMeetCsv(REAL_EXPORT).meta.code, 'gzj-yhru-ehp');
});

test('created and ended are read from the same shape', () => {
  const { meta } = parseMeetCsv(REAL_EXPORT);
  assert.equal(meta.created, '2026-08-31 20:12:56');
  assert.equal(meta.ended, '2026-08-31 20:15:25');
});

test('the value keeps its own colons', () => {
  // Splitting "Created on 2026-08-31 20:12:56" at the first ':' yields the
  // time 12:56 and a date ending in 20. The label is matched by PREFIX.
  assert.equal(meetCreatedDate(parseMeetCsv(REAL_EXPORT).meta.created), '2026-08-31');
});

test('the header below four preamble lines is still found', () => {
  const p = parseMeetCsv(REAL_EXPORT);
  assert.equal(p.skipped, 4);
  assert.equal(p.rows.length, 2);
  assert.equal(p.rows[0].full_name, 'RosiFit');
});

test('the two-column preamble shape still works', () => {
  // The older export wrote "Meeting code","abc-defg-hij" across two cells.
  const p = parseMeetCsv([
    'Meeting code,abc-defg-hij',
    'Created on,2026-08-31 20:12:56',
    'Full Name,Time in Call',
    'Divya Ramesh,00:45:00',
  ].join('\n'));
  assert.equal(p.meta.code, 'abc-defg-hij');
  assert.equal(meetCreatedDate(p.meta.created), '2026-08-31');
});

// ------------------------------------------------------- meetCreatedTime
test('the clock time is read alongside the date', () => {
  assert.equal(meetCreatedTime('2026-08-31 20:12:56'), '20:12:56');
});

test('a 12-hour time is converted, both halves of the day', () => {
  assert.equal(meetCreatedTime('Aug 31, 2026, 5:55 PM'), '17:55:00');
  assert.equal(meetCreatedTime('Aug 31, 2026, 5:55 AM'), '05:55:00');
  assert.equal(meetCreatedTime('Aug 31, 2026, 12:05 AM'), '00:05:00');
  assert.equal(meetCreatedTime('Aug 31, 2026, 12:05 PM'), '12:05:00');
});

test('no clock in the line is null, NEVER midnight', () => {
  // A time nobody wrote is not 00:00:00. Recording it as such would put a
  // morning class at midnight and make two sessions on one day collide.
  assert.equal(meetCreatedTime('Created on 2026-08-31'), null);
  assert.equal(meetCreatedTime(null), null);
  assert.equal(meetCreatedTime(''), null);
});

test('an impossible clock is refused rather than wrapped', () => {
  assert.equal(meetCreatedTime('2026-08-31 99:99'), null);
});

// ------------------------------------------------------------ dedupeRows
const row = (full_name: string, minutes_in_call = 30) => ({ full_name, minutes_in_call });

test('a participant who rejoined is ONE row', () => {
  // Meet writes a line per JOIN. attendance_unique_live is one record per
  // member per session, so the second line would kill the whole import on a
  // unique violation -- for a perfectly normal file.
  const { rows, duplicates } = dedupeRows([row('Divya Ramesh'), row('Divya Ramesh')]);
  assert.equal(rows.length, 1);
  assert.deepEqual(duplicates, ['Divya Ramesh']);
});

test('the FIRST appearance is the one kept — it is when she arrived', () => {
  const { rows } = dedupeRows([
    { full_name: 'Divya Ramesh', first_seen: '20:00', minutes_in_call: 5 },
    { full_name: 'Divya Ramesh', first_seen: '20:40', minutes_in_call: 50 },
  ]);
  assert.equal(rows[0].first_seen, '20:00');
});

test('casing and doubled spaces are the same person', () => {
  const { rows, duplicates } = dedupeRows([row('Divya  R'), row('divya r'), row('DIVYA R')]);
  assert.equal(rows.length, 1);
  assert.equal(duplicates.length, 2);
});

test('two different people both survive', () => {
  const { rows, duplicates } = dedupeRows([row('Divya Ramesh'), row('Aarthi Venkat')]);
  assert.equal(rows.length, 2);
  assert.deepEqual(duplicates, []);
});

test('a blank name is dropped and is not counted as a duplicate', () => {
  const { rows, duplicates } = dedupeRows([row(''), row('   '), row('Divya Ramesh')]);
  assert.equal(rows.length, 1);
  assert.deepEqual(duplicates, []);
});

test('nothing in, nothing out', () => {
  assert.deepEqual(dedupeRows([]), { rows: [], duplicates: [] });
});


// ===================================================================
// THE REAL FILE, byte for byte.
//
// The previous fixture was copied from a SPREADSHEET VIEW of this export and
// was wrong in a way that passed: Excel shows the bullet in column A and the
// text in column B, so `*,Meeting code: …` looked right. The bytes are one
// quoted cell -- `"*     Meeting code: gzj-yhru-ehp"` -- and against those the
// parser returned null for every meta field, which disabled the upload with no
// way forward. Reconstructed here from the file itself, CRLF and BOM included,
// so this can never again be "fixed" against a picture of a file.
// ===================================================================
const REAL_FILE = '\uFEFF' + [
  '"*     Meet"',
  '"*     Meeting code: gzj-yhru-ehp"',
  '"*     Created on 2026-08-31 20:12:56"',
  '"*     Ended on 2026-08-31 20:15:25"',
  '"Full Name","First Seen","Time in Call"',
  '"RosiFit","2026-08-31 20:14:52","00:00:32"',
  '"UniqBotz Infotech","2026-08-31 20:12:57","00:02:28"',
].join('\r\n') + '\r\n';

test('the BOM does not become part of the first cell', () => {
  // Left in place it is the first character of the first field. Harmless while
  // the table starts on line 5; fatal for an export whose header is line 1,
  // where "Full Name" would fail to match on an invisible character.
  assert.doesNotThrow(() => parseMeetCsv(REAL_FILE));
});

test('CRLF line endings parse', () => {
  assert.equal(parseMeetCsv(REAL_FILE).rows.length, 2);
});

test('the bullet in front of the label does not hide it', () => {
  const { meta } = parseMeetCsv(REAL_FILE);
  assert.equal(meta.code, 'gzj-yhru-ehp');
  assert.equal(meta.created, '2026-08-31 20:12:56');
  assert.equal(meta.ended, '2026-08-31 20:15:25');
});

test('the session this file belongs to is derivable', () => {
  // This is the whole mechanism: no date, no import. The Process button is
  // disabled without it.
  const { meta } = parseMeetCsv(REAL_FILE);
  assert.equal(meetCreatedDate(meta.created), '2026-08-31');
  assert.equal(meetCreatedTime(meta.created), '20:12:56');
});

test('both attendees are read, whatever their time in call', () => {
  const { rows } = parseMeetCsv(REAL_FILE);
  assert.deepEqual(rows.map(r => r.full_name), ['RosiFit', 'UniqBotz Infotech']);
  // 32 seconds rounds to 0 minutes and 2m28s to 2. Both are recorded; neither
  // decides anything. Under the old 15-minute floor this file imported NOBODY.
  assert.deepEqual(rows.map(r => r.minutes_in_call), [0, 2]);
});

test('a bulleted "Meet" line is not mistaken for a meeting code', () => {
  // Line 1 is "*     Meet". `meeting|conference` must not match it, or the
  // code would be read as an empty value from the wrong line.
  assert.equal(parseMeetCsv(REAL_FILE).meta.code, 'gzj-yhru-ehp');
});

test('other bullet characters work too', () => {
  const p = parseMeetCsv([
    '"#  Meeting code: aaa-bbbb-ccc"',
    '"\u2022 Created on 2026-08-31 20:12:56"',
    '"Full Name","Time in Call"',
    '"Divya Ramesh","00:45:00"',
  ].join('\n'));
  assert.equal(p.meta.code, 'aaa-bbbb-ccc');
  assert.equal(meetCreatedDate(p.meta.created), '2026-08-31');
});
