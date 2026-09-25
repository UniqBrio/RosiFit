import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COALESCE_MS, STALE_AFTER_MS, createCoalescer,
  registerRevalidator, revalidateStale, revalidatorCount, resetRevalidators,
} from './revalidate';
import { LOAD_TIMEOUT_MS } from './asyncState';

/**
 * T5–T7: ONE REFRESH PER BURST, NEVER DURING A WRITE, NEVER FOR FRESH DATA.
 *
 * Run: npx tsx --test src/data/revalidate.test.ts
 *
 * Returning to a backgrounded tab fires `visibilitychange` AND `focus`, and
 * `online` can land in the same moment. Three events, one intention. Left
 * alone that is three full data fan-outs — and `fetchAttendance` is a paged,
 * chunked read that a busy week measured at 2,220 records (RC-039/RC-045).
 *
 * The rules this file holds, all pure so they can be read without a browser
 * (`src/pwa/DataRefresh.tsx` is the wiring, the same split `deployment.ts` has
 * from `DeploymentRefresh.tsx`):
 *
 *   ONE PER BURST         — events inside COALESCE_MS are one revalidation
 *   NEVER DURING A WRITE  — isWriteInFlight() outranks every lifecycle event
 *   NOT IF IT IS FRESH    — data younger than STALE_AFTER_MS is left alone
 */

/** A coalescer driven by a fake clock, so no test waits on a real timer. */
function fakeTimers() {
  let now = 0;
  const due = new Map<number, { at: number; run: () => void }>();
  let next = 1;
  return {
    setTimer: (run: () => void, ms: number) => { due.set(next, { at: now + ms, run }); return next++; },
    clearTimer: (id: number) => { due.delete(id); },
    advance(ms: number) {
      now += ms;
      for (const [id, t] of [...due.entries()]) {
        if (t.at <= now) { due.delete(id); t.run(); }
      }
    },
  };
}

test.beforeEach(() => resetRevalidators());

/* ------------------------------------------------------ T5: coalescing */

test('T5A: focus then visibilitychange inside the window is ONE refresh', () => {
  const timers = fakeTimers();
  let runs = 0;
  const c = createCoalescer(() => { runs++; }, timers);
  c.request();                      // focus
  timers.advance(10);
  c.request();                      // visibilitychange
  timers.advance(COALESCE_MS);
  assert.equal(runs, 1, `two lifecycle events produced ${runs} refreshes`);
});

test('T5B: visibilitychange then focus inside the window is ONE refresh', () => {
  const timers = fakeTimers();
  let runs = 0;
  const c = createCoalescer(() => { runs++; }, timers);
  c.request();
  timers.advance(1);
  c.request();
  timers.advance(COALESCE_MS);
  assert.equal(runs, 1);
});

test('T5: three events — focus, visibilitychange and online — are still ONE refresh', () => {
  const timers = fakeTimers();
  let runs = 0;
  const c = createCoalescer(() => { runs++; }, timers);
  c.request(); c.request(); c.request();
  timers.advance(COALESCE_MS);
  assert.equal(runs, 1);
});

test('T5C: a separate event AFTER the window can refresh again', () => {
  const timers = fakeTimers();
  let runs = 0;
  const c = createCoalescer(() => { runs++; }, timers);
  c.request();
  timers.advance(COALESCE_MS);
  assert.equal(runs, 1);
  c.request();
  timers.advance(COALESCE_MS);
  assert.equal(runs, 2, 'a later, deliberate return to the app was swallowed');
});

test('T5: nothing runs before the window closes', () => {
  const timers = fakeTimers();
  let runs = 0;
  const c = createCoalescer(() => { runs++; }, timers);
  c.request();
  timers.advance(COALESCE_MS - 1);
  assert.equal(runs, 0);
});

test('T5: cancel stops a pending burst, so unmount cannot fire one', () => {
  const timers = fakeTimers();
  let runs = 0;
  const c = createCoalescer(() => { runs++; }, timers);
  c.request();
  c.cancel();
  timers.advance(COALESCE_MS * 4);
  assert.equal(runs, 0);
});

/* ------------------------------------------- T6: never during a write */

test('T6: no revalidation is started while a protected write is in flight', () => {
  let asked = 0;
  registerRevalidator({ revalidate: () => { asked++; }, fetchedAt: () => 0 });
  const done = revalidateStale({ now: 10 * 60_000, writeInFlight: true });
  assert.equal(asked, 0, 'a lifecycle refresh raced an open import');
  assert.equal(done, 0);
});

test('T6: the same registrations DO revalidate once the write is finished', () => {
  let asked = 0;
  registerRevalidator({ revalidate: () => { asked++; }, fetchedAt: () => 0 });
  revalidateStale({ now: 10 * 60_000, writeInFlight: false });
  assert.equal(asked, 1);
});

/* --------------------------------------- T7: not if it is already fresh */

test('T7: data fetched moments ago is not fetched again', () => {
  let asked = 0;
  const at = 100_000;
  registerRevalidator({ revalidate: () => { asked++; }, fetchedAt: () => at });
  revalidateStale({ now: at + STALE_AFTER_MS - 1, writeInFlight: false });
  assert.equal(asked, 0, 'focus refetched data that was still fresh');
});

