/**
 * What the academy is TOLD BEFORE AND AFTER a member is removed.
 *
 * A deletion is the one write in this app that cannot be undone from the
 * screen, so the sentence around it is not decoration -- it is the only
 * evidence the person who tapped Remove ever gets that the right thing
 * happened.
 *
 * UNTIL 0051 THIS FILE COULD MAKE A PROMISE: "her attendance history stays",
 * true by construction because the delete was a soft one and the foreign keys
 * refused anything else. The repo owner withdrew that promise on 08-Sep-2026
 * (requests/2026-09-08-hard-delete-member.md) in the same terms as the course
 * decision that morning: deleting a student now removes her record entirely --
 * her attendance records, her expected-slots, her enrolments, her addresses,
 * her aliases, her schedules and the mail the academy sent her.
 *
 * There was never a middle option to weigh. attendance_records.member_id,
 * session_expectations.member_id and email_messages.member_id all reference
 * members(id) with NO ACTION, so those rows either go with her or the deletion
 * cannot happen at all.
 *
 * A DIALOG THAT CAN PROMISE NOTHING HAS TO STATE A QUANTITY INSTEAD, and state
 * it before the tap rather than after -- which is why `deletionWarning` takes
 * the preview `member_deletion_preview` (0051) returns rather than guessing,
 * exactly as src/data/courseDeletion.ts does next door.
 *
 * WHY THE WORDS LIVE HERE AND NOT IN THE SCREEN
 * They were four nested ternaries inside `remove()` in app/(tabs)/members.tsx,
 * and the same question is now asked from TWO screens -- the Members tab and
 * the course roster card. A claim about a write that is computed inside a
 * render body is one nobody can test, and one that drifts apart between two
 * copies. The specs run under plain node; a sentence written inside a React
 * Native screen is a sentence no test can read.
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

/** the counts `member_deletion_preview` (0051) answers with */
export type DeletionPreview = {
  /** every attendance row of hers, soft-deleted ones included -- they all go */
  attendanceRecords: number;
  /** the days those rows span; the sessions survive her, their figures do not */
  sessionsAttended: number;
  enrolments: number;
  /** mail actually SENT, not queued */
  emailsSent: number;
};

/** what the dialog has to work with while it is open */
export type PreviewState =
  | { kind: 'counting' }
  | { kind: 'counted'; preview: DeletionPreview }
  /** the count itself failed; the deletion is still offered, without numbers */
  | { kind: 'uncounted' };

/** The half of `MemberDeletion` the sentence actually reads. Structural on
 *  purpose: this module must not import the repository, which reaches for
 *  Supabase the moment it is loaded. */
export type RemovalResult = {
  attendanceRemoved: number;
  sessionsTouched: number;
  alreadyDeleted: boolean;
};

/** Where the write went. `fixtures` is the offline list, not the academy. */
export type RemovalSource = 'live' | 'fixtures';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

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
 * The body of the confirmation, BEFORE the tap. TWO SHORT SENTENCES -- what is
 * going, and the question.
 *
 * SHORTENED 08-Sep-2026 at the repo owner's asking, having seen the counted
 * version on screen: "this is very much info keep it simple you are deleting
 * member and its records do you want to delete it permanently thats it"
 * (requests/2026-09-08-member-delete-confirm-yes-no.md).
 *
 * What it replaced was a counted paragraph -- "with her 3 attendance records
 * across 2 sessions … those sessions count one fewer person present
 * afterwards … Recorded in the audit log". Every clause of it was true, and
 * together they were six lines over a Yes/No question, which is a paragraph
 * people learn to tap past. The two facts that decide the answer are that the
 * records go too and that it is permanent, so those are what is left.
 *
 * WHY THE PARAMETER STAYS. The sentence no longer varies -- the same words for
 * counting, counted and uncounted -- but `state` is kept in the signature
 * deliberately: the counts still exist behind `member_deletion_preview`, and a
 * later ask to put one number back (or to show them under a "details" line)
 * changes this function only. Dropping the parameter would take both screens,
 * both their specs and the preview plumbing with it.
 *
 * The dialog's title already names her, so the body says "her" rather than
 * repeating it.
 */
export function deletionWarning(_state: PreviewState): string {
  return 'You are deleting this member and all their records. '
    + 'Do you want to delete it permanently?';
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

  // The count is the half a person needs to hear, and since 0051 it is a count
  // of what WENT rather than what was kept. Zero is a real answer and is said
  // plainly -- a member who never attended reads that way, and silence there
  // would look like the count failed rather than being none.
  if (result.attendanceRemoved === 0) {
    return { message: `${first} removed — nothing of theirs is left`, tone: 'ok' };
  }

  return {
    message: `${first} removed — `
      + `${plural(result.attendanceRemoved, 'attendance record', 'attendance records')} `
      + `across ${plural(result.sessionsTouched, 'session', 'sessions')} deleted`,
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
      : 'The member could not be removed. Nothing has been changed.',
    tone: 'warn',
  };
}
