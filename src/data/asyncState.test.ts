import test from 'node:test';
import assert from 'node:assert/strict';
import {
  initialAsync, asyncReducer, LOAD_TIMEOUT_MS, type AsyncSnapshot,
} from './asyncState';

/**
 * T1–T4: THE STATE MACHINE BEHIND useAsync, on its own.
 *
 * Run: npx tsx --test src/data/asyncState.test.ts
 *
 * WHY IT IS A MODULE AND NOT A HOOK TEST. `hooks.ts` imports React and
 * `repository.ts`, and `repository.ts` pulls in the Supabase client — none of
 * which resolves in this runner, and `scripts/tsconfig.json` has no DOM in its
 * lib. The same reason `csvFormat.ts` is split from `csv.ts`. So the rule that
 * matters lives here, pure, and `useAsync` is reduced to wiring.
 *
 * THE RULE. A first load and a REVALIDATION are not the same event and must
 * not produce the same screen. Today they do: `useAsync` calls
 * `setState('loading')` on every run, and `app/(tabs)/attendance.tsx:221`
 * answers that with a skeleton — so a refetch triggered by the app regaining
 * focus would blank the register somebody is reading. Keeping the last good
 * answer on screen while a new one is fetched is the whole of this change.
 */

/** A snapshot that has already succeeded once, for the revalidation cases. */
function settled(): AsyncSnapshot<string[]> {
  let s = initialAsync<string[]>();
  s = asyncReducer(s, { kind: 'start', fresh: true, seq: 1 });
  s = asyncReducer(s, { kind: 'resolved', data: ['a'], at: 1_000, seq: 1 });
  return s;
}

/* ------------------------------------------------------------------ T1 */

test('T1: a first load enters loading with no data', () => {
  const s = asyncReducer(initialAsync<string[]>(), { kind: 'start', fresh: true, seq: 1 });
  assert.equal(s.state, 'loading');
  assert.equal(s.data, null);
});

test('T1: a first load that resolves is ready, carries the data, and is not revalidating', () => {
  const s = settled();
  assert.deepEqual(
    { state: s.state, data: s.data, isRevalidating: s.isRevalidating },
    { state: 'ready', data: ['a'], isRevalidating: false });
});

test('T1: a first load that fails is the error state, exactly as before', () => {
  let s = asyncReducer(initialAsync<string[]>(), { kind: 'start', fresh: true, seq: 1 });
  s = asyncReducer(s, { kind: 'failed', message: 'no network', seq: 1 });
  assert.equal(s.state, 'error');
  assert.equal(s.error, 'no network');
});

/* ------------------------------------------------------------------ T2 */

test('T2: a revalidation does NOT return the screen to loading', () => {
  // The whole point. `state` is what every screen guards on to draw a
  // skeleton, so a revalidation that moves it has blanked the screen.
  const s = asyncReducer(settled(), { kind: 'start', fresh: false, seq: 2 });
  assert.equal(s.state, 'ready',
    'a revalidation moved state to loading, which is what blanks the list');
});

test('T2: the existing data stays visible for the whole of a revalidation', () => {
  const s = asyncReducer(settled(), { kind: 'start', fresh: false, seq: 2 });
  assert.deepEqual(s.data, ['a']);
});

/* ------------------------------------------------------------------ T3 */

test('T3: a revalidation exposes isRevalidating', () => {
  const s = asyncReducer(settled(), { kind: 'start', fresh: false, seq: 2 });
  assert.equal(s.isRevalidating, true);
});

test('T3: a completed revalidation replaces the data and clears the flag', () => {
  let s = asyncReducer(settled(), { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'resolved', data: ['a', 'b'], at: 2_000, seq: 2 });
  assert.deepEqual(
    { data: s.data, isRevalidating: s.isRevalidating, fetchedAt: s.fetchedAt },
    { data: ['a', 'b'], isRevalidating: false, fetchedAt: 2_000 });
});

/* ------------------------------------------------------------------ T4 */

test('T4: a FAILED revalidation keeps the last known good data on screen', () => {
  // Losing the register because a background refresh could not reach the
  // server would be a worse answer than the slightly old register.
  let s = asyncReducer(settled(), { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'offline', seq: 2 });
  assert.equal(s.state, 'ready', 'a failed revalidation threw the screen away');
  assert.deepEqual(s.data, ['a']);
});

test('T4: a failed revalidation still reports the error alongside the kept data', () => {
  let s = asyncReducer(settled(), { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'offline', seq: 2 });
  assert.equal(s.error, 'offline');
});

