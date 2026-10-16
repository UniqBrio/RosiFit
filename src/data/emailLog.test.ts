import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  emailOutcome, emailTimeline, countEmails, groupSends, countsText, coursesText,
  emailLogSheets, emailLogFileName, academyStamp, academyDay, newestFirst, OUTCOME_LOOK,
  EMAIL_OUTCOMES, SHEET_EMAIL_SENDS, SHEET_EMAIL_MESSAGES, type EmailLogRow,
} from './emailLog';
import { emailLogFixture } from './emailLogFixture';
import { STATUS } from '../theme/tokens';

/**
 * On request (16-Oct-2026): Reports' "attendance email" section -- date,
 * course, how many sent / bounced / failed, an export with member, email,
 * date and reason -- and a member's own history: "on which date whether it
 * reached or failed, or bounce ... when it was sent when it bounce or failed".
 */

const row = (over: Partial<EmailLogRow>): EmailLogRow => ({
  messageId: 'm', batchId: 'b1', batchAt: '2026-10-14T12:30:00.000Z', sentBy: 'Owner',
  memberId: 'x', memberName: 'Asha', email: 'asha@example.com', fromEmail: 'hi@rosifit.in',
  course: 'Yoga Flow', branch: 'Adyar', subject: 'We missed you', status: 'sent', reason: null,
  sentAt: '2026-10-14T12:30:05.000Z', deliveredAt: null, bouncedAt: null, bounceType: null,
  complainedAt: null, ...over,
});

test('each email reads as exactly one outcome', () => {
  assert.equal(emailOutcome(row({})), 'Sent');
  assert.equal(emailOutcome(row({ deliveredAt: '2026-10-14T12:30:09.000Z' })), 'Delivered');
  assert.equal(emailOutcome(row({ status: 'bounced' })), 'Bounced');
  assert.equal(emailOutcome(row({ status: 'complained' })), 'Spam report');
  assert.equal(emailOutcome(row({ status: 'failed' })), 'Failed');
  assert.equal(emailOutcome(row({ status: 'excluded' })), 'Excluded');
  assert.equal(emailOutcome(row({ status: 'sending' })), 'Sending');
});

test('every outcome has its own icon and a measured STATUS colour (guardrails 2 and 3)', () => {
  const icons = EMAIL_OUTCOMES.map(o => OUTCOME_LOOK[o].icon);
  assert.equal(new Set(icons).size, icons.length, 'no two outcomes share an icon');
  for (const o of EMAIL_OUTCOMES) assert.ok(STATUS[OUTCOME_LOOK[o].tone], `${o} uses a STATUS tone`);
});

test('times are the academy\'s, whatever zone the device is in', () => {
  // 18:30 UTC on the 14th is 00:00 on the 15th in Chennai.
  assert.equal(academyDay('2026-10-14T18:30:00.000Z'), '15 Oct 2026');
  assert.equal(academyStamp('2026-10-14T12:35:00.000Z'), '14 Oct 2026, 6:05 PM');
  assert.equal(academyStamp(null), '');
});

test('the timeline says when it was sent, delivered, bounced -- in that order', () => {
  assert.deepEqual(emailTimeline(row({ deliveredAt: '2026-10-14T12:30:09.000Z' })),
    ['Sent 14 Oct 2026, 6:00 PM', 'Delivered 14 Oct 2026, 6:00 PM']);
  assert.deepEqual(emailTimeline(row({ status: 'bounced', bouncedAt: '2026-10-14T12:31:00.000Z', bounceType: 'Permanent' })),
    ['Sent 14 Oct 2026, 6:00 PM', 'Bounced 14 Oct 2026, 6:01 PM — the address does not accept email']);
  assert.deepEqual(emailTimeline(row({ status: 'failed', sentAt: null, reason: 'Throttling' })),
    ['Failed 14 Oct 2026, 6:00 PM: Throttling']);
  assert.deepEqual(emailTimeline(row({ status: 'excluded', sentAt: null, reason: 'Unsubscribed' })),
    ['Not sent: Unsubscribed']);
  assert.deepEqual(emailTimeline(row({ status: 'complained', complainedAt: '2026-10-15T03:00:00.000Z' })),
    ['Sent 14 Oct 2026, 6:00 PM', 'Marked as spam 15 Oct 2026, 8:30 AM']);
});

test('a temporary bounce did not reach the member: it reads as Bounced, and says the address is kept', () => {
  const r = row({ bouncedAt: '2026-10-14T12:32:00.000Z', bounceType: 'Transient' });
  assert.equal(emailOutcome(r), 'Bounced');
  assert.deepEqual(emailTimeline(r),
    ['Sent 14 Oct 2026, 6:00 PM',
     'Bounced 14 Oct 2026, 6:02 PM — temporarily, for example a full mailbox; the next send tries this address again']);
  assert.equal(countEmails([r]).bounced, 1);
  // A delivery confirmation outranks it: the email arrived.
  assert.equal(emailOutcome({ ...r, deliveredAt: '2026-10-14T12:40:00.000Z' }), 'Delivered');
});

