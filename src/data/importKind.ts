/**
 * WHICH FILE IS THIS -- the one decision that lets Bulk Import be ONE button.
 *
 * The requester's instruction, on 09-Sep-2026, reversing the two-button shape
 * built the day before: "this in imported using bulk import button itself
 * where on click you can import excel file but it should not break the
 * existing bulk import members feature where multible members are uploaded as
 * new members".
 *
 * So one button takes two files that have nothing in common but their
 * extension:
 *
 *   THE TEMPLATE  -- "Member Data" sheet, a "Full Name" column. Rows are
 *                    people who are NOT on the register yet, and importing it
 *                    CREATES them. This is the path that must not break.
 *   THE REPORT    -- "Member details" sheet, a "Member" column beside Active
 *                    from / Inactive from / Status. Rows are people who ARE on
 *                    the register, and importing it MOVES THEIR DATES. It
 *                    never creates anybody.
 *
 * The two verbs stay separate underneath -- `bulk_import_members` still only
 * inserts and still skips a name it already has, `bulk_set_member_dates` still
 * only updates and still refuses a name it cannot find. What changed is that
 * the person no longer has to know which of the two they want: the FILE says,
 * because the file came from one of two places and looks like where it came
 * from.
 *
 * THE CREATE PATH IS THE DEFAULT, and that is the whole safety argument for
 * merging the buttons. This module answers 'dates' only when it can see the
 * report's own marks; every unrecognisable, empty or ambiguous workbook comes
 * back 'members', lands in the importer that has always handled it, and gets
 * that importer's own refusal in its own words. A file that used to work goes
 * on working, and a file that used to be refused is refused the same way.
 *
 * Pure on purpose -- sheet names and header cells in, one word out. No
 * exceljs, so it is tested under scripts/tsconfig.json with nothing to mock;
 * the workbook half is `detectImportKind` in statusXlsx.ts.
 */
import { SHEET_MEMBER_DETAILS } from './reportSheets';

/** Which importer a workbook is for. */
export type ImportKind = 'members' | 'dates';

/** The template's data sheet and its required column. */
export const TEMPLATE_SHEET = 'Member Data';
export const TEMPLATE_REQUIRED = 'full name';

/** The report's date columns. `Member` alone is not enough -- the report's
 *  Attendance sheet names members too, and it carries no date to set. */
const REPORT_DATE_COLUMNS = ['active from', 'inactive from', 'joined on'];

/** One sheet, as much of it as this decision needs. */
export type SheetShape = {
  name: string;
  /** every header-ish cell of the sheet's first rows, lower-cased and trimmed */
  headers: string[];
};

const norm = (s: string) => s.replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase();

/**
 * Which importer this workbook is for.
 *
 * Read in this order, and the order is the safety:
 *
 *   1. The TEMPLATE's own sheet name wins outright. Somebody who filled in the
 *      template and left a stray "Member details" tab in the same workbook
 *      meant to create members, and the create path is the one that must not
 *      break.
 *   2. Then the REPORT's own sheet name, with a date column under it.
 *   3. Then headers alone, for a workbook whose tabs were renamed: a "Full
 *      Name" column is the template; a "Member" column beside a date column is
 *      the report.
 *   4. Anything else is 'members' -- see the module note. Never a third answer
 *      and never a throw: the parser that runs next owns the refusal.
 */
export function importKindOf(sheets: SheetShape[]): ImportKind {
  const shaped = sheets.map(s => ({ name: norm(s.name), headers: s.headers.map(norm) }));
  const hasDateColumn = (s: { headers: string[] }) =>
    s.headers.some(h => REPORT_DATE_COLUMNS.includes(h));

  // 1 -- the template's sheet, by name
  if (shaped.some(s => s.name === norm(TEMPLATE_SHEET))) return 'members';

  // 2 -- the report's sheet, by name, carrying something to set
  const details = shaped.find(s => s.name === norm(SHEET_MEMBER_DETAILS));
  if (details && hasDateColumn(details)) return 'dates';

  // 3 -- renamed tabs: the columns decide
  if (shaped.some(s => s.headers.includes(TEMPLATE_REQUIRED))) return 'members';
  if (shaped.some(s => s.headers.includes('member') && hasDateColumn(s))) return 'dates';

  // 4 -- unrecognisable. The create path owns it, and owns the refusal.
  return 'members';
}
