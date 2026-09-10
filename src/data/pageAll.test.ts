/**
 * Cases for the paged read (RC-039).
 *
 * Run: npx tsx --test src/data/pageAll.test.ts
 *
 * The defect these pin: PostgREST answers a too-large request with `200`, a
 * thousand rows and `error: null`, so an unpaged read comes back SHORT and
 * says nothing. A whole course's week of attendance fell past that ceiling
 * and its day strip read "Awaiting upload" for four days that had been
 * uploaded.
 *
 * So the claims here are about the two things a pager can get wrong and one
 * thing it must never do:
 *
 *   1. It keeps asking while pages come back FULL, and stops on the first
 *      short one -- a full page is never "that is all".
 *   2. It asks for the right ranges, inclusive, with no gap and no overlap.
 *   3. A failed page is returned as a failure. Half a table with `error: null`
 *      is the bug, not a degraded success.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { pageAll, API_PAGE, PAGE_CAP, type PagedResult } from './pageAll';

/** A fake table of `n` numbered rows, served through the supabase-js shape. */
function table(n: number, log?: [number, number][]) {
  return (from: number, to: number): Promise<PagedResult<number>> => {
    log?.push([from, to]);
    const rows: number[] = [];
    for (let i = from; i <= to && i < n; i++) rows.push(i);
    return Promise.resolve({ data: rows, error: null });
  };
}

test('the page size is the ceiling the API actually enforces', () => {
  // If this number and PostgREST's max-rows ever disagree, every read either
  // pages forever (too small is merely wasteful) or truncates again (too
  // large is the original defect). 1000 is what Content-Range reports.
  assert.equal(API_PAGE, 1000);
});

test('a table smaller than one page is ONE request', async () => {
  const asked: [number, number][] = [];
  const res = await pageAll(table(3, asked), { size: 10 });
  assert.deepEqual(res.data, [0, 1, 2]);
  assert.equal(res.error, null);
  assert.deepEqual(asked, [[0, 9]]);
});

test('an EMPTY table is one request and an empty answer, not an error', async () => {
  const asked: [number, number][] = [];
  const res = await pageAll(table(0, asked), { size: 10 });
  assert.deepEqual(res.data, []);
  assert.equal(res.error, null);
  assert.deepEqual(asked, [[0, 9]]);
});

test('a table LARGER than one page comes back whole', async () => {
  // The regression itself, in miniature: 25 rows through a 10-row ceiling.
  // Unpaged this answered 10 and claimed success.
  const res = await pageAll(table(25), { size: 10 });
  assert.equal(res.data?.length, 25);
  assert.deepEqual(res.data, Array.from({ length: 25 }, (_, i) => i));
});

test('the ranges are inclusive, contiguous and never overlap', async () => {
  const asked: [number, number][] = [];
  await pageAll(table(25, asked), { size: 10 });
  assert.deepEqual(asked, [[0, 9], [10, 19], [20, 29]]);
});

test('a table that is an EXACT multiple of the page still asks once more', async () => {
  // The one case a "stop when a page is not full" pager gets wrong if it
  // guesses: 20 rows at 10 a page look identical to 21 until the third
  // request comes back empty. Stopping at the second would drop row 21.
  const asked: [number, number][] = [];
  const res = await pageAll(table(20, asked), { size: 10 });
  assert.equal(res.data?.length, 20);
  assert.deepEqual(asked, [[0, 9], [10, 19], [20, 29]]);
});

test('a page that FAILS is returned as a failure, never as a short answer', async () => {
  const asked: [number, number][] = [];
  const res = await pageAll<number>((from, to) => {
    asked.push([from, to]);
    return from === 0
      ? Promise.resolve({ data: [0, 1], error: null })
      : Promise.resolve({ data: null, error: { message: 'connection lost' } });
  }, { size: 2 });

  assert.equal(res.data, null, 'a failed page must not hand back the rows that arrived before it');
  assert.equal(res.error?.message, 'connection lost');
  // and it stopped: no third request after the failure
  assert.deepEqual(asked, [[0, 1], [2, 3]]);
});

test('a query with no unique order pages forever, and is stopped and NAMED', async () => {
  // A pager whose ORDER BY is not a total order can be handed the same full
  // page for ever. Hanging the screen teaches nobody why; the message says
  // what to go and fix.
  const res = await pageAll<number>(() => Promise.resolve({ data: [1, 2], error: null }),
    { size: 2, cap: 10 });
  assert.equal(res.data, null);
  assert.match(res.error?.message ?? '', /unique \.order\(\)/);
});

test('the runaway cap is far above any real read', () => {
  // It is a backstop, not a budget. If a legitimate read ever approached it,
  // that read wants narrowing at the query, not a bigger number here.
  assert.ok(PAGE_CAP >= 100_000);
});
