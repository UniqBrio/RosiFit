/**
 * The member import FILE — an .xlsx workbook, built and read here.
 *
 * THE REFERENCE
 * The UniqBrio Mobile App's Bulk Student Import v1 ships a three-sheet
 * workbook: an "Instructions & Sample" sheet, protected; a data sheet with
 * 500 rows and dropdowns; and a hidden lookup sheet the dropdowns read from.
 * The file is academy-branded, .xlsx only, and generated with exceljs. This
 * is that shape, with RosiFit's columns in it.
 *
 * WHY exceljs, AND WHY HERE
 * exceljs runs in Node and in the browser from the same API, so this module
 * has no `document` in it and the round trip -- build the template, read it
 * back, get the sample rows -- is a test that runs under node (see
 * memberXlsx.test.ts). The two browser halves, choosing a file and saving
 * one, stay in csv.ts where the other browser halves already live.
 *
 * The dependency was verified before it was installed: `exceljs`, 4.4.0,
 * registry.npmjs.org, pinned with --save-exact. It is the library the
 * reference implementation uses.
 */
import type * as ExcelJS from 'exceljs';
import {
  MEMBER_IMPORT_COLUMNS, MEMBER_IMPORT_HELP, MEMBER_IMPORT_REQUIRED,
  MEMBER_IMPORT_MAX_ROWS, MemberImportError, type MemberImportRow,
} from './memberImport';

/**
 * exceljs, loaded when it is first needed and not before.
 *
 * The browser build is ~950 KB minified — a third of everything else this app
 * ships — and it is used by ONE owner-only screen. A static import puts it in
 * the bundle every member of staff downloads to look at a register. The
 * dynamic import lets Metro keep it out until the import screen builds a
 * template or reads a file.
 *
 * The `.default` dance is the UMD one: the browser build assigns
 * `module.exports`, so an ESM namespace wraps it, while the Node build used
 * by the specs is already the namespace. Whichever carries `Workbook` is the
 * real one.
 */
let cached: typeof ExcelJS | null = null;
async function excel(): Promise<typeof ExcelJS> {
  if (!cached) {
    const mod = await import('exceljs');
    const inner = (mod as { default?: unknown }).default;
    cached = (inner && (inner as { Workbook?: unknown }).Workbook
      ? inner : mod) as unknown as typeof ExcelJS;
  }
  return cached;
}

/** The reference's sheet names, with the noun changed. */
export const SHEET_INSTRUCTIONS = 'Instructions & Sample';
export const SHEET_DATA = 'Member Data';
export const SHEET_COURSES = 'Courses';

/** Sample rows are sample: named so, and on the sheet nobody imports from. */
export const SAMPLE_ROWS: string[][] = [
  ['Anitha Rajesh', 'anitha@example.com', '', '', 'Anitha R;Anitha', '2026-08-01'],
  ['Divya Balakrishnan', '', '', '', 'Divya B', ''],
];

export type TemplateOptions = {
  /** the academy's name — goes in the file name and the instructions */
  academy: string;
  /** every course at every branch it runs at — the dropdowns and the lookup sheet */
  offerings: { course: string; branch: string }[];
  /** the course this template was downloaded from, if any — stated in the instructions */
  openedFrom?: { course: string; branch: string } | null;
};

/**
 * exceljs supports data validation on a worksheet at runtime and ships no
 * typing for it (index.d.ts has the DataValidation shape but not the
 * `dataValidations` collection). One cast, here, rather than three in the
 * body — and typed against exceljs' own DataValidation so a wrong rule is
 * still a compile error.
 */
function addRule(ws: ExcelJS.Worksheet, range: string, rule: ExcelJS.DataValidation): void {
  (ws as unknown as { dataValidations: { add(range: string, rule: ExcelJS.DataValidation): void } })
    .dataValidations.add(range, rule);
}

/** The file name the browser will save it as. */
export function templateFileName(academy: string): string {
  const slug = academy.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'rosifit';
  return `${slug}-members-template.xlsx`;
}

/**
 * The template workbook, as bytes.
 *
 * Three sheets, as the reference has them:
 *   1. Instructions & Sample — what each column means, the two sample rows,
 *      protected so the samples cannot be edited into a real row by mistake.
 *   2. Member Data — the header, then MEMBER_IMPORT_MAX_ROWS blank rows with
 *      a dropdown on Course and on Branch fed from the lookup sheet, and a
 *      date rule on Joined On. This is the only sheet the importer reads.
 *   3. Courses — hidden; the lookup the dropdowns point at.
 */
