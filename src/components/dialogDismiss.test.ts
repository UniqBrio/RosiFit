import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * requests/2026-09-07-dialogs-close-only-on-close-control.md · ADR-034.
 *
 * A DIALOG leaves by its own controls. A press on the backdrop beside it does
 * nothing -- and a close was never a save, so the press that used to land
 * there threw away everything typed into the form, silently.
 *
 * A PICKER is the opposite, and that is the half that needs holding down.
 * `Sheet` and `AnchoredPanel` draw no close button between them:
 * `Notifications` is a bare `Sheet` with a title and a list, and a panel hung
 * under a date field is a calendar and nothing else. Their backdrop IS their
 * way out. Applying the dialog rule to them -- which is what a later "the app
 * should be consistent about this" pass would do -- leaves a reader with a
 * sheet open and no way to shut it.
 *
 * So the spec asserts BOTH directions. One half without the other is how the
 * consistency argument wins by default six months from now.
 *
 * WHAT IT PINS, AND WHY THOSE THINGS
 * A first draft asserted only that the backdrop element carries no `onPress`.
 * Three regressions walked straight through it, and each is now a test:
 *   1. the CONTAINER around the backdrop taking the `onPress` instead --
 *      backdrop dismissal fully restored, one element up, spec still green;
 *   2. `pointerEvents="none"` on the backdrop -- the ONE attribute that
 *      really would let a press through to the live screen underneath a
 *      `transparentModal` route. The responder claim is not what stops that
 *      (react-native-web's responder system never calls `preventDefault`, and
 *      RN redelivers an unclaimed touch to ancestors, never to a sibling
 *      below); the element filling the space and taking pointers is;
 *   3. the header close losing its own `onPress` -- leaving a dialog with no
 *      way out at all, which is what this change is one press away from.
 *
 * ONE ASSERTION PER TEST, deliberately. node:test abandons a test at its
 * first failed assert, so assertions bundled behind a failing one are never
 * demonstrated red -- and .evidence/...-fail-first.txt would then be claiming
 * cover it had not earned.
 *
 * It reads source rather than rendering, for the same reason required.test.ts
 * and scrim.test.ts do: there is no component harness in this project, and
 * the claim is about the shape of the code, not one screen's pixels.
 */

