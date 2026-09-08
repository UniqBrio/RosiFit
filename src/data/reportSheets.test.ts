/**
 * Cases for the exported report's sheets, and for the defect that made this
 * change urgent.
 *
 * Run: npx tsx --test src/data/reportSheets.test.ts
 *
 * A NEW FILE, not an edit of report.test.ts: that spec is append-only and
 * deep-equals a ReportRow, which is why the member count the report now shows
 * is derived from reportGroups rather than added to the row.
 *
 * The failure mode these guard is not a crash. It is a file somebody keeps:
 * a course report whose first column names a course that does not exist, or
 * a detail sheet whose totals quietly disagree with the sheet beside it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  reportRows, reportGroups, memberDetailLine, courseDetailLine,
  courseForGroup, courseDayNames, courseBranchNames,
  NO_COURSE_LABEL, NO_BRANCH_LABEL, REPORT_SCOPES,
  type CourseFacts,
} from './report';
import {
  reportSheets, attendanceSheet, memberDetailSheet, courseDetailSheet,
  reportFileName, SHEET_ATTENDANCE, SHEET_MEMBER_DETAILS, SHEET_COURSE_DETAILS,
} from './reportSheets';
import { GLOBAL_RULE, type Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null, status: 'active',
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—',
  joinedOn: '2026-03-01', joined: 'Mar 2026', ...over,
});

/** A member enrolled at NOTHING, exactly as fetchMembers builds her: the
 *  register's dash for a course, and no course id to match on. */
const unenrolled = (over: Partial<Member> = {}): Member =>
  member({ id: 'u', name: 'Unenrolled', course: '—', course_id: null, branch: '—', ...over });

const COURSES: (CourseFacts & { id: string })[] = [
  { id: 'c1', name: 'Prenatal Flow', start_time: '06:00:00', end_time: '07:00:00',
    offerings: [{ branch: 'Coimbatore', weekdays: [1, 3, 5] }, { branch: 'Chennai', weekdays: [3, 5] }] },
  { id: 'c2', name: 'Pelvic Floor', start_time: null, end_time: null, offerings: [] },
];

const RULES = { global: GLOBAL_RULE, byCourseName: {} };
const PERIOD = '7-13 Sep 2026';
const TODAY = '2026-09-08';

// ================================================= THE DEFECT: the dash row
//
// The screenshot that opened this: a course report whose first column read
// "—", 0, 0, 0, "no sessions scheduled", sorted above every real course.

test('a member enrolled at nothing does NOT produce a course called "—"', () => {
  const labels = reportRows([member(), unenrolled()], 'Courses').map(r => r.label);
  assert.ok(!labels.includes('—'), `a course row is still named "—": ${labels.join(', ')}`);
  assert.deepEqual(labels, ['Prenatal Flow', NO_COURSE_LABEL]);
});

test('the belongs-to-nothing group sorts LAST, never above the real courses', () => {
  // localeCompare put "—" first, so the very top row of the export named a
  // course that does not exist. It is not one of the academy's courses and
  // does not belong among them.
  const labels = reportRows([
    unenrolled({ id: 'u1' }),
    member({ id: 'z', course: 'Zumba', course_id: 'c9' }),
    member({ id: 'a', course: 'Aqua', course_id: 'c8' }),
  ], 'Courses').map(r => r.label);
  assert.deepEqual(labels, ['Aqua', 'Zumba', NO_COURSE_LABEL]);
});

test('a BLANK course is the same fact as the dash, not a nameless row', () => {
  const labels = reportRows([unenrolled({ course: '' })], 'Courses').map(r => r.label);
  assert.deepEqual(labels, [NO_COURSE_LABEL]);
});

test('the branch grouping gets the same treatment, under its own name', () => {
  const labels = reportRows([member(), unenrolled()], 'Branches').map(r => r.label);
  assert.deepEqual(labels, ['Coimbatore', NO_BRANCH_LABEL]);
});

test('naming the group does not lose her figures', () => {
  // Dropping her would have been the easy fix and the wrong one: her
  // attendance in the period is real, and the Courses tab's total has to go
  // on agreeing with the Members tab's.
  const set = [member({ expected: 4, attended: 3 }), unenrolled({ expected: 6, attended: 2 })];
  const byCourse = reportRows(set, 'Courses').reduce((n, r) => n + r.attended, 0);
  const byMember = reportRows(set, 'Members').reduce((n, r) => n + r.attended, 0);
  assert.equal(byCourse, byMember);
  assert.equal(byCourse, 5);
});

