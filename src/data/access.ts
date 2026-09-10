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
 * WHICH TAB IS LIT, for the academy header's underline row.
 *
 * The row had this rule inline, and it read:
 *
 *     path === t.match || t.also.includes(path) || path.startsWith('/course/')
 *
 * The last clause is not about a tab. It is evaluated once PER TAB and has no
 * `t` in it, so on any course detail it answered true for EVERY tab -- both
 * words in the accent ink, both carrying the accent bar, and a row whose whole
 * job is to say where you are saying "both". A tab strip that cannot name the
 * current tab is the one thing a tab strip has to do.
 *
 * It also under-answered. A member detail is `/member/<id>`, which is in no
 * tab's `also` and matches no prefix, so that screen lit NOTHING: the row went
 * blank in the middle of the Attendance workspace.
 *
 * So the prefixes belong TO A TAB, as `under`. Attendance is a SECTION -- the
 * course list, a course's detail, the member list, a member's detail, the
 * weekly review and the register are one workspace -- and `under` is how a tab
 * claims the screens pushed beneath it. `also` stays for exact pathnames.
 *
 * The boundary matters: `/members` must not be claimed by a `/member` prefix
 * as though it were a detail screen, and it is not, because a prefix only
 * matches the path itself or the path plus a `/`. That is the same boundary
 * `isAdminOnlyPath` draws, for the same reason.
 */
export type ShellTab = {
  /** the exact pathname this tab lands on */
  match: string;
  /** other exact pathnames that ARE this tab */
  also: string[];
  /** path prefixes pushed beneath this tab -- `/course` claims `/course/c1` */
  under?: string[];
};

export function tabActive(tab: ShellTab, path: string): boolean {
  if (path === tab.match) return true;
  if (tab.also.includes(path)) return true;
  return (tab.under ?? []).some(p => path === p || path.startsWith(`${p}/`));
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
