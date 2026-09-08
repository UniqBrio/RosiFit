/**
 * The exported report FILE — an .xlsx workbook.
 *
 * WHY IT IS NOT A CSV ANY MORE
 * The requester asked the export to carry a second sheet of member details and
 * a third of course details
 * (requests/2026-09-08-reports-details-two-sheets-and-dash-course.md, part 4).
 * A CSV is one sheet by definition, so the file had to become a workbook. The
 * full-width button has said **Export as Excel** all along; it now saves one.
 *
 * WHY exceljs, AND WHY HERE
 * It is already a dependency — pinned `exceljs` 4.4.0, verified before it was
 * installed, and already building three-sheet workbooks in memberXlsx.ts. The
 * lazy `excel()` loader is imported from there rather than written again: it
 * carries the reason the browser build is named by path (Metro resolves
 * `main` to the Node half, which cannot bundle), and two copies of that would
 * be two places to get it wrong.
 *
 * No `document` in this module, for the same reason memberXlsx.ts has none:
 * the bytes are testable under node, and saving them is csv.ts' `downloadBlob`,
 * where the browser halves already live.
 */
import { excel } from './memberXlsx';
import type { Sheet } from './reportSheets';

/** Wide enough to read without unwrapping, capped so one long sentence — the
 *  follow-up trigger — does not push the figures off the screen. Measured off
 *  the header and the first rows, not typed per column, so a sheet that gains
 *  a column does not need this touched. */
const WIDTH_MIN = 10;
const WIDTH_MAX = 46;
function widths(sheet: Sheet): number[] {
  return sheet.header.map((h, i) => {
    const longest = Math.max(h.length, ...sheet.rows.map(r => (r[i] ?? '').length));
    return Math.min(WIDTH_MAX, Math.max(WIDTH_MIN, longest + 2));
  });
}

/**
 * The workbook, as bytes.
 *
 * Every cell is written as the STRING the sheet builder produced. That is
 * deliberate: "no sessions scheduled" is a percentage cell on some rows, a
 * member code can carry leading zeroes, and a joining date that Excel decides
 * is a number becomes a serial nobody can read. The screen states all of these
 * as words too, so the file and the screen say the same thing.
 */
export async function buildReportWorkbook(sheets: Sheet[]): Promise<ArrayBuffer> {
  const wb = new (await excel()).Workbook();
  wb.creator = 'RosiFit';
  wb.created = new Date();

  for (const sheet of sheets) {
    const ws = wb.addWorksheet(sheet.name);
    ws.columns = widths(sheet).map(width => ({ width }));
    ws.addRow(sheet.header).font = { bold: true };
    // The header stays put while somebody scrolls a roster of 200 members;
    // a details sheet whose column names have scrolled away is a grid of
    // unlabelled text.
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    for (const row of sheet.rows) ws.addRow(row);
  }

  const out = await wb.xlsx.writeBuffer();
  return out as unknown as ArrayBuffer;
}
