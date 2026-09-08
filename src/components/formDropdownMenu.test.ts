import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * requests/2026-09-08-form-dropdown-list-ui.md — "In dropdown with in the
 * forms such as add edit forms of course member and other form within which
 * drop down is present apply dropdown ui as shown in atatched image only
 * inside forms and dialogs".
 *
 * The image: flat rows filling the panel edge to edge, a hairline between
 * them, the chosen row tinted with its label in the accent and a check at the
 * end. No card, no border, no radio.
 *
 * Three things can silently go wrong here, and this is what each costs:
 *
 *   - the FILTER dropdowns get flattened too. They were named MUST NOT
 *     CHANGE, and their cards carry a checkbox because those lists take
 *     several values at once -- a flat row with a tick is a radio's promise
 *     on a control that is not one;
 *   - a later "let's have one row component" pass points the merge sheet at
 *     `MenuRow`. Its tap STAGES a member for a second confirming tap; a row
 *     that reads as chosen when nothing is committed is the wrong promise on
 *     the one screen in this app where the wrong row is unrecoverable
 *     (RC-024's neighbourhood);
 *   - the word "Selected" goes, because the reference image has only the
 *     tint and the tick. Colour plus a glyph is not a word, and CP-010 asks
 *     for both.
 *
 * It reads source rather than rendering, for the reason
 * dropdownAppliesOnPick.test.ts gives: there is no component harness in this
 * project, and the claim is about the shape of the code.
 */

const ROOT = process.env.FORM_MENU_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const DROPDOWN = 'src/components/Dropdown.tsx';
const SHEET = 'src/components/Sheet.tsx';
const PANEL = 'src/components/AnchoredPanel.tsx';
const COURSE = 'app/course/edit.tsx';
const OFFERING = 'app/offering/edit.tsx';
/** the list screens whose filters this change was explicitly not about */
const FILTERS = ['app/(tabs)/attendance.tsx', 'app/(tabs)/courses.tsx', 'app/audit.tsx'];
const ALL = [DROPDOWN, SHEET, PANEL, COURSE, OFFERING, ...FILTERS];

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find its source must say so. Scanning
  // nothing is the green-by-omission the gate exists to prevent.
  for (const f of ALL) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set FORM_MENU_SPEC_ROOT.`);
  }
});

/** The body of one function, from its declaration to the next top-level one. */
function block(src: string, decl: string): string {
  const at = src.indexOf(decl);
  assert.notEqual(at, -1, `${decl} is gone`);
  const next = src.indexOf('\nexport function ', at + decl.length);
  return src.slice(at, next === -1 ? src.length : next);
}

test('a form field\'s dropdown draws flat rows, not cards', () => {
  // The whole request, as one assertion on the row itself. A card is a
  // border and a radius; a row is neither, and its only rule is the hairline
  // above it.
  const row = block(read(DROPDOWN), 'export function MenuRow(');
  assert.ok(!/borderRadius/.test(row),
    `${DROPDOWN}: MenuRow has a corner radius again, which is a card and not a row`);
  assert.ok(!/borderWidth|borderColor:(?! theme\.line,)/.test(row),
    `${DROPDOWN}: MenuRow has an edge of its own again. The rows are separated by the `
    + 'hairline between them, not by fifteen borders');
  assert.match(row, /borderTopWidth: divided \? 1 : 0, borderTopColor: theme\.line/,
    `${DROPDOWN}: MenuRow lost the hairline that separates one choice from the next`);
  assert.ok(!/radio_button/.test(row),
    `${DROPDOWN}: MenuRow draws a radio again. The reference image marks the chosen row by `
    + 'tinting it and ticking it, and the leading glyph is what that replaced');
});

test('the chosen row is tinted, lettered in the accent, and ticked', () => {
  const row = block(read(DROPDOWN), 'export function MenuRow(');
  assert.match(row, /backgroundColor: selected \? theme\.control : 'transparent'/,
    `${DROPDOWN}: the chosen row is no longer tinted`);
  assert.match(row, /color: selected \? theme\.accentInk : theme\.fgStrong/,
    `${DROPDOWN}: the chosen row's label is no longer drawn in the accent ink`);
  assert.match(row, /<Icon name="check" size=\{18\} color=\{theme\.accentInk\} \/>/,
    `${DROPDOWN}: the check at the end of the chosen row is gone`);
});

test('and it still says so in words (CP-010)', () => {
  // The one deliberate difference from the reference image. The tint and the
  // tick are a colour and a glyph; neither is a word, and a state this app
  // draws has to survive greyscale.
  const row = block(read(DROPDOWN), 'export function MenuRow(');
  assert.match(row, /\{selected \? 'Selected' : meta \?\? ''\}/,
    `${DROPDOWN}: MenuRow's chosen row no longer says "Selected". Colour and a tick are not `
    + 'a word, and CP-010 asks for both');
});

