import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { installNodeStubs, makeAcademy, fakeServer, type Req } from './fakePostgrest.testkit';
import { memberReadsStarted } from './memberStore';

// ONE MEMBER CHANGE, ONE SHARED MEMBER REFRESH
// (requests/2026-10-03-one-shared-member-refresh.md).
//
// The REAL repository, the REAL supabase-js client and the REAL shared fetch
// (T-406), against a fake network that counts what goes out. Each "mounted
// screen" below is the call its hook makes when the member bus fires --
// useMembers and useFollowUp call fetchMembers(period), useBucketMetrics calls
// fetchBucketMetrics(periodBuckets(period)) (src/data/hooks.ts) -- started in
// the same tick, as React runs their effects.

const setNetwork = installNodeStubs();
const OFFERING = 'o00000001-0000-4000-8000-000000000000';

// The data layer is imported by a variable path, as unsubscribeHandler.test.ts
// does: the spec type-check runs without the DOM types src/lib/supabase.ts
// needs, so only the shapes used here are named.
type Period = { from: string; to: string; label: string };
type Member = { id: string; name: string };
type Repo = {
  fetchMembers(p: Period): Promise<Member[]>;
  fetchBucketMetrics(b: Period[]): Promise<unknown[]>;
  createMember(input: Record<string, unknown>): Promise<{ id: string }>;
  confirmMemberListed(id: string, p?: Period): Promise<boolean>;
};
const REPOSITORY = './repository.ts';
const PERIOD = './period.ts';
const CLIENT = '../lib/supabase.ts';

async function load() {
  const repo = await import(REPOSITORY) as Repo;
  const { currentWeek, periodBuckets } = await import(PERIOD) as {
    currentWeek(): Period; periodBuckets(p: Period): Period[] };
  const { supabase } = await import(CLIENT) as {
    supabase: { rpc(name: string, args: object): Promise<unknown> } };
  return { repo, currentWeek, periodBuckets, supabase };
}

/** A fresh academy and network, with every shared read cleared by a write. */
async function freshWorld(members = 1640) {
  const { repo, currentWeek, periodBuckets, supabase } = await load();
  const server = fakeServer(makeAcademy(members), { latencyMs: 2 });
  setNetwork(server.fetch as typeof fetch);
  await supabase.rpc('spec_reset', {});        // a write: clears T-406's reads and moves the member reads on
  server.log.length = 0;
  const week = currentWeek();
  return { repo, server, week, buckets: periodBuckets(week) };
}

const firstPages = (log: Req[], table: string) =>
  log.filter(r => r.path === `/rest/v1/${table}` && !r.search.toString().includes('gt.')).length;
const reads = (log: Req[]) => log.filter(r => r.method === 'GET' || r.path.endsWith('member_period_metrics_page'));
const duplicates = (log: Req[]) => {
  const keys = reads(log).map(r => `${r.method} ${r.path}?${r.search} ${r.body}`);
  return keys.length - new Set(keys).size;
};

test('Test 1 -- useMembers, useFollowUp and useBucketMetrics after membersChanged: the member list is read ONCE', async () => {
  const { repo, server, week, buckets } = await freshWorld();
  await repo.createMember({ full_name: 'Asha', offering_id: OFFERING, joined_on: null, aliases: [], emails: [], weekdays: null });
  server.log.length = 0;
  const before = memberReadsStarted('members:');

  await Promise.all([
    repo.fetchMembers(week),                      // useMembers
    repo.fetchMembers(week),                      // useFollowUp
    repo.fetchBucketMetrics(buckets),             // useBucketMetrics
  ]);

  assert.equal(memberReadsStarted('members:') - before, 1, 'fetchMembers ran its read once for both list consumers');
  assert.equal(firstPages(server.log, 'members'), 1, 'one member-list read on the wire');
  assert.equal(duplicates(server.log), 0, 'no request went out twice');
});

test('Test 2 -- three asks while a read is in flight: one network read, every caller gets the same list', async () => {
  const { repo, server, week } = await freshWorld();
  const before = memberReadsStarted('members:');
  const a = repo.fetchMembers(week);
  const b = repo.fetchMembers(week);
  const c = repo.fetchMembers(week);
  assert.equal(a, b);
  assert.equal(b, c);
  const [la, lb, lc] = await Promise.all([a, b, c]);
  assert.equal(la, lb);
  assert.equal(lb, lc);
  assert.equal(la.length, 1640);
  assert.equal(memberReadsStarted('members:') - before, 1);
  assert.equal(firstPages(server.log, 'members'), 1);
  assert.equal(firstPages(server.log, 'member_emails'), 1);
});

