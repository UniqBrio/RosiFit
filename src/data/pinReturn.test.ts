import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { afterPinChange } from './nav';
import { ADMIN_HOME, STAFF_HOME } from './access';

/**
 * Where set-pin goes once the new PIN is accepted
 * (requests/2026-09-07-pin-keypad-two-per-row.md, item 3).
 *
 * WHAT WENT WRONG. set-pin decided with `?for=self`, which records WHO ASKED,
 * and answered it with `router.back()`. Two arrivals both said 'self':
 * Profile, which PUSHES and therefore has somewhere to go back to, and
 * sign-in's must_change_pin path, which REPLACES and therefore does not.
 * `back()` on an empty stack does nothing, so every first login -- staff and
 * super admin alike -- accepted the new PIN and then sat on the PIN screen.
 *
 * WHAT THIS HOLDS
 * - The two arrivals are told apart by the caller, not guessed by the screen.
 *   'self' goes back; 'first' and 'register' land on a dashboard, because
 *   nothing is behind them.
 * - The dashboard is the one the ROLE actually has. Sending a staff account
 *   to Overview is a screen her own shell guard moves her off.
 * - An unknown role resolves to the admin home, never to a dead end.
 */

const ROOT = process.env.PIN_RETURN_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('Profile pushed, so Profile is where back goes', () => {
  assert.equal(afterPinChange('self', true), 'back');
  assert.equal(afterPinChange('self', false), 'back');
});

test('a first login has nothing behind it, so it lands on the dashboard', () => {
  assert.equal(afterPinChange('first', true), ADMIN_HOME);
  assert.equal(afterPinChange('first', false), STAFF_HOME);
});

test('a fresh registration lands on the dashboard too', () => {
  assert.equal(afterPinChange('register', true), ADMIN_HOME);
  assert.equal(afterPinChange('register', false), STAFF_HOME);
});

test('an unknown arrival never answers "back"', () => {
  // The failure mode being guarded: any arrival this function cannot place
  // must still go SOMEWHERE. 'back' on an empty stack is the stuck screen.
  for (const who of [undefined, '', 'nonsense', 'SELF']) {
    assert.notEqual(afterPinChange(who, true), 'back',
      `"${who}" resolved to back(), which is a no-op when nothing was pushed.`);
  }
});

test('a staff account is never sent to a screen it does not have', () => {
  assert.equal(afterPinChange('first', false), STAFF_HOME);
  assert.notEqual(afterPinChange('first', false), ADMIN_HOME);
});

test('the callers that REPLACE say so, and the one that pushes does not', () => {
  // The whole fix rests on the caller being honest about how it navigated.
  const signIn = read('app/index.tsx');
  assert.ok(signIn.includes("'/set-pin?for=first'"),
    'app/index.tsx: the must_change_pin path does not mark itself as a replace.');
  assert.ok(!signIn.includes("'/set-pin?for=self'"),
    'app/index.tsx: still sends for=self after a replace, so back() will do nothing.');

  const forgot = read('app/forgot-pin.tsx');
  assert.ok(forgot.includes("'/set-pin?for=first'"),
    'app/forgot-pin.tsx: replaces into set-pin but still says for=self.');

  const profile = read('app/profile.tsx');
  assert.ok(profile.includes("router.push('/set-pin?for=self')"),
    'app/profile.tsx: Change My PIN must PUSH and say for=self -- back is correct there.');
});

test('set-pin no longer lands anyone on a literal /(tabs)', () => {
  const s = read('app/set-pin.tsx');
  assert.ok(!/router\.replace\('\/\(tabs\)'\)/.test(s),
    'app/set-pin.tsx: still replaces to a literal /(tabs), so a staff account arrives on Overview.');
  assert.ok(s.includes('afterPinChange('),
    'app/set-pin.tsx: decides where to go itself instead of going through nav.ts, '
    + 'so its three success paths can answer differently again.');
  assert.ok(!/router\.back\(\); flash/.test(s),
    'app/set-pin.tsx: a success path still calls router.back() directly.');
});
