/**
 * WHAT `member_emails.status` MEANS, in one place.
 *
 * WHY THIS IS ITS OWN MODULE AND NOT A LINE IN mock.ts
 *   Two callers need it and they cannot both import it from there.
 *   `src/data/followup.ts` may not value-import from `mock.ts`: mock imports
 *   `isEligible` and `attendancePct` FROM followup and calls them in its module
 *   body, so a value import back would close a require cycle and mock would run
 *   before they exist. `isReachable` was written out by hand for exactly that
 *   reason and the comment there says so. Writing the rule out a SECOND time is
 *   how one question ends up with two answers, which is the defect this module
 *   was extracted for -- so the rule moved here instead, where both can reach
 *   it and neither closes a cycle.
 *
 * THE DEFECT IT CAME FROM
 *   `src/data/repository.ts` used to DROP a suppressed address on the way out
 *   of the member read. The record carried no trace of it, so the member card
 *   said "No usable email" over an address that existed, the Edit form opened
 *   blank, and the operator retyped the address already on the record --
 *   `update_member` found the row still live, set `is_primary`, never touched
 *   `status`, and the save reported success having changed nothing
 *   (requests/2026-09-22-saved-email-not-reflecting.md).
 *
 * WHO WRITES EACH VALUE
 *   `unknown`      -- `create_member` (0016) and `update_member` (0027) on every
 *                     address they insert. The everyday value.
 *   `valid`        -- nothing, yet. Reserved by the CHECK in 0006.
 *   `bounced`      -- `supabase/functions/ses-feedback` from an SNS bounce.
 *   `complained`   -- the same function from an SNS complaint: a spam report.
 *   `unsubscribed` -- the member's own click on the opt-out link (0066),
 *                     through `supabase/functions/unsubscribe`.
 */

/** The five values `member_emails.status` may hold (0006). */
export type EmailStatus = 'unknown' | 'valid' | 'bounced' | 'complained' | 'unsubscribed';

/**
 * Whether a follow-up may be sent to this address.
 *
 * THREE WAYS OF NOT BEING SENDABLE, and the app must not flatten them: a bounce
 * is SES reporting the address does not accept mail, a complaint is a spam
 * report, and an opt-out is the member's own decision. Only the first two may
 * ever be cleared, and only deliberately -- see `reinstateMemberEmail`.
 *
 * `undefined` IS USABLE, and is not the same fact as a value we did not
 * recognise. Absent means the record was constructed without the field: every
 * fixture in `mock.ts` and every hand-built member in the specs, none of which
 * carries a suppression. A value the DATABASE gave us that is not in the CHECK
 * is read as unsendable, because the safe answer withholds mail rather than
 * sending it -- the same reasoning `fetchMembers` applies to an unrecognised
 * `members.status`, where anything the constraint does not name is read as "not
 * on the register".
 */
export const emailUsable = (e: { status?: EmailStatus }): boolean =>
  e.status === undefined || e.status === 'unknown' || e.status === 'valid';

/**
 * Whether a suppression is one the academy may lift.
 *
 * A BOUNCE AND NOTHING ELSE. The line is whose act the suppression was:
 *
 *   - a BOUNCE is the mail system reporting that the address does not accept
 *     mail, which is most often a typo somebody at the academy can correct, so
 *     it is the academy's to lift;
 *   - a COMPLAINT is the member clicking "report spam" in their own mail
 *     client, and an OPT-OUT is the member clicking the unsubscribe link.
 *     Neither is a mistake the academy made, and clearing either would put the
 *     academy back in front of somebody who said stop.
 *
 * NARROWED 22-Sep-2026. The first draft of this module let a complaint be
 * lifted too. That was a policy this bug fix INVENTED, and nothing in the
 * product asked for it -- before this change `send-followups` had no complaint
 * rule at all (it refuses only bounced and unsubscribed), so a complained
 * address was simply sendable. It is suppressed now, which is the conservative
 * half and stays; it is not the academy's to lift.
 *
 * `reinstate_member_email` (0078) refuses both in the database, each in its own
 * words, so this is a screen deciding what to OFFER and never the thing that
 * enforces it.
 */
export const suppressionLiftable = (status?: EmailStatus): boolean =>
  status === 'bounced';

/**
 * The word for a state, for a screen that must name it.
 *
 * Every status carries its own word, never colour alone (guardrail 3). Written
 * about the member, never gendered: the academy is a women's academy and the
 * software is not.
 */
export const emailStateWord = (status?: EmailStatus): string =>
  emailUsable(status === undefined ? {} : { status }) ? 'Email on file'
    : status === 'bounced' ? 'Address bounced'
    : status === 'complained' ? 'Marked as spam'
    : status === 'unsubscribed' ? 'Member unsubscribed'
    : 'Address unusable';
