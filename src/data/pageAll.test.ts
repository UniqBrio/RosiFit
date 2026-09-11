/**
 * Cases for the KEYSET paged read (RC-039, and the two defects review found
 * in the first fix for it).
 *
 * Run: npx tsx --test src/data/pageAll.test.ts
 *
 * WHAT REPLACED WHAT, SAID PLAINLY. This file previously specced `pageAll`,
 * an OFFSET pager built for RC-039. That helper is removed, so its spec goes
 * with it -- a spec is not being weakened here, its subject is being deleted.
 * Every assertion that still has meaning was carried across and is marked
 * CARRIED below; the two that were removed are named, with the reason:
 *
 *   CARRIED  an empty table is one request and an empty answer
 *   CARRIED  a table larger than one page comes back whole
 *   CARRIED  a failed page is a failure, never a short answer
 *   CARRIED  a runaway read is stopped and named
 *   REMOVED  "the ranges are inclusive, contiguous and never overlap" --
 *            asserted `.range(0,9), .range(10,19)`. There are no ranges now.
 *   REMOVED  "a table that is an EXACT multiple of the page still asks once
 *            more" -- it asserted that a SHORT page ends the read, which is
 *            defect 1. Its replacement is the opposite claim: a short page
 *            means nothing, and only an EMPTY page ends the read.
 *
 * THE TWO DEFECTS THESE EXIST FOR
 *
 * 1. SHORT-PAGE TERMINATION. The offset pager stopped when a page came back
 *    with fewer rows than it asked for. That is only sound if the server's
 *    cap is never below the page size. Supabase's `db-max-rows` is a project
 *    setting: lower it to 500, or restore a project with a different default,
 *    and every read in the app silently returns the first page and claims to
 *    be complete. The fix reads truncation as "there may be more", which is
 *    the only safe reading, and stops on ZERO rows.
 *
 * 2. OFFSET PAGING IS NOT STABLE UNDER WRITES. `.range(1000, 1999)` is
 *    `OFFSET 1000`, and an insert or delete anywhere earlier in the ordering
 *    shifts every later page. A row can be skipped entirely or read twice.
 *    Attendance is imported in bulk while people are looking at the screen,
 *    so this is not hypothetical. A keyset cursor is anchored to a value, not
 *    to a position, so an insert before the cursor cannot move what comes
 *    after it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  pageAllByKey, readBounded, guardUntruncated,
  PagedReadError, TruncatedReadError, SUPABASE_MAX_ROWS, PAGE_SIZE,
  type KeysetQuery, type PageResult,
} from './pageAll';

type Row = { id: number; name?: string };

/**
 * A fake PostgREST table.
 *
 * `serverCap` is the thing under test in the first case: the server's own
 * ceiling, applied AFTER the client's `limit`, exactly as `db-max-rows` does.
 */
function fakeTable(seed: Row[], opts: {
  serverCap?: number;
  /** called with the page number (1-based) before each page is served */
  before?: (page: number, rows: Row[]) => void;
  /** page number that should come back as an error instead of rows */
  failOn?: number;
} = {}) {
  const cap = opts.serverCap ?? SUPABASE_MAX_ROWS;
  const state = { rows: [...seed], pages: 0, asked: [] as (number | undefined)[] };

  const build = (): KeysetQuery<Row> => {
    let after: number | undefined;
    let take = cap;
    const q: KeysetQuery<Row> = {
      gt(_col, value) { after = value as number; return q; },
      order() { return q; },
      limit(n) { take = Math.min(n, cap); return q; },
      then<R>(onfulfilled: (r: PageResult<Row>) => R): PromiseLike<R> {
        state.pages += 1;
        state.asked.push(after);
        opts.before?.(state.pages, state.rows);
        if (opts.failOn === state.pages) {
          return Promise.resolve(onfulfilled({ data: null, error: { message: 'connection lost' } }));
        }
        const page = state.rows
          .filter(r => after === undefined || r.id > after)
          .sort((a, b) => a.id - b.id)
          .slice(0, take);
        return Promise.resolve(onfulfilled({ data: page, error: null }));
      },
    };
    return q;
  };
  return { build, state };
}

const seedOf = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

/* ------------------------------------------------------------- the constant */

test('the cap constant is the ceiling the API actually enforces', () => {
  assert.equal(SUPABASE_MAX_ROWS, 1000);
  assert.ok(PAGE_SIZE <= SUPABASE_MAX_ROWS,
    'asking for more than the server will send wastes nothing, but asking for less is a smaller page, never a truncation');
});

/* ----------------------------------------------------------------- defect 1 */

