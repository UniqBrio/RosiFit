/**
 * Is the app in the middle of a write it cannot afford to lose? (T-021)
 *
 * `DeploymentRefresh` reloads the tab when a newer build is served, and it is
 * right to: an installed PWA is a tab that is never closed, so without it a
 * week of deployments can pass under somebody who never quits the app. Its
 * safety rule is `safeToReload` — sixty seconds with no touch, OR the tab
 * being hidden.
 *
 * Both are true in the middle of a send. The operator taps Send on 456
 * recipients and stops touching the screen, because there is nothing left to
 * touch, and a serial send is minutes of wall clock (RV-07). A minute in, the
 * idle rule declares the hands off. Backgrounding is faster still: `hidden`
 * permits the reload immediately, with no waiting at all, so switching tabs
 * while a send runs is the surest way to lose it (RV-30, C:RF-20).
 *
 * WHAT IS ACTUALLY LOST. Not the render — the ANSWER. The request may well
 * reach the server and complete; what goes is the client's only copy of what
 * it did. The batch id is gone, the result screen never opens, and the
 * operator is left to decide whether to send again with nothing to go on
 * (RV-12, T-054). T-017's idempotency key is what makes that second attempt
 * safe; this is what stops the app causing it.
 *
 * A COUNTER, NOT A BOOLEAN. Two writes overlap in ordinary use — a bulk
 * import started while a send is still running — and with a boolean the first
 * of the two to finish would declare the app idle while the other is still
 * open. Depth is released in a `finally`, so a failed write cannot leave the
 * app unable to take a new build for the rest of the tab's life.
 *
 * This module imports nothing, so both the data layer that sets it and the
 * PWA layer that reads it can depend on it without either depending on the
 * other.
 */

let depth = 0;

/** True while at least one guarded write is open. */
export function isWriteInFlight(): boolean {
  return depth > 0;
}

/**
 * Run a write with the flag held.
 *
 * Deliberately invisible to the caller: it returns exactly what the write
 * returns and rethrows exactly what it throws, because a guard that changes a
 * call site's shape is a guard that call sites find reasons to skip.
 */
export async function duringWrite<T>(run: () => Promise<T>): Promise<T> {
  depth += 1;
  try {
    return await run();
  } finally {
    depth -= 1;
  }
}

/** Specs only: no test may inherit another's open writes. */
export function resetInFlight(): void {
  depth = 0;
}
