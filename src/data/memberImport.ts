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
 * most; blank rows skipped; a duplicate SKIPPED, never overwritten; every row
 * judged on its own so one failure costs no other; an error report the person
 * can fix and re-import. Applied here to RosiFit's own member -- no phone
 * number (C-70), ONE course per row (one active enrolment per member, 0006),
 * and Google Meet display names, which UniqBrio has no equivalent of and
 * RosiFit's matching depends on.
 *
 * NO JOINING DATE IS ASKED FOR. The reference has one, blank meaning today;
 * here the column is gone and today is the only answer, so there is no cell
 * left to write a date into the wrong shape.
 *
 * Pure on purpose: no exceljs, no `document`. The workbook halves live in
 * memberXlsx.ts and the browser halves in csv.ts, so this file is tested
 * under scripts/tsconfig.json with nothing to mock.
 */

export const MEMBER_IMPORT_COLUMNS = [
  'Full Name', 'Email', 'Course', 'Branch', 'Display Names',
] as const;

export type MemberImportColumn = (typeof MEMBER_IMPORT_COLUMNS)[number];

/**
 * The header CELL a column is written as, when that differs from the column's
 * name: the name, then the SHAPE the cell wants, in brackets.
 *
 * The separator used to live in the instructions sheet and in the on-screen
 * help -- two places nobody is looking at while typing into row 14. It now
 * says so in the header of the column it is about, which is the one piece of
 * text on screen the whole time that column is being filled in.
 *
 * The parser reads the column NAME back out of a header (canonicalColumn), so
 * a bracket added here never costs a file its column.
 */
export const MEMBER_IMPORT_HEADERS: Record<MemberImportColumn, string> = {
  'Full Name': 'Full Name',
  'Email': 'Email',
  'Course': 'Course',
  'Branch': 'Branch',
  'Display Names': 'Display Names (separate with commas)',
};

/**
 * A header cell back to the column it is. The bracketed hint is stripped, so
 * "Display Names (separate with commas)" and a plain "Display Names" -- the
 * header on every file built from the earlier template -- are one column.
 */
const HEADER_HINT = /\s*\([^)]*\)\s*$/;
export function canonicalColumn(header: string): MemberImportColumn | null {
  const bare = header.replace(HEADER_HINT, '').trim().toLowerCase();
  return MEMBER_IMPORT_COLUMNS.find(c => c.toLowerCase() === bare) ?? null;
}

/**
 * Display names, as the person separates them.
 *
 * COMMAS, which is what the header now asks for. A semicolon is still split
 * on: it is what the earlier template asked for, and a file built from that
 * one would otherwise import "Anitha R;Anitha" as ONE display name matching
 * nobody -- silently, because a single alias is a legal row.
 */
export function splitAliases(cell: string): string[] {
  return cell.split(/[,;]/).map(a => a.trim()).filter(Boolean);
}

export const MEMBER_IMPORT_REQUIRED = 'Full Name';

/** The reference's ceilings, kept: a file is a batch, not a database. */
export const MEMBER_IMPORT_MAX_ROWS = 500;
export const MEMBER_IMPORT_MAX_BYTES = 5 * 1024 * 1024;

/**
 * The per-CELL bounds, named once and enforced twice: as an Excel rule that
 * stops the cell being typed (memberXlsx.ts) and as a verdict on the row
 * (below), because a file need not have come from our template.
 *
 * NAME_MIN/NAME_MAX are members.full_name's own check constraint (0006), so a
 * name refused here is exactly a name the database would have refused.
 */
export const NAME_MIN = 2;
export const NAME_MAX = 120;
/** A display name is a name, so it is bounded the same way. */
export const ALIAS_MAX = 120;
/** The RFC 5321 ceiling for a whole address. */
export const EMAIL_MAX = 254;

/** What each column is for, shown on the screen and written into the
 *  template's instructions sheet -- one source for both. */
export const MEMBER_IMPORT_HELP: { column: string; means: string }[] = [
  { column: 'Full Name', means: 'required — the member name as the academy writes it' },
  { column: 'Email', means: 'required — the address the academy writes to' },
  { column: 'Course', means: 'pick from the list; blank means the course this import was opened from' },
  { column: 'Branch', means: 'pick from the list; blank means that course’s branch' },
  { column: 'Display Names', means: 'the names Google Meet shows for them, separated by commas' },
];

export type MemberImportRow = {
  /** the SPREADSHEET row number, so a refusal can be found again */
  row: number;
  full_name: string;
  email: string;
  course: string;
  branch: string;
  aliases: string[];
};

/**
 * WHY a blocked row is also CATEGORISED.
 *
 * The results a person is shown are four counts -- imported, skipped, failed,
 * no course -- and three of the four can be reached without the server ever
 * seeing the row. Reading the category back out of the reason SENTENCE would
 * make every one of those counts depend on the wording of a message, so a
 * copy edit would silently move a row from one count to another. The kind is
 * decided where the refusal is decided, once.
 *
 *  - 'duplicate' : she is already on the register, or twice in this file.
 *                  Counted as SKIPPED, which is what the register does with
 *                  her: nothing.
 *  - 'no-course' : the row names no course we run, or none at that branch.
 *                  Its own count, because it is the one refusal the person
 *                  fixes in RosiFit rather than in the file.
 *  - 'invalid'   : everything else -- no name, no address, a malformed one,
 *                  a display name that belongs to somebody else.
 */
export type BlockKind = 'duplicate' | 'no-course' | 'invalid';

export type RowVerdict =
  | { state: 'ready'; row: MemberImportRow }
  | { state: 'blocked'; row: MemberImportRow; reason: string; kind: BlockKind };

