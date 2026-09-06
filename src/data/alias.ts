/**
 * The rules for attaching a Google Meet display name to a member.
 *
 * WHY THIS IS ITS OWN MODULE
 * These rules live on both sides of a branch in `repository.addMemberAlias`:
 * offline they are checked against the fixture register, live they are
 * checked by a unique index and come back as a Postgres error code. Two
 * copies of "is this name already taken, and what do we say when it is"
 * is exactly how the offline path starts telling a different story from the
 * live one -- so the rule is written once, here, where it can be run
 * without react-native (`repository.ts` cannot be imported under node).
 *
 * The stakes: the importer MATCHES on these names. An alias that is silently
 * dropped, or attached to the wrong member, looks like a working link and
 * then matches nobody -- or worse, marks the wrong woman present.
 */

/** The display name as it will be stored: trimmed, never otherwise reshaped.
 *  Meet writes what the person typed, and "Rani  Sham" is not ours to fix. */
export function cleanAlias(raw: string): string {
  return raw.trim();
}

/** One wording for one fact, so the offline and live paths cannot diverge. */
export function aliasClaimedMessage(display: string): string {
  return `“${display}” is already a display name for somebody on the register.`;
}

export const ALIAS_EMPTY = 'That display name is empty. Nothing has been saved.';
export const ALIAS_FAILED = 'That display name could not be saved. Nothing has been changed.';
/** The merge moves attendance as well as the name, so a failure has to say
 *  that BOTH halves were left alone -- "the name was not saved" would leave
 *  somebody wondering whether the class records moved anyway. */
export const MERGE_FAILED = 'That merge did not run. Nothing has been changed — she is still on the register under her own name.';

/**
 * Why this display name cannot be saved, or `null` when it can.
 *
 * `claimed` is every alias already on the register. Compared case-insensitively
 * because the database normalizes before it applies the unique index
 * (`member_alias_normalize`, 0006/0011) -- a check that only caught an exact
 * match would pass "RANI SHAM" here and then fail at the insert, which is a
 * refusal the operator gets AFTER being told it worked.
 */
export function aliasProblem(display: string, claimed: string[]): string | null {
  if (!display) return ALIAS_EMPTY;
  const taken = claimed.some(a => a.trim().toLowerCase() === display.toLowerCase());
  return taken ? aliasClaimedMessage(display) : null;
}

/**
 * What a failed insert MEANS, in the words the operator needs.
 *
 * 23505 is the unique index on (alias_type, alias_normalized): the name
 * already points at somebody. That is a real answer about the register, not
 * a glitch, so it is named rather than hidden behind a generic failure.
 */
export function aliasSaveError(code: string | undefined, display: string): string {
  return code === '23505' ? aliasClaimedMessage(display) : ALIAS_FAILED;
}
