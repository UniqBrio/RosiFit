/**
 * The link a staff member is handed with her PIN.
 *
 * WHAT WAS WRONG HERE
 * It was the literal `https://rosifit.app/staff`, written once on the PIN
 * screen and used by both the copy row and the share sheet. Two things were
 * wrong with it at once:
 *
 *  1. `/staff` is not a landing place. It is the academy admin's Staff &
 *     access screen, behind a session — the person following the link has no
 *     session yet, which is the entire reason she was sent a PIN. The sign-in
 *     screen is the app's ROOT route (`app/index.tsx`, and `start_url: "/"`
 *     in the manifest), so the link she needs is the origin and nothing
 *     after it.
 *  2. The host was a guess that nothing in the repo confirms. The admin
 *     reading the PIN off her screen is, by definition, already standing on
 *     the deployment the staff member has to reach — so on the web the
 *     origin is read from the browser rather than declared here, and it is
 *     right by construction on every deployment, preview included.
 *
 * The literal survives only as the fallback for the two cases with no
 * shareable origin to read: a native build, and a dev server on loopback
 * (`http://localhost:8081` is a perfectly real origin and a useless thing to
 * send anybody).
 */

/** The one declared host, for when the running origin cannot be shared. */
export const APP_LINK_FALLBACK = 'https://rosifit.app';

/** `http://localhost:8081` is an origin; it is not a link. */
const LOOPBACK = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i;

/** `https://host[:port]` and nothing else — an origin carrying a path is not
 *  one, and is not trusted to be trimmed into one. */
const ORIGIN = /^https?:\/\/(\[[0-9a-f:]+\]|[^:/?#\s]+)(:\d+)?$/i;

/**
 * The sign-in link for a given origin, or the fallback when that origin is
 * absent, malformed, or somewhere only this machine can reach.
 *
 * Separated from `signInLink` so the rule is testable without a browser.
 */
export function signInLinkFrom(origin: string | null | undefined): string {
  const raw = (origin ?? '').trim().replace(/\/+$/, '');
  const match = ORIGIN.exec(raw);
  if (!match) return APP_LINK_FALLBACK;
  if (LOOPBACK.test(match[1])) return APP_LINK_FALLBACK;
  return raw;
}

/**
 * The link to hand over, read at the moment it is copied or shared.
 *
 * `globalThis.location` rather than `Platform.OS === 'web'`: React Native
 * defines `window` but no `location`, and the static export prerenders in
 * Node where there is none either — both answer the fallback, which is the
 * correct answer for both.
 */
export function signInLink(): string {
  return signInLinkFrom(
    (globalThis as { location?: { origin?: string } }).location?.origin);
}

/** How the link reads in a toast: the host, without the scheme. */
export function linkDisplay(link: string): string {
  return link.replace(/^https?:\/\//i, '');
}
