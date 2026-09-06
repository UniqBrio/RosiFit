/**
 * The picker's two identity decisions
 * (requests/2026-09-07-merge-picker-search-by-email.md).
 *
 * Both are asserted against the register that produced the report: two live
 * members called "Kavitha Ramesh", RF-000105 and RF-000106, told apart by
 * nothing but their email addresses.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickerMatches, pickerKey } from './pickerSearch';

const kavithaA = {
  label: 'Kavitha Ramesh',
  search: 'kavitha+rf-000105@example.com',
  value: '79e79f0d-e58f-40c7-a9c1-3db788f2588f',
};
const kavithaB = {
  label: 'Kavitha Ramesh',
  search: 'kavitha+rf-000106@example.com',
  value: 'b498f05e-bd7a-4a86-abbf-fd39bc3afacf',
};

// ------------------------------------------------------------- the query
test('a name still matches, exactly as it always did', () => {
  assert.equal(pickerMatches(kavithaA, 'kavitha'), true);
  assert.equal(pickerMatches(kavithaA, 'Ramesh'), true);
  assert.equal(pickerMatches(kavithaA, 'rohini'), false);
});

test('an email address matches, which is the whole ask', () => {
  assert.equal(pickerMatches(kavithaA, 'rf-000105'), true);
  assert.equal(pickerMatches(kavithaA, 'kavitha+rf-000105@example.com'), true);
});

test('the address is what tells two same-named members apart', () => {
  // The one query that returns ONE Kavitha Ramesh rather than two.
  assert.equal(pickerMatches(kavithaA, 'rf-000106'), false);
  assert.equal(pickerMatches(kavithaB, 'rf-000106'), true);
});

test('case and surrounding space do not decide the answer', () => {
  assert.equal(pickerMatches(kavithaA, '  RF-000105  '), true);
  assert.equal(pickerMatches(kavithaA, 'KAVITHA'), true);
});

test('an empty query is not a filter', () => {
  // The unsearched list is the full list -- the picker opens on every member.
  assert.equal(pickerMatches(kavithaA, ''), true);
  assert.equal(pickerMatches(kavithaA, '   '), true);
});

test('a picker that passes no search text is unchanged', () => {
  // Course, branch, role and question pickers give a label and nothing else.
  // They must go on matching by label alone and must not throw on the
  // absent field.
  const plain = { label: 'Prenatal Flow' };
  assert.equal(pickerMatches(plain, 'prenatal'), true);
  assert.equal(pickerMatches(plain, 'flow'), true);
  assert.equal(pickerMatches(plain, 'postnatal'), false);
});

// --------------------------------------------------------------- the key
test('two members sharing a name are two different rows', () => {
  // The defect itself: keyed by label these were ONE key, and React's answer
  // to that is children duplicated and/or omitted -- four Kavitha Ramesh rows
  // for a search that matched neither of them.
  assert.notEqual(pickerKey(kavithaA, 0), pickerKey(kavithaB, 1));
});

test('a row keyed by its member id does not move when the list is filtered', () => {
  // Position must not enter the key when identity is available, or staging a
  // row and then typing would re-key it and lose the highlight.
  assert.equal(pickerKey(kavithaA, 0), pickerKey(kavithaA, 7));
  assert.equal(pickerKey(kavithaA, 0), kavithaA.value);
});

test('labels with no identity of their own still key uniquely', () => {
  const a = { label: 'Main' };
  const b = { label: 'Main' };
  assert.notEqual(pickerKey(a, 0), pickerKey(b, 1));
});
