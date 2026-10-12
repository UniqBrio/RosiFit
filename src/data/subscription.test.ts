/**
 * The subscription screen's words and numbers.
 *
 * Run: npx tsx --test src/data/subscription.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  longDate, daysUntil, lastGraceDay, stateSentence, moreMeta, type Subscription,
} from './subscription';

const rosifit: Subscription = {
  customer: 'RosiFit Academy', plan: 'Standard',
  startDate: '2026-09-01', endDate: '2027-09-24', graceDays: 14, state: 'active',
};

test('the end date reads as a person writes it', () => {
  assert.equal(longDate('2027-09-24'), '24-Sep-2027');
  assert.equal(longDate(null), '—');
  assert.equal(longDate('not a date'), '—');
});

test('days until renewal counts calendar days, and goes negative once past', () => {
  assert.equal(daysUntil('2027-09-24', '2026-10-12'), 347);
  assert.equal(daysUntil('2027-09-24', '2027-09-24'), 0);
  assert.equal(daysUntil('2027-09-24', '2027-09-25'), -1);
});

test('the grace period ends grace_days after the end date', () => {
  assert.equal(lastGraceDay('2027-09-24', 14), '2027-10-08');
  assert.equal(lastGraceDay('2027-09-24', 0), '2027-09-24');
});

test('each state says what it means', () => {
  assert.equal(stateSentence(rosifit, '2026-10-12'), '347 days left until the next renewal.');
  assert.equal(stateSentence(rosifit, '2027-09-23'), '1 day left until the next renewal.');
  assert.match(stateSentence(rosifit, '2027-09-24'), /ends today\. Everything keeps working through 08-Oct-2027/);
  // a device a day ahead of the server must never print a negative count
  assert.match(stateSentence(rosifit, '2027-09-25'), /ends today/);
  assert.match(stateSentence({ ...rosifit, graceDays: 0 }, '2027-09-24'), /call UniqBrio support to renew it/);
  assert.match(stateSentence({ ...rosifit, state: 'grace' }, '2027-09-30'), /through 08-Oct-2027/);
  assert.match(stateSentence({ ...rosifit, state: 'expired' }, '2027-10-09'), /nothing can be added or changed/);
  assert.match(stateSentence({ ...rosifit, state: 'suspended' }, '2026-10-12'), /suspended/);
});

test('the More row says Renews only while the date lies ahead', () => {
  assert.equal(moreMeta(rosifit), 'Renews 24-Sep-2027');
  assert.equal(moreMeta({ ...rosifit, state: 'grace' }), 'Ended 24-Sep-2027');
  assert.equal(moreMeta({ ...rosifit, state: 'expired' }), 'Ended 24-Sep-2027');
  assert.equal(moreMeta({ ...rosifit, state: 'suspended' }), 'Suspended');
});
