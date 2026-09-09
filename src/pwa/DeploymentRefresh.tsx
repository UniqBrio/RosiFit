import { useEffect } from 'react';

import {
  ATTEMPT_KEY,
  POLL_MS,
  PROBE_URL,
  RETRY_MS,
  bundlesFrom,
  bundlesFromHtml,
  safeToReload,
  shouldReload,
  stamp,
} from './deployment';

/**
 * The running session's half of "every deployment refreshes the app"
 * (requests/2026-09-09-refresh-on-every-deployment.md). The RULE is in
 * `deployment.ts`, tested there without a browser; this file is only the wiring
 * to the document.
 *
 * Mounted once, at the root, and it renders nothing. On native and during the
 * static export there is no `document` and it does nothing at all — the ask is
 * about the deployed web app, and there is no other kind of deployment here.
 *
 * IT NEVER RELOADS UNDER SOMEBODY'S FINGERS. That is not a nicety: this app is
 * used standing up in a studio, half way through marking a register, and a
 * reload throws away everything typed and not yet saved. So a new build is
 * noticed at once and CASHED IN only when the app is in the background or an
 * unbroken minute has passed with no touch, no key and no pointer (`IDLE_MS`).
 * Until then it waits, re-asking every `RETRY_MS`. This is the same promise
 * `public/sw.js` has always made, kept for a session that is already running
 * rather than only for the next launch.
 */
export function DeploymentRefresh(): null {
  useEffect(() => {
    if (typeof document === 'undefined' || typeof fetch !== 'function') return;

    /*
     * What THIS document loaded. Read once, from the script tags the export
     * wrote — the running bundle cannot be asked what it is called, but the
     * page that pulled it in still says so.
     */
    const running = bundlesFrom(
      Array.from(document.querySelectorAll('script[src]'), (tag) => (tag as HTMLScriptElement).src),
    );
    /* No bundle named in this page: nothing to compare, so never reload.
       Read ONCE, here, and never again: a running document GAINS bundles as
       dynamic imports land (ExcelJS, on the first report download). What this
       page started with is the question. */
    if (running === null) return;

    let stopped = false;
    let lastTouch = Date.now();
    let waiting: ReturnType<typeof setTimeout> | null = null;
    let polling: ReturnType<typeof setInterval> | null = null;

    /* Storage throws outright in some privacy modes — never worth a failure. */
    const attempted = (): string | null => {
      try {
        return sessionStorage.getItem(ATTEMPT_KEY);
      } catch {
        return null;
      }
    };
    const remember = (id: string): void => {
      try {
        sessionStorage.setItem(ATTEMPT_KEY, id);
      } catch {
        /* then the loop guard is simply absent; the comparison still holds */
      }
    };

    /* We are the build the last reload was for: the note has done its job. */
    if (attempted() === stamp(running)) {
      try {
        sessionStorage.removeItem(ATTEMPT_KEY);
      } catch {
        /* nothing to clear if there is no storage to clear it from */
      }
    }

    const reloadWhenIdle = (served: readonly string[]): void => {
      if (stopped) return;
      if (!safeToReload(document.visibilityState === 'hidden', Date.now() - lastTouch)) {
        waiting = setTimeout(() => reloadWhenIdle(served), RETRY_MS);
        return;
      }
      remember(stamp(served) as string);
      window.location.reload();
    };

    const check = async (): Promise<void> => {
      if (stopped || waiting !== null) return;

      let served: string[] | null = null;
      try {
        const response = await fetch(PROBE_URL, { cache: 'no-store', credentials: 'same-origin' });
        if (!response.ok) return;
        served = bundlesFromHtml(await response.text());
      } catch {
        /* offline, or the server is unreachable. Not an error to report and
           not a reason to do anything: the app carries on as it is. */
        return;
      }

      if (stopped || !shouldReload(running, served, attempted())) return;

      /* Same breath: let the worker pick up a changed sw.js. It still waits its
         turn — the reload below is what puts the new build on screen, and no
         bundle is ever swapped under a live document. */
      try {
        const registration = await navigator.serviceWorker?.getRegistration();
        await registration?.update();
      } catch {
        /* a worker that will not update does not stop the reload */
      }

      reloadWhenIdle(served as string[]);
    };

    const touched = (): void => {
      lastTouch = Date.now();
    };
    const woke = (): void => {
      void check();
    };
    /*
     * Both directions matter, and HIDDEN is the valuable one: the app going
     * into the background is the best moment there is to take a new build —
     * `safeToReload` allows it outright, and she comes back to the new version
     * having never seen a page reload. Coming back counts as a touch, so
     * returning to the app is never answered by yanking it away and redrawing.
     */
    const shown = (): void => {
      if (document.visibilityState === 'visible') lastTouch = Date.now();
      void check();
    };

    const TOUCHES = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    for (const event of TOUCHES) {
      window.addEventListener(event, touched, { capture: true, passive: true });
    }
    document.addEventListener('visibilitychange', shown);
    window.addEventListener('focus', woke);
    window.addEventListener('online', woke);
    polling = setInterval(woke, POLL_MS);

    return () => {
      stopped = true;
      if (waiting !== null) clearTimeout(waiting);
      if (polling !== null) clearInterval(polling);
      for (const event of TOUCHES) {
        window.removeEventListener(event, touched, { capture: true });
      }
      document.removeEventListener('visibilitychange', shown);
      window.removeEventListener('focus', woke);
      window.removeEventListener('online', woke);
    };
  }, []);

  return null;
}
