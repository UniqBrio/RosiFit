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
 * Pure on purpose, like csvFormat.ts: no `document`, so it is tested under
 * scripts/tsconfig.json with nothing to mock.
 */
import type { SendResult } from './sendBatch';
import { toCsv } from './csvFormat';

type ResultRow = SendResult['results'][number];

export const SEND_REPORT_STATUSES = ['Sent', 'Failed', 'Bounced', 'Excluded'] as const;
export type SendReportStatus = typeof SEND_REPORT_STATUSES[number];
export type SendReportRow = { name: string; status: SendReportStatus; reason: string };

export const isBounceReason = (reason: string | undefined): boolean => /\bbounced\b/i.test(reason ?? '');

function statusOf(r: ResultRow): SendReportStatus {
  if (r.status === 'sent') return 'Sent';
  if (r.status === 'failed') return 'Failed';
  return isBounceReason(r.reason) ? 'Bounced' : 'Excluded';
}

/** Every member, grouped Sent, Failed, Bounced, Excluded -- each group in the
 *  order the result listed it. */
export function sendReportRows(results: ResultRow[]): SendReportRow[] {
  const rows = results.map(r => {
    const status = statusOf(r);
    const reason = status === 'Sent' ? ''
      : r.reason ?? (status === 'Failed' ? 'The provider refused the message.' : 'No email on file');
    return { name: r.name, status, reason };
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

/** The totals first, then one line per member. */
export function sendReportCsv(rows: SendReportRow[], sentAt: Date): string {
  const c = sendReportCounts(rows);
  return toCsv(['Email send', `${localDate(sentAt)} ${localTime(sentAt)}`], [
    ['Total members', String(c.total)],
    ['Sent', String(c.Sent)],
    ['Failed', String(c.Failed)],
    ['Bounced', String(c.Bounced)],
    ['Excluded', String(c.Excluded)],
    [],
    ['Member', 'Status', 'Reason'],
    ...rows.map(r => [r.name, r.status, r.reason]),
  ]);
}

/** Dated, and timed to the minute so two sends on one day are two files. */
export function sendReportFileName(sentAt: Date): string {
  return `rosifit-email-send-${localDate(sentAt)}-${localTime(sentAt).replace(':', '')}.csv`;
}
