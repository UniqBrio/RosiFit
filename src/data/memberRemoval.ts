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
 * The body of the confirmation, BEFORE the tap. One paragraph, and every
 * clause is a fact the person confirming would want to have been told
 * afterwards.
 *
 * The dialog's title already names her ("Remove Priya Raman?"), so the body
 * says "her" rather than repeating it -- the sentence is about what goes, and
 * a name repeated three times in four lines reads like a form letter at the
 * moment somebody most needs to actually read it.
 */
export function deletionWarning(state: PreviewState): string {
  if (state.kind === 'counting') return 'Counting what this will delete…';

  if (state.kind === 'uncounted') {
    // Nothing to count with. The sentence is still true -- it just cannot say
    // how much -- and it must not be gentler for lacking the numbers.
    return 'What this will delete could not be counted. '
      + 'This permanently removes her from the database: her enrolments, every attendance '
      + 'record she has and the mail the academy has sent her. '
      + 'That attendance cannot be recovered. Recorded in the audit log.';
  }

  const p = state.preview;
  const enrolments = p.enrolments === 0
    ? 'She is not enrolled in anything.'
    : `${plural(p.enrolments, 'enrolment', 'enrolments')} of hers ${p.enrolments === 1 ? 'goes' : 'go'} with her.`;

  if (p.attendanceRecords === 0) {
    // A member nothing has been recorded against yet. Still permanent, but
    // there is no history to warn about, and warning about it anyway teaches
    // people to skim the sentence on the day it matters.
    return `This permanently removes her from the database. ${enrolments} `
      + 'Nothing has been recorded against her yet. Recorded in the audit log.';
  }

  // The clause that matters most, and the one the old dialog promised the
  // opposite of: her attendance was the academy's record of who was in the
  // room, so the days themselves change. The sessions are not deleted -- they
  // are the academy's classes -- but they will show one fewer person present,
  // and somebody reading a report next month is owed that now.
  const attendance = `${plural(p.attendanceRecords, 'attendance record', 'attendance records')} `
    + `across ${plural(p.sessionsAttended, 'session', 'sessions')}`;
  const emails = p.emailsSent === 0 ? ''
    : ` The ${plural(p.emailsSent, 'email', 'emails')} the academy sent her ${p.emailsSent === 1 ? 'goes' : 'go'} too.`;

  return `This permanently removes her from the database, with her ${attendance}. ${enrolments}`
    + `${emails} Those ${p.sessionsAttended === 1 ? 'session counts' : 'sessions count'} `
    + 'one fewer person present afterwards, and that cannot be recovered. '
    + 'Recorded in the audit log.';
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
    return { message: `${first} removed — nothing of hers is left`, tone: 'ok' };
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
      : 'She could not be removed. Nothing has been changed.',
    tone: 'warn',
  };
}