test('Test 3 -- after createMember returns its id, the shared member list contains it', async () => {
  const { repo, week } = await freshWorld();
  const { id } = await repo.createMember({ full_name: 'Bhavana Rao', offering_id: OFFERING, joined_on: null,
    aliases: ['Bhavana R'], emails: ['bhavana@x.test'], weekdays: null });
  assert.ok(id);
  // The edit form's check and the screens' refresh, started together, share one read.
  const [listed, list] = await Promise.all([repo.confirmMemberListed(id), repo.fetchMembers(week)]);
  assert.equal(listed, true);
  const found = list.find(m => m.id === id);
  assert.ok(found, 'the new member is in the list every screen shows');
  assert.equal(found!.name, 'Bhavana Rao');
});

test('Test 4 -- one add with Home, Courses, Members and the form mounted: one member refresh, nothing sent twice', async () => {
  const { repo, server, week, buckets } = await freshWorld();
  const mounted = () => [
    repo.fetchMembers(week), repo.fetchBucketMetrics(buckets),   // Home
    repo.fetchMembers(week),                                     // Courses
    repo.fetchMembers(week),                                     // Members
    repo.fetchMembers(week),                                     // the edit form's roster
  ];
  await Promise.all(mounted());
  server.log.length = 0;
  const before = memberReadsStarted('members:');

  const { id } = await repo.createMember({ full_name: 'Chitra', offering_id: OFFERING, joined_on: null,
    aliases: [], emails: ['chitra@x.test'], weekdays: null });
  const confirmed = repo.confirmMemberListed(id);
  const results = await Promise.all(mounted());

  assert.equal(await confirmed, true);
  assert.equal(memberReadsStarted('members:') - before, 1, 'four screens and the form\'s check: ONE member read');
  assert.equal(firstPages(server.log, 'members'), 1);
  assert.equal(duplicates(server.log), 0);
  assert.ok((results[0] as { id: string }[]).some(m => m.id === id));
  // 1,640 members = two pages per table; the second, shorter page ends the
  // keyset read (pageAllShortPage.test.ts, 06-Oct-2026 -- an empty third
  // page used to be asked).
  assert.equal(server.log.filter(r => r.path === '/rest/v1/members').length, 2);
});

test('Test 5 -- a failed refresh: every screen sees the failure, nothing retries, the check says "could not read", a later read recovers', async () => {
  const { repo, server, week } = await freshWorld();
  const { id } = await repo.createMember({ full_name: 'Deepa', offering_id: OFFERING, joined_on: null,
    aliases: [], emails: [], weekdays: null });
  server.failing.add('member_emails');
  server.log.length = 0;

  const screen = repo.fetchMembers(week);
  const check = repo.confirmMemberListed(id);
  await assert.rejects(screen, /member addresses/);
  await assert.rejects(check, /member addresses/, 'a failed read is NOT reported as "not in the list"');
  await new Promise(r => setTimeout(r, 50));
  assert.equal(server.log.filter(r => r.path === '/rest/v1/member_emails').length, 1, 'no automatic retry');

  server.failing.clear();
  const list = await repo.fetchMembers(week);
  assert.ok(list.some(m => m.id === id), 'the next read recovers and shows the member');
});

test('Test 6 -- a read begun before the add is never handed to a screen asking after it', async () => {
  const { repo, week } = await freshWorld();
  const before = memberReadsStarted('members:');
  const older = repo.fetchMembers(week);                          // A: a refresh already running
  const { id } = await repo.createMember({ full_name: 'Esha', offering_id: OFFERING, joined_on: null,
    aliases: [], emails: [], weekdays: null });
  const newer = repo.fetchMembers(week);                          // B: asked after the add
  assert.notEqual(older, newer);
  const [, b] = await Promise.all([older, newer]);
  // Whether A happened to see the member depends on when its pages were
  // answered; B's answer does not, because B began after the commit.
  assert.ok(b.some(m => m.id === id), 'B was read after the create committed');
  assert.equal(memberReadsStarted('members:') - before, 2, 'B started its own read rather than joining A');
});

test('an unrelated write during a refresh does not split the screens into separate reads', async () => {
  const { repo, server, week } = await freshWorld();
  const { supabase } = await load();
  const screens = [repo.fetchMembers(week), repo.fetchMembers(week), repo.fetchMembers(week)];
  await new Promise(r => setTimeout(r, 3));
  await supabase.rpc('unrelated_write', {});
  await Promise.all(screens);
  assert.equal(firstPages(server.log, 'members'), 1);
  assert.equal(duplicates(server.log), 0);
});

test('the attendance figures for a week are read once for the member list and the bars together', async () => {
  const { repo, server, week, buckets } = await freshWorld();
  const before = memberReadsStarted('metrics:');
  await Promise.all([repo.fetchMembers(week), repo.fetchMembers(week), repo.fetchBucketMetrics(buckets)]);
  // The week once (for the list) plus each bucket once -- never per caller.
  assert.equal(memberReadsStarted('metrics:') - before, 1 + buckets.length);
  assert.equal(duplicates(server.log), 0);
});

