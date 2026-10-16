/**
 * The email log as the offline fixtures tell it -- what Reports' Attendance
 * emails card and a member's Emails tab show with no Supabase project behind
 * them, so both screens are reviewable offline like every other screen.
 *
 * Two sends, both on or before the `anchor` day so they land in whatever
 * period is being looked at: a Prenatal Flow send that the anchor day's
 * evening delivered, bounced and temporarily bounced, and a Postnatal Core
 * send two days earlier with a failure and two exclusions. Built from the
 * fixture members' own names and addresses.
 */
import { MEMBERS } from './mock';
import type { EmailLogRow } from './emailLog';

const DAY_MS = 86_400_000;

/** `day` (YYYY-MM-DD, the academy's day) at hh:mm in Chennai, as an ISO instant. */
function at(day: string, hh: number, mm: number, plusSeconds = 0): string {
  const [y, m, d] = day.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - 330 * 60_000 + plusSeconds * 1000).toISOString();
}

const minusDays = (day: string, n: number): string =>
  new Date(Date.parse(`${day}T00:00:00Z`) - n * DAY_MS).toISOString().slice(0, 10);

export function emailLogFixture(anchor: string): EmailLogRow[] {
  const who = (id: string) => MEMBERS.find(m => m.id === id)!;
  const addr = (id: string) => who(id).emails.find(e => e.primary)?.address ?? null;
  const first = minusDays(anchor, 2);
  const base = (batch: string, day: string, id: string, n: number): EmailLogRow => ({
    messageId: `fx-${batch}-${id}`, batchId: `fx-${batch}`, batchAt: at(day, 18, 0),
    sentBy: 'Academy owner', memberId: id, memberName: who(id).name, email: addr(id),
    fromEmail: 'hello@rosifit.in', course: who(id).course, branch: who(id).branch,
    subject: 'We missed you this week', status: 'sent', reason: null,
    sentAt: at(day, 18, 0, n), deliveredAt: null, bouncedAt: null, bounceType: null, complainedAt: null,
  });
  return [
    { ...base('a', anchor, '1', 4), deliveredAt: at(anchor, 18, 0, 9) },
    { ...base('a', anchor, '4', 5), status: 'bounced', bouncedAt: at(anchor, 18, 1), bounceType: 'Permanent' },
    { ...base('a', anchor, '7', 6), bouncedAt: at(anchor, 18, 2), bounceType: 'Transient' },
    { ...base('b', first, '2', 0), status: 'failed', reason: 'Throttling: maximum sending rate exceeded', sentAt: null },
    { ...base('b', first, '6', 0), status: 'excluded', reason: 'No email on file', email: null, sentAt: null },
    { ...base('b', first, '8', 0), status: 'excluded', reason: 'No email on file', email: null, sentAt: null },
  ];
}
