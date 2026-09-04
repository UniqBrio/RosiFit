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
import { courseSummary, coursesHeadline, rosterScope } from './course';
import type { Member, FollowUpRule } from './mock';

const RULE: FollowUpRule = {
  source: 'global',
  weekly_enabled: true, weekly_threshold: 3,
  consecutive_enabled: true, consecutive_threshold: 4,
  combination: 'OR',
};

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—', joined: 'Mar 2026', ...over,
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
  assert.equal(coursesHeadline(4, 3, 0), '4 courses · 3 branches · nobody needs follow-up');
});

test('one of each is singular', () => {
  assert.equal(coursesHeadline(1, 1, 1), '1 course · 1 branch · 1 need follow-up');
});

test('an empty academy does not read as broken', () => {
  assert.equal(coursesHeadline(0, 0, 0), '0 courses · 0 branches · nobody needs follow-up');
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