// ---------------------------------------------------------------- wiring
const ROOT = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('no screen goes round the shared read: the read itself has exactly one caller', () => {
  const repo = read('src/data/repository.ts');
  assert.equal(repo.match(/readMembers\(/g)?.length, 2, 'defined once, called once (by fetchMembers)');
  assert.match(repo, /return sharedMemberRead\(`members:\$\{period\.from\}\/\$\{period\.to\}`, \(\) => readMembers\(period\)\);/);
  // The three readers of the period figures (pinned by periodMetrics*.test.ts)
  // each go through the shared per-period read.
  assert.equal(repo.match(/sharedPeriodMetrics(<MetricRow>)?\((period|b|w), \(\) => paged/g)?.length, 3);
  for (const dir of ['app', 'src/components']) {
    const walk = (d: string): string[] => fs.readdirSync(path.join(ROOT, d), { withFileTypes: true })
      .flatMap(e => e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
    for (const f of walk(dir)) assert.doesNotMatch(read(f), /readMembers|member_period_metrics_page/, f);
  }
});

test('every change moves the shared reads on: both buses, and every write the client sends', () => {
  const repo = read('src/data/repository.ts');
  assert.match(repo, /function membersChanged\(\): void \{[\s\S]{0,300}invalidateMemberReads\(\);\s*for \(const listener of memberListeners\)/);
  assert.match(repo, /function attendanceChanged\(\): void \{[\s\S]{0,300}invalidateMemberReads\(\);\s*for \(const listener of attendanceListeners\)/);
  assert.match(read('src/lib/supabase.ts'), /onWrite: invalidateMemberReads/);
  assert.match(read('src/lib/sharedFetch.ts'), /const clearAll = \(\) => \{ entries\.clear\(\); config\.onWrite\?\.\(\); \};/);
});

test('the add form checks the new member is listed, and says which problem it was', () => {
  const src = read('app/member/edit.tsx');
  assert.match(src, /const \{ id \} = await createMember\(/);
  assert.match(src, /void confirmMemberListed\(id\)\.then\(/);
  assert.match(src, /is not in the member list yet/);
  assert.match(src, /the member list could not refresh/);
  assert.doesNotMatch(src, /setTimeout|setInterval/, 'no delays, no polling');
});

/* -------------------------------------------------------------------------
 * ONE REGISTER READ FOR EVERY PERIOD (RC-2, docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md).
 *
 * The Overview, the weekly review and Reports ask for different periods, and
 * the shared read joined only callers asking for the SAME one -- so three
 * mounted screens still read the six register tables three times after one
 * Save. Only the attendance figures depend on the period; the register is
 * now read once per generation and joined to each caller's own figures.
 */
test('Test 6 -- the week and the month readers share ONE register read; only the metrics differ', async () => {
  const { repo, server, week } = await freshWorld();
  const { resolvePeriod } = await import(PERIOD) as { resolvePeriod(c: { key: string }): Period };
  const month = resolvePeriod({ key: 'This month' });
  server.log.length = 0;

  await Promise.all([repo.fetchMembers(week), repo.fetchMembers(month)]);

  for (const table of ['members', 'member_emails', 'member_aliases', 'member_stats', 'member_enrollments', 'member_schedules']) {
    assert.equal(firstPages(server.log, table), 1, `${table} read once for two periods`);
  }
  const metrics = server.log.filter(r => r.path.endsWith('member_period_metrics_page') && !r.body.includes('"p_after_member_id":"'));
  assert.equal(metrics.length, 2, 'the attendance figures are read once per period');
  assert.equal(duplicates(server.log), 0, 'no request went out twice');
});

test('Test 7 -- after a Save, five mounted screens asking for three periods cost ONE register read', async () => {
  const { repo, server, week, buckets } = await freshWorld();
  const { resolvePeriod } = await import(PERIOD) as { resolvePeriod(c: { key: string }): Period };
  const month = resolvePeriod({ key: 'This month' });
  await repo.createMember({ full_name: 'Asha', offering_id: OFFERING, joined_on: null, aliases: [], emails: [], weekdays: null });
  server.log.length = 0;
  const before = memberReadsStarted('register');

  await Promise.all([
    repo.fetchMembers(week), repo.fetchBucketMetrics(buckets),   // Overview
    repo.fetchMembers(week),                                      // Members
    repo.fetchMembers(week),                                      // weekly review
    repo.fetchMembers(month),                                     // Reports
    repo.fetchMembers(week),                                      // course detail
    repo.confirmMemberListed('x'),
  ]);

  assert.equal(memberReadsStarted('register') - before, 1, 'the register was read once');
  assert.equal(firstPages(server.log, 'members'), 1, 'one member-list read on the wire');
  assert.equal(duplicates(server.log), 0, 'no request went out twice');
});
