/**
 * Cases for the attendance-distribution figures the dashboard donut draws.
 *
 * Run: npx tsx --test src/data/distribution.test.ts
 *
 * The chart's own caption promises "one source, so the chart and the report
 * cannot disagree" (C-87). These are that promise. Every failure here is
 * silent in the worst way: the ring renders, the legend adds up, and it
 * describes a population nobody chose -- which is precisely the drift
 * guardrail 1 exists to prevent, shown to the academy owner as a picture.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { distribution, FULL_WEEK_SESSIONS } from './followup';
import type { Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', name: 'Test Member',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—', ...over,
});

test('an empty list is three zeros, not a divide by nothing', () => {
  assert.deepEqual(distribution([]), { attended: 0, missed: 0, notExpected: 0 });
});

test('a full-schedule member with perfect attendance has nothing not-expected', () => {
  assert.deepEqual(
    distribution([member({ expected: 6, attended: 6 })]),
    { attended: 6, missed: 0, notExpected: 0 });
});

test('a REDUCED schedule counts as not-expected, never as missed', () => {
  // The one this segment exists for: a member on a 4-day override has 2 not
  // expected. Fold those into `missed` and she is indistinguishable from a
  // 6-day member who skipped twice -- and she gets chased for it.
  assert.deepEqual(
    distribution([member({ expected: 4, attended: 4 })]),
    { attended: 4, missed: 0, notExpected: 2 });
});

test('a real absence IS missed', () => {
  assert.deepEqual(
    distribution([member({ expected: 6, attended: 4 })]),
    { attended: 4, missed: 2, notExpected: 0 });
});

test('a reduced schedule AND an absence are counted separately', () => {
  assert.deepEqual(
    distribution([member({ expected: 4, attended: 3 })]),
    { attended: 3, missed: 1, notExpected: 2 });
});

test('attending more than expected is an extra, never a negative miss', () => {
  // Without the clamp this member subtracts 1 from somebody else's absence,
  // and the chart quietly under-reports the academy's misses.
  assert.deepEqual(
    distribution([member({ expected: 3, attended: 5 })]),
    { attended: 5, missed: 0, notExpected: 3 });
});

test('one extra does not cancel another member’s real absence', () => {
  const d = distribution([
    member({ id: 'a', expected: 3, attended: 5 }),   // 2 more than due
    member({ id: 'b', expected: 6, attended: 4 }),   // 2 genuinely missed
  ]);
  assert.equal(d.missed, 2);
});

test('a member expected at nothing is entirely not-expected', () => {
  // Enrolled with no running schedule. She is listed and counted (C-76), and
  // she must not appear as six missed sessions.
  assert.deepEqual(
    distribution([member({ expected: 0, attended: 0 })]),
    { attended: 0, missed: 0, notExpected: FULL_WEEK_SESSIONS });
});

test('the figures are a SUM over the list, so the filters reach the chart', () => {
  // The dashboard narrows `members` by branch and course before calling this.
  // Summing is what makes the narrowed label and the narrowed number describe
  // the same population.
  const two = distribution([
    member({ id: 'a', expected: 6, attended: 5 }),
    member({ id: 'b', expected: 6, attended: 3 }),
  ]);
  assert.deepEqual(two, { attended: 8, missed: 4, notExpected: 0 });
});

test('a longer full week is a parameter, not a hardcoded 6', () => {
  // A seven-day academy must not show every member as one session short.
  assert.deepEqual(
    distribution([member({ expected: 7, attended: 7 })], 7),
    { attended: 7, missed: 0, notExpected: 0 });
});
