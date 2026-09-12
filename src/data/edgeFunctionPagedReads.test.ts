/**
 * THE RUNG UNDER RC-043: the csv-import function reads no growing table
 * unpaged, and its pager terminates the way the client's does.
 *
 * Run: npx tsx --test src/data/edgeFunctionPagedReads.test.ts
 *
 * `pagedReads.test.ts` holds this for the CLIENT. This is the same claim for
 * the Edge Function that stages an upload, which nobody swept when RC-039 was
 * fixed because it runs on the service-role client -- and "bypasses RLS" was
 * read as "bypasses the cap". On 12-Sep-2026 live members passed 1,000, the
 * function's `members` read came back one page short, and every upload that
 * named a member outside that page died on a non-null assertion: a
 * TypeError, a 500, and "Something went wrong" in front of three ordinary
 * Meet files.
 *
 * Two halves, for the two ways this can come back:
 *
 *   THE PAGER IS CORRECT -- run under node against a fake table whose ceiling
 *   is applied after the client's limit, exactly as `db-max-rows` is. The
 *   Edge Function's copy has no Deno dependency on purpose, so it runs here.
 *
 *   THE PAGER IS USED -- read from the source, because a call site that
 *   silently receives a thousand rows and `error: null` has no runtime
 *   signal to test for. Every growing table the function reads goes through
 *   it, selects the key it pages by, and the two pagers agree on the one
 *   rule that matters: only an EMPTY page ends a read.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  pageAllByKey, PagedReadError, SUPABASE_MAX_ROWS,
  type KeysetQuery, type PageResult,
} from '../../supabase/functions/_shared/pageAll';

const ROOT = process.env.EDGE_PAGED_READS_SPEC_ROOT ?? process.cwd();
const FN = 'supabase/functions/csv-import/index.ts';
const EDGE_PAGER = 'supabase/functions/_shared/pageAll.ts';
const CLIENT_PAGER = 'src/data/pageAll.ts';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
/** The source with its comments removed, so a defect NAMED in prose is not read as one. */
const code = (rel: string) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

type Row = { id: number; name?: string };

/** A fake PostgREST table. `serverCap` is applied AFTER the client's limit. */
function fakeTable(seed: Row[], opts: { serverCap?: number; failOn?: number } = {}) {
  const cap = opts.serverCap ?? SUPABASE_MAX_ROWS;
  const state = { rows: [...seed], pages: 0 };
  const build = (): KeysetQuery<Row> => {
    let after: number | undefined;
    let take = cap;
    const q: KeysetQuery<Row> = {
      gt(_c, v) { after = v as number; return q; },
      order() { return q; },
      limit(n) { take = Math.min(n, cap); return q; },
      then<R>(ok: (v: PageResult<Row>) => R) {
        state.pages += 1;
        if (opts.failOn === state.pages) {
          return Promise.resolve(ok({ data: null, error: { message: 'boom' } }));
        }
        const page = state.rows
          .filter(r => after === undefined || r.id > after)
          .sort((a, b) => a.id - b.id)
          .slice(0, take);
        return Promise.resolve(ok({ data: page, error: null }));
      },
    };
    return q;
  };
  return { build, state };
}

const seed = (n: number): Row[] => Array.from({ length: n }, (_, i) => ({ id: i + 1 }));

// ------------------------------------------------------------ the pager
test('the requester\'s case: 1,050 members come back whole, not 1,000', async () => {
  const t = fakeTable(seed(1050));
  const rows = await pageAllByKey(t.build, { key: 'id' });
  assert.equal(rows.length, 1050);
  assert.equal(new Set(rows.map(r => r.id)).size, 1050, 'no row read twice');
});

test('a server ceiling BELOW the page size still returns everything', async () => {
  // A short page means nothing. Lower db-max-rows to 400 and the read must
  // keep going; stopping on "fewer than I asked for" is RC-041 defect 1.
  const t = fakeTable(seed(1050), { serverCap: 400 });
  const rows = await pageAllByKey(t.build, { key: 'id' });
  assert.equal(rows.length, 1050);
});

test('a table that is an exact multiple of the page asks once more and stops on empty', async () => {
  const t = fakeTable(seed(2000));
  const rows = await pageAllByKey(t.build, { key: 'id' });
  assert.equal(rows.length, 2000);
  assert.equal(t.state.pages, 3, 'two full pages, then the empty page that ends it');
});

