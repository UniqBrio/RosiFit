/**
 * One read shared by every caller that asks for the same key at about the
 * same time (T-405).
 *
 * On a cold start nine components ask for the signed-in identity through
 * currentAppUser(). Every one sent the SAME GET, and Chromium's HTTP cache
 * lets only one request per identical URL be in flight -- so nine reads meant
 * to run side by side ran one after another, a chain of nine round trips.
 * Sharing the read makes it one. (restoreSession's read is a different URL,
 * is the security check at sign-in, and deliberately stays its own request.)
 *
 * What is shared, and for how long:
 *   - a read in flight is shared by everyone who asks while it runs;
 *   - a successful answer is reused for `reuseMs`, which covers the start-up
 *     burst (the second batch of callers arrives ~300 ms after the first);
 *   - after that window a caller reads fresh, exactly as before;
 *   - a failure or an empty answer (null) is never kept, so the next caller
 *     tries again rather than inheriting a transient miss;
 *   - the key is the signed-in account, so a different account can never be
 *     handed the previous one's answer.
 */
export type SharedRead<T> = (key: string, fetcher: () => Promise<T>) => Promise<T>;

type Entry<T> = { key: string; promise: Promise<T>; settledAt: number | null };

export function createSharedRead<T>(config: { reuseMs: number; now?: () => number }): SharedRead<T> {
  const now = config.now ?? (() => Date.now());
  let current: Entry<T> | null = null;

  const reusable = (e: Entry<T>, key: string): boolean => {
    if (e.key !== key) return false;
    if (e.settledAt === null) return true;            // still in flight
    const age = now() - e.settledAt;
    return age >= 0 && age <= config.reuseMs;         // a clock that ran backwards does not pin it
  };

  return (key, fetcher) => {
    if (current && reusable(current, key)) return current.promise;

    let entry: Entry<T> | null = null;
    const promise = fetcher().then(
      value => {
        if (value === null || value === undefined) { if (current === entry) current = null; }
        else if (entry) entry.settledAt = now();
        return value;
      },
      err => { if (current === entry) current = null; throw err; },
    );
    entry = { key, promise, settledAt: null };
    current = entry;
    return promise;
  };
}
