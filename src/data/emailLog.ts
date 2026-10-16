/**
 * THE EMAIL LOG -- every follow-up email, what happened to it, and when.
 *
 * On request (16-Oct-2026): Reports gains an "attendance email" section -- the
 * date, the course, how many were sent, bounced and failed, "and all other
 * details with export button for download along with member name, email, date
 * and reason" -- and the member record shows "details of email sent on which
 * date whether it reached or failed, or bounce ... when it was sent when it
 * bounce or failed every detail".
 *
 * One source for both: `email_log` (migration 0095), one row per message.
 * This module turns those rows into what the two screens and the export say,
 * so a count on Reports and a line on a member's record cannot disagree about
 * what "bounced" means.
 *
 * WHAT EACH OUTCOME MEANS -- one word per email, and never the colour alone
 * (guardrail 3): every outcome has its own word and its own icon.
 *
 *   DELIVERED   SES confirmed the receiving server accepted it.
 *   SENT        It left RosiFit; no delivery confirmation has arrived. SES
 *               only reports a delivery when the account is set up to, so a
 *               Sent that never becomes Delivered is not a failure.
 *   BOUNCED     The receiving server refused the address -- permanently. The
 *               address is now suppressed, and the member's record says so.
 *   SPAM REPORT The member marked it as spam. The address is suppressed.
 *   FAILED      SES refused to take it at all (the reason says why).
 *   EXCLUDED    Never attempted: no email on file, unsubscribed, an address
 *               that had already bounced, ... (the reason says which).
 *   SENDING     Still in flight when the log was read.
 *
 * A TEMPORARY bounce (a full mailbox, a server's bad morning) is still a
 * BOUNCE: SES reports one only once it has stopped retrying, so that email did
 * not reach the member. What differs is the address -- ses-feedback suppresses
 * only a permanent bounce, so the next send tries the same address again --
 * and the timeline says so.
 *
 * Pure on purpose: no exceljs, no `document`, no network -- tested under
 * scripts/tsconfig.json with nothing to mock.
 */
import type { Sheet } from './reportSheets';
import type { StatusKey } from '../theme/tokens';
import { BUSINESS_UTC_OFFSET_MINUTES } from './businessDate';

/** One message, as `email_log` returns it, in the app's own names. */
export type EmailLogRow = {
  messageId: string;
  batchId: string;
  /** when the send was made -- "the date" of every email in it */
  batchAt: string;
  sentBy: string | null;
  memberId: string;
  memberName: string;
  email: string | null;
  fromEmail: string | null;
  course: string | null;
  branch: string | null;
  subject: string | null;
  status: 'queued' | 'sending' | 'sent' | 'failed' | 'bounced' | 'complained' | 'excluded';
  reason: string | null;
  sentAt: string | null;
  deliveredAt: string | null;
  bouncedAt: string | null;
  bounceType: string | null;
  complainedAt: string | null;
};

export const EMAIL_OUTCOMES = ['Delivered', 'Sent', 'Bounced', 'Spam report', 'Failed', 'Excluded', 'Sending'] as const;
export type EmailOutcome = typeof EMAIL_OUTCOMES[number];

export function emailOutcome(r: Pick<EmailLogRow, 'status' | 'deliveredAt' | 'bouncedAt'>): EmailOutcome {
  switch (r.status) {
    case 'sent': return r.deliveredAt ? 'Delivered' : r.bouncedAt ? 'Bounced' : 'Sent';
    case 'bounced': return 'Bounced';
    case 'complained': return 'Spam report';
    case 'failed': return 'Failed';
    case 'excluded': return 'Excluded';
    default: return 'Sending';
  }
}

/**
 * The colour and icon for an outcome. The colours are STATUS tones the build
 * already measures in both themes (guardrail 2), not new ones: what reached
 * the member reads as `present`, what did not as `absent`, what was never
 * attempted as `none`, and what is still going as `scheduled`.
 */
export const OUTCOME_LOOK: Record<EmailOutcome, { tone: StatusKey; icon: string }> = {
  'Delivered':   { tone: 'present',   icon: 'mark_email_read' },
  'Sent':        { tone: 'present',   icon: 'check_circle' },
  'Bounced':     { tone: 'absent',    icon: 'cancel' },
  'Spam report': { tone: 'absent',    icon: 'report' },
  'Failed':      { tone: 'absent',    icon: 'error' },
  'Excluded':    { tone: 'none',      icon: 'mail_off' },
  'Sending':     { tone: 'scheduled', icon: 'schedule' },
};

