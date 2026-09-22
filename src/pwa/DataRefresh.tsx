import { useEffect } from 'react';
import { isWriteInFlight } from '../data/inFlight';
import { createCoalescer, revalidateStale } from '../data/revalidate';

/**
 * WHEN THE APP COMES BACK, ASK THE DATABASE AGAIN.
 *
 * WHAT WAS WRONG. Every read in this app is fetched on mount and refetched
 * only when a write made IN THIS TAB announces itself on one of
 * repository.ts's buses. A change made anywhere else — another operator,
 * another device, the SES feedback webhook — is invisible to a tab that is
 * already open, for as long as it stays open. And the installed PWA is a tab
 * that is never closed. The only thing that has ever rescued such a tab is
 * `DeploymentRefresh` noticing a new build and reloading the whole page,
 * which is a deployment mechanism being used as a data one by accident.
 *
 * WHY IT IS A SEPARATE FILE FROM DeploymentRefresh. They watch the same four
 * events and they answer them completely differently. `DeploymentRefresh`
 * throws the document away, so its whole safety argument is about never doing
 * that under somebody's fingers — sixty seconds of stillness, or the tab
 * being hidden. This one throws nothing away: it asks readers to fetch again
 * while their existing answers stay on screen (`asyncState.ts`), so the idle
 * rule does not apply to it and inheriting that rule would make it useless —
 * a refresh that only happens after a minute of not touching the app is a
 * refresh that never happens to somebody using it. Folding data into
 * `DeploymentRefresh` would mean one module with two safety rules, and the
 * reload's rule is the one that must never be weakened.
 *
 * THE THREE RULES ARE IN src/data/revalidate.ts, pure and tested without a
 * browser. This file is only the wiring, the same split `deployment.ts` has
 * from `DeploymentRefresh.tsx`. Briefly:
 *
 *   ONE PER BURST. Returning to a tab fires `visibilitychange` AND `focus`,
 *   and `online` can land with them. Three events, one intention.
 *
 *   NEVER DURING A WRITE. `isWriteInFlight()` (T-021) outranks the lot. An
 *   import is one transaction that writes a row per named member, sweeps the
 *   rest of the register absent, then reconciles the override; a read landing
 *   between those steps shows a register that was never true. Skipping costs
 *   nothing — the import announces itself through `attendanceImported()` the
 *   moment it commits, which refetches exactly what it moved.
 *
 *   NOT IF IT IS FRESH. Data younger than one load deadline is left alone.
 *
 * IT NEVER RELOADS THE PAGE. `window.location.reload()` appears nowhere here
 * and must not: a reload throws away everything typed and not yet saved, and
 * the whole point of this module is that the register somebody is reading
 * stays on screen while it is brought up to date.
 *
 * SCOPE, HONESTLY. What revalidates is every mounted reader whose data is
 * past the staleness floor. Screens never opened have never registered, and
 * a screen left behind unregisters on unmount — but `app/(tabs)/_layout.tsx`
 * is a `Tabs` navigator, which keeps a tab mounted once visited, so "mounted"
 * is wider than "on screen". The staleness floor is what bounds the traffic;
 * narrowing it further to the focused ROUTE would mean giving this file a
 * navigation dependency, and is recorded as a follow-up rather than guessed
 * at here.
 */
export function DataRefresh(): null {
  useEffect(() => {
    if (typeof document === 'undefined') return;

    const refresh = () => {
      revalidateStale({ now: Date.now(), writeInFlight: isWriteInFlight() });
    };
    const burst = createCoalescer(refresh);

    /* VISIBLE ONLY. `visibilitychange` fires in both directions and the app
       going away is not a reason to fetch: the answer would land in a tab
       nobody is looking at, and the return that follows would ask again. */
    const shown = (): void => {
      if (document.visibilityState === 'visible') burst.request();
    };
    const woke = (): void => burst.request();

    document.addEventListener('visibilitychange', shown);
    window.addEventListener('focus', woke);
    /* Coming back onto the network is the same event as coming back to the
       app, for this purpose: whatever failed while offline is worth asking
       again, and a read that failed has no `fetchedAt`, so the floor does
       not hold it back. */
    window.addEventListener('online', woke);

    return () => {
      /* Cancel first: a burst that fires after unmount would ask readers
         that have themselves gone. */
      burst.cancel();
      document.removeEventListener('visibilitychange', shown);
      window.removeEventListener('focus', woke);
      window.removeEventListener('online', woke);
    };
  }, []);

  return null;
}
