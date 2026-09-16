/**
 * A member is active until the date she is not.
 *
 * The requester's own case, and the whole of what 0045 adds: "A member is
 * active today but wants to leave next month ... The member should remain
 * active until that date and become inactive from that date onward. Make
 * sure this works correctly with existing joined-date and active/inactive
 * logic, including historical date views and attendance."
 *
 * Four things are asserted here, and the fourth is the one that would rot
 * quietly:
 *   1. the boundary itself, on both sides and ON the day
 *   2. that a null date reads exactly as it did before 0045, because every
 *      row written before it carries one and none of them may move
 *   3. that the follow-up derivation reads the DAY, so the app and
 *      `follow_up_candidates()` go on agreeing (guardrail 1)
 *   4. that NOTHING about attendance or expectation moves with it -- the
 *      promise 0031 made and 0045 inherits
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  statusOn, isActiveOn, pendingInactiveFrom, statusNote,
  inactiveFromProblem, dateInWords, dayBefore,
  membersActiveOn, membersInactiveOn, leftEarlierNote,
  pendingActiveAgainFrom, activeAgainFromProblem,
} from './inactiveFrom';
import { isEligible, isFollowable, flagged } from './followup';
import { dayAttendance } from './dayAttendance';
import { hasJoinedBy, membersOnDay } from './joined';
import type { Member, FollowUpRule, AttendanceRow } from './mock';

const RULE: FollowUpRule = {
  source: 'global',
  weekly_enabled: true, weekly_threshold: 3,
  consecutive_enabled: true, consecutive_threshold: 3,
  combination: 'OR',
};

/** Somebody who fires BOTH conditions, so nothing but the status and the day
 *  can be the reason she is left out below. */
const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null, status: 'active',
  expected: 6, attended: 0, missed: 6, streak: 6, last: '—',
  joinedOn: '2026-03-01', joined: 'Mar 2026', ...over,
});

/** The requester's example, dated: active today, leaving on 1 October. */
const LEAVING = member({ status: 'inactive', inactiveFrom: '2026-10-01' });
const TODAY = '2026-09-07';

/* ------------------------------------------------------ the boundary itself */

test('the day before the date, she is active', () => {
  assert.equal(statusOn(LEAVING, '2026-09-30'), 'active');
  assert.equal(isActiveOn(LEAVING, '2026-09-30'), true);
});

test('ON the date she is inactive — the date is the first day off, not the last day on', () => {
  assert.equal(statusOn(LEAVING, '2026-10-01'), 'inactive');
  assert.equal(isActiveOn(LEAVING, '2026-10-01'), false);
});

test('and every day after it', () => {
  assert.equal(statusOn(LEAVING, '2027-01-01'), 'inactive');
});

test('today — the whole point — she is still active, with nobody having to remember', () => {
  assert.equal(isActiveOn(LEAVING, TODAY), true);
});

test('a stated Active is active on every day, whatever date is on the record', () => {
  // The date is cleared when the pick moves back to Active (0045), so this is
  // a row nothing should be able to produce -- and if one ever is, it must not
  // take somebody off the register that nobody marked.
  const odd = member({ status: 'active', inactiveFrom: '2026-01-01' });
  assert.equal(statusOn(odd, '2026-12-31'), 'active');
});

/* ------------------------------------- a null date: every pre-0045 row */

test('no date on record means the status applies on every day — how every row before 0045 reads', () => {
  const off = member({ status: 'inactive' });
  assert.equal(statusOn(off, '2020-01-01'), 'inactive');
  assert.equal(statusOn(off, TODAY), 'inactive');
  assert.equal(statusOn(off, '2030-01-01'), 'inactive');
});

test('null and undefined are the same absence — a producer may omit the field', () => {
  assert.equal(statusOn({ status: 'inactive' }, TODAY), 'inactive');
  assert.equal(statusOn({ status: 'inactive', inactiveFrom: null }, TODAY), 'inactive');
});

test("'paused' is read the same way as inactive, dated the same way too", () => {
  const paused = member({ status: 'paused', inactiveFrom: '2026-10-01' });
  assert.equal(isActiveOn(paused, TODAY), true);
  assert.equal(isActiveOn(paused, '2026-10-01'), false);
});

/* ------------------------------------------------ what the screens may say */

test('a date still ahead of her is pending; one that has arrived is not', () => {
  assert.equal(pendingInactiveFrom(LEAVING, TODAY), '2026-10-01');
  assert.equal(pendingInactiveFrom(LEAVING, '2026-10-01'), null);
  assert.equal(pendingInactiveFrom(member({ status: 'inactive' }), TODAY), null);
  assert.equal(pendingInactiveFrom(member(), TODAY), null);
});