export class MemberImportError extends Error {}

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

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
};

/**
 * Every row, judged BEFORE anything is written. A blocked row carries its
 * reason in the row rather than in a summary count, because "3 rows blocked"
 * is a number somebody has to take on trust and "row 7: Divya Ramesh is
 * already on the register" is one they can act on.
 *
 * The server judges again (bulk_import_members, 0028). This pass is no longer
 * a preview somebody confirms -- choosing the file imports it -- so what this
 * pass is FOR is deciding which rows are worth sending and giving the other
 * ones a reason, in the same second. The server's pass is still what makes
 * the result true.
 */
export function validateMemberRows(
  rows: MemberImportRow[], ctx: ValidationContext,
): RowVerdict[] {
  const seenNames = new Set<string>();
  const seenAliases = new Set<string>();
  const seenEmails = new Set<string>();

  return rows.map(row => {
    const blocked = (reason: string, kind: BlockKind = 'invalid'): RowVerdict =>
      ({ state: 'blocked', row, reason, kind });
    const name = row.full_name.trim();

    if (name.length < NAME_MIN) return blocked('No name in this row — member name and email address are both required.');
    if (name.length > NAME_MAX) return blocked(`That name is longer than ${NAME_MAX} characters.`);

    const norm = normalizeForMatch(name);
    if (!norm) return blocked('That name has no letters or digits in it.');
    if (seenNames.has(norm)) return blocked(`“${name}” appears earlier in this file.`, 'duplicate');
    if (ctx.existingNames.has(norm)) {
      // The reference SKIPS a duplicate rather than overwriting. Shown here
      // before the tap so the person is not surprised by the count.
      return blocked(`“${name}” is already on the register — skipped. Edit the member instead.`, 'duplicate');
    }

    const course = row.course || ctx.defaultCourse;
    // The default branch belongs to the DEFAULT course. A row that names its
    // own course and no branch is asking "wherever that course runs", not
    // "the branch this import was opened from".
    const branch = row.branch || (row.course ? '' : ctx.defaultBranch);
    if (!course) return blocked('No course, and this import was not opened from one.', 'no-course');
    const runsHere = ctx.offerings.some(o =>
      o.course.toLowerCase() === course.toLowerCase()
      && (!branch || o.branch.toLowerCase() === branch.toLowerCase()));
    if (!runsHere) {
      const anyBranch = ctx.offerings.filter(o => o.course.toLowerCase() === course.toLowerCase());
      return blocked(anyBranch.length
        ? `${course} does not run at ${branch || '—'}. It runs at ${anyBranch.map(o => o.branch).join(', ')}.`
        : `There is no course called “${course}”. Add it first — a member joins a course at a branch.`,
        'no-course');
    }
    const resolvedBranch = branch
      || ctx.offerings.find(o => o.course.toLowerCase() === course.toLowerCase())?.branch
      || '';

    // AN ADDRESS IS REQUIRED, which it was not before. A member with no
    // address cannot be written to, and a file is the one place a hundred of
    // them arrive at once -- so a blank here is a row to fix now rather than a
    // member who quietly turns up on the register excluded from every send.
    if (!row.email) {
      return blocked('No email in this row — every member needs an address the academy can write to.');
    }
    if (row.email.length > EMAIL_MAX) return blocked(`That address is longer than ${EMAIL_MAX} characters.`);
    if (!EMAIL.test(row.email)) return blocked(`“${row.email}” is not an email address.`);
    if (seenEmails.has(row.email)) return blocked(`${row.email} appears earlier in this file.`, 'duplicate');
    if (ctx.existingEmails.has(row.email)) return blocked(`${row.email} is already on another member.`);

    for (const alias of row.aliases) {
      const a = normalizeForMatch(alias);
      if (!a) return blocked(`“${alias}” is not a usable display name.`);
      if (alias.length > ALIAS_MAX) {
        return blocked(`The display name “${alias}” is longer than ${ALIAS_MAX} characters.`);
      }
      // Academy-wide unique: one display name can never point at two members,
      // or an attendance import would have to guess which.
      if (seenAliases.has(a)) return blocked(`The display name “${alias}” appears earlier in this file.`);
      if (ctx.existingAliases.has(a)) return blocked(`The display name “${alias}” already belongs to another member.`);
    }

    seenNames.add(norm);
    row.aliases.forEach(a => seenAliases.add(normalizeForMatch(a)));
    seenEmails.add(row.email);
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

/**
 * The four counts the result is reported as: Imported, Skipped, Failed and
 * No course -- the shape the reference implementation reports, and the shape
 * a person can act on without reading a single row.
 *
 * It has to merge two sources. A row the client blocked never reached the
 * server, so it has no verdict there; a row that was sent has no client
 * verdict beyond "ready". Neither half is the whole file, and the total is
 * the FILE's row count, not either half's.
 */
export type ImportTally = {
  imported: number;
  /** already on the register, or the same person twice in one file */
  skipped: number;
  failed: number;
  /** named no course we run, or none at that branch */
  noCourse: number;
  total: number;
};

export function tallyImport(verdicts: RowVerdict[], result: ImportResult | null): ImportTally {
  const kind = (k: BlockKind) =>
    verdicts.filter(v => v.state === 'blocked' && v.kind === k).length;
  return {
    imported: result?.inserted ?? 0,
    skipped: (result?.skipped ?? 0) + kind('duplicate'),
    failed: (result?.failed ?? 0) + kind('invalid'),
    noCourse: kind('no-course'),
    total: verdicts.length,
  };
}
