/**
 * THE TWO SANCTIONED WAYS TO READ A LIST, and a guard for anything that is
 * neither.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THIS MODULE EXISTS AT ALL (RC-039)
 *
 * PostgREST wraps every request in `LIMIT <db-max-rows>`. On this project
 * that is 1,000, and a request that hits the ceiling is **not an error**: it
 * answers `200` with a thousand rows and `error: null`. Nothing in the client
 * can tell that reply apart from a table that genuinely holds a thousand
 * rows. A week of attendance passed the cap, the course screen received part
 * of it, and four uploaded days read "Awaiting upload".
 *
 * ─────────────────────────────────────────────────────────────────────────
 * WHY THE FIRST FIX FOR THAT WAS NOT ENOUGH
 *
 * The first fix paged by OFFSET: `.range(0,999)`, `.range(1000,1999)`, and so
 * on, stopping when a page came back shorter than it asked for. Review found
 * two defects in it, and both are here as specs.
 *
 * 1. SHORT-PAGE TERMINATION. "Fewer rows than I asked for" only means "that
 *    was the end" if the server's ceiling is never below the page size. But
 *    `db-max-rows` is a project SETTING. Lower it to 500 and every read in
 *    the app returns its first page and reports success -- the original bug,
 *    reintroduced by the thing that fixed it. So a short page now means
 *    nothing at all, and only an EMPTY page ends a read.
 *
 * 2. OFFSET PAGING IS NOT STABLE UNDER WRITES. `OFFSET 1000` is a position,
 *    not a place. An insert earlier in the ordering shifts every later page
 *    down, so a row is skipped; a delete shifts them up, so a row is read
 *    twice. Attendance is bulk-imported while people have the screen open,
 *    so this is an ordinary Tuesday, not a race nobody will hit. A keyset
 *    cursor is anchored to a VALUE -- `where key > :lastSeen` -- and no
 *    write before the cursor can move what comes after it.
 *
 * ─────────────────────────────────────────────────────────────────────────
 * THE RULES THIS MODULE KEEPS
 *
 *   · Order by a unique, indexed key. Normally the primary key.
 *   · The first request carries NO key filter. There is no sentinel: a zero
 *     UUID is both a type assumption and a value that can collide.
 *   · Terminate only on an empty page.
 *   · Any page error THROWS. Half a table returned with `error: null` is the
 *     defect this module exists to end, so a partial result never escapes.
 *   · The caller hands over a FACTORY, not a query. Each page needs a fresh
 *     builder, and the caller's own filters have to survive every page.
 */

/** What PostgREST will send in one reply. One constant, one place. */
export const SUPABASE_MAX_ROWS = 1000;

/**
 * What a page asks for. Equal to the cap, so a healthy server fills a page
 * exactly. Asking for MORE than the cap is harmless (the server clamps);
 * asking for less is simply a smaller page. Neither can truncate, because
 * nothing here reads a short page as an ending.
 */
export const PAGE_SIZE = SUPABASE_MAX_ROWS;

/** A runaway stop. Not a budget: the guard for a key that is not unique. */
export const PAGE_CAP = 200_000;

/** A read that could not be completed. Never carries partial rows. */
export class PagedReadError extends Error {
  constructor(message: string) { super(message); this.name = 'PagedReadError'; }
}

/**
 * A list read that came back at exactly the server's ceiling, so there is no
 * way to know whether it is whole. Raised by `guardUntruncated`.
 */
export class TruncatedReadError extends Error {
  constructor(message: string) { super(message); this.name = 'TruncatedReadError'; }
}

export type PageResult<T> = { data: T[] | null; error: { message?: string } | null };

/**
 * The slice of a PostgREST builder this module uses. Structural on purpose:
 * supabase-js's builder satisfies it, and so does a fake in a spec, with no
 * import of the client into a file that has to run under plain node.
 */
export interface KeysetQuery<T> {
  gt(column: string, value: unknown): KeysetQuery<T>;
  order(column: string, options?: { ascending?: boolean }): KeysetQuery<T>;
  limit(count: number): KeysetQuery<T>;
  then<R>(onfulfilled: (value: PageResult<T>) => R): PromiseLike<R>;
}

/** A fresh builder carrying the caller's own filters, and nothing else. */
export type QueryFactory<T> = () => KeysetQuery<T>;

