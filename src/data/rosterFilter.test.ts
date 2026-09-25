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
  rosterReading, matchesRosterFilter, narrowRoster, rosterFilterCounts, isRecordFact,
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

/* COPY-LOCK, RE-PINNED 24-Sep-2026 (T-025). The whole job of this assertion
   is to pin the dropdown's exact wording and order. The academy asked for two
   more options by name -- "in dropdown show two options as bounced and
   unsubscribed" -- so changing this list IS the intent of the work, which is
   the one case the append-only rule leaves open. The two Active/Inactive
   labels were already in the tree and already failing this lock; they are
   pinned here too rather than left for a third session. Nothing is removed,
   nothing is skipped, no matcher is loosened: only the literal changes. */
test('every option is offered, All members first', () => {
  assert.deepEqual(ROSTER_FILTERS.map(f => f.label),
    [ALL_MEMBERS, 'Present', 'Absent', 'Yet to mark', 'No email',
      'Bounced', 'Unsubscribed', 'Active', 'Inactive']);
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

/* COPY-LOCK, RE-PINNED 24-Sep-2026 (T-025) — the same list, minus the one
   row that is the empty selection. Re-pinned for the reason above. */
test('the tickable rows leave All members out — it is the empty selection', () => {
  assert.deepEqual(ROSTER_FILTER_OPTIONS.map(f => f.label),
    ['Present', 'Absent', 'Yet to mark', 'No email',
      'Bounced', 'Unsubscribed', 'Active', 'Inactive']);
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

/* ------------------------------- Bounced and Unsubscribed, the two the
   academy asked the dropdown for.

   They are facts about the RECORD, like No email and unlike the four
   readings: true whether or not the week has loaded, and on a day the course
   does not run. And they are answered by `emailIssueFor`, the same derivation
   the Email issues section below the roster draws, so the filter and that
   section can never show different people (guardrail 1).

   FAIL-FIRST, observed against the pre-change `rosterFilter.ts` (restored
   byte-identical afterwards): 6 of these 10 cases failed -- `matchesOne` had
   no branch for either key, so `narrowRoster([bounced, ...], ['bounced'])`
   returned `[]` where 'm1' was expected, `rosterFilterKey('Bounced')` returned
   'all', and both counts came back `undefined`. The other 4 are the NEGATIVE
   cases -- no address, a usable address, a spam report -- which a filter that
   matches nobody passes for the wrong reason; they are here to pin what the
   two keys must NOT claim, and they earn their place against the change, not
   against its absence. See TEST_SUMMARY.md. */

const addr = (address: string, status: Member['emails'][number]['status']) =>
  [{ address, primary: true, status }] as Member['emails'];

test('Bounced returns the bounced member and nobody else', () => {
  const bounced = member({ id: 'm1', emails: addr('b@example.com', 'bounced') });
  const optedOut = member({ id: 'm2', emails: addr('u@example.com', 'unsubscribed') });
  const fine = member({ id: 'm3', emails: addr('f@example.com', 'unknown') });
  const none = member({ id: 'm4', emails: [] });

  assert.deepEqual(
    narrowRoster([bounced, optedOut, fine, none], ['bounced'], scope()).map(m => m.id),
    ['m1']);
});

test('Unsubscribed returns the opted-out member and nobody else', () => {
  const bounced = member({ id: 'm1', emails: addr('b@example.com', 'bounced') });
  const optedOut = member({ id: 'm2', emails: addr('u@example.com', 'unsubscribed') });
  const fine = member({ id: 'm3', emails: addr('f@example.com', 'unknown') });

  assert.deepEqual(
    narrowRoster([bounced, optedOut, fine], ['unsubscribed'], scope()).map(m => m.id),
    ['m2']);
});

test('a member with NO address is neither — that is No email', () => {
  const none = member({ id: 'm4', emails: [] });
  assert.equal(matchesRosterFilter(none, ['bounced'], scope()), false);
  assert.equal(matchesRosterFilter(none, ['unsubscribed'], scope()), false);
  assert.equal(matchesRosterFilter(none, ['no-email'], scope()), true,
    'the three answer different questions and must not overlap');
});

test('a member who still holds a usable address is neither', () => {
  const both = member({ id: 'm5', emails: [
    { address: 'good@example.com', primary: true, status: 'unknown' },
    { address: 'dead@example.com', primary: false, status: 'bounced' },
  ] });
  assert.equal(matchesRosterFilter(both, ['bounced'], scope()), false,
    'their email can still be used, so the filter about unusable addresses must not claim them');
});

test('a re-added address is still found by the filter it was suppressed under (RC-107)', () => {
  // A live row at 'unknown' whose address was bounced before it -- the bulk
  // import can make this, and `status` alone cannot see it.
  const readded = member({
    id: 'm6', emails: addr('r@example.com', 'unknown'),
    suppressedBefore: [{ address: 'r@example.com', status: 'bounced' }],
  });
  assert.equal(matchesRosterFilter(readded, ['bounced'], scope()), true);
  assert.equal(matchesRosterFilter(readded, ['unsubscribed'], scope()), false);
});

test('an opt-out outranks a bounce, so the member is under one filter only', () => {
  const both = member({
    id: 'm7', emails: addr('x@example.com', 'bounced'),
    suppressedBefore: [{ address: 'x@example.com', status: 'unsubscribed' }],
  });
  assert.equal(matchesRosterFilter(both, ['unsubscribed'], scope()), true,
    'the filter that most constrains the academy wins — never offer "fix the address" '
    + 'to somebody who asked not to be written to');
  assert.equal(matchesRosterFilter(both, ['bounced'], scope()), false);
});

test('they narrow while the week is still loading — they are not readings of a day', () => {
  const bounced = member({ id: 'm1', emails: addr('b@example.com', 'bounced') });
  const fine = member({ id: 'm3', emails: addr('f@example.com', 'unknown') });
  assert.deepEqual(
    narrowRoster([bounced, fine], ['bounced'], scope({ ready: false })).map(m => m.id),
    ['m1'], 'exactly as No email does, and for the same reason');
  assert.deepEqual(
    narrowRoster([bounced, fine], ['bounced'], scope({ dayIso: TUE })).map(m => m.id),
    ['m1'], 'and on a day the course does not run');
});

test('the counts count the same members the filter returns', () => {
  const roster = [
    member({ id: 'm1', emails: addr('b@example.com', 'bounced') }),
    member({ id: 'm2', emails: addr('u@example.com', 'unsubscribed') }),
    member({ id: 'm3', emails: addr('c@example.com', 'complained') }),
    member({ id: 'm4', emails: addr('f@example.com', 'unknown') }),
    member({ id: 'm5', emails: [] }),
  ];
  const counts = rosterFilterCounts(roster, scope());
  assert.equal(counts.bounced, narrowRoster(roster, ['bounced'], scope()).length);
  assert.equal(counts.unsubscribed, narrowRoster(roster, ['unsubscribed'], scope()).length);
  assert.equal(counts.bounced, 1);
  assert.equal(counts.unsubscribed, 1);
  assert.equal(counts['no-email'], 1);
});

test('a spam report is listed in the section but is NOT one of the two filters', () => {
  // Deliberate: the academy asked for two options. A member who reported spam
  // is still shown under Spam Reported in the section, and is not swept into
  // Bounced or Unsubscribed, which would say something untrue about them.
  const spam = member({ id: 'm3', emails: addr('c@example.com', 'complained') });
  assert.equal(matchesRosterFilter(spam, ['bounced'], scope()), false);
  assert.equal(matchesRosterFilter(spam, ['unsubscribed'], scope()), false);
  // The key is not even in the union: TypeScript refuses `key === 'complained'`
  // here, which is the guard doing its job one level up from this assertion.
  assert.equal(ROSTER_FILTERS.some(f => f.label === 'Spam Reported'), false);
});

test('the two new labels round-trip like every other', () => {
  assert.equal(rosterFilterKey('Bounced'), 'bounced');
  assert.equal(rosterFilterKey('Unsubscribed'), 'unsubscribed');
  assert.deepEqual(rosterFilterKeys(['Bounced', 'Unsubscribed']), ['bounced', 'unsubscribed']);
  assert.equal(rosterFilterPhrase(['Bounced', 'Unsubscribed'], ALL_MEMBERS),
    'Bounced or Unsubscribed');
});

/* --------------------------- `isRecordFact` — the distinction three things
   depend on, and which was a hand-kept list in the screen until 24-Sep-2026.

   FAIL-FIRST: `isRecordFact` did not exist, so every case below failed on
   import — `(0 , import_rosterFilter.isRecordFact) is not a function`. The
   BEHAVIOUR it fixes was observed on the screen's own line first: the old
   `showKeys.some(k => k !== 'no-email' && k !== 'active' && k !== 'inactive')`
   returns true for 'bounced', which is what made the screen print "the roster
   is not narrowed to Unsubscribed yet" over a roster narrowed to exactly
   that. */

test('every record fact is one the filter answers ABOVE the ready gate', () => {
  const bounced = member({ id: 'm1', emails: addr('b@example.com', 'bounced') });
  const optedOut = member({ id: 'm2', emails: addr('u@example.com', 'unsubscribed') });
  const none = member({ id: 'm3', emails: [] });
  const roster = [bounced, optedOut, none];

  // The claim `isRecordFact` makes, proved rather than asserted: each of these
  // narrows with NO register behind it.
  for (const [key, expected] of [
    ['no-email', ['m3']], ['bounced', ['m1']], ['unsubscribed', ['m2']],
  ] as const) {
    assert.equal(isRecordFact(key), true, `${key} is a fact about the record`);
    assert.deepEqual(narrowRoster(roster, [key], scope({ ready: false })).map(m => m.id),
      [...expected], `${key} must narrow while the week is still loading`);
  }
  assert.equal(isRecordFact('active'), true);
  assert.equal(isRecordFact('inactive'), true);
});

test('every reading of the day is NOT a record fact', () => {
  for (const key of ['present', 'absent', 'unmarked'] as const) {
    assert.equal(isRecordFact(key), false,
      `${key} reads the day's register, so a screen must say it cannot narrow yet`);
    assert.deepEqual(
      narrowRoster([member()], [key], scope({ ready: false })).map(m => m.id), ['m1'],
      'and it genuinely does not narrow — the whole roster comes back');
  }
});

test('the predicate covers the whole union, so growing it cannot go unnoticed', () => {
  // Every key the dropdown offers is classified one way or the other. A new
  // key added to ROSTER_FILTERS without a decision here fails this case
  // rather than quietly landing on the wrong side of the `ready` gate.
  const READINGS = new Set(['present', 'absent', 'unmarked']);
  for (const f of ROSTER_FILTERS) {
    if (f.key === 'all') continue;
    assert.equal(isRecordFact(f.key), !READINGS.has(f.key),
      `${f.key} is unclassified: decide whether it reads the day or the record`);
  }
});
