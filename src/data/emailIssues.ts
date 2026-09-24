/**
 * WHOSE EMAIL CANNOT BE USED, AND WHY — the Email Issues section's derivation.
 *
 * A READING of the roster, not a new rule. Every question about what a status
 * MEANS is asked of `src/data/emailStatus.ts`: `emailUsable` decides sendable,
 * `emailStateWord` names a state, `normalizeEmail` decides when two addresses
 * are the same one. Nothing here re-defines bounced, unsubscribed, complained,
 * reachable or sendable, and nothing here writes anything.
 *
 * WHY IT IS NOT JUST `!isReachable(m)`
 *   Because of RC-107. `update_member` soft-deletes an address left out of a
 *   save, so an address can be suppressed, removed, and then INSERTED AGAIN as
 *   a fresh row at 'unknown' -- by the bulk import, or by any path that is not
 *   the Edit form, which refuses it since 23-Sep-2026. The live row then looks
 *   perfectly healthy and `isReachable` says yes, while the same address is on
 *   record as having bounced or been opted out of.
 *
 *   So this module reads the member's SUPPRESSION HISTORY as well as the live
 *   list (`Member.suppressedBefore`, carried since RC-107) and treats a live
 *   address as suppressed when the same address has been suppressed before.
 *
 *   IT DOES NOT CHANGE WHAT THE SEND DOES. `isReachable` and the send path are
 *   untouched, exactly as this feature's request required. That leaves a real
 *   gap worth naming rather than hiding: a member whose re-added address
 *   carries history is SHOWN here as an issue and is still SENDABLE. Closing
 *   that means changing the send, which is a decision this section is not
 *   entitled to take on its own.
 *
 * WHO IS IN, AND WHO IS NOT
 *   In:  a member holding at least one live address, none of which is usable
 *        once history is folded in.
 *   Out: a member with NO live address at all. That is the "No email" section
 *        immediately above this one, it means something different -- no
 *        address exists, so the answer is to add one -- and the two must not
 *        be merged.
 *   Out: a member holding a usable address, even if they also hold a dead one.
 *        Their email can be used; listing them would be noise in a section
 *        whose whole job is "who needs attention".
 */
import {
  emailUsable, emailStateWord, normalizeEmail, type EmailStatus,
} from './emailStatus';
import { type Member } from './mock';

/** The three suppressions, in the order a reader should meet them. */
export const EMAIL_ISSUE_KINDS = ['bounced', 'unsubscribed', 'complained'] as const;
export type EmailIssueKind = (typeof EMAIL_ISSUE_KINDS)[number];

/** The heading a group wears. The BADGE on each row is `emailStateWord`, which
 *  is the app's existing per-status word; these are the section's own
 *  groupings and are deliberately the shorter form the request asked for. */
export const ISSUE_GROUP_LABEL: Record<EmailIssueKind, string> = {
  bounced: 'Bounced',
  unsubscribed: 'Unsubscribed',
  complained: 'Spam Reported',
};

/**
 * What the GROUP says, and whether anything can be done about it.
 *
 * Written in the plural on purpose, because it is drawn once over the group it
 * is true of and not once per member: a sentence beginning "This member" above
 * three cards names nobody on screen. Every card under the note carries this
 * exact reason, which is what the grouping buys.
 *
 * `action` is 'edit' for a bounce alone: the address is wrong, and the way to
 * fix it is the Edit form the app already has. An opt-out and a spam report
 * are the MEMBER'S decision, so no action is offered at all -- no send,
 * nothing that lifts a suppression, nothing that would override it.
 */
export const ISSUE_READING: Record<EmailIssueKind,
  { title: string; detail: string; action: 'edit' | null }> = {
  bounced: {
    title: 'Email address is not active',
    detail: 'Email sent to these addresses could not be delivered. '
      + 'They may be inactive or invalid.',
    action: 'edit',
  },
  unsubscribed: {
    title: 'Email address is unsubscribed',
    detail: 'These members opted out of receiving emails at the addresses below.',
    action: null,
  },
  complained: {
    title: 'Email reported as spam',
    detail: 'These addresses reported email as spam and should not be used for '
      + 'email communication.',
    action: null,
  },
};

const isIssueKind = (s?: EmailStatus): s is EmailIssueKind =>
  s === 'bounced' || s === 'unsubscribed' || s === 'complained';

/**
 * How much a suppression constrains the academy, most first.
 *
 * An opt-out and a spam report are the member saying stop; a bounce is the
 * mail system reporting a dead address. A member carrying more than one is
 * listed under the one that most limits what may be done, so a screen never
 * offers "update the address" over somebody who asked not to be written to.
 * The same order `suppressedAddress` uses (src/data/followup.ts).
 */
const SEVERITY: Record<EmailIssueKind, number> = {
  unsubscribed: 3, complained: 2, bounced: 1,
};