test('every dropdown inside a form draws it', () => {
  // The four the form screens open themselves...
  for (const f of [COURSE, OFFERING]) {
    const s = read(f);
    assert.ok(!/<DropdownList\b/.test(s),
      `${f}: a form dropdown is back on the filter rows -- DropdownList draws the bordered `
      + 'cards, and this screen is a form');
    assert.match(s, /<DropdownPanel menu>/,
      `${f}: its dropdown panel kept its padding, so the rows no longer reach its edges`);
  }
  // ...and the four the form FIELDS open through AnchoredPicker: member
  // course and branch, the staff role label, the register's two questions.
  const picker = read(SHEET).slice(read(SHEET).indexOf('export function AnchoredPicker'));
  assert.match(picker, /<MenuRow key=\{pickerKey\(o, i\)\}/,
    `${SHEET}: AnchoredPicker no longer draws MenuRow, so the member, staff and register `
    + 'pickers look nothing like the course form\'s dropdowns');
  assert.ok(!/<PickerChoice/.test(picker),
    `${SHEET}: AnchoredPicker draws the card rows again`);
  // RC-024: two members sharing a name are two children with one key unless
  // the key is her id. Carried over with the row, not left behind with it.
  assert.match(picker, /key=\{pickerKey\(o, i\)\}/,
    `${SHEET}: AnchoredPicker's rows are keyed by something other than pickerKey again (RC-024)`);
});

test('the panel gives up its padding, and clips', () => {
  // A tinted row under a rounded corner squares that corner off unless the
  // panel clips. Both hosts, because both draw these rows.
  assert.match(read(PANEL), /bleed \? \{ padding: 0, overflow: 'hidden' as const \}/,
    `${PANEL}: the anchored panel no longer lets its rows reach its edges`);
  assert.match(read(DROPDOWN), /menu \? \{ padding: 0, overflow: 'hidden' as const \}/,
    `${DROPDOWN}: DropdownPanel's menu variant no longer clips, so the tint on the first and `
    + 'last row overruns the panel\'s rounded corners');
});

test('the search box, the "Add …" row and the empty note keep their inset', () => {
  // MUST NOT CHANGE, and the reason the panel's padding moved rather than
  // simply going: an edge-to-edge bordered card is not a card.
  const picker = read(SHEET).slice(read(SHEET).indexOf('export function AnchoredPicker'));
  assert.match(picker, /<View style=\{\{ padding: SPACE\.md, paddingBottom: SPACE\.sm \}\}>\s*\n\s*<PickerSearch/,
    `${SHEET}: the picker's search box lost the inset the panel used to give it`);
  assert.match(picker, /<View style=\{\{ padding: SPACE\.md \}\}>\s*\n\s*<PickerAddRow/,
    `${SHEET}: the "Add …" row now runs edge to edge, which a bordered card must not`);
  assert.match(picker, /paddingHorizontal: SPACE\.md \}\}><PickerEmpty/,
    `${SHEET}: the nothing-matches note lost its inset`);
});

test('the list-screen filters are untouched', () => {
  // MUST NOT CHANGE, asserted rather than trusted. Their rows are cards with
  // a radio or a checkbox, and the checkbox ones take several values at once
  // -- exactly what a single-choice menu row must not be used for.
  const lib = read(DROPDOWN);
  const item = block(lib, 'export function DropdownItem(');
  assert.match(item, /radio_button_checked' : 'radio_button_unchecked/,
    `${DROPDOWN}: the filter rows lost their radio`);
  assert.match(item, /borderRadius: RADIUS\.md, borderWidth: 1/,
    `${DROPDOWN}: the filter rows stopped being cards`);
  assert.ok(lib.includes('export function DropdownCheckList'),
    `${DROPDOWN}: the multi-choice filter list is gone`);
  for (const f of FILTERS) {
    assert.ok(/<DropdownList|<DropdownCheckList|<DropdownItem/.test(read(f)),
      `${f}: a list screen's filter was flattened into a form's menu. The request scoped the `
      + 'filters out by saying "only inside forms and dialogs"');
  }
});

test('the merge sheet keeps its own rows', () => {
  // It is opened from a list row, not a form field, and its tap stages a
  // member for a confirming tap rather than settling a value. A row that
  // reads as chosen while nothing is committed is the wrong promise there.
  const sheet = read(SHEET);
  assert.ok(sheet.includes('function PickerChoice('),
    `${SHEET}: PickerChoice is gone, so the merge sheet is drawing something else`);
  const merge = sheet.slice(sheet.indexOf('export function SearchPicker'), sheet.indexOf('export function AnchoredPicker'));
  assert.match(merge, /<PickerChoice key=\{pickerKey\(o, i\)\}/,
    `${SHEET}: the merge sheet's rows changed. Its tap stages a choice; MenuRow's says one is `
    + 'made');
});
