import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldDefer } from './deferral';

/**
 * A BUS BUMP ON A HIDDEN SCREEN IS REMEMBERED, NOT FETCHED.
 *
 * Run: npx tsx --test src/data/deferral.test.ts
 *
 * Baseline this exists to end (fake network, 1,644 members, five screens
 * mounted): one member Save produced 52 requests, 27 of them metrics pages,
 * because every mounted reader re-ran its load. After this rule only the
 * readers on the screen somebody is looking at run now; the rest run once,
 * when shown.
 */
const base = { fresh: false, keyMoved: true, retried: false, focused: false, hasData: true };

test('a bus bump on a hidden screen holding data is deferred', () => {
  assert.equal(shouldDefer(base), true);
});

test('the same bump on the focused screen runs now', () => {
  assert.equal(shouldDefer({ ...base, focused: true }), false);
});

test('a new question (deps moved / first run) is never deferred, hidden or not', () => {
  assert.equal(shouldDefer({ ...base, fresh: true }), false);
  assert.equal(shouldDefer({ ...base, fresh: true, keyMoved: false }), false);
});

test('a retry is never deferred: it is either a person pressing Retry or the deferral being honoured', () => {
  assert.equal(shouldDefer({ ...base, retried: true }), false);
});

test('a hidden reader with nothing loaded yet keeps loading rather than deferring', () => {
  assert.equal(shouldDefer({ ...base, hasData: false }), false);
});

test('nothing moved: nothing to defer', () => {
  assert.equal(shouldDefer({ ...base, keyMoved: false }), false);
});
