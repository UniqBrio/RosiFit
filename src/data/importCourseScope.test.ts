import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { splitByCourse } from '../../supabase/functions/_shared/match.ts';

/**
 * "I uploaded a csv file containing member in postnnatal course and there was
 *  a name which was included in prenatal course as well when i uploaded it in
 *  postanatal it update attendance of person in prenatal instead of bringing
 *  her as new member in postnatal"
 *
 * THE RULE. A member has one live enrolment (0006), which set_attendance
 * states outright -- "one active enrolment means there is nothing to choose"
 * (0035). So a member enrolled in Prenatal is not a member of Postnatal, and a
 * Postnatal file naming her name is not naming her. The matcher had never
 * asked: it resolved a name against every member in the academy, an exact hit
 * came back `matched`, and `matched` is accepted without anybody being asked
 * (autoDecisions, app/upload.tsx) -- so the OTHER course's member was marked
 * present on this course's register, and nothing on any screen said so.
 *
 * WHAT IS ASSERTED HERE, in three parts, because the rule lives in three
 * places and each of them can be loosened on its own:
 *
 *   THE RULE ITSELF, imported and run. splitByCourse is pure and has no Deno
 *   in it, so it is exercised directly rather than read as text.
 *
 *   THAT THE MATCHER USES IT. The rule is worth nothing sitting in _shared
 *   unread, and the Edge Function cannot be imported here (npm: specifiers,
 *   Deno.serve) -- so its wiring is asserted on the source, the way
 *   multipleFilesSameDay.test.ts asserts on the migration it cannot run.
 *
 *   THAT THE OPERATOR IS TOLD. A row filed as somebody new because her name
 *   belongs to another course's member is exactly the case where the import
 *   guessed and could be wrong. Silent, it is the same defect wearing the
 *   other face: a duplicate member nobody knows to fold in.
 *
 * One assertion per test, so a failure names its own claim.
 */

const ROOT = process.env.COURSE_SCOPE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set COURSE_SCOPE_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};

const EDGE = 'supabase/functions/csv-import/index.ts';
const SCREEN = 'app/upload.tsx';
const API = 'src/data/api.ts';

const POSTNATAL = 'off-postnatal';
const PRENATAL = 'off-prenatal';

// --------------------------------------------------------------- the rule
test('a member enrolled in another course is not a candidate for this one', () => {
  const { here, elsewhere } = splitByCourse(
    ['m-prenatal'], () => PRENATAL, POSTNATAL);
  assert.deepEqual({ here, elsewhere }, { here: [], elsewhere: ['m-prenatal'] });
});

test('a member enrolled in THIS course is a candidate', () => {
  const { here, elsewhere } = splitByCourse(
    ['m-postnatal'], () => POSTNATAL, POSTNATAL);
  assert.deepEqual({ here, elsewhere }, { here: ['m-postnatal'], elsewhere: [] });
});

test('a member in no course at all is a candidate — nothing contradicts this one', () => {
  const { here, elsewhere } = splitByCourse(['m-none'], () => null, POSTNATAL);
  assert.deepEqual({ here, elsewhere }, { here: ['m-none'], elsewhere: [] });
});

test('the requester\'s case: one name, two courses, and only this course\'s member is offered', () => {
  const enrolment: Record<string, string> = { 'm-pre': PRENATAL, 'm-post': POSTNATAL };
  const { here, elsewhere } = splitByCourse(
    ['m-pre', 'm-post'], id => enrolment[id] ?? null, POSTNATAL);
  assert.deepEqual({ here, elsewhere }, { here: ['m-post'], elsewhere: ['m-pre'] });
});

test('order is kept, so candidates[0] is still the one the commit accepts', () => {
  const enrolment: Record<string, string> = { a: POSTNATAL, b: POSTNATAL };
  const { here } = splitByCourse(['a', 'b'], id => enrolment[id] ?? null, POSTNATAL);
  assert.deepEqual(here, ['a', 'b']);
});

// ------------------------------------------------------- the matcher uses it
test('the matcher imports the course-scope rule', () => {
  const src = read(EDGE);
  assert.match(src, /import\s*\{[^}]*splitByCourse[^}]*\}\s*from\s*'\.\.\/_shared\/match\.ts'/,
    `${EDGE} does not import splitByCourse — the rule is not being applied.`);
});

test('the kind of a row is decided from the candidates in THIS course only', () => {
  const src = read(EDGE);
  // `here` is what may become matched/noEmail/possible/ambiguous. If the kind
  // is ever decided from the unsplit list again, this is the assertion that
  // says so.
  assert.match(src, /const\s*\{\s*here\s*,\s*elsewhere\s*\}\s*=\s*splitByCourse\(/,
    `${EDGE} no longer splits its candidates by course before deciding the kind.`);
});

test('a candidate from another course is offered after the ones from this course', () => {
  const src = read(EDGE);
  // The commit reads candidates[0] for a matched row (0045), so a candidate
  // this course cannot claim must never be able to sit first.
  assert.match(src, /\[\s*\.\.\.here\s*,\s*\.\.\.elsewhere\s*\]/,
    `${EDGE} must order candidates here-first: commit_csv_import accepts candidates[0].`);
});

test('the names that collided with another course come back from the preview', () => {
  const src = read(EDGE);
  assert.match(src, /other_course_names/,
    `${EDGE} does not report the names it filed as new because they belong to another course.`);
});

test('the client knows the field exists', () => {
  const src = read(API);
  assert.match(src, /other_course_names\??\s*:/,
    `${API}'s PreviewResult has no other_course_names, so the screen cannot read it.`);
});

// -------------------------------------------------------- the operator is told
test('the result screen names them rather than counting them', () => {
  const src = read(SCREEN);
  assert.match(src, /testID="upload-other-course"/,
    `${SCREEN} does not name the rows that collided with another course's member.`);
});

test('the note says which course, so the collision can be acted on', () => {
  const src = read(SCREEN);
  const note = src.slice(src.indexOf('upload-other-course'));
  assert.match(note.slice(0, 900), /outcome\.other_course\.join/,
    `${SCREEN} must list the names, not just how many there were.`);
});