/** Whether it LEFT the academy: everything SES took, whatever happened next. */
export const leftTheAcademy = (r: Pick<EmailLogRow, 'status'>): boolean =>
  r.status === 'sent' || r.status === 'bounced' || r.status === 'complained';

const isTemporaryBounce = (r: Pick<EmailLogRow, 'status' | 'bouncedAt'>): boolean =>
  r.status === 'sent' && r.bouncedAt !== null;

// ------------------------------------------------------------------ time
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The instant's fields in the academy's zone, whatever zone the device is in
 *  -- a send at 00:10 in Chennai is that day's send, on every screen. */
function academyFields(iso: string): { y: number; mo: number; d: number; h: number; mi: number } | null {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  const s = new Date(at.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000);
  return { y: s.getUTCFullYear(), mo: s.getUTCMonth(), d: s.getUTCDate(), h: s.getUTCHours(), mi: s.getUTCMinutes() };
}

/** "14 Oct 2026" */
export function academyDay(iso: string | null): string {
  const f = iso ? academyFields(iso) : null;
  return f ? `${f.d} ${MONTH[f.mo]} ${f.y}` : '';
}

/** "6:05 PM" */
export function academyClock(iso: string | null): string {
  const f = iso ? academyFields(iso) : null;
  if (!f) return '';
  return `${((f.h + 11) % 12) + 1}:${String(f.mi).padStart(2, '0')} ${f.h < 12 ? 'AM' : 'PM'}`;
}

/** "14 Oct 2026, 6:05 PM" -- the full stamp a spreadsheet keeps. */
export function academyStamp(iso: string | null): string {
  return iso ? `${academyDay(iso)}, ${academyClock(iso)}` : '';
}

// ------------------------------------------------------- one email, in words
/**
 * What happened to one email, as lines in the order it happened: when it was
 * sent, then delivered / bounced / reported, or why it failed or was never
 * sent. The member's Emails tab prints these; the export carries the same
 * facts as columns.
 */
export function emailTimeline(r: EmailLogRow): string[] {
  const lines: string[] = [];
  if (r.status === 'excluded') {
    lines.push(`Not sent: ${r.reason ?? 'excluded from this send'}`);
    return lines;
  }
  if (r.status === 'failed') {
    lines.push(`Failed ${academyStamp(r.batchAt)}: ${r.reason ?? 'the provider refused the message'}`);
    return lines;
  }
  if (r.sentAt) lines.push(`Sent ${academyStamp(r.sentAt)}`);
  if (r.deliveredAt) lines.push(`Delivered ${academyStamp(r.deliveredAt)}`);
  if (r.status === 'bounced') {
    lines.push(r.bouncedAt
      ? `Bounced ${academyStamp(r.bouncedAt)} — the address does not accept email`
      : 'Bounced — the address does not accept email');
  } else if (isTemporaryBounce(r)) {
    lines.push(`Bounced ${academyStamp(r.bouncedAt)} — temporarily, for example a full mailbox; the next send tries this address again`);
  }
  if (r.status === 'complained') {
    lines.push(r.complainedAt
      ? `Marked as spam ${academyStamp(r.complainedAt)}`
      : 'Marked as spam by the member');
  }
  return lines;
}

/** Newest send first; one member's own history reads top-down. */
export function newestFirst(rows: EmailLogRow[]): EmailLogRow[] {
  return [...rows].sort((a, b) => b.batchAt.localeCompare(a.batchAt) || a.memberName.localeCompare(b.memberName));
}

// ------------------------------------------------------------ one send
export type SendCounts = {
  total: number; sent: number; delivered: number; bounced: number;
  spam: number; failed: number; excluded: number; sending: number;
};

export function countEmails(rows: EmailLogRow[]): SendCounts {
  const n = (o: EmailOutcome) => rows.filter(r => emailOutcome(r) === o).length;
  return {
    total: rows.length,
    sent: rows.filter(leftTheAcademy).length,
    delivered: n('Delivered'),
    bounced: n('Bounced'),
    spam: n('Spam report'),
    failed: n('Failed'),
    excluded: n('Excluded'),
    sending: n('Sending'),
  };
}

