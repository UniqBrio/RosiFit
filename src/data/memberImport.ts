/**
 * The MEMBER import — the rules, pure.
 *
 * The implementation plan says the member file is a separate thing from the
 * attendance register (§6.6): it "may carry email, course and branch. Its
 * mapping is separate. Nothing in §6.1 applies to it. Stated because
 * conflating the two is the likeliest misreading." That misreading had
 * shipped: the course detail's Bulk Import opened `/upload`, the Google Meet
 * attendance importer.
 *
 * THE REFERENCE
 * The UniqBrio Mobile App's Bulk Student Import v1: an .xlsx template with an
 * instructions sheet, a data sheet and a hidden lookup; 500 rows and 5 MB at
 * most; blank rows skipped; a blank joining date meaning today; a duplicate
 * SKIPPED, never overwritten; every row judged on its own so one failure
 * costs no other; an error report the person can fix and re-import. Applied
 * here to RosiFit's own member -- no phone number (C-70), ONE course per row
 * (one active enrolment per member, 0006), and Google Meet display names,
 * which UniqBrio has no equivalent of and RosiFit's matching depends on.
 *
 * Pure on purpose: no exceljs, no `document`. The workbook halves live in
 * memberXlsx.ts and the browser halves in csv.ts, so this file is tested
 * under scripts/tsconfig.json with nothing to mock.
 */

export const MEMBER_IMPORT_COLUMNS = [
  'Full Name', 'Email', 'Course', 'Branch', 'Display Names', 'Joined On',
] as const;

export const MEMBER_IMPORT_REQUIRED = 'Full Name';

/** The reference's ceilings, kept: a file is a batch, not a database. */
export const MEMBER_IMPORT_MAX_ROWS = 500;
export const MEMBER_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

/** What each column is for, shown on the screen and written into the
 *  template's instructions sheet -- one source for both. */
export const MEMBER_IMPORT_HELP: { column: string; means: string }[] = [
  { column: 'Full Name', means: 'required — her name as the academy writes it' },
  { column: 'Email', means: 'her address; blank is fine, she is listed as excluded from sends' },
  { column: 'Course', means: 'pick from the list; blank means the course this import was opened from' },
  { column: 'Branch', means: 'pick from the list; blank means that course’s branch' },
  { column: 'Display Names', means: 'the names Google Meet shows for her, separated by ;' },
  { column: 'Joined On', means: 'a date no later than today; blank means today' },
];

export type MemberImportRow = {
  /** the SPREADSHEET row number, so a refusal can be found again */
  row: number;
  full_name: string;
  email: string;
  course: string;
  branch: string;
  aliases: string[];
  joined_on: string;
};

export type RowVerdict =
  | { state: 'ready'; row: MemberImportRow }
  | { state: 'blocked'; row: MemberImportRow; reason: string };

export class MemberImportError extends Error {}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Same shape normalize_name() produces in the database, so "Priya  R." and
 *  "priya r" collide here exactly as they will there. */