test('T7: data older than the floor IS fetched again', () => {
  let asked = 0;
  const at = 100_000;
  registerRevalidator({ revalidate: () => { asked++; }, fetchedAt: () => at });
  revalidateStale({ now: at + STALE_AFTER_MS, writeInFlight: false });
  assert.equal(asked, 1);
});

test('T7: something that has never loaded is always revalidated', () => {
  // No answer on screen at all — there is nothing to keep fresh, and the
  // screen is showing a skeleton or an error that a retry may clear.
  let asked = 0;
  registerRevalidator({ revalidate: () => { asked++; }, fetchedAt: () => null });
  revalidateStale({ now: 1, writeInFlight: false });
  assert.equal(asked, 1);
});

test('T7: a mixed set revalidates only the stale half', () => {
  const asked: string[] = [];
  const now = 500_000;
  registerRevalidator({ revalidate: () => asked.push('fresh'), fetchedAt: () => now - 1 });
  registerRevalidator({ revalidate: () => asked.push('stale'), fetchedAt: () => now - STALE_AFTER_MS });
  revalidateStale({ now, writeInFlight: false });
  assert.deepEqual(asked, ['stale']);
});

/* --------------------------------------------------- registry lifecycle */

test('unregistering removes it, so an unmounted screen is never refetched', () => {
  let asked = 0;
  const off = registerRevalidator({ revalidate: () => { asked++; }, fetchedAt: () => null });
  off();
  assert.equal(revalidatorCount(), 0);
  revalidateStale({ now: 1, writeInFlight: false });
  assert.equal(asked, 0);
});

test('one registration failing does not stop the rest', () => {
  let second = 0;
  registerRevalidator({ revalidate: () => { throw new Error('boom'); }, fetchedAt: () => null });
  registerRevalidator({ revalidate: () => { second++; }, fetchedAt: () => null });
  assert.doesNotThrow(() => revalidateStale({ now: 1, writeInFlight: false }));
  assert.equal(second, 1);
});

/* ------------------------------------------------------------ constants */

test('the staleness floor is DERIVED from the load deadline, not invented', () => {
  // A fetch started now may take as long as LOAD_TIMEOUT_MS to answer, so
  // data younger than that cannot usefully be fetched again — the refresh
  // could finish no sooner than the data is old. That is the derivation, and
  // it is why this is not a product-level number somebody picked.
  assert.equal(STALE_AFTER_MS, LOAD_TIMEOUT_MS);
});

test('the coalescing window is far below the smallest existing lifecycle interval', () => {
  // deployment.ts's RETRY_MS is 15_000, its POLL_MS 300_000. The window here
  // only has to span one tab activation — the browser dispatches focus and
  // visibilitychange in separate tasks of the same transition — so it is
  // bounded well under anything a person could produce twice on purpose.
  assert.ok(COALESCE_MS > 0 && COALESCE_MS <= 1_000,
    `${COALESCE_MS}ms is not a burst window`);
});

/* ----------------------------- a read already in flight is left alone */

test('a read with a fetch already open is NOT restarted', () => {
  /* `revalidate` is the hook's `retry`: it re-runs the effect, whose cleanup
     cancels the open request and discards its answer. So a burst landing on
     an in-flight read does not add a request, it restarts one from zero — and
     a slow attendance read could be restarted indefinitely by somebody
     switching apps. Found by the code review of this change. */
  let asked = 0;
  registerRevalidator({
    revalidate: () => { asked++; }, fetchedAt: () => null, busy: () => true,
  });
  revalidateStale({ now: 10 * 60_000, writeInFlight: false });
  assert.equal(asked, 0, 'a burst restarted a fetch that was already running');
});

test('busy outranks the "never loaded is always worth asking" rule', () => {
  // fetchedAt is the last SUCCESSFUL fetch, so a first load in progress reports
  // null — the one case the floor always lets through, and the one that must
  // not be restarted.
  let asked = 0;
  registerRevalidator({
    revalidate: () => { asked++; }, fetchedAt: () => null, busy: () => true,
  });
  revalidateStale({ now: 1, writeInFlight: false });
  assert.equal(asked, 0);
});

test('once the fetch settles, the same reader is asked again', () => {
  let open = true;
  let asked = 0;
  registerRevalidator({
    revalidate: () => { asked++; }, fetchedAt: () => null, busy: () => open,
  });
  revalidateStale({ now: 1, writeInFlight: false });
  assert.equal(asked, 0);
  open = false;
  revalidateStale({ now: 2, writeInFlight: false });
  assert.equal(asked, 1, 'a reader that finished is never asked again');
});

test('a reader that does not report busy at all still works', () => {
  // `busy` is optional so nothing outside this file is obliged to answer it.
  let asked = 0;
  registerRevalidator({ revalidate: () => { asked++; }, fetchedAt: () => null });
  revalidateStale({ now: 1, writeInFlight: false });
  assert.equal(asked, 1);
});

test('a busy() that throws is treated as busy, not as a reason to fetch', () => {
  let asked = 0;
  registerRevalidator({
    revalidate: () => { asked++; },
    fetchedAt: () => null,
    busy: () => { throw new Error('mid-unmount'); },
  });
  assert.doesNotThrow(() => revalidateStale({ now: 1, writeInFlight: false }));
  assert.equal(asked, 0);
});
