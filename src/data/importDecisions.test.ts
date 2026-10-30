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

// =====================================================================
// A NAME NO MEMBER RECORD CAN CARRY -- Postnatal · Main, 29-Oct-2026.
//
// Fourteen Meet files for one day failed together with
//   new row for relation "members" violates check constraint
//   "members_full_name_check"
// One participant joined as "m" (meeting kjh-nzhr-mvi, 5 minutes in call).
// Nobody on the course holds that name, so the row came back `unmatched`
// and was filed `add_as_new` -- and members.full_name is
// length(btrim(full_name)) between 2 and 120 (0006). The insert failed, the
// day's ONE transaction rolled back, and every other name in all fourteen
// files went unrecorded with it. Until the minutes floor was removed, a
// five-minute "m" never reached the matcher, which is why no earlier day
// failed this way.
// =====================================================================
import { unusableRows, unusableNames, unusableWords, unusableSentence } from './importDecisions';
import { isMemberName } from './memberImport';

test('29 Oct: a one-letter name nobody holds is held back, not filed as a new member', () => {
  assert.deepEqual(autoDecisions([row(9, 'unmatched', 'm')]), [{ row: 9, action: 'skip' }]);
});

test('the same holds for a fuzzy hit and for a name only another course holds', () => {
  assert.deepEqual(autoDecisions([
    row(1, 'possible', 'm', [cand('m9')]),
    row(2, 'unmatched', 'm', [cand('m-prenatal')]),
  ]).map(d => d.action), ['skip', 'skip']);
});

test('the bounds are the database\'s own: 2 to 120 characters after trimming spaces', () => {
  assert.equal(isMemberName('m'), false);
  assert.equal(isMemberName('  m  '), false);
  assert.equal(isMemberName(''), false);
  assert.equal(isMemberName('Mo'), true);
  assert.equal(isMemberName('x'.repeat(120)), true);
  assert.equal(isMemberName('x'.repeat(121)), false);
});

test('a name is measured in characters, as Postgres length() counts them, not UTF-16 units', () => {
  // One emoji is ONE character to members_full_name_check and TWO to .length.
  assert.equal(isMemberName('\u{1F642}'), false);
  assert.equal(isMemberName('\u{1F642}'.repeat(120)), true);
});

test('a one-letter name that IS a member\'s display name still lands on that member', () => {
  // matched via the alias table: no record is created, so no check applies.
  assert.deepEqual(autoDecisions([row(3, 'matched', 'm', [cand('m1')]), row(4, 'noEmail', 'k', [cand('m2')])]), []);
});

test('the rest of the 29 Oct file still imports: only the unusable row is held', () => {
  const rows = [
    row(1, 'matched', 'Gayathri Ramesh', [cand('m1')]),
    row(2, 'unmatched', 'Sri Lekha'),
    row(3, 'unmatched', 'm'),
    row(4, 'noEmail', 'saranya ramasamy', [cand('m4')]),
  ];
  assert.deepEqual(autoDecisions(rows), [
    { row: 2, action: 'add_as_new', confirm_different_person: false },
    { row: 3, action: 'skip' },
  ]);
});

test('the unusable rows are the unmatched or possible rows a member record cannot carry', () => {
  const rows = [
    row(1, 'unmatched', 'm'),
    row(2, 'matched', 'k', [cand('m1')]),
    row(3, 'possible', 'z', [cand('m2')]),
    row(4, 'unmatched', 'Sri Lekha'),
    row(5, 'ambiguous', 'q', [cand('m3'), cand('m4')]),
  ];
  assert.deepEqual(unusableRows(rows).map(r => r.row), [1, 3]);
  assert.deepEqual(unusableNames([...rows, row(6, 'unmatched', 'm')]), ['m', 'z']);
  // ambiguous is already held, and named, by heldNames -- never twice.
  assert.deepEqual(heldNames(rows), ['q']);
});

test('the note names the name, says nobody was created, and says what to do next', () => {
  const { title, body } = unusableWords(['m']);
  assert.match(title, /^Participant Skipped – Invalid Name$/);
  assert.match(body, /“m”/);
  assert.match(body, /The participant “m” was skipped because the name contains only 1 character/);
  assert.match(body, /Member names must contain at least 2 characters/);
  assert.match(body, /Attendance for this participant was not recorded/i);
  // NOT "Add display name to existing member": that button is on a member
  // card, and a held name never became a member, so it has no card.
  assert.doesNotMatch(body, /Add display name to existing member/);
  assert.match(body, /add “m” as a Google Meet display name on the member’s Edit page/);
  assert.match(unusableWords(['x'.repeat(121)]).body, /contains 121 characters\. Member names must contain at most 120/);
  assert.match(unusableWords(['m', 'x'.repeat(121)]).body, /Member names must contain between 2 and 120 characters/);
  assert.match(unusableWords(['m', 'k']).title, /^Participants Skipped – Invalid Names$/);
});

test('the batch row sentence names the unusable names, and is silent when there are none', () => {
  assert.equal(unusableSentence([]), null);
  assert.match(unusableSentence(['m']) ?? '', /“m”/);
  assert.match(unusableSentence(['m']) ?? '', /Attendance for this participant was not recorded/);
});

