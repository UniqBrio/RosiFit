/**
 * Aggregating the member list into the report's three scopes.
 *
 * WHAT WAS WRONG HERE
 * app/(tabs)/reports.tsx carried COURSE_BARS and BRANCH_BARS as literal
 * arrays -- "Prenatal Flow 74%, 40 scheduled · 30 attended" -- alongside a
 * hardcoded headline ("Attendance across 4 courses"), a hardcoded total
 * ("61%") and a Members scope reading the MEMBERS fixture rather than the
 * live query. Every figure on the academy's own report screen was a number
 * somebody typed.
 *
 * That is worse than a missing screen: a report is the artefact somebody acts
 * on months later, and it agreed with nothing. It could not agree, because it
 * was not counting anything.
 *
 * Pure and separate for the same reason distribution() is: this is where the
 * report's promise lives, and a promise computed inside a render body cannot
 * be tested. It also means the report and the dashboard donut count the same
 * member rows -- guardrail 1, one member source.
 */
import type { Member } from './mock';

export type ReportScope = 'Members' | 'Courses' | 'Branches';
export const REPORT_SCOPES: ReportScope[] = ['Members', 'Courses', 'Branches'];

export type ReportRow = {
  label: string;
  /** null when nothing was expected -- never 0, which reads as "attended none" */
  pct: number | null;
  expected: number;
  attended: number;
};

/** expected/attended for one group, and the percentage of what was expected. */
function total(rows: Member[]): Omit<ReportRow, 'label'> {
  const expected = rows.reduce((n, m) => n + m.expected, 0);
  const attended = rows.reduce((n, m) => n + m.attended, 0);
  return {
    expected,
    attended,
    // Nothing expected is NOT 0% attended. A course with no sessions this
    // month and a course everybody skipped are different facts, and 0% says
    // the second about the first.
    pct: expected === 0 ? null : Math.round((attended / expected) * 100),
  };
}

export function reportRows(members: Member[], scope: ReportScope): ReportRow[] {
  if (scope === 'Members') {
    return members.map(m => ({ label: m.name, ...total([m]) }));
  }
  const key = scope === 'Courses'
    ? (m: Member) => m.course
    : (m: Member) => m.branch;

  const groups = new Map<string, Member[]>();
  for (const m of members) {
    const k = key(m);
    const list = groups.get(k) ?? [];
    list.push(m);
    groups.set(k, list);
  }
  // Sorted by name so two runs of the same report list the rows in the same
  // order -- a report that reshuffles between views cannot be compared with
  // itself.
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([label, rows]) => ({ label, ...total(rows) }));
}

/** The headline figure: the whole set, counted once. */
export function reportTotal(members: Member[]): Omit<ReportRow, 'label'> {
  return total(members);
}

/** "Attendance across 4 courses" -- generated from the rows it describes. */
export function reportHeadline(rows: ReportRow[], scope: ReportScope): string {
  const noun = scope === 'Members' ? 'member' : scope === 'Courses' ? 'course' : 'branch';
  const plural = scope === 'Branches' ? 'branches' : `${noun}s`;
  return `Attendance across ${rows.length} ${rows.length === 1 ? noun : plural}`;
}

/** One row's second line. States the absence of sessions as words, not 0%. */
export function reportMeta(row: ReportRow, scope: ReportScope): string {
  if (row.expected === 0) {
    return scope === 'Members'
      ? 'no sessions scheduled for her'
      : 'no sessions scheduled in this period';
  }
  return `${row.expected} scheduled · ${row.attended} attended`;
}
