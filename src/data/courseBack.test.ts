import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { backFrom } from './nav';

/**
 * The back arrow on a course's attendance screen
 * (requests/2026-09-08-course-back-arrow-dead-after-refresh.md).
 *
 * WHAT WENT WRONG. `course-back` called a bare `router.back()`. The Courses
 * tab PUSHES this screen, so on that path there was an entry to pop and the
 * arrow worked. Refreshed on `/course/<id>` -- or opened from a bookmark, or
 * relaunched there as a PWA -- the screen is the app's FIRST route, the stack
 * holds nothing beneath it, and `back()` on an empty stack is a silent no-op.
 * The arrow was drawn, it was pressable, and it did nothing. That is the same
 * defect set-pin had (pinReturn.test.ts) reached by a different door.
 *
 * WHAT THIS HOLDS
 * - A pushed arrival still POPS, so the Courses tab comes back as it was left.
 * - An arrival with nothing behind it goes to a real screen, never 'back'.
 * - The origin, if a link names one, is validated -- an arrow that follows any
 *   path a URL supplied is an open redirect.
 * - The screen goes through this function rather than deciding for itself.
 */

const ROOT = process.env.COURSE_BACK_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('pushed from the Courses tab, so back pops -- that path is unchanged', () => {
  assert.equal(backFrom(true, undefined, '/courses'), 'back');
});

test('refreshed on the course URL: nothing to pop, so it goes somewhere real', () => {
  // The reported bug, stated as an assertion: this is the arrival where the
  // old `router.back()` did nothing at all.
  assert.equal(backFrom(false, undefined, '/courses'), '/courses');
});

test('an empty stack NEVER answers "back", whatever the link carried', () => {
  for (const from of [undefined, '', '   ', 'courses', 'https://evil.example/x',
    '//evil.example', '/\\evil.example', 'javascript:alert(1)']) {
    assert.notEqual(backFrom(false, from, '/courses'), 'back',
      `from=${JSON.stringify(from)} resolved to back(), the arrow that does nothing.`);
  }
});

test('a link naming an in-app origin is followed; anything else is not', () => {
  assert.equal(backFrom(false, '/attendance', '/courses'), '/attendance');
  assert.equal(backFrom(false, '/members?from=/courses', '/courses'), '/members?from=/courses');
  // Off-app targets fall back rather than being navigated to on trust.
  assert.equal(backFrom(false, 'https://evil.example/x', '/courses'), '/courses');
  assert.equal(backFrom(false, '//evil.example', '/courses'), '/courses');
  assert.equal(backFrom(false, '/\\evil.example', '/courses'), '/courses');
});

test('a pushed arrival pops even when a link named an origin', () => {
  // Popping keeps the tab's scroll and filters; a replace would rebuild them.
  assert.equal(backFrom(true, '/attendance', '/courses'), 'back');
});

test('course detail decides through nav.ts, not with its own bare back()', () => {
  const screen = read('app/course/[id].tsx');
  assert.ok(screen.includes('backFrom('),
    'app/course/[id].tsx: no longer goes through nav.ts, so the empty-stack '
    + 'case can be got wrong here again.');
  assert.ok(!/testID="course-back"[^>]*onPress=\{\(\) => router\.back\(\)\}/.test(screen),
    'app/course/[id].tsx: course-back is a bare router.back() again -- dead on a refresh.');
  assert.ok(screen.includes('router.canGoBack()'),
    'app/course/[id].tsx: nothing asks the router whether there is anything to pop.');
});

test('the arrow is unchanged as a control -- this was a behaviour fix', () => {
  const screen = read('app/course/[id].tsx');
  assert.ok(screen.includes('testID="course-back"'),
    'app/course/[id].tsx: the back control lost its testID.');
  assert.ok(screen.includes('accessibilityLabel="Go back"'),
    'app/course/[id].tsx: the back control lost its accessibility label.');
});
