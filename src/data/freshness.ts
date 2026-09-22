/**
 * HOW OLD IS WHAT I AM LOOKING AT?
 *
 * The honest counterpart to a background refresh. Once data can be brought up
 * to date without the screen moving, "is this current?" stops being answerable
 * by the fact that the page just loaded — so the screen has to say.
 *
 * ONE SCREEN FIRST. Attendance, because it is the one an upload changes and
 * the one somebody stands in front of with a question about today. A
 * timestamp on every screen would be noise; this is not a new design system
 * and must not become one.
 *
 * WHY THE WORDS ARE HERE AND NOT IN THE SCREEN: `app/(tabs)/attendance.tsx`
 * renders in React Native and the specs run under plain node. Same reason as
 * `uploadOutcome.ts`.
 *
 * `now` and the clock are passed IN. "Just now" is a question about the
 * device's own clock, and a function that reads `Date.now()` for itself
 * cannot be tested without one.
 */
import { LOAD_TIMEOUT_MS } from './asyncState';

/**
 * How recent counts as "just now".
 *
 * IMPORTED, not copied. The staleness floor in `revalidate.ts` is the same
 * idea from the other side — data younger than one load deadline is not
 * worth fetching again — so this is deliberately the same boundary, said to
 * a person. It was written out as `12_000` first, which is exactly the drift
 * `revalidate.ts` argues against two files away: the day the deadline is
 * revisited, a literal here would quietly stop agreeing with it.
 */
export const JUST_NOW_MS = LOAD_TIMEOUT_MS;

/** 13:54 -> '1:54 PM'. Matches `formatTime` in src/components/DateTimePicker.tsx,
 *  which is where this app's clock format is defined; reproduced rather than
 *  imported because that one takes an 'hh:mm' string and this has a Date. */
function clock(date: Date): string {
  const h = date.getHours();
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(date.getMinutes()).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/**
 * The freshness line, or null when there is nothing honest to say.
 *
 * Null before the first answer lands: a screen that has never loaded is not
 * "updated" at any time, and drawing a timestamp over a skeleton would be a
 * claim about data that is not there.
 *
 * The "a refresh is in flight" case is NOT here: `freshnessOf` below owns it,
 * and a second place answering the same question is a second answer waiting
 * to disagree. This one says how old the data is, and nothing else.
 */
export function freshnessLabel(fetchedAt: number | null, now: number): string | null {
  if (fetchedAt === null) return null;
  // A clock that has gone backwards (a device correcting itself, a DST jump)
  // must not produce "updated in the future". Treat it as now.
  if (now - fetchedAt < JUST_NOW_MS) return 'Updated just now';
  return `Updated at ${clock(new Date(fetchedAt))}`;
}

/**
 * The line for data that is on screen after a refresh FAILED.
 *
 * It is still the last good answer and it is still worth showing — losing the
 * register because a background refresh could not reach the server would be
 * the worse trade (asyncState.ts). But it must not be presented as current.
 *
 * ALWAYS A CLOCK TIME, never "just now". The whole job of this line is to say
 * WHEN the data on screen was true, so that somebody deciding whether to act
 * on it can judge for themselves; "Last updated just now · Couldn't refresh"
 * answers the question with the one thing it was not asked.
 */
export function staleLabel(fetchedAt: number | null): string {
  /* No `now`. The stale line is a FIXED clock time by design — it says when
     the data was true — so it does not move as time passes, and a caller
     ticking a clock for it would be re-rendering for a byte-identical
     string. The parameter was there and unused, with a `void` to quiet it;
     the fresh-context review was right that the honest thing is not to ask
     for it. */
  return fetchedAt === null
    ? 'Couldn’t reach the server.'
    : `Last updated ${clock(new Date(fetchedAt))} · Couldn’t refresh`;
}

/**
 * WHICH OF THE FOUR STATES A READ IS IN, and what to say about it.
 *
 * The four are not variations on one another — they are different claims, and
 * the screen has to be able to tell them apart without re-deriving the rule:
 *
 *   none      nothing has ever loaded. Say nothing; a timestamp over a
 *             skeleton is a claim about data that is not there.
 *   updating  a refresh is open over data that is on screen.
 *   stale     a refresh FAILED over data that is on screen. The data stays —
 *             losing the register because a background refresh could not
 *             reach the server is the worse trade — but it must carry its
 *             age, or it is indistinguishable from current data.
 *   fresh     the data is the last thing the server said, and nothing is
 *             wrong.
 *
 * `error` WITH `state === 'ready'` is the combination asyncState.ts
 * introduced and the one every screen but Attendance was ignoring: a first
 * load that failed is `state === 'error'` and has its own error screen, while
 * a REFRESH that failed leaves the data in place and says so here.
 */
export type FreshnessKind = 'none' | 'fresh' | 'updating' | 'stale';

export type Freshness = { kind: FreshnessKind; label: string | null };

export function freshnessOf(read: {
  state: 'loading' | 'ready' | 'error';
  error: string | null;
  isRevalidating: boolean;
  fetchedAt: number | null;
}, now: number): Freshness {
  // Never answered, or answering for the first time. The error state has its
  // own screen and this line has nothing to add to it.
  if (read.state !== 'ready' || read.fetchedAt === null) return { kind: 'none', label: null };
  if (read.error !== null) return { kind: 'stale', label: staleLabel(read.fetchedAt) };
  if (read.isRevalidating) return { kind: 'updating', label: 'Updating…' };
  return { kind: 'fresh', label: freshnessLabel(read.fetchedAt, now) };
}
