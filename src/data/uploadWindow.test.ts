import test from 'node:test';
import assert from 'node:assert/strict';
import { uploadOffer, offersUpload, sameWeek, weekStartIso, futureFileRefusal } from './uploadWindow';
import { currentWeek, weekStart, iso } from './period';

/**
 * "Fix the Awaiting Upload button visibility on the date cards. It should
 *  only be shown for dates in the current week. It must not appear on future
 *  weeks."
 *
 * The course week strip stepped forward and next week's cards each offered
 * to upload a file for a class that had not happened. Worse than premature:
 * `fetchPendingSessions` only ever returns sessions with
 * `session_date <= today`, so pressing one of those buttons opened the upload
 * scoped to a date nothing matched, and `scopeSessions` answered "That
 * session is no longer waiting for a file -- it may already have been
 * uploaded" about a session that had not started.
 *
 * So the window is: the CURRENT week, as far as TODAY. What is guarded here:
 *
 *   - a previous week's day offering the button again (the strip is a
 *     this-week surface; older sessions are reached from /upload's own list);
 *   - a future WEEK offering it -- the defect that was reported;
 *   - a future DAY of the current week offering it, which is the same file
 *     that does not exist yet, one week nearer;
 *   - the week boundary drifting off Monday, or being computed by subtracting
 *     timestamps, which moves it by an hour across a DST change;
 *   - `new Date(iso)` creeping back in, which reads UTC and puts an IST date
 *     on the day before.
 *
 * One assertion per test, so a failure names its own claim.
 */

/* Wed 9 Sep 2026. Its week is Mon 7 Sep - Sun 13 Sep. */
const WED = '2026-09-09';
const MON = '2026-09-07';
const SUN = '2026-09-13';

/* ------------------------------------------------------- the current week */

test('today itself is offered', () => {
  assert.equal(offersUpload(WED, WED), true);
});

test('Monday, the first day of the week today falls in, is offered', () => {
  assert.equal(offersUpload(MON, WED), true);
});

test('yesterday is offered', () => {
  assert.equal(offersUpload('2026-09-08', WED), true);
});

test('a day earlier in the week is in the current week', () => {
  assert.equal(uploadOffer(MON, WED).currentWeek, true);
});

/* ------------------------------------------------------ the previous week */

test('the previous week is not offered', () => {
  assert.equal(offersUpload('2026-09-02', WED), false);
});

test('Sunday of the previous week -- one day before Monday -- is not offered', () => {
  assert.equal(offersUpload('2026-09-06', WED), false);
});

test('a previous week is refused for being another week, not for being unarrived', () => {
  assert.deepEqual(uploadOffer('2026-09-06', WED),
    { currentWeek: false, arrived: true, offered: false });
});

test('a week far behind is not offered either', () => {
  assert.equal(offersUpload('2026-06-10', WED), false);
});

/* -------------------------------------------------------- the future week */

test('the next week is not offered', () => {
  assert.equal(offersUpload('2026-09-16', WED), false);
});

test('Monday of the next week -- one day after Sunday -- is not offered', () => {
  assert.equal(offersUpload('2026-09-14', WED), false);
});

test('a future week is refused on both counts', () => {
  assert.deepEqual(uploadOffer('2026-09-14', WED),
    { currentWeek: false, arrived: false, offered: false });
});

test('a week far ahead is not offered', () => {
  assert.equal(offersUpload('2026-12-02', WED), false);
});

test('no day of the next week is offered, not one of the seven', () => {
  const none = ['2026-09-14', '2026-09-15', '2026-09-16', '2026-09-17',
    '2026-09-18', '2026-09-19', '2026-09-20'].filter(d => offersUpload(d, WED));
  assert.deepEqual(none, []);
});

/* ------------------------------------- a day still to come, THIS week
 * The reported defect was about future weeks; a Thursday reached on Wednesday
 * has exactly the same missing file, and fetchPendingSessions excludes it for
 * exactly the same reason. */

test('tomorrow is not offered, though it is in the current week', () => {
  assert.equal(offersUpload('2026-09-10', WED), false);
});

test('a future day of the current week is in the week but has not arrived', () => {
  assert.deepEqual(uploadOffer(SUN, WED),
    { currentWeek: true, arrived: false, offered: false });
});

test('every day of the current week up to today is offered, and no other', () => {
  const week = ['2026-09-07', '2026-09-08', '2026-09-09', '2026-09-10',
    '2026-09-11', '2026-09-12', '2026-09-13'];
  assert.deepEqual(week.filter(d => offersUpload(d, WED)),
    ['2026-09-07', '2026-09-08', '2026-09-09']);
});

/* --------------------------------------------------------- the week itself */

test('the week runs Monday to Sunday, matching week_start_day = 1', () => {
  assert.equal(weekStartIso(SUN), MON);
});

test('Monday is its own week start', () => {
  assert.equal(weekStartIso(MON), MON);
});

test('Sunday and the Monday six days before it are the same week', () => {
  assert.equal(sameWeek(MON, SUN), true);
});

test('Sunday and the Monday after it are not', () => {
  assert.equal(sameWeek(SUN, '2026-09-14'), false);
});