test('the note dates the word, in the tense the day makes true', () => {
  assert.equal(statusNote(LEAVING, TODAY),
    'Inactive from 1 October 2026 — in the follow-up rule until then');
  assert.equal(statusNote(LEAVING, '2026-10-02'), 'Inactive since 1 October 2026');
  // Nothing to add: an active member, and a member off the register with no
  // date on record. A note reading "since —" would invent a day.
  assert.equal(statusNote(member(), TODAY), null);
  assert.equal(statusNote(member({ status: 'inactive' }), TODAY), null);
});

test('dates are written one way, locale-free, so the form and its refusal quote one string', () => {
  assert.equal(dateInWords('2026-10-01'), '1 October 2026');
  assert.equal(dayBefore('2026-10-01'), '2026-09-30');
  // Across a month AND a year boundary, which is where a naive setDate slips.
  assert.equal(dayBefore('2027-01-01'), '2026-12-31');
  assert.equal(dayBefore('2026-03-01'), '2026-02-28');
});

/* -------------------------------------------------------------- validation */

test('a departure before her arrival is refused, with both dates in the sentence', () => {
  assert.equal(
    inactiveFromProblem('2026-02-01', '2026-03-01'),
    'The member joined on 1 March 2026, so cannot become inactive before that');
});

test('the joining day itself is allowed — she may leave the day she arrived', () => {
  assert.equal(inactiveFromProblem('2026-03-01', '2026-03-01'), null);
});

test('a FUTURE date is the request, so it is never the refusal', () => {
  assert.equal(inactiveFromProblem('2030-01-01', '2026-03-01'), null);
});

test('a PAST date is allowed — recording a departure nobody entered is the same act', () => {
  assert.equal(inactiveFromProblem('2026-04-01', '2026-03-01'), null);
});

test('no joining date on record is not a reason to refuse a date', () => {
  // members.joined_on is nullable (0006) and the bulk import may leave it
  // null (0029), so there is nothing to be before.
  assert.equal(inactiveFromProblem('2020-01-01', null), null);
});

test('a blank and a half-typed date are named as what they are', () => {
  assert.equal(inactiveFromProblem('', '2026-03-01'), 'Choose the date they become inactive');
  assert.equal(inactiveFromProblem('2026-1', '2026-03-01'),
    '“2026-1” is not a date — write it as YYYY-MM-DD');
});

/* --------------------------------------- the follow-up derivation reads it */

test('she is still followed up while the date is ahead of her', () => {
  assert.equal(isFollowable(LEAVING, TODAY), true);
  assert.equal(isEligible(LEAVING, RULE, TODAY), true);
});

test('and stops being followed up on the day, with nobody pressing anything', () => {
  assert.equal(isFollowable(LEAVING, '2026-10-01'), false);
  assert.equal(isEligible(LEAVING, RULE, '2026-10-01'), false);
});

test('the flagged set moves with the day, so the dashboard count and the send draft do', () => {
  const set = [member({ id: 'a', name: 'Staying' }), { ...LEAVING, id: 'b', name: 'Leaving' }];
  assert.deepEqual(flagged(set, RULE, {}, TODAY).map(m => m.name), ['Staying', 'Leaving']);
  assert.deepEqual(flagged(set, RULE, {}, '2026-10-01').map(m => m.name), ['Staying']);
});

test('her figures are not rewritten on the day — she is excluded, not zeroed', () => {
  // The same promise memberStatus.test.ts holds for the undated column: being
  // off the register stops the academy writing to her; it does not edit her
  // attendance.
  const off = { ...LEAVING };
  assert.equal(isEligible(off, RULE, '2026-10-01'), false);
  assert.equal(off.missed, 6);
  assert.equal(off.attended, 0);
  assert.equal(off.expected, 6);
});

/* ------------------------------------ attendance and expectation do NOT move
 *
 * 0031 says it and 0045 inherits it: inactive means "stop following her up".
 * Which sessions expect her is offering schedule -> enrolment window ->
 * member override (0007), and `members.status` is not one of those three. So
 * a date on her status must leave the chips saying exactly what they said. */

const row = (over: Partial<AttendanceRow> = {}): AttendanceRow => ({
  id: 'a1', member_id: 'm', member: 'Test Member',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  date: '2026-10-05', time: '06:00', status: 'present', expected: true,
  minutes: 45, ...over,
});

