// T-041 (RV-05, B:F-03, C:RF-03): every `.in()` read in send-followups is
// chunked, paged, and throws on error.
//
// WHAT GOES WRONG WITHOUT IT
//   An `.in(ids)` filter travels in the query string. The gateway in front of
//   PostgREST refuses an over-long request head with a bare `400` -- no rows,
//   no PostgREST error body, nothing naming the limit. Measured on this project
//   16-Sep-2026: 640 ids through, 660 refused (RC-045).
//
//   Six of the eight reads then DISCARDED that error, so the refusal arrived as
//   an empty map. Empty is not "no such member": it is "the read failed". The
//   loop cannot tell the difference and classifies the recipient from the gap --
//   `Member not found`, or a send from the deployment address instead of the
//   course's own. A batch that reads as completed, recipient by recipient, off
//   a read that never happened.
//
//   The reply has a second ceiling. PostgREST caps every response at
//   `db-max-rows`, 1,000 here, and answers `200` with `error: null`. At 1,001
//   recipients the member read comes back one row short and looks perfect.
//
// 1,001 IS THE NUMBER ON PURPOSE. It is one past the reply cap and seven chunks
// of 150 on the request side, so a single fixture exercises both ceilings at
// once. The academy passed 1,000 live members on 12-Sep-2026.

import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import { loadSendData } from './load.ts';

type Row = Record<string, unknown>;

/** ids the fixture uses, shaped like the real ones so chunk arithmetic is real */
function ids(n: number, prefix: string): string[] {
  return Array.from({ length: n }, (_, i) => `${prefix}-${String(i).padStart(6, '0')}`);
}

/**
 * A fake PostgREST that enforces BOTH ceilings the real one has:
 *   · a chunk carrying more than `maxIds` ids is refused the way the gateway
 *     refuses it -- an error, no rows;
 *   · a reply is truncated at `maxRows` and reports no error at all.
 */
function fakeAdmin(tables: Record<string, Row[]>, opts: {
  maxIds?: number;
  maxRows?: number;
  failTable?: string;
} = {}) {
  const maxIds = opts.maxIds ?? 660;
  const maxRows = opts.maxRows ?? 1000;
  const requests: Array<{ table: string; count: number }> = [];

  function builder(table: string) {
    let inCol: string | null = null;
    let inIds: string[] = [];
    let gtCol: string | null = null;
    let gtVal: unknown;
    let lim = Infinity;

    const self = {
      select: () => self,
      eq: () => self,
      is: () => self,
      order: () => self,
      in(column: string, values: string[]) { inCol = column; inIds = values; return self; },
      gt(column: string, value: unknown) { gtCol = column; gtVal = value; return self; },
      limit(n: number) { lim = n; return self; },
      then<R>(resolve: (v: { data: Row[] | null; error: { message?: string } | null }) => R): PromiseLike<R> {
        requests.push({ table, count: inIds.length });

        if (opts.failTable === table) {
          return Promise.resolve(resolve({ data: null, error: { message: `${table} is unavailable` } }));
        }
        if (inIds.length > maxIds) {
          // the gateway's bare 400: no rows, and an error that names nothing
          return Promise.resolve(resolve({ data: null, error: { message: 'Bad Request' } }));
        }

        let rows = (tables[table] ?? []).filter((r) => (inCol ? inIds.includes(String(r[inCol])) : true));
        if (gtCol) rows = rows.filter((r) => String(r[gtCol!]) > String(gtVal));
        rows.sort((a, b) => (gtCol ? String(a[gtCol!]).localeCompare(String(b[gtCol!])) : 0));

        // the reply ceiling: silent truncation, 200, error null
        const capped = rows.slice(0, Math.min(lim, maxRows));
        return Promise.resolve(resolve({ data: capped, error: null }));
      },
    };
    return self;
  }

  return { admin: { from: (t: string) => builder(t) }, requests };
}

/** 1,001 members, each enrolled in one of 3 offerings across 2 courses. */
function fixture(n: number) {
  const memberIds = ids(n, 'mem');
  const offeringIds = ids(3, 'off');
  const courseIds = ids(2, 'crs');
  return {
    memberIds,
    tables: {
      members: memberIds.map((id) => ({ id, full_name: `Member ${id}` })),
      member_enrollments: memberIds.map((id, i) => ({
        member_id: id, offering_id: offeringIds[i % 3], status: 'active',
      })),
      course_offerings: offeringIds.map((id, i) => ({
        id, course_id: courseIds[i % 2], branch_id: 'brn-000000',
      })),
      courses: courseIds.map((id) => ({ id, name: `Course ${id}` })),
      branches: [{ id: 'brn-000000', name: 'Main' }],
      course_communication: courseIds.map((id) => ({ course_id: id, from_email: `${id}@example.test` })),
      member_emails: memberIds.map((id) => ({
        id: `eml-${id}`, member_id: id, email: `${id}@example.test`, status: 'ok', is_primary: true,
      })),
      member_stats: memberIds.map((id) => ({ member_id: id, current_streak: 0, last_present_date: null })),
    },
  };
}

Deno.test('1,001 recipients: every member is loaded, past both ceilings', async () => {
  const { memberIds, tables } = fixture(1001);
  const { admin } = fakeAdmin(tables);

  const data = await loadSendData(admin, memberIds);

  // THE DEFECT: a member missing from any map is classified from the gap.
  assertEquals(data.memberById.size, 1001, 'every member row must be loaded');
  assertEquals(data.emailByMember.size, 1001, 'every primary address must be loaded');
  assertEquals(data.statsByMember.size, 1001, 'every stats row must be loaded');
  assertEquals(data.enrollByMember.size, 1001, 'every enrolment must be loaded');

  // not one id may be absent
  const missing = memberIds.filter((id) => !data.memberById.has(id));
  assertEquals(missing, []);
});

Deno.test('no request carries more ids than the gateway accepts', async () => {
  const { memberIds, tables } = fixture(1001);
  const { admin, requests } = fakeAdmin(tables);

  await loadSendData(admin, memberIds);

  const worst = Math.max(...requests.map((r) => r.count));
  assertEquals(worst <= 150, true, `a request carried ${worst} ids; the chunk size is 150`);
});

Deno.test('a refused read throws rather than yielding an empty map', async () => {
  const { memberIds, tables } = fixture(1001);
  const { admin } = fakeAdmin(tables, { failTable: 'member_emails' });

  // Empty is not "nobody has an address" - it is "the read failed", and the
  // loop cannot tell the two apart. It must not be given the chance.
  await assertRejects(() => loadSendData(admin, memberIds));
});

Deno.test('every table that can fail, fails loudly', async () => {
  const { memberIds, tables } = fixture(200);
  for (const table of [
    'members', 'member_enrollments', 'course_offerings', 'courses',
    'branches', 'course_communication', 'member_emails', 'member_stats',
  ]) {
    const { admin } = fakeAdmin(tables, { failTable: table });
    let threw = false;
    try {
      await loadSendData(admin, memberIds);
    } catch {
      threw = true;
    }
    assertEquals(threw, true, `a failed ${table} read must throw`);
  }
});

Deno.test('a small send still works, and asks for nothing it does not need', async () => {
  const { memberIds, tables } = fixture(2);
  const { admin, requests } = fakeAdmin(tables);

  const data = await loadSendData(admin, memberIds);
  assertEquals(data.memberById.size, 2);
  assertEquals(requests.every((r) => r.count <= 150), true);
});
