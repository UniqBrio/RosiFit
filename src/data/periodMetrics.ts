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
import { guardUntruncated } from './pageAll';

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
