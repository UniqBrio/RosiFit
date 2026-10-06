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

/* ------------------------------------------------------- the fuzzy tier, prepared
 *
 * The fuzzy tier used to call similarity() for every member on every row that
 * missed the alias and canonical tiers: R x N bigram builds, 5.3 s for 1,000
 * rows against 1,644 members and 16 s against 5,000 (measured 05-Oct-2026,
 * docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-10), inside an Edge
 * Function whose CPU time is the one thing the platform meters.
 *
 * Two things change, and neither changes an answer:
 *
 *   1. Every member's bigram multiset is built ONCE per request, not once per
 *      row. The row's own bigrams are built once per row.
 *   2. A member whose bigram count cannot reach the threshold is never
 *      scored. Dice = 2c / (la + lb) with c <= min(la, lb), so a score of at
 *      least t needs 2 min(la, lb) >= t (la + lb): the shorter of the two
 *      must be at least t / (2 - t) of the longer (0.818 of it at t = 0.9).
 *      Members are bucketed by bigram count and only the buckets inside
 *      that band are visited. The bound is exact -- a member outside it
 *      scores below t by arithmetic -- so `fuzzyCandidates` returns exactly
 *      what the per-member loop returned, in the same order.
 */

/** One member's name, scored any number of times without rebuilding it. */
type PreparedName = { id: string; seq: number; length: number; counts: Map<string, number> };

export type FuzzyIndex = {
  /** members by bigram count, so the exact length band selects whole buckets */
  byLength: Map<number, PreparedName[]>;
  minLength: number;
  maxLength: number;
};

function bigramCounts(grams: readonly string[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const g of grams) counts.set(g, (counts.get(g) ?? 0) + 1);
  return counts;
}

/** Build the index once per request over every live member's normalised name,
 *  in the order the members were read (the tie-break order of the old loop). */
export function prepareFuzzy(names: ReadonlyArray<{ id: string; normalized: string | null | undefined }>): FuzzyIndex {
  const byLength = new Map<number, PreparedName[]>();
  let minLength = Infinity, maxLength = 0, seq = 0;
  for (const n of names) {
    const grams = bigrams(n.normalized ?? '');
    seq++;
    // similarity() answers 0 for a name with no bigrams: never a candidate.
    if (grams.length === 0) continue;
    const prepared: PreparedName = { id: n.id, seq, length: grams.length, counts: bigramCounts(grams) };
    const bucket = byLength.get(grams.length);
    if (bucket) bucket.push(prepared); else byLength.set(grams.length, [prepared]);
    if (grams.length < minLength) minLength = grams.length;
    if (grams.length > maxLength) maxLength = grams.length;
  }
  return { byLength, minLength: byLength.size ? minLength : 0, maxLength };
}

/**
 * Every member scoring at least `threshold` against `normalized`, best first,
 * ties in the members' read order -- the ids, scores and order that
 * `members.map(m => similarity(row, m)).filter(s => s >= t).sort(by score)`
 * produced (a stable sort over the read order).
 */
export function fuzzyCandidates(
  index: FuzzyIndex, normalized: string, threshold: number,
): Array<{ id: string; score: number }> {
  const ga = bigrams(normalized);
  const la = ga.length;
  if (la === 0 || index.byLength.size === 0) return [];
  const rowCounts = bigramCounts(ga);
  // The exact band of member bigram counts that can reach the threshold:
  // lb in [t*la / (2-t), la*(2-t) / t]. Widened by one each side so a
  // rounding error can only add a bucket that then scores itself out.
  const lo = Math.max(index.minLength, Math.ceil((threshold * la) / (2 - threshold)) - 1);
  const hi = Math.min(index.maxLength, Math.floor((la * (2 - threshold)) / threshold) + 1);
  const scored: Array<{ id: string; score: number; seq: number }> = [];
  for (let lb = lo; lb <= hi; lb++) {
    const bucket = index.byLength.get(lb);
    if (!bucket) continue;
    for (const m of bucket) {
      // Multiset intersection -- what similarity() counts -- from the smaller map.
      let common = 0;
      const [small, large] = rowCounts.size <= m.counts.size ? [rowCounts, m.counts] : [m.counts, rowCounts];
      for (const [g, c] of small) {
        const d = large.get(g);
        if (d) common += c < d ? c : d;
      }
      const score = (2 * common) / (la + lb);
      if (score >= threshold) scored.push({ id: m.id, score, seq: m.seq });
    }
  }
  return scored
    .sort((a, b) => b.score - a.score || a.seq - b.seq)
    .map(({ id, score }) => ({ id, score }));
}
