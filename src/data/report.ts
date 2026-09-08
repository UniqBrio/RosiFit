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
import { DAY_NAMES, type Member } from './mock';
import { statusOn } from './inactiveFrom';

/**
 * 'Branches' is still a scope reportRows can GROUP BY; it is no longer a tab.
 *
 * The requester asked for the Branch tab to go
 * (requests/2026-09-08-reports-details-two-sheets-and-dash-course.md, part 1).
 * The grouping itself stays because it is arithmetic that is specified and
 * passing -- report.test.ts pins that branches group and pluralise -- and
 * deleting a tested behaviour to remove a button is a larger act than the ask.
 * REPORT_SCOPES is what the screen renders; the union is what the aggregator
 * accepts.
 */
export type ReportScope = 'Members' | 'Courses' | 'Branches';
export const REPORT_SCOPES: ReportScope[] = ['Members', 'Courses'];

export type ReportRow = {
  label: string;
  /**
   * What the label belongs to, when the label alone does not say -- a
   * member's course and branch under her name on the Overview.
   *
   * OPTIONAL, and set by the caller rather than by reportRows: the report
   * screen's own rows are already grouped by the thing they name, and a
   * scope line under them would repeat the group heading. Nothing here is
   * counted from it; it is a label, not a figure.
   */
  sub?: string;
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

/**
 * What a group of members who belong to NO course, or to no branch, is called.
 *
 * WHAT WAS WRONG HERE
 * fetchMembers writes `course: '—'` and `branch: '—'` for a member whose
 * enrolment is missing, ended, or points at a deleted course
 * (src/data/repository.ts, and NO_COURSE in src/data/course.ts). On the member
 * row that dash is honest: there is no course, which is a fact, rather than a
 * course whose name failed to load.
 *
 * Grouping by it is not. This function used to key the Courses scope on
 * `m.course` verbatim, so every unenrolled member collapsed into a group whose
 * label was the literal string `—` -- a bar named "—" on the screen, and a
 * first column reading "—" in the file somebody keeps, sorted to the TOP of it
 * by localeCompare. The report was naming a course that does not exist.
 *
 * The dash is fixed HERE rather than in fetchMembers, because the member row's
 * dash is read by the roster, the member card and the send flow and means the
 * right thing in all three. It is only the REPORT that turns a label into a
 * group heading, so it is the report that has to say what the group is.
 *
 * The group is kept, not dropped. A member with attendance in the period but
 * no enrolment today is still someone the academy expected: dropping her would
 * make the Courses tab's total disagree with the Members tab's, which is the
 * one thing report.test.ts pins about the scopes.
 */
const DASH = '—';
export const NO_COURSE_LABEL = 'Not enrolled in a course';
export const NO_BRANCH_LABEL = 'Not at a branch';

/** The members BEHIND each row, in the row's own order.
 *
 *  Exported because the row itself cannot carry them: reportRows' object shape
 *  is pinned by a deep-equality spec, so the member count and the detail line
 *  the report now draws are derived from here instead of bolted onto a
 *  ReportRow. One grouping, two readings of it -- never two groupings. */
export function reportGroups(members: Member[], scope: ReportScope):
  { label: string; members: Member[] }[] {
  if (scope === 'Members') {
    return members.map(m => ({ label: m.name, members: [m] }));
  }
  const key = scope === 'Courses'
    ? (m: Member) => m.course
    : (m: Member) => m.branch;
  const missing = scope === 'Courses' ? NO_COURSE_LABEL : NO_BRANCH_LABEL;

  const groups = new Map<string, Member[]>();
  for (const m of members) {
    const raw = key(m);
    // A blank is the same fact as the dash and must not become a nameless row
    // either -- both mean "this member belongs to nothing here".
    const k = !raw || raw === DASH ? missing : raw;
    const list = groups.get(k) ?? [];
    list.push(m);
    groups.set(k, list);
  }
  // Sorted by name so two runs of the same report list the rows in the same
  // order -- a report that reshuffles between views cannot be compared with
  // itself. The belongs-to-nothing group sorts LAST whatever it is called:
  // it is not one of the academy's courses and does not belong among them.
  return [...groups.entries()]
    .sort((a, b) =>
      (a[0] === missing ? 1 : 0) - (b[0] === missing ? 1 : 0)
      || a[0].localeCompare(b[0]))
    .map(([label, rows]) => ({ label, members: rows }));
}

export function reportRows(members: Member[], scope: ReportScope): ReportRow[] {
  return reportGroups(members, scope).map(g => ({ label: g.label, ...total(g.members) }));
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

/* ------------------------------------------------- what a row is ABOUT
 *
 * The row said a name and a percentage and nothing else, so the reader had to
 * already know who Divya is and what Prenatal Flow runs
 * (requests/2026-09-08-reports-details-two-sheets-and-dash-course.md, parts 2
 * and 3). These are the facts the two forms behind those names hold, written
 * as ONE line each.
 *
 * They are sentences, not figures: nothing here is counted from, and
 * `ReportRow.sub` -- which has existed unset since the file was written -- is
 * where they land. reportMeta goes on carrying every number.
 */

/** Course names it "the register's dash"; a REPORT heading has to say more. */
const named = (value: string, missing: string) =>
  !value || value === DASH ? missing : value;

/** "06:00:00" and "06:00" are the same time; the column may hold either. */
const clockTime = (value: string | null): string =>
  value ? value.slice(0, 5) : '';

/**
 * Her line: course, branch, whether she is on the register, and when she
 * joined -- the four the member form asks for that fit on one line, in the
 * order HerDetails draws them (app/member/[id].tsx).
 *
 * The status is read ON A DAY, not off the column: `inactive_from` (0044)
 * means a member stored inactive from next month is active today, and a
 * report that called her Inactive would disagree with her own card.
 */
export function memberDetailLine(m: Member, todayIso: string): string {
  const active = statusOn(m, todayIso) === 'active';
  return [
    named(m.course, NO_COURSE_LABEL),
    named(m.branch, NO_BRANCH_LABEL),
    active ? 'Active' : 'Inactive',
    m.joined && m.joined !== DASH ? `joined ${m.joined}` : 'joining date not on record',
  ].join(' · ');
}

/** The fields of the course form this line reads. Structural, so the live
 *  `Course` record satisfies it without the report importing the screen's
 *  shape. */
export type CourseFacts = {
  name: string;
  start_time: string | null;
  end_time: string | null;
  offerings: { branch: string; weekdays: number[] }[];
};

/** Every weekday the course runs on at any of its branches, Monday first. */
export function courseDayNames(c: CourseFacts): string[] {
  const days = new Set<number>();
  for (const o of c.offerings) for (const d of o.weekdays) days.add(d);
  return [...days].sort((a, b) => a - b).map(d => DAY_NAMES[d]);
}

/** Every branch it runs at, named once, in a stable order. */
export function courseBranchNames(c: CourseFacts): string[] {
  return [...new Set(c.offerings.map(o => o.branch).filter(Boolean))].sort();
}

/**
 * The course record behind a Courses-scope group, matched on IDENTITY.
 *
 * NOT on the name. The group's label is a name, and a name is not an identity
 * (src/data/course.ts, enrolledIn): delete a course and create another with
 * the same name, and a lookup by name hands the new one the deleted one's days
 * and times. Her enrolment's `course_id` is what she actually points at, so
 * that is what this matches -- and null, honestly, for the group of members
 * who point at nothing.
 */
export function courseForGroup<T extends CourseFacts & { id: string }>(
  group: { members: Member[] }, courses: T[],
): T | null {
  const id = group.members.find(m => m.course_id)?.course_id ?? null;
  return id ? (courses.find(c => c.id === id) ?? null) : null;
}

/**
 * The course's line: the MEMBER COUNT first, because that is what was asked
 * for and it is the figure the course row never had, then where it runs, on
 * which days, at what time.
 *
 * `course` is optional and the count is not. The screen's counts come from the
 * member rows it is already holding; the rest comes from the course list,
 * which is a SECOND fetch and is allowed to be absent -- a report whose
 * figures waited on a decoration would be a report that fails for a reason
 * that has nothing to do with attendance.
 *
 * No days set says so. A course with no weekdays expects nothing of anybody,
 * which is a more serious fact than a blank in a list of days.
 */
export function courseDetailLine(count: number, course?: CourseFacts | null): string {
  const parts = [`${count} ${count === 1 ? 'member' : 'members'}`];
  if (course) {
    const branches = courseBranchNames(course);
    if (branches.length) parts.push(branches.join(', '));
    const days = courseDayNames(course);
    parts.push(days.length ? days.join(' · ') : 'no days set');
    const from = clockTime(course.start_time);
    const to = clockTime(course.end_time);
    if (from && to) parts.push(`${from}–${to}`);
  }
  return parts.join(' · ');
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
