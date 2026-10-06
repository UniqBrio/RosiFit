import test from 'node:test';
import assert from 'node:assert/strict';
import { installNodeStubs, makeAcademy, fakeServer } from './fakePostgrest.testkit';

/**
 * THE OVERVIEW'S BUCKETS ARE ONE READ (0087; RC-9, RC-2 of
 * docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md).
 *
 * Run: npx tsx --test src/data/bucketedMetrics.test.ts
 *
 * Seven day-buckets used to be seven paged reads of member_period_metrics_page
 * in parallel. They are now one paged read of member_period_metrics_buckets,
 * dealt back into the same shape. Three things are pinned: the pure dealing
 * (`splitBuckets`), the wire (one RPC, paged by `cursor`, through `paged()`,
 * and no per-bucket page reads), and the answer -- the same figures per
 * member per bucket the per-bucket path returns for the same data.
 */
const setNetwork = installNodeStubs();
const uid = (p: string, i: number) => `${p}${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`;

type Period = { from: string; to: string; label: string };
type Bucket = Period & { metrics: { member_id: string; expected: number; attended: number }[] };
type Repo = { fetchBucketMetrics(b: Period[]): Promise<Bucket[]> };
const REPOSITORY = './repository.ts';
const PERIOD = './period.ts';
const CLIENT = '../lib/supabase.ts';
const METRICS = './periodMetrics.ts';

test('splitBuckets deals rows back into every bucket asked for, in order, empty ones included', async () => {
  const { splitBuckets } = await import(METRICS) as typeof import('./periodMetrics');
  const buckets = [
    { label: 'Mon', from: '2026-10-05', to: '2026-10-05' },
    { label: 'Tue', from: '2026-10-06', to: '2026-10-06' },
    { label: 'Wed', from: '2026-10-07', to: '2026-10-07' },
  ];
  const rows = [
    { bucket: 1, member_id: 'a', expected: 1, attended: 1, missed: 0, extra: 0, cursor: 'a:01' },
    { bucket: 3, member_id: 'a', expected: 1, attended: 0, missed: 1, extra: 0, cursor: 'a:03' },
    { bucket: 1, member_id: 'b', expected: 1, attended: null, missed: 1, extra: 0, cursor: 'b:01' },
    { bucket: 9, member_id: 'b', expected: 1, attended: 1, missed: 0, extra: 0, cursor: 'b:09' },
  ];
  const out = splitBuckets(rows, buckets);
  assert.deepEqual(out.map(b => b.label), ['Mon', 'Tue', 'Wed']);
  assert.deepEqual(out[0].metrics, [
    { member_id: 'a', expected: 1, attended: 1 }, { member_id: 'b', expected: 1, attended: 0 }]);
  assert.deepEqual(out[1].metrics, [], 'a bucket with no rows is present and empty');
  assert.deepEqual(out[2].metrics, [{ member_id: 'a', expected: 1, attended: 0 }]);
  assert.equal(out[0].from, '2026-10-05');
});

async function world(members: number) {
  const repo = await import(REPOSITORY) as Repo;
  const { currentWeek, periodBuckets } = await import(PERIOD) as { currentWeek(): Period; periodBuckets(p: Period): Period[] };
  const { supabase } = await import(CLIENT) as { supabase: { rpc(name: string, args: object): Promise<unknown> } };
  const tables = makeAcademy(members);
  tables.sessions = []; tables.attendance_records = []; tables.offering_schedules = [];
  const server = fakeServer(tables, { latencyMs: 1 });
  setNetwork(server.fetch as typeof fetch);
  await supabase.rpc('spec_reset', {});
  server.log.length = 0;
  const week = currentWeek();
  return { repo, server, buckets: periodBuckets(week) };
}

test('seven day-buckets are ONE paged read of the bucket RPC, and no per-bucket page read', async () => {
  const { repo, server, buckets } = await world(1644);
  assert.equal(buckets.length, 7);
  const out = await repo.fetchBucketMetrics(buckets);
  const calls = server.log.filter(r => r.method !== 'OPTIONS');
  const bucketCalls = calls.filter(r => r.path.endsWith('/rpc/member_period_metrics_buckets'));
  const pageCalls = calls.filter(r => r.path.endsWith('/rpc/member_period_metrics_page'));
  // 1,644 members x 7 buckets = 11,508 rows: twelve full pages and the
  // terminating empty one -- 13 requests where the per-bucket path made 21.
  assert.equal(pageCalls.length, 0, 'no bucket is read through the per-period page RPC');
  assert.ok(bucketCalls.length >= 12 && bucketCalls.length <= 13, `${bucketCalls.length} bucket requests`);
  assert.equal(calls.length, bucketCalls.length, 'nothing else went out');
  // paged by the cursor, strictly after the last row seen
  const bodies = bucketCalls.map(r => JSON.parse(r.body) as { p_after: string | null; p_limit: number; p_from: string[]; p_to: string[] });
  assert.equal(bodies[0].p_after, null);
  assert.ok(bodies.slice(1).every(b => typeof b.p_after === 'string' && /:0[1-7]$/.test(b.p_after)), 'every later page starts after a cursor');
  assert.ok(bodies.every(b => b.p_limit === 1000 && b.p_from.length === 7 && b.p_to.length === 7));
  // the shape the screen reads: every bucket, in order, every member in each
  assert.deepEqual(out.map(b => b.label), buckets.map(b => b.label));
  for (const b of out) assert.equal(b.metrics.length, 1644);
});

test('the bucketed answer is the per-bucket answer, member for member', async () => {
  const { repo, server, buckets } = await world(40);
  const together = await repo.fetchBucketMetrics(buckets);
  server.log.length = 0;
  // ONE bucket takes the per-period path (the page RPC) -- the same figures
  // must come back for every member of every bucket.
  for (const [i, b] of buckets.entries()) {
    const [alone] = await repo.fetchBucketMetrics([b]);
    assert.ok(server.log.some(r => r.path.endsWith('/rpc/member_period_metrics_page')), 'a single bucket reads the page RPC');
    assert.deepEqual(
      [...together[i].metrics].sort((x, y) => x.member_id.localeCompare(y.member_id)),
      [...alone.metrics].sort((x, y) => x.member_id.localeCompare(y.member_id)),
      `bucket ${i + 1} (${b.label}) differs`);
  }
});

test('the bucket read goes through paged(), keyed on the cursor, by the named RPC', async () => {
  const fs = await import('node:fs');
  const path = await import('node:path');
  const src: string = fs.readFileSync(path.join(process.cwd(), 'src/data/repository.ts'), 'utf8');
  const at = src.indexOf('METRICS_BUCKETS_RPC, {');
  assert.ok(at > 0, 'the bucket RPC is called by its exported name, not spelt at the call site');
  const window = src.slice(Math.max(0, at - 400), at + 600);
  assert.match(window, /paged<BucketMetricRow>\('the attendance figures for this period'/, 'read through paged()');
  assert.match(window, /'cursor'\)/, 'paged by the cursor');
  assert.match(window, /sharedMemberRead<BucketMetricRow\[\]>\(setKey/, 'the wire read is shared through the member store');
  assert.match(window, /sharedPeriodMetrics<MemberMetric>\(b, async \(\) => \(await dealt\(\)\)\[i\]\.metrics\)/,
    'and each bucket is still its own shared period read, sourced from it');
});
