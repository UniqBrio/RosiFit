/**
 * Cases for the mapping between 0067's seven rows and the seven cells the
 * course strip draws.
 *
 * Run: npx tsx --test src/data/courseWeekDays.test.ts
 *
 * `supabase/tests/48_course_week_day_status.sql` proves the FUNCTION counts
 * correctly — that a day everybody missed is uploaded, that a reset day is not,
 * that 'extra' reads as present, that another course cannot leak in. None of
 * that is re-asserted here; a mapping spec that re-tests the database is a
 * spec that will disagree with it.
 *
 * What is here is the half that lives in TypeScript and can go wrong on its
 * own: a short answer being accepted, a null count reaching a cell as NaN, and
 * the order the days come back in.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mapCourseWeekDays, WEEK_DAYS, ShortWeekError, type CourseDayRow } from './courseWeekDays';

const row = (over: Partial<CourseDayRow> = {}): CourseDayRow => ({
  day: '2026-09-07', uploaded: true,
  present_count: 12, absent_count: 3, expected_count: 15, runs: true,
  ...over,
});

/** A whole week, dated from the Monday, with per-day overrides. */
const week = (over: Partial<CourseDayRow>[] = []): CourseDayRow[] =>
  Array.from({ length: 7 }, (_, i) => row({
    day: `2026-09-${String(7 + i).padStart(2, '0')}`, ...(over[i] ?? {}),
  }));

test('seven rows in, seven cells out, in the order they arrived', () => {
  const cells = mapCourseWeekDays(week());
  assert.equal(cells.length, WEEK_DAYS);
  assert.deepEqual(cells.map(c => c.day), [
    '2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10',
    '2026-09-11', '2026-09-12', '2026-09-13',
  ]);
});

test('A SHORT ANSWER IS A FAILED READ, never a small week', () => {
  /*
   * The defect this exists for. The function generates its own days with
   * generate_series(0, 6), so six rows is not "a week with six days in it" —
   * something went wrong. Accepting it would hand the strip five uploaded
   * days and two it knows nothing about, and the two would render "Awaiting
   * upload", which is RC-039 arriving through the fix for RC-039.
   *
   * Throwing puts the strip into Load failed instead: honest, visible, and
   * retryable (src/data/dayLoad.ts).
   */
  for (const n of [0, 1, 6]) {
    assert.throws(() => mapCourseWeekDays(week().slice(0, n)),
      (e: unknown) => e instanceof ShortWeekError,
      `${n} rows must be refused — only seven is an answer`);
  }
  // And a LONG answer too, which is the same claim pointing the other way.
  // `week().slice(0, 8)` would have been a silent no-op on a 7-element array —
  // it was, on this spec's first run, and the case passed by never running.
  assert.throws(() => mapCourseWeekDays([...week(), row({ day: '2026-09-14' })]),
    (e: unknown) => e instanceof ShortWeekError,
    'eight rows is not a week either');
});

test('and the failure says how many it got, so the next reader is not guessing', () => {
  assert.throws(() => mapCourseWeekDays(week().slice(0, 5)),
    (e: unknown) => /returned 5 rows, expected 7/.test(String(e)));
});

test('a null count reaches the cell as 0, never as NaN', () => {
  /*
   * `count(*) filter (...)` cannot be null, so this is not about today's
   * function — it is about the cell. `Number(undefined)` is NaN, NaN renders
   * as "NaN" beside a date, and that reads as a defect in the academy's
   * attendance rather than in this mapping.
   */
  const [cell] = mapCourseWeekDays(week([
    { present_count: null, absent_count: null, expected_count: null },
  ]));
  assert.deepEqual(
    { present: cell.present, absent: cell.absent, expected: cell.expected },
    { present: 0, absent: 0, expected: 0 });
});

test('counts arriving as strings are numbers by the time a cell adds them up', () => {
  // PostgREST serialises bigint as a string. These are ::int and arrive as
  // numbers, but a cell that does `present + absent` on "12" and "3" shows
  // "123", which is the kind of wrong that looks plausible.
  const [cell] = mapCourseWeekDays(week([
    { present_count: '12' as unknown as number, absent_count: '3' as unknown as number },
  ]));
  assert.equal(cell.present + cell.absent, 15);
});

test('uploaded is carried through untouched — it is the database\'s answer, not a count', () => {
  /*
   * The one thing this mapping must NOT be clever about. "Uploaded" is the
   * existence of records; deriving it here from present > 0 would be a second
   * derivation of a rule the function already holds, and it would be wrong on
   * exactly the day it matters — production's Tuesday 8 Sep, 42 present
   * against 217 absent, and a day where nobody attended at all.
   */
  const cells = mapCourseWeekDays(week([
    { uploaded: true, present_count: 0, absent_count: 217 },
    { uploaded: false, present_count: 0, absent_count: 0 },
    { uploaded: true, present_count: 0, absent_count: 0 },
  ]));
  assert.deepEqual(cells.slice(0, 3).map(c => c.uploaded), [true, false, true]);
});

test('runs is carried through untouched too', () => {
  const cells = mapCourseWeekDays(week([{ runs: true }, { runs: false }]));
  assert.deepEqual(cells.slice(0, 2).map(c => c.runs), [true, false]);
});

test('THE MAPPING INVENTS NOTHING — every field traces to one the row carried', () => {
  // A guard against a later "helpful" addition: a derived percentage, a
  // formatted date, a status word. The strip reads STATUS through dayLoad;
  // a second opinion about the same day, computed here, is how a cell and
  // the card under it start disagreeing.
  const [cell] = mapCourseWeekDays(week());
  assert.deepEqual(Object.keys(cell).sort(),
    ['absent', 'day', 'expected', 'present', 'runs', 'uploaded']);
});
