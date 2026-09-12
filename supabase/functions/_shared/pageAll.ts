/**
 * EVERY ROW a query matches, read by keyset cursor -- for the Edge Functions.
 *
 * WHY THIS FILE EXISTS (RC-043)
 *
 * PostgREST wraps every request in `LIMIT <db-max-rows>`. On this project
 * that is 1,000, and a request that hits the ceiling is NOT an error: it
 * answers `200` with a thousand rows and `error: null`. The client half of
 * the app learned this on 10-Sep-2026 (RC-039, `src/data/pageAll.ts`) and
 * every growing table it reads is paged. The csv-import function was never
 * swept, because it runs on the service-role client and "the service role
 * bypasses RLS" was read as "the service role bypasses the cap". It does
 * not. The cap is PostgREST's and applies to every role.
 *
 * On 12-Sep-2026 the academy's live members passed 1,000. From that moment
 * the function's `members` read came back one page short, the alias table
 * (still under the cap) kept pointing at members that were no longer loaded,
 * and every upload naming one of them died on `memberById.get(id)!` -- a
 * TypeError, a 500, and "Something went wrong" in front of the person
 * uploading three perfectly ordinary Meet files.
 *
 * THIS IS THE CLIENT PAGER, VERBATIM IN CONTRACT. The two files cannot be one
 * file: this one is bundled by the Supabase CLI from `supabase/functions/`,
 * and that one is typechecked and tested under node with no Deno in reach.
 * So the CONTRACT is pinned by a spec instead
 * (`src/data/edgeFunctionPagedReads.test.ts`), which runs this file under
 * node -- it has no Deno dependency on purpose -- and reads both sources:
 *
 *   · Order by a unique, indexed key that the caller SELECTS. The cursor is
 *     read out of the last row, so a key that is not selected is not there.
 *   · The first page carries no key filter. No sentinel value.
 *   · Terminate ONLY on an empty page. A short page means nothing: the
 *     server's ceiling is a project setting and may sit below the page size.
 *   · Any page error THROWS. A partial list never escapes as a result.
 *   · The caller hands over a FACTORY. Each page needs a fresh builder, or
 *     the second page asks for `key > a AND key > b`.
 */

/** What PostgREST will send in one reply. One constant, one place. */
export const SUPABASE_MAX_ROWS = 1000;

/** What a page asks for. Equal to the cap; a healthy server fills a page exactly. */
export const PAGE_SIZE = SUPABASE_MAX_ROWS;

/** A runaway stop. Not a budget: the guard for a key that is not unique. */
export const PAGE_CAP = 200_000;

/** A read that could not be completed. Never carries partial rows. */
export class PagedReadError extends Error {
  constructor(message: string) { super(message); this.name = 'PagedReadError'; }
}

export type PageResult<T> = { data: T[] | null; error: { message?: string } | null };

/**
 * The slice of a PostgREST builder this module uses. Structural on purpose:
 * supabase-js's builder satisfies it, and so does a fake in a spec.
 */
export interface KeysetQuery<T> {
  gt(column: string, value: unknown): KeysetQuery<T>;
  order(column: string, options?: { ascending?: boolean }): KeysetQuery<T>;
  limit(count: number): KeysetQuery<T>;
  then<R>(onfulfilled: (value: PageResult<T>) => R): PromiseLike<R>;
}

/** A fresh builder carrying the caller's own filters, and nothing else. */
export type QueryFactory<T> = () => KeysetQuery<T>;

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
    // A FRESH builder every page. Reusing one accumulates `.gt()` filters.
    let q = build().order(key, { ascending: true }).limit(size);
    if (after !== undefined) q = q.gt(key, after);

    const res: PageResult<T> = await q.then(r => r);
    if (res.error) {
      throw new PagedReadError(res.error.message ?? 'the page could not be read');
    }
    const got = res.data ?? [];

    // THE ONLY TERMINATION. A short page says nothing: the server's own cap
    // may be below the page size, and reading that as an ending is RC-041's
    // first defect.
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