/**
 * The status this address really carries, its own history included.
 *
 * A live row at 'unknown' whose address was suppressed before is reported as
 * that earlier suppression: the row is new, the address is not, and the fact
 * the operator needs is about the address. This is the RC-107 case, and it is
 * why a fresh 'unknown' row cannot hide what came before it.
 */
export function effectiveStatus(
  address: string, history: readonly { address: string; status: EmailStatus }[] = [],
  own?: EmailStatus,
): EmailStatus | undefined {
  const want = normalizeEmail(address);
  let worst: EmailStatus | undefined = isIssueKind(own) ? own : undefined;
  for (const h of history) {
    if (normalizeEmail(h.address) !== want || !isIssueKind(h.status)) continue;
    if (!worst || SEVERITY[h.status] > SEVERITY[worst as EmailIssueKind]) worst = h.status;
  }
  return worst ?? own;
}

/** What this module needs of a member: the addresses, and the history behind
 *  them. Structural so the roster filter can ask the same question of the
 *  narrower record it carries, rather than keeping a second copy of the rule
 *  (src/data/rosterFilter.ts). */
export type IssueInput = Pick<Member, 'emails'> & Partial<Pick<Member, 'suppressedBefore'>>;

/** One member's issue, or undefined when they have none. */
export type EmailIssue<T = Member> = { member: T; address: string; kind: EmailIssueKind };

export function emailIssueFor<T extends IssueInput>(m: T): EmailIssue<T> | undefined {
  // No live address at all is the "No email" section's case, not this one.
  if (m.emails.length === 0) return undefined;

  const history = m.suppressedBefore ?? [];
  const read = m.emails.map(e => ({
    address: e.address,
    status: effectiveStatus(e.address, history, e.status),
  }));

  // Any address that can still be written to means there is no issue to raise.
  if (read.some(r => emailUsable({ status: r.status }))) return undefined;

  /* Severity first, and A NAMED ADDRESS SECOND, which is not a tidy-up.
     An address row can hold an empty string -- the bulk import has written
     one -- so a member can carry two rows at the SAME severity, one of them
     blank. Sorting on severity alone could pick the blank one, and the row
     would then have had to borrow the other address to have anything to
     print: an address beside a word that is the state of a DIFFERENT address,
     which is worse than either fact on its own. Preferring the row that
     actually names an address at equal severity means the pair always belongs
     together. */
  const worst = read
    .filter((r): r is { address: string; status: EmailIssueKind } => isIssueKind(r.status))
    .sort((a, b) => SEVERITY[b.status] - SEVERITY[a.status]
      || (b.address ? 1 : 0) - (a.address ? 1 : 0))[0];

  // Unusable for a reason this section has no name for -- a status the CHECK
  // constraint gained and this app has not learned. Left out rather than
  // guessed at: a group with no heading is worse than a member not listed.
  if (!worst) return undefined;

  /* Only reachable when EVERY suppressed row at the worst severity is blank,
     the sort above having exhausted the alternatives. The screen says
     "Address not recorded" rather than drawing a dangling separator; nothing
     here invents an address to fill the gap, because any address it reached
     for would be one this status is not about. */
  return { member: m, address: worst.address, kind: worst.status };
}

export type EmailIssueGroup = {
  kind: EmailIssueKind;
  label: string;
  rows: EmailIssue[];
};

/** The ids of every member the section has taken, so the roster above it can
 *  leave them out. ONE derivation feeding both, which is the whole point: a
 *  member listed in two places, or in neither, is what a second filter here
 *  would produce (guardrail 1). */
export const emailIssueIds = (groups: readonly EmailIssueGroup[]): Set<string> =>
  new Set(groups.flatMap(g => g.rows.map(r => r.member.id)));

/**
 * The section, from the roster the screen is already rendering.
 *
 * ONE PASS over members the caller has already narrowed, so the count and the
 * rows come from the same array by construction and cannot drift -- which is
 * the property the request asked for and the one guardrail 1 exists for. No
 * query is made: `Member.emails` and `Member.suppressedBefore` both arrive
 * with the roster.
 *
 * Course scoping is the CALLER'S, and deliberately so: the course screen hands
 * in the list it is drawing, which is already `enrolledIn(members, course)`
 * narrowed by branch, search and the reading filters. A second course filter
 * here would be a second answer to "who is on this roster".
 */
export function emailIssueGroups(roster: readonly Member[]): EmailIssueGroup[] {
  const found = roster.map(emailIssueFor).filter((i): i is EmailIssue => !!i);
  return EMAIL_ISSUE_KINDS
    .map(kind => ({
      kind,
      label: ISSUE_GROUP_LABEL[kind],
      rows: found.filter(i => i.kind === kind),
    }))
    .filter(g => g.rows.length > 0);
}

/** The total, from the same groups the rows are drawn from. */
export const emailIssueCount = (groups: readonly EmailIssueGroup[]): number =>
  groups.reduce((n, g) => n + g.rows.length, 0);

/** The badge word for a row — the app's existing per-status word, not a new one. */
export const issueBadge = (kind: EmailIssueKind): string => emailStateWord(kind);