test('T4: a failed revalidation does not move fetchedAt — the data is as old as it was', () => {
  let s = asyncReducer(settled(), { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'offline', seq: 2 });
  assert.equal(s.fetchedAt, 1_000);
});

/* --------------------------------------------- superseded responses (T4) */

test('T4: a superseded response cannot overwrite newer data', () => {
  // Two runs in flight; the SECOND answers first. The first one's late reply
  // must not put the older list back — the `cancelled` flag in the effect
  // covers the unmount case, and this covers the overlap case.
  let s = settled();
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'resolved', data: ['new'], at: 3_000, seq: 2 });
  s = asyncReducer(s, { kind: 'resolved', data: ['stale'], at: 2_500, seq: 1 });
  assert.deepEqual(s.data, ['new'], 'a superseded reply overwrote newer data');
});

test('T4: a superseded FAILURE cannot report an error over newer good data', () => {
  let s = settled();
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'resolved', data: ['new'], at: 3_000, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'late failure', seq: 1 });
  assert.equal(s.error, null);
});

/* ------------------------------------------- dependency change, unchanged */

test('a dependency change is a genuinely new dataset, so it still shows loading', () => {
  // Preserved deliberately: a different week is not a fresher answer to the
  // same question, and showing last week's rows under this week's heading
  // would be the disagreement guardrail 1 forbids.
  const s = asyncReducer(settled(), { kind: 'start', fresh: true, seq: 2 });
  assert.equal(s.state, 'loading');
});

test('a revalidation of something that has never loaded behaves as a first load', () => {
  // Nothing to keep on screen, so there is nothing for stale-while-revalidate
  // to preserve and the honest state is the one it already had.
  let s = asyncReducer(initialAsync<string[]>(), { kind: 'start', fresh: true, seq: 1 });
  s = asyncReducer(s, { kind: 'failed', message: 'no network', seq: 1 });
  const revalidated = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });
  assert.equal(revalidated.state, 'loading');
});

/* ------------------------------------------------- the forced-state branch */

test('the forced error state is unchanged', () => {
  const s = asyncReducer(initialAsync<string[]>(),
    { kind: 'forcedError', message: 'Forced error state (?state=error). Nothing has been changed.' });
  assert.equal(s.state, 'error');
  assert.match(s.error ?? '', /Forced error state/);
});

/* ------------------------------------------------------------- constants */

test('the load deadline is unchanged at twelve seconds', () => {
  // Moved out of hooks.ts so the staleness floor can be DERIVED from it
  // rather than invented (see revalidate.ts). The value itself must not move.
  assert.equal(LOAD_TIMEOUT_MS, 12_000);
});

/* ------------------------- a retry does not hide that the data is stale */

test('a retry after a failure keeps the error until it is answered', () => {
  /* Clearing it on `start` made the stale indicator vanish for the whole of
     the retry — up to the twelve-second load deadline — and the vanishing
     read as success. The data on screen is still the data that could not be
     refreshed until something replaces it. Found by the fresh-context
     review. */
  let s = settled();
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'offline', seq: 2 });
  const retrying = asyncReducer(s, { kind: 'start', fresh: false, seq: 3 });
  assert.equal(retrying.error, 'offline', 'the retry hid the fact that the data is stale');
  assert.equal(retrying.isRevalidating, true);
  assert.deepEqual(retrying.data, ['a']);
});

test('a retry that SUCCEEDS clears the error', () => {
  let s = settled();
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'offline', seq: 2 });
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 3 });
  s = asyncReducer(s, { kind: 'resolved', data: ['a', 'b'], at: 5_000, seq: 3 });
  assert.equal(s.error, null, 'a recovered read still claims it could not refresh');
  assert.deepEqual(s.data, ['a', 'b']);
  assert.equal(s.fetchedAt, 5_000);
});

test('a retry that fails again replaces the message rather than stacking it', () => {
  let s = settled();
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'first', seq: 2 });
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 3 });
  s = asyncReducer(s, { kind: 'failed', message: 'second', seq: 3 });
  assert.equal(s.error, 'second');
});

test('a genuinely NEW question still clears the old error', () => {
  // A dependency change is a different question; carrying the previous
  // question's failure into it would be a claim about the wrong data.
  let s = settled();
  s = asyncReducer(s, { kind: 'start', fresh: false, seq: 2 });
  s = asyncReducer(s, { kind: 'failed', message: 'offline', seq: 2 });
  const fresh = asyncReducer(s, { kind: 'start', fresh: true, seq: 3 });
  assert.equal(fresh.error, null);
  assert.equal(fresh.state, 'loading');
});