// ======================================================= the scopes on show
test('the Branch TAB is gone, while the branch grouping still works', () => {
  assert.deepEqual(REPORT_SCOPES, ['Members', 'Courses']);
  assert.equal(reportRows([member()], 'Branches')[0].label, 'Coimbatore');
});

// ================================================= one grouping, read twice
test('the groups line up with the rows one for one, in the same order', () => {
  // The member count under a bar is counted from reportGroups and the bar is
  // drawn from reportRows. If those two ever disagreed about order, every
  // course row would state another course's member count.
  const set = [member({ id: '1' }), member({ id: '2' }), unenrolled()];
  const groups = reportGroups(set, 'Courses');
  const rows = reportRows(set, 'Courses');
  assert.deepEqual(groups.map(g => g.label), rows.map(r => r.label));
  assert.deepEqual(groups.map(g => g.members.length), [2, 1]);
});

test('the Members scope keeps one row per member, in the order given', () => {
  const groups = reportGroups([member({ name: 'Divya' }), member({ name: 'Aarthi' })], 'Members');
  assert.deepEqual(groups.map(g => g.label), ['Divya', 'Aarthi']);
  assert.deepEqual(groups.map(g => g.members.length), [1, 1]);
});

// ============================================== the course behind a group
test('a group is matched to its course on IDENTITY, never on its name', () => {
  // Delete a course and create another with the same name: a lookup by name
  // hands the new one the deleted one's days and times.
  const stale = [{ id: 'other', name: 'Prenatal Flow', start_time: null, end_time: null,
    offerings: [{ branch: 'Madurai', weekdays: [2] }] }];
  const g = reportGroups([member()], 'Courses')[0];
  assert.equal(courseForGroup(g, stale), null);
  assert.equal(courseForGroup(g, COURSES)?.id, 'c1');
});

test('the group that points at nothing gets no course, honestly', () => {
  const g = reportGroups([unenrolled()], 'Courses')[0];
  assert.equal(courseForGroup(g, COURSES), null);
});

// ================================================== what a row is ABOUT
test('a member row states her course, branch, status and joining month', () => {
  assert.equal(memberDetailLine(member(), TODAY),
    'Prenatal Flow · Coimbatore · Active · joined Mar 2026');
});

test('a member row reads her status ON THE DAY, not off the column', () => {
  // inactive_from (0044): stored inactive from next month means ACTIVE today,
  // and a report that called her Inactive would disagree with her own card.
  const leaving = member({ status: 'inactive', inactiveFrom: '2026-10-01' });
  assert.match(memberDetailLine(leaving, TODAY), /· Active ·/);
  assert.match(memberDetailLine(leaving, '2026-10-01'), /· Inactive ·/);
});

test('an unenrolled member says so on her row rather than showing a dash', () => {
  const line = memberDetailLine(unenrolled({ joined: '—' }), TODAY);
  assert.ok(!line.includes('—'), line);
  assert.equal(line,
    `${NO_COURSE_LABEL} · ${NO_BRANCH_LABEL} · Active · joining date not on record`);
});

test('a course row leads with the MEMBER COUNT, then where and when it runs', () => {
  assert.equal(courseDetailLine(3, COURSES[0]),
    '3 members · Chennai, Coimbatore · Mon · Wed · Fri · 06:00–07:00');
});

test('one member is singular', () => {
  assert.equal(courseDetailLine(1, COURSES[0]).startsWith('1 member ·'), true);
});

test('a course with no days says so — a blank reads as "no days set yet"', () => {
  assert.equal(courseDetailLine(2, COURSES[1]), '2 members · no days set');
});

test('the count stands alone while the course list is still loading', () => {
  // Every FIGURE on the report comes from the member rows; the course list is
  // a decoration and the report must not wait on it.
  assert.equal(courseDetailLine(4, null), '4 members');
});

test('a course runs on the union of its offerings’ days, Monday first', () => {
  assert.deepEqual(courseDayNames(COURSES[0]), ['Mon', 'Wed', 'Fri']);
  assert.deepEqual(courseBranchNames(COURSES[0]), ['Chennai', 'Coimbatore']);
});

