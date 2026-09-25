/**
 * T-405: the signed-in identity is read ONCE for a burst of callers, not once
 * per component.
 *
 * Run: npx tsx --test src/data/sharedRead.test.ts
 *
 * Nine components call currentAppUser() on a cold start. Each issued the SAME
 * GET, and Chromium's HTTP cache lets only one request per identical URL be in
 * flight, so the nine "parallel" reads arrived one after another -- a chain of
 * nine round trips (reproduced over HTTP/2 against a local stand-in, and
 * shown to vanish with the browser cache disabled; RUN_app-feels-slow.md).
 * sharedRead is the one place those callers now meet.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { createSharedRead } from './sharedRead';

const tick = () => new Promise(r => setTimeout(r, 0));
// Nine components share the read below; restoreSession's own read is a
// different URL (the sign-in security check) and deliberately is not shared.

test('ten concurrent callers for one key share ONE read', async () => {
  let calls = 0;
  const read = createSharedRead<string>({ reuseMs: 10_000 });
  const fetcher = async () => { calls += 1; await tick(); return 'owner'; };
  const got = await Promise.all(Array.from({ length: 10 }, () => read('auth-1', fetcher)));
  assert.equal(calls, 1);
  assert.deepEqual(got, Array(10).fill('owner'));
});

test('a caller shortly after the read resolved reuses it -- the second start-up batch', async () => {
  let calls = 0;
  let now = 1_000;
  const read = createSharedRead<string>({ reuseMs: 10_000, now: () => now });
  const fetcher = async () => { calls += 1; return 'owner'; };
  await read('auth-1', fetcher);
  now += 300;                       // the second batch arrived ~280 ms later
  await read('auth-1', fetcher);
  assert.equal(calls, 1);
});

test('after the reuse window a caller reads fresh -- later screens behave as before', async () => {
  let calls = 0;
  let now = 1_000;
  const read = createSharedRead<string>({ reuseMs: 10_000, now: () => now });
  const fetcher = async () => { calls += 1; return `v${calls}`; };
  assert.equal(await read('auth-1', fetcher), 'v1');
  now += 10_001;
  assert.equal(await read('auth-1', fetcher), 'v2');
});

test('a different signed-in account never receives the previous account\'s value', async () => {
  const read = createSharedRead<string>({ reuseMs: 10_000 });
  assert.equal(await read('auth-1', async () => 'owner'), 'owner');
  assert.equal(await read('auth-2', async () => 'staff'), 'staff');
});

test('a failed read is not kept: the next caller tries again', async () => {
  let calls = 0;
  const read = createSharedRead<string>({ reuseMs: 10_000 });
  await assert.rejects(read('auth-1', async () => { calls += 1; throw new Error('offline'); }));
  assert.equal(await read('auth-1', async () => { calls += 1; return 'owner'; }), 'owner');
  assert.equal(calls, 2);
});

test('an empty answer (no account row) is not kept either', async () => {
  let calls = 0;
  const read = createSharedRead<string | null>({ reuseMs: 10_000 });
  assert.equal(await read('auth-1', async () => { calls += 1; return null; }), null);
  assert.equal(await read('auth-1', async () => { calls += 1; return 'owner'; }), 'owner');
  assert.equal(calls, 2);
});

test('a read that settles AFTER a newer one began cannot clear the newer one', async () => {
  let calls = 0;
  let rejectA!: (e: Error) => void;
  const read = createSharedRead<string>({ reuseMs: 10_000 });
  // A: auth-1 in flight, left hanging.
  const a = read('auth-1', () => { calls += 1; return new Promise<string>((_, rej) => { rejectA = rej; }); });
  // B: a different account while A is still in flight -- B becomes current.
  assert.equal(await read('auth-2', async () => { calls += 1; return 'staff'; }), 'staff');
  // A now fails. It must not clear B's entry.
  rejectA(new Error('offline'));
  await assert.rejects(a);
  assert.equal(await read('auth-2', async () => { calls += 1; return 'WRONG'; }), 'staff');
  assert.equal(calls, 2, 'the auth-2 answer was reused, not re-read');
});

test('a clock that jumps backwards does not pin a stale answer', async () => {
  let calls = 0;
  let now = 100_000;
  const read = createSharedRead<string>({ reuseMs: 10_000, now: () => now });
  const fetcher = async () => { calls += 1; return `v${calls}`; };
  await read('auth-1', fetcher);
  now -= 60_000;                    // NTP correction / manual clock change
  assert.equal(await read('auth-1', fetcher), 'v2');
});

test('currentAppUser reads through the shared read, keyed by the signed-in account', () => {
  const fs = require('node:fs') as typeof import('node:fs');
  const path = require('node:path') as typeof import('node:path');
  const src = fs.readFileSync(path.join(process.cwd(), 'src/data/session.ts'), 'utf8');
  const body = src.slice(src.indexOf('export async function currentAppUser'), src.indexOf('export function useAppUser'));
  assert.match(body, /sharedIdentity\(\s*authUserId\s*,/, 'currentAppUser must go through sharedIdentity(authUserId, ...)');
});
