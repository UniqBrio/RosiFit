/**
 * The joining date, on the three dates that matter: before, on, after.
 *
 * Run: npx tsx --test src/data/joined.test.ts
 *
 * The defect these were written against: a member added on 7 Sep 2026 was
 * listed on the roster for 6 Sep with an attendance reading, and counted in a
 * report for August. Every case below is one date-scoped view asking "was she
 * here yet", and the last group is the half of the answer that is just as
 * important -- that this narrows date-scoped views and NEVER the register.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasJoinedBy, joinedAfter, membersOnDay, membersInPeriod, joinedLaterNote,
} from './joined';
import { enrolledIn } from './course';

/** The requester's own dates. */
const BEFORE = '2026-09-06';
const JOINED = '2026-09-07';
const AFTER  = '2026-09-08';

const her = { id: 'new', joinedOn: JOINED };
const old = { id: 'old', joinedOn: '2026-03-14' };
const undated = { id: 'undated', joinedOn: null };

/* ------------------------------------------------------- the three dates */

test('a member added on 7 Sep is NOT there on 6 Sep', () => {
  assert.equal(hasJoinedBy(her, BEFORE), false);
  assert.equal(joinedAfter(her, BEFORE), true);
});

test('a member added on 7 Sep IS there on 7 Sep -- the boundary is inclusive', () => {
  // `expected_members_for_session` (0007) uses session_date >= effective_from,
  // and create_member opens the enrolment on the joining day itself. A day
  // she could be marked present by the database is a day she is on screen.
  assert.equal(hasJoinedBy(her, JOINED), true);
  assert.equal(joinedAfter(her, JOINED), false);
});

test('a member added on 7 Sep is there on 8 Sep and every day after', () => {
  assert.equal(hasJoinedBy(her, AFTER), true);
  assert.equal(hasJoinedBy(her, '2027-01-01'), true);
});

test('any date before she joined hides her, not just the day before', () => {
  assert.equal(hasJoinedBy(her, '2026-08-31'), false);
  assert.equal(hasJoinedBy(her, '2025-12-31'), false);
});

test('a member who joined months ago is on every day since', () => {
  assert.equal(hasJoinedBy(old, BEFORE), true);
  assert.equal(hasJoinedBy(old, JOINED), true);
});

test('a date is compared as a string, never through a Date -- no timezone', () => {
  // A Date built from '2026-09-07' is midnight UTC, which is 06-Sep in the
  // Americas: she would vanish for a day for anybody west of Greenwich.
  // Crossing a month and a year end is where a naive comparison breaks.
  assert.equal(hasJoinedBy({ joinedOn: '2026-10-01' }, '2026-09-30'), false);
  assert.equal(hasJoinedBy({ joinedOn: '2026-01-01' }, '2025-12-31'), false);
  assert.equal(hasJoinedBy({ joinedOn: '2025-12-31' }, '2026-01-01'), true);
});

/* --------------------------------------------------------- a day's roster */

test('the roster for 6 Sep leaves out the member added on the 7th', () => {
  const shown = membersOnDay([old, her], BEFORE);
  assert.deepEqual(shown.map(m => m.id), ['old']);
});

test('the roster for 7 Sep has her on it', () => {
  assert.deepEqual(membersOnDay([old, her], JOINED).map(m => m.id), ['old', 'new']);
});

test('no day selected narrows nothing -- an unselected strip is not an empty roster', () => {
  assert.deepEqual(membersOnDay([old, her], null).map(m => m.id), ['old', 'new']);
});

test('a day that is not a date narrows nothing', () => {
  // The day travels in a URL on this app, so it is untrusted input. Refusing
  // to narrow is the safe answer: showing an extra member beats an empty
  // roster nobody can explain.
  assert.deepEqual(membersOnDay([old, her], 'yesterday').map(m => m.id), ['old', 'new']);
  assert.deepEqual(membersOnDay([old, her], '2026-9-7').map(m => m.id), ['old', 'new']);
});

/* --------------------------------------------------------------- a period */

test('a report for August leaves out the member who joined in September', () => {
  const august = { from: '2026-08-01', to: '2026-08-31' };
  assert.deepEqual(membersInPeriod([old, her], august).map(m => m.id), ['old']);
});

