/**
 * THE RUNG UNDER RC-039: no unbounded read of a growing table, ever again.
 *
 * Run: npx tsx --test src/data/pagedReads.test.ts
 *
 * `src/data/pageAll.test.ts` proves the pager is correct. This proves it is
 * USED -- which is the half that actually failed. The pager being right helps
 * nobody if the next read of `attendance_records` is written the obvious way,
 * and the obvious way is the broken one: PostgREST answers a too-large request
 * with `200`, a thousand rows and `error: null`, so the call site looks
 * healthy, the types are satisfied, and the screen is simply wrong.
 *
 * A defect with no failure signal cannot be caught by a runtime test. It can
 * only be caught by reading the source, which is what this does -- the same
 * technique as `staffShell.test.ts`, for the same reason: there is no
 * component harness here, and the claim is about the SHAPE of the code.
 *
 * TWO CLAIMS.
 *   1. Every read of a table that grows with the academy is paged.
 *   2. Every paged read carries a `.range(` and a UNIQUE `.order(` -- a
 *      `range()` into an unordered result is an OFFSET into nothing, and two
 *      pages may then return the same row and never return another.
 *
 * The ALLOWLIST is the honest part. A handful of reads of these tables are
 * bounded by construction: their id list comes from a query that already
 * carries its own `.limit(...)`, or names a single member. Those do not need
 * paging, and wrapping them would cost a round trip for nothing. Each is
 * listed below WITH the reason it is bounded, so the next person can check
 * the reason rather than trust the exemption -- and so an exemption that
 * stops being true has somewhere to be found.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.PAGED_READS_SPEC_ROOT ?? process.cwd();
const REPO = 'src/data/repository.ts';
const PAGER = 'src/data/pageAll.ts';

/**
 * The tables whose row count grows with the academy rather than with its
 * configuration. `courses`, `branches` and `course_offerings` are deliberately
 * NOT here: they are counted in tens and are set by the academy, not by its
 * intake. If one of those ever becomes per-member, it belongs on this list.
 */
const GROWS = [
  'members', 'member_emails', 'member_aliases', 'member_stats',
  'member_enrollments', 'member_schedules', 'attendance_records',
];

/**
 * Reads of those tables that are bounded WITHOUT paging, each with the bound.
 * The key is a fragment unique to the call site; the value is why it is safe.
 */
const BOUNDED: { fragment: string; because: string }[] = [
  { fragment: ".in('member_id', ids).eq('status', 'active')",
    because: 'the audit log: `ids` are the subjects of audit rows, and fetchAudit carries its own .limit(50)' },
  { fragment: ".select('id, full_name').in('id', wanted)",
    because: 'the audit log again: `wanted` is drawn from the same limited set of rows' },
  { fragment: "? await supabase.from('members').select('id, full_name').in('id', memberIds)",
    because: 'the notification tray, whose three reads are each capped at NOTIFICATION_LIMIT' },
  { fragment: ".eq('member_id', memberId)",
    because: "one member's own week: at most one record per session in a seven-day range" },
];

const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find its source must say so. Scanning
  // nothing and passing is the green-by-omission the gate exists to prevent.
  for (const f of [REPO, PAGER]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set PAGED_READS_SPEC_ROOT.`);
  }
});

test('every read of a growing table is paged, or listed as bounded with its reason', () => {
  const lines = read(REPO).split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const table of GROWS) {
      if (!lines[i].includes(`supabase.from('${table}')`)) continue;

      // The statement, as much of it as a text scan can honestly see: the
      // matched line plus the three around it, because a builder chain is
      // often wrapped and `pageAll((from, to) =>` may sit on the line above.
      const window = lines.slice(Math.max(0, i - 3), i + 5).join('\n');
      if (!/\.select\(/.test(window)) continue;              // a write, not a read
      if (window.includes('pageAll(')) continue;             // paged

      const exempt = BOUNDED.find(b => window.includes(b.fragment));
      assert.ok(exempt,
        `${REPO}:${i + 1} reads ${table} without pageAll(). That table grows with the `
        + 'academy, and PostgREST answers a too-large read with 1000 rows, 200 and no '
        + 'error — so this returns SILENTLY SHORT once the academy passes the cap '
        + '(RC-039). Page it, or add it to BOUNDED here with the bound that makes it safe.\n'
        + `  ${lines[i].trim()}`);
    }
  }
});

test('every paged read carries its own .range( and .order(', () => {
  const lines = read(REPO).split('\n');
  const sites = lines
    .map((line, i) => ({ line, i }))
    .filter(({ line }) => line.includes('pageAll((from, to) =>'));

  assert.ok(sites.length > 0, `${REPO}: no paged reads at all — has pageAll been removed?`);

  for (const { i } of sites) {
    const window = lines.slice(i, i + 6).join('\n');
    assert.ok(window.includes('.range(from, to)'),
      `${REPO}:${i + 1}: a paged read must apply .range(from, to), or every page is page one.`);
    assert.ok(window.includes('.order('),
      `${REPO}:${i + 1}: a paged read must .order( by something unique. A range() into an `
      + 'unordered result is an OFFSET into nothing: two pages can return the same row and '
      + 'never return another.');
  }
});

test('the pager states which ceiling it exists to clear', () => {
  // The number and the reason live together, so raising one without reading
  // the other is not possible by accident.
  const s = read(PAGER);
  assert.ok(s.includes('export const API_PAGE = 1000'),
    `${PAGER}: API_PAGE must be the row cap PostgREST actually enforces.`);
  assert.ok(/Content-Range/.test(s),
    `${PAGER}: name the header that reveals the truncation, or the next reader cannot verify the cap.`);
});
