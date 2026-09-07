/**
 * WHAT THE UPLOAD SAYS WHEN THERE IS NOTHING LEFT TO DO.
 *
 * The requester: *"Improve the feedback when a user uploads the same CSV
 * again without any changes. Currently, the system does not provide enough
 * information. If the CSV was already imported and all attendance is already
 * marked, clearly tell the user that there is nothing new to update ... If a
 * file contains a combination of existing and new records, provide useful
 * feedback about what was added, skipped, or updated."*
 *
 * THE SAME FILE ARRIVES TWICE IN TWO DIFFERENT WAYS, and only one of them
 * was ever visible:
 *
 *   BYTE FOR BYTE. The fingerprint matches a completed import, so nothing
 *   runs at all. This used to be `409 · "This file has already been
 *   imported."`, rendered in the red failure panel with "Nothing was
 *   written." appended — which reads as *the upload failed*, to somebody
 *   whose actual question was "did the first one work?". `alreadyImported`
 *   below answers that question instead: the register exists, this many are
 *   marked on it, there is nothing to update.
 *
 *   THE SAME CLASS, EXPORTED AGAIN. Meet writes a fresh file every export,
 *   so the fingerprint differs and the import genuinely runs — over a
 *   register that already says exactly what the file says. Every row is an
 *   upsert onto attendance_unique_live, so nothing is duplicated, and the
 *   result screen said "12 marked present" exactly as it had the first time.
 *   `changeSummary` and `nothingChanged` read the counts 0045 added, so the
 *   second upload can say that it moved nothing — and a partly-new file can
 *   say which part was new.
 *
 * WHY THE WORDS LIVE HERE AND NOT IN THE SCREEN: `app/upload.tsx` renders in
 * React Native; the specs run under plain node, so a sentence written inside
 * the screen is a sentence no test can read. Same reason as
 * src/data/uploadOverride.ts, next door.
 */
import type { OverrideCounts } from './uploadOverride';

/** how a day is written for a person: '2026-08-31' -> 'Mon 31 Aug' */
export type DayLabel = (iso: string) => string;

/**
 * What csv-import answers when the fingerprint is already on a completed
 * import. Nothing was staged and nothing was written: this describes the
 * EARLIER import and the register it left behind, as both stand right now.
 */
export type AlreadyImported = {
  file_name: string;
  /**
   * when that import completed. Carried because it is what the audit entry
   * is keyed to and what an operator would ask next; deliberately NOT in the
   * sentences below, because turning a timestamp into a day is a local-time
   * question this module cannot answer for every device it runs on.
   */
  completed_at: string;
  /** the day it covered — the register it wrote */
  session_date: string;
  /** the course it landed in, which need not be the one she has open */
  course_name: string;
  branch_name: string;
  same_course: boolean;
  /** how many are marked present or extra on that register RIGHT NOW */
  marked: number;
  /** the session still exists — nobody deleted the day it wrote */
  register_live: boolean;
};

/**
 * What a commit MOVED, from 0045. Distinct from the counts next door:
 * `OverrideCounts` is what replacing an earlier file took away, this is what
 * this file put there.
 */
export type ImportChanges = {
  /** named by the file, and she had no attendance row at all */
  added: number;
  /** named by the file, had a row, and this file changed its status */
  updated: number;
  /** named by the file, and the row already said what the file says */
  unchanged: number;
  /** due, not named, and recorded absent for the first time */
  absent_added: number;
};

export type OutcomeWords = {
  title: string;
  /** the paragraphs, in order */
  lines: string[];
  /** the quieter line under them */
  note: string;
};

/**
 * THE SAME FILE AGAIN, in the words the requester asked for.
 *
 * Her sentence — *"File already imported. Attendance is already marked and
 * there is nothing to update."* — is the first line verbatim whenever it is
 * TRUE, which is the ordinary case and the one she described. It is not said
 * when the register no longer holds those marks, because then it would be a
 * comforting sentence that is false, and the two cases below say what is
 * actually there instead.
 */
