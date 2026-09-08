/**
 * Several Meet files in one upload: which run, how they group, what is said.
 *
 * Run: npx tsx --test src/data/uploadBatch.test.ts
 *
 * The requester's two files -- 4:48:06 PM and 4:48:17 PM, different meeting
 * codes, same day -- were REFUSED by the first cut of this module, which read
 * two files for one day as two exports of one class. Her correction:
 *
 *   "multiple files upload for a day is possible as they have different
 *    meeting codes because each day there can be n number meetings and i am
 *    uploading attendnace of all at one go"
 *
 * So the load-bearing claim here is that same-day files GROUP into one
 * register rather than being set aside. The rest guards the two refusals that
 * remain (no date, future date), the order she reads things in, and the words.
 * One assertion per test, so a failure names its own claim.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planBatch, mergedFileName, mergedNote, batchAskWords, batchHeading,
} from './uploadBatch';

/* The requester's own day. */
const TODAY = '2026-09-08';
const label = (d: string) => `[${d}]`;

const A = { fileName: 'meeting_9-8-2026_4-48-06 PM_bwv-pbdv-krh.csv', day: '2026-09-08' };
const B = { fileName: 'meeting_9-8-2026_4-48-17 PM_zko-zkeo-jts.csv', day: '2026-09-08' };
const C = { fileName: 'meeting_9-7-2026_6-00-00 PM_aaa-bbbb-ccc.csv', day: '2026-09-07' };

/* ------------------------------------------- n meetings in a day is normal */

test('two files for one day are ONE group, not two set-asides', () => {
  const plan = planBatch([A, B], TODAY, label);
  assert.equal(plan.ready.length, 1);
});

test('the group names both files, in the order she picked them', () => {
  const plan = planBatch([A, B], TODAY, label);
  assert.deepEqual(plan.ready[0].fileNames, [A.fileName, B.fileName]);
});

test('a same-day pair sets NOTHING aside', () => {
  // The first cut set both aside with "upload the one you want". That is the
  // defect this file exists to keep shut.
  assert.equal(planBatch([A, B], TODAY, label).setAside.length, 0);
});

test('different days are different groups', () => {
  const plan = planBatch([A, C], TODAY, label);
  assert.deepEqual(plan.ready.map(g => g.day), ['2026-09-08', '2026-09-07']);
});

test('days come out in the order they first appeared, not sorted', () => {
  // She picked C (the 7th) first, then A and B (the 8th). The result is read
  // top to bottom as the list she made.
  const plan = planBatch([C, A, B], TODAY, label);
  assert.deepEqual(plan.ready.map(g => g.day), ['2026-09-07', '2026-09-08']);
});

test('a single file is a group of one', () => {
  assert.deepEqual(planBatch([A], TODAY, label).ready, [{ day: '2026-09-08', fileNames: [A.fileName] }]);
});

/* --------------------------------------------- the two refusals that remain */

test('a file with no readable date is set aside, and says so', () => {
  const plan = planBatch([{ fileName: 'undated.csv', day: null }], TODAY, label);
  assert.match(plan.setAside[0].reason, /no “Created on” line/);
});

test('a file dated tomorrow is set aside as a future date', () => {
  const plan = planBatch([{ fileName: 'tomorrow.csv', day: '2026-09-09' }], TODAY, label);
  assert.match(plan.setAside[0].reason, /a future date/);
});

test('a set-aside file never joins a group', () => {
  const plan = planBatch([A, { fileName: 'undated.csv', day: null }, B], TODAY, label);
  assert.deepEqual(plan.ready[0].fileNames, [A.fileName, B.fileName]);
});

test('set-asides keep pick order among themselves', () => {
  const plan = planBatch([
    { fileName: 'first-bad.csv', day: null },
    A,
    { fileName: 'second-bad.csv', day: '2026-09-30' },
  ], TODAY, label);
  assert.deepEqual(plan.setAside.map(s => s.fileName), ['first-bad.csv', 'second-bad.csv']);
});

