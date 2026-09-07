import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * requests/2026-09-07-dropdowns-apply-on-pick-no-done.md — "dont ask user to
 * click on done user select checkbox and then filter applied".
 *
 * The Done button never applied anything. A tick already ran `setCourses` /
 * `setBranches`, and the second day of a custom range already ran `onChange`;
 * both buttons only CLOSED the panel. That is exactly what made them worth
 * removing and exactly what makes their removal easy to get wrong, because
 * the diff that deletes them looks like it deletes the apply.
 *
 * Three things can silently go wrong here, each guarded below:
 *
 *   - a later pass "finishes the job" by closing the multi-choice panel on a
 *     tick. Nothing about that looks broken -- one filter, one tap, panel
 *     gone -- but Overview's Course and Branch quietly stop being able to
 *     hold two values, and the checkbox glyph starts lying about what the
 *     control does;
 *   - the press-beside layer is dropped as "an extra div". It is the way out
 *     that replaced the button: without it a reader who has scrolled down
 *     past the fields has nothing left to press;
 *   - the custom range starts applying on the FIRST day picked, now that
 *     nothing downstream is waiting for a confirmation. A half-picked range
 *     applied is the drift C-84 exists to stop.
 *
 * It reads source rather than rendering, for the same reason
 * dialogDismiss.test.ts and reportsPeriodFilter.test.ts do: there is no
 * component harness in this project, and the claim is about the shape of the
 * code, not one screen's pixels.
 */

