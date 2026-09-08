import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * requests/2026-09-08-audit-log-deleted-member-name-filters-wrong-info.md —
 * "dropdowns are not working under that".
 *
 * THEY WERE WORKING. They opened, applied and closed the whole time; they were
 * painted behind the log.
 *
 * react-native-web's base View style is `position: relative; z-index: 0`
 * (node_modules/react-native-web/dist/exports/View/index.js). A positioned
 * element with a z-index other than `auto` opens a STACKING CONTEXT, so every
 * View in this app opens one. `DropdownRow` lifts itself to `zIndex: 40` while
 * a panel is out — and a lift only ranks a node against its own siblings, so
 * any plain View wrapped around it re-traps the panel at 0.
 *
 * Audit was the only screen that wrapped it: once in `<View key="controls">`
 * grouping the filters with the search box, once in a View holding a margin.
 * Its open panel therefore lost to the frozen column header, which the
 * ScrollView itself lifts to `zIndex: 10` for `stickyHeaderIndices`, and to the
 * table, a later sibling at the same z-index as the trap. Nothing in the code
 * looked wrong, and nothing threw.
 *
 * Two things are asserted, and the second is the one that lasts: the panel is
 * unwrapped, and it is unwrapped WITHOUT a z-index of its own. A number tuned
 * to out-rank 10 would work today and break the day the header changes —
 * RC-018's lesson about a constant sized for a bug rather than for a fact.
 *
 * It reads source rather than rendering, as dropdownAppliesOnPick.test.ts and
 * dialogDismiss.test.ts do: there is no component harness here, and the claim
 * is about the shape of the tree, not about pixels.
 */

const ROOT = process.env.AUDIT_STACKING_SPEC_ROOT ?? process.cwd();
const AUDIT = 'app/audit.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, AUDIT)),
    `${ROOT} is not the repository root: no ${AUDIT}. Run from the root, or set AUDIT_STACKING_SPEC_ROOT.`);
});

test('the filter row is its own child of the page scroller', () => {
  const s = read(AUDIT);
  // Pushed keyed but UNWRAPPED. A Fragment carries the key an array child
  // needs without adding an element — which is the entire point.
  assert.match(s, /children\.push\(<Fragment key="filters">\{filters\}<\/Fragment>\);/,
    `${AUDIT}: the filter row is no longer pushed as its own unwrapped child. Wrapped in a `
    + 'View, its open panel is painted behind the frozen header and the table');
  assert.ok(s.includes("import { Fragment,"),
    `${AUDIT}: Fragment is not imported as a value, so the push above cannot be what it says`);
});

test('nothing wraps the filter row in a View again', () => {
  const s = read(AUDIT);
  // The exact shape that caused it. Named rather than described, because the
  // diff that reintroduces it looks like tidying two pushes into one.
  assert.ok(!s.includes('<View key="controls">'),
    `${AUDIT}: the filters are back inside a grouping View. Every react-native-web View is a `
    + "stacking context, so DropdownRow's zIndex 40 counts for nothing inside one");
  const at = s.indexOf('const filters = (');
  assert.notEqual(at, -1, `${AUDIT}: the filter row is gone`);
  const row = s.slice(at, s.indexOf('const controls = (', at));
  assert.ok(row.includes('<DropdownRow'),
    `${AUDIT}: \`filters\` no longer holds the DropdownRow`);
  assert.ok(!/<View[^>]*>\s*<DropdownRow/.test(row),
    `${AUDIT}: a View has been put back around DropdownRow`);
});

test('the fix is structural, not a bigger number', () => {
  // A z-index picked to beat the sticky header's 10 would pass a screenshot
  // and fail the next time the header is touched. There must not be one.
  const s = read(AUDIT);
  const at = s.indexOf('const filters = (');
  const row = s.slice(at, s.indexOf('const controls = (', at));
  assert.ok(!/zIndex/.test(row),
    `${AUDIT}: the filter row carries a z-index. It does not need one — as its own sibling of `
    + "the table, DropdownRow's own lift is enough — and a constant sized for a stacking bug "
    + 'is wrong the moment the thing it compensated for changes (RC-018)');
});

test('the audit filters have the press-beside that every other screen has', () => {
  // CP-014's picker half. Audit was the only screen with these filters that
  // passed no `dismiss`, so an open panel could be left only by scrolling
  // back up to the field it came from — on the one screen where the panel
  // covers a 980pt-wide table.
  assert.match(read(AUDIT), /dismiss=\{\{ onPress: \(\) => setOpen\(null\), testID: 'audit-filter-dismiss' \}\}/,
    `${AUDIT}: its DropdownRow has no dismiss, so an open panel has no way out but the field`);
});
