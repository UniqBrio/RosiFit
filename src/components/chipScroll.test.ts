/**
 * The arrows on a chip row.
 *
 * The case the requester reported is the last test here: thirteen detail
 * names, five of them visible, and no way to learn the other eight existed.
 * So the test that matters is not "the arrow moves the row" -- it is "tapping
 * the arrow enough times reaches the END of the row", every width.
 *
 * The case that would ship a NEW defect is the first one: widths of zero.
 * Before `onLayout` runs there is no measurement, and treating that as a
 * measurement of zero puts two dead arrows on every row (TD-021's mistake,
 * pointed the other way).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CHIP_EPSILON, CHIP_OVERLAP,
  chipScroll, chipStep, chipsOverflow, maxChipOffset, nextChipOffset,
} from './chipScroll';

test('an unmeasured row has no arrows — zero is not a width', () => {
  assert.equal(chipsOverflow(0, 0), false);
  assert.equal(chipsOverflow(900, 0), false);
  assert.equal(chipsOverflow(0, 300), false);
  const s = chipScroll(0, 0, 0);
  assert.deepEqual(s, { overflows: false, canLeft: false, canRight: false });
});

test('a nonsense measurement is treated as no measurement', () => {
  assert.equal(chipsOverflow(Number.NaN, 300), false);
  assert.equal(chipsOverflow(900, Number.POSITIVE_INFINITY), false);
  assert.equal(chipsOverflow(-900, 300), false);
  assert.equal(maxChipOffset(Number.NaN, 300), 0);
});

test('a row that fits gets no arrows, and sub-pixel slack does not count', () => {
  assert.equal(chipsOverflow(300, 300), false);
  assert.equal(chipsOverflow(280, 300), false);
  // Fractional web layout: the same width measured twice, off by a whisker.
  assert.equal(chipsOverflow(312.5, 312), false);
  assert.equal(chipsOverflow(300 + CHIP_EPSILON, 300), false);
  assert.equal(chipsOverflow(300 + CHIP_EPSILON + 0.5, 300), true);
});

test('at the left end only the right arrow is live, and the other way at the right end', () => {
  const content = 900, view = 300;             // max offset 600
  assert.deepEqual(chipScroll(0, content, view),
    { overflows: true, canLeft: false, canRight: true });
  assert.deepEqual(chipScroll(300, content, view),
    { overflows: true, canLeft: true, canRight: true });
  assert.deepEqual(chipScroll(600, content, view),
    { overflows: true, canLeft: true, canRight: false });
});

test('an offset past either end still reports honestly', () => {
  // iOS rubber-banding and a stale offset both hand us out-of-range numbers.
  assert.deepEqual(chipScroll(-40, 900, 300),
    { overflows: true, canLeft: false, canRight: true });
  assert.deepEqual(chipScroll(9000, 900, 300),
    { overflows: true, canLeft: true, canRight: false });
});

test('one tap keeps a chip from the old view on screen', () => {
  assert.equal(chipStep(300), 300 - CHIP_OVERLAP);
  assert.ok(chipStep(300) < 300, 'a full-width jump leaves no landmark');
});

test('a narrow row still advances by a useful amount', () => {
  // viewport - 48 is 12px here, which is not a move.
  assert.equal(chipStep(60), 30);
  assert.equal(chipStep(96), 48);
  assert.equal(chipStep(0), 0);
});

test('the arrows clamp to the row rather than running off it', () => {
  assert.equal(nextChipOffset(-1, 0, 900, 300), 0);
  assert.equal(nextChipOffset(1, 600, 900, 300), 600);
  assert.equal(nextChipOffset(1, 0, 900, 300), 252);
  assert.equal(nextChipOffset(-1, 252, 900, 300), 0);
});

test('tapping right reaches the last chip, at every width', () => {
  // 13 chips, roughly 90px each, in the dialog widths this form is opened at.
  const content = 13 * 90;
  for (const view of [240, 300, 320, 375, 414, 480, 560, 640, 900]) {
    if (!chipsOverflow(content, view)) continue;
    let at = 0;
    let taps = 0;
    while (chipScroll(at, content, view).canRight) {
      at = nextChipOffset(1, at, content, view);
      taps += 1;
      assert.ok(taps < 100, `width ${view} never reaches the end`);
    }
    assert.equal(at, maxChipOffset(content, view), `width ${view} stops short`);
    // And back again, so nothing is reachable in one direction only.
    while (chipScroll(at, content, view).canLeft) at = nextChipOffset(-1, at, content, view);
    assert.equal(at, 0, `width ${view} cannot get back to the first chip`);
  }
});