/**
 * EVERY row a query matches, read by keyset cursor.
 *
 * `key` must name a column that is UNIQUE, INDEXED, and **present in the
 * caller's `select`** -- the cursor is read out of the last row returned, so
 * a key that was not selected is not there to read. That was live in the code
 * this replaces: `member_emails` is keyed on `id` and selected
 * `member_id, email, ...`. It is a loud failure now rather than a silent one.
 *
 * Throws `PagedReadError` on any page error, on a missing key, and on a read
 * that will not terminate. Never returns a partial list.
 */
export async function pageAllByKey<T extends Record<string, unknown>>(
  build: QueryFactory<T>,
  opts: { key: string; pageSize?: number; cap?: number },
): Promise<T[]> {
  const key = opts.key;
  const size = opts.pageSize ?? PAGE_SIZE;
  const cap = opts.cap ?? PAGE_CAP;
  const rows: T[] = [];
  let after: unknown;

  for (;;) {
    // A FRESH builder every page. Reusing one accumulates `.gt()` filters and
    // the second page asks for `key > a AND key > b`.
    let q = build().order(key, { ascending: true }).limit(size);
    if (after !== undefined) q = q.gt(key, after);

    const res: PageResult<T> = await q.then(r => r);
    if (res.error) {
      throw new PagedReadError(res.error.message ?? 'the page could not be read');
    }
    const got = res.data ?? [];

    // THE ONLY TERMINATION. A short page says nothing: the server's own cap
    // may be below the page size, and reading that as an ending is defect 1.
    if (got.length === 0) return rows;

    rows.push(...got);

    const last = got[got.length - 1]?.[key];
    if (last === undefined || last === null) {
      throw new PagedReadError(
        `paging by "${key}" but the rows do not carry it — add "${key}" to the select`);
    }
    after = last;

    if (rows.length > cap) {
      throw new PagedReadError(
        `read past ${cap} rows without reaching the end — "${key}" is probably not unique, `
        + 'so the cursor never advances past its duplicates');
    }
  }
}

/**
 * A DELIBERATELY BOUNDED read, for a list somebody scrolls rather than a set
 * the app needs in full.
 *
 * `limit` must be strictly below the server's ceiling, because the whole
 * point is that the bound is the CALLER's and is known. A limit at or above
 * the cap cannot be distinguished from truncation, which is the thing being
 * avoided.
 *
 * It asks for one row more than it will return, and reports the extra as
 * `hasMore` -- so a screen can say "showing the first 50" honestly, and offer
 * the rest, instead of quietly presenting a slice as the whole.
 */
export async function readBounded<T>(
  build: QueryFactory<T>,
  limit: number,
): Promise<{ rows: T[]; hasMore: boolean }> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new PagedReadError(`a bounded read needs a positive limit, got ${limit}`);
  }
  if (limit >= SUPABASE_MAX_ROWS) {
    throw new PagedReadError(
      `a bounded read must ask for fewer than ${SUPABASE_MAX_ROWS} rows (asked for ${limit}) — `
      + 'at or above the cap a full answer and a truncated one look identical. '
      + 'Use pageAllByKey if the whole set is genuinely needed.');
  }
  const res: PageResult<T> = await build().limit(limit + 1).then(r => r);
  if (res.error) throw new PagedReadError(res.error.message ?? 'the list could not be read');
  const got = res.data ?? [];
  return { rows: got.slice(0, limit), hasMore: got.length > limit };
}

/**
 * THE BACKSTOP, for a list read that went to the network through neither
 * shape above.
 *
 * Exactly `SUPABASE_MAX_ROWS` rows is the signature of a truncated reply. It
 * can also be a table that happens to hold exactly that many, which is why
 * this THROWS rather than guesses: a caller that really wants a thousand rows
 * should be asking through `readBounded`, and one that wants them all should
 * be paging.
 *
 * It deliberately does NOT look at `Content-Range`. A response with no count
 * requested ends in `/*` every single time, truncated or not, so treating
 * that as the signal would flag every healthy read in the app.
 *
 * `report` is the app's error path. There is no telemetry sink in this
 * project, so the default writes a tagged line to the console -- the same
 * place `fail()` puts its technical detail.
 */
export function guardUntruncated<T>(
  rows: T[],
  where: string,
  report: (message: string) => void = message => console.error(`[truncated-read] ${message}`),
): T[] {
  if (rows.length === SUPABASE_MAX_ROWS) {
    const message =
      `${where} returned exactly ${SUPABASE_MAX_ROWS} rows, which is the server's ceiling — `
      + 'there is no way to tell a complete answer from a cut-off one. '
      + 'Read it through pageAllByKey or readBounded.';
    report(message);
    throw new TruncatedReadError(message);
  }
  return rows;
}
