import test from 'node:test';
import assert from 'node:assert/strict';
import { readDate, formatDate, toIso, DATE_FORMAT_EXAMPLE } from './memberDate';

/**
 * "we shall go with dd-mmm-yyyy format as its easier to understand month ...
 *  or if they enter date in any format convert that to dd-mmm-yyyy"
 *  -- the requester, 09-Sep-2026.
 *
 * The generosity and the refusal are one decision, and these pin both halves.
 * Every format whose meaning is not in question is converted. An all-numeric
 * date that is not ISO is refused, because 01/09/2026 is the 1st of September
 * to the academy and the 9th of January to Postgres, and this app has carried
 * a shape check since 0029 precisely because that lands silently on the column
 * deciding every session a member was expected at.
 */

const isoOf = (s: string) => {
  const r = readDate(s);
  return r && 'iso' in r ? r.iso : null;
};
const problemOf = (s: string) => {
  const r = readDate(s);
  return r && 'problem' in r ? r.problem : null;
};

/* ------------------------------------------------- what it converts */

test('the canonical format is read', () => {
  assert.equal(isoOf('10-Oct-2026'), '2026-10-10');
});

test('a single-digit day needs no padding from the person typing it', () => {
  assert.equal(isoOf('1-Oct-2026'), '2026-10-01');
});

test('spaces instead of hyphens are the same date', () => {
  assert.equal(isoOf('10 Oct 2026'), '2026-10-10');
});

test('the month spelled out in full is the same date', () => {
  assert.equal(isoOf('10 October 2026'), '2026-10-10');
});

test('the month first, as an American would write it', () => {
  assert.equal(isoOf('Oct 10, 2026'), '2026-10-10');
});

test('an ordinal day is not an obstacle', () => {
  assert.equal(isoOf('Oct 10th, 2026'), '2026-10-10');
});

test('ISO is still read — every export written before today holds it', () => {
  assert.equal(isoOf('2026-10-10'), '2026-10-10');
});

test('case is not a question', () => {
  assert.equal(isoOf('10-OCT-2026'), '2026-10-10');
  assert.equal(isoOf('10-oct-2026'), '2026-10-10');
});

/* --------------------------------------- what it refuses to guess at */

test('an ambiguous numeric date is REFUSED, not guessed', () => {
  // 1 September, or 9 January? Nobody can tell, including us.
  assert.notEqual(problemOf('01/09/2026'), null);
});

test('and the refusal says how to fix it in four keystrokes', () => {
  assert.match(problemOf('01/09/2026') ?? '', /write the month as a name/);
  assert.match(problemOf('01/09/2026') ?? '', new RegExp(DATE_FORMAT_EXAMPLE));
});

test('a numeric date is refused even when both readings agree', () => {
  // 10/10/2026 means the same day either way, but accepting it teaches the
  // academy that numeric dates work -- and the next one will not be 10/10.
  assert.notEqual(problemOf('10/10/2026'), null);
});

test('dots and hyphens are numeric too', () => {
  assert.notEqual(problemOf('1.9.2026'), null);
  assert.notEqual(problemOf('1-9-2026'), null);
});

test('a day that does not exist is refused, however it is written', () => {
  assert.notEqual(problemOf('2026-02-30'), null);
  assert.notEqual(problemOf('30-Feb-2026'), null);
});

test('a longer spelling resolves when its first three letters name the month', () => {
  // The rule, stated exactly: the first three letters are matched against the
  // English abbreviations. So "October" and "Octobre" both read as Oct, and
  // that is not a guess -- no other month begins "Oct". It is NOT a claim to
  // understand other languages: Portuguese "Setembro" begins "Set" and is
  // refused, correctly, because this module does not pretend to know it.
  assert.equal(isoOf('10-October-2026'), '2026-10-10');
  assert.equal(isoOf('10-Octobre-2026'), '2026-10-10');
  assert.notEqual(problemOf('10-Setembro-2026'), null);
});

test('a word that names no month is refused, and quoted back', () => {
  assert.match(problemOf('10-Xyz-2026') ?? '', /“Xyz” is not a month/);
});

test('nonsense is refused with the format in the message', () => {
  assert.match(problemOf('next tuesday') ?? '', new RegExp(DATE_FORMAT_EXAMPLE));
});

/* -------------------------------------------- blank is never an error */

test('an empty cell is nothing, not a mistake', () => {
  assert.equal(readDate(''), null);
  assert.equal(readDate('   '), null);
});

/* ------------------------------------------------------ what it writes */

test('a stored date is shown the way the academy reads it', () => {
  assert.equal(formatDate('2026-10-10'), '10-Oct-2026');
});

test('the day is padded so a column of dates lines up', () => {
  assert.equal(formatDate('2026-10-01'), '01-Oct-2026');
});

test('nothing on record shows as nothing, never as a date', () => {
  assert.equal(formatDate(null), '');
  assert.equal(formatDate(''), '');
});

test('a value that is not ISO is passed through rather than invented into', () => {
  assert.equal(formatDate('not a date'), 'not a date');
});

/* ------------------------------------------------- it round-trips */

test('what it writes is what it reads back', () => {
  for (const d of ['2026-01-01', '2026-02-28', '2026-10-10', '2026-12-31']) {
    assert.equal(isoOf(formatDate(d)), d, `${d} did not survive the round trip`);
  }
});

test('toIso gives the value for a good date and nothing for a bad one', () => {
  assert.equal(toIso('10-Oct-2026'), '2026-10-10');
  assert.equal(toIso('01/09/2026'), '');
});
