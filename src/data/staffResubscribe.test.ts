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
