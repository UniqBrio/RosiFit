/**
 * What the academy is TOLD after a member is removed.
 *
 * A deletion is the one write in this app that cannot be undone from the
 * screen, so the sentence afterwards is not decoration -- it is the only
 * evidence the person who tapped Remove ever gets that the right thing
 * happened, and the only place the half that SURVIVED is stated out loud.
 * `delete_member` (0044) returns what it did precisely so the toast can say it
 * rather than guess: how many attendance records were kept, and whether this
 * was a real deletion or a second tap on one that had already gone through.
 *
 * WHY IT LIVES HERE AND NOT IN THE SCREEN
 * It was four nested ternaries inside `remove()` in `app/(tabs)/members.tsx`,
 * which is the same objection `joined.ts` was written against: a claim about a
 * write that is computed inside a render body is one nobody can test. There
 * are four outcomes and three of them are the unhappy ones -- already gone,
 * removed against fixtures rather than the academy's own database, and
 * refused -- so they are the outcomes least likely to be seen by hand and most
 * likely to be quietly wrong. Every one of them is asserted in
 * `memberRemoval.test.ts`.
 *
 * THE WORDING DID NOT CHANGE when it moved. These are the sentences the screen
 * already showed, character for character, including "removed, 3 attendance
 * records kept" and the full stop that only the fixtures sentence carries.
 *
 * ONE BEHAVIOUR DID. The screen read `name.split(' ')[0]`, so a name arriving
 * off an imported file with a leading space -- which is not rare, and which
 * nothing upstream trims -- produced the empty string and shipped a toast
 * reading " removed, 3 attendance records kept", addressed to nobody.
 * `firstName` trims first. That is a fix, not a port, and it is asserted.
 *
 * THE TONE IS PART OF THE MESSAGE, not a decoration on it. `ok` is claimed by
 * exactly one outcome -- a real deletion against the real database. A removal
 * that only happened on this device, and a tap that removed nothing because
 * she was already gone, are both `warn`: they read as success and are not one,
 * and guardrail 3 means the tone is never the only signal, so the words say it
 * too.
 */

/** The tone a toast is raised with. `ok` is green, `warn` is amber. */
export type RemovalFlash = { message: string; tone: 'ok' | 'warn' };

/** The half of `MemberDeletion` the sentence actually reads. Structural on
 *  purpose: this module must not import the repository, which reaches for
 *  Supabase the moment it is loaded. */
export type RemovalResult = { attendanceKept: number; alreadyDeleted: boolean };

/** Where the write went. `fixtures` is the offline list, not the academy. */
export type RemovalSource = 'live' | 'fixtures';

/**
 * Her first name, because a toast addresses a person and a full name in a
 * one-line confirmation reads like a record rather than someone the academy
 * knows. A single-word name is its own first name; a blank one stays blank
 * rather than becoming "undefined".
 */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? '';
}

/**
 * The sentence and tone for a deletion that RETURNED -- the call did not
 * throw. Three outcomes, and the order of the checks is the point:
 *
 * `alreadyDeleted` is tested BEFORE the source, because "she had already been
 * removed" is true whichever list answered it, and a second tap offline must
 * not be congratulated as a fresh removal.
 */
export function removalOutcome(
  name: string,
  result: RemovalResult,
  source: RemovalSource,
): RemovalFlash {
  const first = firstName(name);

  if (result.alreadyDeleted) {
    return { message: `${first} had already been removed`, tone: 'warn' };
  }

  if (source !== 'live') {
    return {
      message: `${first} removed on this device only. The academy database is not configured.`,
      tone: 'warn',
    };
  }

  // The kept count is the half a person needs to hear: her attendance is the
  // academy's record of what happened on a day, not hers, and it stays. Zero
  // is a real answer and is said plainly -- "0 attendance records kept" is
  // how a member who never attended reads, and silence there would look like
  // the count failed rather than being none.
  const kept = result.attendanceKept;
  return {
    message: `${first} removed, ${kept} attendance ${kept === 1 ? 'record' : 'records'} kept`,
    tone: 'ok',
  };
}

/**
 * The sentence for a deletion that THREW. The repository has already turned
 * the Postgres error into something a person can read -- the lapsed
 * subscription and the refused permission both arrive here as prose ending in
 * "Nothing has been changed." -- so an Error's own message is preferred and
 * the fallback is only for what is not an Error at all.
 *
 * The fallback repeats "Nothing has been changed" deliberately: after a
 * destructive action that failed, the first question is not what went wrong
 * but whether it went half-way.
 */
export function removalFailure(err: unknown): RemovalFlash {
  return {
    message: err instanceof Error
      ? err.message
      : 'She could not be removed. Nothing has been changed.',
    tone: 'warn',
  };
}