test('a failed page is a failure, never a short answer', async () => {
  const t = fakeTable(seed(1050), { failOn: 2 });
  await assert.rejects(() => pageAllByKey(t.build, { key: 'id' }), PagedReadError);
});

test('a key that was not selected is a loud failure', async () => {
  const t = fakeTable([{ id: 1 }, { id: 2 }]);
  await assert.rejects(
    () => pageAllByKey(t.build, { key: 'member_id' }),
    (e: unknown) => e instanceof PagedReadError && /add "member_id" to the select/.test(e.message));
});

// --------------------------------------------------------- it is USED
/**
 * Tables whose row count grows with the ACADEMY, that the preview reads in
 * full to match a file against. `app_users` (staff, eleven rows), `courses`,
 * `branches` and `course_offerings` are set by the academy, not its intake,
 * and are deliberately absent. Production counts on 12-Sep-2026: members
 * 1,050 · enrolments 1,026 · member_stats 1,052 · aliases 744 · emails 704.
 */
const GROWS: { table: string; key: string }[] = [
  { table: 'members', key: 'id' },
  { table: 'member_aliases', key: 'id' },
  { table: 'member_emails', key: 'id' },
  { table: 'member_stats', key: 'member_id' },
  { table: 'member_enrollments', key: 'id' },
];

/** Each `admin.from('<table>')` in the function, with the statement it opens. */
function readsOf(src: string, table: string): string[] {
  const out: string[] = [];
  const needle = `admin.from('${table}')`;
  let at = src.indexOf(needle);
  while (at !== -1) {
    // the statement runs to the next `;` at the end of a line
    const end = src.indexOf(';\n', at);
    out.push(src.slice(Math.max(0, src.lastIndexOf('\n', at) - 240), end === -1 ? src.length : end));
    at = src.indexOf(needle, at + needle.length);
  }
  return out;
}

test('the function imports the shared pager', () => {
  assert.match(read(FN), /from '\.\.\/_shared\/pageAll\.ts'/,
    'csv-import does not import the keyset pager');
});

for (const { table, key } of GROWS) {
  test(`every read of ${table} is paged by ${key}, and ${key} is selected`, () => {
    const reads = readsOf(read(FN), table);
    assert.ok(reads.length > 0, `no read of ${table} found -- has it moved?`);
    for (const r of reads) {
      assert.ok(r.includes('pageAllByKey('), `an unpaged read of ${table}:\n${r}`);
      assert.ok(r.includes(`key: '${key}'`), `${table} is not paged by ${key}:\n${r}`);
      const select = r.match(/\.select\('([^']+)'\)/);
      assert.ok(select, `no select on the ${table} read`);
      const cols = select[1].split(',').map(c => c.trim());
      assert.ok(cols.includes(key), `${table} pages by ${key} but selects only: ${select[1]}`);
    }
  });
}

test('nothing in the function pages by offset', () => {
  assert.ok(!code(FN).includes('.range('), 'an OFFSET page: RC-041 defect 2');
});

test('a matched member that is not loaded is a named failure, not a TypeError', () => {
  const src = read(FN);
  assert.ok(!src.includes('memberById.get(id)!'),
    'the non-null assertion that turned a short page into a 500 is back');
  assert.match(src, /const m = memberById\.get\(id\);\s*\n\s*if \(!m\)/,
    'the candidate lookup is not guarded');
});

// ------------------------------------------- the two pagers agree
test('both pagers end a read ONLY on an empty page', () => {
  for (const f of [EDGE_PAGER, CLIENT_PAGER]) {
    const src = code(f);
    assert.ok(src.includes('if (got.length === 0) return rows;'), `${f}: the termination moved`);
    assert.ok(!src.includes('.range('), `${f}: offset paging`);
    assert.ok(!/got\.length < size/.test(src), `${f}: a short page ends the read (RC-041 defect 1)`);
  }
});

test('both pagers name the same ceiling', () => {
  for (const f of [EDGE_PAGER, CLIENT_PAGER]) {
    assert.match(read(f), /export const SUPABASE_MAX_ROWS = 1000;/, `${f}: the cap moved`);
  }
});

test('both pagers throw on a page error rather than returning what they have', () => {
  for (const f of [EDGE_PAGER, CLIENT_PAGER]) {
    assert.match(read(f), /if \(res\.error\) \{\s*\n\s*throw new PagedReadError/, `${f}: a failed page is swallowed`);
  }
});
