import test from 'node:test';
import assert from 'node:assert/strict';
import type * as ExcelJS from 'exceljs';
import {
  buildMemberTemplate, parseMemberXlsx, buildErrorReport, templateFileName, excel,
templateColumns, SHEET_DATA, SHEET_INSTRUCTIONS, SHEET_COURSES, SAMPLE_ROWS,
} from './memberXlsx';
import {
  validateMemberRows, MEMBER_IMPORT_COLUMNS, MEMBER_IMPORT_HEADERS,
  MEMBER_IMPORT_MAX_ROWS, MemberImportError, NAME_MIN, NAME_MAX, EMAIL_MAX,
} from './memberImport';

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
  assert.deepEqual(header, MEMBER_IMPORT_COLUMNS.map(c => MEMBER_IMPORT_HEADERS[c]),
    'the header CELL, which carries the shape in brackets where there is one');
  // the same untyped runtime collection memberXlsx.ts writes through
  const rules = (data as unknown as { dataValidations: { model: Record<string, ExcelJS.DataValidation> } })
    .dataValidations.model;
  const ranges = Object.keys(rules);
  assert.ok(ranges.some(r => r.startsWith('C2')), 'Course has a rule');
  assert.ok(ranges.some(r => r.startsWith('D2')), 'Branch has a rule');
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
  // Both rows carry an address because every row must: the subject here is
  // the COURSE being per row, and a blank Email would block them both before
  // the course was ever looked at.
  const bytes = await workbookWith([
    ['Anitha Rajesh', 'anitha@example.com', 'Yoga Flow', 'Velachery', ''],
    ['Divya Balakrishnan', 'divya@example.com', 'Prenatal Flow', 'Anna Nagar', ''],
  ]);
  const rows = await parseMemberXlsx(bytes);
  const v = validateMemberRows(rows, {
    existingNames: new Set(), existingAliases: new Set(), existingEmails: new Set(),
    offerings, defaultCourse: '', defaultBranch: '',
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
    offerings, defaultCourse: 'Yoga Flow', defaultBranch: 'Velachery',
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
    ['Anitha Rajesh', 'anitha@example.com', '', '', 'Anitha R, Anitha'],
    ['', '', '', '', ''],                                       // a blank line
    ['Divya B', '', 'Prenatal Flow', 'Anna Nagar', ''],
  ]);
  const rows = await parseMemberXlsx(bytes);
  assert.equal(rows.length, 2, 'the blank line is not a member');
  assert.deepEqual(rows.map(r => r.row), [2, 4], 'row numbers are the sheet’s, so a refusal can be found');
  assert.deepEqual(rows[0].aliases, ['Anitha R', 'Anitha']);
  assert.equal(rows[0].email, 'anitha@example.com');
  assert.equal(rows[1].course, 'Prenatal Flow');
});

/**
 * WAS: 'a real date cell comes back as YYYY-MM-DD'. There is no date column
 * left to read -- the template does not offer Joined On and the parser does
 * not look for it, so a member imported from a file joins the day it is
 * imported. What matters now is what happens to a file built from the EARLIER
 * template, which still carries the column.
 */
test('a Joined On column on an OLD file is ignored, not half-read', async () => {
  const wb = new (await excel()).Workbook();
  const ws = wb.addWorksheet(SHEET_DATA);
  ws.addRow([...MEMBER_IMPORT_COLUMNS, 'Joined On']);
  ws.addRow(['Anitha', '', '', '', '', new Date(Date.UTC(2026, 7, 1))]);
  const rows = await parseMemberXlsx((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].full_name, 'Anitha');
  assert.ok(!('joined_on' in rows[0]), 'the date is carried nowhere');
});

