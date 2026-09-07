/**
 * WHO HAS ALREADY BEEN WRITTEN TO for a period — and the selection rule that
 * follows from it.
 *
 * The send draft lists the members the rule flagged. Until now it said
 * nothing about whether any of them had already had this week's follow-up,
 * so the only thing standing between a member and a second identical email
 * was somebody remembering that Tuesday's send had happened. The fact was
 * already recorded — `email_messages.status = 'sent'`, under a batch whose
 * context names the period — it simply never reached the screen.
 *
 * TWO SOURCES, MERGED, and both are needed:
 *   the SERVER's answer (repository.fetchSentForPeriod) is the durable one,
 *     and the only one that knows about a send somebody else made;
 *   this SESSION's own log is what makes the mark appear the instant a send
 *     returns, without waiting for a refetch — and it is the only source at
 *     all on fixtures, where there is no send history to read.
 * Neither is invented: the session log records the member ids the send
 * itself reported as 'sent', never the ones that were requested.
 *
 * Kept out of the screen because a rule about who gets mailed twice is
 * exactly the kind of thing that must be testable in plain node — and
 * anything importing react-native cannot be.
 */
import type { Period } from './period';

/** member id -> when the follow-up for that period went out, ISO. */
export type SentMap = Record<string, string>;

export const periodKey = (p: Period): string => `${p.from}..${p.to}`;

/** Sends made in THIS app session, by period. In memory only: it is a cache
 *  of something the server already knows, never a second record of it. */
const session = new Map<string, SentMap>();

/**
 * Everything mounted that shows whether she has been written to, so a send
 * reaches all of it at once.
 *
 * The same idiom as `onMembersChanged` (repository.ts) and for the same
 * reason. The member pop-up STAYS MOUNTED under the send dialog it opened --
 * that is what `DIALOG_SCREEN` is for -- so without this its "Email sent"
 * label still read "not sent yet" the moment the send it had just made came
 * back, and the only way to correct it was to close her record and reopen it.
 * A screen that shows a stale answer about an email that has already gone is
 * the same failure as not showing the answer at all.
 */
const listeners = new Set<() => void>();

export function onSentChanged(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export function recordSent(period: Period, memberIds: string[], at = new Date().toISOString()): void {
  const key = periodKey(period);
  const map = { ...(session.get(key) ?? {}) };
  for (const id of memberIds) map[id] = at;
  session.set(key, map);
  for (const listener of listeners) listener();
}

export function sentThisSession(period: Period): SentMap {
  return session.get(periodKey(period)) ?? {};
}

/** Exists for the specs, which must not inherit another test's sends. */
export function clearSentLog(): void {
  session.clear();
}

/** Later wins, so a resend moves the date forward rather than reading as the
 *  first attempt. */
export function mergeSent(a: SentMap, b: SentMap): SentMap {
  const out: SentMap = { ...a };
  for (const [id, at] of Object.entries(b)) {
    if (!out[id] || out[id] < at) out[id] = at;
  }
  return out;
}

/**
 * What is ticked when the dialog opens: everyone the rule flagged who has NOT
 * already been written to this period.
 *
 * This is the "minimal steps" half of the ask made specific. The common send
 * is "everyone who still needs it", and that is one tap — no ticking. A
 * second message to somebody already contacted is possible and stays
 * possible, but it is a deliberate act: her box starts empty and somebody has
 * to tick it.
 */
export function defaultSelection(memberIds: string[], sent: SentMap): string[] {
  return memberIds.filter(id => !sent[id]);
}

/**
 * "3 Sep" — the bare date, or `null` when the stamp is not a date at all.
 *
 * Extracted from `sentLabel` when the member pop-up's already-sent warning
 * needed the same date inside a sentence of its own
 * (requests/2026-09-07-reach-out-already-sent-and-rule-label.md). ONE
 * formatter, because two would be how the row and the warning end up naming
 * different days for one send.
 */
export function sentOn(at: string): string | null {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
}

/** "Sent 3 Sep" — the date only. The hour is on the audit log and on the
 *  result; here it would be precision that changes no decision. */
export function sentLabel(at: string): string {
  const on = sentOn(at);
  return on === null ? 'Already sent' : `Sent ${on}`;
}
