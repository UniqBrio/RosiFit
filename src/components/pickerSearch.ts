/**
 * What a picker query matches, and what makes one row different from another.
 *
 * WHY THIS IS A MODULE AND NOT TWO LINES INSIDE Sheet.tsx
 * Both answers are about IDENTITY, and both were got wrong in the same place
 * for the same reason: the picker treated a member's NAME as if it were her.
 *
 *   - The query matched `label` only, so the one member the operator could
 *     name unambiguously -- by her email address -- was the one she could not
 *     search for (requests/2026-09-07-merge-picker-search-by-email.md).
 *   - The rows were keyed by `label` too. Two members called "Kavitha Ramesh"
 *     are two React children with ONE key, and React's own warning says what
 *     follows: children "duplicated and/or omitted". The requester's
 *     screenshot is exactly that -- a search for "Rohini" listing four
 *     Kavitha Ramesh rows, and a row highlighted "Rohini" while the confirm
 *     sentence named Divya Balakrishnan. The staged VALUE was right the whole
 *     time; the row drawn over it was somebody else's.
 *
 * That second one is why this matters more than a search box: the sheet it
 * happens in commits a MERGE. Attendance moves and a member is retired, and
 * "I tapped the row that said Rohini" is not a defence when the row that said
 * Rohini was reconciled from Divya's.
 *
 * Kept free of any react-native import so `node --test` runs it directly.
 */

/** The searchable and identifying parts of a picker row. `Sheet.tsx` widens
 *  this into `PickerOption`; only these fields are decided here. */
export type PickerSearchable = {
  label: string;
  /** Extra text the query may match but the row never prints -- the member's
   *  email addresses. Opt-in: a picker that passes none searches by label
   *  exactly as it always has. */
  search?: string;
  /** The row's own identity when it has one (a member id). */
  value?: string;
};

/**
 * Does this row answer the query?
 *
 * Case-folded substring, on the label and on `search` if the caller gave one
 * -- the same test the roster search on the course screen already applies to
 * a name and an address, so the two boxes on one screen cannot disagree about
 * what "matches" means.
 *
 * An empty query matches everything, which is what makes the unsearched list
 * the full list.
 */
export function pickerMatches(option: PickerSearchable, query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q === '') return true;
  if (option.label.toLowerCase().includes(q)) return true;
  return (option.search ?? '').toLowerCase().includes(q);
}

/**
 * The React key for a row.
 *
 * `value` when there is one: member ids are unique by construction, so two
 * members sharing a name are two keys. Without a value there is nothing that
 * distinguishes one row from another EXCEPT its position, so the position
 * goes in -- an index-bearing key re-renders more than it strictly must when
 * a filter reorders the list, which is the cheap failure. The expensive one
 * is the row that keeps a neighbour's label, and duplicate keys are how that
 * happens.
 */
export function pickerKey(option: PickerSearchable, index: number): string {
  return option.value ?? `${option.label}#${index}`;
}
