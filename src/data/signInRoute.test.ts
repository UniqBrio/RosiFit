/**
 * Cases for how a screen reaches the SIGN-IN screen.
 *
 * Run: npx tsx --test src/data/signInRoute.test.ts
 *
 * Two routes answer to the pathname '/': app/index.tsx (sign-in) and
 * app/(tabs)/index.tsx (Overview). expo-router breaks that tie by ranking the
 * route in the group the caller is ALREADY IN, so `router.replace('/')` from a
 * tab screen lands on the signed-out Overview, not on the number field
 * (RC-022). The sign-in screen is therefore never named by its pathname: it is
 * reached by resetting the root Stack to its route, `signInRootState()`.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SIGN_IN_ROUTE, signInRootState } from './access';

test('the sign-in screen is the root Stack on its first route, and nothing else', () => {
  const state = signInRootState();
  assert.equal(SIGN_IN_ROUTE, 'index');
  assert.equal(state.index, 0);
  assert.deepEqual(state.routes, [{ name: 'index' }]);
});

/** every .tsx under app/, so a new screen is covered the day it is added */
function screens(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    return statSync(p).isDirectory() ? screens(p) : p.endsWith('.tsx') ? [p] : [];
  });
}

test('no screen replaces or pushes the bare pathname "/" to reach sign-in', () => {
  // `router.navigate('/')` is NOT in the pattern: inside the tab group it is
  // how More's back arrow returns to Overview, which is exactly the route the
  // tie-break favours there. A replace or push to '/' has only ever meant
  // "back to sign-in", and that is the call that goes to the wrong screen.
  const offenders = screens(join(__dirname, '..', '..', 'app'))
    .filter(p => /router\.(replace|push)\(\s*'\/'\s*\)/.test(readFileSync(p, 'utf8')));
  assert.deepEqual(offenders, [], `sign-in reached by pathname in: ${offenders.join(', ')}`);
});
