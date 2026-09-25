/**
 * WHEN THE APP MAY ASK THE SERVER AGAIN, and when it must not.
 *
 * The problem this exists for: every read in this app is fetched once, on
 * mount, and refetched only when a write made IN THIS TAB announces itself
 * (`onAttendanceChanged` and the rest). Anything that changes the database
 * from anywhere else — another operator, another device, the SES feedback
 * webhook — is invisible to a tab that is already open, indefinitely. The
 * only thing that has ever rescued such a tab is `DeploymentRefresh` noticing
 * a new build and reloading the whole page, which is not a data mechanism.
 *
 * So: when the app becomes active again, ask again. The rules for doing that
 * safely are all here, pure, so they can be read and tested without a browser.
 * `src/pwa/DataRefresh.tsx` is the wiring — the same split `deployment.ts` has
 * from `DeploymentRefresh.tsx`, and for the same reason.
 *
 * THREE RULES, AND EACH ONE IS LOAD-BEARING
 *
 *   ONE PER BURST. Returning to a backgrounded tab fires `visibilitychange`
 *   and `focus`, and `online` can land in the same moment. Three events, one
 *   intention. Unbatched that is three full fan-outs, and `fetchAttendance`
 *   is a paged and chunked read that one busy week measured at 2,220 records
 *   (RC-039, RC-045).
 *
 *   NEVER DURING A WRITE. `isWriteInFlight()` already guards the deployment
 *   reload (T-021) and it outranks this too. An import is one transaction
 *   that writes a row per named member, then sweeps the rest of the register
 *   absent, then reconciles the override; a read landing between those steps
 *   sees a register that was never true. The write announces itself when it
 *   finishes, through the bus it already uses, so skipping here loses
 *   nothing.
 *
 *   NOT IF IT IS FRESH. A staleness floor, DERIVED rather than chosen — see
 *   STALE_AFTER_MS.
 *
 * WHAT THIS IS NOT. It is not polling, and it never reloads the page. It asks
 * the registered readers to fetch again; each of them is still the only
 * authority on its own data, and the answer still comes from the database.
 */
import { LOAD_TIMEOUT_MS } from './asyncState';

/**
 * How long a burst of lifecycle events is treated as one return to the app.
 *
 * It only has to span ONE tab activation. The browser dispatches
 * `visibilitychange` and `focus` in separate tasks of the same transition, so
 * a single animation frame is too tight; a quarter of a second is comfortably
 * wider than that pair and two orders of magnitude below `RETRY_MS` (15s), the
 * smallest interval the existing lifecycle owner works in. Nobody produces two
 * deliberate returns to the app inside it.
 */
export const COALESCE_MS = 250;

/**
 * How fresh is too fresh to ask again.
 *
 * DERIVED, not picked: `LOAD_TIMEOUT_MS` is this app's own statement of how
 * long a read may legitimately take before it is abandoned. Data younger than
 * one full load deadline cannot usefully be fetched again — a refresh started
 * now could take as long as the data is already old, so it would answer no
 * fresher a question than the one on screen. Tying it to that constant also
 * means the two move together if the deadline is ever revisited, rather than
 * drifting apart.
 */
export const STALE_AFTER_MS = LOAD_TIMEOUT_MS;

/** Injectable so a spec can drive the window without waiting on a real clock. */
export type Timers = {
  setTimer: (run: () => void, ms: number) => number;
  clearTimer: (id: number) => void;
};

const realTimers: Timers = {
  setTimer: (run, ms) => setTimeout(run, ms) as unknown as number,
  clearTimer: id => clearTimeout(id as unknown as ReturnType<typeof setTimeout>),
};

/**
 * Many requests in, one run out.
 *
 * TRAILING, not leading: the run happens at the END of the window, so the
 * last event of a burst is the one that decides. A leading edge would fire on
 * `visibilitychange` and then have to suppress the `focus` that follows,
 * which is the same thing said in a way that is easier to get wrong.
 */
