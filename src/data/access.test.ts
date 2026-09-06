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
