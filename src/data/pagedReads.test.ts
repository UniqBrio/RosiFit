/**
 * THE RUNG UNDER RC-039: no unbounded read of a growing table, and no read
 * that pages by offset.
 *
 * Run: npx tsx --test src/data/pagedReads.test.ts
 *
 * `pageAll.test.ts` proves the pager is correct. This proves it is USED, and
 * used correctly at every call site -- which is the half that actually fails.
 * A defect with no failure signal cannot be caught by a runtime test:
 * PostgREST answers a too-large request with `200`, a thousand rows and
 * `error: null`, so the call site looks healthy, the types are satisfied, and
 * the screen is simply wrong.
 *
 * WHAT CHANGED FROM THE OFFSET VERSION, said plainly. This file previously
 * asserted `pageAll(` with `.range(from, to)` and an `.order(`. Offset paging
 * is removed (see `pageAll.ts` for the two defects), so those assertions
 * describe a shape that no longer exists. Carried across:
 *
 *   CARRIED  every growing table is paged, or bounded with a stated reason
 *   CARRIED  the pager names the ceiling it exists to clear
 *   REPLACED ".range( and .order(" -> "names a key, and the key is SELECTED"
 *
 * That replacement is the interesting one. A keyset cursor is read out of the
 * last row returned, so a key that is not in the caller's `select` is not
 * there to read. Three of the six original call sites had exactly that fault
 * -- `member_emails`, `member_aliases` and `member_enrollments` are keyed on
 * `id` and selected only the columns their screens wanted. The runtime helper
 * throws on it; this catches it without running anything.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.env.PAGED_READS_SPEC_ROOT ?? process.cwd();
const REPO = 'src/data/repository.ts';
const PAGER = 'src/data/pageAll.ts';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * Tables whose row count grows with the ACADEMY rather than with its
 * configuration. `courses`, `branches` and `course_offerings` are deliberately
 * absent: they are counted in tens and are set by the academy, not its intake.
 * Production counts on 11-Sep-2026 are in the pull request's audit table.
 */
const GROWS = [
  'members', 'member_emails', 'member_aliases', 'member_stats',
  'member_enrollments', 'member_schedules', 'attendance_records',
  'audit_logs', 'email_messages', 'sessions', 'holidays',
];

/**
 * Reads of those tables that are bounded WITHOUT paging, each with the bound
 * that makes it safe. An exemption whose reason stops being true has to have
 * somewhere to be found, so it is written down rather than inferred.
 */
const BOUNDED: { fragment: string; because: string }[] = [
  { fragment: ".in('member_id', ids).eq('status', 'active')",
    because: 'the audit log: `ids` are the subjects of audit rows, and fetchAudit carries .limit(50)' },
  { fragment: ".select('id, full_name').in('id', wanted)",
    because: 'the audit log again: `wanted` is drawn from the same limited set of rows' },
  { fragment: "? await supabase.from('members').select('id, full_name').in('id', memberIds)",
    because: 'the notification tray, whose three reads are each capped at NOTIFICATION_LIMIT' },
  { fragment: ".eq('member_id', memberId)",
    because: "one member's own week: at most one record per session in a seven-day range, "
      + 'and behind checked() in case that stops being true' },
  { fragment: ".order('occurred_at', { ascending: false }).limit(50)",
    because: 'the audit log itself: an explicit .limit(50), far below the cap' },
  { fragment: ".order('created_at', { ascending: false }).limit(100)",
    because: 'audit remarks: an explicit .limit(100)' },
  { fragment: ".order('session_date', { ascending: false }).limit(20)",
    because: 'pending sessions: an explicit .limit(20)' },
  { fragment: 'NOTIFICATION_LIMIT',
    because: 'the notification tray: an explicit shared limit' },
  { fragment: ".gte('session_date', period.from).lte('session_date', period.to)",
    because: 'sessions in one week: bounded by the date range -- 12 rows in the busiest week in '
      + 'production -- but the bound is the TIMETABLE, so it sits behind checked()' },
  { fragment: ".gte('session_date', first).lte('session_date', last)",
    because: 'the month calendar: one row per offering per day, so at most offerings x 31. '
      + '4 offerings in production, and the screen draws a single month. Behind checked()' },
  { fragment: ".in('offering_id', offeringIds)",
    because: "one member's offerings across a bounded date range" },
  { fragment: ".in('holiday_id',",
    because: 'the sessions one holiday covers, behind checked()' },
  { fragment: ".in('batch_id',",
    because: 'the messages in one send batch -- the one bound here the ACADEMY sets, '
      + 'so it is behind checked()' },
  { fragment: "from('holidays').select",
    because: 'holidays are entered by hand, one per closure; 1 row in production' },
  { fragment: "from('email_batches')",
    because: 'batches are per send, and every read of them carries a limit or a single id' },
];

