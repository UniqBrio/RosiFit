/**
 * The rule that decides whether a member gets a schedule of her OWN.
 *
 * Written against the two ways the form can produce "every day the course
 * runs": the seeded default on the add form, which is not a choice, and a
 * hand-made selection on the edit form, which is.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { memberWeekdays } from './memberDays';

const COURSE = ['Mon', 'Wed', 'Fri'];

test('an untouched seeded row follows the course — no override is written', () => {
  assert.equal(memberWeekdays(['Mon', 'Wed', 'Fri'], COURSE, true), null);
});

test('the seeded row follows the course whatever order the chips came off and back on', () => {
  assert.equal(memberWeekdays(['Fri', 'Mon', 'Wed'], COURSE, true), null);
});

test('a narrower selection IS an override, as 1..7', () => {
  assert.deepEqual(memberWeekdays(['Mon', 'Fri'], COURSE, true), [1, 5]);
});

test('deselecting every day still means she follows the course', () => {
  assert.equal(memberWeekdays([], COURSE, true), null);
});

test('a hand-made full selection is kept — the edit form seeds nothing', () => {
  assert.deepEqual(memberWeekdays(['Mon', 'Wed', 'Fri'], COURSE, false), [1, 3, 5]);
});

test('a course with no days cannot produce a seeded follow — there is nothing to seed', () => {
  assert.deepEqual(memberWeekdays(['Mon'], [], true), [1]);
});

/**
 * Which days the row OPENS with -- the other half of the same rule.
 *
 * `memberWeekdays` answers what a row means when it is saved. This answers
 * what it must show when it opens, and the two have to agree: a row that
 * opens blank on a member who HAS days of her own reads as "she follows the
 * course" and saves as exactly that (RC-020).
 */
import { openingDays } from './memberDays';

test('with no days of her own, every day the course runs opens on', () => {
  assert.deepEqual(openingDays(COURSE, null), ['Mon', 'Wed', 'Fri']);
});

test('with days of her own, those are what opens on -- not the course', () => {
  assert.deepEqual(openingDays(COURSE, [1, 5]), ['Mon', 'Fri']);
});

test('a day of her own the course has since stopped running does not open on', () => {
  // her override was legal when it was written; 0018 closed that schedule
  // and opened a narrower one. The chip is disabled either way, so showing
  // it lit would be a state the form cannot save.
  assert.deepEqual(openingDays(['Mon', 'Wed'], [1, 5]), ['Mon']);
});

test('an override the course has outrun entirely leaves the row blank', () => {
  assert.deepEqual(openingDays(['Tue'], [1, 5]), []);
});

test('a course with no days opens nothing, with or without an override', () => {
  assert.deepEqual(openingDays([], null), []);
  assert.deepEqual(openingDays([], [1]), []);
});
