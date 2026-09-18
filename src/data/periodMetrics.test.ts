/**
 * T-016: a truncated metrics read is a REFUSAL, never a row of zeroes.
 *
 * Run: npx tsx --test src/data/periodMetrics.test.ts
 *
 * `member_period_metrics` returns one row per member and is read unpaged at
 * three places in repository.ts. PostgREST caps every reply at
 * `db-max-rows` = 1,000 and calls it a success: status 200, `error: null`,
 * exactly a thousand rows. Nothing in the reply distinguishes "the academy
 * has a thousand members" from "the academy has more and you were given the
 * first thousand" (RC-039, the same mechanism one level up).
 *
 * THIS IS FIRING IN PRODUCTION NOW. T-006 read 1,087 rows for the current
 * week against a 1,000 cap. What the three callers then do with the short
 * list is the defect:
 *
 *   `fetchMembers` (:230) builds `metricByMember` and falls back to
 *   `metric?.expected ?? 0` (:353-355), so every member past row 1,000 shows
 *   0 expected, 0 attended, 0 missed. Zero missed cannot be flagged, so the
 *   member is never followed up and never mailed -- the card and the weekly
 *   list agree, and both are wrong.
 *
 *   `fetchBucketMetrics` (:1954) and `fetchWeekRows` (:1978) sum the rows, so
 *   the chart simply under-reports. `fetchWeekRows` additionally discards
 *   `error` entirely (RV-18), so a read that failed draws as a week the
 *   academy attended nothing.
 *
 * A:F-02 and B:F-02 both found it; RV-34's FIXED verdict covers
 * `supabase.from(` table reads and does not reach an RPC.
 *
 * WHAT THIS SPEC PINS. The stopgap, which is that the truncation is turned
 * into a refusal a person can read, rather than into zeroes nobody can see.
 * It is NOT the fix: `period_totals()` for the two summing callers and a
 * keyset pager for `fetchMembers` are T-042. A refusal is strictly better
 * than a wrong number, and that is the whole claim here.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { SUPABASE_MAX_ROWS, TruncatedReadError } from './pageAll';
import { readPeriodMetrics, PERIOD_METRICS_CONTEXT } from './periodMetrics';

const ROOT = process.env.PERIOD_METRICS_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set PERIOD_METRICS_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};
const code = (rel: string) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

type Row = { member_id: string; expected: number; attended: number; missed: number };

/** What PostgREST answers: `error: null`, and the rows silently cut to the
 *  ceiling. `serverCap` is applied by the server, exactly as `db-max-rows`
 *  is -- the caller asked for nothing and cannot see that it was applied. */
function fakeRpc(memberCount: number, serverCap = SUPABASE_MAX_ROWS) {
  const all: Row[] = Array.from({ length: memberCount }, (_, i) => ({
    member_id: `m-${i + 1}`, expected: 3, attended: 1, missed: 2,
  }));
  return { data: all.slice(0, serverCap), error: null };
}

test('the academy past the ceiling is refused, not answered', () => {
  // 1,087 members, which is what T-006 read on 17-Sep-2026.
  assert.throws(() => readPeriodMetrics(fakeRpc(1087)), TruncatedReadError);
});

test('exactly at the ceiling is refused too — it is the indistinguishable case', () => {
  // A thousand members and a thousand-row cap produce byte-identical replies.
  // Refusing both is the only honest reading; T-042 removes the ambiguity.
  assert.throws(() => readPeriodMetrics(fakeRpc(SUPABASE_MAX_ROWS)), TruncatedReadError);
});

test('an academy below the ceiling is answered in full', () => {
  assert.equal(readPeriodMetrics(fakeRpc(SUPABASE_MAX_ROWS - 1)).length, SUPABASE_MAX_ROWS - 1);
});

test('nobody is zeroed: the truncated rows never reach the caller', () => {
  // The defect is not the short list -- it is the `?? 0` the short list feeds.
  // Throwing means `metricByMember` is never built from a partial answer.
  let reached: Row[] | null = null;
  try {
    reached = readPeriodMetrics(fakeRpc(1087));
  } catch {
    reached = null;
  }
  assert.equal(reached, null);
});

test('a failed read is refused, not summed as zero', () => {
  // fetchWeekRows discarded `error` outright (RV-18): a read that never
  // answered drew as a week the academy attended nothing.
  assert.throws(
    () => readPeriodMetrics({ data: null, error: { message: 'connection reset' } }),
    /connection reset/,
  );
});

test('the refusal an operator reads names the figures, not the mechanism', () => {
  // CP-003: no SQLSTATE, no PostgREST wording, no function name. It says
  // which numbers are missing, because that is what the reader has to act on.
  assert.ok(
    /attendance figures/i.test(PERIOD_METRICS_CONTEXT)
    && !/PGRST|db-max-rows|member_period_metrics|pageAllByKey/.test(PERIOD_METRICS_CONTEXT),
    `not person-readable: ${PERIOD_METRICS_CONTEXT}`,
  );
});

test('all three call sites route the RPC through the guard', () => {
  const src = code('src/data/repository.ts');
  // Matched on the PREFIX, so both the unpaged `member_period_metrics` and
  // the keyset `member_period_metrics_page` are counted. T-042 moved all
  // three sites onto the paged one in the same stack as this spec; counting
  // only the old name would have made this assertion silently vacuous the
  // moment they moved, which is the failure mode it exists to prevent.
  const calls = src.split('\n').filter(l => l.includes("supabase.rpc('member_period_metrics"));

  // Three sites: fetchMembers, fetchBucketMetrics, fetchWeekRows. A fourth
  // added later must come through here too, which is why this counts them.
  assert.equal(calls.length, 3);
});

test('no call site reads the RPC rows straight out of the response any more', () => {
  const src = code('src/data/repository.ts');

  // The two exact shapes that turned a cut-off read into zeroes:
  // `metricsRes.data ?? []` in fetchMembers, and `(data ?? []) as MetricRow[]`
  // in fetchBucketMetrics. Named literally rather than by a window around the
  // RPC, because repository.ts reads other tables within a few lines of it
  // and their own `?? []` is none of this rule's business.
  assert.ok(
    !/metricsRes\.data/.test(src) && !/\(data \?\? \[\]\) as MetricRow\[\]/.test(src),
    'a member_period_metrics response is still read straight out of `.data`',
  );
});

test('the guard is routed through fail(), so the sentence reaches the screen', () => {
  const src = code('src/data/repository.ts');
  const helper = src.slice(src.indexOf('async function paged'));
  const body = helper.slice(0, helper.indexOf('\n}'));

  // The claim is unchanged and so is the assertion: a machine sentence must
  // never reach an operator (A:F-25, T-045). What CARRIES it changed in the
  // same stack -- T-042 replaced the unpaged read, and with it the
  // `periodMetrics` wrapper this used to name, so the guard is now `paged()`
  // turning a PagedReadError into a person-readable refusal.
  assert.ok(/fail\(/.test(body) && /PagedReadError/.test(body),
    'repository.ts must route the paged read failure through fail()');
});

test('the unpaged guard is still there for an unpaged read', () => {
  // T-016's rule did not stop being true when T-042 removed its last
  // caller. `PAGE_SIZE` is `SUPABASE_MAX_ROWS`, so `guardUntruncated`
  // cannot wrap a paged read without throwing on every full page; it stays
  // as the rule an UNPAGED read of these figures must obey.
  assert.match(code('src/data/periodMetrics.ts'), /export function readPeriodMetrics/);
});
