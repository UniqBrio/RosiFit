/**
 * THE OTHER CEILING: a read can be bounded in ROWS and still be too big to SEND.
 *
 * Run: npx tsx --test src/data/requestSize.test.ts
 *
 * RC-039 taught this app that PostgREST answers a too-large read with 1000
 * rows, `200` and `error: null`. `pageAll.ts` closed that, and
 * `pagedReads.test.ts` holds every call site to it. Both are about the REPLY.
 *
 * Nothing was ever about the REQUEST. An `.in(ids)` filter travels in the query
 * string — supabase-js percent-encodes each separator, so a UUID costs 39
 * bytes — and the gateway in front of PostgREST refuses an over-long request
 * head with a bare `400 Bad Request` and no PostgREST error body at all.
 *
 * MEASURED against this project's own endpoint on 16-Sep-2026, by sending the
 * exact query `fetchCourseDayRows` builds (anon key, so a request that REACHES
 * PostgREST answers `401 permission denied` — the gateway's own refusal is a
 * plain `400` with no JSON):
 *
 *     629 ids  urlLen 24,643  ->  401   reached PostgREST
 *     640 ids  urlLen 25,072  ->  401   reached PostgREST
 *     660 ids  urlLen 25,852  ->  400   refused by the gateway
 *     700 ids  urlLen 27,412  ->  400   refused by the gateway
 *
 * And the budget is shared with the HEADERS, which is what decided the reported
 * failure — the probe above carried a 208-byte anon key where the app carries a
 * session JWT, plus everything a browser adds:
 *
 *     +0 bytes of header   ->  643 ids got through
 *     +700 bytes           ->  634 ids
 *     +1400 bytes          ->  625 ids
 *
 * Postnatal's roster on Tue 15 Sep 2026 is 629 members. That is the bug.
 *
 * THE RULE THESE PIN. Not "stay under the number measured above" — that number
 * belongs to one gateway on one day, and tuning to it means re-measuring it
 * forever. A request carries a bounded number of ids, small enough that the
 * whole head fits the conventional 8 KB every proxy in the chain allows.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  inChunks, pageAllByKey, MAX_IDS_PER_REQUEST, PagedReadError,
  type KeysetQuery, type PageResult,
} from './pageAll';

const ROOT = process.env.PAGED_READS_SPEC_ROOT ?? process.cwd();
const REPO = 'src/data/repository.ts';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** What one id costs in the query string: 36 for the UUID, 3 for the `%2C`. */
const BYTES_PER_ID = 39;
/** `https://<ref>.supabase.co/rest/v1/members?select=...&id=in.%28%29&order=&limit=` */
const BYTES_OF_EVERYTHING_ELSE = 512;
/**
 * The conventional request-head budget — nginx's `large_client_header_buffers`
 * default, and the floor of every proxy this app's traffic can pass through.
 * Deliberately far below the 25 KB this project's gateway actually allowed.
 */
const PORTABLE_HEAD_BUDGET = 8192;

/* ------------------------------------------------------------- the constant */

test('a request carries few enough ids to fit the portable head budget', () => {
  const worst = MAX_IDS_PER_REQUEST * BYTES_PER_ID + BYTES_OF_EVERYTHING_ELSE;
  assert.ok(worst < PORTABLE_HEAD_BUDGET,
    `${MAX_IDS_PER_REQUEST} ids is ${worst} bytes of request head, over the ${PORTABLE_HEAD_BUDGET} `
    + 'byte budget. The point is to be nowhere near any gateway cliff, not just under this one.');
});

test('and it is not so small that a roster becomes a hundred requests', () => {
  // The other failure mode. 629 members must not mean 629 round trips.
  assert.ok(MAX_IDS_PER_REQUEST >= 100,
    `chunks of ${MAX_IDS_PER_REQUEST} turn one roster read into an unreasonable number of requests`);
});

/* -------------------------------------------------------------- the chunking */

type Row = { id: string };

/**
 * A fake table that records the id list each request was given.
 *
 * Ids are STRINGS because the real ones are UUIDs, and the size of the request
 * is the whole subject here. `m0000`-style ids sort the same way as their
 * numbering, so an out-of-order concatenation is visible.
 */
function fakeChunked(opts: { failOn?: number } = {}) {
  const state = { requests: [] as string[][], pages: 0 };
  const build = (given: string[]): KeysetQuery<Row> => {
    let after: string | undefined;
    let take = 1000;
    const q: KeysetQuery<Row> = {
      gt(_c, v) { after = v as string; return q; },
      order() { return q; },
      limit(n) { take = n; return q; },
      then<R>(onfulfilled: (r: PageResult<Row>) => R): PromiseLike<R> {
        // One entry per REQUEST — a chunk read across several pages is several
        // requests, and each one of them carries the whole id list.
        state.pages += 1;
        state.requests.push([...given]);
        if (opts.failOn === state.pages) {
          return Promise.resolve(onfulfilled({ data: null, error: { message: 'connection lost' } }));
        }
        const page = given.filter(i => after === undefined || i > after)
          .sort().slice(0, take).map(id => ({ id }));
        return Promise.resolve(onfulfilled({ data: page, error: null }));
      },
    };
    return q;
  };
  return { build, state };
}

