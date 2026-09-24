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

export function autoDecisions(rows: DecisionRow[]): Decision[] {
  const out: Decision[] = [];
  for (const r of rows) {
    if (r.kind === 'matched' || r.kind === 'noEmail') continue;
    if (r.kind === 'ambiguous') {
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
