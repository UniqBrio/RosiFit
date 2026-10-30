/**
 * WHAT THE UPLOAD DECIDES FOR EACH ROW, now that nobody is asked.
 *
 * The row-by-row review is gone ("no stop between the rows", app/upload.tsx),
 * so the decisions a person used to make are made here, from the kind the
 * matcher gave the row. A kind is a statement about who the name belongs to:
 *
 *   matched, noEmail  -- one member of this course. Nothing to decide.
 *   unmatched         -- nobody here holds the name. Somebody new. When the
 *                        only holder is enrolled in ANOTHER course the row
 *                        still comes back unmatched (splitByCourse) with that
 *                        member as a candidate, and the commit wants it said
 *                        that this is a different person (C-80): with nobody
 *                        to ask, filing the row as new IS that acknowledgement.
 *   possible          -- a fuzzy hit, never auto-accepted (C-79). Somebody new,
 *                        acknowledged the same way.
 *   ambiguous         -- TWO OR MORE members of this course already hold the
 *                        name. That is not "somebody new"; it is "which one".
 *
 * THE ROW THIS USED TO GET WRONG. Every kind that was not a clean match was
 * filed `add_as_new`, ambiguous included -- so a name two members held got a
 * third, and from then on every file naming that person made one more: the
 * present mark landed on the newest record and the older ones went absent.
 * "Same display name appearing thrice?" (22-Sep-2026) was three rows of one
 * person. The fixtures had stated the rule all along (src/data/mock.ts,
 * MATCH_OUTCOMES.ambiguous): "Pick one explicitly -- the import will not
 * guess." An ambiguous row is now HELD: skipped, audited as skipped by
 * commit_csv_import, and named on the result screen with the two taps that
 * resolve it. Nothing is created and nobody is marked on a guess.
 *
 * WHY THE WORDS LIVE HERE: app/upload.tsx renders in React Native and the
 * specs run under plain node, so a sentence written in the screen is a
 * sentence no test can read. Same reason as uploadOutcome.ts, next door.
 */
// memberImport imports nothing, so this module stays runnable under plain node.
import { NAME_MIN, NAME_MAX, isMemberName } from './memberImport';

/**
 * Declared here rather than imported from ./api: that module reaches the
 * browser Supabase client, and this one is type checked in the node
 * program with the specs (scripts/tsconfig.json). Both shapes are
 * structural subsets of api.ts's PreviewRow and ImportDecision, which is
 * what lets app/upload.tsx hand a preview in and the result to csvCommit.
 */
export type DecisionKind = 'matched' | 'noEmail' | 'possible' | 'ambiguous' | 'unmatched';

/** the slice of a preview row a decision is made from */
export type DecisionRow = { row: number; kind: DecisionKind; raw_name: string; candidates: unknown[] };

/** what the commit is told about a row nobody was asked about */
export type Decision = { row: number; action: 'add_as_new' | 'skip'; confirm_different_person?: boolean };

/**
 * WHY THE UPLOAD ASKS (29-Oct-2026, Postnatal · Main). A participant joined
 * the call as "m". Nobody on the course holds that name, so the row was
 * filed `add_as_new`, the insert hit members_full_name_check, and the day's
 * one transaction took fourteen files down with it. A name no record can
 * carry is not somebody new; it is a row nobody can file (isMemberName).
 */
/** A row that would be filed as somebody new under a name no record can carry. */
const unusable = (r: DecisionRow) =>
  (r.kind === 'unmatched' || r.kind === 'possible') && !isMemberName(r.raw_name);

export function autoDecisions(rows: DecisionRow[]): Decision[] {
  const out: Decision[] = [];
  for (const r of rows) {
    if (r.kind === 'matched' || r.kind === 'noEmail') continue;
    if (r.kind === 'ambiguous' || unusable(r)) {
      // Held, not guessed. `skip` is the commit's "leave this row out" and
      // is audited as such (0024), so the file's own receipt says the row
      // was seen and set aside rather than silently lost.
      out.push({ row: r.row, action: 'skip' });
      continue;
    }
    out.push({
      row: r.row,
      action: 'add_as_new',
      confirm_different_person: r.candidates.length > 0,
    });
  }
  return out;
}

/** The names held back, in file order, each once. */
export function heldNames(rows: DecisionRow[]): string[] {
  return [...new Set(rows.filter(r => r.kind === 'ambiguous').map(r => r.raw_name))];
}

/** The result screen's note for the held names -- drawn only when there are any. */
export function heldWords(names: string[]): { title: string; body: string } {
  const n = names.length;
  const one = n === 1;
  return {
    title: `${n} ${one ? 'name matches' : 'names match'} more than one member of this course`,
    body: `${names.join(', ')} ${one ? 'matches' : 'match'} two or more members already on this register, `
      + `so the import could not tell which one attended. ${one ? 'This row was' : 'These rows were'} `
      + 'held back: nobody new was created and nobody was marked present on a guess. '
      + 'Fold the duplicate records into one with “Add display name to existing member” on the course, '
      + 'then upload this file again and the attendance lands on the one record.',
  };
}

/** The same fact in one sentence, for a batch result row that has no room for a note. */
export function heldSentence(names: string[]): string | null {
  if (names.length === 0) return null;
  return `Held back, matching more than one member of this course: ${names.join(', ')}.`;
}

/** The rows held back because no member record can carry their name, in file order. */
export function unusableRows(rows: DecisionRow[]): DecisionRow[] {
  return rows.filter(unusable);
}

