/**
 * The chips must never offer a write the database will refuse.
 *
 * Two constraints on 0008 decide most of this file: absent_must_be_expected
 * (an absence is only a fact about somebody who was expected) and
 * extra_is_not_expected (turning up unexpected is 'extra', and never a miss).
 * A chip that offers Absent on a day she was never expected produces a
 * constraint violation with a constraint name for a message -- which is the
 * failure CP-003 exists to prevent, arriving from the other direction.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { dayAttendance, dayInWords } from './dayAttendance';
import type { AttendanceRow, Member } from './mock';

const MON = '2026-08-31';   // on the schedule below
const TUE = '2026-09-01';   // deliberately not
const WED = '2026-09-02';
const FUTURE = '2026-09-30';

const member = (over: Partial<Member> = {}):
  Pick<Member, 'id' | 'name' | 'course' | 'course_id' | 'weekdays'> => ({
  id: 'm1', name: 'Anitha Rajesh', course: 'Prenatal Flow', course_id: 'c1',
  weekdays: null, ...over,
});

const row = (over: Partial<AttendanceRow> = {}): AttendanceRow => ({
  id: 'a1', member_id: 'm1', member: 'Anitha Rajesh',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  date: MON, time: '06:00', status: 'present', expected: true, minutes: 45, ...over,
});

const ask = (over: Partial<Parameters<typeof dayAttendance>[0]> = {}) => dayAttendance({
  rows: [], member: member(), dayIso: MON, weekdays: [1, 3, 5], todayIso: WED, ...over,
});

test('a recorded present fills the Present chip', () => {
  const d = ask({ rows: [row()] });
  assert.equal(d.state, 'present');
  assert.equal(d.stored, 'present');
});

test('a recorded absent fills the Absent chip', () => {
  const d = ask({ rows: [row({ status: 'absent' })] });
  assert.equal(d.state, 'absent');
});

test('an EXTRA reads as present -- it is what happened, and the distinction is expectation', () => {
  const d = ask({ dayIso: TUE, rows: [row({ date: TUE, status: 'extra', expected: false })] });
  assert.equal(d.state, 'present');
  assert.equal(d.stored, 'extra');
  assert.equal(d.expected, false);
});

test('no row at all is unmarked, and both chips may be tapped on a class day', () => {
  const d = ask();
  assert.equal(d.state, 'unmarked');
  assert.equal(d.stored, null);
  assert.equal(d.canPresent, true);
  assert.equal(d.canAbsent, true);
  assert.equal(d.reason, null);
});

test('a day the course does not run offers Present only, with the reason', () => {
  const d = ask({ dayIso: TUE });
  assert.equal(d.expected, false);
  assert.equal(d.canPresent, true);
  assert.equal(d.canAbsent, false);
  // The day is named by dayInWords, not by a string this spec spells out --
  // the separator between weekday and date is the locale's business, and a
  // spec that asserts one pins the app to the machine it was written on.
  assert.ok((d.reason ?? '').includes(`was not expected on ${dayInWords(TUE)}`));
  assert.match(d.reason ?? '', /recorded as extra/);
});

test('a date still to come offers neither, and says why', () => {
  const d = ask({ dayIso: FUTURE });
  assert.equal(d.state, 'unmarked');
  assert.equal(d.canPresent, false);
  assert.equal(d.canAbsent, false);
  assert.match(d.reason ?? '', /has not happened yet/);
});

test('today is markable -- the boundary is "after today", not "not before today"', () => {
  const d = ask({ dayIso: WED, todayIso: WED });
  assert.equal(d.canPresent, true);
  assert.equal(d.canAbsent, true);
});

test('her OWN days override the offering the way member_schedules override offering_schedules', () => {
  // The course runs Mon/Wed/Fri; she is on Tuesdays only.
  const onTuesdays = { member: member({ weekdays: [2] }) };
  assert.equal(ask({ ...onTuesdays, dayIso: TUE }).canAbsent, true,
    'Tuesday is a class day for HER, so an absence is a fact that exists');
  assert.equal(ask({ ...onTuesdays, dayIso: MON }).canAbsent, false,
    'and Monday is not, however much the offering runs then');
});

test('a recorded row is the server\'s own answer about expectation, not the schedule', () => {
  // The schedule says Monday is a class day; the row says she was not
  // expected (a holiday, an override that has since changed, an all_enrolled
  // session). The ROW wins -- it is what the database will check against.
  const d = ask({ rows: [row({ status: 'extra', expected: false })] });
  assert.equal(d.expected, false);
  assert.equal(d.canAbsent, false);
});

test('another member\'s row is never read as hers', () => {
  const d = ask({ rows: [row({ member_id: 'm2', member: 'Someone Else' })] });
  assert.equal(d.state, 'unmarked');
});

test('a row for another day is never read as this day', () => {
  const d = ask({ rows: [row({ date: WED })] });
  assert.equal(d.state, 'unmarked');
});

test('with a row in two courses for one date, hers is the one that counts', () => {
  const d = ask({ rows: [
    row({ id: 'a2', course: 'Postnatal Core', course_id: 'c2', status: 'absent' }),
    row({ id: 'a3', course: 'Prenatal Flow', course_id: 'c1', status: 'present' }),
  ] });
  assert.equal(d.state, 'present');
});

test('dayInWords names the day the way the sentences do', () => {
  assert.equal(dayInWords(TUE), new Date(`${TUE}T00:00:00`)
    .toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }));
});
