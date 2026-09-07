import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "In all screen freeze the header below overview and attendance so that on
 *  scroll on viewing course member and graphs we will know which screen we
 *  are in." (requests/2026-09-07-pin-screen-header-on-scroll.md)
 *
 * The academy header -- brand, bell, gear, Overview · Attendance -- was
 * already a sibling ABOVE the scroll. The screen's own header was not: on
 * every tabbed screen `ScreenHeader` was the first CHILD of `Screen`, which
 * is a ScrollView, and on the course page the purple course bar was the
 * first child of that screen's ScrollView. Both scrolled off the top.
 *
 * The fix is one mechanism, the one ShellScreen already uses: the pinned
 * block is a sibling above the ScrollView, never inside it. What can
 * silently come back, and is guarded below:
 *
 *   - a screen puts its ScreenHeader back inside `<Screen>` as a child;
 *   - `Screen` renders its `header` slot inside the ScrollView after all;
 *   - the course bar drifts back inside the course page's ScrollView;
 *   - somebody reaches for `position: sticky` or `stickyHeaderIndices`,
 *     which is a second mechanism next to the one the shell already has.
 *
 * It reads source rather than rendering, for the reason
 * memberCardAttendanceReadOnly.test.ts gives: there is no component harness
 * here, and the claim is about where a block sits, not what it says.
 */

const ROOT = process.env.SCREEN_HEADER_PINNED_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const TABBED = [
  'app/(tabs)/courses.tsx',
  'app/(tabs)/reports.tsx',
  'app/(tabs)/members.tsx',
  'app/(tabs)/weekly.tsx',
  'app/(tabs)/attendance.tsx',
  'app/(tabs)/more.tsx',
];

test('Screen renders its header slot as a sibling ABOVE the ScrollView, not inside it', () => {
  const src = read('src/components/ui.tsx');
  const fn = src.slice(src.indexOf('export function Screen('));
  assert.match(fn, /header\?: React\.ReactNode/, 'Screen has no `header` slot');
  // The ScrollView is built as `body` and the pinned frame puts `{header}`
  // ABOVE `{body}`: what matters is the order inside the frame, not where in
  // the function each expression happens to be written.
  const frame = fn.indexOf('const framed');
  assert.notEqual(frame, -1, 'Screen has no framed render for a pinned header');
  const slot = fn.indexOf('{header}', frame);
  const bodyAt = fn.indexOf('{body}', frame);
  assert.notEqual(slot, -1, 'the frame never renders the header slot');
  assert.notEqual(bodyAt, -1, 'the frame never renders the scrolling body');
  assert.ok(slot < bodyAt, 'the header slot must sit above the scrolling body in the frame');
  // ...and the ScrollView itself must not be wrapped around the slot.
  assert.equal(fn.slice(slot, bodyAt).includes('<ScrollView'), false,
    'a ScrollView opens between the header slot and the body -- the header is inside the scroll');
});

for (const rel of TABBED) {
  test(`${rel} passes its ScreenHeader through Screen's header slot`, () => {
    const src = read(rel);
    assert.match(src, /<Screen header=\{/, 'the screen never uses Screen\'s header slot');
    // A ScreenHeader as the first child of a bare <Screen> is the shape that
    // scrolled away. None may remain.
    assert.doesNotMatch(src, /<Screen>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<ScreenHeader/,
      'a ScreenHeader is still the first child of a bare <Screen> and will scroll away');
  });
}

test('the course bar sits above the course page ScrollView, not inside it', () => {
  const src = read('app/course/[id].tsx');
  const header = src.indexOf('THE COMPACT COURSE HEADER');
  assert.notEqual(header, -1, 'the course header banner comment is gone');
  const scroll = src.indexOf("contentContainerStyle={{ paddingBottom: 110 }}");
  assert.notEqual(scroll, -1, 'the course page ScrollView is gone');
  assert.ok(header < scroll, 'the course bar must open before the roster ScrollView does');
});

test('no second pinning mechanism appears beside the sibling-above pattern', () => {
  for (const rel of [...TABBED, 'app/course/[id].tsx', 'src/components/ui.tsx']) {
    const src = read(rel);
    assert.doesNotMatch(src, /stickyHeaderIndices|position:\s*'sticky'/, `${rel} uses a sticky mechanism`);
  }
});
