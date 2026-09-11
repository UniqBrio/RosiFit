/**
 * THE DEAD RESET BUTTON SAYS WHY, WHERE A SIGHTED PERSON CAN SEE IT.
 *
 * Run: npx tsx --test src/components/resetTooltip.test.ts
 *
 * Requested 11-Sep-2026: *"On reset button add a tooltip as this will be
 * enable only after first upload of attendance file"*. The reason had existed
 * for days — but only as the control's `accessibilityLabel`, which is read
 * aloud to a screen reader and is invisible to everybody else. Somebody
 * looking at a grey button saw grey.
 *
 * TWO CLAIMS, and the second is the one with a platform trap under it.
 *
 *   1. ONE SENTENCE, TWO AUDIENCES. The bubble and the label are the same
 *      expression. Two wordings of one reason is how the screen and the
 *      screen reader come to disagree about why somebody cannot do what they
 *      are trying to do.
 *
 *   2. THE TOOLTIP WRAPS THE CONTROL, never hangs on it. React Native Web
 *      0.21 gives a `disabled` Pressable `pointerEvents: 'box-none'`, passes
 *      `disabled` into `useHover` so no enter/leave listener is attached, and
 *      sets `tabIndex: -1`. A disabled control therefore receives no pointer
 *      events, no hover and no focus — so a tooltip attached to the button
 *      could never be triggered, and neither could the browser's own `title`.
 *      A wrapper sees both, because `pointerenter` fires for descendants and
 *      `pointerdown` bubbles. Get this wrong and the feature is not broken in
 *      a way anyone would notice in review: it simply never appears.
 *
 * Source-reading, as `staffShell.test.ts` and `resetRegisterDialog.test.ts`
 * are, and for the same reason: no component harness, and the claim is about
 * the shape of the code. The BEHAVIOUR of the bubble is pure and lives in
 * `tooltipReveal.test.ts`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.RESET_TOOLTIP_SPEC_ROOT ?? process.cwd();
const SCREEN = 'app/course/[id].tsx';
const TOOLTIP = 'src/components/Tooltip.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  for (const f of [SCREEN, TOOLTIP]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set RESET_TOOLTIP_SPEC_ROOT.`);
  }
});

/* ------------------------------------------------------- the reason itself */

test('the dead button names the ACT that would make it live', () => {
  // The requester's ask. "No attendance is recorded on that day" described the
  // state; it never said that uploading a file is what changes it.
  assert.match(read(SCREEN), /Reset becomes available once an attendance file has been uploaded for/,
    `${SCREEN}: the no-marks reason must name uploading a file, not merely report that nothing is recorded.`);
});

test('the other reason is still there, so the button never says the wrong one', () => {
  // Two ways of being dead. A tooltip that always blamed the upload would be
  // wrong every time the real reason is that nobody is ticked — and that is
  // the commoner of the two, on any day whose file HAS arrived.
  assert.match(read(SCREEN), /tick the members whose marks to clear first/,
    `${SCREEN}: an empty selection must still be reported as itself.`);
});

test('the bubble and the screen-reader label are ONE expression', () => {
  const s = read(SCREEN);
  assert.match(s, /const why = noMarks/,
    `${SCREEN}: the reason must be computed once, as \`why\`.`);
  assert.match(s, /accessibilityLabel=\{label\}/,
    `${SCREEN}: the label must come from that one expression, not from a second copy of the wording.`);
  assert.match(s, /const label = why\s*\n?\s*\?\?/,
    `${SCREEN}: \`label\` must fall back FROM \`why\`, so a reason can never be reworded in one place only.`);
});

test('`why` is null exactly when the button works', () => {
  /*
   * SCOPED TO THE `why` EXPRESSION, and that narrowing is not fussiness.
   * Recording the fail-first caught this one passing against a tree that has
   * no `why` at all: asked of the whole file, `/:\s*null;/` matched some other
   * ternary hundreds of lines away. An assertion about one expression has to
   * be asked of that expression.
   *
   * The null branch is what tells the tooltip it has nothing to explain, and
   * what makes the bubble vanish the moment a member is ticked.
   */
  const s = read(SCREEN);
  const from = s.indexOf('const why = noMarks');
  assert.ok(from !== -1, `${SCREEN}: no \`why\` expression to check.`);
  const expr = s.slice(from, s.indexOf('const label', from));
  assert.match(expr, /:\s*null;/,
    `${SCREEN}: the third branch of \`why\` must be null — a working button explains nothing.`);
});

/* --------------------------------------------- reaching a disabled control */

test('the tooltip WRAPS the reset button', () => {
  const s = read(SCREEN);
  const wrap = s.indexOf('<Tooltip text={why}');
  const button = s.indexOf('testID="course-day-reset"');
  assert.ok(wrap !== -1, `${SCREEN}: the reset button must be wrapped in a Tooltip.`);
  assert.ok(wrap < button,
    `${SCREEN}: the Tooltip must OPEN before the Pressable. A disabled Pressable receives no `
    + 'pointer events on this platform, so a tooltip inside it could never be triggered.');
});

