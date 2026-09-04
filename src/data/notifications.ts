/**
 * Shaping the notification tray, as pure functions.
 *
 * Separate from repository.ts for the reason csvFormat.ts is separate from
 * csv.ts: repository reaches for the Supabase client, and scripts/tsconfig.json
 * -- where *.test.ts is typechecked -- cannot resolve it. A pure module is the
 * only shape these rules can be TESTED in, and they are the half worth
 * testing. Every one of them fails silently:
 *
 *   * a badge that counts finished sends never clears, because nothing in this
 *     product records "read". A tray nobody can empty is worse than no tray.
 *   * a list that puts a finished send above a session awaiting upload buries
 *     the only entry anybody can act on.
 *   * "1 emails sent" is the kind of thing a person stops trusting the rest of
 *     the screen over.
 */

export type NotificationKind = 'awaiting' | 'sent' | 'excluded';

export type Notification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  /** already formatted -- the sheet only ever displays it */
  when: string;
};

/** How many of each kind. A tray is a summary, not an archive: past a handful
 *  nobody reads it, and the screens themselves hold the full list. */
export const NOTIFICATION_LIMIT = 5;

/**
 * The badge counts what is still ACTIONABLE, never what is unread.
 *
 * There is no read state anywhere -- no table, no column, no per-device store
 * -- so a count of "new" would never go down. A session awaiting its
 * attendance file is the only kind a person can do something about; a finished
 * send is in the list to be read and is deliberately not counted.
 */
export function actionableCount(list: Notification[]): number {
  return list.filter(n => n.kind === 'awaiting').length;
}

/**
 * Awaiting first, then what the send could not reach, then what it did.
 *
 * Ordered by whether anything is still owed rather than by time: the newest
 * thing in the tray is usually a finished send, and sorting by time would put
 * it above a session that has been waiting three days.
 */
const RANK: Record<NotificationKind, number> = { awaiting: 0, excluded: 1, sent: 2 };

export function orderNotifications(list: Notification[]): Notification[] {
  return [...list].sort((a, b) => RANK[a.kind] - RANK[b.kind]);
}

/** A session that ran with no attendance file. */
export function awaitingNotification(session:
  { id: string; title: string; meta: string; label: string }): Notification {
  return {
    id: `awaiting-${session.id}`,
    kind: 'awaiting',
    title: `${session.title} awaits upload`,
    body: `${session.meta}. Until the Meet file is in, this session counts for nobody.`,
    when: session.label,
  };
}

/** A finished batch. Only ever built for a batch that actually sent something. */
export function sentNotification(batch:
  { id: string; sent: number; failed: number; subject: string; when: string }): Notification {
  return {
    id: `sent-${batch.id}`,
    kind: 'sent',
    title: `${batch.sent} check-in email${batch.sent === 1 ? '' : 's'} sent`,
    body: `${batch.subject}${batch.failed > 0 ? ` · ${batch.failed} failed` : ''}`
      + '. Every send stores the rule it used.',
    when: batch.when,
  };
}

/**
 * A message the send declined or could not deliver.
 *
 * The REASON comes from the send itself (exclusion_reason, then
 * failure_reason). Reconstructing it afterwards -- "she has no email, so it
 * must have been that" -- is a guess that reads like a record.
 */
export function excludedNotification(message:
  { id: string; name: string | null; status: string;
    exclusionReason: string | null; failureReason: string | null }): Notification {
  return {
    id: `excluded-${message.id}`,
    kind: 'excluded',
    title: '1 email could not be sent',
    body: `${message.name ?? 'A member'} was `
      + `${message.status === 'excluded' ? 'excluded from' : 'not reached by'} the send: `
      + `${message.exclusionReason ?? message.failureReason ?? 'no reason was recorded'}.`,
    when: '',
  };
}
