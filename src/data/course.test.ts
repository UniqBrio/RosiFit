/**
 * Cases for the Attendance workspace's course-card summary.
 *
 * Run: npx tsx --test src/data/course.test.ts
 *
 * These are the sentences an academy owner reads down a list to decide where
 * to look first. The failure mode is not a crash: the card renders a
 * confident sentence about a course, and it is about a different population
 * -- or it says "nobody needs follow-up" about a course the engine cannot
 * see at all.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  courseSummary, coursesHeadline, rosterScope, enrolledIn, endEnrolment, NO_COURSE,
} from './course';
import type { Member, FollowUpRule } from './mock';

const RULE: FollowUpRule = {
  source: 'global',
  weekly_enabled: true, weekly_threshold: 3,
  consecutive_enabled: true, consecutive_threshold: 4,
  combination: 'OR',
};

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null, status: 'active',
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—', joinedOn: '2026-03-01', joined: 'Mar 2026', ...over,
});
const noEmail = (over: Partial<Member> = {}) => member({ emails: [], ...over });

// ------------------------------------------------------------- the frequency
test('the frequency and member count read as one line', () => {
  const s = courseSummary([member(), member({ id: 'b' })], 3, RULE);
  assert.equal(s.freqLine, '3 days/week · 2 members');
});

test('one day and one member are singular', () => {
  assert.equal(courseSummary([member()], 1, RULE).freqLine, '1 day/week · 1 member');
});

test('no weekdays says NO DAYS SET, never "0 days/week"', () => {
  // "0 days/week" reads like a schedule. It is the absence of one.
  assert.equal(courseSummary([member()], 0, RULE).freqLine, 'No days set · 1 member');
});

// ------------------------------------------------------- the follow-up count
test('a member over the threshold is counted', () => {
  const s = courseSummary([member({ missed: 4, expected: 6 })], 3, RULE);
  assert.equal(s.flagged, 1);
  assert.equal(s.icon, 'favorite');
  assert.equal(s.note, '1 member needs follow-up');
});

test('a member with NO ADDRESS is never counted as needing follow-up', () => {
  // She is over the threshold and cannot be emailed. Counting her promises a
  // send that has nowhere to go (C-76); she is reported as "without email".
  const s = courseSummary([noEmail({ missed: 5, expected: 6 })], 3, RULE);
  assert.equal(s.flagged, 0);
  assert.equal(s.noMail, 1);
  assert.equal(s.note, 'Nobody needs follow-up · 1 without email');
});

test('the two counts are stated together when both apply', () => {
  const s = courseSummary([
    member({ id: 'a', missed: 4, expected: 6 }),
    noEmail({ id: 'b' }),
  ], 3, RULE);
  assert.equal(s.note, '1 member needs follow-up · 1 without email');
});

test('several needing follow-up pluralise', () => {
  const s = courseSummary([
    member({ id: 'a', missed: 4, expected: 6 }),
    member({ id: 'b', missed: 5, expected: 6 }),
  ], 3, RULE);
  assert.equal(s.note, '2 members need follow-up');
});

test('a quiet course says so plainly', () => {
  const s = courseSummary([member(), member({ id: 'b' })], 3, RULE);
  assert.equal(s.icon, 'check_circle');
  assert.equal(s.note, 'Nobody needs follow-up');
});

// --------------------------------------------------------- no days is worse
test('NO WEEKDAYS outranks the follow-up sentence entirely', () => {
  // The important one. With no weekdays nothing is expected of anyone, so no
  // absence can be counted and the course sits outside the engine. Reporting
  // "nobody needs follow-up" there is true and deeply misleading.
  const s = courseSummary([member({ missed: 6, expected: 6 })], 0, RULE);
  assert.equal(s.icon, 'error');
  assert.equal(s.note, 'No frequency days — nothing is expected');
  assert.equal(s.noDays, true);
});

test('the rule is honoured, not a hardcoded four', () => {
  // The prototype hardcodes `missed >= 4`. A course whose own rule fires at 2
  // must flag at 2, or the card disagrees with the weekly list it feeds.
  const strict: FollowUpRule = { ...RULE, weekly_threshold: 2, consecutive_enabled: false };
  assert.equal(courseSummary([member({ missed: 2, expected: 6 })], 3, strict).flagged, 1);
  assert.equal(courseSummary([member({ missed: 2, expected: 6 })], 3, RULE).flagged, 0);
});

// ---------------------------------------------------------------- the header
test('the headline is generated from what is on screen', () => {
  assert.equal(coursesHeadline(4, 3, 1), '4 courses · 3 branches · 1 need follow-up');
});

test('none needing follow-up is a sentence, not a zero', () => {
  assert.equal(coursesHeadline(4, 3, 0), '4 courses · 3 branches · Nobody needs follow-up');
});

test('one of each is singular', () => {
  assert.equal(coursesHeadline(1, 1, 1), '1 course · 1 branch · 1 need follow-up');
});

test('an empty academy does not read as broken', () => {
  assert.equal(coursesHeadline(0, 0, 0), '0 courses · 0 branches · Nobody needs follow-up');
});

// --------------------------------------------------------- rosterScope
// The members screen is opened scoped from a course card, and the course
// travels in the URL -- untrusted input on a heading the app speaks in its
// own voice.
test('a known course scopes the roster', () => {
  assert.equal(rosterScope(['Prenatal Flow', 'Postnatal Core'], 'Prenatal Flow'), 'Prenatal Flow');
});

test('the ACADEMY’S spelling is returned, never the caller’s', () => {
  // A URL round-trips through encoding and hand-editing. The heading must
  // read the way the course list reads, not the way the link was typed.
  assert.equal(rosterScope(['Prenatal Flow'], 'prenatal flow'), 'Prenatal Flow');
  assert.equal(rosterScope(['Prenatal Flow'], '  PRENATAL FLOW  '), 'Prenatal Flow');
});

test('an unknown course does NOT become a heading', () => {
  // Without this the screen would render "Nobody is enrolled in <anything>"
  // about a course that does not exist -- the app describing fiction as fact.
  assert.equal(rosterScope(['Prenatal Flow'], 'Advanced Wizardry'), null);
  assert.equal(rosterScope(['Prenatal Flow'], '<script>alert(1)</script>'), null);
});

test('a link kept from before a rename falls back to everybody', () => {
  // An empty roster for a course nobody has is a worse answer than every
  // member, because it reads as "she has no students" rather than "that
  // course is gone".
  assert.equal(rosterScope(['Prenatal Flow (Evening)'], 'Prenatal Flow'), null);
});

test('nothing asked for is not a scope', () => {
  assert.equal(rosterScope(['Prenatal Flow'], undefined), null);
  assert.equal(rosterScope(['Prenatal Flow'], ''), null);
  assert.equal(rosterScope(['Prenatal Flow'], '   '), null);
});

test('a non-string is not a scope', () => {
  // expo-router hands back string | string[] for a repeated parameter.
  assert.equal(rosterScope(['Prenatal Flow'], ['Prenatal Flow']), null);
  assert.equal(rosterScope(['Prenatal Flow'], 42), null);
});

test('an empty course list scopes to nothing rather than throwing', () => {
  assert.equal(rosterScope([], 'Prenatal Flow'), null);
});

test('the "All courses" sentinel is not a course to scope to', () => {
  // fetchFilterOptions heads its list with that literal for the picker. A
  // link asking for it by name must not resolve, or the screen shows an empty
  // roster under a heading naming a course nobody teaches. The screen slices
  // the head off before asking; this pins WHY, so removing the slice fails
  // here rather than in production.
  assert.equal(rosterScope(['Prenatal Flow'], 'All courses'), null);
});

// ------------------------------------------- delete, then re-create the name
/*
 * A course was deleted and another created with the same name, and the new
 * one's card opened stating the deleted course's members -- "2 members · 1
 * with email · 1 without", about a course nobody had been enrolled in yet.
 *
 * Two separate mistakes made that possible, and either one alone is enough to
 * bring it back, so both are pinned here:
 *
 *   1. the join was on the course's NAME, and a name is reusable;
 *   2. the deletion announced only the course list, so screens went on
 *      reading a member list loaded before it -- members still naming the
 *      course that had just gone.
 *
 * Which is why the fourth test matters as much as the third: matching on
 * identity has to be enough ON ITS OWN, because a list loaded a moment ago is
 * exactly what a screen has in its hands when the new course appears.
 */

