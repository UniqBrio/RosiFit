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

/**
 * One row's second line: every figure the bar encodes, written out.
 *
 * All THREE numbers, because the bar has three lengths in it -- the track is
 * scheduled, the green is attended, the orange is missed -- and a caption
 * naming two of them leaves the third to be inferred from a picture. That is
 * exactly the "colour is never the only signal" rule (guardrail 3) applied to
 * length rather than hue.
 *
 * Nothing scheduled says so in words rather than showing "0 scheduled · 0
 * attended · 0 missed", which reads as a course everybody skipped.
 */
export function reportMeta(row: ReportRow): string {
  if (row.expected === 0) return 'No sessions scheduled — nothing to measure';
  const missed = Math.max(row.expected - row.attended, 0);
  return `${row.expected} scheduled · ${row.attended} attended · ${missed} missed`;
}

/* ------------------------------------------------------------------ bars
 *
 * The canvas draws attended-vs-missed BARS, not rings, and the bar's total
 * length is itself a figure: "Bar length = sessions scheduled", says its own
 * legend. So a course with 40 scheduled draws a bar twice the length of one
 * with 20, and the green/orange split inside it is that course's attendance.
 * Two numbers per row, in one shape, comparable down the column.
 */

/** Counts are written INSIDE a segment only when it is wide enough to hold
 *  them. Below this the number is cramped against the edge and unreadable --
 *  the row's `meta` line carries every figure in words regardless. */
const LABEL_MIN = 4;

export type ReportBar = ReportRow & {
  /** attended width, as a percentage of the widest row's scheduled count */
  attendedPct: number;
  missedPct: number;
  missed: number;
  /** '' when the segment is too narrow to letter */
  attendedLabel: string;
  missedLabel: string;
};

export function reportBars(rows: ReportRow[]): ReportBar[] {
  // The widest row sets the scale. Max of 1 so an all-empty report divides by
  // something -- every bar is then zero-length, which is the truth.
  const widest = Math.max(1, ...rows.map(r => r.expected));
  return rows.map(r => {
    const missed = Math.max(r.expected - r.attended, 0);
    const span = (r.expected / widest) * 100;
    return {
      ...r,
      missed,
      attendedPct: r.expected === 0 ? 0 : span * (r.attended / r.expected),
      missedPct: r.expected === 0 ? 0 : span * (missed / r.expected),
      attendedLabel: r.attended >= LABEL_MIN ? String(r.attended) : '',
      missedLabel: missed >= LABEL_MIN ? String(missed) : '',
    };
  });
}
