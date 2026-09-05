import test from 'node:test';
import assert from 'node:assert/strict';
import type * as ExcelJS from 'exceljs';
import {
  buildMemberTemplate, parseMemberXlsx, buildErrorReport, templateFileName, excel,
  SHEET_DATA, SHEET_INSTRUCTIONS, SHEET_COURSES, SAMPLE_ROWS,
} from './memberXlsx';
import { validateMemberRows, MEMBER_IMPORT_COLUMNS, MEMBER_IMPORT_MAX_ROWS, MemberImportError } from './memberImport';

const offerings = [{ course: 'Yoga Flow', branch: 'Velachery' }, { course: 'Prenatal Flow', branch: 'Anna Nagar' }];
const opts = { academy: 'RosiFit Academy', offerings, openedFrom: { course: 'Yoga Flow', branch: 'Velachery' } };

/** A workbook with the data sheet filled from the given rows, as a person would. */
async function workbookWith(rows: string[][], sheet = SHEET_DATA): Promise<ArrayBuffer> {
  const wb = new (await excel()).Workbook();
  const ws = wb.addWorksheet(sheet);
  ws.addRow([...MEMBER_IMPORT_COLUMNS]);
  for (const r of rows) ws.addRow(r);
  return (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
}

// ------------------------------------------------------------- template

test('the template has the reference’s three sheets, the lookup hidden', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  assert.ok(wb.getWorksheet(SHEET_INSTRUCTIONS), 'instructions sheet');
  assert.ok(wb.getWorksheet(SHEET_DATA), 'data sheet');
  const lookup = wb.getWorksheet(SHEET_COURSES);
  assert.ok(lookup, 'lookup sheet');
  assert.equal(lookup!.state, 'veryHidden', 'a sheet the person can see is a sheet they will type into');
});

test('the data sheet carries every column, in order, and dropdowns fed from the lookup', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const data = wb.getWorksheet(SHEET_DATA)!;
  const header = MEMBER_IMPORT_COLUMNS.map((_, i) => String(data.getRow(1).getCell(i + 1).value));
  assert.deepEqual(header, [...MEMBER_IMPORT_COLUMNS]);
  // the same untyped runtime collection memberXlsx.ts writes through
  const rules = (data as unknown as { dataValidations: { model: Record<string, ExcelJS.DataValidation> } })
    .dataValidations.model;
  const ranges = Object.keys(rules);
  assert.ok(ranges.some(r => r.startsWith('C2')), 'Course has a rule');
  assert.ok(ranges.some(r => r.startsWith('D2')), 'Branch has a rule');
  assert.ok(ranges.some(r => r.startsWith('F2')), 'Joined On has a rule');
  const courseRule = rules[ranges.find(r => r.startsWith('C2'))!];
  assert.equal(courseRule.type, 'list');
  assert.match(String(courseRule.formulae[0]), new RegExp(SHEET_COURSES));
});

test('the Course dropdown STOPS a typed-in course, it does not merely warn', async () => {
  // Excel's default for a list rule is an "information" prompt with a
  // Continue button, so a hand-typed course would land in the cell and the
  // file would only fail once it reached RosiFit. errorStyle 'stop' is what
  // makes the dropdown the only way in -- an academy cannot invent a course
  // by typing it here.
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const data = wb.getWorksheet(SHEET_DATA)!;
  const rules = (data as unknown as { dataValidations: { model: Record<string, ExcelJS.DataValidation> } })
    .dataValidations.model;
  const course = rules[Object.keys(rules).find(r => r.startsWith('C2'))!];
  const branch = rules[Object.keys(rules).find(r => r.startsWith('D2'))!];
  assert.equal(course.errorStyle, 'stop', 'Course refuses anything off the list');
  assert.equal(branch.errorStyle, 'stop', 'Branch too');
  assert.match(String(course.error), /add the course in RosiFit first/,
    'and says where a new course actually comes from');
});

test('the dropdown lists every course the academy runs, once each', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const lookup = wb.getWorksheet(SHEET_COURSES)!;
  const listed: string[] = [];
  lookup.eachRow((r, i) => { if (i > 1 && r.getCell(1).value) listed.push(String(r.getCell(1).value)); });
  assert.deepEqual(listed.sort(), ['Prenatal Flow', 'Yoga Flow']);
});

test('a file may carry rows for DIFFERENT courses — the course is per row', async () => {
  // The screen asks for no course at all now; one spreadsheet covers every
  // course the academy runs, and each row joins the one it names.
  const bytes = await workbookWith([
    ['Anitha Rajesh', '', 'Yoga Flow', 'Velachery', '', ''],
    ['Divya Balakrishnan', '', 'Prenatal Flow', 'Anna Nagar', '', ''],
  ]);
  const rows = await parseMemberXlsx(bytes);
  const v = validateMemberRows(rows, {
    existingNames: new Set(), existingAliases: new Set(), existingEmails: new Set(),
    offerings, defaultCourse: '', defaultBranch: '', today: '2026-09-04',
  });
  assert.deepEqual(v.map(x => x.state), ['ready', 'ready'], 'no course chosen up front, both rows fine');
  assert.deepEqual(v.map(x => x.row.course), ['Yoga Flow', 'Prenatal Flow']);
});

test('the sample rows live on the INSTRUCTIONS sheet, not the data sheet', async () => {
  // A template whose data sheet already holds two people imports two
  // strangers the first time somebody uploads it unedited.
  const bytes = await buildMemberTemplate(opts);
  await assert.rejects(() => parseMemberXlsx(bytes), MemberImportError);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const info = wb.getWorksheet(SHEET_INSTRUCTIONS)!;
  let found = 0;
  info.eachRow(r => { if (String(r.getCell(1).value) === SAMPLE_ROWS[0][0]) found++; });
  assert.equal(found, 1);
});