export async function buildMemberTemplate(opts: TemplateOptions): Promise<ArrayBuffer> {
  const wb = new (await excel()).Workbook();
  wb.creator = 'RosiFit';
  wb.created = new Date();

  // ---------------------------------------------------- 1. instructions
  const info = wb.addWorksheet(SHEET_INSTRUCTIONS);
  info.columns = [{ width: 22 }, { width: 70 }];
  info.addRow([`${opts.academy} — member import`]).font = { bold: true, size: 14 };
  info.addRow([]);
  info.addRow(['How to use this file']).font = { bold: true };
  info.addRow(['', `Fill in the "${SHEET_DATA}" sheet, one member per row. Only "${MEMBER_IMPORT_REQUIRED}" is required.`]);
  info.addRow(['', `Up to ${MEMBER_IMPORT_MAX_ROWS} members per file. Blank rows are ignored.`]);
  info.addRow(['', 'A member already on the register is skipped, never changed — edit her in the app instead.']);
  if (opts.openedFrom) {
    info.addRow(['', `Downloaded from ${opts.openedFrom.course} · ${opts.openedFrom.branch}: a row with a blank Course joins that course.`]);
  } else {
    info.addRow(['', 'Every row needs a Course (pick one from the dropdown), or open this import from inside a course.']);
  }
  info.addRow([]);
  info.addRow(['Columns']).font = { bold: true };
  for (const h of MEMBER_IMPORT_HELP) info.addRow([h.column, h.means]);
  info.addRow([]);
  info.addRow(['Sample rows (do not import these — they are here to show the shape)']).font = { bold: true };
  info.addRow([...MEMBER_IMPORT_COLUMNS]).font = { bold: true };
  for (const r of SAMPLE_ROWS) info.addRow(r);
  await info.protect('', { selectLockedCells: true, selectUnlockedCells: true });

  // ------------------------------------------------------- 3. the lookup
  // Built before the data sheet so the validation formulae have a range to
  // point at. Hidden, not merely unhelpful: a sheet the person can see is a
  // sheet they will type into.
  const lookup = wb.addWorksheet(SHEET_COURSES);
  lookup.addRow(['Course', 'Branch']);
  const courses = [...new Set(opts.offerings.map(o => o.course))].sort();
  const branches = [...new Set(opts.offerings.map(o => o.branch))].sort();
  const n = Math.max(courses.length, branches.length, 1);
  for (let i = 0; i < n; i++) lookup.addRow([courses[i] ?? '', branches[i] ?? '']);
  lookup.state = 'veryHidden';

  // --------------------------------------------------------- 2. the data
  const data = wb.addWorksheet(SHEET_DATA);
  data.columns = MEMBER_IMPORT_COLUMNS.map(c => ({ header: c, key: c, width: c === 'Email' ? 30 : 22 }));
  data.getRow(1).font = { bold: true };
  data.views = [{ state: 'frozen', ySplit: 1 }];
  const last = MEMBER_IMPORT_MAX_ROWS + 1;
  if (courses.length) {
    addRule(data,`C2:C${last}`, {
      type: 'list', allowBlank: true, showErrorMessage: true,
      formulae: [`'${SHEET_COURSES}'!$A$2:$A$${courses.length + 1}`],
      errorTitle: 'Not a course', error: 'Pick a course from the list, or leave it blank.',
    });
  }
  if (branches.length) {
    addRule(data,`D2:D${last}`, {
      type: 'list', allowBlank: true, showErrorMessage: true,
      formulae: [`'${SHEET_COURSES}'!$B$2:$B$${branches.length + 1}`],
      errorTitle: 'Not a branch', error: 'Pick a branch from the list, or leave it blank.',
    });
  }
  addRule(data, `F2:F${last}`, {
    type: 'date', allowBlank: true, showErrorMessage: true,
    operator: 'lessThanOrEqual', formulae: ['TODAY()'],
    errorTitle: 'Not a joining date', error: 'A date, no later than today. Blank means today.',
  });

  // The order the person sees is already right -- instructions, then the
  // data -- because the lookup between them is veryHidden.
  const out = await wb.xlsx.writeBuffer();
  return out as unknown as ArrayBuffer;
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);   // a real date cell
  if (typeof v === 'object' && 'result' in v) {                  // a formula
    const r = (v as ExcelJS.CellFormulaValue).result;
    return r instanceof Date ? r.toISOString().slice(0, 10) : String(r ?? '');
  }
  return cell.text.trim();
}

