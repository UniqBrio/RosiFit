/**
 * Cases for STAYING SIGNED IN until Sign out.
 *
 * Run: npx tsx --test src/data/sessionRestore.test.ts
 *
 * These cover the eight situations the request names (A-H). The ones that are
 * a DECISION -- where a returning visitor lands -- are exercised against the
 * real function. The ones that are a WIRING claim -- that the screen asks at
 * all, that signing out ends the session before it changes the route, that a
 * credential never reaches storage -- are read off the source, in the style of
 * ./signInRoute.test.ts, because that is where those failures actually live:
 * every one of them is a call that is simply absent, and no amount of
 * exercising a function that is never called will notice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { restoreDestination, FIRST_PIN_HREF, type RestoredSession } from './sessionRestore';
import { ADMIN_HOME, STAFF_HOME } from './access';

const root = join(__dirname, '..', '..');
const read = (...p: string[]) => readFileSync(join(root, ...p), 'utf8');

const signIn = read('app', 'index.tsx');
const session = read('src', 'data', 'session.ts');
const client = read('src', 'lib', 'supabase.ts');

/**
 * The file with its COMMENTS TAKEN OUT.
 *
 * Every "this must never appear" assertion below runs against this rather than
 * the raw text, because these files explain themselves at length and half the
 * forbidden words are IN those explanations -- src/data/session.ts says the
 * quiet part out loud ("anyone can put a string in localStorage") and would
 * otherwise fail the test that exists to stop it using one.
 */
function code(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
}

/** every source file under a directory, tests excluded, repo-relative */
function sources(dir: string, ext: RegExp): string[] {
  return readdirSync(dir).flatMap(name => {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) return sources(p, ext);
    if (!ext.test(p) || p.endsWith('.test.ts')) return [];
    return [p.slice(root.length + 1).split('\\').join('/')];
  });
}