export function normalizeForMatch(name: string): string {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

export type ValidationContext = {
  /** every name already on the register, normalised */
  existingNames: Set<string>;
  /** every display name already claimed, normalised — unique academy-wide */
  existingAliases: Set<string>;
  /** every live address already on file, lowercased */
  existingEmails: Set<string>;
  /** course name (as written) -> the branches it runs at */
  offerings: { course: string; branch: string }[];
  /** the course and branch a blank cell falls back to */
  defaultCourse: string;
  defaultBranch: string;
  /** today, ISO — a member cannot have joined tomorrow */
  today: string;
};

/**
 * Every row, judged BEFORE anything is written. A blocked row carries its
 * reason in the row rather than in a summary count, because "3 rows blocked"
 * is a number somebody has to take on trust and "row 7: Divya Ramesh is
 * already on the register" is one they can act on.
 *
 * The server judges again (bulk_import_members, 0028) -- this pass is what
 * lets the person see the whole verdict before the tap, and the server's is
 * what makes it true.
 */
export function validateMemberRows(
  rows: MemberImportRow[], ctx: ValidationContext,
): RowVerdict[] {
  const seenNames = new Set<string>();
  const seenAliases = new Set<string>();
  const seenEmails = new Set<string>();

  return rows.map(row => {
    const blocked = (reason: string): RowVerdict => ({ state: 'blocked', row, reason });
    const name = row.full_name.trim();

    if (name.length < 2) return blocked('No name in this row — her name is the one required cell.');
    if (name.length > 120) return blocked('That name is longer than 120 characters.');

    const norm = normalizeForMatch(name);
    if (!norm) return blocked('That name has no letters or digits in it.');
    if (seenNames.has(norm)) return blocked(`“${name}” appears earlier in this file.`);
    if (ctx.existingNames.has(norm)) {
      // The reference SKIPS a duplicate rather than overwriting. Shown here
      // before the tap so the person is not surprised by the count.
      return blocked(`“${name}” is already on the register — she will be skipped. Edit her instead.`);
    }

    const course = row.course || ctx.defaultCourse;
    // The default branch belongs to the DEFAULT course. A row that names its
    // own course and no branch is asking "wherever that course runs", not
    // "the branch this import was opened from".
    const branch = row.branch || (row.course ? '' : ctx.defaultBranch);
    if (!course) return blocked('No course, and this import was not opened from one.');
    const runsHere = ctx.offerings.some(o =>
      o.course.toLowerCase() === course.toLowerCase()
      && (!branch || o.branch.toLowerCase() === branch.toLowerCase()));
    if (!runsHere) {
      const anyBranch = ctx.offerings.filter(o => o.course.toLowerCase() === course.toLowerCase());
      return blocked(anyBranch.length
        ? `${course} does not run at ${branch || '—'}. It runs at ${anyBranch.map(o => o.branch).join(', ')}.`
        : `There is no course called “${course}”. Add it first — a member joins a course at a branch.`);
    }
    const resolvedBranch = branch
      || ctx.offerings.find(o => o.course.toLowerCase() === course.toLowerCase())?.branch
      || '';

    if (row.email) {
      if (!EMAIL.test(row.email)) return blocked(`“${row.email}” is not an email address.`);
      if (seenEmails.has(row.email)) return blocked(`${row.email} appears earlier in this file.`);
      if (ctx.existingEmails.has(row.email)) return blocked(`${row.email} is already on another member.`);
    }

    for (const alias of row.aliases) {
      const a = normalizeForMatch(alias);
      if (!a) return blocked(`“${alias}” is not a usable display name.`);
      // Academy-wide unique: one display name can never point at two members,
      // or an attendance import would have to guess which.
      if (seenAliases.has(a)) return blocked(`The display name “${alias}” appears earlier in this file.`);
      if (ctx.existingAliases.has(a)) return blocked(`The display name “${alias}” already belongs to another member.`);
    }

    if (row.joined_on) {
      if (!ISO_DATE.test(row.joined_on)) return blocked(`“${row.joined_on}” is not a date. Write it as YYYY-MM-DD.`);
      if (row.joined_on > ctx.today) return blocked('That joining date is in the future.');
    }

    seenNames.add(norm);
    row.aliases.forEach(a => seenAliases.add(normalizeForMatch(a)));
    if (row.email) seenEmails.add(row.email);
    return { state: 'ready', row: { ...row, course, branch: resolvedBranch } };
  });
}

/** What the server says about each row it was sent (0028). */
export type ImportRowResult = {
  row: number;
  full_name: string;
  status: 'inserted' | 'skipped' | 'failed';
  reason?: string;
  member_id?: string;
};

export type ImportResult = {
  run_id: string;
  total: number;
  inserted: number;
  skipped: number;
  failed: number;
  rows: ImportRowResult[];
};
