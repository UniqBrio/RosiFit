import test from 'node:test';
import assert from 'node:assert/strict';
import { createMemberReads } from './memberStore';
import { asyncReducer, initialAsync } from './asyncState';

// THE SHARED MEMBER READ, ITS RULES ALONE
// (requests/2026-10-03-one-shared-member-refresh.md). The real repository,
// client and network are exercised in memberRefresh.test.ts; this pins the
// rule itself with a clock and loaders the spec controls.

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

test('Test 2 -- callers that ask while a read is in flight share it: one load, one answer, the same object', async () => {
  const reads = createMemberReads({ joinMs: 5_000, now: () => 0 });
  const d = deferred<string[]>();
  let loads = 0;
  const load = () => { loads += 1; return d.promise; };

  const a = reads.read('members:w', load);
  const b = reads.read('members:w', load);
  const c = reads.read('members:w', load);
  assert.equal(a, b);
  assert.equal(b, c);

  const answer = ['m1', 'm2'];
  d.resolve(answer);
  const [ra, rb, rc] = await Promise.all([a, b, c]);
  assert.equal(loads, 1, 'three callers, one load');
  assert.equal(ra, answer);
  assert.equal(rb, answer, 'every caller holds the very same answer');
  assert.equal(rc, answer);
  assert.equal(reads.started('members:'), 1);
});

test('different keys are different reads', async () => {
  const reads = createMemberReads({ joinMs: 5_000, now: () => 0 });
  let loads = 0;
  await Promise.all([
    reads.read('members:w1', async () => { loads += 1; return 1; }),
    reads.read('members:w2', async () => { loads += 1; return 2; }),
  ]);
  assert.equal(loads, 2);
});

test('nothing is kept once a read settles: the next ask reads again', async () => {
  const reads = createMemberReads({ joinMs: 5_000, now: () => 0 });
  let loads = 0;
  await reads.read('k', async () => { loads += 1; return 'first'; });
  const second = await reads.read('k', async () => { loads += 1; return 'second'; });
  assert.equal(loads, 2);
  assert.equal(second, 'second', 'a screen\'s own retry still means a fresh read');
});

test('Test 6 -- never across a change: a read begun before invalidate() is not joined after it', async () => {
  const reads = createMemberReads({ joinMs: 5_000, now: () => 0 });
  const before = deferred<string>();
  const after = deferred<string>();
  const a = reads.read('k', () => before.promise);   // read A, began before the change
  reads.invalidate();                                // e.g. a member was just added
  const b = reads.read('k', () => after.promise);    // read B, after it
  assert.notEqual(a, b, 'B must not be handed A');
  after.resolve('with the new member');              // B finishes first
  before.resolve('without it');                      // A finishes later
  assert.equal(await b, 'with the new member');
  assert.equal(await a, 'without it', 'A still answers the callers that asked for it');
  // A finishing late must not unseat B's record of being in flight, nor be joined.
  const c = reads.read('k', async () => 'third read');
  assert.equal(await c, 'third read');
  assert.equal(reads.started('k'), 3);
});

test('Test 6 -- the screen keeps the NEWER answer when an older reply lands late (asyncReducer, unchanged)', () => {
  let s = initialAsync<string[]>();
  s = asyncReducer(s, { kind: 'start', fresh: true, seq: 1 });            // request A
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });           // request B
  s = asyncReducer(s, { kind: 'resolved', data: ['new'], at: 2, seq: 2 }); // B first
  s = asyncReducer(s, { kind: 'resolved', data: ['old'], at: 3, seq: 1 }); // A later
  assert.deepEqual(s.data, ['new'], 'stale data cannot overwrite newer data');
});

test('Test 5 -- a failure reaches every caller that shared the read, is not retried, and is not kept', async () => {
  const reads = createMemberReads({ joinMs: 5_000, now: () => 0 });
  const d = deferred<string>();
  let loads = 0;
  const a = reads.read('k', () => { loads += 1; return d.promise; });
  const b = reads.read('k', () => { loads += 1; return d.promise; });
  d.reject(new Error('Could not load member addresses'));
  await assert.rejects(a, /member addresses/);
  await assert.rejects(b, /member addresses/);
  await new Promise(r => setTimeout(r, 20));
  assert.equal(loads, 1, 'nothing asked again on its own -- no retry loop');
  const recovered = await reads.read('k', async () => { loads += 1; return 'back'; });
  assert.equal(recovered, 'back', 'the next ask is a new read, so a later success recovers');
  assert.equal(loads, 2);
});

test('a read in flight longer than joinMs is not joined: a retry after a hang reads anew', async () => {
  let t = 0;
  const reads = createMemberReads({ joinMs: 5_000, now: () => t });
  const hung = deferred<string>();
  const a = reads.read('k', () => hung.promise);
  t = 5_001;
  const b = reads.read('k', async () => 'fresh');
  assert.notEqual(a, b);
  assert.equal(await b, 'fresh');
  hung.resolve('late');
  assert.equal(await a, 'late');
});

test('a synchronous throw in a loader is a rejected read, not an exception at the call site', async () => {
  const reads = createMemberReads({ joinMs: 5_000, now: () => 0 });
  const p = reads.read('k', () => { throw new Error('boom'); });
  await assert.rejects(p, /boom/);
  assert.equal(await reads.read('k', async () => 'ok'), 'ok');
});