// --------------------------------------------------------------- A. sign in
test('A - a successful PIN login adopts the server session, it does not fake one', () => {
  const api = read('src', 'data', 'api.ts');
  // The session is MINTED BY THE SERVER (auth-login verifies the PIN against
  // the shadow credential and GoTrue issues the tokens) and merely adopted
  // here. Nothing client-side decides that somebody is signed in.
  assert.match(api, /supabase\.auth\.setSession\(/);
  assert.match(signIn, /await adoptSession\(result\)/);
});

test('A - the PIN is never kept anywhere after it is sent', () => {
  // The entry is cleared whichever way the call ends, and no storage call
  // anywhere in the screen or the session module carries it.
  assert.match(signIn, /setPin\(''\)/);
  const store = /AsyncStorage|localStorage|sessionStorage|SecureStore/;
  assert.doesNotMatch(code(signIn), store);
  assert.doesNotMatch(code(session), store);
});

// ------------------------------------------------- B/C. refresh, and relaunch
test('B - the sign-in screen ASKS whether a session already exists', () => {
  // The whole bug: '/' is this route AND the PWA's startUrl, and it used to
  // render the number field without ever asking. If this call goes, every
  // reload demands a PIN again and nothing else in the suite would say so.
  assert.match(signIn, /restoreSession\(\)/);
  assert.match(signIn, /restoreDestination\(restored\)/);
  assert.match(signIn, /if \(next\.resume\) router\.replace\(next\.href\)/);
});

test('B - a confirmed session resumes rather than asking for the PIN again', () => {
  const admin: RestoredSession = { state: 'active', kind: 'super_admin', mustChangePin: false };
  assert.deepEqual(restoreDestination(admin), { resume: true, href: ADMIN_HOME });
});

test('C - the session is stored where CLOSING THE BROWSER does not end it', () => {
  // AsyncStorage is localStorage on web -- it survives the tab, the window and
  // the process. sessionStorage would die with the tab, which is precisely the
  // behaviour being fixed, so its absence is the assertion.
  assert.match(client, /storage: AsyncStorage/);
  assert.match(client, /persistSession: true/);
  assert.match(client, /autoRefreshToken: true/);
  assert.doesNotMatch(client, /sessionStorage/);
});

// ------------------------------------------------------ D. protected access
test('D - a resumed session lands on the shell that role actually has', () => {
  const staff: RestoredSession = { state: 'active', kind: 'staff', mustChangePin: false };
  assert.deepEqual(restoreDestination(staff), { resume: true, href: STAFF_HOME });
  // The same answer a FRESH sign-in gets, read from the same place -- a
  // resumed session must not land somewhere a typed PIN would not.
  assert.match(signIn, /homeHref\(result\.user\?\.kind !== 'staff'\)/);
});

test('D - a first PIN is still forced before anything else, on a resume too', () => {
  const fresh: RestoredSession = { state: 'active', kind: 'staff', mustChangePin: true };
  assert.deepEqual(restoreDestination(fresh), { resume: true, href: FIRST_PIN_HREF });
  assert.equal(FIRST_PIN_HREF, '/set-pin?for=first');
});

test('D - the identity is resolved by the DATABASE, not claimed by the client', () => {
  // Read back through PostgREST under app_users_read, keyed on auth.uid().
  // Nothing here parses a token or trusts a stored user id.
  assert.match(session, /\.eq\('auth_user_id', authUserId\)/);
  assert.doesNotMatch(session, /decodeJwt|jwtDecode|atob\(/);
});

// -------------------------------------------------- E/F. no session, expired
test('E - no session means the login screen', () => {
  assert.deepEqual(restoreDestination({ state: 'none' }), { resume: false, reason: 'none' });
});

test('F - an expired, unrefreshable session means the login screen', () => {
  // getSession() refreshes an expired access token; a refresh token that has
  // expired or been revoked fails that exchange and leaves no session at all,
  // which arrives here as 'none'. There is no third answer in which a stale
  // token still opens the app.
  assert.equal(restoreDestination({ state: 'none' }).resume, false);
  assert.match(session, /if \(!authUserId\) return \{ state: 'none' \};/);
});

test('F - a disabled account does not ride an old session past the door', () => {
  // The check persistence makes necessary: before this, is_active was met at
  // auth-login on every single entry.
  assert.deepEqual(restoreDestination({ state: 'closed' }), { resume: false, reason: 'closed' });
  assert.match(session, /if \(!data\.is_active\)/);
  assert.match(session, /return \{ state: 'closed' \};/);
  assert.match(session, /select\('kind, must_change_pin, is_active'\)/);
});

test('an unreachable server is not a verdict, and does not sign her out', () => {
  // 'unverified' refuses to resume -- the server did not say yes -- but the
  // stored token is left ALONE, so the next visit that reaches the server
  // resumes without a PIN. Signing out on a dropped connection would log a
  // coach out of her own phone every time the academy wifi blinked.
  assert.deepEqual(restoreDestination({ state: 'unverified' }),
    { resume: false, reason: 'unverified' });
  // the three ways the server can fail to answer, none of them a sign-out
  assert.equal(session.split("return { state: 'unverified' };").length - 1, 3);
});

// ------------------------------------------------------------- G. signing out
test('G - signing out ENDS THE SESSION on the server before it changes route', () => {
  // Order matters and is the assertion: replacing the route on its own left a
  // live session behind, and the next launch -- which now RESUMES -- would
  // walk straight back in as the previous account.
  for (const file of ['app/(tabs)/more.tsx', 'app/profile.tsx']) {
    const src = read(...file.split('/'));
    const out = src.indexOf('await signOut();');
    const nav = src.indexOf('toSignIn();');
    assert.ok(out > -1, `${file} must sign out`);
    assert.ok(nav > out, `${file} must end the session before it leaves the screen`);
  }
});

test('G - sign out is a server revocation, not a cleared browser', () => {
  // GoTrue deletes the refresh-token rows for the session on /logout. A client
  // that merely cleared its own storage would leave a usable token behind.
  assert.match(session, /supabase\.auth\.signOut\(\{ scope: 'local' \}\)/);
});

// -------------------------------------------------------- H. many devices
test('H - signing out of ONE device does not sign out the others', () => {
  // supabase-js defaults to scope 'global', which revokes every session this
  // account has anywhere -- so the academy laptop signing out at closing time
  // also signed her out of her own phone.
  assert.match(session, /scope: 'local'/);
  assert.doesNotMatch(session, /scope: 'global'/);
});

test('H - global revocation still exists, and only where it means something', () => {
  // A reset PIN should not leave old devices holding a live session. That is
  // the one place every-device revocation is correct, and it is not this one.
  const identity = read('supabase', 'functions', '_shared', 'identity.ts');
  assert.match(identity, /export async function signOutEverywhere/);
  assert.match(identity, /method: 'DELETE'/);
  assert.match(read('supabase', 'functions', 'pin-reset', 'index.ts'), /signOutEverywhere\(/);
});

// ------------------------------------------------------------------ security
test('no screen keeps a client-side "signed in" flag', () => {
  // Persistence that is a boolean in storage is not authentication: it is a
  // claim the device makes about itself, and anybody can write it.
  const offenders = sources(join(root, 'app'), /\.tsx$/)
    .filter(p => /loggedIn|isLoggedIn|authenticated\s*=\s*true/.test(read(...p.split('/'))));
  assert.deepEqual(offenders, [], 'the server decides who is signed in, not the device');
});

test('the only two things written to device storage are tokens and the theme', () => {
  // AsyncStorage appears in exactly two places: the GoTrue client's session
  // store (tokens GoTrue itself issues, rotates and revokes) and the
  // appearance preference. A third would need a reason.
  const found = sources(join(root, 'src'), /\.tsx?$/)
    .filter(p => /AsyncStorage/.test(code(read(...p.split('/')))));
  assert.deepEqual(found.sort(),
    ['src/lib/supabase.ts', 'src/theme/ThemeProvider.tsx']);
});