test('today is allowed in a batch, exactly as it is alone', () => {
  assert.equal(planBatch([A], TODAY, label).setAside.length, 0);
});

/* ------------------------------------------------ what the merge is called */

test('a merged import is filed under every name, joined', () => {
  // The receipt, the override warning and the audit log all read this. "and
  // 1 other" would send somebody looking for a file it declined to name.
  assert.equal(mergedFileName([A.fileName, B.fileName]), `${A.fileName} + ${B.fileName}`);
});

test('one file is filed under its own name, unchanged', () => {
  assert.equal(mergedFileName([A.fileName]), A.fileName);
});

test('a single file has no merged note', () => {
  assert.equal(mergedNote([A.fileName], '2026-09-08', label), null);
});

test('a merged day says how many meetings and names them', () => {
  assert.match(String(mergedNote([A.fileName, B.fileName], '2026-09-08', label)),
    /^Merged from 2 meetings on \[2026-09-08\]: .*bwv-pbdv-krh.*zko-zkeo-jts/);
});

test('a merged day says that a woman in two calls is present once', () => {
  assert.match(String(mergedNote([A.fileName, B.fileName], '2026-09-08', label)),
    /marked present once\.$/);
});

/* ------------------------------------------------------- the one batch ask */

const OVERRIDE = { fileName: A.fileName, day: '2026-09-08', replaces: 'older.csv' };

test('one override reads in the singular', () => {
  assert.equal(batchAskWords([OVERRIDE], { course: 'Postnatal · Main', total: 3, label }).title,
    '1 of these files replaces a register');
});

test('two overrides read in the plural', () => {
  const two = [OVERRIDE, { ...OVERRIDE, fileName: C.fileName, day: '2026-09-07' }];
  assert.equal(batchAskWords(two, { course: 'Postnatal · Main', total: 3, label }).title,
    '2 of these files replace a register');
});

test('the ask names each file, its day and what it replaces', () => {
  const words = batchAskWords([OVERRIDE], { course: 'Postnatal · Main', total: 3, label });
  assert.equal(words.lines[1], `${A.fileName} → [2026-09-08], replacing older.csv.`);
});

test('the ask says how many OTHER files land on clear days', () => {
  const words = batchAskWords([OVERRIDE], { course: 'Postnatal · Main', total: 3, label });
  assert.match(words.lines[words.lines.length - 1], /^The other 2 files land on days/);
});

test('when every file overrides, there is no sentence about "the other 0 files"', () => {
  const words = batchAskWords([OVERRIDE], { course: 'Postnatal · Main', total: 1, label });
  assert.equal(words.lines.some(l => /The other 0/.test(l)), false);
});

test('one confirm covers the whole upload', () => {
  assert.equal(batchAskWords([OVERRIDE], { course: 'Postnatal · Main', total: 3, label }).confirm,
    'Import all 3 files');
});

test('the batch ask keeps the single-file override’s promise, word for word', () => {
  assert.equal(batchAskWords([OVERRIDE], { course: 'Postnatal · Main', total: 3, label }).note,
    'Marks you made by hand on the roster are kept. Nothing has been written yet.');
});

/* ------------------------------------------------------------- the heading */

test('a batch that wrote nothing says so, and still names the course', () => {
  assert.equal(batchHeading(0, 0, 'Postnatal · Main'), 'Nothing imported · Postnatal · Main');
});

test('the heading counts files and days, singular when one', () => {
  assert.equal(batchHeading(1, 1, 'Postnatal · Main'), 'Imported 1 file · 1 day · Postnatal · Main');
});

test('two files merged into one day read as two files, one day', () => {
  // The requester's own case. "Imported 1 file" over the two she picked would
  // read as one lost.
  assert.equal(batchHeading(2, 1, 'Postnatal · Main'), 'Imported 2 files · 1 day · Postnatal · Main');
});
