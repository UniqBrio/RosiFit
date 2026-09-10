/**
 * READING A WHOLE TABLE THROUGH AN API THAT WILL ONLY EVER SEND 1000 ROWS.
 *
 * PostgREST puts `LIMIT <max-rows> OFFSET 0` around every request it serves.
 * On this project `max-rows` is 1000, and a request that hits the ceiling is
 * not an error: it answers `200` with `Content-Range: 0-999/*` and a body of
 * exactly a thousand rows. supabase-js reports `error: null`. Nothing in the
 * client can tell that reply apart from a table that genuinely holds 1000
 * rows, so an unpaged read does not fail -- it QUIETLY RETURNS LESS THAN IT
 * WAS ASKED FOR, and every count, chip and status derived from it is wrong by
 * however much was dropped.
 *
 * That is RC-039. `fetchAttendance` loaded a week of `attendance_records` in
 * one request; the academy passed 1000 records in a week (2,220 in the week of
 * 7 Sep 2026) and the reply started arriving truncated. Which 1,220 rows were
 * lost is not even stable: the query carries no ORDER BY, so Postgres returns
 * whatever the scan reaches first. A whole course's week fell outside the cut,
 * its day strip read "Awaiting upload" for four days that had been uploaded,
 * and every member on it read "Yet to mark" -- while the Overview, which
 * aggregates inside `member_period_metrics` and so never ships rows at all,
 * went on printing the true 24%. Two answers to one question, and the WRONG
 * one was the one with the upload button under it.
 *
 * WHY A HELPER AND NOT `.limit(5000)` AT THE CALL SITE
 * A bigger number is the same defect with a later birthday, and it cannot be
 * raised past `max-rows` anyway -- PostgREST takes the smaller of the two. The
 * only honest read of an unbounded set is to keep asking until a page comes
 * back SHORT, which is the one signal that says "that was the end" rather than
 * "that was as much as I will send".
 *
 * WHY EVERY CALLER MUST CARRY ITS OWN `.order(...)`
 * `range(from, to)` is `OFFSET from LIMIT to-from+1`, and an OFFSET into an
 * unordered result is meaningless: between two pages the planner may hand back
 * the same row twice and never hand back another. Every paged query therefore
 * orders by something UNIQUE (a primary key, or a display column with the key
 * appended as a tiebreak). `scripts/check-paging.mjs` fails the build if a
 * `pageAll` call site is missing its `.order(`.
 *
 * THE SHAPE IS supabase-js's OWN. It takes and returns `{ data, error }`, so a
 * call site becomes a paged one by wrapping the builder in an arrow and adding
 * `.range(from, to)` -- the `if (res.error) fail(...)` line underneath does not
 * move. A helper that returned a bare array would have made every caller
 * rewrite its error handling, and a rewritten error path is one nobody reviews.
 */

/** What PostgREST will send in one reply. Kept here so the reason is one read
 *  away from the number, and so a spec can name it. */
export const API_PAGE = 1000;

/**
 * A runaway stop. Not a row limit anybody should hit: it is the guard that
 * turns "this query orders by nothing and is paging forever" into a sentence
 * instead of a hung screen. Every real read in this app is orders of magnitude
 * below it.
 */
export const PAGE_CAP = 200_000;

/** The `{ data, error }` supabase-js resolves to, narrowed to what is used. */
export type PagedResult<T> = { data: T[] | null; error: { message?: string } | null };

/**
 * Every row a query matches, gathered a page at a time.
 *
 * `page(from, to)` must issue the SAME query each call with `.range(from, to)`
 * applied and a unique `.order(...)` already on it. Paging stops at the first
 * short page. An error on any page is returned as-is and no further page is
 * asked for: a partial answer presented as a whole one is the defect this
 * module exists to end, so half a table never comes back with `error: null`.
 */
export async function pageAll<T>(
  page: (from: number, to: number) => PromiseLike<PagedResult<T>>,
  opts: { size?: number; cap?: number } = {},
): Promise<PagedResult<T>> {
  const size = opts.size ?? API_PAGE;
  const cap = opts.cap ?? PAGE_CAP;
  const rows: T[] = [];

  for (let from = 0; ; from += size) {
    const res = await page(from, from + size - 1);
    if (res.error) return { data: null, error: res.error };
    const got = res.data ?? [];
    rows.push(...got);
    // SHORT PAGE ENDS IT. A full page means "there may be more", never "that
    // is all" -- the two are indistinguishable from the outside, which is
    // exactly how the unpaged read lied.
    if (got.length < size) return { data: rows, error: null };
    if (rows.length >= cap) {
      return {
        data: null,
        error: { message:
          `paged past ${cap} rows without reaching the end — the query is `
          + 'probably missing a unique .order(), so every page returns the same rows' },
      };
    }
  }
}
