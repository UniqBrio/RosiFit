/**
 * Cases for the already-sent mark and the selection it decides.
 *
 * Run: npx tsx --test src/data/sent.test.ts
 *
 * The point being defended: a member who has already had this period's
 * follow-up does not start ticked. Sending her a second one is allowed and
 * has to be chosen — the difference between the two is the whole feature.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  periodKey, recordSent, sentThisSession, clearSentLog,
  mergeSent, defaultSelection, sentLabel,
} from './sent';

const week = { from: '2026-08-31', to: '2026-09-06', label: '31 Aug – 6 Sep 2026' };
const other = { from: '2026-09-07', to: '2026-09-13', label: '7–13 Sep 2026' };

test('the key is the two dates, so two weeks cannot share a log', () => {
  assert.notEqual(periodKey(week), periodKey(other));
});

test('a recorded send is readable back for that period only', () => {
  clearSentLog();
  recordSent(week, ['a', 'b'], '2026-09-02T10:00:00.000Z');
  assert.deepEqual(Object.keys(sentThisSession(week)).sort(), ['a', 'b']);
  assert.deepEqual(sentThisSession(other), {});
});

test('recording again ADDS, it does not replace the period', () => {
  clearSentLog();
  recordSent(week, ['a'], '2026-09-02T10:00:00.000Z');
  recordSent(week, ['b'], '2026-09-03T10:00:00.000Z');
  assert.deepEqual(Object.keys(sentThisSession(week)).sort(), ['a', 'b']);
});

test('an empty id list records nothing', () => {
  clearSentLog();
  recordSent(week, []);
  assert.deepEqual(sentThisSession(week), {});
});

test('merging keeps the LATER timestamp', () => {
  const merged = mergeSent(
    { a: '2026-09-01T00:00:00.000Z' },
    { a: '2026-09-04T00:00:00.000Z', b: '2026-09-02T00:00:00.000Z' });
  assert.equal(merged.a, '2026-09-04T00:00:00.000Z');
  assert.equal(merged.b, '2026-09-02T00:00:00.000Z');
});

test('merging never loses a member either side knows about', () => {
  const merged = mergeSent({ a: '2026-09-01T00:00:00.000Z' }, { b: '2026-09-01T00:00:00.000Z' });
  assert.deepEqual(Object.keys(merged).sort(), ['a', 'b']);
});

test('merging does not mutate either input', () => {
  const server = { a: '2026-09-01T00:00:00.000Z' };
  mergeSent(server, { a: '2026-09-09T00:00:00.000Z', b: '2026-09-09T00:00:00.000Z' });
  assert.deepEqual(server, { a: '2026-09-01T00:00:00.000Z' });
});

test('everyone not yet written to starts ticked', () => {
  assert.deepEqual(defaultSelection(['a', 'b', 'c'], { b: '2026-09-02T00:00:00.000Z' }), ['a', 'c']);
});

test('a member already sent to starts UNTICKED, never silently ticked', () => {
  assert.deepEqual(defaultSelection(['a'], { a: '2026-09-02T00:00:00.000Z' }), []);
});

test('with no history at all, everybody starts ticked', () => {
  assert.deepEqual(defaultSelection(['a', 'b'], {}), ['a', 'b']);
});

test('the mark names the day it went out', () => {
  const label = sentLabel('2026-09-03T09:30:00.000Z');
  assert.match(label, /^Sent /);
  assert.match(label, /3|4/);   // the local day, either side of the date line
});

test('an unreadable timestamp still says the thing that matters', () => {
  assert.equal(sentLabel('not-a-date'), 'Already sent');
});
