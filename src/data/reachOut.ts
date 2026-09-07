/**
 * WILL AN EMAIL GO, AND HAS ONE GONE ALREADY — the two questions the member
 * pop-up's "Reach out" button never answered
 * (requests/2026-09-07-reach-out-already-sent-and-rule-label.md).
 *
 * The requester's words: *"Add a lebel, if the email is sent only if rule is
 * met — 'Rule is met, Email sent', 'Rule is not met, No email to send'"*, and
 * *"On click of Reach out, there should be a pop-up if the email has sent
 * already."*
 *
 * WHY THERE ARE FOUR STATES AND NOT TWO
 * Two strings were asked for and both are here byte-exact. They cover two of
 * the four things that can be true of a member standing in front of that
 * button, and the two they leave out are the two that matter most:
 *
 *   - the rule HAS flagged her and nobody has written to her yet. "Email
 *     sent" here is a sentence the screen cannot support. RC-017 in this
 *     repository is *"the app said SENT for an email it never sent"* — an S1
 *     — and a label asserting the same thing one layer up is the same defect
 *     with a smaller blast radius, not a different one. She reads
 *     "Rule is met, Email not sent yet", which is the requester's own grammar
 *     with the one clause the case needs.
 *   - the rule has flagged her and she has NO ADDRESS. She is excluded from
 *     every send and named while being excluded (C-76), so nothing is going
 *     out for her either — and the requester's own phrase for that is already
 *     written: "No email to send". No new vocabulary, and the email panel
 *     directly above says why.
 *
 * WHY THE ORDER OF THE CHECKS IS THE RULE FIRST
 * Because that is the requester's model of the feature: *the email is sent
 * ONLY IF the rule is met*. A member the rule has not flagged is not a member
 * with a missing address or an unsent message — she is a member with nothing
 * owed to her, and that is good news, not a gap. It is why 'rule-not-met'
 * wears the neutral tone and not a warning one.
 *
 * WHY THE RULE ITSELF IS NOT EVALUATED HERE
 * `ruleMet` arrives already decided by `isEligible` (followup.ts, CP-011) —
 * the one derivation the weekly list, the dashboard count, the send draft and
 * `follow_up_candidates()` all answer to. A second opinion about who is
 * flagged, computed in a label, is precisely the second list guardrail 1
 * exists to prevent: the pop-up would say "Rule is met" over a draft that
 * lists nobody.
 *
 * Kept out of the screen for the reason every rule in this layer is: a file
 * importing react-native cannot be run by a spec, and a rule with no way to
 * pin it is one that gets "simplified" away later.
 */

import type { StatusKey } from '../theme/tokens';

export type ReachOutState =
  /** the rule has not flagged her — nothing is owed, and that is not a fault */
  | 'rule-not-met'
  /** flagged, reachable, and this period's message has already gone */
  | 'sent'
  /** flagged, reachable, nothing sent yet — the one state with an action in it */
  | 'unsent'
  /** flagged, but there is no address, so she is excluded and counted (C-76) */
  | 'no-address';

/**
 * Which of the four she is in. `sentAt` is the stamp from the merged sent map
 * (server history + this session's own sends, `mergeSent`), absent when
 * nothing has gone out for this period.
 */
export function reachOutState(
  o: { ruleMet: boolean; hasEmail: boolean; sentAt?: string },
): ReachOutState {
  if (!o.ruleMet) return 'rule-not-met';
  if (!o.hasEmail) return 'no-address';
  return o.sentAt ? 'sent' : 'unsent';
}

/**
 * The label each state wears: its WORD, its icon and its tone — never a
 * colour on its own (guardrail 3, CP-010). The tone is a `StatusKey` rather
 * than a colour so the screen resolves it through the measured token pair for
 * whichever theme is on (CP-008); this module ships no colour.
 *
 * Icons are all glyphs already rendered elsewhere in the app, so
 * `scripts/check-icons.ts` covers them by construction: `mark_email_read` and
 * `mail_off` are the member pop-up's own email panel, `schedule` is
 * STATUS.scheduled and `remove` is STATUS.none.
 */
export const REACH_OUT: Record<ReachOutState, { text: string; tone: StatusKey; icon: string }> = {
  // the requester's string, byte-exact
  'rule-not-met': { text: 'Rule is not met, No email to send', tone: 'none', icon: 'remove' },
  // the requester's string, byte-exact
  'sent': { text: 'Rule is met, Email sent', tone: 'present', icon: 'mark_email_read' },
  // her grammar, the clause this case needs — see the note above on RC-017
  'unsent': { text: 'Rule is met, Email not sent yet', tone: 'awaiting', icon: 'schedule' },
  // both halves are the requester's own words, recombined
  'no-address': { text: 'Rule is met, No email to send', tone: 'absent', icon: 'mail_off' },
};

/**
 * Whether pressing Reach out asks first.
 *
 * ONLY when a message has actually gone out this period. It is a warning, not
 * a bar: writing to her twice is a thing the academy is allowed to do — the
 * send draft has always allowed it by a deliberate tick — so the pop-up puts
 * the fact in front of the decision and leaves the decision where it was.
 * Turning it into a refusal would remove a capability that ships today.
 *
 * IT ASKS FOR THE SEND, NOT FOR THE LABEL, which is why it takes the stamp
 * rather than the state. The ask is "there should be a pop-up if the email has
 * sent already" — and "already sent" is a fact about her, not about whether
 * the rule still holds. Keyed on the state instead, two cases went quietly
 * through: a member emailed this week whose figures have since been corrected
 * so the rule no longer flags her, and ANY member during the moment the rule
 * is still loading, when the state is not yet known. Neither could post a
 * duplicate today — the draft would list her unticked, or not at all — but
 * "the guard was unreachable when it mattered" is not a property to rely on.
 */
export const warnsBeforeReachOut = (sentAt?: string): boolean => Boolean(sentAt);
