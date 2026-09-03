/**
 * Cases for the notification tray's shaping rules.
 *
 * Run: npx tsx --test src/data/notifications.test.ts
 *
 * Every failure here is silent in the same way: the tray renders, the badge
 * shows a number, and the number is wrong forever -- because nothing in this
 * product records "read", so nobody ever sees it go down and notices.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  actionableCount, orderNotifications,
  awaitingNotification, sentNotification, excludedNotification,
  type Notification,
} from './notifications';

const n = (kind: Notification['kind'], id: string = kind): Notification =>
  ({ id, kind, title: '', body: '', when: '' });

// ------------------------------------------------------------- the badge
test('the badge counts ONLY what is still actionable', () => {
  // This is the whole reason the count is not "unread": there is no read
  // state, so counting a finished send gives a badge that never clears.
  assert.equal(actionableCount([n('awaiting'), n('sent'), n('excluded')]), 1);
});

test('a tray of nothing but finished work counts zero', () => {
  assert.equal(actionableCount([n('sent', 's1'), n('sent', 's2'), n('excluded')]), 0);
});

test('an empty tray counts zero rather than throwing', () => {
  assert.equal(actionableCount([]), 0);
});

// ------------------------------------------------------------ the order
test('awaiting comes first, because it is the only kind anyone can act on', () => {
  const ordered = orderNotifications([n('sent'), n('excluded'), n('awaiting')]);
  assert.deepEqual(ordered.map(x => x.kind), ['awaiting', 'excluded', 'sent']);
});

test('what the send could not reach outranks what it did', () => {
  const ordered = orderNotifications([n('sent'), n('excluded')]);
  assert.deepEqual(ordered.map(x => x.kind), ['excluded', 'sent']);
});

test('ordering does not mutate the list it was given', () => {
  // The shell holds this array across renders; sorting it in place would
  // reorder the caller's data as a side effect of drawing it.
  const input = [n('sent'), n('awaiting')];
  orderNotifications(input);
  assert.deepEqual(input.map(x => x.kind), ['sent', 'awaiting']);
});

test('two of the same kind keep their incoming order', () => {
  const ordered = orderNotifications([n('awaiting', 'a1'), n('awaiting', 'a2')]);
  assert.deepEqual(ordered.map(x => x.id), ['a1', 'a2']);
});

// ------------------------------------------------------------- the lines
test('an awaiting session says what is missing and what it costs', () => {
  const item = awaitingNotification({
    id: 's1', title: 'Prenatal Flow · 6:00 pm',
    meta: 'Coimbatore · 18 expected · awaiting upload',
    label: 'Fri 22 Aug · Prenatal Flow 6:00 pm',
  });
  assert.equal(item.kind, 'awaiting');
  assert.equal(item.id, 'awaiting-s1');
  assert.equal(item.title, 'Prenatal Flow · 6:00 pm awaits upload');
  assert.match(item.body, /counts for nobody/);
});

test('one email sent is singular', () => {
  // "1 emails sent" is the kind of thing a person stops trusting the rest of
  // the screen over.
  const item = sentNotification({ id: 'b1', sent: 1, failed: 0, subject: 'Long absence', when: 'x' });
  assert.equal(item.title, '1 check-in email sent');
});

test('more than one is plural', () => {
  const item = sentNotification({ id: 'b1', sent: 4, failed: 0, subject: 'Long absence', when: 'x' });
  assert.equal(item.title, '4 check-in emails sent');
});

test('a batch with failures says so; one without does not invent a zero', () => {
  const withFailures = sentNotification({ id: 'b1', sent: 3, failed: 2, subject: 'S', when: 'x' });
  assert.match(withFailures.body, /2 failed/);
  const clean = sentNotification({ id: 'b2', sent: 3, failed: 0, subject: 'S', when: 'x' });
  assert.doesNotMatch(clean.body, /failed/);
});

test('an excluded message carries the reason the SEND recorded', () => {
  const item = excludedNotification({
    id: 'm1', name: 'Fathima Rizwan', status: 'excluded',
    exclusionReason: 'no email address on file', failureReason: null,
  });
  assert.match(item.body, /Fathima Rizwan was excluded from the send: no email address on file\./);
});

test('a FAILED message reads as not reached, not as declined', () => {
  // The two are different facts: one the send chose, one the provider did.
  const item = excludedNotification({
    id: 'm2', name: 'Divya Ramesh', status: 'failed',
    exclusionReason: null, failureReason: 'mailbox full',
  });
  assert.match(item.body, /not reached by the send: mailbox full\./);
});

test('an exclusion reason wins over a failure reason when both are present', () => {
  const item = excludedNotification({
    id: 'm3', name: 'A', status: 'excluded',
    exclusionReason: 'below the threshold', failureReason: 'mailbox full',
  });
  assert.match(item.body, /below the threshold/);
  assert.doesNotMatch(item.body, /mailbox full/);
});

test('no reason recorded says so rather than leaving the sentence dangling', () => {
  const item = excludedNotification({
    id: 'm4', name: null, status: 'failed', exclusionReason: null, failureReason: null,
  });
  assert.equal(item.body, 'A member was not reached by the send: no reason was recorded.');
});
