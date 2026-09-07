/**
 * What the academy is told after a removal -- all four outcomes.
 *
 * Run: npx tsx --test src/data/memberRemoval.test.ts
 *
 * These exist because the deletion is the one write the app cannot undo, and
 * because three of its four outcomes are ones nobody meets by hand: she was
 * already gone, the write only reached the offline fixture list, or it was
 * refused. Each of those reads like success if the sentence is wrong, and the
 * whole point of `delete_member` returning what it did (0044) is that the
 * sentence does not have to guess.
 *
 * The tone assertions are not cosmetic. `ok` is claimed by exactly one
 * outcome; anything else is `warn`, because a removal that did not really
 * happen must not look like one that did.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { removalOutcome, removalFailure, firstName } from './memberRemoval';

const real = { attendanceKept: 3, alreadyDeleted: false };

/* ------------------------------------------------------- the happy outcome */

test('a real deletion names her, counts what was kept, and is the only ok', () => {
  const out = removalOutcome('Priya Raman', real, 'live');
  assert.equal(out.message, 'Priya removed, 3 attendance records kept');
  assert.equal(out.tone, 'ok');
});

test('one kept record is singular -- "1 attendance records" is how a toast looks unread', () => {
  const out = removalOutcome('Priya Raman', { attendanceKept: 1, alreadyDeleted: false }, 'live');
  assert.equal(out.message, 'Priya removed, 1 attendance record kept');
  assert.equal(out.tone, 'ok');
});

test('none kept says 0 rather than going quiet -- a member who never attended', () => {
  // Silence here would read as a count that failed rather than a count of none.
  const out = removalOutcome('Priya Raman', { attendanceKept: 0, alreadyDeleted: false }, 'live');
  assert.equal(out.message, 'Priya removed, 0 attendance records kept');
  assert.equal(out.tone, 'ok');
});

/* ------------------------------------------------- the three unhappy ones */

test('a second tap says she had already gone, and is NOT ok', () => {
  // Two taps on a slow connection is not a failure a person needs to read
  // about -- but it is not a fresh removal either, and must not be dressed as
  // one. delete_member is idempotent precisely so this branch is reachable.
  const out = removalOutcome('Priya Raman', { attendanceKept: 3, alreadyDeleted: true }, 'live');
  assert.equal(out.message, 'Priya had already been removed');
  assert.equal(out.tone, 'warn');
});

test('offline, the sentence says the academy database was not touched', () => {
  const out = removalOutcome('Priya Raman', real, 'fixtures');
  assert.equal(out.message,
    'Priya removed on this device only. The academy database is not configured.');
  assert.equal(out.tone, 'warn');
});

test('already-gone beats the source -- a second tap offline is not congratulated', () => {
  // The order of the two checks is the assertion. If `source` were tested
  // first, a repeat tap against fixtures would claim a removal that removed
  // nothing.
  const out = removalOutcome('Priya Raman', { attendanceKept: 0, alreadyDeleted: true }, 'fixtures');
  assert.equal(out.message, 'Priya had already been removed');
  assert.equal(out.tone, 'warn');
});

test('the kept count is never quoted on an outcome that did not keep anything', () => {
  // Both unhappy branches are handed a non-zero attendanceKept and neither
  // repeats it: a number in a sentence about a deletion that did not happen
  // is a claim about records nobody touched.
  for (const out of [
    removalOutcome('Priya Raman', real, 'fixtures'),
    removalOutcome('Priya Raman', { attendanceKept: 3, alreadyDeleted: true }, 'live'),
  ]) {
    assert.ok(!out.message.includes('3'), `leaked the kept count: ${out.message}`);
  }
});

/* ------------------------------------------------------------ the refusal */

test('a refusal shows the reason the repository already made readable', () => {
  // The lapsed-subscription branch of deleteMember, and the guard
  // 33_delete_member_subscription_gate.sql pins on the database side.
  const out = removalFailure(new Error(
    'She could not be removed — the subscription has to be active. Nothing has been changed.'));
  assert.equal(out.message,
    'She could not be removed — the subscription has to be active. Nothing has been changed.');
  assert.equal(out.tone, 'warn');
});

test('something thrown that is not an Error still says nothing has been changed', () => {
  // After a destructive action that failed, the first question is not what
  // went wrong but whether it went half-way.
  const out = removalFailure('websocket closed');
  assert.equal(out.message, 'She could not be removed. Nothing has been changed.');
  assert.equal(out.tone, 'warn');
});

test('no outcome is ever silent', () => {
  const outs = [
    removalOutcome('Priya Raman', real, 'live'),
    removalOutcome('Priya Raman', real, 'fixtures'),
    removalOutcome('Priya Raman', { attendanceKept: 0, alreadyDeleted: true }, 'live'),
    removalFailure(new Error('x')),
    removalFailure(null),
  ];
  for (const out of outs) assert.ok(out.message.trim().length > 0);
});

/* -------------------------------------------------------------- her name */

test('a toast addresses her by her first name', () => {
  assert.equal(firstName('Priya Raman'), 'Priya');
});

test('a single-word name is its own first name', () => {
  assert.equal(firstName('Lakshmi'), 'Lakshmi');
  assert.equal(removalOutcome('Lakshmi', real, 'live').message,
    'Lakshmi removed, 3 attendance records kept');
});

test('a stray leading space does not produce a nameless toast', () => {
  // A name arriving off an imported file is not always trimmed, and
  // " Priya".split(' ')[0] is the empty string -- which would have shipped
  // " removed, 3 attendance records kept".
  assert.equal(firstName('  Priya Raman'), 'Priya');
  assert.equal(firstName('Priya   Raman'), 'Priya');
});

test('a blank name stays blank rather than becoming undefined', () => {
  assert.equal(firstName(''), '');
  assert.equal(firstName('   '), '');
});
