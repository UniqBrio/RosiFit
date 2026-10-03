import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  RESUBSCRIBE_SOURCES, offersStaffResubscribe, resubscribeChoiceProblem,
} from './staffResubscribe';

// The staff route back from an opt-out (TEST 3 of
// requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md): what the
// Edit form offers, and what the dialog lets through. The database (0084,
// supabase/tests/61) is what enforces; these pin that the form never offers
// what it refuses, and never holds back what it accepts.

test('offered only for a saved, unsubscribed address', () => {
  assert.equal(offersStaffResubscribe({ status: 'unsubscribed', id: 'e1' }), true);
  assert.equal(offersStaffResubscribe({ status: 'unsubscribed' }), false, 'no row id, nothing to act on');
  for (const status of ['bounced', 'complained', 'unknown', 'valid', undefined] as const) {
    assert.equal(offersStaffResubscribe({ status, id: 'e1' }), false, `not for ${status}`);
  }
});

test('the source is required, and "Other" needs a note', () => {
  assert.equal(resubscribeChoiceProblem(null, ''), 'Choose how the member asked.');
  assert.equal(resubscribeChoiceProblem('other', '   '), 'Add a note saying how the member asked.');
  assert.equal(resubscribeChoiceProblem('other', 'At the front desk'), null);
  assert.equal(resubscribeChoiceProblem('whatsapp', ''), null, 'the note is optional otherwise');
  assert.match(resubscribeChoiceProblem('phone', 'x'.repeat(501)) ?? '', /500 characters or fewer/);
});

test('the five sources are exactly the ones 0084 accepts, and in plain words', () => {
  const sql = fs.readFileSync(
    path.join(process.cwd(), 'supabase/migrations/0084_email_resubscribe_recovery.sql'), 'utf8');
  const accepted = /v_source not in \(([^)]*)\)/.exec(sql)?.[1]
    .split(',').map(s => s.trim().replace(/'/g, '')) ?? [];
  assert.deepEqual(RESUBSCRIBE_SOURCES.map(s => s.key), accepted);
  assert.deepEqual(RESUBSCRIBE_SOURCES.map(s => s.label),
    ['WhatsApp', 'Phone call', 'In person', 'Replied by email', 'Other']);
});

test('the Edit form saves it through its own call, never through the form\'s Save', () => {
  const edit = fs.readFileSync(path.join(process.cwd(), 'app/member/edit.tsx'), 'utf8');
  assert.match(edit, /staffResubscribeEmail\(resubscribing\.id, source, note\)/);
  const repo = fs.readFileSync(path.join(process.cwd(), 'src/data/repository.ts'), 'utf8');
  assert.match(repo, /rpc\('staff_resubscribe_member_email'/);
});

// ---------------------------------------------------------------------------
// Appended 01-Oct-2026: the action on Reach Out and Attendance
// (requests/2026-10-01-staff-resubscribe-everywhere.md).
import {
  resubscribableAddresses, RESUBSCRIBE_COPY, resubscribeOutcomeMessage, resubscribeConfirmProblem,
} from './staffResubscribe';

test('only unsubscribed, saved addresses are offered -- never subscribed, bounced or spam-reported', () => {
  const emails = [
    { address: 'on@x.com', status: 'unknown' as const, id: 'a' },
    { address: 'valid@x.com', status: 'valid' as const, id: 'b' },
    { address: 'bounce@x.com', status: 'bounced' as const, id: 'c' },
    { address: 'spam@x.com', status: 'complained' as const, id: 'd' },
    { address: 'out@x.com', status: 'unsubscribed' as const, id: 'e' },
    { address: 'unsaved@x.com', status: 'unsubscribed' as const },
  ];
  assert.deepEqual(resubscribableAddresses(emails).map(e => e.address), ['out@x.com']);
  assert.deepEqual(resubscribableAddresses([]), []);
});

test('a member with two unsubscribed addresses is offered both, in record order', () => {
  const emails = [
    { address: 'first@x.com', status: 'unsubscribed' as const, id: '1' },
    { address: 'ok@x.com', status: 'unknown' as const, id: '2' },
    { address: 'second@x.com', status: 'unsubscribed' as const, id: '3' },
  ];
  assert.deepEqual(resubscribableAddresses(emails).map(e => e.id), ['1', '3']);
});

test('confirmation needs the address chosen when there are several, then a source; Other needs a note', () => {
  assert.equal(resubscribeConfirmProblem(['1', '3'], null, 'phone', ''), 'Choose which address to turn back on.');
  assert.equal(resubscribeConfirmProblem(['1', '3'], 'zzz', 'phone', ''), 'Choose which address to turn back on.');
  assert.equal(resubscribeConfirmProblem(['1', '3'], '3', null, ''), 'Choose how the member asked.');
  assert.equal(resubscribeConfirmProblem(['1'], '1', 'other', ' '), 'Add a note saying how the member asked.');
  assert.equal(resubscribeConfirmProblem(['1'], '1', 'other', 'At the desk'), null);
  assert.equal(resubscribeConfirmProblem(['1'], '1', 'whatsapp', ''), null, 'the note is optional otherwise');
});

test('the words: the question, the success, and an idempotent second attempt', () => {
  assert.equal(RESUBSCRIBE_COPY.action, 'Resubscribe');
  assert.equal(RESUBSCRIBE_COPY.title, 'Turn follow-ups back on for this email?');
  assert.equal(resubscribeOutcomeMessage('resubscribed'), 'Follow-ups turned back on for this email.');
  assert.equal(resubscribeOutcomeMessage('already'), 'Follow-ups were already on for this email.');
});
