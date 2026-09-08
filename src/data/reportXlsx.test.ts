/**
 * The exported report, built and read back.
 *
 * Run: npx tsx --test src/data/reportXlsx.test.ts
 *
 * The round trip is the point, the same way it is in memberXlsx.test.ts: the
 * previous export was a CSV, and "it produced some bytes" is exactly what a
 * broken workbook also does. A file that Excel opens as a single unreadable
 * sheet is the failure this guards, and it cannot be seen from the calling
 * code — only from the file.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { excel } from './memberXlsx';
import { buildReportWorkbook } from './reportXlsx';
import { reportSheets } from './reportSheets';
import { reportRows, type CourseFacts } from './report';
import { GLOBAL_RULE, type Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null, status: 'active',
  expected: 6, attended: 6, missed: 0, streak: 0, last: '—',
  joinedOn: '2026-03-01', joined: 'Mar 2026', ...over,
});

const COURSES: (CourseFacts & { id: string })[] = [
  { id: 'c1', name: 'Prenatal Flow', start_time: '06:00', end_time: '07:00',
    offerings: [{ branch: 'Coimbatore', weekdays: [1, 3, 5] }] },
];

const SET = [
  member({ id: '1', name: 'Divya', expected: 4, attended: 3 }),
  member({ id: '2', name: 'Nithya', course: '—', course_id: null, branch: '—' }),
];

const sheetsFor = (scope: 'Members' | 'Courses') => reportSheets({
  scope, rows: reportRows(SET, scope), members: SET, courses: COURSES,
  rules: { global: GLOBAL_RULE, byCourseName: {} },
  periodLabel: '7-13 Sep 2026', todayIso: '2026-09-08',
});

async function readBack(bytes: ArrayBuffer) {
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  return wb;
}

test('the course export is a real workbook of two named sheets', async () => {
  const wb = await readBack(await buildReportWorkbook(sheetsFor('Courses')));
  assert.deepEqual(wb.worksheets.map(w => w.name), ['Attendance', 'Course details']);
});

test('the member export is a real workbook of two', async () => {
  const wb = await readBack(await buildReportWorkbook(sheetsFor('Members')));
  assert.deepEqual(wb.worksheets.map(w => w.name), ['Attendance', 'Member details']);
});

test('every cell reads back as the text that was written', async () => {
  // Strings, deliberately: "no sessions scheduled" lands in a percentage
  // column, a member code can carry leading zeroes, and a date Excel decides
  // is a number becomes a serial nobody can read.
  const sheets = sheetsFor('Courses');
  const wb = await readBack(await buildReportWorkbook(sheets));
  for (const sheet of sheets) {
    const ws = wb.getWorksheet(sheet.name)!;
    /** Column 1 upward, as text — an empty cell holds no value and reads ''. */
    const line = (n: number) => sheet.header.map((_, c) =>
      String(ws.getRow(n).getCell(c + 1).value ?? ''));
    assert.deepEqual(line(1), sheet.header, `${sheet.name} header`);
    sheet.rows.forEach((row, i) => {
      assert.deepEqual(line(i + 2), row, `${sheet.name} row ${i + 1}`);
    });
    assert.equal(ws.rowCount, sheet.rows.length + 1, `${sheet.name} row count`);
  }
});

test('the course sheet the file carries names no course called "—"', async () => {
  // The defect, checked in the artefact rather than in the function: this is
  // the file the requester opened.
  const wb = await readBack(await buildReportWorkbook(sheetsFor('Courses')));
  const first = wb.getWorksheet('Attendance')!;
  const labels: string[] = [];
  first.eachRow((row, n) => { if (n > 1) labels.push(String(row.getCell(1).value ?? '')); });
  assert.ok(labels.length > 0);
  assert.ok(!labels.includes('—'), `first column still reads "—": ${labels.join(', ')}`);
});

test('the header row is bold and frozen on every sheet', async () => {
  const wb = await readBack(await buildReportWorkbook(sheetsFor('Courses')));
  for (const ws of wb.worksheets) {
    assert.equal(ws.getRow(1).font?.bold, true, `${ws.name} header not bold`);
    // A frozen view is a different member of exceljs' view union, and the
    // typing only narrows on `state`; the file carries the split either way.
    const view = ws.views[0] as { state?: string; ySplit?: number } | undefined;
    assert.equal(view?.state, 'frozen', `${ws.name} header not frozen`);
    assert.equal(view?.ySplit, 1, `${ws.name} header not frozen at row 1`);
  }
});
