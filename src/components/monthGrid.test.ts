/**
 * What the month grid draws.
 *
 * Written against the days that are easy to get wrong by one: a month that
 * begins on a Monday (no leading week at all), one that begins on a Sunday
 * (a full leading week), a February, and the two year boundaries where the
 * grid has to reach into a different year.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthCells, isOutside, monthKey, GRID_DAYS } from './monthGrid';

/** Every month draws six whole weeks, so the panel keeps one height. */
test('every month is six whole weeks, whatever its length', () => {
  for (let m = 0; m < 12; m++) {
    assert.equal(monthCells(2026, m).length, GRID_DAYS, `month ${m}`);
    assert.equal(GRID_DAYS % 7, 0);
  }
  // A 28-day February and a 31-day month draw the same number of cells.
  assert.equal(monthCells(2027, 1).length, monthCells(2026, 0).length);
});

test('the week starts on Monday, not Sunday', () => {
  // 1 Sep 2026 is a Tuesday, so the grid opens on Monday 31 August.
  assert.equal(monthCells(2026, 8)[0], '2026-08-31');
  // Sunday-first would have opened on 30 August. It must not.
  assert.notEqual(monthCells(2026, 8)[0], '2026-08-30');
});

test('a month that begins on a Monday still begins its own grid', () => {
  // 1 June 2026 is a Monday: no day of May is drawn.
  assert.equal(monthCells(2026, 5)[0], '2026-06-01');
  assert.ok(!isOutside(monthCells(2026, 5)[0], 2026, 5));
});

test('a month that begins on a Sunday draws a whole leading week', () => {
  // 1 Nov 2026 is a Sunday: Monday 26 October opens the grid.
  const cells = monthCells(2026, 10);
  assert.equal(cells[0], '2026-10-26');
  assert.equal(cells[6], '2026-11-01');
});

test('the days of the month are unbroken and in order', () => {
  const cells = monthCells(2026, 8);
  const own = cells.filter(d => !isOutside(d, 2026, 8));
  assert.equal(own.length, 30);                    // September
  assert.equal(own[0], '2026-09-01');
  assert.equal(own[own.length - 1], '2026-09-30');
  assert.deepEqual(own, [...own].sort());
});

test('the days either side are the neighbouring months, not blanks', () => {
  const cells = monthCells(2026, 8);
  assert.ok(isOutside(cells[0], 2026, 8));
  assert.equal(cells[0].slice(0, 7), '2026-08');
  const last = cells[GRID_DAYS - 1];
  assert.ok(isOutside(last, 2026, 8));
  assert.equal(last.slice(0, 7), '2026-10');
});

test('January reaches back into the previous year', () => {
  // 1 Jan 2027 is a Friday, so the grid opens on Monday 28 December 2026.
  const cells = monthCells(2027, 0);
  assert.equal(cells[0], '2026-12-28');
  assert.ok(isOutside(cells[0], 2027, 0));
});

test('December reaches forward into the next year', () => {
  const cells = monthCells(2026, 11);
  const last = cells[GRID_DAYS - 1];
  assert.equal(last.slice(0, 4), '2027');
  assert.ok(isOutside(last, 2026, 11));
});

test('February in a leap year keeps its 29th', () => {
  const own = monthCells(2028, 1).filter(d => !isOutside(d, 2028, 1));
  assert.equal(own.length, 29);
  assert.equal(own[own.length - 1], '2028-02-29');
});

test('the month key is the prefix an ISO day of that month carries', () => {
  assert.equal(monthKey(2026, 8), '2026-09');
  assert.equal(monthKey(2026, 0), '2026-01');
  assert.equal(monthKey(2026, 11), '2026-12');
});

test('every cell is a real ISO day and no day is drawn twice', () => {
  const cells = monthCells(2026, 8);
  for (const d of cells) assert.match(d, /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(new Set(cells).size, GRID_DAYS);
});
