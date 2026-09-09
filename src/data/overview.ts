/**
 * What the Overview filters MEAN — the narrowing and the words that describe
 * it, in one tested place.
 *
 * WHY IT IS NOT INLINE IN THE SCREEN
 * The filters choose a population and the caption names it, and the single
 * failure this screen cannot afford is those two describing different sets:
 * a ring labelled "2 branches" counted over three. Both the predicate and the
 * sentence are generated here from the SAME selection, so the label cannot
 * drift from the figures it sits above (C-84/85/86).
 *
 * The selection is a LIST because the filters are checkboxes: an empty list
 * means "not narrowed", which is why "All branches" is a state of the control
 * rather than an option the query has to recognise by name.
 */
import type { ReportRow } from './report';

export type Selection = { courses: string[]; branches: string[] };

/** Empty = every one of them. Nothing here special-cases the "All …" label,
 *  so a branch that happened to be named that could never turn the filter
 *  off by accident. */
export function narrows(selected: string[], value: string): boolean {
  return selected.length === 0 || selected.includes(value);
}

export function matchesSelection(m: { branch: string; course: string }, s: Selection): boolean {
  return narrows(s.courses, m.course) && narrows(s.branches, m.branch);
}

/**
 * What the closed field shows.
 *
 * The COUNT rather than a run-on list once there are several: three course
 * names do not fit in a third of a phone's width, and a truncated list reads
 * as a shorter selection than the one applied.
 */
export function fieldValue(selected: string[], allLabel: string, noun: string): string {
  if (selected.length === 0) return allLabel;
  if (selected.length === 1) return selected[0];
  return `${selected.length} ${noun}`;
}

/**
 * The sentence under a chart title: which population, over which dates.
 *
 * Built from the selection rather than written per section, so four charts
 * cannot end up claiming four different scopes for the same numbers.
 */
export function scopeSentence(s: Selection, periodLabel: string): string {
  const courses = s.courses.length === 0 ? 'Every course'
    : s.courses.length === 1 ? s.courses[0]
    : `${s.courses.length} courses`;
  const branches = s.branches.length === 0 ? 'Every branch'
    : s.branches.length === 1 ? s.branches[0]
    : `${s.branches.length} branches`;
  return `${courses} \u00b7 ${branches} \u00b7 ${periodLabel}`;
}

/**
 * Toggling one value in a checkbox list.
 *
 * Order is preserved on the way in, so the field's one-name case names the
 * one that was actually ticked rather than whichever sorted first.
 */
export function toggle(selected: string[], value: string): string[] {
  return selected.includes(value) ? selected.filter(v => v !== value) : [...selected, value];
}

/**
 * A selection kept honest when the options change underneath it.
 *
 * A branch removed under More → Configuration, or a course renamed, would
 * otherwise leave a tick on a value nothing can match — the figures narrow to
 * nothing and the field still reads "2 branches". Dropping the vanished value
 * turns that into the only honest fallback: the filter widens, visibly.
 */
export function pruned(selected: string[], options: string[]): string[] {
  const known = new Set(options);
  return selected.filter(v => known.has(v));
}

/* ---------------------------------------------------------- the member list
 *
 * Overview is a glance, not a register. Every member cannot fit on it, so the
 * question is which ones earn the space — and the answer is the ones somebody
 * would act on: LOWEST attendance first.
 *
 * Not "worst first" as a flourish. The academy's whole reason for this screen
 * is deciding who to follow up, so a list ordered by name would put the
 * decision several scrolls below the fold and the full list is on Reports
 * either way.
 */
/** Enough rows to see a pattern, few enough that the section below it is
 *  still on the same screen on a phone. */
export const MEMBER_ROWS_SHOWN = 6;

export function attentionFirst(rows: ReportRow[]): ReportRow[] {
  return [...rows].sort((a, b) => {
    // Nothing scheduled is not 0% — she is not the worst attender, she was
    // not expected — so those rows sort last rather than heading the list.
    if (a.pct === null || b.pct === null) {
      return a.pct === b.pct ? a.label.localeCompare(b.label) : a.pct === null ? 1 : -1;
    }
    // The name breaks ties, so two runs of the same figures list the same
    // order — a section that reshuffles between renders cannot be compared
    // with a screenshot of itself.
    return a.pct === b.pct ? a.label.localeCompare(b.label) : a.pct - b.pct;
  });
}

/**
 * The line under a member's name on the Overview: her course and her branch.
 *
 * WHY THE GRAPH NEEDS IT
 * "Based on member" is a ranking of who to chase, and it named six people
 * without saying what to chase them about. With the Course filter left wide
 * -- which is how the screen opens -- six names from four different courses
 * looked like one list, and the reader had to leave for Reports to find out
 * which course any row belonged to.
 *
 * WHY IT IS NOT COMPUTED IN reportRows
 * The report screen groups ITS member rows the same way, and a scope line
 * there would repeat a heading the reader already has. So the label is
 * attached by the screen that wants it, from the same narrowed member list
 * every figure on it is counted from -- nothing new is queried, and nothing
 * here totals anything (guardrail 1).
 *
 * WHY A SHARED NAME LOSES THE LINE
 * Two members called the same thing are two rows with one label, and naming
 * one of their courses beside a bar counted from both would be a caption for
 * a population it does not describe. Silence is the only honest answer -- the
 * same rule scopeSentence follows.
 */
export function withScope(
  rows: ReportRow[],
  members: { name: string; course: string; branch: string }[],
): ReportRow[] {
  const scope = new Map<string, string | null>();
  for (const m of members) {
    const line = `${m.course} · ${m.branch}`;
    const seen = scope.get(m.name);
    scope.set(m.name, seen === undefined || seen === line ? line : null);
  }
  return rows.map(r => {
    const line = scope.get(r.label);
    return line ? { ...r, sub: line } : r;
  });
}