// ========================================================== the workbook
test('every report exports TWO sheets; the scope decides the second', () => {
  const opts = {
    rows: [], members: [member()], courses: COURSES, rules: RULES,
    periodLabel: PERIOD, todayIso: TODAY,
  };
  assert.deepEqual(reportSheets({ ...opts, scope: 'Members' }).map(s => s.name),
    [SHEET_ATTENDANCE, SHEET_MEMBER_DETAILS]);
  assert.deepEqual(reportSheets({ ...opts, scope: 'Courses' }).map(s => s.name),
    [SHEET_ATTENDANCE, SHEET_COURSE_DETAILS]);
});

test('a COURSE report does not carry the member roll', () => {
  // The count is already a column on the course sheet; 200 member rows beside
  // it answer a question nobody asked of a course report. Asserted rather
  // than trusted, because the first cut of this shipped all three sheets.
  const names = reportSheets({
    scope: 'Courses', rows: [], members: [member()], courses: COURSES,
    rules: RULES, periodLabel: PERIOD, todayIso: TODAY,
  }).map(s => s.name);
  assert.ok(!names.includes(SHEET_MEMBER_DETAILS), names.join(', '));
});

test('sheet 1 is the file that was exported before, unmoved', () => {
  // The sheet somebody already keeps and compares month to month. Its header
  // and its five values per row are frozen.
  const rows = reportRows([member({ expected: 4, attended: 3 })], 'Courses');
  const s = attendanceSheet(rows, 'Courses', PERIOD);
  assert.deepEqual(s.header,
    ['Course', 'Expected', 'Attended', 'Missed', 'Attendance %', 'Period']);
  assert.deepEqual(s.rows, [['Prenatal Flow', '4', '3', '1', '75%', PERIOD]]);
});

test('sheet 1 says "no sessions scheduled" where the screen says it', () => {
  // An exported "0%" where the screen says "no sessions" is the report
  // disagreeing with itself in the file somebody keeps.
  const rows = reportRows([member({ expected: 0, attended: 0 })], 'Courses');
  assert.equal(attendanceSheet(rows, 'Courses', PERIOD).rows[0][4], 'no sessions scheduled');
});

test('an extra attendance never exports a negative missed count', () => {
  const rows = reportRows([member({ expected: 3, attended: 5 })], 'Members');
  assert.equal(attendanceSheet(rows, 'Members', PERIOD).rows[0][3], '0');
});

// ------------------------------------------------------- member details
test('the member sheet carries every field her form holds', () => {
  const s = memberDetailSheet([member({
    code: 'RF-0007', name: 'Divya', aliases: ['Divya B', 'D'],
    weekdays: [5, 1], expected: 4, attended: 3,
    emails: [{ address: 'second@b.com', primary: false }, { address: 'first@b.com', primary: true }],
  })], PERIOD, TODAY);
  assert.deepEqual(s.header, [
    'Member', 'Member code', 'Status', 'Inactive from', 'Course', 'Branch',
    'Joined on', 'Days she attends', 'Primary email', 'All email addresses',
    'Also known as', 'Expected', 'Attended', 'Missed', 'Attendance %', 'Period',
  ]);
  assert.deepEqual(s.rows[0], [
    'Divya', 'RF-0007', 'Active', '', 'Prenatal Flow', 'Coimbatore',
    '2026-03-01', 'Mon · Fri',
    // primary first, whatever order the record stores them in
    'first@b.com', 'first@b.com, second@b.com',
    'Divya B, D', '4', '3', '1', '75%', PERIOD,
  ]);
});

test('no own days means she follows the course, never "she attends none"', () => {
  const s = memberDetailSheet([member({ weekdays: null })], PERIOD, TODAY);
  assert.equal(s.rows[0][7], 'Follows the course schedule');
  assert.equal(memberDetailSheet([member({ weekdays: [] })], PERIOD, TODAY).rows[0][7],
    'Follows the course schedule');
});

test('no address is a stated fact with its consequence, never a blank cell', () => {
  const s = memberDetailSheet([member({ emails: [] })], PERIOD, TODAY);
  assert.equal(s.rows[0][8], 'None on file — excluded from every send');
  assert.equal(s.rows[0][9], '');
});

