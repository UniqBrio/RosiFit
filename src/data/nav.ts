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

export function safeBackTarget(from: unknown, fallback: string): string {
  const v = typeof from === 'string' ? from.trim() : '';
  if (!v) return fallback;
  // `//host` is protocol-relative and leaves the app; `\` is treated as `/` by
  // some parsers, so a `/\evil.com` would too. Both are rejected before the
  // shape test, because both START with a slash and would otherwise pass it.
  if (v.startsWith('//') || v.startsWith('/\\')) return fallback;
  return IN_APP.test(v) ? v : fallback;
}
