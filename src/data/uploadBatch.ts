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

export type BatchPlan = {
  /** the files that will be previewed and imported, in the order picked */
  ready: { fileName: string; day: string }[];
  /** the files that will not, each with its reason, in the order picked */
  setAside: SetAside[];
};

/**
 * Which of these files run, and what is said about the ones that do not.
 *
 * The three refusals are applied in this order deliberately: a file with no
 * date cannot be tested for being in the future, and a file already refused
 * for either reason cannot collide with anything, so the collision check sees
 * only files that were otherwise going to import.
 */
export function planBatch(
  files: PickedFile[], todayIso: string, label: DayLabel
): BatchPlan {
  const ready: { fileName: string; day: string }[] = [];
  const setAside: SetAside[] = [];

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
    ready.push({ fileName: file.fileName, day: file.day });
  }

  /* --------------------------------------- two files, one day, one register */
  const perDay = new Map<string, string[]>();
  for (const r of ready) perDay.set(r.day, [...(perDay.get(r.day) ?? []), r.fileName]);

  const clashingDays = new Set(
    [...perDay.entries()].filter(([, names]) => names.length > 1).map(([day]) => day));

  if (clashingDays.size === 0) return { ready, setAside };

  const kept: { fileName: string; day: string }[] = [];
  for (const r of ready) {
    if (!clashingDays.has(r.day)) { kept.push(r); continue; }
    const names = perDay.get(r.day) ?? [];
    // BOTH go, not "the first wins". Which of two exports of the same class is
    // the right one is a judgement RosiFit does not have, and guessing it is
    // exactly the silent overwrite this check exists to prevent.
    setAside.push({
      fileName: r.fileName,
      reason: `${names.length} files in this upload cover ${label(r.day)} — ${names.join(', ')}. `
        + `A day holds one register, so importing them together would leave whichever went `
        + `last. Neither was imported: upload the one you want.`,
    });
  }
  // Rebuilt rather than spliced, so `ready` keeps the order she picked in.
  return { ready: kept, setAside: reorder(files, setAside) };
}

/** set-aside rows back into the order the files were picked in */
function reorder(files: PickedFile[], setAside: SetAside[]): SetAside[] {
  const order = new Map(files.map((f, i) => [f.fileName, i]));
  return [...setAside].sort(
    (a, b) => (order.get(a.fileName) ?? 0) - (order.get(b.fileName) ?? 0));
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
