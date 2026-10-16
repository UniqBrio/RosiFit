import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sendProblems, sendProblemsCsv, sendProblemsFileName, isBounceReason } from './sendProblems';
import { emailExclusionReason } from './followup';
import type { Member } from './mock';

type Row = Parameters<typeof sendProblems>[0][number];
const row = (name: string, status: Row['status'], reason?: string): Row =>
  ({ member_id: name.toLowerCase(), name, status, reason });

test('failed and bounced are exported; sent and every other exclusion are not', () => {
  const out = sendProblems([
    row('Asha', 'sent'),
    row('Bina', 'failed', 'Throttling'),
    row('Chitra', 'excluded', 'Primary email has bounced'),
    row('Divya', 'excluded', 'Unsubscribed'),
    row('Esha', 'excluded', 'No email on file'),
    row('Farah', 'excluded', 'Marked as spam previously'),
  ]);
  assert.deepEqual(out, [
    { name: 'Bina', outcome: 'Failed', reason: 'Throttling' },
    { name: 'Chitra', outcome: 'Bounced', reason: 'Primary email has bounced' },
  ]);
});

test('a failure with no reason from the provider still says why', () => {
  const [only] = sendProblems([row('Bina', 'failed')]);
  assert.equal(only.reason, 'The provider refused the message.');
});

test('the CSV has a header and one line per member', () => {
  const csv = sendProblemsCsv([{ name: 'Bina, R', outcome: 'Failed', reason: 'Throttling' }]);
  assert.equal(csv, '﻿Member,Outcome,Reason\r\n"Bina, R",Failed,Throttling\r\n');
  assert.equal(sendProblemsFileName(new Date('2026-10-16T10:00:00Z')),
    'rosifit-email-failed-bounced-2026-10-16.csv');
});

/* A bounce is recognised by its reason, so both places that word one are
   pinned here: the send function's, and the offline fixtures'. A rewording in
   either that dropped "bounced" would silently empty the Bounced half. */
test('both wordings of a bounce are recognised', () => {
  const loop = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/send-followups/send-loop.ts'), 'utf8');
  const server = loop.match(/case 'bounced': return '([^']+)'/)?.[1];
  assert.ok(server, 'send-loop.ts words a bounced address');
  assert.ok(isBounceReason(server), `"${server}" is read as a bounce`);

  const m = { emails: [{ address: 'a@b.co', primary: true, status: 'bounced' }] } as unknown as Member;
  assert.ok(isBounceReason(emailExclusionReason(m)), 'the fixtures’ wording is read as a bounce');

  for (const other of ['Unsubscribed', 'Marked as spam previously', 'No email on file', 'The member unsubscribed']) {
    assert.ok(!isBounceReason(other), `"${other}" is not a bounce`);
  }
});
