import test from 'node:test';
import assert from 'node:assert/strict';
import { businessToday, currentWeek, lastWeek, thisMonth, presetPeriod, resolvePeriod, iso } from './period';
import { businessDayBounds } from './businessDate';

/**
 * EVERY PERIOD THAT STARTS FROM "NOW" STARTS FROM THE ACADEMY'S DAY
 * (docs/PERFORMANCE_FIX_REPORT_2026-10-06.md §5.4; the T-144 class).
 *
 * Run: npx tsx --test src/data/businessPeriod.test.ts
 *
 * The week and month arithmetic is calendar arithmetic on a local Date;
 * what must not vary by device is the day it starts from. These cases stand
 * at the moments where the device's day and Chennai's differ.
 */
const at = (s: string) => () => new Date(s);

test('at 00:30 on Monday in Chennai the week is the new one, whatever the device says', () => {
  // Sunday 11 Oct 2026 18:30 UTC = Monday 12 Oct 00:00 IST.
  const saved = process.env.TZ;
  for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Kolkata']) {
    process.env.TZ = tz;
    const today = businessToday(at('2026-10-11T18:30:00Z'));
    assert.equal(iso(today), '2026-10-12', `${tz}: the academy's day`);
    assert.deepEqual([currentWeek(today).from, currentWeek(today).to], ['2026-10-12', '2026-10-18'], `${tz}: this week`);
    assert.deepEqual([lastWeek(today).from, lastWeek(today).to], ['2026-10-05', '2026-10-11'], `${tz}: last week`);
  }
  process.env.TZ = saved;
});

test('one minute earlier it is still Sunday, and the week is last week\'s', () => {
  const today = businessToday(at('2026-10-11T18:29:00Z'));
  assert.equal(iso(today), '2026-10-11');
  assert.deepEqual([currentWeek(today).from, currentWeek(today).to], ['2026-10-05', '2026-10-11']);
});

test('the month turns at midnight in Chennai, not at midnight UTC', () => {
  assert.equal(thisMonth(businessToday(at('2026-10-31T18:30:00Z'))).from, '2026-11-01', '00:00 IST on 1 Nov');
  assert.equal(thisMonth(businessToday(at('2026-10-31T18:29:00Z'))).from, '2026-10-01', '23:59 IST on 31 Oct');
  assert.equal(thisMonth(businessToday(at('2026-11-01T00:00:00Z'))).from, '2026-11-01', '05:30 IST on 1 Nov');
});

test('the presets and a resolved choice start from the same day', () => {
  const today = businessToday(at('2026-10-11T18:30:00Z'));
  assert.equal(presetPeriod('This week', today).from, '2026-10-12');
  assert.equal(resolvePeriod({ key: 'This week' } as never, today).from, '2026-10-12');
});

test('the default is the academy\'s day right now, and it is a date-only value', () => {
  const today = businessToday();
  assert.match(iso(today), /^\d{4}-\d{2}-\d{2}$/);
  assert.equal(today.getHours(), 0, 'local midnight of the academy\'s day');
  assert.equal(currentWeek().from, currentWeek(today).from);
});

test('a day\'s bounds as instants are Chennai\'s midnight and end, whatever the device zone', () => {
  const saved = process.env.TZ;
  for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Kolkata']) {
    process.env.TZ = tz;
    const b = businessDayBounds('2026-10-05', '2026-10-05');
    assert.equal(b.from, '2026-10-04T18:30:00.000Z', `${tz}: 00:00 IST on the 5th`);
    assert.equal(b.to, '2026-10-05T18:29:59.999Z', `${tz}: 23:59:59.999 IST on the 5th`);
  }
  process.env.TZ = saved;
});
