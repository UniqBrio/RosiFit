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
