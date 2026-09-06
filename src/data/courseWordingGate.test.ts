import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * RC-023 — "In add course form on editing email template and saving course
 * this error is appearing"
 * (requests/2026-09-07-course-communication-subject-check.md).
 *
 * The wording bounds were specified ONCE, as a CHECK constraint in migration
 * 0021, and pinned by `supabase/tests/15_course_communication.sql` ("a
 * two-character subject is refused"). The form that collects the subject knew
 * nothing about them, so the first thing to enforce the rule was the INSERT —
 * and the person read Postgres saying so.
 *
 * `message.test.ts` pins what the rule IS. This pins that the form OBEYS it:
 * the bounds could be perfect and still never consulted, which is exactly the
 * shape the defect had. It reads source rather than rendering for the reason
 * addMemberEmail.test.ts does — there is no component harness in this project,
 * and the claim is about the shape of the gate, not one screen's pixels.
 */
const ROOT = process.env.COURSE_WORDING_SPEC_ROOT ?? process.cwd();
const FORM = 'app/course/edit.tsx';
const REPO = 'src/data/repository.ts';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, FORM)),
    `${ROOT} is not the repository root: no ${FORM}. Run from the root, or set COURSE_WORDING_SPEC_ROOT.`);
});

test('the course form refuses to OFFER a save the database will refuse', () => {
  const src = read(FORM);
  assert.match(src, /const valid = [^;]*!wording/,
    'the save gate must include the wording problem, or Save is offered for wording the CHECK constraint rejects');
});

test('the form measures the override, not the words on screen', () => {
  const src = read(FORM);
  // shownSubject/shownBody fall back to the TEMPLATE's words, and a course
  // that has not been reworded saves NULL. Measuring those would block a save
  // the database accepts, for a template this form never wrote.
  assert.match(src, /wordingProblem\(subject \?\? '', body \?\? ''\)/,
    'the gate must judge the override that is saved, not the text displayed');
});

test('the reason is stated where the person is typing AND at the button', () => {
  const src = read(FORM);
  assert.ok(src.includes('testID="course-wording-problem"'),
    'the wording card must state the problem beside the field');
  assert.match(src, /:\s*wording \? wording/,
    'the footer hint must say why Save is off — a silently disabled button is the same dead end');
});

test('a constraint that still fires is answered in words, not in Postgres', () => {
  const src = read(REPO);
  // Belt and braces: the form is the first line, the constraint is the last.
  // If the last one ever fires, CP-003 still holds.
  assert.match(src, /course_communication_subject_check/,
    'the subject constraint must map to a sentence');
  assert.match(src, /course_communication_body_text_check/,
    'the body constraint must map to a sentence');
  // CP-003: no write translator may end by handing an engine string onward.
  const rawFallThrough = /return `\$\{message \|\| '[^']*'\}\. Nothing has been/;
  assert.doesNotMatch(src, rawFallThrough,
    'a translator still passes an unrecognised engine message straight to the person');
});
