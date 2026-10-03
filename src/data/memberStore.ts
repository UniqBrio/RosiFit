/**
 * ONE SHARED READ OF THE MEMBER DATA, HOWEVER MANY SCREENS ASK FOR IT
 * (requests/2026-10-03-one-shared-member-refresh.md).
 *
 * THE DEFECT. Every mounted screen reads the member list through its own hook
 * (useMembers, useFollowUp, useBucketMetrics, useWeekRows), and a member write
 * announces itself on a bus that every one of those hooks listens to. So one
 * Save made each mounted screen run the whole member read again: production
 * logged ~110 requests after one add (01-Oct 13:58) and 216 in three seconds
 * after an import commit (02-Oct 13:21), from a single browser, competing for
 * a database pool of about ten connections. T-406 later shared IDENTICAL
 * network requests for five seconds, which absorbs the simultaneous case --
 * but only while the readers start together, inside that window, with no
 * other write between them; two quick adds still sent 27 duplicate reads, and
 * every screen still ran the read itself in JavaScript.
 *
 * THE RULE HERE. A read is identified by a key (`members:<from>/<to>`,
 * `metrics:<from>/<to>`). While a read for a key is IN FLIGHT, every caller
 * asking for that key gets the same promise -- one execution, one answer, the
 * same object for everyone. Nothing is kept once it settles: the next ask
 * reads again, exactly as before, so a screen's own retry and the app's
 * freshness rules mean what they always meant.
 *
 * NEVER ACROSS A CHANGE. `invalidateMemberReads()` -- called by the member
 * and attendance buses and by every write the Supabase client sends -- moves
 * the generation on. A read started before the change still answers the
 * callers that asked for it, but nobody can JOIN it any more: anyone asking
 * after the change starts a new read, which is the one that sees the change.
 * That is what makes "the member I just added is in the list" deterministic:
 * the read that follows a successful create began after the create committed.
 *
 * NOT JOINED WHEN OLD. A read in flight for longer than `joinMs` is not joined
 * (the same bound T-406 puts on shared fetches): a screen that retries after
 * its own deadline sends a new read instead of waiting on one that hung.
 *
 * NOT RETRIED. A failure is handed to every caller that shared the read and
 * then forgotten. Nothing here asks again on its own; the next ask is a new
 * read.
 *
 * Pure -- no Supabase, no React -- so the whole rule is tested directly
 * (memberStore.test.ts) and the data layer only has to route its reads here.
 */

export type MemberReads = {
  /** The shared read for `key`: joined while in flight, started otherwise. */
  read<T>(key: string, load: () => Promise<T>): Promise<T>;
  /** A change happened: nobody may join a read that began before it. */
  invalidate(): void;
  /** How many reads were actually started for keys beginning `prefix`. */
  started(prefix?: string): number;
};

type Flight = { generation: number; startedAt: number; promise: Promise<unknown> };

export function createMemberReads(config: { joinMs: number; now?: () => number }): MemberReads {
  const now = config.now ?? (() => Date.now());
  const flights = new Map<string, Flight>();
  const counts = new Map<string, number>();
  let generation = 0;

  return {
    read<T>(key: string, load: () => Promise<T>): Promise<T> {
      const t = now();
      const hit = flights.get(key);
      const age = hit ? t - hit.startedAt : Infinity;
      if (hit && hit.generation === generation && age >= 0 && age <= config.joinMs) {
        return hit.promise as Promise<T>;
      }

      counts.set(key, (counts.get(key) ?? 0) + 1);
      const flight: Flight = { generation, startedAt: t, promise: Promise.resolve() };
      // Forgotten the moment it settles, success or failure -- and only if it
      // is still the flight on record, so a newer read is never dropped by an
      // older one finishing late.
      const forget = () => { if (flights.get(key) === flight) flights.delete(key); };
      flight.promise = Promise.resolve().then(load).then(
        value => { forget(); return value; },
        err => { forget(); throw err; },
      );
      flights.set(key, flight);
      return flight.promise as Promise<T>;
    },

    invalidate(): void {
      generation += 1;
      flights.clear();
    },

    started(prefix = ''): number {
      let n = 0;
      for (const [key, c] of counts) if (key.startsWith(prefix)) n += c;
      return n;
    },
  };
}

/**
 * The app's one instance. `joinMs` matches SHARED_READ_MS (src/lib/supabase.ts)
 * for the reason given above; it is a literal here so this module imports
 * nothing and can be read by both the data layer and the client's fetch.
 */
const shared = createMemberReads({ joinMs: 5_000 });

export const sharedMemberRead = <T>(key: string, load: () => Promise<T>): Promise<T> => shared.read(key, load);
export const invalidateMemberReads = (): void => shared.invalidate();
export const memberReadsStarted = (prefix?: string): number => shared.started(prefix);
