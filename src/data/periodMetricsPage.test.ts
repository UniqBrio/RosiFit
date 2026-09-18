/**
 * T-042: every member's figures, however many members there are.
 *
 * Run: npx tsx --test src/data/periodMetricsPage.test.ts
 *
 * T-016 turned a truncated `member_period_metrics` read into a refusal, which
 * is strictly better than zeroing every member past row 1,000 — and is still
 * a refusal. The academy has 1,087 members (T-006, 17-Sep-2026), so the
 * member list, the week chart and the bucket chart currently refuse rather
 * than answer. This is the fix that makes them answer.
 *
 * `member_period_metrics_page(p_from, p_to, p_after_member_id, p_limit)`
 * returns the same row shape, ordered by `member_id`, from the id given
 * onwards. That is a keyset pager expressed in ARGUMENTS rather than in
 * PostgREST modifiers, so it cannot be handed to `pageAllByKey` directly:
 * `.gt()` and `.limit()` have to become `p_after_member_id` and `p_limit`.
 * `metricsPage` is that adapter, and it is the only new idea here — the
 * paging itself is the same `pageAllByKey` the other six reads in
 * `fetchMembers` already use (RV-34, RV-35 verified it sound).
 *
 * WHY THE T-016 GUARD CANNOT ALSO WRAP THIS. `PAGE_SIZE === SUPABASE_MAX_ROWS
 * === 1000`, so a FULL page and a TRUNCATED answer are the same 1,000 rows.
 * `guardUntruncated` over a paged result would therefore throw for any
 * academy with exactly 1,000 members, and over each page it would throw on
 * every full page. The backstop stays in `readPeriodMetrics` as the rule an
 * UNPAGED read must obey; what guards this path is the pager, which throws on
 * a page error and never returns a short list as a success (RC-039).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { pageAllByKey, SUPABASE_MAX_ROWS, PagedReadError, type PageResult } from './pageAll';
import { metricsPage, type PeriodMetricRow } from './periodMetrics';

const ROOT = process.env.PERIOD_METRICS_PAGE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set PERIOD_METRICS_PAGE_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};
const code = (rel: string) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

/** Zero-padded so string order is member order, the way a uuid key behaves. */
const idOf = (n: number) => `m-${String(n).padStart(5, '0')}`;

/**
 * The RPC as Session A is shipping it: ordered by `member_id`, strictly after
 * `p_after_member_id`, at most `p_limit` rows. The server also applies its own
 * ceiling, exactly as `db-max-rows` does.
 */
function fakeRpc(memberCount: number, opts: { failOnCall?: number } = {}) {
  const all: PeriodMetricRow[] = Array.from({ length: memberCount }, (_, i) => ({
    member_id: idOf(i + 1), expected: 3, attended: 1, missed: 2, attendance_pct: 33,
  }));
  const calls: Array<{ after: string | null; limit: number }> = [];
  return {
    calls,
    call(after: string | null, limit: number): PromiseLike<PageResult<PeriodMetricRow>> {
      calls.push({ after, limit });
      if (opts.failOnCall === calls.length) {
        return Promise.resolve({ data: null, error: { message: 'the metrics page did not answer' } });
      }
      const from = after === null ? 0 : all.findIndex(r => r.member_id === after) + 1;
      const capped = Math.min(limit, SUPABASE_MAX_ROWS);
      return Promise.resolve({ data: all.slice(from, from + capped), error: null });
    },
  };
}

const readAll = (server: ReturnType<typeof fakeRpc>) =>
  pageAllByKey<PeriodMetricRow>(() => metricsPage(server.call), { key: 'member_id' });

test('1,087 members: every one of them comes back', async () => {
  // The academy's real size on 17-Sep-2026 (T-006), and the number that made
  // T-016's refusal the everyday answer rather than a scale worry.
  const server = fakeRpc(1087);
  const rows = await readAll(server);

  assert.equal(rows.length, 1087);
});

test('nobody is zeroed and nobody is duplicated', async () => {
  const server = fakeRpc(1087);
  const rows = await readAll(server);

  const ids = new Set(rows.map(r => r.member_id));
  assert.deepEqual(
    { unique: ids.size, first: rows[0].member_id, last: rows[rows.length - 1].member_id,
      zeroed: rows.filter(r => r.expected === 0).length },
    { unique: 1087, first: idOf(1), last: idOf(1087), zeroed: 0 },
  );
});

test('the member past the old ceiling is present with real figures', async () => {
  const server = fakeRpc(1087);
  const rows = await readAll(server);

  // Row 1,001 is the first member the unpaged read could never see, and the
  // one who read 0 expected, 0 missed, and was therefore never flagged.
  const beyond = rows.find(r => r.member_id === idOf(1001));
  assert.deepEqual(beyond, {
    member_id: idOf(1001), expected: 3, attended: 1, missed: 2, attendance_pct: 33,
  });
});

test('the adapter turns the keyset into the RPC arguments', async () => {
  const server = fakeRpc(1087);
  await readAll(server);

  // First page from the start, second page strictly after the last id of the
  // first. A `p_after_member_id` that did not advance would loop forever.
  assert.deepEqual(
    server.calls.map(c => c.after),
    [null, idOf(SUPABASE_MAX_ROWS), idOf(1087)],
  );
});

test('every page asks for a bounded number of rows', async () => {
  const server = fakeRpc(1087);
  await readAll(server);

  assert.ok(server.calls.every(c => c.limit > 0 && c.limit <= SUPABASE_MAX_ROWS),
    `a page asked for an unbounded count: ${JSON.stringify(server.calls)}`);
});

test('an academy that fits in one page still ends the read', async () => {
  // The terminating page is the EMPTY one, so a small academy costs two
  // calls and must not spin.
  const server = fakeRpc(12);
  const rows = await readAll(server);

  assert.deepEqual({ rows: rows.length, calls: server.calls.length }, { rows: 12, calls: 2 });
});

test('a page that fails takes the whole read down, never half a list', async () => {
  // RC-039: half a roster returned as a success is the defect the pager
  // exists to prevent, and a later page failing does not make it less of one.
  const server = fakeRpc(1087, { failOnCall: 2 });

  await assert.rejects(readAll(server), PagedReadError);
});

test('all three call sites read the paged RPC through paged()', () => {
  const src = code('src/data/repository.ts');
  const calls = src.split('\n').filter(l => l.includes("member_period_metrics_page"));

  // fetchMembers, fetchBucketMetrics, fetchWeekRows. A fourth reader of these
  // figures has to come through here too.
  assert.equal(calls.length, 3);
});

test('no unpaged read of the metrics RPC survives', () => {
  const src = code('src/data/repository.ts');

  // The old name, with its closing quote, is the unpaged one. T-016 guarded
  // it; T-042 removes the need for the guard by removing the read.
  assert.ok(!src.includes("supabase.rpc('member_period_metrics'"),
    'an unpaged member_period_metrics read is still in repository.ts');
});

test('the paged reads are keyed by member_id', () => {
  const src = code('src/data/repository.ts');
  const sites = src.split('\n')
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => line.includes('member_period_metrics_page'));

  for (const { i } of sites) {
    const window = src.split('\n').slice(Math.max(0, i - 4), i + 6).join('\n');
    assert.match(window, /'member_id'/,
      `the paged read near line ${i + 1} does not page by member_id`);
  }
});

test('the unpaged guard survives as the rule for an unpaged read', () => {
  // T-016's backstop is not deleted just because these three sites no longer
  // need it: it is what a future unpaged read of these figures must use.
  const src = code('src/data/periodMetrics.ts');
  assert.match(src, /export function readPeriodMetrics/);
});
