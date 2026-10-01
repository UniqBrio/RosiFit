import type { EmailStatus } from './emailStatus';

/**
 * TURN FOLLOW-UPS BACK ON — the staff route back from an opt-out
 * (requests/2026-10-01-resubscribe-recovery-and-gmail-one-click.md).
 *
 * A member who opted out through Gmail's own Unsubscribe never sees our page,
 * and one who deleted every old email has no signed link left. When that
 * member asks the academy to start again, a signed-in user records it here:
 * `staff_resubscribe_member_email` (0084) makes the change and audits who,
 * when, which address, from what to what, and HOW the member asked.
 *
 * The rules that matter are the database's; this file only decides what the
 * form OFFERS, so it never offers what 0084 refuses.
 */

/** How the member asked. The keys are what 0084 accepts, word for word. */
export const RESUBSCRIBE_SOURCES = [
  { key: 'whatsapp', label: 'WhatsApp' },
  { key: 'phone', label: 'Phone call' },
  { key: 'in_person', label: 'In person' },
  { key: 'email_reply', label: 'Replied by email' },
  { key: 'other', label: 'Other' },
] as const;

export type ResubscribeSource = (typeof RESUBSCRIBE_SOURCES)[number]['key'];

export const RESUBSCRIBE_NOTE_MAX = 500;

/**
 * Whether the Edit form offers "Turn follow-ups back on" for this address.
 * Only an OPT-OUT, and only a saved address (it is acted on by its row id). A
 * bounce asks for a different address; a spam report is not the academy's to
 * lift. 0084 also refuses an opt-out made on top of a spam report -- that one
 * is only knowable from the history, so the database says it in words.
 */
export const offersStaffResubscribe = (e: { status?: EmailStatus; id?: string }): boolean =>
  e.status === 'unsubscribed' && !!e.id;

/** Why the confirm button is held, or null when the choice can be saved. */
export function resubscribeChoiceProblem(source: ResubscribeSource | null, note: string): string | null {
  if (!source) return 'Choose how the member asked.';
  if (source === 'other' && !note.trim()) return 'Add a note saying how the member asked.';
  if (note.trim().length > RESUBSCRIBE_NOTE_MAX) return `Keep the note to ${RESUBSCRIBE_NOTE_MAX} characters or fewer.`;
  return null;
}

/**
 * Every address on a member the staff action may be offered for, in record
 * order. The Reach Out pop-up, the send draft and the Attendance list all
 * ask this one question, so a screen can never offer the action for an
 * address another screen would not (requests/2026-10-01-staff-resubscribe-everywhere.md).
 */
export function resubscribableAddresses<E extends { status?: EmailStatus; id?: string }>(emails: readonly E[]): E[] {
  return emails.filter(offersStaffResubscribe);
}

/** The words every staff entry point uses, in one place. */
export const RESUBSCRIBE_COPY = {
  /** the compact action on Reach Out and Attendance */
  action: 'Resubscribe',
  /** the confirmation's question */
  title: 'Turn follow-ups back on for this email?',
  success: 'Follow-ups turned back on for this email.',
  already: 'Follow-ups were already on for this email.',
} as const;

/** What the staff member is told after a confirmed press. */
export const resubscribeOutcomeMessage = (result: 'resubscribed' | 'already'): string =>
  result === 'already' ? RESUBSCRIBE_COPY.already : RESUBSCRIBE_COPY.success;

/**
 * Why the dialog's confirm is held: an address must be chosen when there is
 * more than one on offer, then the source rule above. Null when it can go.
 */
export function resubscribeConfirmProblem(
  choiceIds: readonly string[], pickedId: string | null, source: ResubscribeSource | null, note: string,
): string | null {
  if (!pickedId || !choiceIds.includes(pickedId)) return 'Choose which address to turn back on.';
  return resubscribeChoiceProblem(source, note);
}
