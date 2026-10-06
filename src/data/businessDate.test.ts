import test from 'node:test';
import assert from 'node:assert/strict';
import { businessDateOf, businessTodayIso, BUSINESS_TIME_ZONE, BUSINESS_UTC_OFFSET_MINUTES } from './businessDate';

/**
 * A DATE IS THE ACADEMY'S DAY (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md
 * §12: four members refused on 3 Oct between 00:37 and 01:02 IST for
 * choosing "today").
 *
 * Run: npx tsx --test src/data/businessDate.test.ts
 *
 * Every case is an instant chosen so that the day in Chennai and the day in
 * UTC (and in a device set to somewhere else) differ or agree on purpose.
 */
const at = (iso: string) => new Date(iso);

test('between midnight and 05:30 in Chennai the day is already tomorrow in UTC terms', () => {
  // 3 Oct 00:37 IST is 2 Oct 19:07 UTC -- the first of the four refusals.
  assert.equal(businessDateOf(at('2026-10-02T19:07:00Z')), '2026-10-03');
  assert.equal(at('2026-10-02T19:07:00Z').toISOString().slice(0, 10), '2026-10-02', 'the UTC day the server compared against');
  // 01:02 IST, the last of them
  assert.equal(businessDateOf(at('2026-10-02T19:32:00Z')), '2026-10-03');
});

test('the transitions, to the minute', () => {
  assert.equal(businessDateOf(at('2026-10-05T18:29:59Z')), '2026-10-05', '23:59:59 in Chennai');
  assert.equal(businessDateOf(at('2026-10-05T18:30:00Z')), '2026-10-06', 'midnight in Chennai');
  assert.equal(businessDateOf(at('2026-10-05T23:59:59Z')), '2026-10-06', 'UTC midnight approaches: still the 6th in Chennai');
  assert.equal(businessDateOf(at('2026-10-06T00:00:00Z')), '2026-10-06', 'UTC midnight: 05:30 in Chennai, the same day');
  assert.equal(businessDateOf(at('2026-10-06T12:00:00Z')), '2026-10-06', 'ordinary daytime agrees everywhere');
});

test('month and year ends roll correctly', () => {
  assert.equal(businessDateOf(at('2026-10-31T18:30:00Z')), '2026-11-01');
  assert.equal(businessDateOf(at('2026-12-31T18:30:00Z')), '2027-01-01');
  assert.equal(businessDateOf(at('2028-02-28T18:30:00Z')), '2028-02-29', 'a leap day');
});

test('today, yesterday and tomorrow against the academy\'s day, from 00:30 in Chennai', () => {
  const now = () => at('2026-10-02T19:00:00Z');                 // 3 Oct 00:30 IST
  const today = businessTodayIso(now);
  assert.equal(today, '2026-10-03');
  const joined = (d: string) => (d > today ? 'future' : 'ok');
  assert.equal(joined('2026-10-03'), 'ok', 'today is not the future');
  assert.equal(joined('2026-10-02'), 'ok', 'yesterday');
  assert.equal(joined('2026-10-04'), 'future', 'tomorrow');
});

test('the zone is named once and is a fixed offset', () => {
  assert.equal(BUSINESS_TIME_ZONE, 'Asia/Kolkata');
  assert.equal(BUSINESS_UTC_OFFSET_MINUTES, 330);
  // Whatever the process zone, the answer is Chennai's.
  const saved = process.env.TZ;
  for (const tz of ['UTC', 'America/Los_Angeles', 'Asia/Kolkata', 'Pacific/Kiritimati']) {
    process.env.TZ = tz;
    assert.equal(businessDateOf(at('2026-10-02T19:07:00Z')), '2026-10-03', tz);
  }
  process.env.TZ = saved;
});
