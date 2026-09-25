/**
 * THE STATE MACHINE BEHIND `useAsync`, pure and on its own.
 *
 * WHY IT IS NOT INSIDE hooks.ts. `hooks.ts` imports React and `repository.ts`,
 * and `repository.ts` pulls in the Supabase client — so nothing in it can be
 * run by the spec runner, and `scripts/tsconfig.json` (where *.test.ts is
 * typechecked) has no DOM in its lib. Same split as `csvFormat.ts` from
 * `csv.ts`: the half worth testing is the half with the rule in it.
 *
 * WHAT THE RULE IS, AND WHY IT CHANGED
 *
 * `useAsync` used to call `setState('loading')` on every run, whatever caused
 * it. That is right for a FIRST load and right for a dependency change — a
 * different week really is a different question, and showing last week's rows
 * under this week's heading is the disagreement guardrail 1 exists to forbid.
 *
 * It is wrong for a REVALIDATION. A revalidation asks the same question again,
 * and the answer already on screen is the best one available until the new one
 * lands. Every screen guards on `state === 'loading'` to draw a skeleton
 * (`app/(tabs)/attendance.tsx:221` is the clearest), so a refetch triggered by
 * the app regaining focus would blank the register somebody is standing in
 * front of reading. That is a worse defect than the staleness it set out to
 * fix.
 *
 * So there are two starts, and they are different events:
 *
 *   FIRST LOAD / DEPENDENCY CHANGE   state -> loading      (unchanged)
 *   REVALIDATION                     state stays ready,
 *                                    data stays visible,
 *                                    isRevalidating -> true
 *
 * A FAILED REVALIDATION KEEPS THE DATA. Losing the register because a
 * background refresh could not reach the server is a worse answer than the
 * slightly old register. The error is still reported, next to the data it
 * failed to replace, so a screen that wants to say so can.
 *
 * SEQUENCE NUMBERS, NOT JUST THE CANCELLED FLAG. The effect's `cancelled`
 * closure covers unmount and re-run. It does not cover two runs OVERLAPPING,
 * where the second answers first and the first's late reply then puts the
 * older list back. Every start takes a number and only that number's replies
 * are accepted, which makes the guard a property of the machine rather than of
 * the closure that happens to be wrapped around it.
 */
import type { ScreenState } from './useScreenState';

/**
 * A request that never answers is worse than one that fails: the screen sits
 * on a skeleton forever with nothing to retry. Moved here from `hooks.ts` so
 * the staleness floor in `revalidate.ts` can be DERIVED from it rather than
 * invented — data younger than one full load deadline cannot usefully be
 * fetched again, because the fetch could take as long as the data is old.
 * The value itself is unchanged.
 */
export const LOAD_TIMEOUT_MS = 12_000;

export type AsyncSnapshot<T> = {
  state: ScreenState;
  data: T | null;
  /** what went wrong, in a sentence a person can act on */
  error: string | null;
  /**
   * A fetch is open over data that is ALREADY ON SCREEN. Never true for a
   * first load or a dependency change — those are `state === 'loading'`,
   * which is a different thing and draws differently.
   */
  isRevalidating: boolean;
  /** when the data on screen was fetched, ms since epoch. Null until one lands. */
  fetchedAt: number | null;
  /** the run whose replies are currently accepted */
  seq: number;
};

export type AsyncEvent<T> =
  /** `fresh` = a genuinely new dataset (first load, or the deps moved) */
  | { kind: 'start'; fresh: boolean; seq: number }
  | { kind: 'resolved'; data: T; at: number; seq: number }
  | { kind: 'failed'; message: string; seq: number }
  /** `?state=error`, which is pinned for review and answers to no sequence */
  | { kind: 'forcedError'; message: string };

export function initialAsync<T>(): AsyncSnapshot<T> {
  // ALWAYS 'loading' at rest, on the server prerender and the client alike.
  // Reading anything else during the first render made the static export
  // disagree with the hydrated markup and React threw the screen away
  // (React hydration error 418). Unchanged.
  return { state: 'loading', data: null, error: null, isRevalidating: false, fetchedAt: null, seq: 0 };
}

export function asyncReducer<T>(s: AsyncSnapshot<T>, e: AsyncEvent<T>): AsyncSnapshot<T> {
  if (e.kind === 'forcedError') {
    return { ...s, state: 'error', error: e.message, isRevalidating: false };
  }

  if (e.kind === 'start') {
    // A revalidation over an answer that is actually on screen. `state ===
    // 'ready'` and not `data !== null` on purpose: a screen showing the error
    // state has nothing for stale-while-revalidate to preserve, so the honest
    // thing is the first-load behaviour it already had.
    const keepingScreen = !e.fresh && s.state === 'ready';
    return keepingScreen
      /* THE ERROR SURVIVES THE RETRY, and this is load-bearing.
         Clearing it here made `ready + error` — the only way the app can say
         "this data is older than it looks" — vanish the instant a retry
         began, and a retry runs to LOAD_TIMEOUT_MS before it fails. So while
         offline the warning blinked off for twelve seconds at a time, and
         the vanishing read as "it worked". That is the very defect this
         indicator was built to fix, reappearing on the one path it was built
         for. The data on screen is still the data that could not be
         refreshed until something replaces it, so the error stays until
         `resolved` clears it or a new `failed` replaces it. */
      ? { ...s, seq: e.seq, isRevalidating: true }
      // Data is deliberately NOT cleared here, exactly as before: the screen
      // guards on `state`, and clearing it would change what a retry shows.
      : { ...s, seq: e.seq, state: 'loading', error: null, isRevalidating: false };
  }

  // A reply from a run that has been superseded. Not an error and not worth
  // reporting — the newer run is the one being waited on.
  if (e.seq !== s.seq) return s;

  if (e.kind === 'resolved') {
    return { state: 'ready', data: e.data, error: null, isRevalidating: false, fetchedAt: e.at, seq: s.seq };
  }

  // FAILED. With an answer already on screen this keeps it: `fetchedAt` does
  // not move either, because the data is exactly as old as it was.
  return s.data !== null && s.state === 'ready'
    ? { ...s, error: e.message, isRevalidating: false }
    : { ...s, state: 'error', error: e.message, isRevalidating: false };
}
