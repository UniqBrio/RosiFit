/**
 * Cases for the rule RC-039 broke: "not uploaded" is a claim only a COMPLETED
 * read may make.
 *
 * Run: npx tsx --test src/data/dayLoad.test.ts
 *
 * The bug these are written against had no failing signal of any kind. The
 * read returned `200`, a thousand rows and `error: null`; the screen received
 * a well-formed array; every type was satisfied; and four uploaded days said
 * "Awaiting upload". The only thing that was wrong was an INFERENCE, so an
 * inference is what these pin.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayLoad, dayStatusKey } from './dayLoad';
import { STATUS } from '../theme/tokens';

const runs = { present: 0, absent: 0, runsToday: true };

test('THE DEFECT: a FAILED read never reads as a day nobody uploaded', () => {
  // The whole thing in two lines. `attendance.data` is null on an error, so
  // `?? []` hands the strip an empty week -- which is exactly what a week
  // nobody has uploaded looks like.
  const load = dayLoad('error', false);
  assert.equal(load, 'failed');
  assert.notEqual(load, 'not-uploaded');
  assert.equal(dayStatusKey(load, runs), 'failed');
  assert.notEqual(dayStatusKey(load, runs), 'awaiting',
    'a day the app could not read must never wear the word for a day nobody uploaded');
});

test('a read still in flight is not a day nobody uploaded either', () => {
  assert.equal(dayLoad('loading', false), 'loading');
  assert.equal(dayStatusKey('loading', runs), 'none',
    'a loading cell is not drawn, but it must not be carrying a business word if it ever is');
});

test('a SUCCESSFUL read with no records for the day IS awaiting upload', () => {
  // The other half, and the half that must keep working: the state is real,
  // it is the one the Upload action exists for, and it must not be lost to
  // caution about the state above.
  assert.equal(dayLoad('ready', false), 'not-uploaded');
  assert.equal(dayStatusKey('not-uploaded', runs), 'awaiting');
});

test('a successful read with no records on a day the course does not run is NOT expected', () => {
  assert.equal(dayStatusKey('not-uploaded', { ...runs, runsToday: false }), 'none');
});

test('an uploaded day reads from what was recorded, not from how many', () => {
  assert.equal(dayLoad('ready', true), 'uploaded');
  assert.equal(dayStatusKey('uploaded', { present: 12, absent: 3, runsToday: true }), 'present');
  assert.equal(dayStatusKey('uploaded', { present: 0, absent: 9, runsToday: true }), 'absent',
    'a day everybody missed is an absent day, not an empty one');
  assert.equal(dayStatusKey('uploaded', { present: 1, absent: 0, runsToday: false }), 'present',
    'a register that exists is a register that exists, schedule or no schedule');
});

test('the four states are exhaustive, and no two of them draw the same', () => {
  const keys = (['loading', 'uploaded', 'not-uploaded', 'failed'] as const)
    .map(l => dayStatusKey(l, runs));
  assert.deepEqual(keys, ['none', 'present', 'awaiting', 'failed']);
});

test('LOAD FAILED CARRIES ITS OWN WORD AND ITS OWN ICON (guardrail 3)', () => {
  /*
   * Colour is never the only signal here. A pink strip and a yellow strip are
   * the same strip to a reader who sees neither, and "the app could not read
   * this" and "nobody has uploaded this" are opposite instructions: one says
   * try again, the other says go and upload.
   */
  const failed = STATUS.failed;
  const awaiting = STATUS.awaiting;
  assert.equal(failed.word, 'Load failed');
  assert.notEqual(failed.word, awaiting.word);
  assert.notEqual(failed.icon, awaiting.icon);
  assert.notEqual(failed.fgDark, awaiting.fgDark);
  assert.notEqual(failed.fgLight, awaiting.fgLight);
  // and not the other red-ish thing on the same row
  assert.notEqual(failed.fgDark, STATUS.absent.fgDark);
  assert.notEqual(failed.fgLight, STATUS.absent.fgLight);
});

test('THE UPLOAD BUTTON FALLS OUT OF THE MAPPING, with no clause of its own', () => {
  /*
   * The strip draws its "Awaiting upload" press for `key === 'awaiting'` and
   * its "Upload again" press for present/absent. Neither can be true of a day
   * the app could not read, and that is not luck -- it is why dayStatusKey
   * refuses to map `failed` or `loading` onto a business word. A day whose
   * register may or may not already hold a file must not be offered one:
   * the upload screen would have to unpick it afterwards.
   */
  for (const load of ['failed', 'loading'] as const) {
    const key = dayStatusKey(load, runs);
    assert.ok(!['awaiting', 'present', 'absent'].includes(key),
      `a ${load} day must wear none of the three keys that carry an upload press, got ${key}`);
  }
});
