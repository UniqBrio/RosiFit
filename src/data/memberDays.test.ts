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
