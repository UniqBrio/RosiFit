/**
 * The "based on period" figures — expected and attended per sub-range.
 *
 * WHY THIS IS ITS OWN LAYER
 * A trend beside a total is only believable if the two are counted the same
 * way. So a bucket is not a second query shape: it is `member_period_metrics`
 * — the function the donut, the member report and the course bars all read —
 * run over a shorter range, keeping the MEMBER id so the branch and course
 * filters reach the trend as well. The dashboard this replaces carried a
 * week-by-week table that had to admit in its own caption that the filters
 * did not reach it; that caption is what this file exists to make untrue.
 *
 * The arithmetic lives here rather than in the screen because that promise —
 * the bars sum to the ring — is exactly the kind of claim a render body
 * cannot be tested for.
 */
import type { Member } from './mock';

/** One member's figures inside one bucket. The shape `member_period_metrics`
 *  returns, narrowed to the two columns a bar needs. */
export type MemberMetric = { member_id: string; expected: number; attended: number };

export type BucketMetrics = {
  /** the bucket's own short label, from src/data/period.ts */
  label: string;
  from: string;
  to: string;
  metrics: MemberMetric[];
};

/**
 * One bucket's totals, counted over ONLY the members the filters left.
 *
 * The id set is the whole point: the screen narrows its member list by branch
 * and course once, and every section — ring, member bars, course bars and
 * these — is summed from that same narrowed set.
 */
export function bucketTotals(bucket: BucketMetrics, ids: Set<string>):
  { expected: number; attended: number } {
  let expected = 0, attended = 0;
  for (const m of bucket.metrics) {
    if (!ids.has(m.member_id)) continue;
    expected += m.expected;
    // Attending more than was due is an extra, not a negative absence — the
    // same clamp distribution() applies, for the same reason.
    attended += Math.min(m.attended, m.expected);
  }
  return { expected, attended };
}

/* ------------------------------------------------------------- the fixture
 *
 * Offline, there is no `member_period_metrics` to ask, and the member fixture
 * carries ONE pair of figures for the whole period. So the fixture SPLITS
 * those figures across the buckets rather than inventing new ones: every
 * bucket's expected sums back to her expected, every bucket's attended sums
 * back to her attended, and the trend on screen therefore agrees with the
 * ring above it in demo mode exactly as it does against a live database.
 *
 * Deterministic, because a chart that reshuffles on every render cannot be
 * compared with a screenshot of itself.
 */

/**
 * `total` split over slots with per-slot CEILINGS, summing to exactly
 * `min(total, sum(caps))` and never exceeding a ceiling.
 *
 * The ceiling is what keeps the fixture honest: attended can never exceed
 * expected in a bucket, or a bar would draw a green segment longer than the
 * track it sits in. Pass a ceiling of `total` per slot when there is nothing
 * to cap -- that is the expected count being divided up.
 *
 * The weights are what stop it front-loading. An even split with the
 * remainder to the earliest slots put every member's whole week into Monday,
 * Tuesday and Wednesday and left Thursday to Sunday at zero -- a cliff that
 * reads as "this academy runs three days a week", which is a fact about the
 * splitting and not about the fixture.
 */
export function spread(total: number, caps: number[], seed: number): number[] {
  const n = caps.length;
  if (n === 0) return [];
  const room = caps.reduce((a, b) => a + b, 0);
  let left = Math.max(0, Math.min(total, room));

  // A deterministic weight per slot, so the demo shows a shape rather than a
  // flat line. 1..5 keeps the variation visible without burying a slot.
  const weight = (i: number) => 1 + ((seed * 7 + i * 13) % 5);
  const weightSum = Array.from({ length: n }, (_, i) => weight(i)).reduce((a, b) => a + b, 0);

  const out = caps.map((cap, i) => {
    const want = Math.floor((left * weight(i)) / weightSum);
    return Math.max(0, Math.min(cap, want));
  });
  left -= out.reduce((a, b) => a + b, 0);

  // Whatever rounding and the ceilings left over, handed out one at a time to
  // whichever slot still has room. Terminates because `left` never exceeds
  // the room remaining.
  for (let step = 0; left > 0 && step < n * (Math.max(...caps, 0) + 1); step++) {
    const i = (seed + step) % n;
    if (out[i] < caps[i]) { out[i]++; left--; }
  }
  return out;
}

export function bucketFixture(buckets: { from: string; to: string; label: string }[],
  members: Member[]): BucketMetrics[] {
  const per = buckets.map(b => ({ ...b, metrics: [] as MemberMetric[] }));
  members.forEach((m, index) => {
    // Her expected count spread over the buckets, then her attendance spread
    // within THAT -- so no bucket can show her attending a session it does
    // not also show her being due at.
    const expected = spread(m.expected, new Array(buckets.length).fill(m.expected), index * 2 + 1);
    const attended = spread(Math.min(m.attended, m.expected), expected, index + 1);
    per.forEach((bucket, i) => {
      bucket.metrics.push({ member_id: m.id, expected: expected[i], attended: attended[i] });
    });
  });
  return per;
}
