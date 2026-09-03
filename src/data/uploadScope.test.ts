/**
 * Cases for which sessions the upload screen offers.
 *
 * Run: npx tsx --test src/data/uploadScope.test.ts
 *
 * Picking the wrong session here attaches a real class's attendance to a
 * different class, and the screen's own check can only compare the file's
 * meeting code against whatever was picked. So the narrowing rules are safety
 * rules, and the two that matter most are the refusals: a scope that matches
 * nothing must NOT widen back to everything, and two candidates must NOT be
 * silently resolved to the first.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { scopeSessions } from './uploadScope';
import type { PendingSession } from './mock';

const s = (over: Partial<PendingSession>): PendingSession => ({
  session_id: 's', offering_id: 'o', session_date: '2026-08-22',
  course_id: 'c1', course: 'Prenatal Flow',
  dayNum: '22', mon: 'AUG', title: 'Prenatal Flow', meta: '', label: 'Fri 22 Aug', ...over,
});

const ALL = [
  s({ session_id: 'a', course_id: 'c1', course: 'Prenatal Flow',  session_date: '2026-08-22' }),
  s({ session_id: 'b', course_id: 'c1', course: 'Prenatal Flow',  session_date: '2026-08-20' }),
  s({ session_id: 'c', course_id: 'c2', course: 'Postnatal Core', session_date: '2026-08-22' }),
];

// ------------------------------------------------------------ academy-wide
test('no scope offers everything and preselects nothing', () => {
  const r = scopeSessions(ALL);
  assert.equal(r.sessions.length, 3);
  assert.equal(r.preselect, null);
  assert.equal(r.note, null);
  assert.equal(r.empty, false);
});

test('an empty string is not a scope', () => {
  // A caller building `?courseId=${maybeId}` with nothing in hand sends "".
  // Treating that as "the course whose id is empty" would offer no sessions
  // at all and blame the data.
  assert.equal(scopeSessions(ALL, '').sessions.length, 3);
  assert.equal(scopeSessions(ALL, '   ').sessions.length, 3);
  assert.equal(scopeSessions(ALL, null, null).sessions.length, 3);
});

// ------------------------------------------------------------- by course
test('a course scope offers only its sessions', () => {
  const r = scopeSessions(ALL, 'c1');
  assert.deepEqual(r.sessions.map(x => x.session_id), ['a', 'b']);
  assert.equal(r.empty, false);
});

test('a course scope does NOT preselect, even though it narrowed', () => {
  // Two sessions of the same course are two different days. Guessing one is
  // guessing which day's register this file belongs to.
  assert.equal(scopeSessions(ALL, 'c1').preselect, null);
});

test('the narrowing is stated, by name', () => {
  assert.equal(scopeSessions(ALL, 'c1').note, 'Showing Prenatal Flow only.');
});

// --------------------------------------------------------- course and day
test('a course and a day preselect the one session', () => {
  const r = scopeSessions(ALL, 'c1', '2026-08-22');
  assert.equal(r.preselect?.session_id, 'a');
  assert.equal(r.sessions.length, 1);
  assert.equal(r.note, null, 'nothing to explain when it went straight there');
});

test('a day alone still narrows across courses', () => {
  const r = scopeSessions(ALL, null, '2026-08-22');
  assert.deepEqual(r.sessions.map(x => x.session_id), ['a', 'c']);
  assert.equal(r.preselect, null, 'two courses ran that day — she chooses');
});

test('two sessions of one course on one day are NOT resolved to the first', () => {
  // Same course, same date, two branches. Silently taking the first would
  // attach Coimbatore's register to Chennai.
  const twoBranches = [
    s({ session_id: 'x', offering_id: 'o1', course_id: 'c1', session_date: '2026-08-22' }),
    s({ session_id: 'y', offering_id: 'o2', course_id: 'c1', session_date: '2026-08-22' }),
  ];
  const r = scopeSessions(twoBranches, 'c1', '2026-08-22');
  assert.equal(r.preselect, null);
  assert.equal(r.sessions.length, 2);
  assert.equal(r.note, '2 sessions of Prenatal Flow ran that day.');
});

// ------------------------------------------------- a scope matching nothing
test('a day already uploaded shows nothing, and says which nothing', () => {
  const r = scopeSessions(ALL, 'c1', '2026-08-19');
  assert.equal(r.empty, true);
  assert.equal(r.sessions.length, 0);
  assert.equal(r.preselect, null);
  assert.match(r.note ?? '', /no longer waiting for a file/i);
});

test('a scope matching nothing does NOT widen back to every session', () => {
  // The whole point. She tapped "Upload this session" about ONE session;
  // handing her every other session in the academy as though that were the
  // answer is how the wrong file reaches the wrong class.
  assert.equal(scopeSessions(ALL, 'c9').sessions.length, 0);
  assert.equal(scopeSessions(ALL, 'c9').empty, true);
  assert.equal(scopeSessions(ALL, null, '2026-01-01').sessions.length, 0);
});

test('a course with nothing pending says so about the course', () => {
  assert.equal(scopeSessions(ALL, 'c9').note,
    'No session for this course is waiting for a file.');
});

// ------------------------------------------------------ a malformed date
test('a date that is not a date is ignored, not matched against', () => {
  // ?date=undefined is what a template literal produces from a missing value.
  // Filtering on it would empty the list and blame the sessions.
  const r = scopeSessions(ALL, 'c1', 'undefined');
  assert.deepEqual(r.sessions.map(x => x.session_id), ['a', 'b']);
  assert.equal(r.empty, false);
  assert.equal(r.note, 'Showing Prenatal Flow only.');
});

test('an empty session list with no scope is not reported as a failed scope', () => {
  const r = scopeSessions([]);
  assert.equal(r.empty, false, 'nothing pending anywhere is good news, not a bad filter');
  assert.equal(r.note, null);
});
