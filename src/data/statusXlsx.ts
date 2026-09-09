/**
 * The Reports export, read back in -- the workbook half of Bulk Import
 * Inactive (0058).
 *
 * There is no template to download here, and that is the point. The file the
 * academy uploads is the file RosiFit gave them: Reports → Export, the
 * `Member details` sheet, with the two date columns typed into. Asking them to
 * copy forty names into a second spreadsheet would be asking them to
 * re-key the register to change two columns of it.
 *
 * Kept apart from memberXlsx.ts on purpose. That module builds and reads the
 * MEMBER template, which creates people; this one reads the REGISTER, which
 * only ever moves dates on people who already exist. The requester drew that
 * line -- "dont allow it in bulk import itslef" -- and one module reading two
 * unrelated file shapes is how the line stops being visible in the code.
 */
import type ExcelJS from 'exceljs';
import { excel, cellText } from './memberXlsx';
import {
  canonicalStatusColumn, cellValue, MemberImportError,
  STATUS_IMPORT_REQUIRED, STATUS_IMPORT_SHEET,
  type StatusImportRow,
} from './statusImport';
import { MEMBER_IMPORT_MAX_ROWS } from './memberImport';

/**
 * The workbook into rows. Throws only for a file that is not this file at all
 * -- no member sheet, no Member column, nothing under the header, or more rows
 * than the ceiling. Everything a single ROW can get wrong is a verdict later,
 * never an exception here: that is memberXlsx's rule and there is no reason
 * for this reader to have a different one.
 */
export async function parseStatusXlsx(bytes: ArrayBuffer): Promise<StatusImportRow[]> {
  const wb = new (await excel()).Workbook();
  try {
    await wb.xlsx.load(bytes);
  } catch {
    throw new MemberImportError(
      'That file is not an Excel workbook (.xlsx). Export the members report and upload that.');
  }

  // The report's own sheet first; failing that, the first visible sheet
  // carrying the required column. A person who kept only the sheet they were
  // working on, or renamed the tab, has not done anything wrong.
  const ws = wb.getWorksheet(STATUS_IMPORT_SHEET)
    ?? wb.worksheets.find(s => s.state === 'visible' && sheetHasNameColumn(s));
  if (!ws) {
    throw new MemberImportError(
      `That workbook has no “${STATUS_IMPORT_SHEET}” sheet and no sheet with a “${STATUS_IMPORT_REQUIRED}” column. `
      + 'Export the members report from Reports and upload that file.');
  }

  // find the header row and the column of each name this reader wants
  let headerRow = 0;
  const col: Partial<Record<string, number>> = {};
  for (let r = 1; r <= Math.min(ws.rowCount, 20); r++) {
    const found: Record<string, number> = {};
    ws.getRow(r).eachCell((cell, c) => {
      const match = canonicalStatusColumn(cellText(cell));
      if (match) found[match] = c;
    });
    if (found[STATUS_IMPORT_REQUIRED]) { headerRow = r; Object.assign(col, found); break; }
  }
  if (!headerRow) {
    throw new MemberImportError(
      `That sheet has no “${STATUS_IMPORT_REQUIRED}” column, so RosiFit cannot tell which cell is a name. `
      + 'Export the members report from Reports and upload that file.');
  }

  // A file with a Member column and NEITHER date column is the wrong export --
  // most likely the Attendance sheet, which also names members. Said before
  // forty rows come back "nothing to update", which is what would otherwise
  // happen and would read as the register already agreeing.
  if (!col['Active from'] && !col['Inactive from'] && !col.Status) {
    throw new MemberImportError(
      'That sheet has no “Active from”, “Inactive from” or “Status” column, so there is nothing for '
      + 'this import to set. Use the “Member details” sheet of the members report.');
  }

  const at = (row: ExcelJS.Row, key: string) => {
    const c = col[key];
    return c ? cellValue(cellText(row.getCell(c))) : '';
  };

  const rows: StatusImportRow[] = [];
  for (let r = headerRow + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const name = at(row, 'Member');
    const activeFrom = at(row, 'Active from');
    const inactiveFrom = at(row, 'Inactive from');
    const status = at(row, 'Status');
    // A blank row is not a member. The export writes none, but a person who
    // deleted the rows they did not want leaves plenty.
    if (!name && !activeFrom && !inactiveFrom && !status) continue;
    rows.push({ row: r, name, activeFrom, inactiveFrom, status });
  }

  if (rows.length === 0) {
    throw new MemberImportError('That file has a header and no rows under it. Nothing to import.');
  }
  if (rows.length > MEMBER_IMPORT_MAX_ROWS) {
    throw new MemberImportError(
      `A file may carry at most ${MEMBER_IMPORT_MAX_ROWS} members; this one has ${rows.length}. `
      + 'Narrow the report by course or branch and upload it in two parts.');
  }
  return rows;
}

/** Does this sheet carry a name column anywhere in its first 20 rows? */
function sheetHasNameColumn(s: ExcelJS.Worksheet): boolean {
  for (let r = 1; r <= Math.min(s.rowCount, 20); r++) {
    let hit = false;
    s.getRow(r).eachCell(cell => {
      if (canonicalStatusColumn(cellText(cell)) === STATUS_IMPORT_REQUIRED) hit = true;
    });
    if (hit) return true;
  }
  return false;
}
