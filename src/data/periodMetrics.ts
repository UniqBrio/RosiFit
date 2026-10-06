/**
 * The one way to read `member_period_metrics` (T-016).
 *
 * The RPC returns one row per member. PostgREST caps every reply at
 * `db-max-rows` = 1,000 and calls it a success -- status 200, `error: null`,
 * exactly a thousand rows -- so a cut-off answer and a complete one are the
 * same reply. That is RC-039's mechanism again, one level up: RV-34's FIXED
 * verdict covers `supabase.from(` table reads and never reached an RPC.
 *
 * WHAT THE SHORT LIST COST. `fetchMembers` builds a map from these rows and
 * falls back to `metric?.expected ?? 0`, so every member past row 1,000 reads
 * 0 expected, 0 attended, 0 missed. Zero missed is never flagged, so that
 * member is never followed up and never mailed, and the card and the weekly
 * list agree with each other while both are wrong. The two summing callers
 * simply under-report. T-006 read 1,087 rows for the current week on
 * 17-Sep-2026: this is live.
 *
 * THIS IS A STOPGAP AND SAYS SO. Refusing is strictly better than a wrong
 * number, and it is all this does. The fix is T-042 -- `period_totals()`
 * server-side for the two summing callers, and a keyset `p_after_member_id`
 * for `fetchMembers` read through `pageAllByKey`. When that lands, this guard
 * stays as the backstop for anything that stops paging.
 *
 * It lives outside repository.ts because repository.ts cannot be imported
 * under node -- it reaches the Supabase client -- and a rule with no spec is
 * how the last one of these shipped.
 */
import { guardUntruncated, PAGE_SIZE, type KeysetQuery, type PageResult } from './pageAll';

/**
 * One member's figures for a period. The shape both RPCs answer with.
 *
 * `attendance_pct` and `extra` are optional here because neither caller reads
 * them: `repository.ts` takes these rows as its own narrower `MetricRow`
 * (`member_id`, `expected`, `attended`, `missed`), and PostgREST returns what
 * the function declares whether or not a type names it. Checked against the
 * shipped `0075` on 18-Sep-2026, which returns all six columns.
 */
export type PeriodMetricRow = {
  member_id: string;
  expected: number | null;
  attended: number | null;
  missed: number | null;
  attendance_pct?: number | null;
  extra?: number | null;
};

/**
 * The sentence the operator reads, and the reason it names figures rather
 * than mechanism: `TruncatedReadError` carries "Read it through pageAllByKey
 * or readBounded", which is an instruction to a developer and reaches a
 * person who tapped a tab (CP-003, A:F-25). repository.ts routes this through
 * `fail()`, which is the single place that turns a read failure into
 * something readable.
 */
export const PERIOD_METRICS_CONTEXT = 'The attendance figures for this period could not be read';

/**
 * The rows, or a throw. Never a short list.
 *
 * `error` is checked here as well as the ceiling, because one of the three
 * callers discarded it outright (`fetchWeekRows`, RV-18) and drew the failure
 * as a week in which the academy attended nothing. A read that did not happen
 * and a week with no attendance are different facts.
 */
export function readPeriodMetrics<T>(
  res: { data: T[] | null; error?: { message?: string } | null },
): T[] {
  if (res.error) throw new Error(res.error.message ?? 'the period metrics read did not answer');
  return guardUntruncated(res.data ?? [], 'the attendance figures for this period');
}

