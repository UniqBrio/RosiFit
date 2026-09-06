/**
 * Cases for the attendance-distribution figures the Overview ring draws.
 *
 * Run: npx tsx --test src/data/distribution.test.ts
 *
 * The chart's own caption promises "one source, so the chart and the report
 * cannot disagree" (C-87). These are that promise. Every failure here is
 * silent in the worst way: the ring renders, the legend adds up, and it
 * describes a population nobody chose -- which is precisely the drift
 * guardrail 1 exists to prevent, shown to the academy owner as a picture.
 *
 * WHY THIS SPEC CHANGED SHAPE
 * It used to assert a third figure, `notExpected`, sized `6 - expected`
 * against a fixed full week. That category is gone by request
 * (requests/2026-09-06-overview-filters-and-sections.md): it was never an
 * outcome of a session, only a correction for a denominator that counted the
 * whole week instead of what was expected of the members being counted.
 *
 * The cases it protected did NOT go with it. Every one of them -- the reduced
 * schedule, the member expected at nothing, the extra attendance -- is still
 * here, asserting the property that made "not expected" necessary in the
 * first place: a member is never shown as having missed a session she was
 * not due at.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { distribution } from './followup';
import type { Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null,   status: 'active',
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—', joined: 'Mar 2026', ...over,
});

test('an empty list is two zeros, not a divide by nothing', () => {
  assert.deepEqual(distribution([]), { attended: 0, missed: 0 });
});

test('a full-schedule member with perfect attendance is all present', () => {
  assert.deepEqual(
    distribution([member({ expected: 6, attended: 6 })]),
    { attended: 6, missed: 0 });
});

test('a REDUCED schedule is not an absence', () => {
  // The case the old "not expected" segment existed for. A member on a 4-day
  // override who came all four times has missed NOTHING -- she must not be
  // indistinguishable from a 6-day member who skipped twice, and she must
  // not be chased for it. The denominator is her four, so she reads 100%.
  assert.deepEqual(
    distribution([member({ expected: 4, attended: 4 })]),
    { attended: 4, missed: 0 });
});

test('a real absence IS missed', () => {
  assert.deepEqual(
    distribution([member({ expected: 6, attended: 4 })]),
    { attended: 4, missed: 2 });
});

test('a reduced schedule counts only the sessions she was actually due at', () => {
  assert.deepEqual(
    distribution([member({ expected: 4, attended: 3 })]),
    { attended: 3, missed: 1 });
});

test('attending more than expected never counts past what was expected', () => {
  // Without the clamp the ring's present share exceeds its own denominator
  // and the chart draws more than a full circle of green.
  assert.deepEqual(
    distribution([member({ expected: 3, attended: 5 })]),
    { attended: 3, missed: 0 });
});

test('one extra does not cancel another member’s real absence', () => {
  const d = distribution([
    member({ id: 'a', expected: 3, attended: 5 }),   // 2 more than due
    member({ id: 'b', expected: 6, attended: 4 }),   // 2 genuinely missed
  ]);
  assert.equal(d.missed, 2);
  assert.equal(d.attended, 7);
});

test('a member expected at nothing contributes nothing either way', () => {
  // Enrolled with no running schedule. She is listed and counted (C-76), and
  // she must appear as neither six missed sessions nor six attended ones.
  assert.deepEqual(
    distribution([member({ expected: 0, attended: 0 })]),
    { attended: 0, missed: 0 });
});

test('a member expected at nothing does not drag the whole ring down', () => {
  // The property that replaces the "not expected" segment: she adds 0 to
  // both figures, so the percentage is the OTHER members' attendance and not
  // a share of a week nobody was scheduled for.
  const d = distribution([
    member({ id: 'a', expected: 0, attended: 0 }),
    member({ id: 'b', expected: 4, attended: 4 }),
  ]);
  assert.deepEqual(d, { attended: 4, missed: 0 });
});

test('the figures are a SUM over the list, so the filters reach the chart', () => {
  // The dashboard narrows `members` by branch and course before calling this.
  // Summing is what makes the narrowed label and the narrowed number describe
  // the same population.
  const two = distribution([
    member({ id: 'a', expected: 6, attended: 5 }),
    member({ id: 'b', expected: 6, attended: 3 }),
  ]);
  assert.deepEqual(two, { attended: 8, missed: 4 });
});

test('a seven-day academy needs no parameter to be counted correctly', () => {
  // The old signature took a `perWeek` argument only to size "not expected".
  // With the expected count as the denominator, a seven-day week is just a
  // larger expected and needs telling nothing.
  assert.deepEqual(
    distribution([member({ expected: 7, attended: 7 })]),
    { attended: 7, missed: 0 });
});