/**
 * The workbook into rows. Throws only for a file that is not this file at
 * all -- no data sheet, no Full Name column, nothing under the header, or
 * more rows than the ceiling. Everything a single ROW can get wrong is a
 * verdict later, never an exception here.
 */
export async function parseMemberXlsx(bytes: ArrayBuffer): Promise<MemberImportRow[]> {
  const wb = new (await excel()).Workbook();
  try {
    await wb.xlsx.load(bytes);
  } catch {
    throw new MemberImportError('That file is not an Excel workbook (.xlsx). Download the template and fill it in.');
  }
  // The named sheet first; failing that, the first sheet that carries the
  // required column -- a person who renamed the tab has not done anything
  // wrong.
  const ws = wb.getWorksheet(SHEET_DATA)
    ?? wb.worksheets.find(s => s.state === 'visible'
        && [...Array(s.rowCount).keys()].some(i =>
          s.getRow(i + 1).values && Object.values(s.getRow(i + 1).values as unknown[])
            .some(v => String(v ?? '').trim().toLowerCase() === MEMBER_IMPORT_REQUIRED.toLowerCase())));
  if (!ws) {
    throw new MemberImportError(
      `That workbook has no "${SHEET_DATA}" sheet and no sheet with a "${MEMBER_IMPORT_REQUIRED}" column. `
      + 'Download the template and fill that in.');
  }

  // find the header row and the column of each name we read
  let headerRow = 0;
  const col: Record<string, number> = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const row = ws.getRow(r);
    const found: Record<string, number> = {};
    row.eachCell((cell, c) => {
      const name = cellText(cell).toLowerCase();
      const match = MEMBER_IMPORT_COLUMNS.find(k => k.toLowerCase() === name);
      if (match) found[match] = c;
    });
    if (found[MEMBER_IMPORT_REQUIRED]) { headerRow = r; Object.assign(col, found); break; }
  }
  if (!headerRow) {
    throw new MemberImportError(
      `That sheet has no "${MEMBER_IMPORT_REQUIRED}" column, so RosiFit cannot tell which cell is a name. `
      + 'Download the template and fill that in.');
  }

  const at = (row: ExcelJS.Row, key: string) => (col[key] ? cellText(row.getCell(col[key])) : '');
  const rows: MemberImportRow[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const values = MEMBER_IMPORT_COLUMNS.map(k => at(row, k));
    if (values.every(v => v === '')) continue;                    // a blank row is not a member
    rows.push({
      row: r,
      full_name: values[0],
      email: values[1].toLowerCase(),
      course: values[2],
      branch: values[3],
      aliases: values[4].split(';').map(a => a.trim()).filter(Boolean),
      joined_on: values[5],
    });
  }
  if (rows.length === 0) {
    throw new MemberImportError('That file has a header and no rows under it. Nothing to import.');
  }
  if (rows.length > MEMBER_IMPORT_MAX_ROWS) {
    throw new MemberImportError(
      `A file may carry at most ${MEMBER_IMPORT_MAX_ROWS} members; this one has ${rows.length}. Split it and import twice.`);
  }
  return rows;
}

/** One line of the error report: the row as it was, plus why. */
export type ReportLine = { row: MemberImportRow; status: string; reason: string };

/**
 * The error report -- Row · Status · Reason, then every column as it was in
 * the file -- so the person fixes the rows in place and imports the same
 * file again. Same shape as the reference's `import_errors.xlsx`.
 */
export async function buildErrorReport(lines: ReportLine[]): Promise<ArrayBuffer> {
  const wb = new (await excel()).Workbook();
  const ws = wb.addWorksheet('Import errors');
  ws.columns = [
    { header: 'Row', width: 6 }, { header: 'Status', width: 10 }, { header: 'Reason', width: 60 },
    ...MEMBER_IMPORT_COLUMNS.map(c => ({ header: c, width: c === 'Email' ? 30 : 22 })),
  ];
  ws.getRow(1).font = { bold: true };
  for (const l of lines) {
    ws.addRow([
      l.row.row, l.status, l.reason,
      l.row.full_name, l.row.email, l.row.course, l.row.branch, l.row.aliases.join(';'), l.row.joined_on,
    ]);
  }
  const out = await wb.xlsx.writeBuffer();
  return out as unknown as ArrayBuffer;
}
