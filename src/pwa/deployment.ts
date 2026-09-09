/**
 * "On every deployment the app should refresh automatically"
 * (requests/2026-09-09-refresh-on-every-deployment.md).
 *
 * WHAT WAS WRONG. A tab left open — and the installed app is a tab that is
 * never closed — keeps running the JS bundle it loaded, for as long as it
 * lives. `public/sw.js` is network-first on navigations, so a *launch* has
 * always picked up the newest build; nothing ever told a session already
 * running that a newer one exists. A week of deployments could go by under
 * somebody who never closed the app.
 *
 * WHAT IDENTIFIES A BUILD. Nothing new. `expo export` writes one
 * content-hashed entry bundle and every exported page references it:
 *
 *   /_expo/static/js/web/entry-21187df9dabc508c580abb58fb5bf5ad.js
 *
 * That hash IS the build id — it changes when, and only when, the code
 * changes. So the check is: fetch the start URL, read the bundle names out of
 * it, and see whether it names one this document has not got. No build stamp to
 * generate, no version file to keep in step with the bundle it claims to
 * describe, and nothing that can drift from the thing it is versioning.
 *
 * Deliberately: a deployment that changes NO JavaScript (an icon, the
 * manifest, `sw.js` itself) leaves the hash alone and is not seen here. It
 * also does not need a reload — the worker refreshes those on its own.
 *
 * Every function here is pure so the rule can be read and tested without a
 * browser; `DeploymentRefresh.tsx` is the part that touches the DOM.
 */

/**
 * How often a visible tab asks. Five minutes: the probe is one small HTML
 * document, and a deployment nobody sees for five minutes is not the failure
 * this module exists to fix.
 */
export const POLL_MS = 5 * 60_000;

/**
 * How long the hands have to be off before a reload is allowed to happen.
 *
 * This is the whole safety argument. A reload throws away whatever is typed
 * and not yet saved, so it must never land under somebody's fingers — mid
 * register, mid form, mid send. Sixty seconds of no touch, no key and no
 * pointer is the definition of "not mid-anything" this module uses.
 */
export const IDLE_MS = 60_000;

/** How often to re-ask "is it safe yet?" once a new build is known about. */
export const RETRY_MS = 15_000;

/** The document that is fetched to see what the server is serving now. */
export const PROBE_URL = '/';

/**
 * Where the reload that has already been attempted is remembered, so a server
 * answering inconsistently (two CDN nodes mid-rollout, say) cannot put the
 * app in a reload loop. `sessionStorage`, not `localStorage`: it is a fact
 * about this tab, and it must not outlive it.
 */
export const ATTEMPT_KEY = 'rosifit:reloaded-for';

/** Every JS bundle the static export emits, content-hashed, absolute path. */
const BUNDLES = /\/_expo\/static\/js\/web\/[A-Za-z0-9._-]+\.js/g;

/**
 * The bundles these strings reference — script `src` attributes, or a whole
 * HTML document, it makes no difference.
 *
 * Sorted and de-duplicated so two orderings are one answer, and taken as PATHS
 * so an absolute `src` and a relative one cannot read as two different builds.
 *
 * `null` means "no bundle named here": an unrecognisable answer — a captive
 * portal, a CDN error page, an export that stops naming bundles this way.
 * Callers must treat it as no information, never as a change.
 */
export function bundlesFrom(sources: readonly string[]): string[] | null {
  const bundles = new Set<string>();
  for (const source of sources) {
    for (const bundle of source.match(BUNDLES) ?? []) bundles.add(bundle);
  }
  if (bundles.size === 0) return null;
  return [...bundles].sort();
}

/** The bundles a served page names. */
export function bundlesFromHtml(html: string): string[] | null {
  return bundlesFrom([html]);
}

/** One string for a set of bundles, so a reload attempt can be remembered. */
export function stamp(bundles: readonly string[] | null): string | null {
  return bundles === null ? null : bundles.join(' ');
}

/**
 * Is the server serving something this document did not load?
 *
 * NOT "are the two lists different" — CONTAINMENT, deliberately, and this is
 * the subtle one. A running document GAINS bundles: `memberXlsx` pulls in
 * ExcelJS by dynamic import the first time a report is downloaded, and that
 * appends a script tag the served HTML has never named. Compared as sets,
 * every session that had exported a spreadsheet would reload itself, and then
 * do it again, forever.
 *
 * So: a new deployment is the served page naming a bundle this document has
 * not got. An extra bundle here is a chunk we fetched; a missing one is a
 * build we do not have.
 */
export function isNewDeployment(
  running: readonly string[] | null,
  served: readonly string[] | null,
): boolean {
  if (running === null || served === null) return false;
  return served.some((bundle) => !running.includes(bundle));
}

/**
 * Reload for this served build?
 *
 * No, if it is one this document already has; no, if it is unreadable; and no,
 * if this tab has already reloaded for that same answer once and come back
 * still missing it — that is a server disagreeing with itself, and reloading
 * again would only spin.
 */
export function shouldReload(
  running: readonly string[] | null,
  served: readonly string[] | null,
  attempted: string | null,
): boolean {
  return isNewDeployment(running, served) && stamp(served) !== attempted;
}

/**
 * Is now a moment when throwing the page away costs nobody anything?
 *
 * Hidden counts: a backgrounded tab has no half-typed form on screen, and this
 * is exactly the "next launch" the worker's update policy already describes.
 * Otherwise it takes IDLE_MS of nothing at all.
 */
export function safeToReload(hidden: boolean, msSinceInteraction: number): boolean {
  return hidden || msSinceInteraction >= IDLE_MS;
}
