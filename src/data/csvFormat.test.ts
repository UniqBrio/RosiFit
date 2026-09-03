/**
 * Cases for the CSV the audit log exports.
 *
 * Run: npx tsx --test src/data/csv.export.test.ts
 *
 * Every failure mode here is silent in the way that matters: the download
 * succeeds, the toast says how many rows went out, and the file opens in
 * Excel with the columns shifted by one — because a member's name contained a
 * comma. Nobody looks at an export until they need it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { toCsv } from './csvFormat';

/** the file minus the BOM, split into lines, for reading an assertion */
const lines = (csv: string) => csv.replace(/^﻿/, '').trimEnd().split('\r\n');

test('a plain row is not quoted — quoting everything makes the file unreadable by eye', () => {
  assert.deepEqual(
    lines(toCsv(['Action', 'By'], [['Holiday added', 'Rosi Owner']])),
    ['Action,By', 'Holiday added,Rosi Owner'],
  );
});

test('a value containing a comma is quoted, or every later column shifts left', () => {
  // This is the one that corrupts an export quietly: without the quotes
  // "Sundaram, Meenakshi" becomes two cells and "Modified by" reads a date.
  assert.deepEqual(
    lines(toCsv(['Subject'], [['Sundaram, Meenakshi']])),
    ['Subject', '"Sundaram, Meenakshi"'],
  );
});

test('an embedded quote is doubled, per RFC 4180 — which is what Excel reads', () => {
  assert.deepEqual(
    lines(toCsv(['Field'], [['Display names: “Shazia F”, "Shazia"']])),
    ['Field', '"Display names: “Shazia F”, ""Shazia"""'],
  );
});

test('a newline inside a value is quoted rather than ending the row', () => {
  const csv = toCsv(['Note'], [['first\nsecond']]);
  // The row survives as ONE record: the quoted newline is data, so the file
  // has a header and one record, not a header and two.
  assert.equal(csv.replace(/^﻿/, '').trimEnd(), 'Note\r\n"first\nsecond"');
});

test('a carriage return is quoted too — a lone \\r splits a row in Excel', () => {
  assert.equal(toCsv(['Note'], [['a\rb']]).includes('"a\rb"'), true);
});

test('the file starts with a UTF-8 BOM, or Excel opens Tamil as mojibake', () => {
  assert.equal(toCsv(['பெயர்'], [['தமிழ்']]).startsWith('﻿'), true);
});

test('rows are CRLF-separated and the file ends with one', () => {
  const csv = toCsv(['A'], [['1'], ['2']]);
  assert.equal(csv, '﻿A\r\n1\r\n2\r\n');
});

test('a header with no rows is still a valid file, not an empty one', () => {
  // An audit log with nothing in it should export its columns: a zero-byte
  // file reads as a failed export rather than as an empty log.
  assert.deepEqual(lines(toCsv(['Action', 'By'], [])), ['Action,By']);
});

test('an empty cell stays empty rather than becoming a quoted blank', () => {
  assert.deepEqual(lines(toCsv(['A', 'B'], [['', 'x']])), ['A,B', ',x']);
});