test('the sample rows are a shape the importer ACCEPTS', async () => {
  // A template whose own examples the importer would refuse teaches a shape
  // the app rejects.
  const bytes = await workbookWith(SAMPLE_ROWS);
  const rows = await parseMemberXlsx(bytes);
  const v = validateMemberRows(rows, {
    existingNames: new Set(), existingAliases: new Set(), existingEmails: new Set(),
    offerings, defaultCourse: 'Yoga Flow', defaultBranch: 'Velachery', today: '2026-09-04',
  });
  assert.deepEqual(v.map(x => x.state), ['ready', 'ready']);
});

test('the file name is branded, and safe for a file system', () => {
  assert.equal(templateFileName('RosiFit Academy'), 'rosifit-academy-members-template.xlsx');
  assert.equal(templateFileName('  '), 'rosifit-members-template.xlsx');
});

// ---------------------------------------------------------------- parse

test('a filled data sheet parses into rows with their SPREADSHEET row numbers', async () => {
  const bytes = await workbookWith([
    ['Anitha Rajesh', 'anitha@example.com', '', '', 'Anitha R;Anitha', '2026-08-01'],
    ['', '', '', '', '', ''],                                   // a blank line
    ['Divya B', '', 'Prenatal Flow', 'Anna Nagar', '', ''],
  ]);
  const rows = await parseMemberXlsx(bytes);
  assert.equal(rows.length, 2, 'the blank line is not a member');
  assert.deepEqual(rows.map(r => r.row), [2, 4], 'row numbers are the sheet’s, so a refusal can be found');
  assert.deepEqual(rows[0].aliases, ['Anitha R', 'Anitha']);
  assert.equal(rows[0].email, 'anitha@example.com');
  assert.equal(rows[1].course, 'Prenatal Flow');
});

test('a real date cell comes back as YYYY-MM-DD', async () => {
  const wb = new (await excel()).Workbook();
  const ws = wb.addWorksheet(SHEET_DATA);
  ws.addRow([...MEMBER_IMPORT_COLUMNS]);
  ws.addRow(['Anitha', '', '', '', '', new Date(Date.UTC(2026, 7, 1))]);
  const rows = await parseMemberXlsx((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
  assert.equal(rows[0].joined_on, '2026-08-01');
});

test('a renamed data tab still parses — the header names the sheet, not the tab', async () => {
  const bytes = await workbookWith([['Anitha', '', '', '', '', '']], 'Sheet1');
  const rows = await parseMemberXlsx(bytes);
  assert.equal(rows[0].full_name, 'Anitha');
});

test('columns may be in any order — the header names them, not their position', async () => {
  const wb = new (await excel()).Workbook();
  const ws = wb.addWorksheet(SHEET_DATA);
  ws.addRow(['Email', 'Full Name']);
  ws.addRow(['a@b.com', 'Anitha Rajesh']);
  const rows = await parseMemberXlsx((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
  assert.equal(rows[0].full_name, 'Anitha Rajesh');
  assert.equal(rows[0].email, 'a@b.com');
});

test('a workbook with no Full Name column is refused, not half-read', async () => {
  const wb = new (await excel()).Workbook();
  wb.addWorksheet('Sheet1').addRow(['Name', 'Phone']);
  const bytes = (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
  await assert.rejects(() => parseMemberXlsx(bytes), MemberImportError);
});

test('a header with nothing under it is refused', async () => {
  const bytes = await workbookWith([]);
  await assert.rejects(() => parseMemberXlsx(bytes), MemberImportError);
});

test('bytes that are not a workbook are refused with the template offered', async () => {
  await assert.rejects(() => parseMemberXlsx(new TextEncoder().encode('Full Name,Email').buffer as ArrayBuffer),
    (e: unknown) => e instanceof MemberImportError && /\.xlsx/.test(e.message));
});

test('more than the ceiling is refused, and says to split the file', async () => {
  const many = Array.from({ length: MEMBER_IMPORT_MAX_ROWS + 1 }, (_, i) => [`Member ${i}`, '', '', '', '', '']);
  const bytes = await workbookWith(many);
  await assert.rejects(() => parseMemberXlsx(bytes),
    (e: unknown) => e instanceof MemberImportError && /Split it/.test(e.message));
});

// --------------------------------------------------------- error report

test('the error report carries Row, Status, Reason, then every column as it was', async () => {
  const bytes = await buildErrorReport([{
    row: { row: 7, full_name: 'Divya Ramesh', email: 'd@x.com', course: 'Yoga Flow', branch: 'Velachery',
           aliases: ['Divya', 'Divya R'], joined_on: '2026-08-01' },
    status: 'skipped', reason: 'already on the register',
  }]);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const ws = wb.worksheets[0];
  const header = Array.from({ length: 9 }, (_, i) => String(ws.getRow(1).getCell(i + 1).value));
  assert.deepEqual(header, ['Row', 'Status', 'Reason', ...MEMBER_IMPORT_COLUMNS]);
  const line = Array.from({ length: 9 }, (_, i) => ws.getRow(2).getCell(i + 1).value);
  assert.equal(line[0], 7);
  assert.equal(line[1], 'skipped');
  assert.equal(line[7], 'Divya;Divya R', 'display names rejoin with ; so the row re-imports as it was');
});
