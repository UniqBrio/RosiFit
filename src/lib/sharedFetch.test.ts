/**
 * T-406: one network request per identical read, shared by every hook that
 * asks for it while it is fresh -- and never across a write.
 *
 * Run: npx tsx --test src/lib/sharedFetch.test.ts
 *
 * Production, 25-Sep-2026 03:53 UTC, one session, one minute: 300 requests
 * for 49 distinct URLs; the five-table member list read 6 times in ~30 s
 * (edge_logs; recorded in RUN_app-feels-slow.md, T-406 section). Identical
 * concurrent GETs are also queued one behind another by the browser's HTTP
 * cache -- shown in the same section by disabling the cache -- so the
 * repeats cost round trips, not just bandwidth.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedFetch } from './sharedFetch';

const BASE = 'https://p.supabase.co';
type Call = { url: string; method: string; body?: string };

function fakeNetwork(opts: { status?: number; delay?: number } = {}) {
  const calls: Call[] = [];
  let n = 0;
  const release: Array<() => void> = [];
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input); const method = (init?.method ?? 'GET').toUpperCase();
    calls.push({ url, method, body: typeof init?.body === 'string' ? init.body : undefined });
    n += 1; const mine = n;
    if (opts.delay === -1) await new Promise<void>(r => release.push(r));   // held open
    else if (opts.delay) await new Promise(r => setTimeout(r, opts.delay));
    return new Response(JSON.stringify({ n: mine }), {
      status: opts.status ?? 200, headers: { 'content-type': 'application/json', 'content-range': '0-0/1' } });
  }) as typeof fetch;
  return { fetchImpl, calls, releaseAll: () => release.splice(0).forEach(r => r()) };
}
const auth = (who = 'A') => ({ headers: { Authorization: `Bearer ${who}`, apikey: 'k' } });
const json = async (r: Response) => (await r.json()) as { n: number };

test('identical concurrent reads share ONE request, and every caller gets its own readable body', async () => {
  const net = fakeNetwork({ delay: 5 });
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/courses?select=id,name`;
  const rs = await Promise.all(Array.from({ length: 7 }, () => f(url, auth())));
  assert.equal(net.calls.length, 1);
  for (const r of rs) assert.deepEqual(await json(r), { n: 1 });
  assert.equal(rs[0].headers.get('content-range'), '0-0/1', 'headers survive (counts are read from them)');
});

test('a read repeated within the freshness window reuses the answer; after it, reads fresh', async () => {
  let now = 1_000;
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000, now: () => now });
  const url = `${BASE}/rest/v1/members?select=id`;
  await f(url, auth());
  now += 5_000; await f(url, auth());
  assert.equal(net.calls.length, 1, 'a dialog opened 5 s later does not re-read');
  now += 7_001; await f(url, auth());
  assert.equal(net.calls.length, 2, 'older than the sharing window: read again');
});

test('ANY write clears every shared read -- the next read goes to the server', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/members?select=id`;
  await f(url, auth());
  await f(`${BASE}/rest/v1/members?id=eq.1`, { ...auth(), method: 'PATCH', body: '{"full_name":"x"}' });
  await f(url, auth());
  assert.deepEqual(net.calls.map(c => c.method), ['GET', 'PATCH', 'GET']);
});

test('an Edge Function call counts as a write (imports, sends, PIN changes)', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/sessions?select=id`;
  await f(url, auth());
  await f(`${BASE}/functions/v1/csv-import`, { ...auth(), method: 'POST', body: '{}' });
  await f(url, auth());
  assert.equal(net.calls.filter(c => c.url === url).length, 2);
});

test('a read that STARTS while a write is in flight is not reused after the write lands', async () => {
  const net = fakeNetwork({ delay: -1 });
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/members?select=id`;
  const write = f(`${BASE}/rest/v1/rpc/set_attendance`, { ...auth(), method: 'POST', body: '{}' });
  const during = f(url, auth());                 // may see the pre-write state
  net.releaseAll(); await during; await write;   // the write settles
  const after = f(url, auth()); net.releaseAll(); await after;
  assert.equal(net.calls.filter(c => c.url === url).length, 2, 'the answer read during the write was not handed out after it');
});

test('a request that hung is not joined once it is older than the window -- a retry goes out', async () => {
  let now = 1_000;
  const net = fakeNetwork({ delay: -1 });
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000, now: () => now });
  const url = `${BASE}/rest/v1/attendance_records?select=id`;
  void f(url, auth());                           // hangs (captive portal, dead tunnel)
  now += 12_500;                                 // the hook's deadline has passed; the user taps Try again
  const retry = f(url, auth());
  assert.equal(net.calls.length, 2, 'the retry sent its own request');
  net.releaseAll(); await retry;
});

test('a body that fails to arrive whole leaves nothing behind', async () => {
  let calls = 0;
  const flaky = (async () => {
    calls += 1;
    if (calls === 1) {
      const broken = new ReadableStream({ start(c) { c.error(new Error('connection reset')); } });
      return new Response(broken as unknown as ConstructorParameters<typeof Response>[0], { status: 200 });
    }
    return new Response('{"n":2}', { status: 200 });
  }) as unknown as typeof fetch;
  const f = createSharedFetch(flaky, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/members?select=id`;
  await f(url, auth()).then(r => r.text()).catch(() => null);
  assert.equal(f.entryCount(), 0, 'nothing is left behind for the failed read');
  assert.deepEqual(await json(await f(url, auth())), { n: 2 });
  assert.equal(calls, 2, 'the second read went to the network instead of replaying a failure');
});

test('sign-out clears every shared answer', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/members?select=id`;
  await f(url, auth());
  await f(`${BASE}/auth/v1/logout?scope=local`, { ...auth(), method: 'POST' });
  await f(url, auth());
  assert.equal(net.calls.filter(c => c.url === url).length, 2);
});

test('keys read the headers supabase-js actually sends -- a Headers instance', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/app_users?select=id`;
  const as = (who: string) => ({ headers: new Headers({ Authorization: `Bearer ${who}`, apikey: 'k' }), signal: undefined });
  await f(url, as('A')); await f(url, as('A')); await f(url, as('B'));
  assert.equal(net.calls.length, 2, 'shared for A (signal: undefined is shareable), separate for B');
});

test('a HEAD count and a 204 round-trip intact', async () => {
  const fetchImpl = (async (_i: RequestInfo | URL, init?: RequestInit) =>
    init?.method === 'HEAD'
      ? new Response(null, { status: 200, headers: { 'content-range': '*/1087' } })
      : new Response(null, { status: 204 })) as typeof fetch;
  const f = createSharedFetch(fetchImpl, { freshMs: 12_000 });
  const head = await f(`${BASE}/rest/v1/members?select=id`, { ...auth(), method: 'HEAD', headers: { Prefer: 'count=exact' } });
  assert.equal(head.headers.get('content-range'), '*/1087');
  const again = await f(`${BASE}/rest/v1/members?select=id`, { ...auth(), method: 'HEAD', headers: { Prefer: 'count=exact' } });
  assert.equal(again.headers.get('content-range'), '*/1087');
  const empty = await f(`${BASE}/rest/v1/courses?select=id`, auth());
  assert.equal(empty.status, 204);
});

