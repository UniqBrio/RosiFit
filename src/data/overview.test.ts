/**
 * Cases for what the Overview filters mean and what they are called.
 *
 * Run: npx tsx --test src/data/overview.test.ts
 *
 * The filters choose a population and the caption names it. The one failure
 * this screen cannot afford is those two describing different sets — a ring
 * labelled "2 branches" counted over three — so the predicate and the
 * sentence are generated from the same selection, and these are the cases
 * that keep them generated from it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  narrows, matchesSelection, fieldValue, scopeSentence, toggle, pruned,
  attentionFirst, MEMBER_ROWS_SHOWN,
} from './overview';
import type { ReportRow } from './report';

const m = (course: string, branch: string) => ({ course, branch });
const row = (label: string, pct: number | null): ReportRow =>
  ({ label, pct, expected: pct === null ? 0 : 10, attended: pct === null ? 0 : pct / 10 });

/* ----------------------------------------------------------- the narrowing */

test('nothing ticked narrows nothing', () => {
  assert.equal(narrows([], 'Coimbatore'), true);
  assert.equal(matchesSelection(m('Prenatal Flow', 'Coimbatore'), { courses: [], branches: [] }), true);
});

test('a tick on one value excludes the others', () => {
  const s = { courses: [], branches: ['Coimbatore'] };
  assert.equal(matchesSelection(m('Prenatal Flow', 'Coimbatore'), s), true);
  assert.equal(matchesSelection(m('Prenatal Flow', 'Chennai'), s), false);
});

test('several ticks are an OR, which is the whole point of the checkboxes', () => {
  const s = { courses: [], branches: ['Coimbatore', 'Chennai'] };
  assert.equal(matchesSelection(m('Prenatal Flow', 'Chennai'), s), true);
  assert.equal(matchesSelection(m('Prenatal Flow', 'Erode'), s), false);
});

test('course and branch are an AND — both filters apply at once', () => {
  const s = { courses: ['Prenatal Flow'], branches: ['Coimbatore'] };
  assert.equal(matchesSelection(m('Prenatal Flow', 'Coimbatore'), s), true);
  assert.equal(matchesSelection(m('Prenatal Flow', 'Chennai'), s), false);
  assert.equal(matchesSelection(m('Postnatal Core', 'Coimbatore'), s), false);
});

test('a branch NAMED "All branches" cannot switch the filter off by accident', () => {
  // "All" is the empty selection, not a value the query recognises by name.
  assert.equal(matchesSelection(m('Prenatal Flow', 'Coimbatore'), { courses: [], branches: ['All branches'] }), false);
});

/* ---------------------------------------------------------------- the words */

test('the closed field says "all" when nothing is ticked', () => {
  assert.equal(fieldValue([], 'All courses', 'courses'), 'All courses');
});

test('one tick names it; several are counted, never truncated', () => {
  // Three names do not fit in a third of a phone's width, and a cut-off list
  // reads as a shorter selection than the one actually applied.
  assert.equal(fieldValue(['Prenatal Flow'], 'All courses', 'courses'), 'Prenatal Flow');
  assert.equal(fieldValue(['a', 'b', 'c'], 'All courses', 'courses'), '3 courses');
});

test('the caption describes the same selection the predicate applies', () => {
  assert.equal(
    scopeSentence({ courses: [], branches: [] }, '31 Aug–6 Sep 2026'),
    'every course · every branch · 31 Aug–6 Sep 2026');
  assert.equal(
    scopeSentence({ courses: ['Prenatal Flow'], branches: ['Chennai', 'Erode'] }, 'this week'),
    'Prenatal Flow · 2 branches · this week');
});

/* --------------------------------------------------------------- the ticks */

test('toggling adds, then removes, and keeps the order it was ticked in', () => {
  assert.deepEqual(toggle([], 'a'), ['a']);
  assert.deepEqual(toggle(['a'], 'b'), ['a', 'b']);
  assert.deepEqual(toggle(['a', 'b'], 'a'), ['b']);
});

test('a tick on a value that no longer exists is dropped, so the filter widens visibly', () => {
  // A branch removed under More -> Configuration would otherwise narrow the
  // figures to nothing while the field still read "2 branches".
  assert.deepEqual(pruned(['Chennai', 'Gone'], ['Chennai', 'Erode']), ['Chennai']);
  assert.deepEqual(pruned(['Gone'], ['Chennai']), []);
});

/* --------------------------------------------------------- the member order */

test('the member section leads with the lowest attendance', () => {
  const sorted = attentionFirst([row('Asha', 90), row('Bina', 40), row('Cita', 70)]);
  assert.deepEqual(sorted.map(r => r.label), ['Bina', 'Cita', 'Asha']);
});

test('a member expected at nothing sorts LAST, not first', () => {
  // She has no percentage, and she is not the worst attender -- she was not
  // expected. Sorting a null as a zero would head the list with somebody
  // nobody needs to chase.
  const sorted = attentionFirst([row('Asha', 90), row('Nula', null), row('Bina', 40)]);
  assert.deepEqual(sorted.map(r => r.label), ['Bina', 'Asha', 'Nula']);
});

test('equal figures are broken by name, so the order is stable between renders', () => {
  const sorted = attentionFirst([row('Zoya', 50), row('Asha', 50)]);
  assert.deepEqual(sorted.map(r => r.label), ['Asha', 'Zoya']);
});

test('sorting does not mutate the rows it was handed', () => {
  const rows = [row('Zoya', 90), row('Asha', 10)];
  attentionFirst(rows);
  assert.deepEqual(rows.map(r => r.label), ['Zoya', 'Asha']);
});

test('the cap leaves room for the sections under it', () => {
  assert.ok(MEMBER_ROWS_SHOWN > 0 && MEMBER_ROWS_SHOWN <= 8);
});