test('a row holding NOTHING but an old Joined On date is a blank row', async () => {
  const wb = new (await excel()).Workbook();
  const ws = wb.addWorksheet(SHEET_DATA);
  ws.addRow([...MEMBER_IMPORT_COLUMNS, 'Joined On']);
  ws.addRow(['Anitha', '', '', '', '', '']);
  ws.addRow(['', '', '', '', '', '2026-08-01']);
  const rows = await parseMemberXlsx((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
  assert.equal(rows.length, 1, 'a date with no name is not a member');
});

test('a renamed data tab still parses — the header names the sheet, not the tab', async () => {
  const bytes = await workbookWith([['Anitha', '', '', '', '']], 'Sheet1');
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
  const many = Array.from({ length: MEMBER_IMPORT_MAX_ROWS + 1 }, (_, i) => [`Member ${i}`, '', '', '', '']);
  const bytes = await workbookWith(many);
  await assert.rejects(() => parseMemberXlsx(bytes),
    (e: unknown) => e instanceof MemberImportError && /Split it/.test(e.message));
});

// --------------------------------------------------------- error report

test('the error report carries Row, Status, Reason, then every column as it was', async () => {
  const bytes = await buildErrorReport([{
    row: { row: 7, full_name: 'Divya Ramesh', email: 'd@x.com', course: 'Yoga Flow', branch: 'Velachery',
           aliases: ['Divya', 'Divya R'] },
    status: 'skipped', reason: 'already on the register',
  }]);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const ws = wb.worksheets[0];
  const width = 3 + MEMBER_IMPORT_COLUMNS.length;
  const header = Array.from({ length: width }, (_, i) => String(ws.getRow(1).getCell(i + 1).value));
  assert.deepEqual(header,
    ['Row', 'Status', 'Reason', ...MEMBER_IMPORT_COLUMNS.map(c => MEMBER_IMPORT_HEADERS[c])],
    'the report carries the template’s own headers, so the fixed file reads back');
  const line = Array.from({ length: width }, (_, i) => ws.getRow(2).getCell(i + 1).value);
  assert.equal(line[0], 7);
  assert.equal(line[1], 'skipped');
  assert.equal(line[7], 'Divya, Divya R', 'display names rejoin with commas, as the header asks');
});

// ------------------------------------------- the conditional Branch column

const oneBranch = [{ course: 'Yoga Flow', branch: 'Velachery' },
                   { course: 'Prenatal Flow', branch: 'Velachery' }];

test('an academy with ONE branch gets no Branch column — a dropdown of one is not a question', () => {
  assert.deepEqual(templateColumns(oneBranch),
    ['Full Name', 'Email', 'Course', 'Display Names']);
});

test('an academy with two branches gets the column, because there is a choice to make', () => {
  assert.deepEqual(templateColumns(offerings),
    ['Full Name', 'Email', 'Course', 'Branch', 'Display Names']);
});

test('the single-branch template really omits it, header and rule alike', async () => {
  const bytes = await buildMemberTemplate({ academy: 'RosiFit Academy', offerings: oneBranch });
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const data = wb.getWorksheet(SHEET_DATA)!;
  const header = [1, 2, 3, 4, 5].map(i => String(data.getRow(1).getCell(i).value ?? ''));
  assert.deepEqual(header, ['Full Name', 'Email', 'Course', 'Display Names (separate with commas)', '']);
  const rules = (data as unknown as { dataValidations: { model: Record<string, ExcelJS.DataValidation> } })
    .dataValidations.model;
  // Course has moved to C and Display Names to D; nothing at E at all.
  assert.ok(!Object.keys(rules).some(r => r.startsWith('E2')), 'no rule past the last column');
});

test('a file with no Branch column still imports — the branch comes from the course', async () => {
  // The column being absent is not the row being wrong: one branch means
  // there is only ever one answer, and validateMemberRows already resolves it.
  const wb = new (await excel()).Workbook();
  const ws = wb.addWorksheet(SHEET_DATA);
  ws.addRow(['Full Name', 'Email', 'Course', 'Display Names (separate with commas)']);
  ws.addRow(['Anitha Rajesh', 'anitha@example.com', 'Prenatal Flow', 'Anitha R, Anitha']);
  const rows = await parseMemberXlsx((await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer);
  assert.equal(rows[0].branch, '');
  assert.deepEqual(rows[0].aliases, ['Anitha R', 'Anitha']);
  const v = validateMemberRows(rows, {
    existingNames: new Set(), existingAliases: new Set(), existingEmails: new Set(),
    offerings, defaultCourse: '', defaultBranch: '',
  });
  assert.equal(v[0].state, 'ready');
  assert.equal(v[0].row.branch, 'Anna Nagar', 'the one branch that course runs at');
});

// --------------------------------------------- a rule on EVERY column

test('every column on the data sheet carries a rule that STOPS', async () => {
  // Course and Branch were the only two, so a one-character name or
  // "not-an-address" landed in the cell and the file only failed once it
  // reached RosiFit — one round trip per mistake, times 500 rows.
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const data = wb.getWorksheet(SHEET_DATA)!;
  const rules = (data as unknown as { dataValidations: { model: Record<string, ExcelJS.DataValidation> } })
    .dataValidations.model;
  const cols = templateColumns(offerings);
  for (let i = 0; i < cols.length; i++) {
    const letter = String.fromCharCode(65 + i);
    const key = Object.keys(rules).find(r => r.startsWith(`${letter}2`));
    assert.ok(key, `${cols[i]} has a rule`);
    assert.equal(rules[key!].errorStyle, 'stop', `${cols[i]} refuses, it does not merely warn`);
    assert.equal(rules[key!].allowBlank, true, `${cols[i]} still allows the 500 empty rows`);
  }
});

test('the Full Name rule is the database’s own bound, and the Email rule checks the shape', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const rules = (wb.getWorksheet(SHEET_DATA)! as unknown as
    { dataValidations: { model: Record<string, ExcelJS.DataValidation> } }).dataValidations.model;
  const name = rules[Object.keys(rules).find(r => r.startsWith('A2'))!];
  assert.equal(name.type, 'textLength');
  assert.deepEqual(name.formulae, [NAME_MIN, NAME_MAX]);
  const email = rules[Object.keys(rules).find(r => r.startsWith('B2'))!];
  assert.equal(email.type, 'custom');
  assert.match(String(email.formulae[0]), /FIND\("@"/, 'an @');
  assert.match(String(email.formulae[0]), new RegExp(String(EMAIL_MAX)), 'and the RFC ceiling');
});

// ------------------------------------------------- the comma-separated header

test('the data sheet’s Display Names header says commas, and a file using them parses', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const data = wb.getWorksheet(SHEET_DATA)!;
  const header = String(data.getRow(1).getCell(5).value);
  assert.equal(header, 'Display Names (separate with commas)');

  const filled = new (await excel()).Workbook();
  const ws = filled.addWorksheet(SHEET_DATA);
  ws.addRow(MEMBER_IMPORT_COLUMNS.map(c => MEMBER_IMPORT_HEADERS[c]));
  ws.addRow(['Anitha Rajesh', '', '', '', 'Anitha R, Anitha']);
  const rows = await parseMemberXlsx((await filled.xlsx.writeBuffer()) as unknown as ArrayBuffer);
  assert.deepEqual(rows[0].aliases, ['Anitha R', 'Anitha'],
    'the bracketed header is still the Display Names column');
});

test('the template’s own sample rows use commas, and the importer accepts them', async () => {
  assert.ok(SAMPLE_ROWS.some(r => r.some(c => c.includes(', '))), 'a sample shows the separator');
  assert.ok(!SAMPLE_ROWS.some(r => r.some(c => c.includes(';'))), 'and none shows the old one');
  const rows = await parseMemberXlsx(await workbookWith(SAMPLE_ROWS));
  assert.deepEqual(rows[0].aliases, ['Anitha R', 'Anitha']);
});

test('no sheet in the template asks for a joining date', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const data = wb.getWorksheet(SHEET_DATA)!;
  const header: string[] = [];
  data.getRow(1).eachCell(c => header.push(String(c.value ?? '')));
  assert.ok(!header.some(h => /joined/i.test(h)), 'no Joined On column');
  // The instructions say so out loud rather than leaving it unexplained.
  const info = wb.getWorksheet(SHEET_INSTRUCTIONS)!;
  let said = false;
  info.eachRow(r => { if (/joins today/i.test(String(r.getCell(2).value ?? ''))) said = true; });
  assert.ok(said, 'and the instructions say every member joins today');
});

// ------------------------------------------------- the address is required

test('the template says an address is required, in the cell and in the instructions', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const rules = (wb.getWorksheet(SHEET_DATA)! as unknown as
    { dataValidations: { model: Record<string, ExcelJS.DataValidation> } }).dataValidations.model;
  const email = rules[Object.keys(rules).find(r => r.startsWith('B2'))!];
  assert.match(String(email.prompt), /required/i, 'the prompt on the cell says so');
  assert.ok(!/blank/i.test(String(email.error)), 'and the refusal no longer offers blank as an option');

  const info = wb.getWorksheet(SHEET_INSTRUCTIONS)!;
  let said = false;
  info.eachRow(r => { if (/"Email" are both required/.test(String(r.getCell(2).value ?? ''))) said = true; });
  assert.ok(said, 'the instructions name both required columns');
});