test('expired answers are swept, not kept for the life of the tab', async () => {
  let now = 1_000;
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 2_000, now: () => now });
  for (let i = 0; i < 50; i++) { await f(`${BASE}/rest/v1/members?week=${i}`, auth()); now += 3_000; }
  assert.ok(f.entryCount() <= 1, `held ${f.entryCount()} entries after 50 expired reads`);
});

test('a failed answer is never shared onward', async () => {
  const net = fakeNetwork({ status: 500 });
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/courses?select=id`;
  assert.equal((await f(url, auth())).status, 500);
  assert.equal(f.entryCount(), 0, 'a 500 leaves no entry');
  await f(url, auth());
  assert.equal(net.calls.length, 2);
});

test('a different signed-in account never receives another account\'s answer', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/app_users?select=id`;
  await f(url, auth('A')); await f(url, auth('B'));
  assert.equal(net.calls.length, 2);
});

test('read RPCs are shared per BODY; any other RPC is a write', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const rpc = `${BASE}/rest/v1/rpc/member_period_metrics_page`;
  const week = '{"p_from":"2026-09-21","p_to":"2026-09-27"}';
  await f(rpc, { ...auth(), method: 'POST', body: week });
  await f(rpc, { ...auth(), method: 'POST', body: week });
  await f(rpc, { ...auth(), method: 'POST', body: '{"p_from":"2026-09-14","p_to":"2026-09-20"}' });
  assert.equal(net.calls.length, 2, 'same week shared, another week read');
  await f(`${BASE}/rest/v1/rpc/delete_member`, { ...auth(), method: 'POST', body: '{}' });
  await f(rpc, { ...auth(), method: 'POST', body: week });
  assert.equal(net.calls.length, 4, 'an unlisted RPC cleared the shared answers');
});

test('sign-in and token traffic is never shared, and does not clear reads', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/courses?select=id`;
  await f(url, auth());
  await f(`${BASE}/auth/v1/token?grant_type=refresh_token`, { method: 'POST', body: '{}' });
  await f(`${BASE}/auth/v1/user`, auth());
  await f(`${BASE}/auth/v1/user`, auth());
  await f(url, auth());
  assert.equal(net.calls.filter(c => c.url.includes('/auth/')).length, 3, 'auth always goes out');
  assert.equal(net.calls.filter(c => c.url === url).length, 1, 'a token refresh is not a data write');
});

test('a caller that brings its own abort signal is not shared (its abort must not cancel others)', async () => {
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 12_000 });
  const url = `${BASE}/rest/v1/courses?select=id`;
  await f(url, auth());
  await f(url, { ...auth(), signal: new AbortController().signal });
  assert.equal(net.calls.length, 2);
});

test('at the shipped 5 s window: shared at 4.9 s, read fresh at 5.1 s', async () => {
  let now = 1_000;
  const net = fakeNetwork();
  const f = createSharedFetch(net.fetchImpl, { freshMs: 5_000, now: () => now });
  const url = `${BASE}/rest/v1/courses?select=id`;
  await f(url, auth());
  now += 4_900; await f(url, auth());
  assert.equal(net.calls.length, 1);
  now += 200; await f(url, auth());
  assert.equal(net.calls.length, 2);
});
