/**
 * The SHEETS an exported report is made of.
 *
 * WHAT WAS WRONG HERE
 * The export was one CSV of five columns -- label, expected, attended, missed,
 * percentage -- which is the screen with its bars taken off. Somebody who
 * opened it to ask "who are these members" or "what does this course run"
 * had to go back to the app and read the forms one at a time, because the
 * file carried nothing the forms hold
 * (requests/2026-09-08-reports-details-two-sheets-and-dash-course.md, part 4).
 *
 * A CSV cannot carry a second sheet at all, so the file becomes a workbook.
 *
 * PURE, AND SEPARATE FROM THE WRITER, for the same reason csvFormat.ts is
 * separate from csv.ts: what goes in each cell is the part worth testing, and
 * scripts/tsconfig.json -- where *.test.ts is typechecked -- has no DOM and no
 * exceljs in it. reportXlsx.ts turns these rows into bytes; nothing here knows
 * that a workbook exists.
 *
 * Every figure in every sheet is derived from the SAME member rows the screen
 * is drawing (guardrail 1). The detail sheets add columns; they never add a
 * second count, so sheet 2's Expected column sums to sheet 1's.
 */
import { DAY_NAMES, hasEmail, type Member, type FollowUpRule } from './mock';
import { ruleSentence } from './followup';
import { statusOn } from './inactiveFrom';
import {
  reportGroups, courseForGroup, courseBranchNames, courseDayNames,
  NO_COURSE_LABEL, NO_BRANCH_LABEL,
  type ReportRow, type ReportScope, type CourseFacts,
} from './report';

/** One sheet, named, with its header row and its body. Strings only: a
 *  spreadsheet that types a member code as a number eats its leading zeroes,
 *  and every number here is also stated on the screen as text. */
export type Sheet = { name: string; header: string[]; rows: string[][] };

export const SHEET_ATTENDANCE = 'Attendance';
export const SHEET_MEMBER_DETAILS = 'Member details';
export const SHEET_COURSE_DETAILS = 'Course details';

/** The dash a member row carries when she belongs to nothing. Read, never
 *  written: see NO_COURSE_LABEL in report.ts for why a REPORT may not print
 *  it as a heading. */
const DASH = '—';
const named = (value: string, missing: string) =>
  !value || value === DASH ? missing : value;

/** The screen's own words for a percentage, so an exported "0%" where the
 *  screen says "No sessions" can never happen. */
const pctCell = (pct: number | null) =>
  pct === null ? 'No sessions scheduled' : `${pct}%`;

const missedOf = (row: { expected: number; attended: number }) =>
  String(Math.max(row.expected - row.attended, 0));

/** "06:00:00" and "06:00" are the same time; the column may hold either. */
const clockTime = (value: string | null) => (value ? value.slice(0, 5) : '');

/**
 * SHEET 1 -- the report exactly as it was exported before this change.
 *
 * Byte for byte the same header and the same five values per row. It is the
 * sheet somebody already keeps and already compares month to month, so it is
 * the one thing in this workbook that must not move.
 */
export function attendanceSheet(
  rows: ReportRow[], scope: ReportScope, periodLabel: string,
): Sheet {
  return {
    name: SHEET_ATTENDANCE,
    header: [
      scope === 'Members' ? 'Member' : scope === 'Courses' ? 'Course' : 'Branch',
      'Expected', 'Attended', 'Missed', 'Attendance %', 'Period',
    ],
    rows: rows.map(r => [
      r.label,
      String(r.expected),
      String(r.attended),
      missedOf(r),
      pctCell(r.pct),
      periodLabel,
    ]),
  };
}

/**
 * SHEET 2 -- every member the report counted, with what her form holds.
 *
 * The columns are HerDetails' rows (app/member/[id].tsx) in HerDetails' order,
 * then her figures for the period so the sheet reconciles against sheet 1.
 *
 * TWO DELIBERATE DIFFERENCES from the screen:
 *   - Her RF- code IS here. It is searchable and never rendered on purpose
 *     (Member.code), but a file is exactly where somebody holding a code from
 *     an old export looks it up.
 *   - Her status is read ON A DAY, not off the column, for the reason
 *     memberDetailLine reads it that way: `inactive_from` (0044) means a
 *     member stored inactive from next month is active today.
 *
 * "Days she attends" states the course's schedule when she has no override,
 * because `member_schedules` is an override and a blank there reads as "she
 * attends none" -- the same rule memberDayNames applies on her card.
 */