test('the window uses the same week the rest of the app queries', () => {
  // period.currentWeek is what the dashboard, the reports and the strip
  // itself are built from. Two answers to "which week is this" is the drift
  // C-84 exists to stop.
  const today = new Date(2026, 8, 9);
  assert.equal(weekStartIso(iso(today)), currentWeek(today).from);
});

test('a week that crosses new year is still one week', () => {
  // Mon 28 Dec 2026 - Sun 3 Jan 2027. A year boundary is not a week boundary.
  assert.equal(offersUpload('2026-12-30', '2027-01-01'), true);
});

test('the Sunday before that week is still the previous week', () => {
  assert.equal(offersUpload('2026-12-27', '2027-01-01'), false);
});

test('a week containing a DST change does not slip a day', () => {
  // Sun 14 Mar 2027 is the US spring-forward. weekStart shifts by CALENDAR
  // days, so the Monday is the same whether the week is 167, 168 or 169
  // hours long; subtracting timestamps and dividing by 86400000 is what
  // moves it.
  assert.equal(weekStartIso('2027-03-14'), '2027-03-08');
});

test('the week start is read as a local date, never as UTC', () => {
  // `new Date('2026-09-07')` is midnight UTC, which is 7 Sep in London and
  // 6 Sep in Los Angeles. parseISO builds a local date instead, so the answer
  // does not depend on where the phone is.
  assert.equal(weekStartIso(MON), iso(weekStart(new Date(2026, 8, 7))));
});

/* -------------------------------------------------------------- bad input */

test('an unreadable day has no week', () => {
  assert.equal(weekStartIso('not-a-date'), null);
});

test('an unreadable day is never offered', () => {
  assert.equal(offersUpload('', WED), false);
});

test('an unreadable clock never offers anything', () => {
  assert.equal(offersUpload(WED, ''), false);
});

test('two unreadable dates are not "the same week"', () => {
  assert.equal(sameWeek('', ''), false);
});

/* ------------------------------------------ a file for a day that has not run
 *
 * "If today is 8 sept user can upload for today if the upload files date is
 *  9 sept then block show message as attendance can be uploaded for future
 *  dates"
 *
 * The strip's button already withholds itself from a future day, but the day
 * a file lands on has never come from the screen -- it comes from the Meet
 * `Created on` line. So a file dated tomorrow, opened from anywhere at all,
 * imported without comment. The boundary the requester drew is TODAY IS
 * ALLOWED, and that is the boundary asserted here in both directions.
 */

/* The requester's own dates. */
const TODAY = '2026-09-08';
const TOMORROW = '2026-09-09';
const YESTERDAY = '2026-09-07';

const FILE = { fileName: 'meet_export.csv', label: (d: string) => `[${d}]` };

test('today is allowed — the requester drew the line here, not before it', () => {
  assert.equal(futureFileRefusal(TODAY, TODAY, FILE), null);
});

test('a day already gone is allowed', () => {
  assert.equal(futureFileRefusal(YESTERDAY, TODAY, FILE), null);
});

test('a file dated tomorrow is refused', () => {
  assert.notEqual(futureFileRefusal(TOMORROW, TODAY, FILE), null);
});

test('a file from a whole future week is refused too', () => {
  // Not the same rule as the strip's: `offersUpload` also demands the CURRENT
  // week, and a file from three weeks ago must still import. Only "arrived"
  // is borrowed.
  assert.notEqual(futureFileRefusal('2026-09-30', TODAY, FILE), null);
});

test('a file from a past week is NOT refused, though its day would offer no button', () => {
  assert.equal(offersUpload('2026-08-18', TODAY), false);
  assert.equal(futureFileRefusal('2026-08-18', TODAY, FILE), null);
});

test('the refusal names the file, so she knows which one she picked', () => {
  assert.match(String(futureFileRefusal(TOMORROW, TODAY, FILE)), /^meet_export\.csv is for/);
});

test('the refusal says the words the requester asked for: a future date', () => {
  // "message should include as its a future date" -- named, not described.
  assert.match(String(futureFileRefusal(TOMORROW, TODAY, FILE)), /\u2014 a future date\./);
});

test('the refusal writes the day the screen\u2019s way, never as raw ISO', () => {
  assert.match(String(futureFileRefusal(TOMORROW, TODAY, FILE)), /\[2026-09-09\]/);
});

test('the refusal does NOT also name today \u2014 one date to read, not two', () => {
  // "simple". A message whose whole content is "not yet" does not make the
  // reader compare two dates to get there.
  assert.equal(/\[2026-09-08\]/.test(String(futureFileRefusal(TOMORROW, TODAY, FILE))), false);
});

test('the refusal says when it CAN be uploaded, not only that it cannot', () => {
  assert.match(String(futureFileRefusal(TOMORROW, TODAY, FILE)),
    /Attendance can only be uploaded once the class has run\.$/);
});

test('an unreadable file day is not refused HERE — the screen already says why', () => {
  assert.equal(futureFileRefusal('', TODAY, FILE), null);
  assert.equal(futureFileRefusal('not-a-date', TODAY, FILE), null);
});

test('an unreadable clock refuses nothing, rather than refusing everything', () => {
  assert.equal(futureFileRefusal(TOMORROW, '', FILE), null);
});