/** Their names, in file order, each once. */
export function unusableNames(rows: DecisionRow[]): string[] {
  return [...new Set(unusableRows(rows).map(r => r.raw_name))];
}

/** Quoted, because a one-letter name in a list reads as a typo. */
const quoted = (names: string[]) => names.map(n => `“${n}”`).join(', ');

const chars = (n: string) => [...n.replace(/^ +| +$/g, '')].length;

/**
 * Why, and the rule it broke, in the requester's words (30-Oct-2026). One
 * name says its own length; several say which side of the bound they fell.
 */
function reason(names: string[]): string {
  const short = names.filter(n => chars(n) < NAME_MIN).length;
  const rule = short === names.length ? `at least ${NAME_MIN} characters`
    : short === 0 ? `at most ${NAME_MAX} characters`
    : `between ${NAME_MIN} and ${NAME_MAX} characters`;
  if (names.length === 1) {
    const len = chars(names[0]);
    const has = short ? `only ${len} ${len === 1 ? 'character' : 'characters'}` : `${len} characters`;
    return `because the name contains ${has}. Member names must contain ${rule}.`;
  }
  const has = short === names.length ? `fewer than ${NAME_MIN} characters`
    : short === 0 ? `more than ${NAME_MAX} characters`
    : `fewer than ${NAME_MIN} or more than ${NAME_MAX} characters`;
  return `because each name contains ${has}. Member names must contain ${rule}.`;
}

/**
 * The result screen's note for the unusable names -- drawn only when there are any.
 *
 * The next step is the member's Edit page, NOT "Add display name to existing
 * member": that button lives on a member card, and a held name never got a
 * record, so there is no card to find it on. And the same file cannot simply
 * go up again: the day it landed in holds its fingerprint until the day's
 * marks are reset (0057), so the note says so.
 */
export function unusableWords(names: string[]): { title: string; body: string } {
  const one = names.length === 1;
  const who = one ? 'this participant' : 'these participants';
  return {
    title: one ? 'Participant Skipped – Invalid Name' : 'Participants Skipped – Invalid Names',
    body: `The ${one ? 'participant' : 'participants'} ${quoted(names)} ${one ? 'was' : 'were'} skipped `
      + `${reason(names)}\n`
      + `\n• Attendance for ${who} was not recorded.`
      + '\n• All other valid participants were imported successfully.'
      + `\n• If ${one ? 'this participant is an existing member' : 'one of these participants is an existing member'}, `
      + `add ${one ? quoted(names) : 'the name'} as a Google Meet display name on the member’s Edit page `
      + 'and re-import the day’s attendance after resetting that day’s marks.',
  };
}

/** The same fact in one sentence, for a batch result row that has no room for a note. */
export function unusableSentence(names: string[]): string | null {
  if (names.length === 0) return null;
  const one = names.length === 1;
  return `${one ? 'Participant skipped – invalid name' : 'Participants skipped – invalid names'}: `
    + `${quoted(names)}. Attendance for ${one ? 'this participant' : 'these participants'} was not recorded.`;
}

/**
 * THE THIRD COUNT, beside With email and No email (30-Oct-2026): "how many
 * failed, and the reason". How many participants did NOT land on the
 * register, by why. Staff and repeated names are not counted here -- neither
 * is a failure, and each keeps its own note on the screen.
 */
export type NotImported = {
  /** too short or too long for a member's name (unusableRows) */
  invalidName: number;
  /** matching more than one member of the course, held back (heldNames) */
  ambiguous: number;
  /** every row of a file the server REFUSED; a lost answer is not counted */
  fileFailed: number;
};

/**
 * The zero, scoped to what the tile counts. Not "every participant was
 * imported": staff, repeated names and files that never ran are not in this
 * count, and the screen names them in their own notes.
 */
export const NO_ONE_LEFT_OUT = 'There are no names to fix.';

/** The rows of one committed file that were held back, by reason. */
export function notImportedOf(rows: DecisionRow[]): NotImported {
  return {
    invalidName: unusableRows(rows).length,
    ambiguous: rows.filter(r => r.kind === 'ambiguous').length,
    fileFailed: 0,
  };
}

export const notImportedTotal = (n: NotImported) => n.invalidName + n.ambiguous + n.fileFailed;

export function sumNotImported(all: NotImported[]): NotImported {
  return all.reduce((t, n) => ({
    invalidName: t.invalidName + n.invalidName,
    ambiguous: t.ambiguous + n.ambiguous,
    fileFailed: t.fileFailed + n.fileFailed,
  }), { invalidName: 0, ambiguous: 0, fileFailed: 0 });
}

/**
 * The sentence under the count: each reason with its own number, all three
 * counting people. `someFilesDidNotRun` scopes the zero on a batch where a
 * file was set aside, already imported or lost -- those add nothing here.
 */
export function notImportedNote(n: NotImported, opts: { someFilesDidNotRun?: boolean } = {}): string {
  const parts = [
    n.invalidName ? `${n.invalidName} with ${n.invalidName === 1 ? 'an invalid name' : 'invalid names'}` : null,
    n.ambiguous ? `${n.ambiguous} matching more than one member` : null,
    n.fileFailed ? `${n.fileFailed} whose file did not import` : null,
  ].filter(Boolean);
  if (parts.length) return `${parts.join(' · ')}.`;
  return opts.someFilesDidNotRun ? 'There are no names to fix in the files that imported.' : NO_ONE_LEFT_OUT;
}