export function memberDetailSheet(
  members: Member[], periodLabel: string, todayIso: string,
): Sheet {
  return {
    name: SHEET_MEMBER_DETAILS,
    header: [
      'Member', 'Member code', 'Status', 'Inactive from', 'Course', 'Branch',
      'Active from', 'Days they attend', 'Primary email', 'All email addresses',
      'Also known as', 'Expected', 'Attended', 'Missed', 'Attendance %', 'Period',
    ],
    rows: members.map(m => {
      const active = statusOn(m, todayIso) === 'active';
      const own = (m.weekdays ?? []).length
        ? [...(m.weekdays ?? [])].sort((a, b) => a - b).map(d => DAY_NAMES[d]).join(' · ')
        : 'Follows the course schedule';
      const addresses = [...m.emails].sort((a, b) => Number(b.primary) - Number(a.primary));
      const pct = m.expected === 0 ? null : Math.round((m.attended / m.expected) * 100);
      return [
        m.name,
        m.code,
        active ? 'Active' : 'Inactive',
        // ISO, not "1 October 2026" (0057). This sheet stopped being only a
        // read-out the day Bulk Import Inactive started READING it back: a
        // prose date cannot round-trip, and the person filling the column in
        // copies the format of the cells already in it. It is the same
        // argument the joining date below has always carried -- a month, or a
        // month name, cannot be sorted or compared in a spreadsheet -- now
        // owed by both ends of the window.
        m.inactiveFrom ?? '',
        named(m.course, NO_COURSE_LABEL),
        named(m.branch, NO_BRANCH_LABEL),
        // The stored day, not the "Mar 2026" label: a month cannot be sorted
        // or compared in a spreadsheet, and the label is on the screen anyway.
        m.joinedOn ?? 'Not on record',
        own,
        // No usable address is a stated fact with its consequence, never a
        // blank cell that reads as "not filled in yet" (C-76).
        hasEmail(m) ? (addresses[0]?.address ?? '') : 'None on file — excluded from every send',
        addresses.map(e => e.address).join(', '),
        m.aliases.join(', '),
        String(m.expected),
        String(m.attended),
        missedOf(m),
        pctCell(pct),
        periodLabel,
      ];
    }),
  };
}

/**
 * SHEET 3 -- one row per course the report counted, with ITS form's fields and
 * the member count in it. Courses scope only.
 *
 * The member count is the whole point of the sheet
 * (requests/...part 4: "another sheet with course details and with member in
 * that course count"), and it is counted from the SAME grouping the bars are
 * drawn from -- never queried a second way.
 *
 * `courses` is what the course list holds and is allowed to be short: a group
 * whose members are enrolled at nothing, or at a course that has since been
 * deleted, still gets its row with its count and blank course fields. Dropping
 * it would make this sheet's member total disagree with sheet 2's.
 */
export function courseDetailSheet(
  members: Member[],
  courses: (CourseFacts & { id: string })[],
  rules: { global: FollowUpRule; byCourseName: Record<string, FollowUpRule> },
  periodLabel: string,
): Sheet {
  const groups = reportGroups(members, 'Courses');
  return {
    name: SHEET_COURSE_DETAILS,
    header: [
      'Course', 'Members', 'Members with email', 'Members without email',
      'Branches', 'Days', 'Days per week', 'Start time', 'End time',
      'Follow-up trigger', 'Expected', 'Attended', 'Missed', 'Attendance %', 'Period',
    ],
    rows: groups.map(g => {
      const course = courseForGroup(g, courses);
      const days = course ? courseDayNames(course) : [];
      const expected = g.members.reduce((n, m) => n + m.expected, 0);
      const attended = g.members.reduce((n, m) => n + m.attended, 0);
      const withMail = g.members.filter(hasEmail).length;
      const rule = rules.byCourseName[g.label] ?? rules.global;
      return [
        g.label,
        String(g.members.length),
        String(withMail),
        String(g.members.length - withMail),
        course ? courseBranchNames(course).join(', ') : '',
        // No days set is not a blank: the course expects nothing of anybody,
        // which is the more serious fact and the one courseSummary already
        // says out loud on its card.
        course ? (days.length ? days.join(' · ') : 'No days set') : '',
        course ? String(days.length) : '',
        course ? clockTime(course.start_time) : '',
        course ? clockTime(course.end_time) : '',
        // The rule as the app itself states it, from the one function that
        // words it -- never a second phrasing of the same thresholds.
        course ? ruleSentence(rule, g.label) : '',
        String(expected),
        String(attended),
        missedOf({ expected, attended }),
        pctCell(expected === 0 ? null : Math.round((attended / expected) * 100)),
        periodLabel,
      ];
    }),
  };
}

/**
 * The whole workbook: TWO sheets, and which second sheet depends on the scope.
 *
 *   Members → Attendance + Member details
 *   Courses → Attendance + Course details
 *
 * A COURSE REPORT DOES NOT CARRY THE MEMBER ROLL. The first cut of this gave
 * Courses all three, reading "also another sheet" as additive. The requester
 * corrected it in the same words that settle it: *"member detail sheet is not
 * needed when exported courses report only count is enough"* -- the member
 * COUNT is already a column on the course sheet, and 200 member rows beside it
 * answer a question nobody asked of a course report.
 *
 * The Branches scope has no tab and no form behind a branch, so it takes
 * Members' shape -- a member detail sheet is the only detail a branch grouping
 * has.
 */
export function reportSheets(opts: {
  scope: ReportScope;
  rows: ReportRow[];
  members: Member[];
  courses: (CourseFacts & { id: string })[];
  rules: { global: FollowUpRule; byCourseName: Record<string, FollowUpRule> };
  periodLabel: string;
  todayIso: string;
}): Sheet[] {
  return [
    attendanceSheet(opts.rows, opts.scope, opts.periodLabel),
    opts.scope === 'Courses'
      ? courseDetailSheet(opts.members, opts.courses, opts.rules, opts.periodLabel)
      : memberDetailSheet(opts.members, opts.periodLabel, opts.todayIso),
  ];
}

/** The name the browser saves it under. `.xlsx` now, because it is one --
 *  a workbook saved as .csv opens as a single sheet of gibberish. */
export function reportFileName(scope: ReportScope, from: string, to: string): string {
  return `rosifit-${scope.toLowerCase()}-report-${from}-to-${to}.xlsx`;
}