test('the wrapper listens for pointers, because the button cannot', () => {
  const s = read(TOOLTIP);
  for (const prop of ['onPointerEnter', 'onPointerLeave', 'onPointerDown']) {
    assert.ok(s.includes(prop),
      `${TOOLTIP}: the wrapper must handle ${prop} — it is the only element that sees it.`);
  }
});

test('a tap is handled, not only a hover', () => {
  // Hover-only is invisible on a phone, and this app is used on phones.
  assert.match(read(TOOLTIP), /onPointerDown=\{\(\) => on\('tap'\)\}/,
    `${TOOLTIP}: a press must reveal the bubble, or nobody on a touch screen ever sees it.`);
});

/* ----------------------------------------------- the bubble is decoration */

test('the bubble never swallows a press meant for the control', () => {
  assert.match(read(TOOLTIP), /pointerEvents="none"/,
    `${TOOLTIP}: the bubble sits over the page and must take no pointer events, or it breaks `
    + 'whatever it is drawn on top of.');
});

test('the bubble is hidden from screen readers, which already have the label', () => {
  const s = read(TOOLTIP);
  assert.ok(s.includes("'aria-hidden': true"),
    `${TOOLTIP}: the bubble duplicates the control's own accessibilityLabel and must not be `
    + 'announced a second time.');
  assert.ok(s.includes('accessibilityElementsHidden'),
    `${TOOLTIP}: the same, for native.`);
});

test('a control with nothing to explain carries no wrapper at all', () => {
  // Not a micro-optimisation: a live Reset must behave exactly as it did
  // before this component existed, with no listeners between it and the tap.
  assert.match(read(TOOLTIP), /if \(text === null\) return <>\{children\}<\/>;/,
    `${TOOLTIP}: a null reason must render the children bare.`);
});

test('the bubble uses a colour pair the contrast gate already measures', () => {
  // Guardrail 2. `control` as a ground and `fg` as the ink are both in the
  // sweep; inventing a bubble-only pair would ship one nobody has measured.
  const s = read(TOOLTIP);
  assert.ok(s.includes('backgroundColor: theme.control'),
    `${TOOLTIP}: the bubble's ground must be a measured surface token.`);
  assert.ok(s.includes('color: theme.fg'),
    `${TOOLTIP}: the bubble's ink must be a measured text token.`);
});

/* ------------------------------------------------- what the BROWSER taught
 *
 * Everything above this line passed while the bubble was 82px wide and, later,
 * while it was painted completely behind a member card. Source-reading cannot
 * see layout. These three pin the two facts that only a rendered page could
 * have revealed, so the next person does not rediscover them the same way.
 * `.harness/reset-tooltip.mjs` is what measures them; these keep the code
 * shaped so that it stays true.
 */

test('the bubble has an explicit width, never a maxWidth', () => {
  // `maxWidth` on an absolutely positioned box is measured against its
  // CONTAINING BLOCK — the wrapper, which is as wide as the button. It shrank
  // the sentence to an 82px column of broken words and no spec could see it.
  const s = read(TOOLTIP);
  assert.match(s, /width: 240,/,
    `${TOOLTIP}: the bubble needs a real width; a maxWidth is capped by the wrapper.`);
  // CODE LINES ONLY. The first version of this assertion failed against the
  // fixed file, because the comment explaining the defect quotes the defect:
  // `maxWidth: 260`. A spec that cannot tell code from the prose about the
  // code will fail on every file that documents itself honestly.
  const code = s.split('\n').filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l));
  assert.ok(!code.some(l => /maxWidth: \d/.test(l)),
    `${TOOLTIP}: a numeric maxWidth is the defect that made the bubble 82px wide.`);
});

test('the bubble hangs ABOVE the control, which is what makes it visible at all', () => {
  /*
   * Not a taste decision. React Native Web gives every View
   * `position: relative` AND `z-index: 0`, so almost every node is its own
   * stacking context. A bubble hanging BELOW is drawn over the member cards,
   * which are later siblings several levels up — at equal z-index the later
   * one wins, and no z-index inside this row can reach past the ancestor that
   * contains both. Lifting the bubble, the wrapper and the row all changed
   * nothing. Upward, document order works in its favour with no z-index at all.
   */
  const s = read(TOOLTIP);
  assert.match(s, /bottom: '100%'/,
    `${TOOLTIP}: the bubble must be anchored above the control.`);
  assert.ok(!/top: '100%'/.test(s),
    `${TOOLTIP}: anchored below, the bubble is painted behind the member cards — present, `
    + 'correctly sized, and invisible.');
});

test('no z-index is relied on, because none of them worked', () => {
  // Kept as a negative so nobody re-adds one believing it helps. If a future
  // layout DOES need stacking, it has to be proved in the browser first —
  // three z-index changes were tried here and every one of them was a no-op.
  assert.ok(!/zIndex/.test(read(TOOLTIP)),
    `${TOOLTIP}: a z-index here is a no-op against a later sibling of an ancestor. `
    + 'Prove any new one with .harness/reset-tooltip.mjs before trusting it.');
});
