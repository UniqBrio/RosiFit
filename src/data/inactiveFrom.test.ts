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
} from './inactiveFrom';
import { isEligible, isFollowable, flagged } from './followup';
import { dayAttendance } from './dayAttendance';
import { hasJoinedBy } from './joined';
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
    'Inactive from 1 October 2026 — she is in the follow-up rule until then');
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
    'She joined on 1 March 2026, so she cannot become inactive before that');
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
  assert.equal(inactiveFromProblem('', '2026-03-01'), 'Choose the date she becomes inactive');
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