test('a session AFTER her date still expects her — status dates follow-up, never enrolment', () => {
  const after = dayAttendance({
    rows: [], member: LEAVING, dayIso: '2026-10-05',
    weekdays: [1, 2, 3, 4, 5], todayIso: '2026-10-06',
  });
  assert.equal(after.expected, true, 'her offering runs that Monday and she is still enrolled');
  assert.equal(after.canAbsent, true, 'so an absence on it is still a thing that can be recorded');
});

test('and her attendance after the date is read exactly as recorded', () => {
  const after = dayAttendance({
    rows: [row()], member: LEAVING, dayIso: '2026-10-05',
    weekdays: [1, 2, 3, 4, 5], todayIso: '2026-10-06',
  });
  assert.equal(after.state, 'present');
  assert.equal(after.stored, 'present');
});

test('an inactive date changes nothing about a day BEFORE it either', () => {
  const plain = member();
  const before = (m: Member) => dayAttendance({
    rows: [row({ date: '2026-09-07' })], member: m, dayIso: '2026-09-07',
    weekdays: [1, 2, 3, 4, 5], todayIso: TODAY,
  });
  assert.deepEqual(before(LEAVING), before(plain));
});

/* --------------------------------------------- and the joining date still holds
 *
 * The two ends of a membership, and they are answered by two modules that
 * must not start overlapping: `joined.ts` decides whether she was on the
 * register at all on a day, this one decides what her status was. A member
 * shown for a day is one who had joined by it; her status on that day is
 * this module's answer, whatever it is. */

test('the two ends of the window compose: joined in March, inactive from October', () => {
  assert.equal(hasJoinedBy(LEAVING, '2026-02-28'), false, 'not yet a member in February');
  assert.equal(hasJoinedBy(LEAVING, '2026-03-01'), true, 'a member from the day she joined');
  assert.equal(isActiveOn(LEAVING, '2026-03-01'), true);
  assert.equal(isActiveOn(LEAVING, '2026-09-30'), true);
  assert.equal(isActiveOn(LEAVING, '2026-10-01'), false);
});

test('being inactive never removes her from a day-scoped roster — she is off follow-up, not gone', () => {
  // The distinction the whole design rests on. `joined.ts` narrows a
  // date-scoped view to members who existed then; a departure does not narrow
  // it at all, because her history stays readable and her card goes on
  // reporting the sessions she was marked at.
  assert.equal(hasJoinedBy(LEAVING, '2026-12-01'), true);
});

/* ----------------------------------- off the roster for a day she was off
 *
 * "when i set member as inactive from 1st oct then when i click on date card
 * of 1st oct that member should not show up" -- the requester, 08-Sep-2026.
 *
 * The pill already read Inactive on that day, which was right and was not
 * what was asked: the day's roster is who the academy HAD that day, so from
 * the 1st she is not on it at all. This is the mirror image of `joined.ts` --
 * the two ends of one membership window -- and these assert they compose. */

test('she is on the day-scoped roster right up to the day before', () => {
  assert.deepEqual(membersActiveOn([LEAVING], '2026-09-30').length, 1);
});

test('and off it ON the day, which is the whole of the request', () => {
  assert.deepEqual(membersActiveOn([LEAVING], '2026-10-01'), []);
  assert.deepEqual(membersActiveOn([LEAVING], '2026-12-25'), []);
});

test('an active member is never narrowed away', () => {
  const set = [member({ id: 'a' }), LEAVING];
  assert.deepEqual(membersActiveOn(set, '2026-10-01').map(m => m.id), ['a']);
});

test('a member off the register with NO date is off every day', () => {
  // Every row written before 0045 carries no date, and this is what those
  // rows mean: inactive, full stop.
  assert.deepEqual(membersActiveOn([member({ status: 'inactive' })], '2020-01-01'), []);
});

test('no day selected narrows nothing — an unselected strip must not empty the roster', () => {
  const set = [member({ id: 'a' }), LEAVING, member({ id: 'c', status: 'inactive' })];
  assert.equal(membersActiveOn(set, null).length, 3);
});

test('the two ends compose: joined in March, gone from October', () => {
  const day = (d: string) => membersActiveOn(membersOnDay([LEAVING], d), d).length;
  assert.equal(day('2026-02-28'), 0, 'not a member yet');
  assert.equal(day('2026-03-01'), 1, 'a member from the day she joined');
  assert.equal(day('2026-09-30'), 1, 'still on the register the day before');
  assert.equal(day('2026-10-01'), 0, 'off it from the date onward');
});

