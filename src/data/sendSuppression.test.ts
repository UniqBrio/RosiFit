import test from 'node:test';
import assert from 'node:assert/strict';
import { suppressionReason } from '../../supabase/functions/send-followups/send-loop.ts';

// TEST 4 of requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md,
// send side: after an opt-out is turned back on (by the member's Resubscribe
// button or by staff, both of which write 'unknown'), the next follow-up is
// SENT -- and no suppression is ever read as sendable on the way.

test('an address turned back on (\'unknown\') is sendable, and so is \'valid\'', () => {
  assert.equal(suppressionReason('unknown'), null);
  assert.equal(suppressionReason('valid'), null);
});

test('every suppression keeps its own reason, as the send screen shows it', () => {
  assert.equal(suppressionReason('unsubscribed'), 'Unsubscribed');
  assert.equal(suppressionReason('bounced'), 'Primary email has bounced');
  assert.equal(suppressionReason('complained'), 'Marked as spam previously');
});

test('a status the send path does not know is not sent to', () => {
  assert.notEqual(suppressionReason('something-new'), null);
  assert.notEqual(suppressionReason(undefined), null);
});
