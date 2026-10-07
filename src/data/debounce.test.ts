import test from 'node:test';
import assert from 'node:assert/strict';
import { QUIET_MS, applyAfterMs } from './debounce';

/**
 * Run: npx tsx --test src/data/debounce.test.ts
 */
test('a typed query is applied after the quiet window, not on the keystroke', () => {
  assert.equal(applyAfterMs('pri'), QUIET_MS);
});

test('clearing the box is applied at once -- a delay there reads as a list that lost rows', () => {
  assert.equal(applyAfterMs(''), 0);
  assert.equal(applyAfterMs('   '), 0);
});

test('the quiet window is short enough not to read as thinking', () => {
  assert.ok(QUIET_MS >= 100 && QUIET_MS <= 250, `${QUIET_MS} ms`);
});
