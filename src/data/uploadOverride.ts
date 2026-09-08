/**
 * WHAT THE UPLOAD ASKS BEFORE IT WRITES, and in exactly which words.
 *
 * THE COURSE IS ASKED FIRST, BEFORE THE FILE PICKER, and it is asked EVERY
 * TIME -- `courseConfirmWords` at the bottom of this file. That reverses round
 * 3's "directly import data no confirmation", on the requester's own
 * instruction, restated to them and confirmed
 * (requests/2026-09-08-upload-course-confirm-and-result-trim.md, A1 and A2).
 * It is a separate ask from the two below and it cannot be folded into them:
 * it happens before there is a file to describe, and they happen after the
 * preview. A clashing file is therefore asked twice, which is the cost of A1
 * and is recorded as such rather than quietly avoided.
 *
 * Past that point the upload imports on the pick and asks nothing more. There
 * are two facts that earn a second interruption, and this module is the one
 * place that decides which of them apply:
 *
 *   THE FILE IS FOR ANOTHER DAY. She opened 3 Sep and the file says 31 Aug.
 *   Already asked since round 3; the wording below is that dialog's, verbatim.
 *
 *   THE DAY ALREADY HAS A REGISTER. A completed import already covers this
 *   offering on this day, so importing OVERRIDES it. This was only ever said
 *   AFTERWARDS -- the `upload-superseded` note on the result screen, read
 *   once the register had already been replaced.
 *
 * ONE DIALOG, NEVER TWO. The requester's own case is both at once ("show pop
 * up that the uploaded session is for 31aug on upload it will override the
 * 31st aug attendance record ... on click confirm override thats all"), so
 * both facts are carried by one ask with one confirm.
 *
 * WHY THE WORDS LIVE HERE AND NOT IN THE SCREEN. `app/upload.tsx` renders in
 * React Native; the specs run under plain node (scripts/tsconfig.json), so a
 * sentence written inside the screen is a sentence no test can read. This is
 * the same reason src/data/message.ts holds the course wording rules.
 */

/** what csv-import's preview returns when a completed import already covers this day */
export type Supersedes = { file_name: string; completed_at: string } | null;

/** how a day is written for a person: '2026-08-31' -> 'Mon 31 Aug' */
export type DayLabel = (iso: string) => string;

export type ImportAsk = {
  /** the day the FILE says it covers -- always where the import lands */
  fileDay: string;
  /** the day she opened, when one was chosen and it is not the file's day */
  clashWith: string | null;
  /** the file that already holds this day's register, when one does */
  overrides: string | null;
};

/**
 * Is anything owed before this file is committed?
 *
 * `null` means no: import it, say nothing, which is what an ordinary upload
 * must stay. Note that `openedDay` is only ever set when a day was actually
 * CHOSEN -- opened from a course header or the Attendance tab there is no day
 * for the file to disagree with, and inventing a question there would put a
 * dialog in front of every ordinary import (round 3, Q7).
 */
export function importAsk(input: {
  fileDay: string;
  openedDay: string | null;
  supersedes: Supersedes;
}): ImportAsk | null {
  const clashWith = input.openedDay && input.openedDay !== input.fileDay ? input.openedDay : null;
  const overrides = input.supersedes?.file_name ?? null;
  if (!clashWith && !overrides) return null;
  return { fileDay: input.fileDay, clashWith, overrides };
}

export type AskWords = {
  title: string;
  /** the paragraphs of the ask, in order */
  lines: string[];
  /** the quieter line under them */
  note: string;
  /** the button that goes ahead */
  confirm: string;
  /** the button that does not */
  cancel: string;
};

/**
 * WHAT THE ASK SAYS.
 *
 * The clash-only wording is round 3's, BYTE FOR BYTE -- it shipped, it is
 * what the requester approved, and re-writing a string nobody asked about is
 * a product change nobody approved (the freeze rule). Everything new here
 * appears only when a register is actually being overridden.
 */
export function askWords(ask: ImportAsk, ctx: {
  fileName: string;
  /** "Prenatal Flow · Coimbatore", the offering this lands in */
  course: string;
  label: DayLabel;
}): AskWords {
  const L = ctx.label;
  const day = L(ask.fileDay);

  // The sentence round 3 shipped, unchanged. It says WHICH DAY the file
  // lands on, which is still the first thing to answer when the two disagree.
  const clashLine = ask.clashWith
    ? `You opened ${L(ask.clashWith)}. ${ctx.fileName} says it covers ${day}, so importing it `
      + `updates the ${day} register for ${ctx.course} — not ${L(ask.clashWith)}.`
    : null;

  if (!ask.overrides) {
    return {
      title: `This file is from ${day}`,
      // No cast. importAsk never returns an ask with neither reason, but an
      // `as string` here would let a hand-built one render the word "null" at
      // an operator, and a panel with no sentence is the honest failure.
      lines: clashLine ? [clashLine] : [],
      note: 'The day always comes from the file, never from the screen. Nothing has been written yet.',
      confirm: `Import for ${day}`,
      cancel: 'Choose another file',
    };
  }

  return {
    title: ask.clashWith ? `This file overrides the ${day} register` : `${day} already has a register`,
    lines: [
      ...(clashLine ? [clashLine] : []),
      `${ask.overrides} was already imported for ${ctx.course} on ${day}. Importing `
      + `${ctx.fileName} OVERRIDES that register: the ${day} attendance you have now is `
      + `replaced by what this file says, and nobody is counted twice.`,
    ],
    // Said because it is the one thing an override does NOT take back, and
    // somebody who corrected a register by hand needs to know that before she
    // agrees to replace it (set_attendance, 0035).
    note: 'Marks you made by hand on the roster are kept. Nothing has been written yet.',
    // The requester's own word for this button -- "on click confirm override" --
    // and round 3's rule that the DAY is on the button, because the button is
    // the one control she actually presses and the day is the thing she could
    // be wrong about. Both, rather than either.
    confirm: `Override the ${day} register`,
    cancel: 'Choose another file',
  };
}