/**
 * `member_period_metrics_page` as something `pageAllByKey` can drive (T-042).
 *
 * The RPC pages by ARGUMENT — `p_after_member_id` and `p_limit` — where every
 * other read in `repository.ts` pages by PostgREST modifier, `.gt()` and
 * `.limit()`. Rather than teach the pager a second shape, this turns the one
 * into the other: `.gt(key, value)` becomes the id to start after, `.limit(n)`
 * becomes the row count, and `.order()` is accepted and ignored because the
 * function already returns its rows in `member_id` order and that ordering is
 * the contract the keyset depends on.
 *
 * Nothing here decides anything. It records what the pager asks for and hands
 * the RPC's own answer straight back, so the rules that matter — only an
 * EMPTY page ends a read, a page error takes the whole read down, a partial
 * list is never a success (RC-039) — stay in `pageAllByKey`, where they are
 * already specced, and there is no second copy of them to drift.
 *
 * WHY THE T-016 GUARD IS NOT ALSO APPLIED HERE. `PAGE_SIZE` is
 * `SUPABASE_MAX_ROWS`, so a full page and a truncated answer are the same
 * 1,000 rows: `guardUntruncated` over a page would throw on every full page,
 * and over the assembled result it would throw for an academy of exactly
 * 1,000 members. `readPeriodMetrics` above stays as the rule an UNPAGED read
 * must obey; this path is guarded by the pager instead.
 */
export function metricsPage<T extends Record<string, unknown> = PeriodMetricRow>(
  call: (afterMemberId: string | null, limit: number) => PromiseLike<PageResult<T>>,
): KeysetQuery<T> {
  let after: string | null = null;
  let limit = PAGE_SIZE;

  const query: KeysetQuery<T> = {
    gt(_column, value) {
      after = value as string;
      return query;
    },
    order() {
      return query;
    },
    limit(count) {
      limit = count;
      return query;
    },
    then(onfulfilled) {
      return call(after, limit).then(onfulfilled);
    },
  };

  return query;
}

/* ------------------------------------------------------ several buckets at once
 *
 * The Overview's "based on period" bars used to read the page RPC once PER
 * BUCKET -- seven paged reads for a week, in parallel, each one the same
 * aggregate over an adjacent slice of the same period (RC-9, RC-2 of
 * docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md). 0087 adds
 * member_period_metrics_buckets: every bucket in ONE keyset read, one row per
 * member per bucket, paged by a text cursor the function itself decodes
 * (`member_id:bucket`). `metricsPage` drives it unchanged -- it records what
 * the pager asks for and hands the RPC's answer straight back -- with the
 * pager keyed on `cursor` rather than `member_id`.
 *
 * Named here, not spelt at the call site, for the same reason this file
 * exists: the rule about how these figures may be read lives beside the spec
 * that pins it (bucketedMetrics.test.ts).
 */
export const METRICS_BUCKETS_RPC = 'member_period_metrics_buckets';

/** One member's figures inside one bucket, as the RPC returns them. */
export type BucketMetricRow = {
  /** 1-based index into the bucket arrays the call was made with */
  bucket: number;
  member_id: string;
  expected: number | null;
  attended: number | null;
  missed: number | null;
  extra: number | null;
  /** the keyset: `member_id:bucket`, two-digit bucket */
  cursor: string;
};

/**
 * The flat rows, dealt back into the buckets they were asked for -- in the
 * order they were asked for, every bucket present even when it holds no row
 * (a day with no sessions is a bucket with no figures, not a missing bar).
 *
 * The shape is exactly what the per-bucket read produced, so the screen and
 * `bucketTotals` are untouched. A row naming a bucket outside the range is
 * not possible from the function (the index comes from the arrays it was
 * given) and is ignored rather than thrown on, because an extra row cannot
 * make a bar wrong -- a missing one could, and none is dropped.
 */
export function splitBuckets<B extends { label: string; from: string; to: string }>(
  rows: readonly BucketMetricRow[],
  buckets: readonly B[],
): Array<B & { metrics: { member_id: string; expected: number; attended: number }[] }> {
  const out = buckets.map(b => ({ ...b, metrics: [] as { member_id: string; expected: number; attended: number }[] }));
  for (const r of rows) {
    const target = out[r.bucket - 1];
    if (!target) continue;
    target.metrics.push({ member_id: r.member_id, expected: r.expected ?? 0, attended: r.attended ?? 0 });
  }
  return out;
}