export function alreadyImportedWords(a: AlreadyImported, ctx: {
  /** what she just picked, which may be named differently from the file already held */
  fileName: string;
  /** "Prenatal Flow · Coimbatore", the offering she has open now */
  course: string;
  label: DayLabel;
}): OutcomeWords {
  const day = ctx.label(a.session_date);
  const where = `${a.course_name} · ${a.branch_name}`;
  // The name RosiFit filed it under, which is what she will find if she goes
  // looking. Only worth saying when it differs from the name she just picked.
  const filed = a.file_name === ctx.fileName ? '' : ` (RosiFit has it as ${a.file_name})`;

  // A register somebody deleted. Nothing to update is the wrong sentence:
  // there is something to do, and this says what.
  if (!a.register_live) {
    return {
      title: 'Already imported, and the register is gone',
      lines: [
        `${ctx.fileName} was already imported for ${where} — the ${day} register${filed} — and `
        + `that register has since been deleted.`,
        `RosiFit imports a file once, so this upload wrote nothing. Export ${day} again from `
        + `Meet and upload that file to rebuild the register.`,
      ],
      note: 'Nothing was written, and no attendance record was duplicated.',
    };
  }

  // Imported, but nothing is marked on the day it wrote. Somebody changed
  // every mark by hand, or the members left. Saying "attendance is already
  // marked" here would be a lie an operator could check in two taps.
  if (a.marked === 0) {
    return {
      title: 'Already imported, but nobody is marked on that day',
      lines: [
        `${ctx.fileName} was already imported for ${where} — the ${day} register${filed} — but `
        + `nobody is marked present on it now. Every mark it made has been changed since.`,
        `RosiFit imports a file once, so this upload changed nothing. Mark her on the ${day} `
        + `roster, or export ${day} again from Meet and upload that file.`,
      ],
      note: 'Nothing was written, and no attendance record was duplicated.',
    };
  }

  return {
    title: 'Nothing to update',
    lines: [
      // The requester's own sentence, and the whole answer to the question
      // that makes somebody upload the same file twice.
      'File already imported. Attendance is already marked and there is nothing to update.',
      `${ctx.fileName} was imported for ${where} — the ${day} register${filed} — and `
      + `${a.marked} ${a.marked === 1 ? 'member is' : 'members are'} marked present on it now. `
      + `Importing it again would mark exactly the same people.`,
      // The fingerprint is unique across the whole table, so the file may
      // well have landed somewhere else entirely. "Already imported" without
      // saying where is the sentence that sends somebody hunting.
      ...(a.same_course ? [] : [
        `That is not the course you have open: nothing about this file has touched ${ctx.course}.`,
      ]),
    ],
    note: 'Nothing was written, and no attendance record was duplicated.',
  };
}

/**
 * Did this commit move anything at all?
 *
 * `null` changes means the server does not report them — a project still on
 * 0044's commit_csv_import — and a screen must not announce "nothing
 * changed" on the strength of numbers it never received. Absence of evidence
 * is answered false here and reported as nothing at all by the caller.
 *
 * `unchanged` is deliberately not in the sum: rows that already agreed with
 * the file are exactly what this question is about.
 */
export function nothingChanged(
  changes: ImportChanges | null, override: OverrideCounts | null
): boolean {
  if (!changes) return false;
  return changes.added === 0 && changes.updated === 0 && changes.absent_added === 0
    && (override?.reverted ?? 0) === 0 && (override?.removed ?? 0) === 0;
}

/**
 * A file that ran and changed nothing: same class, exported again, register
 * already correct. Not an error and not a duplicate — the upsert wrote every
 * row onto the one it already had.
 */
export function noChangeWords(changes: ImportChanges, ctx: {
  day: string; course: string; label: DayLabel;
}): OutcomeWords {
  const day = ctx.label(ctx.day);
  const n = changes.unchanged;
  return {
    title: 'Nothing to update',
    lines: [
      `Every name in this file was already marked on the ${day} register for ${ctx.course}. `
      + `${n} ${n === 1 ? 'member' : 'members'} matched what RosiFit already had, so nothing `
      + `was added, changed or duplicated.`,
    ],
    note: 'A member cannot be in her own session twice — one attendance record per member per day.',
  };
}

/**
 * WHAT A FILE OF NEW AND EXISTING ROWS DID, clause by clause, in the three
 * words the requester used: added, updated, skipped.
 *
 * Null when the server does not report changes, and null when every counter
 * is zero — a note that says nothing happened belongs to `noChangeWords`,
 * which says it in a sentence rather than in four zeroes.
 */
export function changeSummary(changes: ImportChanges | null): string | null {
  if (!changes) return null;
  const parts: string[] = [];
  if (changes.added > 0) {
    parts.push(`${changes.added} ${changes.added === 1 ? 'name' : 'names'} added to the register`);
  }
  if (changes.updated > 0) {
    parts.push(`${changes.updated} already on it ${changes.updated === 1 ? 'was' : 'were'} updated `
      + 'by this file');
  }
  if (changes.unchanged > 0) {
    // The requester's "skipped", said with what it means: the row was there
    // and correct, so nothing was written for her a second time.
    parts.push(`${changes.unchanged} already marked exactly as this file says `
      + `${changes.unchanged === 1 ? 'was' : 'were'} skipped, not written twice`);
  }
  if (changes.absent_added > 0) {
    parts.push(`${changes.absent_added} due and not in the file `
      + `${changes.absent_added === 1 ? 'was' : 'were'} recorded absent`);
  }
  if (parts.length === 0) return null;
  return `${parts.join('; ')}.`;
}