/** A course as the card sees it: an id, a name, and its offerings. */
const course = (id: string, name = 'Prenatal Flow') => ({ id, name, offerings: [] });

test('a course gathers its members by identity, not by name', () => {
  const mine = member({ id: 'a', course_id: 'c1' });
  const hers = member({ id: 'b', course_id: 'c9' });
  // Both courses are called "Prenatal Flow", which the register allows over
  // time: only LIVE course names are unique (courses_name_live).
  assert.deepEqual(enrolledIn([mine, hers], course('c1')).map(m => m.id), ['a']);
  assert.deepEqual(enrolledIn([mine, hers], course('c9')).map(m => m.id), ['b']);
});

test('deleting a course ends the enrolment of its members, and only theirs', () => {
  const mine = member({ id: 'a', course_id: 'c1' });
  const hers = member({ id: 'b', course_id: 'c9' });
  assert.deepEqual(endEnrolment(mine, 'c1'), { ...mine, course: NO_COURSE, course_id: null });
  // A member of another course comes back as she was -- object identity, so
  // "untouched" is checked rather than assumed.
  assert.equal(endEnrolment(hers, 'c1'), hers);
});

test('a course created under a deleted course name starts empty', () => {
  const withMail = member({ id: 'a', course_id: 'c1' });
  const without = noEmail({ id: 'b', course_id: 'c1' });
  const roster = [withMail, without];

  // What the card said about the course that WAS there, so the numbers this
  // test is about are the ones somebody actually read off the screen.
  const before = courseSummary(enrolledIn(roster, course('c1')), 3, RULE);
  assert.equal(before.freqLine, '3 days/week · 2 members');
  assert.equal(before.withMail, 1);
  assert.equal(before.noMail, 1);

  // Deleted: every enrolment on it ends, the way delete_course ends them.
  const after = roster.map(m => endEnrolment(m, 'c1'));

  // Created a minute later. Same name, different row, no offerings and
  // nobody enrolled -- because it is new.
  const fresh = course('c2');
  assert.deepEqual(enrolledIn(after, fresh), []);

  const summary = courseSummary(enrolledIn(after, fresh), 0, RULE);
  assert.equal(summary.freqLine, 'No days set · 0 members');
  assert.equal(summary.withMail, 0);
  assert.equal(summary.noMail, 0);
  assert.equal(summary.flagged, 0);
});

test('a roster loaded before the deletion is still not the new course roster', () => {
  // The cached-state half. A screen already mounted holds the members as they
  // were BEFORE the delete -- both still naming, and still pointing at, the
  // course that has since gone. The new course is empty anyway: it is a
  // different row, and nothing about it says otherwise.
  const stale = [member({ id: 'a', course_id: 'c1' }), noEmail({ id: 'b', course_id: 'c1' })];
  const fresh = course('c2');
  assert.deepEqual(enrolledIn(stale, fresh), []);
  assert.equal(courseSummary(enrolledIn(stale, fresh), 0, RULE).withMail, 0);
  // And the name they still carry IS the new course's name -- which is
  // precisely what the old join asked for, and what it got back.
  assert.equal(stale.filter(m => m.course === fresh.name).length, 2);
});

test('a member enrolled at nothing belongs to no course at all', () => {
  const nowhere = endEnrolment(member({ id: 'a', course_id: 'c1' }), 'c1');
  assert.equal(nowhere.course, NO_COURSE);
  assert.deepEqual(enrolledIn([nowhere], course('c1')), []);
  assert.deepEqual(enrolledIn([nowhere], course('c2')), []);
});