test('the joining DATE is exported, not the "Mar 2026" label', () => {
  // A month cannot be sorted or compared in a spreadsheet, and the label is
  // on the screen anyway.
  assert.equal(memberDetailSheet([member()], PERIOD, TODAY).rows[0][6], '2026-03-01');
  assert.equal(memberDetailSheet([member({ joinedOn: null })], PERIOD, TODAY).rows[0][6],
    'Not on record');
});

test('a leaving date is written in words beside the status it explains', () => {
  const s = memberDetailSheet([member({ status: 'inactive', inactiveFrom: '2026-10-01' })],
    PERIOD, TODAY);
  assert.equal(s.rows[0][2], 'Active');            // on 8 Sep she still is
  assert.equal(s.rows[0][3], '1 October 2026');
});

// ------------------------------------------------------- course details
test('the course sheet states the member count in that course', () => {
  const s = courseDetailSheet(
    [member({ id: '1' }), member({ id: '2', emails: [] }), unenrolled()],
    COURSES, RULES, PERIOD);
  const pf = s.rows.find(r => r[0] === 'Prenatal Flow')!;
  assert.equal(pf[1], '2');                        // Members
  assert.equal(pf[2], '1');                        // with email
  assert.equal(pf[3], '1');                        // without
  assert.equal(pf[4], 'Chennai, Coimbatore');
  assert.equal(pf[5], 'Mon · Wed · Fri');
  assert.equal(pf[6], '3');
  assert.equal(pf[7], '06:00');
  assert.equal(pf[8], '07:00');
  assert.match(pf[9], /^Members in Prenatal Flow will be listed for follow-up when they /);
});

test('the course sheet keeps the belongs-to-nothing row, with blank course fields', () => {
  // Dropping it would make this sheet's member total disagree with the
  // member sheet's, which is the whole reason the two sit in one workbook.
  const s = courseDetailSheet([member(), unenrolled()], COURSES, RULES, PERIOD);
  const none = s.rows.find(r => r[0] === NO_COURSE_LABEL)!;
  assert.equal(none[1], '1');
  assert.deepEqual(none.slice(4, 10), ['', '', '', '', '', '']);
});

test('a course with no days set says so rather than leaving the cell empty', () => {
  const s = courseDetailSheet([member({ course: 'Pelvic Floor', course_id: 'c2' })],
    COURSES, RULES, PERIOD);
  assert.equal(s.rows[0][5], 'No days set');
  assert.equal(s.rows[0][6], '0');
});

test('the two sheets of a report agree, whichever pair they are', () => {
  // The whole reason they sit in one workbook: sheet 2 adds COLUMNS to the
  // same members sheet 1 counted, never a second count of them.
  const set = [
    member({ id: '1', expected: 4, attended: 3 }),
    member({ id: '2', course: 'Pelvic Floor', course_id: 'c2', expected: 6, attended: 6 }),
    unenrolled({ expected: 2, attended: 1 }),
  ];
  const sum = (s: { rows: string[][] }, col: number) =>
    s.rows.reduce((n, r) => n + Number(r[col]), 0);
  const sheetsFor = (scope: 'Members' | 'Courses') => reportSheets({
    scope, rows: reportRows(set, scope), members: set,
    courses: COURSES, rules: RULES, periodLabel: PERIOD, todayIso: TODAY,
  });

  const courses = sheetsFor('Courses');
  assert.equal(sum(courses[0], 1), 12);            // attendance: Expected
  assert.equal(sum(courses[1], 10), 12);           // course details: Expected
  assert.equal(sum(courses[1], 1), 3);             // course details: Members
  assert.equal(courses[1].rows.length, 3);         // one row per course group

  const members = sheetsFor('Members');
  assert.equal(sum(members[0], 1), 12);            // attendance: Expected
  assert.equal(sum(members[1], 11), 12);           // member details: Expected
  assert.equal(members[1].rows.length, 3);         // one row per member, always
});

// ------------------------------------------------------------ the file
test('the export is named .xlsx, because it is one', () => {
  // A workbook saved as .csv opens as a single sheet of gibberish.
  assert.equal(reportFileName('Courses', '2026-09-07', '2026-09-13'),
    'rosifit-courses-report-2026-09-07-to-2026-09-13.xlsx');
});
