/**
 * Where the date panel lands.
 *
 * Written against the four places a date field can be: in the middle of a
 * desktop window, hard against its right edge, low on a phone with nothing
 * below it, and on a window too short to hold the calendar either way. The
 * panel is 360 x 430 throughout, which is what the picker draws.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { placePanel, anchoredWidth, PANEL_GAP, PANEL_EDGE } from './datePanel';

const PANEL = { width: 360, height: 430 };
const DESKTOP = { width: 1440, height: 900 };
const PHONE = { width: 420, height: 900 };

test('nothing to anchor to yet is not a guess at a position', () => {
  assert.equal(placePanel(null, DESKTOP, PANEL), null);
});

test('under the field, at its left edge', () => {
  const at = placePanel({ x: 457, y: 300, w: 257, h: 52 }, DESKTOP, PANEL);
  assert.deepEqual(at, { left: 457, top: 300 + 52 + PANEL_GAP });
});

test('a field against the right edge pulls its panel back inside the window', () => {
  const at = placePanel({ x: 1300, y: 200, w: 120, h: 52 }, DESKTOP, PANEL)!;
  assert.equal(at.left, DESKTOP.width - PANEL.width - PANEL_EDGE);
  assert.ok(at.left + PANEL.width <= DESKTOP.width - PANEL_EDGE);
});

test('a field low on a phone opens ABOVE itself rather than off the bottom', () => {
  const at = placePanel({ x: 16, y: 700, w: 388, h: 52 }, PHONE, PANEL)!;
  assert.equal(at.top, 700 - PANEL.height - PANEL_GAP);
  assert.ok(at.top >= PANEL_EDGE);
});

test('room below is preferred even when there is room above as well', () => {
  const at = placePanel({ x: 16, y: 300, w: 388, h: 52 }, PHONE, PANEL)!;
  assert.equal(at.top, 300 + 52 + PANEL_GAP);
});

test('a window too short for either side still puts the whole panel on screen', () => {
  const short = { width: 420, height: 500 };
  const at = placePanel({ x: 16, y: 300, w: 388, h: 52 }, short, PANEL)!;
  assert.ok(at.top >= PANEL_EDGE);
  assert.equal(at.top, short.height - PANEL.height - PANEL_EDGE);
});

test('a window shorter than the panel itself never places it off the top', () => {
  const tiny = { width: 420, height: 300 };
  const at = placePanel({ x: 16, y: 100, w: 388, h: 52 }, tiny, PANEL)!;
  assert.equal(at.top, PANEL_EDGE);
});

test('a window narrower than the panel never places it off the left', () => {
  const narrow = { width: 320, height: 900 };
  const at = placePanel({ x: 200, y: 100, w: 100, h: 52 }, narrow, PANEL)!;
  assert.equal(at.left, PANEL_EDGE);
});

/* ---- a list panel is as wide as the field it opens under
 * (requests/2026-09-06-pickers-open-under-their-field.md) */

test('a list panel takes the width of its field', () => {
  assert.equal(anchoredWidth({ x: 320, y: 300, w: 512, h: 52 }, DESKTOP.width, 360), 512);
});

test('with nothing measured yet the fallback width stands in', () => {
  assert.equal(anchoredWidth(null, DESKTOP.width, 360), 360);
  assert.equal(anchoredWidth({ x: 0, y: 0, w: 0, h: 0 }, DESKTOP.width, 360), 360);
});

test('a field wider than the window gives a panel that still fits the window', () => {
  const w = anchoredWidth({ x: 0, y: 300, w: 600, h: 52 }, PHONE.width, 360);
  assert.equal(w, PHONE.width - PANEL_EDGE * 2);
});

test('a window that reports no width yet does not shrink the panel to nothing', () => {
  assert.equal(anchoredWidth({ x: 0, y: 0, w: 512, h: 52 }, 0, 360), 512);
});
