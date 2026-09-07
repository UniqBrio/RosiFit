import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { swipeHint, type ScrollCol } from './tableScroll';

/**
 * requests/2026-09-07-audit-log-for-end-users.md, correction round 2 --
 * "the audit log in mobile view should also be in table format and where is
 * remarks section new value previous value smodiefied at and modified by
 * fields?"
 *
 * Nothing was missing. app/audit.tsx has had all five columns since the
 * round-1 rebuild, and it is one table at every width by design. What it did
 * not have was any way to find out: on a 390pt phone the 760pt table shows
 * "What changed" and half of "Previous value", and the horizontal scrollbar
 * on a touch screen is an overlay that appears only once you are already
 * scrolling. Four columns were one swipe away and nothing said so, so the
 * reader concluded they were gone.
 *
 * The guard is on the arithmetic rather than the pixels, because that is
 * where it can go wrong quietly:
 *
 *   - the hint appears on a desktop, where nothing is hidden. A permanent
 *     "swipe sideways" on a table that does not scroll is an instruction
 *     that does not work;
 *   - the hint names a column that IS on screen, or stops naming one that is
 *     not. Either way the sentence is a false statement about the table it
 *     sits on, on the one screen whose whole promise is that nothing is
 *     hidden;
 *   - it flashes before layout, when both measurements are still 0;
 *   - it goes on saying "swipe sideways" at the right-hand end, where there
 *     is nothing further to swipe to.
 *
 * COLS is read out of app/audit.tsx rather than duplicated, so a sixth
 * column or a re-weighting cannot leave this spec testing a table the screen
 * no longer draws.
 */

const ROOT = process.env.TABLE_SCROLL_SPEC_ROOT ?? process.cwd();
const AUDIT = 'app/audit.tsx';
const source = fs.readFileSync(path.join(ROOT, AUDIT), 'utf8');

/** The screen's own five columns, parsed from its COLS literal. */
function auditCols(): ScrollCol[] {
  const block = source.match(/const COLS = \[([\s\S]*?)\] as const;/);
  assert.ok(block, `${AUDIT} no longer declares a COLS literal`);
  const cols = [...block[1].matchAll(/label:\s*'([^']+)',\s*flex:\s*([\d.]+)/g)]
    .map(m => ({ label: m[1], flex: Number(m[2]) }));
  assert.ok(cols.length >= 2, 'COLS parsed to fewer than two columns');
  return cols;
}

const COLS = auditCols();
/** app/audit.tsx's own TABLE_MIN, for the same reason. */
const TABLE_MIN = Number(source.match(/const TABLE_MIN = (\d+);/)?.[1]);
const PHONE = 358;   // 390pt phone less the screen's SPACE.lg padding
const DESKTOP = 1100;

test('the audit table still has the five columns this hint names', () => {
  assert.deepEqual(COLS.map(c => c.label), [
    'What changed', 'Previous value', 'New value', 'Modified by', 'Modified at',
  ]);
  assert.equal(Number.isFinite(TABLE_MIN) && TABLE_MIN > 0, true);
});

test('no hint on a desktop, where every column is already on screen', () => {
  const h = swipeHint(COLS, 0, DESKTOP, DESKTOP);
  assert.equal(h.overflows, false);
  assert.equal(h.text, null);
});

test('no hint before layout has measured anything', () => {
  assert.equal(swipeHint(COLS, 0, 0, 0).text, null);
  assert.equal(swipeHint(COLS, 0, PHONE, 0).text, null);
  assert.equal(swipeHint(COLS, 0, 0, TABLE_MIN).text, null);
});

test('on a phone at rest it names every column that is off the right edge', () => {
  const h = swipeHint(COLS, 0, PHONE, TABLE_MIN);
  assert.equal(h.overflows, true);
  assert.deepEqual(h.left, []);
  // "What changed" is 2.7/9.6 of 760 = 214pt and fits; "Previous value" ends
  // at 364pt and does not, so it is named along with the three behind it.
  assert.deepEqual(h.right, ['Previous value', 'New value', 'Modified by', 'Modified at']);
  assert.equal(h.text,
    'Swipe the table sideways for Previous value, New value, Modified by and Modified at');
});

test('a column half on screen is named, because half a value cannot be read', () => {
  const total = COLS.reduce((s, c) => s + c.flex, 0);
  const firstW = (COLS[0].flex / total) * TABLE_MIN;
  // A window ending 10pt into the second column.
  const h = swipeHint(COLS, 0, firstW + 10, TABLE_MIN);
  assert.equal(h.right[0], 'Previous value');
});

test('the sentence follows the swipe', () => {
  const mid = swipeHint(COLS, 300, PHONE, TABLE_MIN);
  assert.equal(mid.left.includes('What changed'), true);
  assert.equal(mid.right.length > 0, true);
  assert.match(mid.text ?? '', /^Swipe the table sideways for /);
  // Nothing is named twice -- a column cannot be both behind and ahead.
  assert.equal(mid.left.some(l => mid.right.includes(l)), false);
});

test('at the right-hand end it stops telling the reader to swipe further', () => {
  const end = swipeHint(COLS, TABLE_MIN - PHONE, PHONE, TABLE_MIN);
  assert.deepEqual(end.right, []);
  assert.equal(end.left.length > 0, true);
  assert.match(end.text ?? '', /^That is every column/);
  assert.doesNotMatch(end.text ?? '', /sideways/);
});

test('every column can be read in full at some point along the swipe', () => {
  // The property that matters is not that the two ENDS cover everything --
  // with a 358pt window on a 760pt table, "Previous value" and "New value"
  // are fully on screen only in the middle of the swipe. It is that no
  // column is unreadable at every position, which is what a column wider
  // than the phone would be: reachable, and never once whole.
  const max = TABLE_MIN - PHONE;
  const everWhole = new Set<string>();
  for (let x = 0; x <= max; x += 2) {
    const h = swipeHint(COLS, x, PHONE, TABLE_MIN);
    for (const c of COLS) {
      if (!h.right.includes(c.label) && !h.left.includes(c.label)) everWhole.add(c.label);
    }
  }
  assert.deepEqual([...everWhole].sort(), COLS.map(c => c.label).sort());
});

test('the screen mounts the hint, keyed off the body scroller it describes', () => {
  assert.match(source, /from '\.\.\/src\/components\/tableScroll'/,
    'app/audit.tsx no longer imports the hint');
  assert.match(source, /testID="audit-swipe-hint"/,
    'the hint bar lost its testID');
  for (const wiring of [/onContentSizeChange=/, /onLayout=/]) {
    assert.match(source, wiring,
      'the body scroller stopped reporting the measurements the hint needs');
  }
});
