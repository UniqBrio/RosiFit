/**
 * Attendance-CSV name matching. This mirrors public.normalize_name() closely
 * enough for matching purposes (lowercase, strip accents, collapse
 * non-alphanumerics to single spaces) but runs in TypeScript because the
 * fuzzy tier (bigram similarity) has no equivalent already in the database --
 * pg_trgm is not one of this project's extensions, and adding it for one
 * Edge Function was not worth the extra surface. The canonical-name and
 * alias tiers below are cross-checked against the SAME normalize_name()
 * output that the database already computed and stored (name_normalized,
 * alias_normalized), so those two tiers cannot disagree with the database
 * even though this reimplements the string transform.
 */
// Built from numeric code points (0x0300-0x036F, the Unicode "Combining
// Diacritical Marks" block) rather than a literal character range, so the
// source file contains no raw combining characters that could be mangled by
// an editor, a diff tool, or copy/paste.
const COMBINING_MARKS = new RegExp(
  `[${String.fromCharCode(0x0300)}-${String.fromCharCode(0x036f)}]`, 'g'
);

export function normalizeName(raw: string): string {
  const stripped = raw.normalize('NFD').replace(COMBINING_MARKS, '');
  return stripped.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function bigrams(s: string): string[] {
  const padded = ` ${s} `;
  const grams: string[] = [];
  for (let i = 0; i < padded.length - 1; i++) grams.push(padded.slice(i, i + 2));
  return grams;
}

/**
 * WHICH OF THE CANDIDATES CAN BE HER *IN THIS COURSE*.
 *
 * A name is not an identity here. `member_enrollments` carries one live
 * enrolment per member (0006) -- set_attendance says so out loud, "her
 * offering is read from the enrolment in force on that date, never passed in
 * ... one active enrolment means there is nothing to choose" (0035) -- so a
 * member enrolled in Prenatal is, by construction, NOT a member of Postnatal.
 * A Postnatal file naming her is naming somebody else with the same name, or
 * naming her on the day she moved; either way it is not a fact the import may
 * assume.
 *
 * The matcher used to ask only "is there a member with this name", academy
 * wide, and an exact hit became `matched` -- which the upload accepts without
 * asking anybody (autoDecisions, app/upload.tsx). So a name shared across two
 * courses marked the OTHER course's member present, invisibly.
 *
 * Split rather than filtered: the candidate enrolled elsewhere is still worth
 * showing. She is why the row needs `confirm_different_person`, and she is the
 * name the result screen puts in front of the operator so a genuine move
 * between courses can be folded in by hand (0032) rather than guessed at here.
 *
 * A member with NO live enrolment is `here`. Nothing contradicts this course
 * for her, and creating a second record for a woman already on the register
 * would be inventing a duplicate to avoid a collision that does not exist.
 *
 * `offeringOf` answers with the offering a member is actively enrolled in, or
 * null for none -- exactly the map csv-import already builds from
 * member_enrollments.
 */
export function splitByCourse(
  candidateIds: string[],
  offeringOf: (memberId: string) => string | null | undefined,
  offeringId: string,
): { here: string[]; elsewhere: string[] } {
  const here: string[] = [];
  const elsewhere: string[] = [];
  for (const id of candidateIds) {
    const enrolled = offeringOf(id);
    // Only an enrolment in ANOTHER offering disqualifies her. Null is "in no
    // course", which is not a contradiction.
    if (enrolled && enrolled !== offeringId) elsewhere.push(id);
    else here.push(id);
  }
  return { here, elsewhere };
}

/** Sorensen-Dice coefficient over character bigrams, in [0, 1]. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ga = bigrams(a), gb = bigrams(b);
  if (ga.length === 0 || gb.length === 0) return 0;
  const counts = new Map<string, number>();
  for (const g of ga) counts.set(g, (counts.get(g) ?? 0) + 1);
  let common = 0;
  for (const g of gb) {
    const c = counts.get(g) ?? 0;
    if (c > 0) { common++; counts.set(g, c - 1); }
  }
  return (2 * common) / (ga.length + gb.length);
}
