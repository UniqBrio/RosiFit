import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { autoDecisions, heldNames, heldWords, heldSentence } from './importDecisions';

/**
 * "Same display name appearing thrice?" -- the course register, 22-Sep-2026:
 * three live members called "vishnu priya", none with an address, each with
 * its own missed streak, the oldest the longest.
 *
 * THE RULE the fixtures have stated since the review screen existed
 * (src/data/mock.ts, MATCH_OUTCOMES.ambiguous): "Two members could carry
 * this name. Pick one explicitly -- the import will not guess." When the
 * row-by-row review was removed, autoDecisions took over every decision and
 * filed EVERY row that was not a clean match as `add_as_new` -- including
 * `ambiguous`, the one kind whose meaning is "this name already belongs to
 * two or more members of this course". So the upload guessed after all, and
 * its guess was a third member. From then on every file naming that person
 * created one more: the present mark landed on the newest record and the
 * older ones went absent, which is the screenshot.
 *
 * WHAT IS ASSERTED, one claim per test:
 *   the decision itself, run;
 *   that the other kinds still do what they did (this is a narrowing, not a
 *   redesign);
 *   that the screen uses this module and no private copy;
 *   that the operator is TOLD which names were held and what to do next,
 *   in words that read correctly for any academy.
 */

const ROOT = process.env.IMPORT_DECISIONS_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set IMPORT_DECISIONS_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};
const SCREEN = 'app/upload.tsx';

const cand = (id: string) => ({ member_id: id });
const row = (n: number, kind: 'matched' | 'noEmail' | 'possible' | 'ambiguous' | 'unmatched',
  raw_name: string, candidates: unknown[] = []) => ({ row: n, kind, raw_name, candidates });

// ------------------------------------------------------------ the decision
test('two namesakes already on the register: the upload does not create a third', () => {
  const [d] = autoDecisions([row(1, 'ambiguous', 'vishnu priya', [cand('m1'), cand('m2')])]);
  assert.equal(d.action, 'skip');
});

test('an ambiguous row is never filed as somebody new, however many candidates it has', () => {
  const rows = [
    row(1, 'ambiguous', 'vishnu priya', [cand('m1'), cand('m2')]),
    row(2, 'ambiguous', 'priya l', [cand('m3'), cand('m4'), cand('m5')]),
  ];
  assert.deepEqual(autoDecisions(rows).map(d => d.action), ['skip', 'skip']);
});

test('an ambiguous row picks nobody: no member_id, no acknowledgement of a different person', () => {
  const [d] = autoDecisions([row(1, 'ambiguous', 'vishnu priya', [cand('m1'), cand('m2')])]);
  assert.deepEqual(d, { row: 1, action: 'skip' });
});

// --------------------------------------------- the other kinds, unchanged
test('a name nobody holds is still added as somebody new, with nothing to acknowledge', () => {
  assert.deepEqual(autoDecisions([row(3, 'unmatched', 'kavi.s')]),
    [{ row: 3, action: 'add_as_new', confirm_different_person: false }]);
});

test("a name held only by another course's member is still added here as somebody new, acknowledged", () => {
  assert.deepEqual(autoDecisions([row(4, 'unmatched', 'meena raj', [cand('m-prenatal')])]),
    [{ row: 4, action: 'add_as_new', confirm_different_person: true }]);
});

test('a fuzzy match is still added as somebody new, acknowledged (C-79: never auto-accepted)', () => {
  assert.deepEqual(autoDecisions([row(5, 'possible', 'lakshmi n', [cand('m9')])]),
    [{ row: 5, action: 'add_as_new', confirm_different_person: true }]);
});

test('a clean match and a matched member with no address need no decision', () => {
  assert.deepEqual(autoDecisions([
    row(6, 'matched', 'anitha k', [cand('m6')]),
    row(7, 'noEmail', 'meena raj', [cand('m7')]),
  ]), []);
});

test('decisions keep file order and carry the row number the server keys on', () => {
  const rows = [
    row(1, 'matched', 'a', [cand('m1')]),
    row(2, 'ambiguous', 'b', [cand('m2'), cand('m3')]),
    row(3, 'unmatched', 'c'),
  ];
  assert.deepEqual(autoDecisions(rows).map(d => d.row), [2, 3]);
});

// ------------------------------------------------------- the held names
test('the held names are the ambiguous rows, in file order, each once', () => {
  const rows = [
    row(1, 'ambiguous', 'vishnu priya', [cand('m1'), cand('m2')]),
    row(2, 'unmatched', 'kavi.s'),
    row(3, 'ambiguous', 'priya l', [cand('m3'), cand('m4')]),
    row(4, 'ambiguous', 'vishnu priya', [cand('m1'), cand('m2')]),
  ];
  assert.deepEqual(heldNames(rows), ['vishnu priya', 'priya l']);
});

test('a file with no ambiguous row holds nothing back', () => {
  assert.deepEqual(heldNames([row(1, 'unmatched', 'kavi.s'), row(2, 'matched', 'a', [cand('m1')])]), []);
});

// ---------------------------------------------------------------- the words
test('the note names the held names and says nobody new was created', () => {
  const { title, body } = heldWords(['vishnu priya']);
  assert.match(title, /1 name matches more than one member of this course/);
  assert.match(body, /vishnu priya/);
  assert.match(body, /nobody new was created/i);
});

test('the note says what to do next: fold the duplicates, then upload again', () => {
  const { body } = heldWords(['vishnu priya', 'priya l']);
  assert.match(body, /Add display name to existing member/);
  assert.match(body, /upload this file again/);
});

test('the note counts and agrees in number', () => {
  assert.match(heldWords(['a', 'b']).title, /^2 names match /);
  assert.match(heldWords(['a']).title, /^1 name matches /);
});

test('the batch row sentence names the held names, and is silent when none were held', () => {
  assert.equal(heldSentence([]), null);
  assert.match(heldSentence(['vishnu priya']) ?? '', /vishnu priya/);
  assert.match(heldSentence(['vishnu priya']) ?? '', /more than one member/);
});

test('every word the operator reads is written about the member, never a pronoun', () => {
  const all = [heldWords(['a']).title, heldWords(['a']).body, heldWords(['a', 'b']).body,
    heldSentence(['a']) ?? ''].join(' ');
  assert.doesNotMatch(all, /\b(she|her|hers|herself|he|him|his)\b/i);
});

// ------------------------------------------------------------- the wiring
test('the upload screen takes its decisions from this module and keeps no private copy', () => {
  const src = read(SCREEN);
  assert.match(src, /import \{[^}]*\bautoDecisions\b[^}]*\} from '\.\.\/src\/data\/importDecisions'/);
  assert.doesNotMatch(src, /function autoDecisions\b/);
});

test('the result screen draws the held-back note, keyed for the walkthrough', () => {
  assert.match(read(SCREEN), /testID="upload-ambiguous"/);
});

test('a held row is not counted as a member with no address, on either commit path', () => {
  // The old arithmetic counted ambiguous rows as "no email" -- true only
  // while they became members. Now they become nothing, so they are
  // counted nowhere on the landed side.
  assert.doesNotMatch(read(SCREEN), /c\.ambiguous/);
});
