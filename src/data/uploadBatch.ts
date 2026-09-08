/**
 * SEVERAL MEET FILES IN ONE GO, and the rules that decide which of them run.
 *
 * The requester: *"enable multiple csv files upload in one go. user can select
 * multiple files when they browse files and upload meeting csv files and it
 * should be imported and respectively the data should be loaded for
 * attendance."*
 *
 * "RESPECTIVELY" IS THE WHOLE MECHANISM, and it was already true: the day a
 * file lands on comes from its own `Created on` line, never from the screen.
 * So four files picked together are four sessions, each one its own day, all
 * in the one offering she confirmed. Nothing about the import itself changes —
 * `csvPreview` and `csvCommit` are still per file, and each file is still one
 * transaction. What is new is the ORDER, and the two questions a batch can ask
 * that a single file cannot:
 *
 *   WHICH OF THESE CAN RUN AT ALL? A file with no date, or dated ahead of
 *   today, could refuse itself when it was the only one. In a batch, refusing
 *   the whole pick because one file of nine is wrong is a worse answer than
 *   setting that one aside and saying so. `planBatch` does the setting aside.
 *
 *   DO TWO OF THEM COVER THE SAME DAY? One session per offering per day is a
 *   database invariant, so the second would REPLACE the first — inside a
 *   single upload, with no way for anyone to see it happen. Both are set
 *   aside. Silently overwriting one of her own files with another of her own
 *   files, in the same tap, is the one outcome a batch must not have.
 *
 * WHY THE WORDS LIVE HERE. `app/upload.tsx` renders in React Native; the specs
 * run under plain node, so a sentence written inside the screen is a sentence
 * no test can read. Same reason as uploadOverride.ts and uploadOutcome.ts.
 */
import type { AskWords, DayLabel } from './uploadOverride';
import { futureFileRefusal } from './uploadWindow';

/** a file as the screen has it after parsing: its name, and the day it says */
export type PickedFile = {
  fileName: string;
  /** from meetCreatedDate. null when the file carries no readable date. */
  day: string | null;
};

/** a file that will not be imported, and the sentence that says why */
export type SetAside = { fileName: string; reason: string };

/**
 * ONE DAY'S REGISTER, and the file or files it is built from.
 *
 * N MEETINGS IN A DAY IS NORMAL, and this is the correction that says so.
 * The first cut of this module set aside every file that shared a day with
 * another, on the reading that two files for one day meant two exports of the
 * same class and RosiFit could not tell which was right. The requester, on
 * being shown that refusing a perfectly ordinary upload:
 *
 *   *"multiple files upload for a day is possible as they have different
 *    meeting codes because each day there can be n number meetings and i am
 *    uploading attendnace of all at one go"*
 *
 * Two Meet calls at 4:48:06 and 4:48:17 with different codes are two MEETINGS,
 * not two exports — a call that dropped and was restarted, or a morning and an
 * evening batch. Both are the same class on the same day.
 *
 * The database still holds ONE register per offering per day
 * (`sessions_unique_live`), so those meetings cannot each have a session. They
 * MERGE: every name from every call for that day goes into that day's
 * register, de-duplicated, so a woman who was in two of them is marked present
 * once. That is the only reading that both obeys the invariant and loses
 * nobody — importing them one after another would leave whichever ran last and
 * silently revert the rest.
 */
export type BatchGroup = {
  day: string;
  /** the files that make up this day's register, in the order she picked */
  fileNames: string[];
};

export type BatchPlan = {
  /** one entry per DAY, in the order that day first appeared in the pick */
  ready: BatchGroup[];
  /** the files that will not run at all, each with its reason, in pick order */
  setAside: SetAside[];
};

/**
 * Which of these files run, grouped into the register each day will get, and
 * what is said about the ones that cannot run at all.
 *
 * Only TWO things set a file aside now, and both are about the file itself
 * rather than about its neighbours: it does not say which day it covers, or
 * it says a day that has not happened. Sharing a day with another file is no
 * longer one of them — that is a merge, not a refusal.
 */