test('the counts: sent is everything that left, bounced and spam included', () => {
  const c = countEmails([
    row({ deliveredAt: '2026-10-14T12:30:09.000Z' }), row({}), row({ status: 'bounced' }),
    row({ status: 'complained' }), row({ status: 'failed' }), row({ status: 'excluded' }),
  ]);
  assert.deepEqual(c, { total: 6, sent: 4, delivered: 1, bounced: 1, spam: 1, failed: 1, excluded: 1, sending: 0 });
  assert.equal(countsText(c), '4 sent · 1 delivered · 1 bounced · 1 failed · 1 spam report · 1 excluded');
});

test('the log groups into sends, newest first, each naming its course', () => {
  const sends = groupSends([
    row({ messageId: '1', batchId: 'old', batchAt: '2026-10-10T12:30:00.000Z', course: 'Postnatal Core' }),
    row({ messageId: '2', batchId: 'new', course: 'Yoga Flow' }),
    row({ messageId: '3', batchId: 'new', course: 'Prenatal Flow', status: 'failed' }),
  ]);
  assert.deepEqual(sends.map(s => s.batchId), ['new', 'old']);
  assert.equal(coursesText(sends[0]), 'Prenatal Flow · Yoga Flow');
  assert.equal(coursesText({ courses: [] }), 'No course');
  assert.equal(sends[0].counts.failed, 1);
});

test('the export: one row per send, then one per email with member, email, date and reason', () => {
  const [sends, emails] = emailLogSheets([
    row({ messageId: '1', memberName: 'Priya', email: 'priya.r@example.com', deliveredAt: '2026-10-14T12:30:09.000Z' }),
    row({ messageId: '2', memberName: 'Priya', email: 'priya.k@example.com', status: 'bounced',
          bouncedAt: '2026-10-14T12:31:00.000Z', bounceType: 'Permanent' }),
    row({ messageId: '3', memberName: 'Kavya', email: 'kavya@example.com', status: 'failed', sentAt: null, reason: 'Throttling' }),
  ]);
  assert.equal(sends.name, SHEET_EMAIL_SENDS);
  assert.deepEqual(sends.rows, [['14 Oct 2026', '6:00 PM', 'Yoga Flow', 'Owner', '3', '2', '1', '1', '1', '0', '0']]);

  assert.equal(emails.name, SHEET_EMAIL_MESSAGES);
  const col = (h: string) => emails.header.indexOf(h);
  for (const h of ['Date', 'Course', 'Member', 'Email', 'Status', 'Reason', 'Sent at', 'Delivered at', 'Bounced at']) {
    assert.ok(col(h) >= 0, `the Emails sheet has a ${h} column`);
  }
  const byEmail = (e: string) => emails.rows.find(r => r[col('Email')] === e)!;
  assert.equal(byEmail('priya.k@example.com')[col('Status')], 'Bounced');
  assert.equal(byEmail('priya.k@example.com')[col('Bounced at')], '14 Oct 2026, 6:01 PM');
  assert.equal(byEmail('priya.r@example.com')[col('Delivered at')], '14 Oct 2026, 6:00 PM');
  assert.equal(byEmail('kavya@example.com')[col('Reason')], 'Throttling');
  assert.equal(emails.rows.filter(r => r[col('Member')] === 'Priya').length, 2,
    'two members with one name stay two rows, told apart by their email');
});

test('the file name carries the period it covers', () => {
  assert.equal(emailLogFileName('2026-10-01', '2026-10-16'), 'rosifit-attendance-emails-2026-10-01-to-2026-10-16.xlsx');
  assert.equal(emailLogFileName('2026-10-16', '2026-10-16'), 'rosifit-attendance-emails-2026-10-16.xlsx');
});

test('a member\'s history reads newest first', () => {
  const list = newestFirst([row({ messageId: 'a', batchAt: '2026-10-01T00:00:00.000Z' }),
                            row({ messageId: 'b', batchAt: '2026-10-14T00:00:00.000Z' })]);
  assert.deepEqual(list.map(r => r.messageId), ['b', 'a']);
});

test('the offline fixture lands on the anchor day and shows every outcome the screens draw', () => {
  const rows = emailLogFixture('2026-10-16');
  const outcomes = new Set(rows.map(emailOutcome));
  for (const o of ['Delivered', 'Bounced', 'Failed', 'Excluded'] as const) assert.ok(outcomes.has(o), o);
  assert.ok(rows.every(r => r.batchAt <= '2026-10-16T18:29:59.999Z'), 'nothing after the anchor day');
});

/* The names the screen reads off the RPC are the ones 0095 returns. */
test('the repository reads every column email_log returns', () => {
  const sql = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/0095_email_log.sql'), 'utf8');
  const repo = fs.readFileSync(path.join(process.cwd(), 'src/data/repository.ts'), 'utf8');
  const cols = sql.slice(sql.indexOf('returns table ('), sql.indexOf(')\nlanguage'))
    .split('\n').map(l => l.trim().split(/\s+/)[0]).filter(c => /^[a-z_]+$/.test(c) && c !== 'returns');
  assert.ok(cols.length >= 18, `read the column list (${cols.length})`);
  for (const c of cols) assert.ok(repo.includes(`r.${c}`), `fetchEmailLog maps ${c}`);
  assert.match(repo, /supabase\.rpc\('email_log'/);
});
