import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The Overview's four sections sit two per row, and the course and period
 * sections are rings (requests/2026-09-06-overview-two-per-row-donuts.md).
 *
 * WHAT THIS HOLDS
 * - The four cards share ONE grid whose direction follows the width, so the
 *   sections cannot fall out of step with each other -- three in a row and
 *   one under, or two widths of card in one row.
 * - Based on course and Based on period draw the SAME ring component, fed
 *   the same ReportRow the bars read, so the ring cannot count its own
 *   total (guardrail 1). The dot plot and the line they replaced are gone,
 *   not left behind as a second way to draw the section.
 * - A ring never says a colour alone: Present and Absent are named in words
 *   beside a glyph (guardrail 3), and "nothing expected" is a dash, never 0%.
 *
 * It reads source rather than rendering, as staffShell.test.ts does and for
 * the same reason: there is no component harness here, and the claim is
 * about the shape of the code. Every assertion is a plain string search.
 */

const ROOT = process.env.OVERVIEW_GRID_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

const OVERVIEW = 'app/(tabs)/index.tsx';
const RINGS = 'src/components/AttendanceRings.tsx';

test('the spec is looking at a real tree', () => {
  assert.ok(exists(OVERVIEW), `${OVERVIEW} is missing`);
});

test('the four sections sit in one grid that goes two-up by width', () => {
  const src = read(OVERVIEW);
  assert.ok(src.includes("testID=\"home-sections\""),
    `${OVERVIEW}: the four sections are not wrapped in one grid (home-sections).`);
  assert.ok(src.includes('TWO_UP_MIN'),
    `${OVERVIEW}: the grid has no named width at which it goes two per row.`);
  assert.ok(src.includes("flexWrap: twoUp ? 'wrap' : 'nowrap'"),
    `${OVERVIEW}: the grid does not wrap when two-up, so a third card could not start a second row.`);
});

test('Based on course and Based on period are rings, fed the report rows', () => {
  const src = read(OVERVIEW);
  assert.ok(src.includes("from '../../src/components/AttendanceRings'"),
    `${OVERVIEW}: the ring component is not imported.`);
  assert.ok(src.includes('<AttendanceRings rows={courseRows} testID="home-by-course"'),
    `${OVERVIEW}: Based on course is not drawn as rings from courseRows.`);
  assert.ok(src.includes('<AttendanceRings rows={periodRows} testID="home-by-period"'),
    `${OVERVIEW}: Based on period is not drawn as rings from periodRows.`);
});

test('the dot plot and the line are gone, not kept as a second way', () => {
  const src = read(OVERVIEW);
  assert.ok(!src.includes('AttendanceDots') && !src.includes('AttendanceTrend'),
    `${OVERVIEW}: still imports the dot plot or the trend line.`);
  assert.ok(!exists('src/components/AttendanceDots.tsx'),
    'src/components/AttendanceDots.tsx is still in the tree with no caller.');
  assert.ok(!exists('src/components/AttendanceTrend.tsx'),
    'src/components/AttendanceTrend.tsx is still in the tree with no caller.');
});

test('a ring is never a colour alone, and nothing expected is a dash', () => {
  assert.ok(exists(RINGS), `${RINGS} is missing`);
  const src = read(RINGS);
  for (const word of ["'Present'", "'Absent'"]) {
    assert.ok(src.includes(word), `${RINGS}: the legend does not say ${word}.`);
  }
  assert.ok(src.includes('<Icon name={s.icon}'),
    `${RINGS}: the legend swatch carries no glyph (guardrail 3).`);
  assert.ok(src.includes("r.pct === null ? '—'"),
    `${RINGS}: a row with nothing expected does not read as a dash.`);
  assert.ok(src.includes('theme.success') && src.includes('theme.danger'),
    `${RINGS}: the segments are not the measured status tokens.`);
  assert.ok(!/#[0-9a-fA-F]{6}/.test(src), `${RINGS}: carries a colour literal.`);
});
