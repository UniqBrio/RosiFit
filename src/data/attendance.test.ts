/**
 * Cases for the attendance register's own data.
 *
 * Run: npx tsx --test src/data/attendance.test.ts
 *
 * These cover the pure half of the Attendance tab -- the rows it lists and
 * the invariant those rows inherit from the database. The screen counts its
 * summary straight off these rows, so a fixture that could produce an
 * impossible row would put an impossible figure on screen, and the count
 * would look like an engine disagreement rather than bad data.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { attendanceFixture, MEMBERS } from './mock';
import { iso, currentWeek, customRange } from './period';

/** N days from today, as ISO — the fixtures are relative to today on purpose. */
function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return iso(d);
}

test('every row falls inside the range it was asked for', () => {
  const from = daysFromNow(-20);
  const to = daysFromNow(-1);
  const rows = attendanceFixture(from, to);
  assert.ok(rows.length > 0, 'twenty days should contain at least one Mon/Wed/Fri session');
  for (const r of rows) {
    assert.ok(r.date >= from && r.date <= to,
      `${r.date} is outside ${from}..${to} — the list would be labelled one period and counted over another`);
  }
});

test('no row is dated in the future', () => {
  // A session that has not happened has no attendance; a fixture that
  // invented one would show a member absent from a class nobody has taught.
  const rows = attendanceFixture(daysFromNow(-10), daysFromNow(+10));
  const today = iso(new Date());
  for (const r of rows) {
    assert.ok(r.date <= today, `${r.date} is in the future`);
  }
});

test("an absent row is always expected — the table's own invariant", () => {
  // public.attendance_records: check (status <> 'absent' or expected).
  // "missed <= expected" is true because the database cannot represent it
  // otherwise, and the fixtures must not be able to either.
  const rows = attendanceFixture(daysFromNow(-30), daysFromNow(0));
  for (const r of rows) {
    if (r.status === 'absent') assert.equal(r.expected, true, `absent row ${r.id} is not expected`);
    // the reverse: an extra attended is someone who came when she was NOT
    // expected, so it can never count as a miss
    if (r.status === 'extra') assert.equal(r.expected, false, `extra row ${r.id} is marked expected`);
  }
});

test('an absent row carries no time in call, a present row does', () => {
  const rows = attendanceFixture(daysFromNow(-30), daysFromNow(0));
  for (const r of rows) {
    if (r.status === 'absent') assert.equal(r.minutes, null);
    else assert.equal(typeof r.minutes, 'number');
  }
});

test('the same range always reads the same way', () => {
  // The register is read twice by two people; a fixture that reshuffled
  // would look like attendance had been corrected between the two readings.
  const range = { from: daysFromNow(-14), to: daysFromNow(-1) };
  const a = attendanceFixture(range.from, range.to);
  const b = attendanceFixture(range.from, range.to);
  assert.deepEqual(a, b);
});

test('rows are newest first, and each day is grouped together', () => {
  const rows = attendanceFixture(daysFromNow(-14), daysFromNow(-1));
  const dates = [...new Set(rows.map(r => r.date))];
  assert.deepEqual(dates, [...dates].sort().reverse(), 'days are not newest first');
  // every row of a day sits with that day, so grouping cannot split one
  const firstIndex = new Map<string, number>();
  const lastIndex = new Map<string, number>();
  rows.forEach((r, i) => {
    if (!firstIndex.has(r.date)) firstIndex.set(r.date, i);
    lastIndex.set(r.date, i);
  });
  for (const d of dates) {
    const span = lastIndex.get(d)! - firstIndex.get(d)! + 1;
    assert.equal(span, rows.filter(r => r.date === d).length, `${d} is split across the list`);
  }
});

test('every row names a member the register knows', () => {
  // The screen filters on branch, course and name. A row carrying a name
  // that is on no member record would be unfilterable and unexplainable.
  // Was checked by member code until 0026 retired it; her id is the identity
  // the row actually carries, and the one the screen navigates by.
  const ids = new Set(MEMBERS.map(m => m.id));
  const rows = attendanceFixture(daysFromNow(-14), daysFromNow(-1));
  for (const r of rows) assert.ok(ids.has(r.member_id), `${r.member} is not a member`);
});

test('a one-day custom range still returns that day', () => {
  // "Tap the same day twice" is a real choice in the period filter, and it
  // must not resolve to an empty list by rounding the range away.
  const day = new Date();
  // step back to the most recent Monday/Wednesday/Friday so the day HAS a session
  while (![1, 3, 5].includes(day.getDay())) day.setDate(day.getDate() - 1);
  const one = customRange(iso(day), iso(day));
  const rows = attendanceFixture(one.from, one.to);
  assert.ok(rows.length > 0, `${one.label} is a teaching day but returned nothing`);
  assert.ok(rows.every(r => r.date === iso(day)));
});

test('an empty range returns nothing rather than everything', () => {
  // A reversed pair reaching the fixture directly must not fall through to
  // "no filter" — that is how a filtered screen quietly shows the whole set.
  assert.deepEqual(attendanceFixture(daysFromNow(-1), daysFromNow(-8)), []);
});

test('the current week resolves to a range the fixture accepts', () => {
  const week = currentWeek();
  assert.ok(week.from <= week.to);
  const rows = attendanceFixture(week.from, week.to);
  for (const r of rows) assert.ok(r.date >= week.from && r.date <= week.to);
});
