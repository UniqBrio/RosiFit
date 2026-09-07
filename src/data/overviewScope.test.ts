import test from 'node:test';
import assert from 'node:assert/strict';
import { withScope } from './overview';
import type { ReportRow } from './report';

/**
 * The line under a member's name on the Overview: which course, which branch.
 *
 * WHY IT IS A FUNCTION AND NOT A TEMPLATE IN THE RENDER BODY
 * Same reason scopeSentence is: the graph is now making a CLAIM about a
 * member -- "Divya Ramesh, Prenatal Flow" -- and a claim computed inside JSX
 * cannot be tested. The one failure that matters here is the row being
 * labelled with somebody else's course, and the ambiguous case below is
 * exactly where that would happen.
 */

const row = (label: string): ReportRow => ({ label, pct: 0, expected: 3, attended: 0 });
const member = (name: string, course: string, branch: string) => ({ name, course, branch });

test('a member row carries her course and her branch', () => {
  const out = withScope([row('Divya Ramesh')],
    [member('Divya Ramesh', 'Prenatal Flow', 'Anna Nagar')]);
  assert.equal(out[0].sub, 'Prenatal Flow · Anna Nagar');
});

test('the row is otherwise untouched -- the figures are not recomputed here', () => {
  const before = row('Divya Ramesh');
  const out = withScope([before], [member('Divya Ramesh', 'Prenatal Flow', 'Anna Nagar')]);
  assert.equal(out[0].label, before.label);
  assert.equal(out[0].expected, before.expected);
  assert.equal(out[0].attended, before.attended);
  assert.equal(out[0].pct, before.pct);
  // the input is not mutated: the same rows are read again on the next render
  assert.equal(before.sub, undefined);
});

test('two members of the same name in DIFFERENT courses get no course line', () => {
  // Naming one of the two courses would put a course beside a bar that is
  // not counted only from it. Saying nothing is the only honest answer.
  const out = withScope([row('Anita')], [
    member('Anita', 'Prenatal Flow', 'Anna Nagar'),
    member('Anita', 'Postnatal Core', 'Anna Nagar'),
  ]);
  assert.equal(out[0].sub, undefined);
});

test('two members of the same name in the SAME course keep the line', () => {
  const out = withScope([row('Anita')], [
    member('Anita', 'Prenatal Flow', 'Anna Nagar'),
    member('Anita', 'Prenatal Flow', 'Anna Nagar'),
  ]);
  assert.equal(out[0].sub, 'Prenatal Flow · Anna Nagar');
});

test('a row with nobody behind it is left alone rather than guessed at', () => {
  const out = withScope([row('Someone Else')],
    [member('Divya Ramesh', 'Prenatal Flow', 'Anna Nagar')]);
  assert.equal(out[0].sub, undefined);
});
