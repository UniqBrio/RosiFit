import test from 'node:test';
import assert from 'node:assert/strict';
import { clampThreshold, MIN_THRESHOLD, MAX_THRESHOLD } from './followup';

// The follow-up threshold was hard-coded 4 in save_course (0022), in the
// values list, twice. A course running once or twice a week could therefore
// never reach it: the trigger read as switched ON in the form and was
// unreachable by arithmetic, so the course had no follow-up at all. 0030 makes
// the count the academy's, and these pin the bounds it may take.

test('the bounds are 1 and 7', () => {
  // Seven because a week has seven days: a weekly threshold above that can
  // never fire, which is the same defect as zero the other way up.
  assert.equal(MIN_THRESHOLD, 1);
  assert.equal(MAX_THRESHOLD, 7);
});

test('the stepper cannot go below one', () => {
  // Zero would flag every member who has missed nothing at all.
  assert.equal(clampThreshold(0), 1);
  assert.equal(clampThreshold(-3), 1);
});

test('the stepper cannot go above seven', () => {
  assert.equal(clampThreshold(8), 7);
  assert.equal(clampThreshold(99), 7);
});

test('every value in range is kept exactly', () => {
  for (let n = MIN_THRESHOLD; n <= MAX_THRESHOLD; n++) assert.equal(clampThreshold(n), n);
});

test('a stored value outside the range is pulled back in, not trusted', () => {
  // The form seeds from what the database holds, and 0009 put no CHECK on
  // these columns -- a row written before 0030, or by hand, can say anything.
  assert.equal(clampThreshold(12), 7);
  assert.equal(clampThreshold(0), 1);
});

test('a fraction rounds rather than sneaking through', () => {
  assert.equal(clampThreshold(3.4), 3);
  assert.equal(clampThreshold(3.6), 4);
});

test('a nonsense value falls back to four, the number this always used to be', () => {
  assert.equal(clampThreshold(Number.NaN), 4);
  assert.equal(clampThreshold(Number.POSITIVE_INFINITY), 4);
});