test('the omission is STATED, never a count that drops rows in silence', () => {
  assert.equal(leftEarlierNote(1, 'Thu 1 Oct'),
    '1 member was inactive on Thu 1 Oct and is listed under Inactive below. They are still on the course.');
  assert.equal(leftEarlierNote(3, 'Thu 1 Oct'),
    '3 members were inactive on Thu 1 Oct and are listed under Inactive below. They are still on the course.');
  assert.equal(leftEarlierNote(0, 'Thu 1 Oct'), null, 'nothing hidden, nothing said');
});

/* ------------------------------------- and the section they are listed in
 *
 * "in attendnace section show inactive members at bottom" -- the requester,
 * 16-Sep-2026. The day's rows are unchanged (the 08-Sep rule above still
 * holds); what is new is that the members that rule takes out are gathered
 * underneath instead of vanishing, so the pill that puts them back is
 * reachable from the day somebody is looking at.
 *
 * Asserted as a SPLIT, not as a second list: every member of the day is in
 * exactly one of the two halves, whatever the day. */

/** The same three the roster half is asserted against, given ids of their
 *  own: one active, one dated off from 1 October, one off every day. */
const SPLIT = [
  member({ id: 'a' }),
  member({ id: 'b', status: 'inactive', inactiveFrom: '2026-10-01' }),
  member({ id: 'c', status: 'inactive' }),
];

test('the inactive half is exactly what the roster half left behind', () => {
  assert.deepEqual(membersInactiveOn(SPLIT, '2026-10-01').map(m => m.id), ['b', 'c'],
    'the dated one is off from the 1st, and the undated one is off every day');
  assert.deepEqual(membersInactiveOn(SPLIT, '2026-09-30').map(m => m.id), ['c'],
    'the day before, only the undated one is off');
});

test('the two halves partition the day — nobody in both, nobody in neither', () => {
  const set = SPLIT;
  for (const day of ['2026-03-01', '2026-09-30', '2026-10-01', '2026-12-25']) {
    const on = membersActiveOn(set, day).map(m => m.id);
    const off = membersInactiveOn(set, day).map(m => m.id);
    assert.deepEqual([...on, ...off].sort(), ['a', 'b', 'c'], `every member accounted for on ${day}`);
    assert.deepEqual(on.filter(id => off.includes(id)), [], `nobody is in both halves on ${day}`);
  }
});

test('no day selected: nothing was dropped, so the section has nothing to show', () => {
  // The mirror of `membersActiveOn(set, null)` returning all three. An
  // unselected strip narrows nothing, and a section listing members the
  // roster above is already listing would print each of them twice.
  assert.deepEqual(membersInactiveOn(SPLIT, null), []);
});

test('a departure is pending only while the day on screen is BEFORE it', () => {
  // Read against today it contradicted the pill beside it: on the 1 Oct card
  // she drew an "Inactive" pill and, under it, "Inactive from 1 October" --
  // a promise about a departure that had already happened on that day.
  assert.equal(pendingInactiveFrom(LEAVING, '2026-09-30'), '2026-10-01');
  assert.equal(pendingInactiveFrom(LEAVING, '2026-10-01'), null);
  assert.equal(pendingInactiveFrom(LEAVING, '2026-10-02'), null);
});

test('being hidden from a day changes nothing about her attendance on it', () => {
  // The roster stops listing her; the register is untouched. Her enrolment is
  // open, so the session still expects her -- which is exactly why the screen
  // states the omission instead of quietly shrinking.
  const after = dayAttendance({
    rows: [row()], member: LEAVING, dayIso: '2026-10-05',
    weekdays: [1, 2, 3, 4, 5], todayIso: '2026-10-06',
  });
  assert.equal(after.expected, true);
  assert.equal(after.state, 'present');
});

/* ============================================ the way BACK on, dated (0072)
 *
 * "allow user to select active from date in pop up and by default the date
 * should be todays date" -- the requester, 16-Sep-2026.
 *
 * `active_again_from` is the mirror of the column above: status stays the
 * STATED answer and this date says from when a stated ACTIVE applies. These
 * assert the boundary both ways round, that the return date is read FIRST
 * (the order is the whole of the rule), and that every row written before
 * 0072 -- which carries neither date, or only the old one -- reads exactly as
 * it always did. */

/** Back on the register from 1 October, stated active. */
const RETURNING = member({ status: 'active', activeAgainFrom: '2026-10-01' });

test('before the return date the member is OFF the register, though stated active', () => {
  assert.equal(statusOn(RETURNING, '2026-09-30'), 'inactive');
  assert.equal(isActiveOn(RETURNING, '2026-09-30'), false);
});

