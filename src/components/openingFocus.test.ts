import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { shouldBlurOpener } from './openingFocus';

/**
 * "Across the application wherever there is an input field, show the cursor
 * in the first input field" (requests/2026-09-07-autofocus-first-input-field.md,
 * scope confirmed at Track B's first gate as forms, list searches AND pickers).
 *
 * Two claims, and they are the same claim from both ends:
 *
 *  1. every surface with a text input names its FIRST one as the one that
 *     takes the caret, and only that one -- two autofocusing fields on a
 *     screen is a race;
 *  2. the three layers that blur what is focused (`Sheet`, `AnchoredPanel`,
 *     `ConfirmDialog`) no longer blur it at the two moments that would undo
 *     claim 1 -- on MOUNT, when they are shut and every form renders its
 *     pickers shut beside its fields, and on the picker's OWN search box.
 *
 * The second claim is the one this change would have failed silently: the
 * autofocus works, and a passive effect a frame later takes it away. So the
 * predicate is tested directly, and the wiring is read out of the source --
 * the same source-reading form as addMemberBranchDefault.test.ts and
 * editDialog.test.ts, for the same reason: there is no component harness in
 * this project, and the claim is about which call each layer makes.
 */

const ROOT = process.env.OPENING_FOCUS_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** The first input a screen renders, and the text that identifies it. */
const FIRST_INPUT: Array<[file: string, marker: string]> = [
  ['app/course/edit.tsx', '<Field label="Course name" autoFocus'],
  ['app/member/edit.tsx', '<Field label="Her name" autoFocus'],
  ['app/staff/add.tsx', '<Field label="Full name" autoFocus'],
  ['app/holiday.tsx', '<Field label="Name or reason" autoFocus'],
  ['app/change-mobile.tsx', '<Field label="Your current PIN" autoFocus'],
  ['app/branches.tsx', '<Field label="New branch name" autoFocus'],
  ['app/register.tsx', '<Field label="Full name" autoFocus'],
  ['app/forgot-pin.tsx', '<Field label="Your answer" autoFocus'],
  ['app/(tabs)/members.tsx', 'ref={search}'],
  ['app/(tabs)/attendance.tsx', 'ref={search}'],
  ['app/course/[id].tsx', 'ref={search}'],
  ['app/appearance.tsx', 'ref={hex}'],
  ['app/set-pin.tsx', 'const field = useAutoFocus<TextInput>(true)'],
];

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, 'src/components/Field.tsx')),
    `${ROOT} is not the repository root: no src/components/Field.tsx. Run from the root, or set OPENING_FOCUS_SPEC_ROOT.`);
});

test('the shared field can be told to take the caret', () => {
  const field = read('src/components/Field.tsx');
  assert.match(field, /autoFocus\?: boolean/,
    'Field has no autoFocus prop, so no form can name its first field.');
  assert.match(field, /useAutoFocus<TextInput>\(autoFocus\)/,
    'Field does not place the caret through the shared hook.');
});

test('every screen with an input names its first one', () => {
  for (const [file, marker] of FIRST_INPUT) {
    assert.ok(read(file).includes(marker),
      `${file} does not put the caret in its first input (looked for ${marker}).`);
  }
});

test('only the first field of a form autofocuses', () => {
  // register.tsx is the one form with several fields AND a repeated one --
  // its two security answers render from a map, so an autoFocus there would
  // be two fields fighting for the caret on one screen.
  const register = read('app/register.tsx');
  assert.equal((register.match(/autoFocus/g) ?? []).length, 1,
    'register.tsx autofocuses more than one field.');
  const member = read('app/member/edit.tsx');
  assert.equal((member.match(/autoFocus/g) ?? []).length, 1,
    'app/member/edit.tsx autofocuses more than one field.');
});

test('the picker search box takes the caret in both its hosts', () => {
  const sheet = read('src/components/Sheet.tsx');
  // ONE search box, shared by the bottom sheet and the anchored panel, so
  // one autofocus covers both hosts.
  assert.match(sheet, /const focusRef = useAutoFocus<TextInput>\(true\)/,
    'the picker search box does not take the caret when a picker opens.');
});

test('a shut layer never blurs the field behind it', () => {
  // The mount-time blur: every form renders its pickers closed beside its
  // fields, so this firing at open=false is the first field losing the caret
  // a frame after taking it.
  assert.equal(shouldBlurOpener(false, { tag: 'input' }, null), false);
});

test('an open layer blurs the opener behind it', () => {
  // CP-014's rule, unchanged: nothing focused may be left inside the subtree
  // `accessibilityViewIsModal` hides.
  const opener = { tag: 'button' };
  const layer = { contains: (n: unknown) => n !== opener };
  assert.equal(shouldBlurOpener(true, opener, layer), true);
  assert.equal(shouldBlurOpener(true, opener, null), true);
});

test('an open layer never blurs its own field', () => {
  const own = { tag: 'input' };
  const layer = { contains: (n: unknown) => n === own };
  assert.equal(shouldBlurOpener(true, own, layer), false);
});

test('nothing focused is nothing to blur', () => {
  assert.equal(shouldBlurOpener(true, null, null), false);
});

test('all three layers ask the shared rule rather than blurring on sight', () => {
  for (const file of ['src/components/Sheet.tsx', 'src/components/AnchoredPanel.tsx']) {
    const src = read(file);
    assert.ok(!/document\.activeElement/.test(src),
      `${file} still reaches for document.activeElement itself; the rule lives in openingFocus.ts.`);
    assert.match(src, /blurOpener\(open, /, `${file} does not use the shared blur rule.`);
  }
  // Sheet.tsx holds two of the three layers -- the sheet and ConfirmDialog.
  assert.equal((read('src/components/Sheet.tsx').match(/blurOpener\(open, /g) ?? []).length, 2,
    'Sheet.tsx should route both its layers through the shared rule.');
});

/**
 * The caret arriving on its own made the browser's own focus ring the first
 * thing every form shows -- and that ring is drawn around the INNER input,
 * which is a second rectangle inside the box the app draws. The sign-in
 * field solved this before any of these did: the ring is moved onto the box,
 * never removed, because a field with no visible focus is unusable on a
 * keyboard.
 */
const FOCUS_RING: Array<[file: string, box: RegExp]> = [
  ['src/components/Field.tsx', /borderColor: error \? theme\.danger : focused \? theme\.accent/],
  ['src/components/Sheet.tsx', /borderColor: focused \? theme\.accent : theme\.lineStrong/],
  ['app/(tabs)/members.tsx', /borderColor: searching \? theme\.accent : theme\.lineStrong/],
  ['app/(tabs)/attendance.tsx', /borderColor: searching \? theme\.accent : theme\.lineStrong/],
  ['app/course/[id].tsx', /borderColor: searching \? theme\.accent : theme\.lineStrong/],
  ['app/appearance.tsx', /borderColor: hexError \? theme\.danger : hexFocused \? theme\.accent/],
];

test('every field that takes the caret shows its focus on the box', () => {
  for (const [file, box] of FOCUS_RING) {
    const src = read(file);
    assert.match(src, box, `${file} does not show focus on the box around its first field.`);
    // `outlineWidth: 0` alone leaves it drawn: the style stays `auto`, and
    // an auto outline ignores the width it is given.
    assert.match(src, /outlineWidth: 0, outlineStyle: 'solid'/,
      `${file} leaves the browser's ring inside the box it draws.`);
  }
});