test('the period that CONTAINS her joining day keeps her -- she was in part of it', () => {
  // She joined on the Monday of a week that ends on the Sunday. Her sessions
  // from Monday on are in that week's figures, so leaving her out would make
  // the ring and the rows disagree with the attendance they are counted from.
  const week = { from: '2026-09-07', to: '2026-09-13' };
  assert.deepEqual(membersInPeriod([old, her], week).map(m => m.id), ['old', 'new']);
  const spanning = { from: '2026-09-01', to: '2026-09-30' };
  assert.deepEqual(membersInPeriod([old, her], spanning).map(m => m.id), ['old', 'new']);
});

test('a period ending the day before she joined leaves her out', () => {
  assert.deepEqual(
    membersInPeriod([old, her], { from: '2026-08-31', to: BEFORE }).map(m => m.id), ['old']);
});

/* ----------------------------------------------- a member with no date on record */

test('no joining date on record NEVER hides her', () => {
  // members.joined_on is nullable (0006) and the bulk import may leave it
  // null (0029). Reading a missing date as "she joined later than every date
  // you can ask about" would empty the register of everybody imported before
  // the column was being filled in.
  assert.equal(hasJoinedBy(undated, BEFORE), true);
  assert.equal(hasJoinedBy({ joinedOn: undefined }, BEFORE), true);
  assert.equal(hasJoinedBy({}, BEFORE), true);
  assert.equal(hasJoinedBy({ joinedOn: '   ' }, BEFORE), true);
  assert.deepEqual(membersOnDay([undated, her], BEFORE).map(m => m.id), ['undated']);
});

test('a joining date that is not a date is read as no date, not as a hidden member', () => {
  assert.equal(hasJoinedBy({ joinedOn: 'Mar 2026' }, BEFORE), true);
  assert.equal(hasJoinedBy({ joinedOn: '07/09/2026' }, BEFORE), true);
});

/* ------------------------------------------------------------- the sentence */

test('the roster says how many it left out, and that they are still on the course', () => {
  assert.equal(joinedLaterNote(1, 'Sun 6 Sep 2026'),
    '1 member joined after Sun 6 Sep 2026 and is not listed for it. She is still on the course.');
  assert.equal(joinedLaterNote(3, 'Sun 6 Sep 2026'),
    '3 members joined after Sun 6 Sep 2026 and are not listed for it. They are still on the course.');
});

test('nothing left out, nothing said', () => {
  assert.equal(joinedLaterNote(0, 'Sun 6 Sep 2026'), null);
});

/* ------------------------------- the half that must NOT change: the register */

test('the register itself is never narrowed -- there is no date to narrow it by', () => {
  // The guarantee behind the requester's "without hiding the student from the
  // normal course member list": the only way to lose a member here is to pass
  // a date, and the member list passes none.
  const everyone = [old, her, undated];
  assert.deepEqual(membersOnDay(everyone, null), everyone);
});

/* --------------- the two narrowings the course roster actually composes */

test('the course roster for a day is enrolled-in-THIS-course AND joined by it', () => {
  // What app/course/[id].tsx does, in the order it does it. The two rules
  // are separate on purpose -- one is about identity (whose course is this),
  // the other about time (was she here yet) -- and this is the only place
  // that states they compose, because the screen composes them.
  const course = { id: 'c1' };
  const roster = [
    { id: 'old', course_id: 'c1', joinedOn: '2026-03-14' },
    { id: 'new', course_id: 'c1', joinedOn: JOINED },
    { id: 'other-course', course_id: 'c2', joinedOn: '2026-03-14' },
  ];

  const onTheSixth = membersOnDay(enrolledIn(roster, course), BEFORE);
  assert.deepEqual(onTheSixth.map(m => m.id), ['old']);

  const onTheSeventh = membersOnDay(enrolledIn(roster, course), JOINED);
  assert.deepEqual(onTheSeventh.map(m => m.id), ['old', 'new']);

  // ...and with no day in play -- the course's own member list -- she is
  // there whatever the date, which is the requester's second condition.
  assert.deepEqual(
    membersOnDay(enrolledIn(roster, course), null).map(m => m.id), ['old', 'new']);
});
