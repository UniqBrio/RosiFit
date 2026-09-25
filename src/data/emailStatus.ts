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
 * Whether the suppression is the MAIL SYSTEM's verdict on the address, rather
 * than the member's own decision.
 *
 *   - a BOUNCE is the mail system reporting that the address does not accept
 *     mail. Nobody chose it, and the address itself is the thing that is wrong;
 *   - a COMPLAINT is the member clicking "report spam" in their own mail
 *     client, and an OPT-OUT is the member clicking the unsubscribe link. Both
 *     are the member saying stop.
 *
 * This decides WHAT A SCREEN ADVISES, and nothing else. For a bounce the answer
 * is "this address does not work -- use a different one"; for the other two it
 * is "the academy may not write here at all". Neither answer is a licence to
 * change the stored status: no screen in this app reinstates an address.
 *
 * HISTORY, because this line has moved twice and the reasons matter. It began
 * as `suppressionLiftable`, gating a Reinstate action that cleared a bounce
 * through `reinstate_member_email` (0078). It briefly included 'complained',
 * which was a policy this app INVENTED and which was withdrawn on review. Then
 * the Reinstate action itself was withdrawn
 * (requests/2026-09-23-bounced-address-asks-for-a-different-one.md): re-using
 * an address the mail system has already rejected is not a fix, so the form now
 * asks for a DIFFERENT address instead of offering to un-suppress the dead one.
 * The RPC still exists in the database and is deliberately no longer called.
 */
export const isDeliveryFailure = (status?: EmailStatus): boolean =>
  status === 'bounced';

/**
 * An address as the database stores it, trimmed and lower-cased.
 *
 * THE SAME NORMALISATION THE WRITE PATH APPLIES, which is the only reason this
 * function exists rather than two `.trim().toLowerCase()` calls. `update_member`
 * (0027) and `create_member` (0016) both compare and store
 * `btrim(lower(v_email))`, and `member_emails.email` is `citext` on top of that.
 * A form that decided "is this address already on the record" by a different
 * rule than the database uses would answer differently from the database for
 * exactly the inputs that matter -- a trailing space, a capital letter.
 */
export const normalizeEmail = (raw: string): string => raw.trim().toLowerCase();

/**
 * THE WORDING for an address that cannot be used, kept beside the rule rather
 * than inside a screen so the form and its spec quote one source. Two parts
 * each: what is true, and what to do about it.
 *
 * THREE MESSAGES, because they are three different facts and the operator acts
 * on the difference. A bounce is the mail system's; an opt-out and a spam
 * report are the member's, and saying "the address may be invalid" over a
 * member who asked not to be written to would be untrue and would invite the
 * operator to keep trying.
 */
export const BOUNCED_ENTRY_TITLE = 'Email address is not active';
export const BOUNCED_ENTRY_DETAIL =
  'An email was previously sent to this address but could not be delivered. '
  + 'The address may be inactive or invalid. Please try adding a different email address.';

export const OPTED_OUT_ENTRY_TITLE = 'This address has opted out';
export const OPTED_OUT_ENTRY_DETAIL =
  'The member asked not to receive email at this address. Only the member can undo that, '
  + 'so it cannot be added back here. Please use a different email address.';

export const COMPLAINED_ENTRY_TITLE = 'This address reported spam';
export const COMPLAINED_ENTRY_DETAIL =
  'A message sent to this address was reported as spam, so the academy may not write to it '
  + 'again. Please use a different email address.';

/** The pair a screen should show for a suppression it has just refused. */
export function entryRefusal(status?: EmailStatus): { title: string; detail: string } {
  return status === 'unsubscribed'
      ? { title: OPTED_OUT_ENTRY_TITLE, detail: OPTED_OUT_ENTRY_DETAIL }
    : status === 'complained'
      ? { title: COMPLAINED_ENTRY_TITLE, detail: COMPLAINED_ENTRY_DETAIL }
      : { title: BOUNCED_ENTRY_TITLE, detail: BOUNCED_ENTRY_DETAIL };
}

/** The shape this module needs of a stored address; structural so that nothing
 *  here has to import `Member` and close a cycle back through mock.ts. */
export type StoredAddress = { address: string; status?: EmailStatus };

/**
 * The member's own record already holds this address, and it BOUNCED.
 *
 * Answered from the record the app has already loaded -- `Member.emails` carries
 * `status` since RC-106 -- so typing costs no query. Returns the stored row, so
 * a caller can name the address it matched rather than echo what was typed.
 *
 * Deliberately narrow: only 'bounced'. An opt-out or a complaint on the record
 * is a different conversation and keeps its own wording (`emailStateWord`); an
 * address at 'unknown' or 'valid' is simply already there and is not an error
 * at all.
 */
export function bouncedOnRecord<T extends StoredAddress>(
  draft: string, onRecord: readonly T[],
): T | undefined {
  const hit = suppressedOnRecord(draft, onRecord);
  return hit && isDeliveryFailure(hit.status) ? hit : undefined;
}

/**
 * THE MEMBER'S RECORD ALREADY HOLDS THIS ADDRESS, AND IT CANNOT BE USED.
 *
 * Any suppression, not only a bounce, and over the member's HISTORY rather
 * than the addresses currently on the record. That widening is RC-107: the
 * member read filtered out soft-deleted rows, and `update_member` soft-deletes
 * an address left out of a save -- so removing a suppressed address and typing
 * it back in produced a brand new row at 'unknown'. The suppression was erased
 * with no trace, and for an OPT-OUT that is a member put back on the send list
 * after asking not to be. It happened once in production, to one member.
 *
 * An opt-out outranks a complaint outranks a bounce, the same order
 * `suppressedAddress` uses, so a screen leads with the state that most
 * constrains what the academy may do.
 *
 * Answered from data already in memory -- `Member.emails` and
 * `Member.suppressedBefore` both arrive with the roster -- so typing costs no
 * query. Normalised with the same rule the write path applies.
 */
export function suppressedOnRecord<T extends StoredAddress>(
  draft: string, onRecord: readonly T[],
): T | undefined {
  const want = normalizeEmail(draft);
  if (!want) return undefined;
  const matches = onRecord.filter(
    e => normalizeEmail(e.address) === want && !emailUsable(e));
  return matches.find(e => e.status === 'unsubscribed')
    ?? matches.find(e => e.status === 'complained')
    ?? matches[0];
}

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