test('DEFECT 1: a server cap BELOW the page size returns everything, not one page', async () => {
  // The whole point. Page size 1000, server cap 50, 2,220 rows. The offset
  // pager asked for 1000, got 50, decided 50 < 1000 meant "that was the end"
  // and returned 50 rows with no error at all.
  const t = fakeTable(seedOf(2220), { serverCap: 50 });
  const rows = await pageAllByKey<Row>(t.build, { key: 'id', pageSize: 1000 });

  assert.equal(rows.length, 2220, 'every row must come back');
  assert.equal(new Set(rows.map(r => r.id)).size, 2220, 'no row may be returned twice');
  assert.equal(t.state.pages, Math.ceil(2220 / 50) + 1,
    'it must keep asking until a page is EMPTY — 45 full pages and one empty');
});

test('a short page is never read as the end, even at the very first page', async () => {
  const t = fakeTable(seedOf(10), { serverCap: 3 });
  const rows = await pageAllByKey<Row>(t.build, { key: 'id', pageSize: 1000 });
  assert.equal(rows.length, 10);
});

test('the read ends only on an EMPTY page, so a full last page costs one more request', async () => {
  // 20 rows at 10 a page: pages of 10, 10, then 0. Three requests, and the
  // third is what proves there is nothing left.
  const t = fakeTable(seedOf(20));
  const rows = await pageAllByKey<Row>(t.build, { key: 'id', pageSize: 10 });
  assert.equal(rows.length, 20);
  assert.equal(t.state.pages, 3);
});

/* ----------------------------------------------------------------- defect 2 */

test('DEFECT 2: a row INSERTED behind the cursor cannot skip a row that was already there', async () => {
  /*
   * With offsets this is the classic skip: page 1 takes rows at offset 0-9,
   * something is inserted at the front, and page 2's OFFSET 10 now lands on
   * the row that used to be at index 9 -- so index 10's original occupant is
   * never read. A cursor of `id > 10` cannot be moved by an insert at id 0.
   */
  const t = fakeTable(seedOf(20), {
    before(page, rows) { if (page === 2) rows.unshift({ id: 0, name: 'inserted behind' }); },
  });
  const rows = await pageAllByKey<Row>(t.build, { key: 'id', pageSize: 10 });

  const ids = rows.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length, 'no duplicates');
  for (let i = 1; i <= 20; i++) {
    assert.ok(ids.includes(i), `row ${i} existed when paging began and must be returned`);
  }
});

test('a row DELETED ahead of the cursor cannot duplicate another', async () => {
  const t = fakeTable(seedOf(20), {
    before(page, rows) {
      if (page === 2) { const at = rows.findIndex(r => r.id === 15); if (at >= 0) rows.splice(at, 1); }
    },
  });
  const rows = await pageAllByKey<Row>(t.build, { key: 'id', pageSize: 10 });
  const ids = rows.map(r => r.id);
  assert.equal(new Set(ids).size, ids.length, 'a delete must not make another row appear twice');
  assert.ok(!ids.includes(15), 'the deleted row is simply absent, which is correct');
});

test('the cursor is the LAST key seen, and the first request carries no key at all', async () => {
  // No sentinel. A zero UUID or a 0 seeded as "before everything" is a value
  // that can collide with a real key and is a type assumption besides.
  const t = fakeTable(seedOf(25));
  await pageAllByKey<Row>(t.build, { key: 'id', pageSize: 10 });
  assert.deepEqual(t.state.asked, [undefined, 10, 20, 25],
    'first page unfiltered, then gt(last id of the previous page)');
});

/* ------------------------------------------------------------------ failure */

test('CARRIED: a page that FAILS throws, and never returns a partial result', async () => {
  const t = fakeTable(seedOf(50), { failOn: 2 });
  await assert.rejects(
    () => pageAllByKey<Row>(t.build, { key: 'id', pageSize: 10 }),
    (e: unknown) => e instanceof PagedReadError && /connection lost/.test((e as Error).message),
    'a failed page must throw, so no caller can mistake half a table for all of it');
});

test('CARRIED: an empty table is one request and an empty array', async () => {
  const t = fakeTable([]);
  const rows = await pageAllByKey<Row>(t.build, { key: 'id', pageSize: 10 });
  assert.deepEqual(rows, []);
  assert.equal(t.state.pages, 1);
});

test('CARRIED: a table larger than one page comes back whole', async () => {
  const t = fakeTable(seedOf(2500));
  const rows = await pageAllByKey<Row>(t.build, { key: 'id' });
  assert.equal(rows.length, 2500);
});

test('CARRIED: a runaway read is stopped and NAMED, never left to hang', async () => {
  // A query whose key is not actually unique, or a fake server that ignores
  // the cursor, would page for ever. The message has to say what to go and fix.
  const build = (): KeysetQuery<Row> => {
    const q: KeysetQuery<Row> = {
      gt() { return q; }, order() { return q; }, limit() { return q; },
      then: <R,>(f: (r: PageResult<Row>) => R) => Promise.resolve(f({ data: [{ id: 1 }, { id: 2 }], error: null })),
    };
    return q;
  };
  await assert.rejects(
    () => pageAllByKey<Row>(build, { key: 'id', pageSize: 2, cap: 10 }),
    (e: unknown) => e instanceof PagedReadError && /unique/.test((e as Error).message));
});

