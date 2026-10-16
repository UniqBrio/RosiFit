import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  sendReportRows, sendReportCounts, sendReportSheets, sendReportFileName, isBounceReason,
  SHEET_SEND_SUMMARY, SHEET_SEND_MEMBERS, sendAddress,
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
    { name: 'Asha', email: '', status: 'Sent', reason: '' },
    { name: 'Gita', email: '', status: 'Sent', reason: '' },
    { name: 'Bina', email: '', status: 'Failed', reason: 'Throttling' },
    { name: 'Chitra', email: '', status: 'Bounced', reason: 'Primary email has bounced' },
    { name: 'Divya', email: '', status: 'Excluded', reason: 'Unsubscribed' },
    { name: 'Esha', email: '', status: 'Excluded', reason: 'No email on file' },
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
    { name: SHEET_SEND_MEMBERS, header: ['Member', 'Email', 'Status', 'Reason'], rows: [
      ['Asha', '', 'Sent', ''], ['Bina, R', '', 'Failed', 'Throttling'],
    ] },
  ]);

  // And it opens in Excel as those two sheets, in that order.
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(await buildReportWorkbook(sheets));
  assert.deepEqual(wb.worksheets.map(w => w.name), [SHEET_SEND_SUMMARY, SHEET_SEND_MEMBERS]);
  const members = wb.getWorksheet(SHEET_SEND_MEMBERS)!;
  assert.equal(String(members.getCell('A3').value), 'Bina, R');
  assert.equal(String(members.getCell('C3').value), 'Failed');
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

// ------------------------------------------------- the email beside the name

/* On request (16-Oct-2026): "Add email also in the sheet because there can me
   many members with same name but email ids will be different". */
test('two members with one name are told apart by their email', async () => {
  const emails: Record<string, string> = { p1: 'priya.r@example.com', p2: 'priya.k@example.com' };
  const rows = sendReportRows([
    { member_id: 'p1', name: 'Priya', status: 'sent' },
    { member_id: 'p2', name: 'Priya', status: 'failed', reason: 'Throttling' },
  ], id => emails[id] ?? '');
  assert.deepEqual(rows.map(r => [r.name, r.email, r.status]), [
    ['Priya', 'priya.r@example.com', 'Sent'],
    ['Priya', 'priya.k@example.com', 'Failed'],
  ]);

  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(await buildReportWorkbook(sendReportSheets(rows, new Date(2026, 9, 16, 9, 0))));
  const members = wb.getWorksheet(SHEET_SEND_MEMBERS)!;
  assert.equal(String(members.getCell('B1').value), 'Email', 'Email is the second column');
  assert.equal(String(members.getCell('B2').value), 'priya.r@example.com');
  assert.equal(String(members.getCell('B3').value), 'priya.k@example.com');
});

test('the address named is the PRIMARY one -- the one the send writes to', () => {
  const m = (emails: { address: string; primary: boolean; status?: string }[]) => ({ emails }) as Pick<Member, 'emails'>;
  assert.equal(sendAddress(m([{ address: 'old@x.co', primary: false }, { address: 'main@x.co', primary: true }])), 'main@x.co');
  // A bounced primary is still named: it is the address the reason is about.
  assert.equal(sendAddress(m([{ address: 'gone@x.co', primary: true, status: 'bounced' }])), 'gone@x.co');
  // None marked primary: the send excluded the member as "No email on file",
  // so the file must not name an address that was never tried.
  assert.equal(sendAddress(m([{ address: 'a@x.co', primary: false }])), '');
  assert.equal(sendAddress(m([])), '');
});

test('an address the export does not know is blank, never another member’s', () => {
  const [only] = sendReportRows([{ member_id: 'zz', name: 'Asha', status: 'sent' }], id => ({ p1: 'p@x.co' } as Record<string, string>)[id] ?? '');
  assert.equal(only.email, '');
});

/* The server's choice, pinned: the send reads the primary address and no
   other. If load.ts ever reads another, sendAddress must follow it. */
test('the send function reads the primary address, which is what sendAddress names', () => {
  const load = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/send-followups/load.ts'), 'utf8');
  assert.match(load, /from\('member_emails'\)[\s\S]{0,120}\.eq\('is_primary', true\)/);
});

/* Both places a send starts -- a course's Send Communication and a member's
   Reach out -- hand the addresses to the result. Reach out did not, at first,
   and its export had a blank Email column. */
test('every send path hands the addresses to the result', () => {
  for (const file of ['app/send/index.tsx', 'app/member/[id].tsx']) {
    const src = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    const calls = src.match(/setSendResult\([^;]*;/g) ?? [];
    assert.ok(calls.length > 0, `${file} sets a send result`);
    for (const c of calls) assert.match(c, /sendAddress/, `${file}: ${c.replace(/\s+/g, ' ')}`);
  }
});