/**
 * THE COURSE, CONFIRMED BEFORE THE FILE PICKER OPENS.
 *
 * *"On clicking of upload session and browse file give a pop up asking user
 * that you are uploading for course postnatal confirms yes or no ... once they
 * confirm import the files"* -- and *"or rephrase as senior design engineer"*,
 * which is the wording delegated in as many words.
 *
 * WHY IT SAYS SO LITTLE. Every other ask in this dialog runs after the preview
 * and can name the file, the day it covers and the register it replaces. This
 * one runs before `pickCsvFile()`, so the only facts that exist yet are the
 * course and the branch. It says those, says what pressing yes will do, and
 * stops -- an ask that padded itself out with what it does not know would be
 * training people to click past the two asks that do know.
 *
 * It returns `AskWords` -- the same shape as `askWords` above -- so the screen
 * draws one panel for both and there is one ask vocabulary rather than two.
 */
export function courseConfirmWords(ctx: {
  /** "Postnatal Flow", the course this lands in */
  course: string;
  /** "Coimbatore", the branch of it */
  branch: string;
}): AskWords {
  // The offering, whole, in ONE place. It was in the title and again at the
  // head of the line under it -- "Uploading for Postnatal Core / Postnatal
  // Core · Madurai is where this file lands" -- which is the course said twice
  // to somebody who is being asked to check it once.
  const where = ctx.branch ? `${ctx.course} · ${ctx.branch}` : ctx.course;
  return {
    title: `Uploading for ${where}`,
    lines: [
      `Choose a Meet CSV next and it is imported into that course straight away — the day it `
      + `covers comes from the file, never from this screen.`,
    ],
    // "Nothing has been written yet" is the sentence both other asks end on,
    // and it is more literally true here than anywhere: no file has even been
    // read. The second half says what No does, because a No that dumps her
    // somewhere she did not expect is worse than no question at all.
    note: 'Nothing has been written yet. No takes you back, where Change picks a different course.',
    // The requester asked for "yes or no", and the repo's rule is that the
    // thing she could be WRONG about goes on the button she presses. Here that
    // is the course, so the yes carries it -- the course name alone, not the
    // branch too, because a button is not a sentence.
    confirm: `Yes, choose a file for ${ctx.course}`,
    cancel: 'No, not this course',
  };
}

/**
 * WHAT AN OVERRIDE DID, once it has done it.
 *
 * Counts returned by commit_csv_import when this file replaced a register.
 * They exist because "your data will be overridden" is a promise, and a
 * promise nobody can check afterwards is where the next correction comes
 * from: `reverted` is who the previous file marked present and this one does
 * not name, `removed` is the same for somebody who was never expected, and
 * `kept_by_hand` is what the override deliberately left alone.
 */
export type OverrideCounts = { reverted: number; removed: number; kept_by_hand: number };

/** the sentence under "This day already had a file", or null when nothing moved */
export function overrideSummary(counts: OverrideCounts | null): string | null {
  if (!counts) return null;
  const parts: string[] = [];
  if (counts.reverted > 0) {
    parts.push(`${counts.reverted} ${counts.reverted === 1 ? 'member the previous file marked present is'
      : 'members the previous file marked present are'} now absent`);
  }
  if (counts.removed > 0) {
    // "record" is the mechanism's noun for a person, and at n > 1 "records for
    // somebody" does not agree with itself. This says who, and says what is
    // true now rather than what an operation did.
    parts.push(counts.removed === 1
      ? '1 person who was not expected and is not in this file is off the register'
      : `${counts.removed} people who were not expected and are not in this file `
        + 'are off the register');
  }
  if (counts.kept_by_hand > 0) {
    parts.push(`${counts.kept_by_hand} ${counts.kept_by_hand === 1 ? 'mark' : 'marks'} made by hand `
      + `on the roster ${counts.kept_by_hand === 1 ? 'was' : 'were'} kept`);
  }
  if (parts.length === 0) return null;
  return `${parts.join('; ')}.`;
}