export function createCoalescer(
  run: () => void, timers: Timers = realTimers, windowMs: number = COALESCE_MS,
) {
  let pending: number | null = null;
  return {
    request(): void {
      if (pending !== null) return;                    // already in a burst
      pending = timers.setTimer(() => { pending = null; run(); }, windowMs);
    },
    cancel(): void {
      if (pending === null) return;
      timers.clearTimer(pending);
      pending = null;
    },
  };
}

/**
 * ONE READER THAT CAN BE ASKED AGAIN.
 *
 * `fetchedAt` is a getter rather than a value because a registration outlives
 * any one fetch: the hook re-registers nothing when its data moves, it just
 * answers with the current timestamp when asked.
 */
export type Revalidator = {
  revalidate: () => void;
  /** when the data it is holding was fetched; null when it has never landed */
  fetchedAt: () => number | null;
  /**
   * IS A FETCH ALREADY OPEN?
   *
   * Asking again is not free: `revalidate` is the hook's `retry`, which
   * re-runs its effect, and the cleanup marks the previous run cancelled and
   * throws its answer away. So a burst that lands on a read already in
   * flight does not add a request — it RESTARTS one, from zero.
   *
   * That is worst exactly where it hurts most. The attendance read is paged
   * and chunked over a period that one busy week measured at 2,220 records;
   * eight seconds into it on a studio connection, switching away and back
   * would discard all eight and begin again. And `fetchedAt` cannot stand in
   * for this, because it is the last SUCCESSFUL fetch: a read that has never
   * succeeded reports null, which the staleness floor always lets through —
   * so the one read that most needs to be left alone is the one that would
   * be restarted on every single burst.
   */
  busy?: () => boolean;
};

/**
 * A `Set`, exactly like the change buses in `repository.ts`. Nothing is stored
 * here but the ability to ask — no data, no cache, no second copy of anything
 * (guardrail 1).
 */
const revalidators = new Set<Revalidator>();

export function registerRevalidator(r: Revalidator): () => void {
  revalidators.add(r);
  return () => { revalidators.delete(r); };
}

/** Specs and diagnostics only. */
export function revalidatorCount(): number {
  return revalidators.size;
}

/** Specs only: no test may inherit another's registrations. */
export function resetRevalidators(): void {
  revalidators.clear();
}

/**
 * Ask everything that is stale to fetch again. Returns how many were asked,
 * which is what a spec and a log can both check.
 *
 * `writeInFlight` is passed IN rather than imported, so this module stays free
 * of every other and the caller (`DataRefresh.tsx`) is the single place that
 * reads `isWriteInFlight()`.
 */
export function revalidateStale(opts: {
  now: number; writeInFlight: boolean; staleAfterMs?: number;
}): number {
  // OUTRANKS EVERYTHING, and it is checked before the loop rather than per
  // entry: a write in flight is a fact about the app, not about one reader.
  if (opts.writeInFlight) return 0;

  const floor = opts.staleAfterMs ?? STALE_AFTER_MS;
  let asked = 0;
  for (const r of [...revalidators]) {
    let at: number | null;
    try {
      at = r.fetchedAt();
    } catch {
      continue;                                         // a reader mid-unmount
    }
    // ALREADY ASKING. Checked before the floor, because the floor's "never
    // loaded is always worth asking" is precisely the case that would restart
    // a first load that is still running.
    try {
      if (r.busy?.()) continue;
    } catch {
      continue;
    }
    // Never loaded is always worth asking: there is nothing on screen to keep
    // fresh, and the screen may be showing an error a retry would clear.
    if (at !== null && opts.now - at < floor) continue;
    try {
      r.revalidate();
      asked += 1;
    } catch {
      /* One screen that cannot refetch must not stop the others. A refetch
         that throws synchronously is a bug in that screen, not a reason to
         leave the rest of the app stale. */
    }
  }
  return asked;
}
