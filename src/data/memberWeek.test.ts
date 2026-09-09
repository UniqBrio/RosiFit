/**
 * Her week is HERS.
 *
 * The defect: *Her sessions this week* in the member pop-up was
 * `sessionsFor(m)`, six hard-coded fixture rows returned for every member --
 * so a Gentle Yoga member opened on 8 Sep 2026 was shown three Prenatal Flow
 * absences from August, an Onam holiday and a coach who was unwell. Her
 * figures above the list were live. The two could never be reconciled, and
 * "Missed streak 6" over a list holding three absences is exactly the reading
 * the requester could not make sense of.
 *
 * Aishwarya Nair's real week (7-13 Sep 2026, Gentle Yoga, Mon-Fri) is the case
 * built below: absent Monday, four days still to run.
 *
 * What is pinned here is the READING of each session, especially the four the
 * bare status cannot give on its own -- a holiday, a cancellation, a completed
 * session she was not expected at, and a day whose file has not arrived.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { memberWeek, clockLabel, NO_SESSIONS_ROW, type MemberWeekSession } from './memberWeek';

const TODAY = '2026-09-08';

const session = (over: Partial<MemberWeekSession> & { iso: string }): MemberWeekSession => ({
  time: '18:00:00',
  sessionStatus: 'scheduled',
  course: 'Gentle Yoga',
  branch: 'Main',
  holidayName: null,
  cancellationReason: null,
  record: null,
  ...over,
});

test('her own sessions, oldest first, in the week she is opened on', () => {
  const rows = memberWeek([
    session({ iso: '2026-09-09' }),
    session({ iso: '2026-09-07', sessionStatus: 'completed', record: { status: 'absent', expected: true } }),
    session({ iso: '2026-09-08' }),
  ], TODAY);

  assert.deepEqual(rows.map(r => r.date), ['Mon 7 Sep', 'Tue 8 Sep', 'Wed 9 Sep']);
  assert.equal(rows[0].status, 'absent');
  assert.equal(rows[0].detail, 'Gentle Yoga · Main');
  // Not one August Prenatal Flow row anywhere in it.
  assert.equal(rows.filter(r => /Prenatal/.test(r.detail)).length, 0);
});

test('a holiday and a cancellation are listed and still say why they do not count', () => {
  const rows = memberWeek([
    session({ iso: '2026-09-07', sessionStatus: 'holiday', holidayName: 'Onam' }),
    session({ iso: '2026-09-08', sessionStatus: 'cancelled', cancellationReason: 'Coach unwell' }),
  ], TODAY);

  assert.equal(rows[0].status, 'holiday');
  assert.equal(rows[0].detail, 'Onam — does not count');
  assert.equal(rows[1].status, 'cancelled');
  assert.equal(rows[1].detail, 'Coach unwell — does not count');
});

test('a holiday reads as a holiday even where a stale record survived beside it', () => {
  const rows = memberWeek([
    session({
      iso: '2026-09-07', sessionStatus: 'holiday', holidayName: 'Onam',
      record: { status: 'absent', expected: true },
    }),
  ], TODAY);
  assert.equal(rows[0].status, 'holiday', 'a day the academy closed must never print as Absent');
});

test('a completed session she has no row in is "not expected", not a gap', () => {
  const rows = memberWeek([
    session({ iso: '2026-09-07', sessionStatus: 'completed', record: null }),
  ], TODAY);
  assert.equal(rows[0].status, 'none');
  assert.match(rows[0].detail, /not expected/);
});

test('a day that has run with no file is awaiting; one still to come is not', () => {
  const rows = memberWeek([
    session({ iso: '2026-09-07' }),   // before today, still scheduled
    session({ iso: '2026-09-08' }),   // today
    session({ iso: '2026-09-11' }),   // still to come
  ], TODAY);

  assert.equal(rows[0].status, 'awaiting');
  assert.match(rows[0].detail, /counts for nobody/);
  assert.equal(rows[1].status, 'awaiting');
  assert.equal(rows[2].status, 'scheduled',
    'a class that has not happened must not read as a failure to upload');
});

test('turning up unexpected reads as extra, never as an ordinary present', () => {
  const rows = memberWeek([
    session({ iso: '2026-09-07', sessionStatus: 'completed', record: { status: 'extra', expected: false } }),
  ], TODAY);
  assert.equal(rows[0].status, 'extra');
  assert.match(rows[0].detail, /not expected/);
});

test('no sessions is its own row, not an empty list of misses', () => {
  assert.deepEqual(memberWeek([], TODAY), [NO_SESSIONS_ROW]);
});

test('times are read the way the canvas writes them, at both ends of the clock', () => {
  assert.equal(clockLabel('18:00:00'), '6:00 pm');
  assert.equal(clockLabel('06:00'), '6:00 am');
  assert.equal(clockLabel('00:30'), '12:30 am');
  assert.equal(clockLabel('12:30'), '12:30 pm');
  assert.equal(clockLabel(null), '—');
  assert.equal(clockLabel('nonsense'), '—');
});

test('a session with no start time still reads, with a dash for the hour', () => {
  const rows = memberWeek([session({ iso: '2026-09-07', time: null })], TODAY);
  assert.equal(rows[0].time, '—');
  assert.equal(rows[0].date, 'Mon 7 Sep');
});