export function planBatch(
  files: PickedFile[], todayIso: string, label: DayLabel
): BatchPlan {
  const setAside: SetAside[] = [];
  // Insertion-ordered, so the days come out in the order she picked them and
  // the file names inside a day likewise.
  const byDay = new Map<string, string[]>();

  for (const file of files) {
    if (!file.day) {
      // The single-file screen says this in a panel of its own. In a batch it
      // has to travel with the file it is about, or nobody can tell which of
      // the nine it means.
      setAside.push({
        fileName: file.fileName,
        reason: 'This file carries no “Created on” line, so RosiFit cannot tell which day it '
          + 'covers. Export it again from Meet.',
      });
      continue;
    }
    const future = futureFileRefusal(file.day, todayIso, { fileName: file.fileName, label });
    if (future) {
      setAside.push({ fileName: file.fileName, reason: future });
      continue;
    }
    byDay.set(file.day, [...(byDay.get(file.day) ?? []), file.fileName]);
  }

  return {
    ready: [...byDay.entries()].map(([day, fileNames]) => ({ day, fileNames })),
    setAside,
  };
}

/**
 * What a merged import is FILED as, in `csv_imports.file_name`.
 *
 * Every name, joined — not "meeting_a.csv and 2 others". This string is the
 * receipt: it is what the override warning names when a later upload replaces
 * this register, and what somebody reads in the audit log a month from now
 * trying to work out where a mark came from. A name that says "2 others" sends
 * them looking for files it declined to name. The column is `text`, so length
 * is not the constraint it would be worth trading honesty for.
 */
export function mergedFileName(fileNames: string[]): string {
  return fileNames.join(' + ');
}

/** the sentence a merged day's result row carries, or null for a single file */
export function mergedNote(fileNames: string[], day: string, label: DayLabel): string | null {
  if (fileNames.length < 2) return null;
  return `Merged from ${fileNames.length} meetings on ${label(day)}: ${fileNames.join(', ')}. `
    + `A day holds one register, so anybody in more than one of those calls is marked present once.`;
}

/**
 * THE ONE ASK A BATCH STOPS FOR.
 *
 * A single file asks about two things: the day it covers not being the day she
 * opened, and the register it replaces. The FIRST of those is dropped for a
 * batch, on purpose — she picked nine files, they cannot all be for the day
 * she tapped, and asking nine times about a disagreement that is not a mistake
 * is how somebody learns to click past the ask that matters.
 *
 * What is left is the one that always matters: this file replaces a register
 * that exists. One dialog for the whole batch, one confirm, every file named.
 */
export function batchAskWords(overrides: {
  fileName: string; day: string; replaces: string;
}[], ctx: { course: string; total: number; label: DayLabel }): AskWords {
  const n = overrides.length;
  const rest = ctx.total - n;
  const lines = [
    `${n} of the ${ctx.total} files you chose `
    + `${n === 1 ? 'covers a day that already has' : 'cover days that already have'} a register `
    + `for ${ctx.course}. Importing ${n === 1 ? 'it replaces' : 'them replaces'} what is there now:`,
    ...overrides.map(o => `${o.fileName} → ${ctx.label(o.day)}, replacing ${o.replaces}.`),
  ];
  // Only when there ARE others. "The other 0 files land on days with no
  // register yet" is a sentence about nothing, and it appeared whenever every
  // file in the batch was an override.
  if (rest > 0) {
    lines.push(`The other ${rest} ${rest === 1 ? 'file lands on a day' : 'files land on days'} `
      + `with no register yet.`);
  }

  return {
    title: n === 1
      ? '1 of these files replaces a register'
      : `${n} of these files replace a register`,
    lines,
    // Word for word the single-file override's note, because it is the same
    // promise and a second wording for it would be a second promise.
    note: 'Marks you made by hand on the roster are kept. Nothing has been written yet.',
    confirm: `Import all ${ctx.total} files`,
    cancel: 'Choose other files',
  };
}

/**
 * WHAT THE WHOLE UPLOAD DID, in the one sentence the result screen heads with.
 *
 * The single-file screen names the day, because there is one. A batch names
 * how many files landed and across how many days — the day is on each row
 * underneath, where it belongs when there are four of them.
 */
export function batchHeading(imported: number, days: number, course: string): string {
  if (imported === 0) return `Nothing imported · ${course}`;
  return `Imported ${imported} ${imported === 1 ? 'file' : 'files'} · `
    + `${days} ${days === 1 ? 'day' : 'days'} · ${course}`;
}
