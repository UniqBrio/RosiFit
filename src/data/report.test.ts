/**
 * Cases for the report's aggregation.
 *
 * Run: npx tsx --test src/data/report.test.ts
 *
 * These replace numbers that used to be typed into the screen. The failure
 * mode is not a crash: the report renders a percentage, somebody decides
 * which branch is slipping, and the percentage described a different
 * population -- or described "no sessions were scheduled" as "nobody came".
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reportRows, reportTotal, reportHeadline, reportMeta, REPORT_SCOPES,
} from './report';
import type { Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: 'RF-000001', name: 'Test Member',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—', ...over,
});

const SET: Member[] = [
  member({ id: '1', name: 'Divya',  course: 'Prenatal Flow',  branch: 'Coimbatore', expected: 4, attended: 3 }),
  member({ id: '2', name: 'Aarthi', course: 'Prenatal Flow',  branch: 'Coimbatore', expected: 6, attended: 6 }),
  member({ id: '3', name: 'Shazia', course: 'Postnatal Core', branch: 'Madurai',    expected: 6, attended: 0 }),
  member({ id: '4', name: 'Nithya', course: 'Postnatal Core', branch: 'Madurai',    expected: 0, attended: 0 }),
];

// ------------------------------------------------------------- the scopes
test('the Members scope is one row per member, in the order given', () => {
  assert.deepEqual(reportRows(SET, 'Members').map(r => r.label),
    ['Divya', 'Aarthi', 'Shazia', 'Nithya']);
});

test('the Courses scope groups and SUMS, it does not average percentages', () => {
  // Averaging 75% and 100% gives 87.5%. The truth is 9 of 10 = 90%: a member
  // on a shorter schedule must not carry the same weight as a full one.
  const pf = reportRows(SET, 'Courses').find(r => r.label === 'Prenatal Flow')!;
  assert.deepEqual({ ...pf }, { label: 'Prenatal Flow', expected: 10, attended: 9, pct: 90 });
});

test('the Branches scope groups by branch', () => {
  const rows = reportRows(SET, 'Branches');
  assert.deepEqual(rows.map(r => r.label), ['Coimbatore', 'Madurai']);
  assert.equal(rows.find(r => r.label === 'Madurai')!.expected, 6);
});

test('groups come back in a stable, name-sorted order', () => {
  // A report that reshuffles between two views cannot be compared with
  // itself, and the exported file would differ run to run.
  const once = reportRows(SET, 'Courses').map(r => r.label);
  const again = reportRows([...SET].reverse(), 'Courses').map(r => r.label);
  assert.deepEqual(once, again);
  assert.deepEqual(once, ['Postnatal Core', 'Prenatal Flow']);
});

// ------------------------------------------------ nothing expected is not 0%
test('nothing expected is null, NEVER zero per cent', () => {
  // The one that misleads: a course with no sessions this month and a course
  // everybody skipped are different facts, and 0% says the second about the
  // first.
  const rows = reportRows([member({ expected: 0, attended: 0 })], 'Members');
  assert.equal(rows[0].pct, null);
});

test('a group where nobody was expected is null too', () => {
  const rows = reportRows([
    member({ id: 'a', course: 'Empty', expected: 0, attended: 0 }),
    member({ id: 'b', course: 'Empty', expected: 0, attended: 0 }),
  ], 'Courses');
  assert.equal(rows[0].pct, null);
});

test('one expected member rescues a group from null', () => {
  const rows = reportRows([
    member({ id: 'a', course: 'Mixed', expected: 0, attended: 0 }),
    member({ id: 'b', course: 'Mixed', expected: 4, attended: 2 }),
  ], 'Courses');
  assert.equal(rows[0].pct, 50);
});

// -------------------------------------------------------------- the total
test('the headline total counts the whole set once', () => {
  // 4+6+6+0 expected, 3+6+0+0 attended -> 9/16
  assert.deepEqual(reportTotal(SET), { expected: 16, attended: 9, pct: 56 });
});

test('the total of an empty set is null, not a division by zero', () => {
  assert.deepEqual(reportTotal([]), { expected: 0, attended: 0, pct: null });
});

test('the total does not change with the scope shown', () => {
  // It is the same member rows either way. A total that moved when the tabs
  // moved would be two different counts wearing one label.
  const t = reportTotal(SET);
  for (const s of REPORT_SCOPES) {
    const summed = reportRows(SET, s).reduce((n, r) => n + r.attended, 0);
    assert.equal(summed, t.attended, `attended disagrees under ${s}`);
  }
});

// ------------------------------------------------------------- the wording
test('the headline is generated from the rows, never typed', () => {
  assert.equal(reportHeadline(reportRows(SET, 'Courses'), 'Courses'), 'Attendance across 2 courses');
  assert.equal(reportHeadline(reportRows(SET, 'Members'), 'Members'), 'Attendance across 4 members');
});

test('one of a thing is singular, and branches pluralise correctly', () => {
  const one = reportRows([member()], 'Branches');
  assert.equal(reportHeadline(one, 'Branches'), 'Attendance across 1 branch');
  const two = reportRows(SET, 'Branches');
  assert.equal(reportHeadline(two, 'Branches'), 'Attendance across 2 branches');
});

test('a row with no sessions says so in words rather than showing counts', () => {
  const [row] = reportRows([member({ expected: 0 })], 'Members');
  assert.equal(reportMeta(row, 'Members'), 'no sessions scheduled for her');
  const [group] = reportRows([member({ course: 'X', expected: 0 })], 'Courses');
  assert.equal(reportMeta(group, 'Courses'), 'no sessions scheduled in this period');
});

test('an ordinary row states both counts, so the ring is never the only signal', () => {
  const [row] = reportRows([member({ expected: 6, attended: 4 })], 'Members');
  assert.equal(reportMeta(row, 'Members'), '6 scheduled · 4 attended');
});
