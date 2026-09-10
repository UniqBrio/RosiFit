/**
 * THE HEADER ROW SAYS WHICH TAB YOU ARE ON, and says it four ways.
 *
 * Run: npx tsx --test src/components/shellTabSelected.test.ts
 *
 * Reported from the deployed app: "the Attendance tab is selected, but the
 * selected state is not visually clear to the end user." It was not clear
 * because it was not TRUE -- the row asked
 *
 *     path === t.match || t.also.includes(path) || path.startsWith('/course/')
 *
 * once per tab, and the last clause names no tab, so on a course detail both
 * words were drawn selected. Two selected tabs is worse than an unclear one:
 * there is nothing to read.
 *
 * `src/data/access.test.ts` covers the rule. This covers that the row ASKS it,
 * and that what it draws with the answer is not colour alone (guardrail 3) and
 * does not fall apart at a phone's width. It reads source rather than
 * rendering, exactly as staffShell.test.ts does and for the same reason: there
 * is no component harness in this project, and the claim is about the shape of
 * the code.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.SHELL_TAB_SPEC_ROOT ?? process.cwd();
const SHELL = 'src/components/AppShell.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * JUST THE HEADER TAB ROW, and this narrowing is not fussiness.
 *
 * Recording the fail-first for this spec caught it: "the selected tab is never
 * colour alone" PASSED against the pre-fix tree, which did not have the filled
 * ground at all -- because searching the whole file found the string on
 * `NavPill`, a different control further down that has always had it. A
 * whole-file search is a claim about the file, and every claim here is about
 * one row of it.
 *
 * The row runs from the header's `tablist` -- the FIRST one in the file;
 * NavPill's comes later -- to the notifications sheet that closes
 * `AcademyHeader`.
 */
function tabRow(): string {
  const s = read(SHELL);
  const from = s.indexOf('accessibilityRole="tablist"');
  const to = s.indexOf('<NotificationsSheet', from);
  assert.ok(from >= 0 && to > from,
    `${SHELL}: could not find the header tab row. It runs from the first `
    + 'accessibilityRole="tablist" to <NotificationsSheet; if that shape changed, this spec '
    + 'must be re-aimed rather than left scanning the whole file.');
  return s.slice(from, to);
}

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, SHELL)),
    `${ROOT} is not the repository root: no ${SHELL}. Run from the root, or set SHELL_TAB_SPEC_ROOT.`);
});

test('the row asks the shared rule and holds no copy of its own', () => {
  const s = tabRow();
  assert.ok(s.includes('tabActive(t, path)'),
    `${SHELL}: the tab row must ask tabActive() from src/data/access.ts.`);
  // The negative is asked of the WHOLE file, not the row: a copy of the clause
  // hoisted into a helper just above the row is the same defect one line up.
  assert.ok(!read(SHELL).includes("path.startsWith('/course/')"),
    `${SHELL}: the inline prefix clause is back. It is evaluated once per tab and `
    + 'mentions no tab, so it lights EVERY tab on a course detail. The prefixes belong '
    + "to a tab, as `under`.");
});

test('the pushed screens of the workspace belong to the Attendance tab', () => {
  const s = read(SHELL);
  assert.ok(/under:\s*\['\/course',\s*'\/member'\]/.test(s),
    `${SHELL}: Attendance must claim '/course' and '/member' through \`under\`, or a course `
    + 'detail and a member detail light no tab at all.');
});

test('the selected tab is never colour alone', () => {
  // Guardrail 3. Three of these four survive greyscale; the ink on its own
  // does not, and the ink on its own is what a washed-out phone in daylight
  // reduces to. Scoped to the row: see tabRow() for the false pass this had.
  const s = tabRow();
  for (const [signal, needle] of [
    ['its weight',      "fontWeight: on ? '800' : '600'"],
    ['its ink',         'color: on ? theme.accentInk : theme.muted'],
    ['a filled ground', "backgroundColor: on ? theme.control : 'transparent'"],
    ['the bar beneath', "backgroundColor: on ? theme.accent : 'transparent'"],
  ] as const) {
    assert.ok(s.includes(needle),
      `${SHELL}: the selected tab must carry ${signal} — \`${needle}\` is not in the row.`);
  }
});

test('a screen reader is told which tab is current', () => {
  // `accessibilityState` reaches the DOM as nothing on this platform, which is
  // why TabStrip passes the attribute as well and why its comment named this
  // row as the one that still did not.
  const s = tabRow();
  assert.ok(s.includes("'aria-selected': on"),
    `${SHELL}: the tab row must emit aria-selected. Without it the row announces two `
    + 'buttons and no current tab.');
});

test('a long label truncates inside its own half of the row', () => {
  // The row is two tabs at flex:1. A label that neither wraps nor truncates
  // pushes its neighbour off the screen on a narrow phone, which is the
  // responsiveness failure this shape avoids.
  const s = tabRow();
  assert.ok(s.includes('numberOfLines={1}'),
    `${SHELL}: the tab label must be numberOfLines={1}.`);
  assert.ok(s.includes("maxWidth: '100%'"),
    `${SHELL}: the selected tab's ground must be capped at its own width, or it grows past `
    + 'the tab on a narrow screen.');
});

test('the underline does not change height with the state', () => {
  // A bar that is 2.5 when off and 3 when on moves the whole row half a pixel
  // on every tap. The colour carries the state; the geometry stays put.
  const s = tabRow();
  assert.ok(!/height:\s*on\s*\?/.test(s),
    `${SHELL}: no dimension may switch on the selected state — the row must not reflow when a `
    + 'tab is tapped.');
});