test('the unusable-name words are written about the member, never a pronoun', () => {
  const all = [unusableWords(['m']).title, unusableWords(['m']).body, unusableWords(['m', 'k']).body,
    unusableSentence(['m']) ?? ''].join(' ');
  assert.doesNotMatch(all, /\b(she|her|hers|herself|he|him|his)\b/i);
});

test('the result screen names the unusable names, on both commit paths', () => {
  const src = read(SCREEN);
  assert.match(src, /testID="upload-unusable"/);
  assert.match(src, /unusableSentence\(unusableNames\(preview\.rows\)\)/);
});

test('an unusable row is not counted as a member with no address, on either commit path', () => {
  const src = read(SCREEN);
  const counts = src.match(/noEmail \?\? 0\) \+ \(c\.possible \?\? 0\) \+ \(c\.unmatched \?\? 0\)[^,\n]*/g) ?? [];
  assert.equal(counts.length, 2);
  for (const c of counts) assert.match(c, /- unusableRows\(preview\.rows\)\.length/);
});

test('the member form asks the same question before Save, and says why Save is held', () => {
  const src = read('app/member/edit.tsx');
  assert.match(src, /import \{[^}]*\bisMemberName\b[^}]*\} from '\.\.\/\.\.\/src\/data\/memberImport'/);
  assert.match(src, /const valid = isMemberName\(name\)/);
  assert.match(src, /!isMemberName\(name\) \? `A member name needs \$\{NAME_MIN\} to \$\{NAME_MAX\} characters`/);
});

// Code review, same day. Three ways the held name could still mislead.
test('the next step works after the day has landed: reset the day, then upload again', () => {
  // A completed import's fingerprint refuses the same file ("already
  // imported") until the day's marks are reset (0057 reverts the import).
  const { body } = unusableWords(['m']);
  assert.match(body, /All other valid participants were imported successfully/);
  assert.match(body, /re-import the day’s attendance after resetting that day’s marks/);
  assert.doesNotMatch(body, /upload this file again and the attendance lands/);
});

test('a held name is never also reported as added to this course from another course', () => {
  const src = read(SCREEN);
  assert.match(src, /other_course: \(preview\.other_course_names \?\? \[\]\)\.filter\(n => !unusableNames\(preview\.rows\)\.includes\(n\)\)/);
});

test('a held name is never hidden behind "nothing to update", on either commit path', () => {
  const src = read(SCREEN);
  assert.match(src, /nothingChanged\(result\.changes \?\? null, result\.overridden \?\? null\)\s*&& unusableRows\(preview\.rows\)\.length === 0/);
  assert.match(src, /nothingChanged\(outcome\?\.changes \?\? null, outcome\?\.override \?\? null\)\s*&& !outcome\?\.unusable\.length/);
});

// =====================================================================
// THE THIRD COUNT (30-Oct-2026): "show the count in ui on upload of
// attendance how many with mail and without mail how many failed reason".
// Beside With email and No email: how many participants did NOT land on the
// register, and why. Staff and repeated names are not failures and keep
// their own notes; a file the server refused counts every row it carried.
// =====================================================================
import { notImportedOf, notImportedTotal, notImportedNote, NO_ONE_LEFT_OUT } from './importDecisions';

test('not imported: the held rows of a file, by reason', () => {
  const rows = [
    row(1, 'matched', 'Gayathri Ramesh', [cand('m1')]),
    row(2, 'unmatched', 'm'),
    row(3, 'ambiguous', 'vishnu priya', [cand('m2'), cand('m3')]),
    row(4, 'unmatched', 'Sri Lekha'),
  ];
  assert.deepEqual(notImportedOf(rows), { invalidName: 1, ambiguous: 1, fileFailed: 0 });
  assert.equal(notImportedTotal(notImportedOf(rows)), 2);
});

test('not imported: the note names each reason with its count, and agrees in number', () => {
  assert.equal(notImportedNote({ invalidName: 1, ambiguous: 0, fileFailed: 0 }), '1 invalid name.');
  assert.equal(notImportedNote({ invalidName: 2, ambiguous: 1, fileFailed: 9 }),
    '2 invalid names · 1 matching more than one member · 9 in a file that did not import.');
  assert.equal(notImportedNote({ invalidName: 0, ambiguous: 0, fileFailed: 9 }), '9 in a file that did not import.');
});

test('not imported: nothing held says so, never a bare zero with no sentence', () => {
  assert.equal(notImportedNote({ invalidName: 0, ambiguous: 0, fileFailed: 0 }), NO_ONE_LEFT_OUT);
  assert.match(NO_ONE_LEFT_OUT, /^Every participant was imported/);
});

test('the result screen draws the third count on both paths, keyed, beside the other two', () => {
  const src = read(SCREEN);
  const tiles = src.match(/<Landed testID="upload-not-imported"/g) ?? [];
  assert.equal(tiles.length, 2);
  assert.match(src, /notImportedNote\(batch\.notImported\)/);
  assert.match(src, /notImportedNote\(outcome\.not_imported\)/);
});

test('a file the server refused counts every row it carried; a lost answer counts nothing', () => {
  const src = read(SCREEN);
  assert.match(src, /fileFailed: answeredByServer\(err\) \? \(st\.preview\?\.rows\.length \?\? 0\) : 0/);
});

test('the batch total is the sum of its rows', () => {
  assert.match(read(SCREEN), /notImported: sumNotImported\(sorted\.map\(r => r\.notImported\)\)/);
});