const ids = (n: number) =>
  Array.from({ length: n }, (_, i) => `m${String(i + 1).padStart(5, '0')}`);

test('THE REPORTED CASE: 629 ids go out as several small requests, not one huge one', async () => {
  const t = fakeChunked();
  const rows = await pageAllByKey<Row>(
    inChunks(ids(629), t.build), { key: 'id' });

  assert.equal(rows.length, 629, 'every member must still come back');
  assert.ok(t.state.requests.every(r => r.length <= MAX_IDS_PER_REQUEST),
    `a request carried more than ${MAX_IDS_PER_REQUEST} ids: `
    + `${Math.max(...t.state.requests.map(r => r.length))}`);
});

test('the chunks are the whole list, once each, in order', async () => {
  const t = fakeChunked();
  const rows = await pageAllByKey<Row>(
    inChunks(ids(629), t.build), { key: 'id' });

  assert.deepEqual(rows.map(r => r.id), ids(629),
    'concatenating the chunks must reproduce the list — no gap, no repeat, no reorder');
});

test('an empty id list asks for nothing at all', async () => {
  const t = fakeChunked();
  const rows = await pageAllByKey<Row>(
    inChunks([], t.build), { key: 'id' });

  assert.equal(rows.length, 0);
  assert.equal(t.state.requests.length, 0,
    'an `.in()` on nothing is not a request; it is an empty answer');
});

test('a failed chunk is a FAILURE, never the chunks that happened to work', async () => {
  // The RC-039 rule, one level out: half a roster returned as a success is the
  // defect, not a degraded success.
  const t = fakeChunked({ failOn: 2 });
  await assert.rejects(
    () => pageAllByKey<Row>(inChunks(ids(629), t.build), { key: 'id' }),
    (err: unknown) => err instanceof PagedReadError,
    'a chunk that could not be read must throw, not shorten the answer');
});

test('each chunk is still PAGED — the row ceiling does not stop applying', async () => {
  // Chunking bounds the request. It must not quietly un-bound the reply: a
  // chunk whose rows exceed one page still has to be paged through (RC-039).
  const t = fakeChunked();
  await pageAllByKey<Row>(
    inChunks(ids(300), t.build), { key: 'id', pageSize: 50 });

  const distinctChunks = new Set(t.state.requests.map(r => r.join(','))).size;
  assert.equal(distinctChunks, 2, '300 ids in chunks of 150 is two chunks');
  assert.ok(t.state.pages > distinctChunks,
    'a chunk larger than one page must be read across several pages, not one');
});

/* ------------------------------------------------------------- the call sites */

/**
 * The reads whose `.in()` list is MEMBER-SCALE — one id per person, so the
 * request grows with the academy exactly the way RC-039's reply did. Every
 * other `.in()` in the file carries ids of courses, branches, offerings,
 * sessions, batches or holidays: those are counted in tens and are set by the
 * academy rather than by its intake.
 */
const MUST_CHUNK: { fragment: string; because: string }[] = [
  { fragment: "'the names on this day'",
    because: "the roster of ONE course on ONE day — 629 on Postnatal's Tue 15 Sep 2026, "
      + 'which is the read that was refused' },
  { fragment: "'the names on this week'",
    because: 'every member who attended anything in a period — larger again than one day, '
      + 'and over the cliff for any ordinary week' },
];

test('THE RUNG: every member-scale id list is sent in chunks', () => {
  const src = read(REPO);
  for (const { fragment, because } of MUST_CHUNK) {
    const at = src.indexOf(fragment);
    assert.notEqual(at, -1, `${REPO}: expected a read labelled ${fragment}`);

    // The call this label belongs to, read to its closing paren.
    let depth = 0, end = at;
    for (let i = src.lastIndexOf('(', at); i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    const call = src.slice(src.lastIndexOf('await', at), end + 1);
    assert.ok(call.includes('inChunks('),
      `${REPO}: the read labelled ${fragment} sends its whole id list in one request. `
      + `${because}. An \`.in()\` of that many UUIDs is ~${BYTES_PER_ID} bytes each and the `
      + 'gateway refuses the request with a bare 400 — no rows, no PostgREST error. '
      + 'Send it through inChunks().');
  }
});

test('the chunker is imported, or it chunks nothing', () => {
  assert.match(read(REPO), /import \{[\s\S]*?\binChunks\b[\s\S]*?\} from '\.\/pageAll'/,
    `${REPO}: inChunks must be imported from the module that owns how this app reads a list.`);
});
