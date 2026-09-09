import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { importKindOf, TEMPLATE_SHEET, type SheetShape } from './importKind';

/**
 * "this in imported using bulk import button itself where on click you can
 *  import excel file but it should not break the existing bulk import members
 *  feature where multible members are uploaded as new members"
 *  -- the requester, 09-Sep-2026, withdrawing the second button.
 *
 * One button now takes two unrelated files, so something has to decide which
 * importer a workbook is for. That decision is the only new risk the merge
 * introduces, and every assertion here is about the SAME failure: a file that
 * used to create members stops creating them.
 *
 * The rule the module is built on and this spec pins: the CREATE PATH IS THE
 * DEFAULT. 'dates' is returned only when the report's own marks are visible;
 * everything unrecognisable, empty or ambiguous falls to 'members', where it
 * meets the refusal it has always met.
 */

const sheet = (name: string, ...headers: string[]): SheetShape => ({ name, headers });

/** the template, as buildMemberTemplate writes it */
const TEMPLATE: SheetShape[] = [
  sheet('Instructions & Sample', 'Fill in the Member Data sheet'),
  sheet('Member Data', 'Full Name', 'Email', 'Course', 'Branch', 'Display Names'),
  sheet('Courses', 'Course', 'Branch'),
];

/** the members report, as memberDetailSheet writes it */
const REPORT: SheetShape[] = [
  sheet('Attendance', 'Member', 'Date', 'Status'),
  sheet('Member details', 'Member', 'Member code', 'Status', 'Inactive from',
        'Course', 'Branch', 'Active from', 'Days they attend'),
];

/* ------------------------------------------------- the two files it takes */

test('the member template is the create path', () => {
  assert.equal(importKindOf(TEMPLATE), 'members');
});

test('the members report is the dates path', () => {
  assert.equal(importKindOf(REPORT), 'dates');
});

/* ----------------------------------- the create path is never lost (the ask) */

test('an empty workbook falls to the create path, not to dates', () => {
  assert.equal(importKindOf([]), 'members');
});

test('a workbook of nothing recognisable falls to the create path', () => {
  assert.equal(importKindOf([sheet('Sheet1', 'a', 'b', 'c')]), 'members');
});

test('a template whose tab was renamed is still the create path', () => {
  assert.equal(importKindOf([sheet('my members', 'Full Name', 'Email', 'Course')]), 'members');
});

test('a template carrying a stray report tab still creates — the create path wins outright', () => {
  assert.equal(importKindOf([...TEMPLATE, ...REPORT]), 'members',
    'a workbook with BOTH shapes must create, never silently switch to moving dates');
});

test('the header hint in brackets does not hide the column', () => {
  assert.equal(
    importKindOf([sheet('Sheet1', 'Full Name (required)', 'Display Names (separate with commas)')]),
    'members');
});

test('a sheet named Member details with no date column is not the dates file', () => {
  // the report's Attendance sheet names members too, and carries nothing to set
  assert.equal(importKindOf([sheet('Member details', 'Member', 'Course', 'Branch')]), 'members');
});

/* -------------------------------------------- the report, read generously */

test('a report cut down to the one sheet somebody was working on still reads as dates', () => {
  assert.equal(importKindOf([sheet('Member details', 'Member', 'Active from', 'Inactive from')]), 'dates');
});

test('a report whose tab was renamed is found by its columns', () => {
  assert.equal(importKindOf([sheet('my export', 'Member', 'Status', 'Inactive from')]), 'dates');
});

test('an export from before the Active from rename is still the dates file', () => {
  // "Joined on" was the column's name until 0057; a report downloaded then is
  // a file somebody has already typed dates into.
  assert.equal(importKindOf([sheet('Member details', 'Member', 'Joined on')]), 'dates');
});

test('case and padding in a tab name change nothing', () => {
  assert.equal(importKindOf([sheet('  MEMBER DETAILS  ', 'Member', 'Active from')]), 'dates');
  assert.equal(importKindOf([sheet('  member data  ', 'Full Name')]), 'members');
});

/* --------------------------------------------- it agrees with the parsers */

test('the template sheet name is the one memberXlsx actually looks for', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'src/data/memberXlsx.ts'), 'utf8');
  assert.match(src, new RegExp(`SHEET_DATA = '${TEMPLATE_SHEET}'`),
    'the discriminator and the parser must name the same sheet');
});

test('there is no third answer — every input is one importer or the other', () => {
  const inputs: SheetShape[][] = [[], TEMPLATE, REPORT, [sheet('x')], [...TEMPLATE, ...REPORT]];
  for (const i of inputs) assert.ok(['members', 'dates'].includes(importKindOf(i)));
});