test('every sample row carries an address — the template cannot teach a row it refuses', async () => {
  for (const r of SAMPLE_ROWS) {
    assert.match(r[MEMBER_IMPORT_COLUMNS.indexOf('Email')], /@/, `${r[0]} has an address`);
  }
  const rows = await parseMemberXlsx(await workbookWith(SAMPLE_ROWS));
  const v = validateMemberRows(rows, {
    existingNames: new Set(), existingAliases: new Set(), existingEmails: new Set(),
    offerings, defaultCourse: 'Yoga Flow', defaultBranch: 'Velachery',
  });
  assert.deepEqual(v.map(x => x.state), ['ready', 'ready']);
});

// ------------------------------------------- the retired column is retired

/**
 * The Joined On column was retired, but the instructions sheet kept an entry
 * for it in the "Columns" list -- row 15 of Sheet 1 for a one-branch academy,
 * sitting between Display Names and the samples as though it were a column
 * the file still has. It reads as a column because the list it is in is
 * titled "Columns"; the fact it carried belongs where the import screen puts
 * it, in the prose above, not in a list of cells to fill in.
 *
 * Both halves are asserted, because either alone regresses the other: no cell
 * anywhere in the workbook names the retired column, AND the fact it used to
 * carry is still stated.
 */
test('the retired Joined On column is named nowhere in the template', async () => {
  for (const openedFrom of [{ course: 'Yoga Flow', branch: 'Velachery' }, null]) {
    for (const offer of [offerings, [{ course: 'Yoga Flow', branch: 'Velachery' }]]) {
      const bytes = await buildMemberTemplate({ academy: 'RosiFit Academy', offerings: offer, openedFrom });
      const wb = new (await excel()).Workbook();
      await wb.xlsx.load(bytes);
      const where = `${offer.length} offering(s), ${openedFrom ? 'opened from a course' : 'no course'}`;
      wb.eachSheet(ws => {
        ws.eachRow(row => {
          row.eachCell(cell => {
            assert.ok(!/joined\s*on/i.test(String(cell.value ?? '')),
              `${ws.name} row ${row.number} still names Joined On (${where})`);
          });
        });
      });
    }
  }
});

