import type { Href } from 'expo-router';
import { homeHref } from './access';
/**
 * Where "back" goes, when router.back() cannot answer.
 *
 * THE PROBLEM THIS SOLVES
 * Weekly review, Members and Attendance live INSIDE the tab group, because the
 * canvas keeps the academy header, the two-tab row and the nav pill on all
 * three (`showTabs` in the prototype lists weekly and members by name). That
 * placement is right, and it costs them a back stack: navigating to a screen
 * in a Tabs navigator switches the focused tab rather than pushing, so
 * router.back() pops to the FIRST tab. Opening Weekly review from a course
 * and pressing back landed on Overview -- verified in a browser, not assumed.
 *
 * So the caller names where it came from, and the screen goes there. The back
 * stack is real because somebody wrote it down.
 *
 * WHY THE VALUE IS CHECKED
 * `from` arrives as a URL parameter, which makes it untrusted input: anybody
 * who can get a link opened can set it. A back button that navigates to
 * whatever a link said is an open redirect wearing an arrow icon. Only an
 * in-app absolute path is accepted; everything else falls back to the screen
 * the caller nominated.
 */

/** Path characters expo-router routes actually use: segments, [params], (groups). */
const IN_APP = /^\/[A-Za-z0-9\-_/[\]().~%]*(\?[A-Za-z0-9\-_/[\]().~%=&]*)?$/;

export function safeBackTarget(from: unknown, fallback: Href): Href {
  const v = typeof from === 'string' ? from.trim() : '';
  if (!v) return fallback;
  // `//host` is protocol-relative and leaves the app; `\` is treated as `/` by
  // some parsers, so a `/\evil.com` would too. Both are rejected before the
  // shape test, because both START with a slash and would otherwise pass it.
  if (v.startsWith('//') || v.startsWith('/\\')) return fallback;
  // The one cast in the app that turns a runtime string into a route, and it
  // sits directly under the guard that earns it: typed routes cannot know
  // what a `?from=` query carried, and this function's whole job is to
  // decide whether that string is a route the app may follow.
  return IN_APP.test(v) ? (v as Href) : fallback;
}

/* ------------------------------------------------------- after a PIN change
 * The same principle as safeBackTarget above, applied to set-pin: the caller
 * names how it arrived, because the screen cannot tell.
 *
 * set-pin used to decide from `?for=self` -- a flag that records WHO ASKED --
 * and answer with router.back(). Two arrivals both said 'self':
 *
 *   Profile      router.push  -> a screen is behind this one; back is right.
 *   sign-in      router.replace -> NOTHING is behind this one.
 *
 * router.back() with an empty stack is a no-op, so the second arrival showed
 * "PIN updated" and then stayed exactly where it was. That was every first
 * login, staff and super admin alike, and it is why the fix is a distinct
 * value rather than a cleverer guess: only the caller knows whether it
 * pushed.
 */

/** Nothing was pushed, so there is nowhere to pop to -- go somewhere real. */
export type PinDestination = 'back' | Href;

/**
 * Where set-pin goes once the new PIN is accepted.
 *
 * `'back'` ONLY for the arrival that genuinely pushed. Everything else --
 * including an arrival this function does not recognise -- resolves to a
 * dashboard, because a wrong dashboard is a tap from the right one and a
 * back() into an empty stack is a dead end.
 */
export function afterPinChange(who: string | undefined, isSuperAdmin: boolean): PinDestination {
  return who === 'self' ? 'back' : homeHref(isSuperAdmin);
}