test('a row that does not carry the key column is a LOUD failure', async () => {
  /*
   * The trap this catches is real and was live in the code this replaces:
   * `member_emails` is keyed on `id` and selected `member_id, email, ...`,
   * so the key never arrived in the payload. A cursor read from a missing
   * column is `undefined`, which would either page from the start for ever
   * or silently stop. Neither is acceptable; it says so instead.
   */
  const build = (): KeysetQuery<Row> => {
    const q: KeysetQuery<Row> = {
      gt() { return q; }, order() { return q; }, limit() { return q; },
      then: <R,>(f: (r: PageResult<Row>) => R) =>
        Promise.resolve(f({ data: [{ name: 'no id here' } as unknown as Row], error: null })),
    };
    return q;
  };
  await assert.rejects(
    () => pageAllByKey<Row>(build, { key: 'id', pageSize: 10 }),
    (e: unknown) => e instanceof PagedReadError && /select/.test((e as Error).message),
    'the message must tell the caller to add the key to its select');
});

/* --------------------------------------------------- the other two shapes */

/** A fake for the bounded shape: no cursor, just `limit(n)` off the top. */
function fakeList(seed: Row[], opts: { failWith?: string } = {}) {
  const state = { asked: [] as number[] };
  const build = (): KeysetQuery<Row> => {
    let take = seed.length;
    const q: KeysetQuery<Row> = {
      gt() { return q; }, order() { return q; },
      limit(n) { take = n; state.asked.push(n); return q; },
      then: <R,>(f: (r: PageResult<Row>) => R) => Promise.resolve(f(
        opts.failWith
          ? { data: null, error: { message: opts.failWith } }
          : { data: seed.slice(0, take), error: null })),
    };
    return q;
  };
  return { build, state };
}

test('readBounded asks for ONE MORE than it returns, and says there is more', async () => {
  // The extra row is the whole mechanism. Without it a screen showing 50 of
  // 50 and a screen showing 50 of 4,000 are the same screen.
  const t = fakeList(seedOf(500));
  const { rows, hasMore } = await readBounded<Row>(t.build, 50);
  assert.equal(rows.length, 50, 'the caller gets exactly what it asked for');
  assert.equal(hasMore, true);
  assert.deepEqual(t.state.asked, [51], 'and it asked for 51 to find that out');
});

test('readBounded says there is NO more when the list ends inside the bound', async () => {
  const t = fakeList(seedOf(12));
  const { rows, hasMore } = await readBounded<Row>(t.build, 50);
  assert.equal(rows.length, 12);
  assert.equal(hasMore, false);
});

test('readBounded REFUSES a limit at or above the cap', async () => {
  /*
   * At the ceiling the two answers are the same bytes: a thousand rows
   * because that is all there are, and a thousand rows because the server
   * stopped counting. A helper whose job is an honest bound cannot guess
   * between them, so it declines to be used that way.
   */
  const t = fakeList(seedOf(5000));
  for (const bad of [SUPABASE_MAX_ROWS, SUPABASE_MAX_ROWS + 1, 5000]) {
    await assert.rejects(
      () => readBounded<Row>(t.build, bad),
      (e: unknown) => e instanceof PagedReadError && /pageAllByKey/.test((e as Error).message),
      `a limit of ${bad} must be refused, and the message must name the alternative`);
  }
});

test('readBounded refuses a limit that is not a positive whole number', async () => {
  const t = fakeList(seedOf(10));
  for (const bad of [0, -1, 2.5, NaN]) {
    await assert.rejects(() => readBounded<Row>(t.build, bad),
      (e: unknown) => e instanceof PagedReadError);
  }
});

test('readBounded THROWS on an error, like every other read here', async () => {
  const t = fakeList(seedOf(10), { failWith: 'connection lost' });
  await assert.rejects(() => readBounded<Row>(t.build, 10),
    (e: unknown) => e instanceof PagedReadError && /connection lost/.test((e as Error).message));
});

test('the guard throws on EXACTLY the ceiling, and reports it before throwing', () => {
  const said: string[] = [];
  assert.throws(
    () => guardUntruncated(seedOf(SUPABASE_MAX_ROWS), 'the member list', m => said.push(m)),
    (e: unknown) => e instanceof TruncatedReadError);
  assert.equal(said.length, 1, 'it must be reported, not only thrown — a throw a caller swallows is silence');
  assert.match(said[0], /the member list/, 'and the report must name WHICH read');
});

test('the guard lets every honest row count through untouched', () => {
  for (const n of [0, 1, 999, SUPABASE_MAX_ROWS - 1, SUPABASE_MAX_ROWS + 1]) {
    const rows = seedOf(n);
    assert.equal(guardUntruncated(rows, 'somewhere', () => {}), rows,
      `${n} rows is not the ceiling and must pass through as the very same array`);
  }
});
