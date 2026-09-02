/**
 * The holiday rules that are pure, kept out of the screen so they can be
 * executed rather than reviewed.
 *
 * All three exist because a holiday's range is the blast radius of the
 * closure: it decides which sessions stop counting as expected, and getting
 * it wrong silently changes everyone's attendance percentage. None of that is
 * visible in the UI until a month later, when a report is wrong.
 *
 * Dates are ISO yyyy-mm-dd throughout, which sorts and compares lexically and
 * is what `date` columns take — so nothing here parses a Date, and there is
 * no timezone in which any of it behaves differently.
 */
import type { Holiday } from './mock';

const MON_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The two dates a holiday is actually stored with.
 *
 * An empty end date is a ONE-DAY closure, not an open-ended one. That rule
 * lives here rather than inline at the call site because the failure mode of
 * getting it wrong is not a crash: `end_date` would take some other value and
 * the closure would silently cover a different set of days than the person
 * chose. A reversed pair is swapped rather than rejected — it is the same
 * range read backwards, and the CHECK constraint would refuse it anyway, so
 * refusing it here too would only turn a typo into a dead end.
 */
export function normaliseRange(from: string, to: string): { from: string; to: string } {
  if (!from) return { from: '', to: '' };
  if (!to) return { from, to: from };
  return to < from ? { from: to, to: from } : { from, to };
}

/** '2026-10-20'..'2026-10-22' -> '20 Oct 2026 – 22 Oct 2026'; one day reads as one date. */
export function rangeLabel(from: string, to: string): string {
  const day = (value: string) => {
    const [y, m, d] = value.split('-').map(Number);
    return !y || !m || !d ? value : `${d} ${MON_SHORT[m - 1]} ${y}`;
  };
  if (!from) return '';
  return !to || to === from ? day(from) : `${day(from)} – ${day(to)}`;
}

/**
 * Whether a holiday closes a given day, for a given branch.
 *
 * `branch: null` on the holiday means EVERY branch — the column's own meaning.
 * Reading it as "no branch" would invert the widest closure the product has
 * into the narrowest, which is why this is a named function and not an
 * inline `h.branch === branch`.
 */
export function coversDate(holiday: Holiday, date: string, branch: string | null): boolean {
  if (date < holiday.from || date > holiday.to) return false;
  return holiday.branch === null || holiday.branch === branch;
}
