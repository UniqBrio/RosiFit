import { useEffect } from 'react';
import { usePathname, useRouter } from 'expo-router';
import { useIdentity } from '../data/session';
import { homeHref, isAdminOnlyPath } from '../data/access';

/**
 * The screens a staff account may not open, held shut against a typed URL.
 *
 * WHY A REDIRECT RATHER THAN A "NO ACCESS" CARD
 * app/member/import.tsx says no with an EmptyState, and that is right there:
 * bulk import is a button a staff member can see, so being told why it is not
 * hers answers a question she actually asked. Overview, Staff & access and the
 * Audit log are different -- the navigation does not offer them to her at all,
 * so arriving is either a stale link or a typed address, and the useful answer
 * is the screen she meant to be on. The requester chose this explicitly
 * (requests/2026-09-06-staff-does-not-see-overview.md).
 *
 * WHAT IT DELIBERATELY DOES NOT DO
 * It does not fire while SIGNED OUT. A signed-out visitor has no role to fail,
 * and sending her to Attendance would only swap one screen that cannot load
 * for another; the screens keep their own signed-out states. Nor does it fire
 * while the role is still resolving -- `checking` covers that window so a
 * caller renders its skeleton instead of the admin content.
 *
 * It is NOT the permission boundary. `app_users_read` and `audit_logs_read`
 * are `is_super_admin()` in the database and stay the only thing standing
 * between a staff account and those rows (guardrail: the chrome agrees with
 * the policies, it does not replace them).
 */
export function useAdminRedirect(guarded: boolean): { checking: boolean } {
  const router = useRouter();
  const { identity, loading, signedOut } = useIdentity();
  const send = guarded && !loading && !signedOut && !identity?.isSuperAdmin;

  useEffect(() => {
    if (send) router.replace(homeHref(false));
  }, [send, router]);

  return { checking: guarded && (loading || send) };
}

/**
 * The same guard for every admin-only ROUTE at once, mounted beside the root
 * Stack in app/_layout.tsx.
 *
 * One guard rather than one per screen, because /staff carries /staff/add and
 * /staff/pin under it and a per-screen guard is exactly the kind of thing the
 * next sub-route forgets to copy. Overview is not covered here -- its pathname
 * is '/', which the sign-in screen answers to as well -- so it calls
 * useAdminRedirect itself, where there is no doubt which screen is mounted.
 */
export function AdminRouteGuard() {
  useAdminRedirect(isAdminOnlyPath(usePathname()));
  return null;
}
