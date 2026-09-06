import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isAdminOnlyPath, homeHref, STAFF_HOME } from '../data/access';

/**
 * A staff account is not offered Overview, and the routes it is not offered
 * are shut against a typed URL
 * (requests/2026-09-06-staff-does-not-see-overview.md).
 *
 * WHAT THIS HOLDS SHUT
 * The rule is asked in five places -- the academy header's tab row, the
 * navigator's nav pill, the router's pill on a pushed screen, More's back
 * arrow, and the guard on the routes those lists stop pointing at. Five copies
 * of one rule is how the pill and the tab row end up disagreeing about where
 * home is, and how the NEXT admin-only screen ships reachable because its
 * sibling's guard was never copied onto it. src/data/access.test.ts covers the
 * rule; this covers that all five sites actually ask it.
 *
 * It reads source rather than rendering, exactly as editDialog.test.ts does
 * and for the same reason: there is no component harness in this project, and
 * the claim is about the shape of the code, not one screen's pixels.
 *
 * Every assertion is a plain string search -- a regex built inside a template
 * literal loses its own backslashes.
 */

// The repository root. The override exists to replay this spec against an
// exported copy of an EARLIER tree, which is how
// .evidence/staff-sees-overview-fail-first.txt was recorded. `import.meta` is
// deliberately not used -- scripts/tsconfig.json checks these specs as
// nodenext in a CommonJS package, where it is an error.
const ROOT = process.env.STAFF_SHELL_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SHELL = 'src/components/AppShell.tsx';
const OVERVIEW = 'app/(tabs)/index.tsx';
const MORE = 'app/(tabs)/more.tsx';
const LAYOUT = 'app/_layout.tsx';
const SIGNIN = 'app/index.tsx';

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find the source must say so. Silently
  // scanning nothing is the green-by-omission the gate exists to prevent.
  for (const f of [SHELL, OVERVIEW, MORE, LAYOUT, SIGNIN]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set STAFF_SHELL_SPEC_ROOT.`);
  }
});

test('the header tab row is filtered by role, not rendered whole', () => {
  const s = read(SHELL);
  assert.ok(!s.includes('{TABS.map('),
    `${SHELL}: the tab row renders every TAB unconditionally, so a staff account is offered Overview.`);
  assert.ok(s.includes('tabVisible('),
    `${SHELL}: the tab row must ask src/data/access.ts which tabs this account gets.`);
});

test('the Overview slot is HELD while the role is unknown', () => {
  // Without this the row reflows -- Attendance jumps half-width to full and
  // back -- on every pushed screen, because each one resolves the role again.
  const s = read(SHELL);
  assert.ok(/roleLoading \?/.test(s),
    `${SHELL}: nothing holds the Overview slot while the role is still resolving.`);
});

test('BOTH nav pills take their items from the role', () => {
  const s = read(SHELL);
  // One module-level list means one destination for two different accounts.
  assert.ok(!/const NAV(:|\s*=)/.test(s),
    `${SHELL}: the pill's destinations are a module constant, so Home is the same screen for every role.`);
  assert.equal(s.split('navItems(').length - 1, 3,
    `${SHELL}: navItems must be DEFINED once and called by both NavPill and ShellNavPill -- three occurrences.`);
  assert.ok(!s.includes('{NAV.map('),
    `${SHELL}: a pill still maps the module-level NAV.`);
});

test('Overview guards itself, because its pathname is also the sign-in screen\u2019s', () => {
  const s = read(OVERVIEW);
  assert.ok(s.includes('useAdminRedirect('),
    `${OVERVIEW}: Overview is the super admin's screen and nothing sends a staff account off it.`);
});

test('the guard is mounted once, over the whole route tree', () => {
  const s = read(LAYOUT);
  assert.ok(s.includes('<AdminRouteGuard />'),
    `${LAYOUT}: no route guard is mounted, so /staff, /staff/add, /staff/pin and /audit stay typeable.`);
});

test('every row More withholds is a route the guard withholds', () => {
  // THE SIBLING SWEEP, encoded. A row hidden from the navigation and left
  // reachable by URL is the same defect as never hiding it, and the next
  // adminOnly row added to More is the one that would ship that way.
  const more = read(MORE);
  const rows = more.split('\n').filter(l => l.includes('adminOnly: true'));
  assert.ok(rows.length >= 2,
    `${MORE}: expected the withheld rows (Staff & access, Audit log) to be marked adminOnly.`);
  for (const row of rows) {
    const to = /to: '([^']+)'/.exec(row);
    assert.ok(to, `${MORE}: an adminOnly row has no destination to guard: ${row.trim()}`);
    assert.ok(isAdminOnlyPath(to[1]),
      `${MORE}: "${to[1]}" is hidden from staff but is not in ADMIN_ONLY, so it is still reachable by URL.`);
  }
});

test('sign-in lands each role on the screen it actually has', () => {
  const s = read(SIGNIN);
  assert.ok(s.includes('homeHref('),
    `${SIGNIN}: sign-in lands every account on the same route, so a staff member arrives on Overview.`);
  assert.ok(!/must_change_pin \? '\/set-pin\?for=self' : '\/\(tabs\)'/.test(s),
    `${SIGNIN}: the success path still replaces to a literal '/(tabs)'.`);
});

test('More\u2019s back arrow returns to the account\u2019s OWN home', () => {
  const s = read(MORE);
  assert.ok(s.includes('homeHref('),
    `${MORE}: the back arrow names Overview for everybody, including accounts that have none.`);
});

test('the destination is the Attendance workspace, in every one of them', () => {
  // The one fact the five call sites must agree on, asserted once here so a
  // later change to STAFF_HOME cannot quietly split them.
  assert.equal(homeHref(false), STAFF_HOME);
  assert.equal(STAFF_HOME, '/(tabs)/courses');
});
