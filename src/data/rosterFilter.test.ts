/**
 * The filter must show exactly what the cards say.
 *
 * Every case here is the same question asked twice: what word does the card
 * carry, and does the filter of that name return her. The one that matters
 * most is *Yet to mark* against a day the course does not run -- the card
 * says *Not expected* there, so the filter must not claim her.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ROSTER_FILTERS, ALL_MEMBERS, rosterFilterKey, rosterFilterLabel,
  rosterReading, matchesRosterFilter, narrowRoster, rosterFilterCounts,
  ROSTER_FILTER_OPTIONS, rosterFilterKeys, rosterFilterPhrase,
  type RosterScope,
} from './rosterFilter';
import type { AttendanceRow, Member } from './mock';

const MON = '2026-08-31';   // on the schedule below
const TUE = '2026-09-01';   // deliberately not
const WED = '2026-09-02';   // "today"

const member = (over: Partial<Member> = {}) => ({
  id: 'm1', name: 'Anitha Rajesh', course: 'Prenatal Flow', course_id: 'c1',
  weekdays: null, emails: [{ address: 'a@example.com', primary: true }],
  ...over,
}) as Member;

const row = (over: Partial<AttendanceRow> = {}): AttendanceRow => ({
  id: 'a1', member_id: 'm1', member: 'Anitha Rajesh',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  date: MON, time: '06:00', status: 'present', expected: true, minutes: 45, ...over,
});

const scope = (over: Partial<RosterScope> = {}): RosterScope => ({
  rows: [], dayIso: MON, weekdays: [1, 3, 5], todayIso: WED, ready: true, ...over,
});

/* ------------------------------------------------------ the four readings */

test('a recorded present reads Present', () => {
  assert.equal(rosterReading(member(), scope({ rows: [row()] })), 'present');
});

test('an extra reads Present, because that is what happened', () => {
  assert.equal(
    rosterReading(member(), scope({ rows: [row({ status: 'extra', expected: false })] })),
    'present');
});

test('a recorded absence reads Absent', () => {
  assert.equal(rosterReading(member(), scope({ rows: [row({ status: 'absent' })] })), 'absent');
});

test('expected with no row reads Yet to mark', () => {
  assert.equal(rosterReading(member(), scope()), 'unmarked');
});

test('not expected with no row reads Not expected, never Yet to mark', () => {
  assert.equal(rosterReading(member(), scope({ dayIso: TUE })), 'not-expected');
});

/* ------------------------------------------------------------ the filters */

test('every option is offered, All members first', () => {
  assert.deepEqual(ROSTER_FILTERS.map(f => f.label),
    [ALL_MEMBERS, 'Present', 'Absent', 'Yet to mark', 'No email']);
});

test('a label round-trips to its key and back', () => {
  for (const f of ROSTER_FILTERS) {
    assert.equal(rosterFilterKey(f.label), f.key);
    assert.equal(rosterFilterLabel(f.key), f.label);
  }
});

test('an unknown label falls back to All members rather than emptying the roster', () => {
  assert.equal(rosterFilterKey('Sideways'), 'all');
});

test('All members narrows nobody', () => {
  const list = [member(), member({ id: 'm2', emails: [] })];
  assert.equal(narrowRoster(list, 'all', scope()).length, 2);
});

test('Yet to mark leaves out the member the day does not run for', () => {
  const on = member();
  const off = member({ id: 'm2', weekdays: [2] });     // her own days, not the offering's
  const shown = narrowRoster([on, off], 'unmarked', scope());
  assert.deepEqual(shown.map(m => m.id), ['m1']);
});

test('Present returns only the marked-present member', () => {
  const present = member();
  const absent = member({ id: 'm2' });
  const rows = [row(), row({ id: 'a2', member_id: 'm2', status: 'absent' })];
  assert.deepEqual(
    narrowRoster([present, absent], 'present', scope({ rows })).map(m => m.id), ['m1']);
  assert.deepEqual(
    narrowRoster([present, absent], 'absent', scope({ rows })).map(m => m.id), ['m2']);
});

test('No email is about her record, not about the day', () => {
  const withAddress = member();
  const without = member({ id: 'm2', emails: [] });
  // a day the course does not run: her address is still missing
  const shown = narrowRoster([withAddress, without], 'no-email', scope({ dayIso: TUE }));
  assert.deepEqual(shown.map(m => m.id), ['m2']);
});

/* ------------------------------- the week that has not arrived (or failed) */

test('an unloaded week narrows nothing rather than emptying the roster', () => {
  const list = [member(), member({ id: 'm2', emails: [] })];
  assert.equal(narrowRoster(list, 'present', scope({ ready: false })).length, 2);
  assert.equal(rosterReading(member(), scope({ ready: false })), null);
});

