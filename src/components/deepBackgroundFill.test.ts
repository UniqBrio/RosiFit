import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "fix the ui" (7 Sep 2026) - the course detail screen showed a 417pt band of
 * empty purple between the course header and the follow-up line, with the week
 * strip and the members pushed onto the bottom half of the screen.
 *
 * THE CAUSE, which was not in the course screen at all
 * `DeepBackground` hardcoded `flex: 1`. That is correct for three of its four
 * callers, where the gradient IS the screen: sign-in, and `Screen deep` for
 * Help and the PIN screens. The fourth is the course header, which the pinned-
 * header change made a SIBLING ABOVE the roster's ScrollView. Two flex: 1
 * siblings split the viewport down the middle, so a bar carrying 56pt of
 * content painted 417pt of gradient. Measured, not inferred:
 * .evidence/course-header-dead-purple-band.txt.
 *
 * WHY THE CALLER COULD NOT FIX IT FROM OUTSIDE, and why this guard exists
 * The obvious patch is to override the style at the call site. It does not
 * work: `flex: 1` compiles to `flex: 1 1 0%`, so overriding only `flexGrow`
 * leaves `flexBasis: 0%` behind and the bar collapses to nothing instead of
 * hugging its rows. The fix has to be a real choice inside the component,
 * which is what `fill` is. A future caller reaching for a style override here
 * gets a 0pt header and no error, so the shape is asserted rather than trusted.
 *
 * Source-shape, like dialogDismiss.test.ts and dropdownAppliesOnPick.test.ts:
 * there is no component harness in this project, and the claim is about which
 * component owns a layout decision.
 */

const ROOT = process.env.DEEP_FILL_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const UI = 'src/components/ui.tsx';
const COURSE = 'app/course/[id].tsx';

test('DeepBackground takes a fill flag, and it defaults to filling', () => {
  const ui = read(UI);
  assert.match(ui, /fill = true/,
    'DeepBackground lost its fill default - every full-screen caller would collapse');
  assert.match(ui, /fill\?\s*:\s*boolean/, 'fill is no longer part of the prop type');
});

test('the gradient only claims the viewport when it is asked to', () => {
  const ui = read(UI);
  assert.match(ui, /style=\{\[fill \? \{ flex: 1 \} : null, style\]\}/,
    'DeepBackground went back to an unconditional flex: 1');
  assert.doesNotMatch(ui, /style=\{\[\{ flex: 1 \}, style\]\}/,
    'the unconditional flex: 1 is back - the course header will eat half the screen again');
});

test('the course header declares itself a bar, not a screen', () => {
  const course = read(COURSE);
  assert.match(course, /<DeepBackground fill=\{false\}/,
    'the course header stopped passing fill={false} - this is the 417pt purple band returning');
});

test('the screens whose gradient IS the screen still say nothing, so they still fill', () => {
  // They must NOT pass fill at all: passing fill={false} on sign-in would leave
  // the bottom of the screen painted in the app background instead of the deep
  // gradient, which is the same bug pointing the other way.
  for (const rel of ['app/index.tsx', UI]) {
    const src = read(rel);
    for (const m of src.matchAll(/<DeepBackground([^>]*)>/g)) {
      if (rel === UI && /fill = true/.test(m[1])) continue;
      assert.doesNotMatch(m[1], /fill=\{false\}/,
        `${rel} made a full-screen deep surface stop filling`);
    }
  }
});