// The repository root. `npm run test:unit` runs from it; the override exists
// to replay this spec against an exported copy of an EARLIER tree.
// `import.meta` is deliberately not used -- scripts/tsconfig.json checks
// these specs as nodenext in a CommonJS package, where it is an error.
const ROOT = process.env.DIALOG_DISMISS_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const FORM_DIALOG = 'src/components/FormDialog.tsx';
const SHEET = 'src/components/Sheet.tsx';
const PANEL = 'src/components/AnchoredPanel.tsx';

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find its source must say so. Scanning
  // nothing is the green-by-omission the gate exists to prevent.
  for (const f of [FORM_DIALOG, SHEET, PANEL]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set DIALOG_DISMISS_SPEC_ROOT.`);
  }
});

/**
 * One JSX element, from its opening `<` to its `/>`, bounded so it cannot
 * quietly become something else.
 *
 * The two ways a slicer like this goes blind are refused rather than assumed
 * away: a `<` inside the props would re-anchor the start, and an element that
 * stopped being self-closing would send `indexOf('/>')` to some LATER
 * element's close and hand back a slab of unrelated source -- in which any
 * `onPress=` at all would satisfy an assertion about this element.
 */
function slice(src: string, at: number, where: string): string {
  const open = src.lastIndexOf('<', at);
  assert.notEqual(open, -1, `${where}: not inside a tag`);
  const shut = src.indexOf('/>', at);
  assert.notEqual(shut, -1, `${where}: the element is not self-closing; this spec cannot read it`);
  const el = src.slice(open, shut + 2);
  // A tag is a few lines. Longer means the slice ran past its own element and
  // is now reading somebody else's props.
  assert.ok(el.length < 400,
    `${where}: the slice is ${el.length} chars -- it has run past the element it names`);
  assert.equal(el.indexOf('<', 1), -1,
    `${where}: a second tag opens inside the slice -- it is not one element:\n${el}`);
  return el;
}

/**
 * A dialog's backdrop, found by its testID and never by its style, so it
 * cannot drift onto a neighbouring element. Both carry one -- `confirm-scrim`
 * was added to ConfirmDialog's for exactly this.
 */
function backdrop(src: string, testID: string, where: string): string {
  const at = src.indexOf(`testID="${testID}"`);
  assert.notEqual(at, -1, `${where}: no element carries testID="${testID}"`);
  return slice(src, at, `${where} · testID="${testID}"`);
}

/**
 * ANY prop through which a press could turn into an action -- not just
 * `onPress`. `onResponderRelease={close}` beside the responder claim the
 * element already makes is the idiomatic one-liner for whoever wants
 * tap-to-dismiss back, and `onTouchEnd` / `onClick` (web) do the same job.
 * A guard that spells out one handler name is a guard with a side door.
 */
const ACTS_ON_PRESS = /\bon(Press|LongPress|Click|Touch\w*|Responder\w*|PointerUp|MouseUp)\w*\s*=/;

/**
 * The source from a component's `return (` up to its backdrop element: the
 * container(s) that would take the press if somebody moved dismissal one
 * element up. Every anchor is checked, because a slice between two -1s is
 * an empty string that passes everything.
 */
function aboveBackdrop(src: string, component: string, testID: string, where: string): string {
  const fn = src.indexOf(`export function ${component}`);
  assert.notEqual(fn, -1, `${where}: ${component} is gone`);
  const ret = src.indexOf('return (', fn);
  assert.notEqual(ret, -1, `${where}: ${component} has no "return (" -- this spec cannot find its container`);
  const at = src.indexOf(`testID="${testID}"`, ret);
  assert.notEqual(at, -1, `${where}: no testID="${testID}" after ${component}'s return`);
  return src.slice(ret, at);
}

/* ---------------------------------------------------------------- dialogs */

test('a form dialog does not close when its backdrop is pressed', () => {
  const el = backdrop(read(FORM_DIALOG), 'dialog-scrim', FORM_DIALOG);
  assert.ok(!ACTS_ON_PRESS.test(el),
    `${FORM_DIALOG}: the backdrop acts on a press again -- a tap beside a half-typed form discards it:\n${el}`);
});

test('nothing AROUND the form dialog backdrop closes it either', () => {
  // The regression this exists for: the backdrop stays inert and the
  // container that paints the dim takes the `onPress` instead. Same
  // behaviour restored, one element up, every other test still green.
  const body = aboveBackdrop(read(FORM_DIALOG), 'FormDialog', 'dialog-scrim', FORM_DIALOG);
  assert.ok(!ACTS_ON_PRESS.test(body),
    `${FORM_DIALOG}: something between the return and the backdrop acts on a press -- backdrop dismissal is back by another route:\n${body}`);
});

test('the form dialog backdrop is not announced as a control', () => {
  const el = backdrop(read(FORM_DIALOG), 'dialog-scrim', FORM_DIALOG);
  assert.ok(!el.includes('accessibilityRole'),
    `${FORM_DIALOG}: the backdrop is announced as a control it no longer is -- a button that does nothing is worse than none:\n${el}`);
});

test('the form dialog backdrop is not labelled as a way out', () => {
  const el = backdrop(read(FORM_DIALOG), 'dialog-scrim', FORM_DIALOG);
  assert.ok(!el.includes('accessibilityLabel'),
    `${FORM_DIALOG}: the backdrop still carries a label naming an action it no longer performs:\n${el}`);
});

test('the form dialog backdrop still takes the press rather than passing it through', () => {
  // The screen under a `transparentModal` route is mounted and LIVE, so
  // "inert" must mean "does nothing", never "lets the press reach the member
  // row behind it". `pointerEvents="none"` is the one attribute that would.
  const el = backdrop(read(FORM_DIALOG), 'dialog-scrim', FORM_DIALOG);
  assert.ok(!el.includes('pointerEvents'),
    `${FORM_DIALOG}: the backdrop is transparent to pointers -- a press beside the card now lands on the screen behind it:\n${el}`);
});

test('the form dialog backdrop says out loud that it absorbs the press', () => {
  const el = backdrop(read(FORM_DIALOG), 'dialog-scrim', FORM_DIALOG);
  assert.ok(el.includes('onStartShouldSetResponder={() => true}'),
    `${FORM_DIALOG}: the backdrop no longer claims the touch. The claim is not what blocks the press -- filling the space is -- but it is how the file states the intent:\n${el}`);
});

test('the header close is still what leaves a form dialog', () => {
  // Taking the backdrop away is only safe while the control it was taken
  // away in favour of still works. Not "the button exists" -- that it acts.
  const src = read(FORM_DIALOG);
  const from = src.indexOf("closeTestID ?? 'dialog-close'");
  assert.notEqual(from, -1, `${FORM_DIALOG}: the header close button is gone entirely`);
  const tag = src.slice(from, src.indexOf('>', from));
  assert.ok(tag.includes('onPress={close}'),
    `${FORM_DIALOG}: the header close no longer closes -- with the backdrop inert, a dialog now has NO way out:\n${tag}`);
});

test('the header close still says what it costs', () => {
  assert.ok(read(FORM_DIALOG).includes('accessibilityLabel="Close without saving"'),
    `${FORM_DIALOG}: the close button lost the label the backdrop gave up to it`);
});

test('a confirm dialog does not close when its backdrop is pressed', () => {
  const el = backdrop(read(SHEET), 'confirm-scrim', 'ConfirmDialog');
  assert.ok(!ACTS_ON_PRESS.test(el),
    `ConfirmDialog: its backdrop acts on a press again -- a stray press answers a question about an irreversible act:\n${el}`);
});

test('nothing AROUND the confirm dialog backdrop closes it either', () => {
  // Seven irreversible acts stand behind this one container.
  const body = aboveBackdrop(read(SHEET), 'ConfirmDialog', 'confirm-scrim', 'ConfirmDialog');
  assert.ok(!ACTS_ON_PRESS.test(body),
    `ConfirmDialog: its container acts on a press -- backdrop dismissal is back one element up:\n${body}`);
});

test('the confirm dialog backdrop still takes the press', () => {
  const el = backdrop(read(SHEET), 'confirm-scrim', 'ConfirmDialog');
  assert.ok(!el.includes('pointerEvents'),
    `ConfirmDialog: its backdrop is transparent to pointers:\n${el}`);
});

test('the confirm dialog keeps the cancel that is now its only way out', () => {
  const src = read(SHEET);
  const at = src.indexOf('export function ConfirmDialog');
  assert.notEqual(at, -1, `${SHEET}: ConfirmDialog is gone`);
  assert.notEqual(src.indexOf('cancelLabel', at), -1,
    `${SHEET}: ConfirmDialog lost its cancel button, and its backdrop no longer closes it`);
});

/* ---------------------------------------------------------------- pickers */

/**
 * The exclusion, stated as tests so it survives the next consistency pass.
 * Neither host draws a close button; the backdrop is the entire way out, and
 * `Notifications` -- a `Sheet` holding a title and a list -- is the proof,
 * because there is nothing else in it to press.
 *
 * Their backdrops carry no testID (nothing addresses them), so they are found
 * by the absolute fill, through the same bounded slice.
 *
 * Asserted as "it has a press handler", never as one literal expression: the
 * file already wraps `onClose` locally in places, and a guard that goes red
 * on a rename is a guard somebody deletes.
 */
const PICKERS = [
  { file: SHEET, from: 'export function Sheet', what: 'the bottom sheet' },
  { file: PANEL, from: 'export function AnchoredPanel', what: 'the panel hung under a field' },
];

function pickerBackdrop(file: string, from: string, what: string): string {
  const src = read(file);
  const at = src.indexOf(from);
  assert.notEqual(at, -1, `${file}: ${from} is gone`);
  const fill = src.indexOf("position: 'absolute', top: 0", at);
  assert.notEqual(fill, -1, `${file}: ${what} has no absolute-fill backdrop`);
  return slice(src, fill, `${file} · ${what}`);
}

for (const { file, from, what } of PICKERS) {
  test(`${what} still closes when its backdrop is pressed`, () => {
    const el = pickerBackdrop(file, from, what);
    assert.ok(/onPress=\{[^}]*\}/.test(el),
      `${file}: ${what} no longer closes on its backdrop, and it has no close button -- whoever opens it is stuck:\n${el}`);
  });

  test(`${what} still announces its backdrop as a control`, () => {
    // CP-014, the half that still holds: where the layer IS the way out, it
    // is a real control and it carries a label.
    const el = pickerBackdrop(file, from, what);
    assert.ok(el.includes('accessibilityRole="button"') && el.includes('accessibilityLabel'),
      `${file}: ${what}'s backdrop is its only way out and is not announced as one (CP-014):\n${el}`);
  });
}
