import test from 'node:test';
import assert from 'node:assert/strict';
import { pageAllByKey, SUPABASE_MAX_ROWS, type KeysetQuery, type PageResult } from './pageAll';
import { pageAllByKey as edgePageAllByKey } from '../../supabase/functions/_shared/pageAll';

/**
 * A SHORT PAGE AFTER A LONGER ONE IS THE END (06-Oct-2026; phase 10 of the
 * performance fix, docs/PERFORMANCE_FIX_REPORT_2026-10-06.md §5.1).
 *
 * Run: npx tsx --test src/data/pageAllShortPage.test.ts
 *
 * The rule, and why it is exact. PostgREST answers min(asked, cap,
 * remaining) rows. Within one read `asked` and `cap` are two fixed numbers,
 * so every page before the last has exactly min(asked, cap) rows -- the
 * same length, whatever the cap is. A page shorter than another page of the
 * same read therefore cannot be a capped page: the table ran out. The empty
 * request that used to prove it is not sent. A read whose pages are all one
 * length (a table that is an exact multiple of the page, or whose first
 * page is short) still asks once more, because nothing inside the read can
 * tell those two apart. Both pagers carry the rule; both are driven here.
 */
type Row = { id: number };
const seedOf = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

/** A fake PostgREST table: `serverCap` is applied AFTER the client's limit. */
function fakeTable(seed: Row[], opts: { serverCap?: number } = {}) {
  const cap = opts.serverCap ?? SUPABASE_MAX_ROWS;
  const state = { pages: 0, asked: [] as unknown[] };
  const build = (): KeysetQuery<Row> => {
    let after: number | undefined;
    let take = cap;
    const q: KeysetQuery<Row> = {
      gt(_c, v) { after = v as number; return q; },
      order() { return q; },
      limit(n) { take = Math.min(n, cap); return q; },
      then<R>(ok: (v: PageResult<Row>) => R) {
        state.pages += 1;
        state.asked.push(after);
        const page = seed.filter(r => after === undefined || r.id > after).sort((a, b) => a.id - b.id).slice(0, take);
        return Promise.resolve(ok({ data: page, error: null }));
      },
    };
    return q;
  };
  return { build, state };
}

const whole = (rows: Row[], n: number, label: string) => {
  assert.equal(rows.length, n, `${label}: every row comes back`);
  assert.equal(new Set(rows.map(r => r.id)).size, n, `${label}: no row twice`);
  for (let i = 0; i < n; i++) assert.equal(rows[i].id, i + 1, `${label}: row ${i + 1} in order, none skipped`);
};

for (const [name, pager] of [['client', pageAllByKey], ['edge', edgePageAllByKey]] as const) {
  test(`${name}: a short page after a full one ends the read without the empty request`, async () => {
    const t = fakeTable(seedOf(1644));
    const rows = await pager<Row>(t.build, { key: 'id' });
    whole(rows, 1644, name);
    assert.equal(t.state.pages, 2, 'a full page and the 644-row page; no third request');
    assert.deepEqual(t.state.asked, [undefined, 1000]);
  });

  test(`${name}: a table that is an exact multiple of the page still asks once more`, async () => {
    const t = fakeTable(seedOf(2000));
    const rows = await pager<Row>(t.build, { key: 'id' });
    whole(rows, 2000, name);
    assert.equal(t.state.pages, 3, 'two full pages, then the empty page that proves the end');
  });

  test(`${name}: a table smaller than a page still asks once more -- one short page proves nothing`, async () => {
    const t = fakeTable(seedOf(7));
    const rows = await pager<Row>(t.build, { key: 'id' });
    whole(rows, 7, name);
    assert.equal(t.state.pages, 2, 'the 7-row page, then the empty page');
  });

  test(`${name}: a server cap BELOW the page size: everything comes back, and the short last page still ends it`, async () => {
    const t = fakeTable(seedOf(2220), { serverCap: 50 });
    const rows = await pager<Row>(t.build, { key: 'id', pageSize: 1000 });
    whole(rows, 2220, name);
    assert.equal(t.state.pages, 45, '44 pages of 50 and the 20-row end; no empty page');
  });

  test(`${name}: a server cap below the page size and a table that is an exact multiple of the cap asks once more`, async () => {
    const t = fakeTable(seedOf(150), { serverCap: 50 });
    const rows = await pager<Row>(t.build, { key: 'id', pageSize: 1000 });
    whole(rows, 150, name);
    assert.equal(t.state.pages, 4, 'three pages of 50 -- all one length, so nothing proves the end but the empty page');
  });

  test(`${name}: a cap of exactly the page size over a big table`, async () => {
    const t = fakeTable(seedOf(5000 + 123), { serverCap: 1000 });
    const rows = await pager<Row>(t.build, { key: 'id' });
    whole(rows, 5123, name);
    assert.equal(t.state.pages, 6, 'five full pages and the 123-row end');
  });

  test(`${name}: an empty table is one request`, async () => {
    const t = fakeTable([]);
    const rows = await pager<Row>(t.build, { key: 'id' });
    assert.deepEqual(rows, []);
    assert.equal(t.state.pages, 1);
  });

  test(`${name}: no duplicate page: every request starts strictly after the last key seen`, async () => {
    const t = fakeTable(seedOf(3333));
    await pager<Row>(t.build, { key: 'id' });
    assert.deepEqual(t.state.asked, [undefined, 1000, 2000, 3000]);
    assert.equal(new Set(t.state.asked).size, t.state.asked.length, 'no cursor asked twice');
  });
}