test('the spec is looking at a real tree', () => {
  for (const f of [REPO, PAGER]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set PAGED_READS_SPEC_ROOT.`);
  }
});

test('CARRIED: every read of a growing table is paged, or bounded with its reason', () => {
  const lines = read(REPO).split('\n');

  for (let i = 0; i < lines.length; i++) {
    for (const table of GROWS) {
      if (!lines[i].includes(`supabase.from('${table}')`)) continue;

      const window = lines.slice(Math.max(0, i - 3), i + 6).join('\n');
      if (!/\.select\(/.test(window)) continue;              // no select at all
      /*
       * A WRITE IS NOT A LIST READ, even though it has a `.select()`. A
       * `.delete().eq('id', id).select('id')` is a RETURNING clause used to
       * tell "deleted nothing" from "deleted one", which is how this file
       * detects an RLS refusal. Nothing to page.
       */
      if (/\.(insert|update|upsert|delete)\(/.test(window)) continue;
      if (/\bpaged\(/.test(window)) continue;                // paged

      const exempt = BOUNDED.find(b => window.includes(b.fragment));
      assert.ok(exempt,
        `${REPO}:${i + 1} reads ${table} without paged(). That table grows with the academy, `
        + 'and PostgREST answers a too-large read with 1000 rows, 200 and no error — so this '
        + 'returns SILENTLY SHORT once the academy passes the cap (RC-039). Page it, or add it '
        + 'to BOUNDED here with the bound that makes it safe.\n'
        + `  ${lines[i].trim()}`);
    }
  }
});

test('OFFSET PAGING IS GONE — no .range( survives in the data layer', () => {
  // `.range()` is `OFFSET`, and an offset is a position rather than a place:
  // a write earlier in the ordering moves every later page, so a row is
  // skipped or read twice. See pageAll.ts, defect 2.
  const code = read(REPO).split('\n').filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l));
  assert.ok(!code.some(l => /\.range\(/.test(l)),
    `${REPO}: .range() is offset paging and is not stable under concurrent writes.`);
});

test('every paged read names a key, AND the key is in its own select', () => {
  /*
   * The static half of the trap the helper throws on at runtime. A keyset
   * cursor is read out of the last row returned; a key that was not selected
   * is not in that row. Three of the six original call sites had this fault.
   */
  const src = read(REPO);

  /*
   * Paren-BALANCED, not a regex over the whole file. The first version of
   * this used a lazy `([\s\S]*?)` between the factory and the key, which ran
   * past the end of one call and picked up `'name'` from the NEXT statement's
   * `.eq('alias_type', 'name')` as the key. A pattern that can cross a call
   * boundary is not reading call sites; it is reading the file.
   */
  const calls: { body: string; key: string }[] = [];
  for (let at = src.indexOf('paged('); at !== -1; at = src.indexOf('paged(', at + 1)) {
    if (/[A-Za-z_]/.test(src[at - 1] ?? '')) continue;      // `unpaged(`, `wasPaged(`
    let depth = 0, end = at;
    for (let i = src.indexOf('(', at); i < src.length; i++) {
      if (src[i] === '(') depth++;
      else if (src[i] === ')') { depth--; if (depth === 0) { end = i; break; } }
    }
    const call = src.slice(at, end + 1);
    if (!call.includes('supabase.from(')) continue;         // the declaration itself
    const key = call.match(/,\s*'([a-z_]+)'\s*\)$/);
    assert.ok(key, `a paged read does not end with a key literal: ${call.slice(0, 90)}`);
    calls.push({ body: call, key: key[1] });
  }
  assert.ok(calls.length >= 9, `expected the nine paged reads, found ${calls.length}`);

  for (const { body, key } of calls) {
    const select = body.match(/\.select\('([^']*)'\)/);
    assert.ok(select, `a paged read has no .select(): ${body.slice(0, 80)}`);
    const columns = select[1].split(',').map(c => c.trim());
    assert.ok(columns.includes(key),
      `a read paged by "${key}" does not select it — the cursor would be read from a column `
      + `that is not in the payload. Columns: ${select[1]}`);
  }
});

test('CARRIED: the pager states which ceiling it exists to clear', () => {
  const s = read(PAGER);
  assert.ok(s.includes('export const SUPABASE_MAX_ROWS = 1000'),
    `${PAGER}: the cap must be one exported constant.`);
  assert.ok(/Content-Range/.test(s),
    `${PAGER}: name the header that reveals the truncation, or the next reader cannot verify it.`);
});

test('a bounded read may never ask for the cap or more', () => {
  // At or above the ceiling a full answer and a truncated one are the same
  // reply. `readBounded` refuses rather than guessing.
  const s = read(PAGER);
  assert.ok(/limit >= SUPABASE_MAX_ROWS/.test(s),
    `${PAGER}: readBounded must refuse a limit at or above the cap.`);
});

test('the truncation guard does NOT key on Content-Range', () => {
  /*
   * A response with no count requested ends in `/*` every single time,
   * truncated or not. Treating that as the signal would flag every healthy
   * read in the app, and a guard that cries wolf is switched off within a
   * week. The signal is the row count landing exactly on the ceiling.
   */
  const code = read(PAGER).split('\n').filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');
  assert.ok(!/content-range/i.test(code),
    `${PAGER}: the guard must not read Content-Range — it is /* on every normal response.`);
  assert.ok(/rows\.length === SUPABASE_MAX_ROWS/.test(code),
    `${PAGER}: the guard's signal is a row count landing exactly on the ceiling.`);
});

test('the backstop is WIRED IN, not merely exported', () => {
  /*
   * A guard nobody calls is a comment. These are the reads whose bound is a
   * fact about production rather than a number in the source -- an `.in(ids)`
   * or a date range whose size is decided by how many offerings the academy
   * runs -- so there is nothing in the file that would tell a reader they are
   * safe, and nothing that would tell them when they stopped being.
   */
  const src = read(REPO);
  assert.ok(/import \{[\s\S]*?guardUntruncated[\s\S]*?\} from '\.\/pageAll'/.test(src),
    `${REPO}: the truncation guard must be imported, or it guards nothing.`);
  assert.ok(/function checked<T>\([\s\S]*?guardUntruncated\(/.test(src),
    `${REPO}: checked() must delegate to guardUntruncated — one implementation of the rule.`);

  const sites = src.split('\n')
    .filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l))
    .filter(l => /\bchecked\(/.test(l)).length;
  assert.ok(sites >= 6,
    `${REPO}: expected the backstop on every data-dependent bound, found ${sites} call sites.`);
});

test('the two sanctioned shapes are the only ones the module offers', () => {
  // Named so that adding a third way to read a list is a deliberate act with
  // a spec to change, rather than a function somebody adds on a Tuesday.
  const s = read(PAGER);
  for (const shape of ['export async function pageAllByKey', 'export async function readBounded']) {
    assert.ok(s.includes(shape), `${PAGER}: ${shape} is the contract; it must exist.`);
  }
  assert.ok(s.includes('export function guardUntruncated'),
    `${PAGER}: the backstop is part of the contract too.`);
});
