import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sendReportRows, sendReportCounts, sendReportCsv, sendReportFileName, isBounceReason } from './sendReport';
import { emailExclusionReason } from './followup';
import type { Member } from './mock';

type Row = Parameters<typeof sendReportRows>[0][number];
const row = (name: string, status: Row['status'], reason?: string): Row =>
  ({ member_id: name.toLowerCase(), name, status, reason });

const results: Row[] = [
  row('Divya', 'excluded', 'Unsubscribed'),
  row('Asha', 'sent'),
  row('Bina', 'failed', 'Throttling'),
  row('Chitra', 'excluded', 'Primary email has bounced'),
  row('Esha', 'excluded'),
  row('Gita', 'sent'),
];

test('every member is exported with a status -- sent, failed, bounced and excluded', () => {
  assert.deepEqual(sendReportRows(results), [
    { name: 'Asha', status: 'Sent', reason: '' },
    { name: 'Gita', status: 'Sent', reason: '' },
    { name: 'Bina', status: 'Failed', reason: 'Throttling' },
    { name: 'Chitra', status: 'Bounced', reason: 'Primary email has bounced' },
    { name: 'Divya', status: 'Excluded', reason: 'Unsubscribed' },
    { name: 'Esha', status: 'Excluded', reason: 'No email on file' },
  ]);
});

test('a failure with no reason from the provider still says why', () => {
  const [only] = sendReportRows([row('Bina', 'failed')]);
  assert.equal(only.reason, 'The provider refused the message.');
});

test('the counts add up to the total', () => {
  const c = sendReportCounts(sendReportRows(results));
  assert.deepEqual(c, { total: 6, Sent: 2, Failed: 1, Bounced: 1, Excluded: 2 });
  assert.equal(c.Sent + c.Failed + c.Bounced + c.Excluded, c.total);
});

test('the CSV carries the totals, then one line per member', () => {
  const at = new Date(2026, 9, 16, 17, 5);
  const csv = sendReportCsv(sendReportRows([row('Asha', 'sent'), row('Bina, R', 'failed', 'Throttling')]), at);
  assert.equal(csv, '﻿' + [
    'Email send,2026-10-16 17:05',
    'Total members,2', 'Sent,1', 'Failed,1', 'Bounced,0', 'Excluded,0',
    '',
    'Member,Status,Reason',
    'Asha,Sent,',
    '"Bina, R",Failed,Throttling',
  ].join('\r\n') + '\r\n');
});

test('the file name carries the local date and time of the send', () => {
  assert.equal(sendReportFileName(new Date(2026, 9, 16, 9, 7)), 'rosifit-email-send-2026-10-16-0907.csv');
  // Just after midnight is still that day, whatever the UTC date is.
  assert.equal(sendReportFileName(new Date(2026, 9, 17, 0, 30)), 'rosifit-email-send-2026-10-17-0030.csv');
});

/* A bounce is recognised by its reason, so both places that word one are
   pinned here: the send function's, and the offline fixtures'. A rewording in
   either that dropped "bounced" would quietly file a bounce as Excluded. */
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
