/**
 * Cases for what the chrome offers each role.
 *
 * Run: npx tsx --test src/data/access.test.ts
 *
 * The rule these cover is asked in five places -- the header tab row, two nav
 * pills, More's back arrow and the route guard -- so the thing worth testing
 * is that ONE answer comes back to all five, including the answer given while
 * the role is still unknown.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ADMIN_HOME, STAFF_HOME, homeHref, homeMatch, tabVisible, isAdminOnlyPath,
  tabActive, type ShellTab,
} from './access';

test('home is the dashboard for the super admin and Attendance for staff', () => {
  assert.equal(homeHref(true), ADMIN_HOME);
  assert.equal(homeHref(false), STAFF_HOME);
});

test('the pill lights Home on the pathname home actually is', () => {
  assert.equal(homeMatch(true), '/');
  assert.equal(homeMatch(false), '/courses');
});

test('Overview is the super admin tab; Attendance is everyone\u2019s', () => {
  assert.equal(tabVisible('index', true), true);
  assert.equal(tabVisible('index', false), false);
  assert.equal(tabVisible('courses', true), true);
  assert.equal(tabVisible('courses', false), true);
});

test('an unknown role gets the STAFF shape, never the admin one', () => {
  // useIdentity resolves asynchronously, so every caller passes false while
  // it is loading. Offering Overview and pulling it away is the failure.
  assert.equal(tabVisible('index', false), false);
  assert.equal(homeHref(false), STAFF_HOME);
});

test('the withheld routes are withheld, and so is everything under them', () => {
  assert.equal(isAdminOnlyPath('/staff'), true);
  assert.equal(isAdminOnlyPath('/staff/add'), true);
  assert.equal(isAdminOnlyPath('/staff/pin'), true);
  assert.equal(isAdminOnlyPath('/audit'), true);
});

test('a path that merely STARTS with the same letters is not withheld', () => {
  // '/staffroom' is not '/staff', and a prefix test without the boundary
  // would send it home. Nothing routes there today; the guard is the kind of
  // thing a later route walks into.
  assert.equal(isAdminOnlyPath('/staffroom'), false);
  assert.equal(isAdminOnlyPath('/auditing'), false);
});

test('the screens staff DO get are not withheld', () => {
  for (const p of ['/', '/courses', '/members', '/weekly', '/attendance',
                   '/reports', '/more', '/branches', '/profile', '/appearance',
                   '/help', '/course/c1', '/member/m1']) {
    assert.equal(isAdminOnlyPath(p), false, `${p} must stay open to staff`);
  }
});

/* ------------------------------------------------------------- which tab is lit
 *
 * The header row is two tabs and its whole job is to say which one you are on.
 * It said "both" on every course detail and "neither" on every member detail,
 * because the prefix clause was evaluated per tab and mentioned no tab. These
 * are the shapes that were wrong, and the boundary that keeps the fix honest.
 */

// The two tabs exactly as src/components/AppShell.tsx declares them.
const OVERVIEW: ShellTab = { match: '/', also: [] };
const ATTENDANCE: ShellTab = {
  match: '/courses', also: ['/members', '/weekly', '/attendance'],
  under: ['/course', '/member'],
};

test('a tab is lit on its own landing screen', () => {
  assert.equal(tabActive(OVERVIEW, '/'), true);
  assert.equal(tabActive(ATTENDANCE, '/courses'), true);
});

test('the other screens of the workspace light Attendance', () => {
  for (const p of ['/members', '/weekly', '/attendance']) {
    assert.equal(tabActive(ATTENDANCE, p), true, `${p} is the Attendance workspace`);
  }
});

test('a COURSE DETAIL lights Attendance and Attendance ALONE', () => {
  // The defect itself. `path.startsWith('/course/')` sat outside the tab it
  // described, so both words went accent-ink and both carried the bar, and the
  // row that exists to say where you are said "both".
  assert.equal(tabActive(ATTENDANCE, '/course/daadccd0-5b37-44e4-be54-2feae1a370c3'), true);
  assert.equal(tabActive(OVERVIEW, '/course/daadccd0-5b37-44e4-be54-2feae1a370c3'), false);
});

test('a MEMBER DETAIL lights Attendance too, where nothing used to be lit', () => {
  // The same clause under-answered as well: '/member/m1' is in no `also` and
  // matched no prefix, so the row went blank in the middle of the workspace.
  assert.equal(tabActive(ATTENDANCE, '/member/m1'), true);
  assert.equal(tabActive(OVERVIEW, '/member/m1'), false);
});

test('exactly ONE tab is ever lit, on every screen the shell draws', () => {
  // The claim the row actually has to keep, asserted over the set rather than
  // one path at a time -- a per-path test passes happily while some other path
  // lights two.
  for (const p of ['/', '/courses', '/members', '/weekly', '/attendance',
                   '/course/c1', '/member/m1', '/course/c1/edit']) {
    const lit = [OVERVIEW, ATTENDANCE].filter(t => tabActive(t, p));
    assert.equal(lit.length, 1, `${p} lights ${lit.length} tabs; a tab row must light exactly one`);
  }
});

test('a prefix claims the screens UNDER it, never a longer word', () => {
  // '/members' is the member LIST -- an Attendance screen by its own `also`,
  // not a detail screen swept up by a '/member' prefix. Without the boundary
  // the two are indistinguishable, and the next route named '/coursework'
  // would be swallowed whole.
  assert.equal(tabActive({ match: '/x', also: [], under: ['/member'] }, '/members'), false);
  assert.equal(tabActive({ match: '/x', also: [], under: ['/course'] }, '/coursework'), false);
  assert.equal(tabActive({ match: '/x', also: [], under: ['/course'] }, '/course'), true);
  assert.equal(tabActive({ match: '/x', also: [], under: ['/course'] }, '/course/c1'), true);
});

test('a tab with no `under` is not broken by its absence', () => {
  // Overview declares none, and an optional field read without a default is
  // how a rule that works for one tab throws for the other.
  assert.equal(tabActive(OVERVIEW, '/course/c1'), false);
  assert.equal(tabActive(OVERVIEW, '/'), true);
});
