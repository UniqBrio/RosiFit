/**
 * The opening letter of a refusal the DATABASE wrote.
 *
 * WHY THIS EXISTS
 * `personReadable` (repository.ts, CP-003) deliberately passes a refusal
 * through when the database wrote it for a person to read — "the display name
 * “x” already belongs to another member", "the subscription is not writable".
 * Those sentences are raised by `raise exception`, and every one of them
 * opens lowercase, because that is the Postgres convention and the right one
 * on that side of the wire.
 *
 * On this side it is not a Postgres message any more, it is the only sentence
 * in a dialog, sitting under an error icon in its own banner. It read
 *
 *     the display name "ani" already belongs to another member. Nothing has
 *     been saved.
 *
 * beside a form whose every other sentence is written normally, which is how
 * the operator was told it looked like a leaked fragment rather than the
 * academy's own answer (requests/2026-09-07-display-name-refusal-clears-and-case.md).
 *
 * WHY HERE AND NOT IN repository.ts
 * Same reason as `alias.ts`: `repository.ts` cannot be imported under node,
 * so a rule written inside it cannot be run by a spec. One line of rule with
 * no way to pin it is how it gets "simplified" away later.
 *
 * WHY IT RUNS AFTER personReadable, NOT BEFORE
 * `personReadable` is the guard that decides whether a message was written
 * for a person at all (CP-003, RC-023); this only decides how the sentence it
 * kept should open. Running afterwards means an engine string that slips past
 * `ENGINE_WORDING` now arrives capitalised, reading a shade more like authored
 * prose than it did -- deliberately accepted, because the alternative is
 * raising the first letter of something that may be about to be thrown away,
 * and because the hole is `ENGINE_WORDING`'s to close, not this module's.
 *
 * WHY NOT A MIGRATION
 * The wording is not wrong — the CASE of its first letter is wrong for where
 * it is being shown. Rewriting the `raise exception` strings would mean a
 * migration replacing three function bodies to change one letter each, and
 * would leave the next hand-raised refusal opening lowercase again. The
 * boundary that turns an engine answer into a sentence is the place that
 * owns how a sentence opens.
 */

/**
 * The message with its first character raised, and nothing else touched.
 *
 * Idempotent by construction: every sentence written on THIS side already
 * opens with a capital, and `toUpperCase()` on one is that same letter. A
 * message opening with something that has no upper case — a quotation mark,
 * a digit — comes back unchanged rather than being reshaped into something
 * nobody wrote.
 */
export function sentenceOpening(message: string): string {
  return message ? message.charAt(0).toUpperCase() + message.slice(1) : message;
}

/**
 * Whether a refusal is one about a Google Meet display name.
 *
 * The member dialog's banner is ONE state holding whichever refusal came
 * back: a display name that is taken, an address already on somebody else,
 * days the course does not run, a subscription that is not writable. The form
 * clears it when she starts changing the display name -- so it has to be able
 * to tell that a refusal is about the thing she is changing, or a half-read
 * refusal about her ADDRESS would vanish under a keystroke aimed at something
 * else (requests/2026-09-07-display-name-refusal-clears-and-case.md).
 *
 * Matched on the phrase because that is all the RPC gives us -- a refusal
 * arrives as a sentence, not a code. Both display-name refusals a member
 * write can raise contain it: `the display name "%" already belongs to
 * another member` (0026, 0027) and `a display name must contain at least one
 * letter or digit` (0011). The phrase is asserted here rather than written
 * inline at the form, so the day the SQL rewords, ONE spec fails loudly
 * instead of a clear quietly ceasing to happen.
 */
export function namesADisplayName(message: string): boolean {
  return /display name/i.test(message);
}
