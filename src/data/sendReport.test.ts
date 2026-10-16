import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sendReportRows, sendReportCounts, sendReportSheets, sendReportFileName, isBounceReason,
  SHEET_SEND_SUMMARY, SHEET_SEND_MEMBERS,
} from './sendReport';
import { buildReportWorkbook } from './reportXlsx';
import { excel } from './memberXlsx';
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

test('the workbook has a Summary of the totals, then the Members list', async () => {
  const at = new Date(2026, 9, 16, 17, 5);
  const sheets = sendReportSheets(sendReportRows([row('Asha', 'sent'), row('Bina, R', 'failed', 'Throttling')]), at);
  assert.deepEqual(sheets, [
    { name: SHEET_SEND_SUMMARY, header: ['Email send', '2026-10-16 17:05'], rows: [
      ['Total members', '2'], ['Sent', '1'], ['Failed', '1'], ['Bounced', '0'], ['Excluded', '0'],
    ] },
    { name: SHEET_SEND_MEMBERS, header: ['Member', 'Status', 'Reason'], rows: [
      ['Asha', 'Sent', ''], ['Bina, R', 'Failed', 'Throttling'],
    ] },
  ]);

  // And it opens in Excel as those two sheets, in that order.
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(await buildReportWorkbook(sheets));
  assert.deepEqual(wb.worksheets.map(w => w.name), [SHEET_SEND_SUMMARY, SHEET_SEND_MEMBERS]);
  const members = wb.getWorksheet(SHEET_SEND_MEMBERS)!;
  assert.equal(String(members.getCell('A3').value), 'Bina, R');
  assert.equal(String(members.getCell('B3').value), 'Failed');
});

test('the file name carries the local date and time of the send', () => {
  assert.equal(sendReportFileName(new Date(2026, 9, 16, 9, 7)), 'rosifit-email-send-2026-10-16-0907.xlsx');
  // Just after midnight is still that day, whatever the UTC date is.
  assert.equal(sendReportFileName(new Date(2026, 9, 17, 0, 30)), 'rosifit-email-send-2026-10-17-0030.xlsx');
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