test('the Columns list on the instructions sheet is exactly the columns the file has', async () => {
  for (const offer of [offerings, [{ course: 'Yoga Flow', branch: 'Velachery' }]]) {
    const bytes = await buildMemberTemplate({ academy: 'RosiFit Academy', offerings: offer, openedFrom: null });
    const wb = new (await excel()).Workbook();
    await wb.xlsx.load(bytes);
    const info = wb.getWorksheet(SHEET_INSTRUCTIONS)!;

    // the rows between the "Columns" heading and the blank row after it
    let heading = 0;
    info.eachRow((r, n) => { if (!heading && String(r.getCell(1).value ?? '') === 'Columns') heading = n; });
    assert.ok(heading, 'the instructions sheet has a Columns heading');
    const listed: string[] = [];
    for (let n = heading + 1; n <= info.rowCount; n++) {
      const name = String(info.getRow(n).getCell(1).value ?? '').trim();
      if (!name) break;
      listed.push(name);
    }
    assert.deepEqual(listed, [...templateColumns(offer)],
      'every row under "Columns" is a column of this file, and every column is there');
  }
});

test('the instructions still say a member joins today, as prose and not as a column', async () => {
  const bytes = await buildMemberTemplate(opts);
  const wb = new (await excel()).Workbook();
  await wb.xlsx.load(bytes);
  const info = wb.getWorksheet(SHEET_INSTRUCTIONS)!;
  let said = 0;
  info.eachRow(r => {
    if (/joins today/i.test(String(r.getCell(2).value ?? ''))) {
      said++;
      assert.equal(String(r.getCell(1).value ?? ''), '',
        'the joining-date line is prose in the how-to block, so its first cell is empty');
    }
  });
  assert.equal(said, 1, 'stated once');
});