export type SendSummary = {
  batchId: string;
  at: string;
  /** every course in the send, as sent -- one, for a course's own send */
  courses: string[];
  sentBy: string | null;
  counts: SendCounts;
  rows: EmailLogRow[];
};

/** The log, one entry per SEND, newest first. */
export function groupSends(rows: EmailLogRow[]): SendSummary[] {
  const byBatch = new Map<string, EmailLogRow[]>();
  for (const r of rows) byBatch.set(r.batchId, [...(byBatch.get(r.batchId) ?? []), r]);
  return [...byBatch.values()]
    .map(list => {
      const sorted = [...list].sort((a, b) => a.memberName.localeCompare(b.memberName));
      return {
        batchId: list[0].batchId,
        at: list[0].batchAt,
        courses: [...new Set(list.map(r => r.course).filter((c): c is string => !!c))].sort(),
        sentBy: list[0].sentBy,
        counts: countEmails(list),
        rows: sorted,
      };
    })
    .sort((a, b) => b.at.localeCompare(a.at));
}

/** "Yoga Flow", "Yoga Flow · Prenatal Flow", or "No course" */
export const coursesText = (s: Pick<SendSummary, 'courses'>): string =>
  s.courses.length ? s.courses.join(' · ') : 'No course';

/** Every figure in words, so a count is never only a colour. */
export function countsText(c: SendCounts): string {
  const parts = [`${c.sent} sent`];
  if (c.delivered) parts.push(`${c.delivered} delivered`);
  parts.push(`${c.bounced} bounced`, `${c.failed} failed`);
  if (c.spam) parts.push(`${c.spam} spam ${c.spam === 1 ? 'report' : 'reports'}`);
  if (c.excluded) parts.push(`${c.excluded} excluded`);
  if (c.sending) parts.push(`${c.sending} sending`);
  return parts.join(' · ');
}

// ------------------------------------------------------------- the export
export const SHEET_EMAIL_SENDS = 'Sends';
export const SHEET_EMAIL_MESSAGES = 'Emails';

/**
 * Two sheets: one row per SEND (the date, the course, every count), then one
 * row per EMAIL (member, address, outcome, reason, and every time we know).
 * The member's EMAIL is on every row: two members can share a name, never an
 * address.
 */
export function emailLogSheets(rows: EmailLogRow[]): Sheet[] {
  const sends = groupSends(rows);
  return [
    {
      name: SHEET_EMAIL_SENDS,
      header: ['Date', 'Time', 'Course', 'Sent by', 'Members', 'Sent', 'Delivered', 'Bounced',
               'Failed', 'Spam reports', 'Excluded'],
      rows: sends.map(s => [
        academyDay(s.at), academyClock(s.at), coursesText(s), s.sentBy ?? '',
        String(s.counts.total), String(s.counts.sent), String(s.counts.delivered),
        String(s.counts.bounced), String(s.counts.failed), String(s.counts.spam),
        String(s.counts.excluded),
      ]),
    },
    {
      name: SHEET_EMAIL_MESSAGES,
      header: ['Date', 'Time', 'Course', 'Branch', 'Member', 'Email', 'Status', 'Reason',
               'Sent at', 'Delivered at', 'Bounced at', 'Bounce type', 'Marked as spam at',
               'Subject', 'From', 'Sent by'],
      rows: sends.flatMap(s => s.rows.map(r => [
        academyDay(r.batchAt), academyClock(r.batchAt), r.course ?? '', r.branch ?? '',
        r.memberName, r.email ?? '', emailOutcome(r), r.reason ?? '',
        academyStamp(r.sentAt), academyStamp(r.deliveredAt), academyStamp(r.bouncedAt),
        r.bounceType ?? '', academyStamp(r.complainedAt),
        r.subject ?? '', r.fromEmail ?? '', r.sentBy ?? '',
      ])),
    },
  ];
}

/** Dated in its name: the period it covers. */
export function emailLogFileName(from: string, to: string): string {
  return from === to
    ? `rosifit-attendance-emails-${from}.xlsx`
    : `rosifit-attendance-emails-${from}-to-${to}.xlsx`;
}
