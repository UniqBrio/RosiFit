/**
 * WHAT THE ACADEMY IS TOLD BEFORE AND AFTER A COURSE IS DELETED.
 *
 * Until 0047 the confirmation stated a promise -- "their attendance history
 * stays" -- and could state it without asking anything, because it was true
 * by construction. The repo owner withdrew that promise on 08-Sep-2026
 * (requests/2026-09-08-hard-delete-course.md): deleting a course now removes
 * every session and every attendance record on it, for good. A dialog that
 * can promise nothing has to state a QUANTITY instead, and state it before
 * the tap that cannot be undone -- which is why these sentences take the
 * preview `course_deletion_preview` returns rather than guessing.
 *
 * WHY THE WORDS LIVE HERE AND NOT IN THE SCREEN: app/(tabs)/courses.tsx
 * renders in React Native; the specs run under plain node, so a sentence
 * written inside the screen is a sentence no test can read. Same reason as
 * src/data/memberRemoval.ts, next door, and the deletion is the one write in
 * the product that a wrong sentence makes irreversible.
 */

/** the counts `course_deletion_preview` (0047) answers with */
export type DeletionPreview = {
  offerings: number;
  /** distinct people with an ACTIVE enrolment -- the "N members are enrolled" of the old dialog */
  membersEnrolled: number;
  /** of those, the ones this course is the WHOLE of. Deleting it removes them
   *  outright (0064); a member with another course is not counted here. */
  membersRemoved: number;
  sessions: number;
  sessionsCompleted: number;
  attendanceRecords: number;
  imports: number;
};

/** what the dialog has to work with while it is open */
export type PreviewState =
  | { kind: 'counting' }
  | { kind: 'counted'; preview: DeletionPreview }
  /** the count itself failed; the deletion is still offered, without numbers */
  | { kind: 'uncounted' };

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/**
 * The body of the confirmation. One paragraph, and every clause is a fact
 * the person confirming would want to have been told afterwards.
 */
export function deletionWarning(state: PreviewState): string {
  if (state.kind === 'counting') return 'Counting what this will delete…';

  if (state.kind === 'uncounted') {
    // Nothing to count with. The sentence is still true -- it just cannot
    // say how much -- and it must not be gentler for lacking the numbers.
    return 'What this will delete could not be counted. '
      + 'This permanently deletes the course, its offerings, every session and every '
      + 'attendance record on them. That attendance history cannot be recovered. '
      + 'Recorded in the audit log.';
  }

  const p = state.preview;
  /* WHO GOES WITH IT (0064). "12 members are enrolled" said nothing about
     what happens to them, and since the deletion now REMOVES the ones this
     course is the whole of, the number that matters is that one. Both are
     given when they differ, because "9 of 12" is the fact a person needs and
     neither number carries it alone. */
  const enrolled = p.membersEnrolled === 0
    ? 'Nobody is enrolled.'
    : p.membersRemoved === 0
      ? `${plural(p.membersEnrolled, 'member is', 'members are')} enrolled, and every one of them is in another course too, so none are removed.`
      : p.membersRemoved === p.membersEnrolled
        ? `${plural(p.membersEnrolled, 'member is', 'members are')} enrolled, and this course is the whole of their membership — they are deleted with it, permanently.`
        : `${plural(p.membersEnrolled, 'member is', 'members are')} enrolled. ${p.membersRemoved} of them are in no other course and are deleted with it, permanently; the rest keep their other course.`;

  const offerings = plural(p.offerings, 'offering', 'offerings');

  if (p.sessions === 0) {
    // A course nothing has happened in yet. Still permanent, but there is no
    // history to warn about, and warning about it anyway teaches people to
    // skim the sentence on the day it matters.
    return `${enrolled} This permanently deletes the course and its ${offerings}. `
      + 'Nothing has been recorded on it yet. Recorded in the audit log.';
  }

  const sessions = `${p.sessions === 1 ? 'its 1 session' : `all ${p.sessions} sessions`}`
    + ` (${p.sessionsCompleted} completed)`;
  const attendance = p.attendanceRecords === 0
    ? 'no attendance records'
    : `the ${plural(p.attendanceRecords, 'attendance record', 'attendance records')} on them`;
  // The fingerprint is freed with the import row, which is the answer to the
  // question that started this: a file that landed in a deleted course can
  // be uploaded again into a live one.
  const imports = p.imports === 0 ? ''
    : ` The ${plural(p.imports, 'file', 'files')} imported into it can be uploaded again afterwards.`;

  return `${enrolled} This permanently deletes the course, its ${offerings}, ${sessions} and `
    + `${attendance}. That attendance history cannot be recovered.${imports} `
    + 'Recorded in the audit log.';
}

/** the half of the RPC's answer the toast reads */
export type DeletionResult = {
  sessionsRemoved: number;
  attendanceRemoved: number;
  alreadyDeleted: boolean;
};

/**
 * The toast after the tap. `ok` is claimed by exactly one outcome -- a real
 * deletion that reached the academy database -- because a deletion that did
 * not really happen must not look like one that did.
 */
export function deletionOutcome(
  name: string, r: DeletionResult, source: 'live' | 'fixture',
): { message: string; tone: 'ok' | 'warn' } {
  if (r.alreadyDeleted) return { message: `${name} was already deleted`, tone: 'warn' };
  if (source !== 'live') {
    return { message: `${name} deleted on this device only. The academy database is not configured.`, tone: 'warn' };
  }
  if (r.sessionsRemoved === 0) return { message: `${name} deleted`, tone: 'ok' };
  return {
    message: `${name} deleted — ${plural(r.sessionsRemoved, 'session', 'sessions')} and `
      + `${plural(r.attendanceRemoved, 'attendance record', 'attendance records')} removed`,
    tone: 'ok',
  };
}
