import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * The Overview's filters stay put, and its graphs carry the whole figure
 * (requests/2026-09-07-overview-course-detail-and-frozen-filters.md).
 *
 * WHAT THIS HOLDS
 * - The Course / Period / Branch row is a HEADER of the screen, not the first
 *   thing in its scroller. The requester's complaint was that reading the
 *   course section means scrolling the filters off the screen, so the fix is
 *   not "move the section up" -- it is that the controls never leave.
 * - The freeze is done at the SCREEN, never inside `DropdownRow`. Eight
 *   screens draw that row (Attendance, Courses, Reports, Audit, Course edit,
 *   Course detail, Offering edit, Overview); pinning it in the shared
 *   component would pin it on all eight for one screen's request.
 * - Every ring writes the same three figures the member bars write --
 *   scheduled, attended, missed -- through the SAME `reportMeta`, so the two
 *   marks cannot describe one course differently.
 * - A member row names the course and branch it is counted under. That is the
 *   "course name" the requester could not find on the graphs.
 *
 * It reads source rather than rendering, as overviewGrid.test.ts does and for
 * the same reason: there is no component harness here, and the claim is about
 * the shape of the code.
 */

const ROOT = process.env.OVERVIEW_DETAIL_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const exists = (rel: string) => fs.existsSync(path.join(ROOT, rel));

const OVERVIEW = 'app/(tabs)/index.tsx';
const UI = 'src/components/ui.tsx';
const RINGS = 'src/components/AttendanceRings.tsx';
const BARS = 'src/components/AttendanceBars.tsx';
const DROPDOWN = 'src/components/Dropdown.tsx';

test('the spec is looking at a real tree', () => {
  for (const f of [OVERVIEW, UI, RINGS, BARS, DROPDOWN]) {
    assert.ok(exists(f), `${f} is missing`);
  }
});

/* ------------------------------------------------------- the frozen filters */

test('Screen can hold a strip that the body scrolls under', () => {
  const src = read(UI);
  assert.ok(/header\?: React\.ReactNode/.test(src),
    `${UI}: Screen has no header slot, so nothing can stay put while the body scrolls.`);
  assert.ok(src.includes('ScrollView'),
    `${UI}: Screen no longer scrolls its body at all.`);
});

test('the Overview hands its filter row to that slot, in every state', () => {
  const src = read(OVERVIEW);
  const passes = src.match(/<Screen header=\{controls\}/g) ?? [];
  // ready, loading and error -- the filters are correct before any figure
  // arrives, so all three states carry them.
  assert.ok(passes.length >= 3,
    `${OVERVIEW}: only ${passes.length} of the three states pin the filter row.`);
  assert.ok(!/<Screen[^>]*>\s*\{controls\}/.test(src),
    `${OVERVIEW}: the filter row is still the first thing INSIDE the scroller, so it scrolls away.`);
});

test('the freeze is the screen\'s, not every DropdownRow\'s', () => {
  const src = read(DROPDOWN);
  assert.ok(!/position:\s*'fixed'[^;]*\/\* row \*\//.test(src) && !src.includes('sticky'),
    `${DROPDOWN}: the shared row was pinned, which pins it on all eight screens that draw it.`);
});

/* --------------------------------------------------------- the whole figure */

test('a ring writes scheduled, attended and missed -- the same words the bars use', () => {
  const src = read(RINGS);
  assert.ok(src.includes('reportMeta'),
    `${RINGS}: a ring still writes its own count line instead of the one the bars write, `
    + 'so the two marks can describe one course differently.');
  assert.ok(!src.includes('of ${r.expected} present'),
    `${RINGS}: the short "X of Y present" line is still there.`);
});

test('a member row names the course and branch it is counted under', () => {
  assert.ok(read(BARS).includes('b.sub'),
    `${BARS}: a bar row draws no scope line, so the graph never names a course.`);
  assert.ok(read(OVERVIEW).includes('withScope'),
    `${OVERVIEW}: the member rows are not given the course and branch they belong to.`);
});
