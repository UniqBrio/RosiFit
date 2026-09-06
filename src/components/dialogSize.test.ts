/**
 * The dialog card's height cap.
 *
 * The case that matters is the one that shipped: a viewport reported as 0,
 * which multiplied out to a 2px card with the form clipped away inside it
 * (TD-021). A cap of `undefined` is the whole fix -- no cap until there is
 * a viewport to take 90% of.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dialogMaxHeight, DIALOG_MAX_H } from './dialogSize';

test('a real viewport is capped at 90% of itself', () => {
  assert.equal(dialogMaxHeight(900), 900 * DIALOG_MAX_H);
  assert.equal(dialogMaxHeight(1080), 1080 * DIALOG_MAX_H);
});

test('a viewport of zero is not capped at zero — it is not capped at all', () => {
  // This is TD-021: 0 * 0.9 = 0, and `overflow: hidden` clipped the form away.
  assert.equal(dialogMaxHeight(0), undefined);
});

test('a viewport that is not a number does not become a NaN height', () => {
  assert.equal(dialogMaxHeight(Number.NaN), undefined);
  assert.equal(dialogMaxHeight(Number.POSITIVE_INFINITY), undefined);
});

test('a negative measurement is treated as no measurement', () => {
  assert.equal(dialogMaxHeight(-900), undefined);
});

test('the cap always leaves the dialog short of the full viewport', () => {
  for (const h of [320, 640, 900, 1440, 2160]) {
    const cap = dialogMaxHeight(h)!;
    assert.ok(cap < h, `${h} should be capped below itself`);
    assert.ok(cap > 0);
  }
});
