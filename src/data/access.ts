import type { Href } from 'expo-router';

/**
 * What the chrome offers, by role.
 *
 * THE DECISION THIS FILE HOLDS
 * A staff account does not get Overview. It gets the same shell the super
 * admin gets in every other respect -- the same academy header, the same
 * three-item pill with the same labels, the same Reports -- and Home simply
 * means the Attendance workspace instead of the dashboard
 * (requests/2026-09-06-staff-does-not-see-overview.md).
 *
 * WHY IT IS A MODULE AND NOT THREE `isSuperAdmin ?` EXPRESSIONS IN AppShell
 * The shell asks the question in FOUR places -- the header tab row, the
 * navigator's pill, the router's pill on a pushed screen, and More's back
 * arrow -- and a fifth, the guard on the routes those lists stop pointing at.
 * Five copies of one rule is how the pill and the tab row end up disagreeing
 * about where home is. They read it from here instead, and the rule is
 * covered by src/data/access.test.ts rather than by opening the app.
 *
 * NOTE ON THE UNKNOWN ROLE. Every function here takes a plain boolean and
 * `false` is the SAFE answer: while `useIdentity` is still resolving, the
 * caller passes false and the shell shows the staff shape. Offering a tap
 * that turns out not to have been hers is the failure this ordering avoids;
 * an admin's Overview arriving a beat late is not.
 */

/** The dashboard. The super admin's landing screen and the tab row's first tab. */
export const ADMIN_HOME = '/(tabs)' as const;

/** The Attendance workspace's landing screen -- the course list. */
export const STAFF_HOME = '/(tabs)/courses' as const;

/** Where Home goes, and where sign-in lands, for this role. */
export function homeHref(isSuperAdmin: boolean): Href {
  return isSuperAdmin ? ADMIN_HOME : STAFF_HOME;
}

/** The pathname Home is ON, so the pill can light the right item. */
export function homeMatch(isSuperAdmin: boolean): string {
  return isSuperAdmin ? '/' : '/courses';
}

/**
 * The tab named by `route` in the academy header's underline row.
 * Only `index` -- Overview -- is role-dependent; Attendance is everyone's.
 */
export function tabVisible(route: string, isSuperAdmin: boolean): boolean {
  return route !== 'index' || isSuperAdmin;
}

/**
 * Screens a staff account may not open, whatever the navigation offers.
 *
 * These are the two the RLS policies already refuse -- `app_users_read` and
 * `audit_logs_read` are both `is_super_admin()` -- so a staff member who
 * reaches one by typing the URL gets an error-shaped screen today. The list
 * is by PREFIX because /staff carries /staff/add and /staff/pin under it, and
 * a guard on the index alone leaves both of those typeable.
 *
 * Overview is deliberately NOT here. Its pathname is '/', which the sign-in
 * screen also answers to, so it guards itself in app/(tabs)/index.tsx where
 * there is no ambiguity about which screen is mounted.
 */
const ADMIN_ONLY = ['/staff', '/audit'];

export function isAdminOnlyPath(path: string): boolean {
  return ADMIN_ONLY.some(p => path === p || path.startsWith(`${p}/`));
}

/**
 * THE SIGN-IN SCREEN IS NEVER NAMED BY ITS PATHNAME.
 *
 * Its pathname is '/', and so is Overview's (`(tabs)/index`). expo-router
 * breaks that tie in favour of the group the caller is already in, so
 * `router.replace('/')` from any tab screen lands on the signed-out Overview
 * -- which is what Sign out under More did (RC-022). Signing out, and every
 * "Back to sign in", is instead a RESET of the root Stack to this one route:
 * no tie to break, and nothing left on the stack to come back to, which is
 * also what ending a session should mean.
 */
export const SIGN_IN_ROUTE = 'index' as const;

export function signInRootState(): { index: 0; routes: { name: typeof SIGN_IN_ROUTE }[] } {
  return { index: 0, routes: [{ name: SIGN_IN_ROUTE }] };
}
