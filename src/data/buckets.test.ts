/**
 * Cases for the "based on period" split.
 *
 * Run: npx tsx --test src/data/buckets.test.ts
 *
 * The Overview draws a ring and, under it, a bar per sub-range of the same
 * period. The single thing that makes those two readable together is that the
 * bars SUM to the ring — and the single thing that would make the screen lie
 * is if they did not. These are that arithmetic:
 *
 *   1. The buckets partition the period exactly (src/data/period.test.ts).
 *   2. Each bucket is summed over only the members the filters left.
 *   3. Offline, the fixture splits each member's own figures across the
 *      buckets rather than inventing new ones, so demo mode agrees with
 *      itself the same way live data does.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { bucketTotals, bucketFixture, spread, type BucketMetrics } from './buckets';
import { periodBuckets, currentWeek } from './period';
import type { Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null, status: 'active',
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—', joined: 'Mar 2026', ...over,
});

const bucket = (metrics: BucketMetrics['metrics']): BucketMetrics =>
  ({ label: 'Mon 1', from: '2026-09-01', to: '2026-09-01', metrics });

/* ------------------------------------------------------------ bucketTotals */

test('a bucket is summed over ONLY the members the filters left', () => {
  // The whole reason the member id travels with the figures. Narrow to one
  // branch and the trend must narrow with the ring, or the bars describe an
  // academy the label above them does not.
  const b = bucket([
    { member_id: 'a', expected: 3, attended: 2 },
    { member_id: 'b', expected: 3, attended: 3 },
  ]);
  assert.deepEqual(bucketTotals(b, new Set(['a'])), { expected: 3, attended: 2 });
});

test('a bucket nobody in the filtered set appears in is zero, not undefined', () => {
  const b = bucket([{ member_id: 'a', expected: 3, attended: 2 }]);
  assert.deepEqual(bucketTotals(b, new Set(['z'])), { expected: 0, attended: 0 });
});

test('attending more than expected never exceeds the bucket’s own track', () => {
  // A bar whose green segment is longer than the track it sits in is not a
  // rounding error, it is a chart drawing outside itself.
  const b = bucket([{ member_id: 'a', expected: 2, attended: 5 }]);
  assert.deepEqual(bucketTotals(b, new Set(['a'])), { expected: 2, attended: 2 });
});

/* ------------------------------------------------------------------ spread */

test('a spread hands out exactly the total and never breaches a ceiling', () => {
  for (const seed of [0, 1, 2, 3, 7]) {
    const caps = [3, 1, 4, 2];
    const out = spread(6, caps, seed);
    assert.equal(out.reduce((a, b) => a + b, 0), 6, `seed ${seed}`);
    out.forEach((v, i) => assert.ok(v >= 0 && v <= caps[i], `seed ${seed} slot ${i}: ${v} of ${caps[i]}`));
  }
});

test('a spread asked for more than there is room for fills the room and stops', () => {
  const out = spread(100, [2, 2], 1);
  assert.deepEqual(out, [2, 2]);
});

test('a spread is deterministic — the same inputs draw the same chart twice', () => {
  assert.deepEqual(spread(5, [4, 4, 4], 3), spread(5, [4, 4, 4], 3));
});

test('a spread does not front-load — it uses the whole range it was given', () => {
  // The failure this replaces: an even split with the remainder to the
  // earliest slots put every member's week into Mon/Tue/Wed and left Thu-Sun
  // at zero, which reads as an academy that runs three days a week.
  const out = spread(7, new Array(7).fill(7), 1);
  assert.equal(out.reduce((a, b) => a + b, 0), 7);
  assert.ok(out.slice(3).some(v => v > 0), `nothing landed after Wednesday: ${out.join(',')}`);
});

/* ----------------------------------------------------------- bucketFixture */

test('the fixture buckets sum back to each member’s own figures', () => {
  // The property that keeps demo mode honest: offline there is no
  // member_period_metrics to ask, so the fixture SPLITS what the member
  // fixture already says rather than inventing a second set of figures the
  // ring above would disagree with.
  const members = [
    member({ id: 'a', expected: 6, attended: 4 }),
    member({ id: 'b', expected: 5, attended: 5 }),
    member({ id: 'c', expected: 0, attended: 0 }),
  ];
  const buckets = bucketFixture(periodBuckets(currentWeek(new Date(2026, 8, 2))), members);

  for (const m of members) {
    const mine = buckets.flatMap(b => b.metrics.filter(x => x.member_id === m.id));
    assert.equal(mine.reduce((n, x) => n + x.expected, 0), m.expected, `${m.id} expected`);
    assert.equal(mine.reduce((n, x) => n + x.attended, 0), m.attended, `${m.id} attended`);
  }
});

test('no fixture bucket shows a member attending more than she was due', () => {
  const buckets = bucketFixture(
    periodBuckets(currentWeek(new Date(2026, 8, 2))),
    [member({ id: 'a', expected: 6, attended: 6 })]);
  for (const b of buckets) {
    for (const m of b.metrics) assert.ok(m.attended <= m.expected, `${b.label}: ${m.attended}/${m.expected}`);
  }
});

test('every fixture bucket carries every member, so a gap is a zero and not a missing row', () => {
  const buckets = bucketFixture(periodBuckets(currentWeek(new Date(2026, 8, 2))),
    [member({ id: 'a' }), member({ id: 'b' })]);
  for (const b of buckets) assert.deepEqual(b.metrics.map(m => m.member_id), ['a', 'b']);
});