test('No email still works with no week loaded', () => {
  const list = [member(), member({ id: 'm2', emails: [] })];
  assert.deepEqual(
    narrowRoster(list, 'no-email', scope({ ready: false })).map(m => m.id), ['m2']);
});

test('no day selected leaves every reading unanswered', () => {
  assert.equal(rosterReading(member(), scope({ dayIso: null })), null);
  assert.equal(matchesRosterFilter(member(), 'absent', scope({ dayIso: null })), true);
});

/* ------------------------------------------------------------- the counts */

test('the counts equal what picking that option returns', () => {
  const list = [
    member(),
    member({ id: 'm2' }),
    member({ id: 'm3', emails: [] }),
  ];
  const s = scope({ rows: [row(), row({ id: 'a2', member_id: 'm2', status: 'absent' })] });
  const counts = rosterFilterCounts(list, s);
  assert.equal(counts.all, 3);
  for (const key of ['present', 'absent', 'unmarked', 'no-email'] as const) {
    assert.equal(counts[key], narrowRoster(list, key, s).length, key);
  }
  assert.equal(counts.present, 1);
  assert.equal(counts.absent, 1);
  assert.equal(counts.unmarked, 1);
  assert.equal(counts['no-email'], 1);
});

test('an unloaded week reports no number rather than a zero', () => {
  const counts = rosterFilterCounts([member(), member({ id: 'm2', emails: [] })],
    scope({ ready: false }));
  assert.equal(counts.present, null);
  assert.equal(counts.absent, null);
  assert.equal(counts.unmarked, null);
  // the two that do not need the register still answer
  assert.equal(counts.all, 2);
  assert.equal(counts['no-email'], 1);
});

/* ------------------------------------------------------------ several ticks
 *
 * Appended when the filter became a checkbox list, on the requester's word:
 * "like in overview drop down multi selection is possible". Everything above
 * is the single-choice behaviour, which is the one-tick case of this and had
 * to go on holding.
 */

test('no ticks is every member, the way an empty selection reads', () => {
  const list = [member(), member({ id: 'm2', emails: [] })];
  assert.equal(narrowRoster(list, [], scope()).length, 2);
  assert.equal(matchesRosterFilter(member(), [], scope()), true);
});

test('two ticks are an OR, not an AND', () => {
  const present = member();
  const absent = member({ id: 'm2' });
  const later = member({ id: 'm3' });                    // expected, no row
  const rows = [row(), row({ id: 'a2', member_id: 'm2', status: 'absent' })];
  const shown = narrowRoster([present, absent, later], ['present', 'absent'], scope({ rows }));
  assert.deepEqual(shown.map(m => m.id), ['m1', 'm2']);
});

test('a reading and No email together take a member on either count', () => {
  const absent = member();
  const noAddress = member({ id: 'm2', emails: [] });    // expected, unmarked
  const neither = member({ id: 'm3' });                  // expected, unmarked
  const rows = [row({ status: 'absent' })];
  const shown = narrowRoster([absent, noAddress, neither],
    ['absent', 'no-email'], scope({ rows }));
  assert.deepEqual(shown.map(m => m.id), ['m1', 'm2']);
});

test('a member ticked twice over is listed once', () => {
  const noAddress = member({ id: 'm2', emails: [] });
  const rows = [row({ id: 'a2', member_id: 'm2', status: 'absent' })];
  const shown = narrowRoster([noAddress], ['absent', 'no-email'], scope({ rows }));
  assert.equal(shown.length, 1);
});

test('the tickable rows leave All members out — it is the empty selection', () => {
  assert.deepEqual(ROSTER_FILTER_OPTIONS.map(f => f.label),
    ['Present', 'Absent', 'Yet to mark', 'No email']);
  assert.equal(ROSTER_FILTER_OPTIONS.some(f => f.key === 'all'), false);
});

test('labels become keys, and All members never survives as one', () => {
  assert.deepEqual(rosterFilterKeys(['Present', 'No email']), ['present', 'no-email']);
  assert.deepEqual(rosterFilterKeys([ALL_MEMBERS, 'Absent']), ['absent']);
  assert.deepEqual(rosterFilterKeys([]), []);
});

test('the phrase says the OR out loud', () => {
  assert.equal(rosterFilterPhrase([], ALL_MEMBERS), ALL_MEMBERS);
  assert.equal(rosterFilterPhrase(['Present'], ALL_MEMBERS), 'Present');
  assert.equal(rosterFilterPhrase(['Present', 'Absent'], ALL_MEMBERS), 'Present or Absent');
  assert.equal(rosterFilterPhrase(['Present', 'Absent', 'No email'], ALL_MEMBERS),
    'Present, Absent or No email');
});

test('an unloaded week still narrows nothing, however many are ticked', () => {
  const list = [member(), member({ id: 'm2', emails: [] })];
  assert.equal(narrowRoster(list, ['present', 'absent'], scope({ ready: false })).length, 2);
});
