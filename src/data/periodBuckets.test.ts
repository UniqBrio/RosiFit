/**
 * Cases for splitting a period into the sub-ranges the Overview trend draws.
 *
 * Run: npx tsx --test src/data/periodBuckets.test.ts
 *
 * A new file rather than an edit to an existing spec: src/data/period.ts had
 * none, and the properties here are the ones the "based on period" section
 * rests on. The critical one is the PARTITION — consecutive, no gap, no
 * overlap, clipped to the range at both ends. Break it and the bars quietly
 * cover a different span from the ring above them, which is exactly the
 * drift C-84 exists to stop, drawn as a picture nobody would question.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  periodBuckets, currentWeek, thisMonth, lastFourWeeks, customRange, parseISO,
} from './period';

/** Consecutive, gapless, inside the range, and covering all of it. */
function assertPartitions(range: { from: string; to: string }, buckets: { from: string; to: string }[]) {
  assert.ok(buckets.length > 0, 'a range with days in it must produce buckets');
  assert.equal(buckets[0].from, range.from, 'the first bucket starts where the range does');
  assert.equal(buckets[buckets.length - 1].to, range.to, 'the last bucket ends where the range does');
  for (const b of buckets) assert.ok(b.from <= b.to, `${b.from}..${b.to} runs backwards`);
  for (let i = 1; i < buckets.length; i++) {
    const prev = parseISO(buckets[i - 1].to)!;
    const next = parseISO(buckets[i].from)!;
    assert.equal(Math.round((next.getTime() - prev.getTime()) / 86400000), 1,
      `${buckets[i - 1].to} -> ${buckets[i].from} is not the next day`);
  }
}

test('a week is a bar per day', () => {
  const week = currentWeek(new Date(2026, 8, 2));       // Wed 2 Sep 2026
  const buckets = periodBuckets(week);
  assert.equal(buckets.length, 7);
  assertPartitions(week, buckets);
  assert.deepEqual(buckets.map(b => b.label),
    ['Mon 31', 'Tue 1', 'Wed 2', 'Thu 3', 'Fri 4', 'Sat 5', 'Sun 6']);
});

test('four weeks is a bar per week, not twenty-eight bars', () => {
  const range = lastFourWeeks(new Date(2026, 8, 2));
  const buckets = periodBuckets(range);
  assert.equal(buckets.length, 4);
  assertPartitions(range, buckets);
});

test('a month is a bar per week, clipped to the month at both ends', () => {
  const range = thisMonth(new Date(2026, 8, 15));       // 1..30 Sep 2026
  const buckets = periodBuckets(range);
  assertPartitions(range, buckets);
  // Sep 2026 starts on a Tuesday, so the first bucket is a part-week that
  // must NOT reach back into August -- a bar labelled September counting
  // August days is the whole failure this clipping prevents.
  assert.equal(buckets[0].from, '2026-09-01');
  assert.equal(buckets[0].to, '2026-09-06');
});

test('a single day is one bucket, and it is that day', () => {
  const range = customRange('2026-09-04', '2026-09-04');
  const buckets = periodBuckets(range);
  assert.equal(buckets.length, 1);
  assert.deepEqual([buckets[0].from, buckets[0].to], ['2026-09-04', '2026-09-04']);
});

test('a long range falls back to months rather than a hundred bars', () => {
  const range = customRange('2026-01-01', '2026-12-31');
  const buckets = periodBuckets(range);
  assert.equal(buckets.length, 12);
  assertPartitions(range, buckets);
  assert.equal(buckets[0].label, 'Jan 2026');
  assert.equal(buckets[11].label, 'Dec 2026');
});

test('a range that crosses a month keeps both month names in the label', () => {
  // "28-3 Sep" would read as a range inside September. The bar's label is the
  // only thing naming the days it counted.
  const buckets = periodBuckets(customRange('2026-08-24', '2026-09-13'));
  assert.equal(buckets[1].label, '31 Aug–6 Sep');
});

test('a backwards or unparseable range produces no buckets, never a wrong one', () => {
  assert.deepEqual(periodBuckets({ from: '2026-09-10', to: '2026-09-01', label: 'x' }), []);
  assert.deepEqual(periodBuckets({ from: '', to: '', label: 'x' }), []);
});

test('every bucket label is built from the bucket’s own two dates', () => {
  // The label and the query cannot describe different days, because there is
  // only one pair of dates in play (C-84).
  const buckets = periodBuckets(customRange('2026-09-01', '2026-09-03'));
  assert.deepEqual(buckets.map(b => b.label), ['Tue 1', 'Wed 2', 'Thu 3']);
});