const ROOT = process.env.DROPDOWN_PICK_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const DROPDOWN = 'src/components/Dropdown.tsx';
const PERIOD = 'src/components/PeriodFilter.tsx';
const HOME = 'app/(tabs)/index.tsx';
const ATTENDANCE = 'app/(tabs)/attendance.tsx';
const REPORTS = 'app/(tabs)/reports.tsx';
const ALL = [DROPDOWN, PERIOD, HOME, ATTENDANCE, REPORTS];

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find its source must say so. Scanning
  // nothing is the green-by-omission the gate exists to prevent.
  for (const f of ALL) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set DROPDOWN_PICK_SPEC_ROOT.`);
  }
});

test('no dropdown anywhere asks for a confirming tap', () => {
  // The whole request, as one assertion over every file that draws a
  // dropdown. `DropdownDone` is gone from the library, so it cannot come
  // back by being imported; the two labels are gone from the panels.
  const lib = read(DROPDOWN);
  assert.ok(!lib.includes('DropdownDone'),
    `${DROPDOWN}: the Done button is back. A filter applies on the tick, so a button after it `
    + 'confirms nothing and reads as though the tick had not counted');
  assert.ok(!lib.includes('footer'),
    `${DROPDOWN}: DropdownPanel has a footer slot again -- that is the shelf the Done button `
    + 'was pinned to, and an empty shelf is how it comes back');

  const period = read(PERIOD);
  for (const gone of ['Use this range', 'Pick both days', 'custom-done']) {
    assert.ok(!period.includes(gone),
      `${PERIOD}: "${gone}" is back. The range is already applied by the tap that finishes it`);
  }
  for (const screen of [HOME, ATTENDANCE, REPORTS]) {
    assert.ok(!read(screen).includes('DropdownDone'),
      `${screen}: a Done button is mounted in a filter panel again`);
  }
});

test('a tick still applies the filter, and still does NOT close the panel', () => {
  // The half that is easy to lose. A checkbox list that shut on the first
  // tick could never be given a second branch -- it would be a radio list
  // wearing a checkbox glyph, and guardrail 3 is about exactly that kind of
  // lie. So the toggle must set state and must NOT touch `open`.
  const s = read(HOME);
  for (const [kind, setter] of [['course', 'setCourses'], ['branch', 'setBranches']] as const) {
    const at = s.indexOf(`onToggle={l => ${setter}(`);
    assert.notEqual(at, -1,
      `${HOME}: the ${kind} filter no longer applies on the tick -- ${setter} has no toggle call site`);
    const handler = s.slice(at, s.indexOf('\n', at));
    assert.ok(!handler.includes('setOpen'),
      `${HOME}: ticking a ${kind} now closes the panel, so a second ${kind} can never be added `
      + `to the first: ${handler}`);
  }
});

test('the panel keeps a way out once the button is gone', () => {
  // The press beside the panel, on every screen that opens one. Without it
  // the only way out is the field above -- and the panel floats over the
  // figures, so a reader who scrolled down has to scroll back up to it.
  const lib = read(DROPDOWN);
  assert.match(lib, /dismiss\?: \{ onPress: \(\) => void; testID: string \}/,
    `${DROPDOWN}: DropdownRow lost its dismiss prop, which is the way out that replaced Done`);
  assert.ok(lib.includes('open && dismiss ?'),
    `${DROPDOWN}: the dismissal layer is no longer gated on the panel being open -- a `
    + 'full-window layer left mounted swallows every press on the screen');
  assert.ok(lib.includes('accessibilityLabel="Close the open filter"'),
    `${DROPDOWN}: the layer beside a picker is a real control and must carry a label (CP-014)`);

  for (const screen of [HOME, ATTENDANCE, REPORTS]) {
    assert.match(read(screen), /dismiss=\{\{ onPress: [^}]+, testID: '[a-z-]+-filter-dismiss' \}\}/,
      `${screen}: its DropdownRow has no dismiss, so an open panel can only be left by `
      + 'scrolling back up to the field');
  }
});

test('the dismissal covers the window without growing the page', () => {
  // `fixed` on the web is not decoration. An absolutely positioned child
  // stretched to the window with negative insets still counts towards the
  // scroller's content, so every open filter would hand the screen a
  // scrollbar of ~10,000px of empty space.
  const lib = read(DROPDOWN);
  assert.ok(lib.includes("Platform.OS === 'web'"),
    `${DROPDOWN}: the dismissal layer no longer distinguishes web from native`);
  assert.ok(lib.includes("position: 'fixed' as unknown as 'absolute'"),
    `${DROPDOWN}: the web layer is not fixed any more -- an absolute one either covers only `
    + "the row it is in, or adds its own overshoot to the page's scroll height");
  // And it is untinted: these panels exist so the figures they narrow stay
  // readable, which a scrim would defeat (CP-014's picker half).
  const at = lib.indexOf('const DISMISS_FILL');
  assert.notEqual(at, -1, `${DROPDOWN}: DISMISS_FILL is gone`);
  const decl = lib.slice(at, lib.indexOf(';', lib.indexOf('bottom: -9999')));
  assert.ok(!/backgroundColor|scrim|opacity/.test(decl),
    `${DROPDOWN}: the dismissal layer paints something. It sits over the very counts the `
    + `filter is being chosen against: ${decl}`);
});

test('a half-picked custom range still applies nothing', () => {
  // C-84. The first tap of a range must not move a single figure on the
  // screen, and now that nothing downstream waits for a confirmation, this
  // is the only thing standing between a stray tap and a one-day period.
  const s = read(PERIOD);
  assert.match(
    s,
    /if \(next\.to\) \{\s*\n\s*onChange\(\{ key: CUSTOM_PERIOD, from: next\.from, to: next\.to \}\);\s*\n\s*onDone\(\);\s*\n\s*\}/,
    `${PERIOD}: the custom range no longer applies-and-closes on the day that completes it, `
    + 'or it stopped being guarded by next.to and now applies a half-picked range');
});

test('a named range still applies and closes in one tap', () => {
  // Untouched by this change, asserted rather than trusted: the four presets
  // were already the behaviour the request asked every dropdown to have.
  const s = read(PERIOD);
  assert.match(s, /onPress=\{\(\) => \{ setDating\(false\); onChange\(\{ key \}\); onDone\(\); \}\}/,
    `${PERIOD}: picking a named range no longer applies it and closes the panel`);
});

test('the single-choice dropdowns are untouched', () => {
  // MUST NOT CHANGE, asserted: Attendance's three list filters already
  // applied and closed on the tap, and this change was not a licence to
  // rework them.
  const s = read(ATTENDANCE);
  const pairs = [['branch', 'chooseBranch'], ['course', 'setCourse'], ['status', 'setStatus']] as const;
  for (const [kind, setter] of pairs) {
    assert.ok(s.includes(`onSelect={l => { ${setter}(l); setOpen(null); }}`),
      `${ATTENDANCE}: the ${kind} filter no longer applies the choice and closes in one tap`);
  }
});
