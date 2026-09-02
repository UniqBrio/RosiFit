/**
 * Cases for schedule-version selection.
 *
 * Run: npx tsx --test src/data/schedule.test.ts
 *
 * Every failure here is silent. Pick the wrong version of an offering's
 * weekdays and nothing throws, nothing looks wrong, and every screen agrees
 * with every other screen -- because they all read the same wrong answer. The
 * damage shows up as expected attendance counted against days the offering
 * does not run, which surfaces as a follow-up list that is wrong weeks later.
 *
 * The SQL cases in supabase/tests/12_offering_schedule.sql cannot see this
 * class: by the time rows exist in the database the windows are already
 * correct, and the question here is which of them the CLIENT then reads.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { inForceOn, currentSchedules, type ScheduleWindow } from './schedule';

const win = (over: Partial<ScheduleWindow> = {}): ScheduleWindow => ({
  offering_id: 'o1', weekdays: [1, 3, 5],
  effective_from: '2026-09-07', effective_to: null, ...over,
});

test('a version that starts today is already in force', () => {
  // The boundary that matters on the day somebody sets a schedule: "from
  // today" has to mean today, or the change appears to do nothing until
  // tomorrow and gets set a second time.
  assert.equal(inForceOn(win({ effective_from: '2026-09-07' }), '2026-09-07'), true);
});

test('a version that starts tomorrow is not in force yet', () => {
  assert.equal(inForceOn(win({ effective_from: '2026-09-08' }), '2026-09-07'), false);
});

test('a version ENDING today is still in force -- both ends are inclusive', () => {
  // 0005 stores the window as daterange(from, to, '[]') and 0018 closes a
  // superseded row at new_start - 1. Treating effective_to as exclusive would
  // leave the changeover day covered by NEITHER version: one day on which
  // every member is expected at nothing, and no error anywhere.
  assert.equal(inForceOn(win({ effective_to: '2026-09-07' }), '2026-09-07'), true);
});

test('a version that ended yesterday is not in force', () => {
  assert.equal(inForceOn(win({ effective_to: '2026-09-06' }), '2026-09-07'), false);
});

test('an open-ended version stays in force indefinitely', () => {
  assert.equal(inForceOn(win({ effective_to: null }), '2030-01-01'), true);
});

test('the version in force is the one returned, not the first row seen', () => {
  const rows = [
    win({ effective_from: '2026-09-07', effective_to: '2026-09-30', weekdays: [1, 3, 5] }),
    win({ effective_from: '2026-10-01', effective_to: null, weekdays: [2, 4, 6] }),
  ];
  const got = currentSchedules(rows, '2026-10-15').get('o1');
  assert.deepEqual(got?.weekdays, [2, 4, 6]);
});

test('reading an EARLIER date returns the earlier version -- history is not rewritten', () => {
  const rows = [
    win({ effective_from: '2026-09-07', effective_to: '2026-09-30', weekdays: [1, 3, 5] }),
    win({ effective_from: '2026-10-01', effective_to: null, weekdays: [2, 4, 6] }),
  ];
  const got = currentSchedules(rows, '2026-09-15').get('o1');
  assert.deepEqual(got?.weekdays, [1, 3, 5]);
});

test('row order does not decide the answer', () => {
  // The exclusion constraint in 0005 means a real tie is unreachable, so this
  // is guarding the CLIENT's resolution rather than the data: an inline loop
  // that simply overwrites its map returns whichever row arrived last, and
  // PostgREST makes no order promise without an explicit sort.
  const older = win({ effective_from: '2026-09-07', effective_to: null, weekdays: [1, 3, 5] });
  const newer = win({ effective_from: '2026-10-01', effective_to: null, weekdays: [2, 4, 6] });
  assert.deepEqual(currentSchedules([older, newer], '2026-10-15').get('o1')?.weekdays, [2, 4, 6]);
  assert.deepEqual(currentSchedules([newer, older], '2026-10-15').get('o1')?.weekdays, [2, 4, 6],
    'the same rows in the other order must give the same schedule');
});

test('an offering with no version in force is absent, not empty-weekdayed', () => {
  // "No schedule" and "a schedule with no days" are different states and the
  // UI says different things about them. Collapsing them would report an
  // offering as running zero days a week, which reads as a configured
  // schedule that expects nobody rather than one nobody has set yet.
  const rows = [win({ effective_from: '2026-11-01' })];
  assert.equal(currentSchedules(rows, '2026-09-07').has('o1'), false);
});

test('two offerings are resolved independently', () => {
  const rows = [
    win({ offering_id: 'o1', weekdays: [1, 3, 5] }),
    win({ offering_id: 'o2', weekdays: [2, 4] }),
  ];
  const got = currentSchedules(rows, '2026-09-07');
  assert.deepEqual(got.get('o1')?.weekdays, [1, 3, 5]);
  assert.deepEqual(got.get('o2')?.weekdays, [2, 4]);
});
