import test from 'node:test';
import assert from 'node:assert/strict';
import { installNodeStubs, makeAcademy, fakeServer, type Req } from './fakePostgrest.testkit';

/**
 * HOW MANY REQUESTS A SCREEN MAY COST -- the real data layer, the real
 * supabase-js client and the real shared fetch against the fake network,
 * counted on the wire (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md,
 * RC-4 and RC-12).
 *
 * Run: npx tsx --test src/data/requestBudget.test.ts
 *
 * Budgets are CEILINGS pinned at the measured figure, so a change that adds a
 * read to a screen is a red test and a deliberate decision, never a silent
 * regression. Measured before the catalogue and the shared names read:
 * Attendance 85 (three tables of names fetched by id in chunks of 150), Home
 * 54, Members 27. After: Attendance 27, Home 50, Members 25. What remains is
 * the per-period metrics pages and the empty terminating page of every paged
 * read, which later phases own.
 */
const setNetwork = installNodeStubs();
const uid = (p: string, i: number) => `${p}${String(i).padStart(8, '0')}-0000-4000-8000-000000000000`;

type Period = { from: string; to: string; label: string };
type Repo = {
  fetchMembers(p: Period): Promise<unknown[]>;
  fetchRules(): Promise<unknown>;
  fetchFilterOptions(): Promise<unknown>;
  fetchCourses(): Promise<unknown>;
  fetchBucketMetrics(b: Period[]): Promise<unknown[]>;
  fetchNotifications(): Promise<unknown[]>;
  fetchAttendance(p: Period): Promise<unknown[]>;
  fetchUnsubscribedAddresses(): Promise<unknown[]>;
  fetchCourseDayRows(c: string, d: string, b: string | null): Promise<unknown[]>;
};
const REPOSITORY = './repository.ts';
const PERIOD = './period.ts';
const CLIENT = '../lib/supabase.ts';

async function world(members = 1644) {
  const repo = await import(REPOSITORY) as Repo;
  const { currentWeek, periodBuckets } = await import(PERIOD) as { currentWeek(): Period; periodBuckets(p: Period): Period[] };
  const { supabase } = await import(CLIENT) as { supabase: { rpc(name: string, args: object): Promise<unknown> } };
  const tables = makeAcademy(members);
  const week = currentWeek();
  // a timetable, a follow-up rule, and three completed sessions this week with a record per member
  tables.offering_schedules = [{ id: uid('s', 1), offering_id: uid('o', 1), weekdays: [1, 3, 5], effective_from: '2025-09-01', effective_to: null }];
  tables.follow_up_config = [{ id: 1, weekly_enabled: true, weekly_threshold: 2, consecutive_enabled: true, consecutive_threshold: 3, is_active: true }];
  tables.course_follow_up_config = []; tables.email_batches = []; tables.email_messages = []; tables.pin_reset_requests = [];
  tables.sessions = []; tables.attendance_records = [];
  let n = 0;
  for (let d = 0; d < 3; d++) {
    const sid = uid('x', d);
    tables.sessions.push({ id: sid, offering_id: uid('o', 1), session_date: week.from, start_time: '06:00', status: 'completed', expected_count: 0, deleted_at: null });
    for (const m of tables.members) tables.attendance_records.push({ id: uid('r', n++), session_id: sid, member_id: m.id, status: 'present', expected: true, minutes_in_call: 45 });
  }
  const server = fakeServer(tables, { latencyMs: 1 });
  setNetwork(server.fetch as typeof fetch);
  await supabase.rpc('spec_reset', {});       // a write: every shared read starts cold
  server.log.length = 0;
  return { repo, server, week, buckets: periodBuckets(week) };
}

const wire = (log: Req[]) => log.filter(r => r.method !== 'OPTIONS');
const count = (log: Req[], path: string) => wire(log).filter(r => r.path === `/rest/v1/${path}`).length;

test('Attendance (week): the names come from the shared names read, not by id in chunks -- 27 requests, not 85', async () => {
  const { repo, server, week } = await world();
  await Promise.all([repo.fetchAttendance(week), repo.fetchFilterOptions(), repo.fetchUnsubscribedAddresses(), repo.fetchNotifications()]);
  const log = server.log;
  assert.ok(wire(log).length <= 27, `${wire(log).length} requests, budget 27`);
  assert.equal(wire(log).filter(r => r.search.toString().includes('in.(')).filter(r => r.path.endsWith('/members')).length, 0,
    'no member names fetched by id list');
  assert.equal(count(log, 'courses'), 1, 'the catalogue reads courses once');
  assert.equal(count(log, 'branches'), 1, 'the catalogue reads branches once');
});

test('Home: one catalogue for the rules, the filters, the register and the tray -- 50 requests, not 54', async () => {
  const { repo, server, week, buckets } = await world();
  await Promise.all([repo.fetchMembers(week), repo.fetchRules(), repo.fetchFilterOptions(), repo.fetchBucketMetrics(buckets), repo.fetchNotifications()]);
  const log = server.log;
  assert.ok(wire(log).length <= 50, `${wire(log).length} requests, budget 50`);
  assert.equal(count(log, 'courses'), 1, 'courses read in ONE shape, once');
  assert.equal(count(log, 'branches'), 1);
  assert.equal(count(log, 'course_offerings'), 1);
  assert.equal(count(log, 'offering_schedules'), 1);
});

test('Members: 25 requests, not 27', async () => {
  const { repo, server, week } = await world();
  await Promise.all([repo.fetchMembers(week), repo.fetchRules(), repo.fetchFilterOptions()]);
  assert.ok(wire(server.log).length <= 25, `${wire(server.log).length} requests, budget 25`);
});

test('the course day joins the names and the catalogue the roster already reads: no id chunks, no offerings -> course -> branches chain', async () => {
  const { repo, server, week } = await world();
  await Promise.all([repo.fetchMembers(week), repo.fetchCourses(), repo.fetchCourseDayRows(uid('c', 1), week.from, null)]);
  const log = server.log;
  assert.equal(count(log, 'courses'), 1);
  assert.equal(count(log, 'members'), 2, 'the names read once (two pages; the 644-row page ends the read), shared with the register');
  assert.equal(wire(log).filter(r => r.path.endsWith('/members') && r.search.toString().includes('in.(')).length, 0);
});

test('three mounted headers cost one notifications chain', async () => {
  const { repo, server } = await world();
  await Promise.all([repo.fetchNotifications(), repo.fetchNotifications(), repo.fetchNotifications()]);
  assert.equal(count(server.log, 'email_batches'), 1);
  assert.equal(count(server.log, 'sessions'), 1);
});