test('ON the return date they are back — the first day on, not the last day off', () => {
  assert.equal(statusOn(RETURNING, '2026-10-01'), 'active');
  assert.equal(isActiveOn(RETURNING, '2026-10-01'), true);
  assert.equal(statusOn(RETURNING, '2026-12-25'), 'active', 'and every day after it');
});

test('the return date is read FIRST — the order is the whole of the rule', () => {
  // The row STATES active, so a derivation asking "is it active?" before
  // looking at the date answers 'active' for every day including the ones
  // before the member came back. That is the defect 0045 removed from the
  // other direction, arriving from this one.
  assert.equal(statusOn(RETURNING, '2026-01-01'), 'inactive',
    'a stated active with a future return date is NOT active today');
});

test('a backdated return reads active from the day it names', () => {
  const back = member({ status: 'active', activeAgainFrom: '2026-09-01' });
  assert.equal(statusOn(back, '2026-08-31'), 'inactive', 'the day before, still off');
  assert.equal(statusOn(back, '2026-09-01'), 'active');
});

test('every row written before 0072 reads exactly as it always did', () => {
  // No return date at all: the one-tap pill's meaning, and what every
  // existing row carries.
  assert.equal(statusOn(member({ status: 'active' }), '2020-01-01'), 'active');
  assert.equal(statusOn(member({ status: 'inactive' }), '2020-01-01'), 'inactive');
  // And 0045's pair goes on meaning what it meant.
  assert.equal(statusOn(LEAVING, '2026-09-30'), 'active');
  assert.equal(statusOn(LEAVING, '2026-10-01'), 'inactive');
});

test('a return still to come is stated, and only while it is still to come', () => {
  assert.equal(pendingActiveAgainFrom(RETURNING, '2026-09-30'), '2026-10-01');
  assert.equal(pendingActiveAgainFrom(RETURNING, '2026-10-01'), null, 'the day it arrives, nothing is pending');
  assert.equal(pendingActiveAgainFrom(RETURNING, '2026-10-02'), null);
  assert.equal(pendingActiveAgainFrom(member({ status: 'active' }), TODAY), null,
    'a member with no return date has nothing coming');
  assert.equal(pendingActiveAgainFrom(LEAVING, TODAY), null,
    'and a stated INACTIVE row never carries one -- the database will not hold it');
});

test('the card can say which is coming without the two ever contradicting', () => {
  // The database allows each date only beside its own side of the pill, so a
  // record carrying one carries no other. Both lines can be drawn from one
  // record and never both appear.
  assert.equal(pendingInactiveFrom(RETURNING, '2026-09-30'), null);
  assert.equal(pendingActiveAgainFrom(LEAVING, '2026-09-30'), null);
});

test('the note under the word dates the return, in both tenses', () => {
  assert.equal(statusNote(RETURNING, '2026-09-30'),
    'Active from 1 October 2026 — out of the follow-up rule until then');
  assert.equal(statusNote(RETURNING, '2026-10-02'), 'Active since 1 October 2026');
  assert.equal(statusNote(member({ status: 'active' }), TODAY), null,
    'an undated active row still says nothing, exactly as before');
});

test('a return before the joining date is refused, in a sentence', () => {
  assert.equal(activeAgainFromProblem('2026-03-01', '2026-03-01'), null, 'the joining day itself is fine');
  assert.equal(activeAgainFromProblem('2026-02-28', '2026-03-01'),
    'The member joined on 1 March 2026, so cannot go back on the register before that');
  assert.equal(activeAgainFromProblem('', '2026-03-01'), 'Choose the date they go back on the register');
  assert.match(activeAgainFromProblem('the 5th', '2026-03-01') ?? '', /is not a date/);
});

test('a PAST return date is allowed, for the reason its twin allows one', () => {
  // Recording a return somebody forgot to enter last month is the same act as
  // scheduling one for next month.
  assert.equal(activeAgainFromProblem('2026-04-01', '2026-03-01'), null);
  assert.equal(activeAgainFromProblem('2099-01-01', '2026-03-01'), null, 'and so is a future one');
});

test('a dated return narrows the day roster, so the section below picks them up', () => {
  const set = [member({ id: 'a' }), member({ id: 'b', status: 'active', activeAgainFrom: '2026-10-01' })];
  assert.deepEqual(membersActiveOn(set, '2026-09-30').map(m => m.id), ['a']);
  assert.deepEqual(membersInactiveOn(set, '2026-09-30').map(m => m.id), ['b'],
    'and they are listed under Inactive until the day they are back');
  assert.deepEqual(membersActiveOn(set, '2026-10-01').map(m => m.id), ['a', 'b']);
  assert.deepEqual(membersInactiveOn(set, '2026-10-01'), []);
});
