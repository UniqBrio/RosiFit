import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  KEYPAD_COLUMNS, KEYPAD_GUTTER, KEYPAD_CELL_WIDTH,
  keypadRow, keypadCell, columnsThatFit,
} from './keypadGrid';

/**
 * The twelve-key PIN pad is three to a row, on the narrowest phone
 * (requests/2026-09-07-pin-keypad-two-per-row.md).
 *
 * WHAT THIS HOLDS
 * - Three cells fit a row at every mobile content width, not just wide ones.
 *   Both keypads used to say `width: '31.5%'` beside `gap: 10`, and a flex
 *   line breaks on WIDTHS PLUS GAPS: three of them need 94.5% + 20px, which
 *   only fits once the container passes ~364px. Every phone below a Pixel
 *   got two keys to a row and `flexGrow: 1` stretched the pair to full
 *   width, so the fault looked like a design choice rather than a wrap.
 * - The gutter is therefore PADDING INSIDE each cell, never a flex `gap`:
 *   padding does not enter the line-breaking sum, so the arithmetic cannot
 *   come apart again at a width nobody previewed.
 * - Both screens draw from this one module. Sign-in and Set PIN each had
 *   their own copy of the numbers, which is how one could be fixed while
 *   its twin shipped broken.
 *
 * The width assertions are arithmetic on the shipped values, so they fail
 * for the real reason. The last two read source, as staffShell.test.ts and
 * overviewGrid.test.ts do and for the same reason: there is no component
 * harness here, and the claim is about which module the screens use.
 */

const ROOT = process.env.KEYPAD_GRID_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SIGN_IN = 'app/index.tsx';
const SET_PIN = 'app/set-pin.tsx';

/* The content width each keypad actually gets, at the phone widths people
 * hold. Sign-in's card pads SPACE.xl (20) a side; Set PIN's Screen pads
 * SPACE.lg (16). Both were below the ~364px the old numbers needed. */
const PHONES = [320, 360, 375, 390, 393, 412, 430];

/* The row's own horizontal gap, as a number. It must be zero -- see the last
 * assertion below -- and reading it here rather than hard-coding 0 is what
 * makes the width assertions fail if somebody puts a gap back. */
const ROW_GAP = typeof keypadRow.columnGap === 'number' ? keypadRow.columnGap : 0;

test('three keys fit a row on every phone, at sign-in', () => {
  for (const vw of PHONES) {
    const content = vw - 2 * 20;
    assert.equal(
      columnsThatFit(content, KEYPAD_CELL_WIDTH, ROW_GAP),
      KEYPAD_COLUMNS,
      `sign-in at ${vw}px wide (${content}px of content) does not fit ${KEYPAD_COLUMNS} keys to a row.`);
  }
});

test('three keys fit a row on every phone, on the PIN screens', () => {
  for (const vw of PHONES) {
    const content = vw - 2 * 16;
    assert.equal(
      columnsThatFit(content, KEYPAD_CELL_WIDTH, ROW_GAP),
      KEYPAD_COLUMNS,
      `set-pin at ${vw}px wide (${content}px of content) does not fit ${KEYPAD_COLUMNS} keys to a row.`);
  }
});

test('the columns never sum past the row', () => {
  const pct = parseFloat(KEYPAD_CELL_WIDTH);
  assert.ok(KEYPAD_COLUMNS * pct <= 100,
    `${KEYPAD_COLUMNS} x ${KEYPAD_CELL_WIDTH} is ${KEYPAD_COLUMNS * pct}% -- over a full row, so the last key wraps.`);
});

test('the gutter is padding inside the cell, not a flex gap', () => {
  assert.equal(ROW_GAP, 0,
    'the keypad row carries a horizontal gap; gaps enter the line-breaking sum and are what broke this.');
  assert.equal(keypadCell.paddingHorizontal, KEYPAD_GUTTER / 2,
    'the cell does not carry half the gutter as padding, so the keys will touch.');
  assert.equal(keypadRow.marginHorizontal, -KEYPAD_GUTTER / 2,
    'the row does not pull back the outer half-gutters, so the pad is inset from the screen edges.');
});

test('a wider gutter still fits three, because it never wraps', () => {
  // The regression guard: the old shape failed as soon as the gutter grew
  // relative to the width. Padding cannot do that.
  assert.equal(columnsThatFit(240, KEYPAD_CELL_WIDTH, 0), KEYPAD_COLUMNS);
  assert.equal(columnsThatFit(1024, KEYPAD_CELL_WIDTH, 0), KEYPAD_COLUMNS);
});

test('columnsThatFit reproduces the reported fault from the old numbers', () => {
  // 31.5% beside a 10px gap -- what both screens shipped. Two to a row on a
  // 360px phone is exactly what was reported, so the helper is measuring the
  // thing that was wrong.
  assert.equal(columnsThatFit(360 - 40, '31.5%', 10), 2);
  assert.equal(columnsThatFit(360 - 32, '31.5%', 10), 2);
});

test('both keypads draw from this module, so they cannot drift apart', () => {
  for (const rel of [SIGN_IN, SET_PIN]) {
    const src = read(rel);
    assert.ok(src.includes('keypadGrid'),
      `${rel}: the keypad does not import src/components/keypadGrid.`);
    assert.ok(!src.includes("width: '31.5%'"),
      `${rel}: still carries the hand-written 31.5% key width.`);
  }
});
