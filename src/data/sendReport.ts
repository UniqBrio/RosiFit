/**
 * THE WHOLE SEND, as a file the academy can keep: every member it was asked
 * to reach, each with a status, and the totals above the list.
 *
 * On request (16-Oct-2026), in two steps. First "download list of members for
 * whom email is sent failed and bounced"; then, the same day, "export all not
 * just failed total number of emails sent with full list with status and
 * downlable fiel should contain date in its name". So the file carries:
 *
 *   SENT     -- the provider accepted the message.
 *   FAILED   -- the provider refused it (`status: 'failed'`).
 *   BOUNCED  -- not attempted: the address on file has already bounced
 *               (`status: 'excluded'` with a bounce reason).
 *   EXCLUDED -- not attempted for any other reason: no email on file,
 *               unsubscribed, marked as spam. Named with the reason, never
 *               dropped (C-76), as on screen.
 *
 * A bounce is told apart by its REASON because that is all the result row
 * carries. Both wordings it can arrive in are pinned in sendReport.test.ts:
 * the send function's (`suppressionReason`, send-loop.ts) and the offline
 * fixtures' (`emailExclusionReason`, followup.ts).
 *
 * WITH THE EMAIL, beside the name -- the fourth word, the same day: "Add email
 * also in the sheet because there can me many members with same name but
 * email ids will be different". A name does not identify a member; on a
 * register with two Priyas, the address is what tells the rows apart.
 *
 * AN EXCEL WORKBOOK, not a CSV -- the requester's third word on it, the same
 * day: "excel sheet would be good". Two sheets: Summary (when, and the
 * totals) and Members (the full list). Built by reportXlsx.ts'
 * `buildReportWorkbook`, the one the Reports export uses, so the two files
 * look and behave alike.
 *
 * Pure on purpose: this module only shapes the sheets -- no exceljs and no
 * `document` -- so it is tested under scripts/tsconfig.json with nothing to
 * mock.
 */
import type { SendResult } from './sendBatch';
import type { Sheet } from './reportSheets';
import type { Member } from './mock';

type ResultRow = SendResult['results'][number];

export const SEND_REPORT_STATUSES = ['Sent', 'Failed', 'Bounced', 'Excluded'] as const;
export type SendReportStatus = typeof SEND_REPORT_STATUSES[number];
export type SendReportRow = { name: string; email: string; status: SendReportStatus; reason: string };

export const isBounceReason = (reason: string | undefined): boolean => /\bbounced\b/i.test(reason ?? '');

function statusOf(r: ResultRow): SendReportStatus {
  if (r.status === 'sent') return 'Sent';
  if (r.status === 'failed') return 'Failed';
  return isBounceReason(r.reason) ? 'Bounced' : 'Excluded';
}

/**
 * The address a send writes to: the member's PRIMARY address, and only that.
 * The send function reads `member_emails` with `is_primary = true` (load.ts),
 * so a member with addresses but none marked primary was excluded as "No
 * email on file" -- and the file must say blank, not name an address that was
 * never tried. A bounced or unsubscribed primary IS named: that is the
 * address the Reason is about.
 */
export function sendAddress(m: Pick<Member, 'emails'>): string {
  return m.emails.find(e => e.primary)?.address ?? '';
}

/** Every member, grouped Sent, Failed, Bounced, Excluded -- each group in the
 *  order the result listed it. `emailOf` answers by member id; blank when it
 *  does not know. */
export function sendReportRows(results: ResultRow[], emailOf: (memberId: string) => string = () => ''): SendReportRow[] {
  const rows = results.map(r => {
    const status = statusOf(r);
    const reason = status === 'Sent' ? ''
      : r.reason ?? (status === 'Failed' ? 'The provider refused the message.' : 'No email on file');
    return { name: r.name, email: emailOf(r.member_id), status, reason };
  });
  return SEND_REPORT_STATUSES.flatMap(s => rows.filter(r => r.status === s));
}

export function sendReportCounts(rows: SendReportRow[]): Record<SendReportStatus, number> & { total: number } {
  const n = (s: SendReportStatus) => rows.filter(r => r.status === s).length;
  return { total: rows.length, Sent: n('Sent'), Failed: n('Failed'), Bounced: n('Bounced'), Excluded: n('Excluded') };
}

const pad = (n: number) => String(n).padStart(2, '0');
/** LOCAL date and time, not UTC: a send at 2 am in Chennai is that day's send,
 *  and toISOString would file it under the day before. */
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

export const SHEET_SEND_SUMMARY = 'Summary';
export const SHEET_SEND_MEMBERS = 'Members';

/** Summary first -- when, and how many of each -- then one line per member. */
export function sendReportSheets(rows: SendReportRow[], sentAt: Date): Sheet[] {
  const c = sendReportCounts(rows);
  return [
    { name: SHEET_SEND_SUMMARY, header: ['Email send', `${localDate(sentAt)} ${localTime(sentAt)}`], rows: [
      ['Total members', String(c.total)],
      ['Sent', String(c.Sent)],
      ['Failed', String(c.Failed)],
      ['Bounced', String(c.Bounced)],
      ['Excluded', String(c.Excluded)],
    ] },
    { name: SHEET_SEND_MEMBERS, header: ['Member', 'Email', 'Status', 'Reason'],
      rows: rows.map(r => [r.name, r.email, r.status, r.reason]) },
  ];
}

/** Dated, and timed to the minute so two sends on one day are two files. */
export function sendReportFileName(sentAt: Date): string {
  return `rosifit-email-send-${localDate(sentAt)}-${localTime(sentAt).replace(':', '')}.xlsx`;
}
