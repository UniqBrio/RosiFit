/**
 * Cases for filling a course's wording for the preview.
 *
 * Run: npx tsx --test src/data/message.test.ts
 *
 * The wording is authored ONCE and sent to everyone in the course, so a
 * mistake here is not a typo in one email. It is a typo in every email that
 * course will ever send.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  fillTokens, unknownTokens, MESSAGE_TOKENS, EVERYDAY_TOKENS, SUBJECT_TOKENS, insertToken,
  wordingProblem, SUBJECT_MAX, BODY_MIN, courseNameProblem, COURSE_NAME_MAX,
  previewContext, SAMPLE_MEMBER, SAMPLE_ACADEMY,
} from './message';
import type { Member } from './mock';
import { TEMPLATES } from './mock';
import { currentWeek } from './period';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Divya Ramesh',
  course: 'Prenatal Flow', course_id: 'c1', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  weekdays: null,   status: 'active',
  expected: 6, attended: 3, missed: 3, streak: 2, last: '—', joinedOn: '2026-03-01', joined: 'Mar 2026', ...over,
});
const ctx = (over: Partial<Member> = {}) => ({
  member: member(over), courseName: 'Prenatal Flow', branchName: 'Coimbatore',
  academyName: 'RosiFit', periodFrom: '18 Aug', periodTo: '24 Aug',
});

test('every documented token resolves to something', () => {
  const all = MESSAGE_TOKENS.map(t => t.token).join(' ');
  const out = fillTokens(all, ctx());
  assert.equal(unknownTokens(out).length, 0, `left unresolved: ${out}`);
  assert.ok(!out.includes('{{'), out);
});

test('the name splits to a first name', () => {
  assert.equal(fillTokens('Hello {{first_name}},', ctx()), 'Hello Divya,');
  assert.equal(fillTokens('{{member_name}}', ctx()), 'Divya Ramesh');
});

test('the figures are the member’s own', () => {
  assert.equal(
    fillTokens('{{attended_sessions}} of {{expected_sessions}}, {{missed_sessions}} missed, {{consecutive_missed}} in a row', ctx()),
    '3 of 6, 3 missed, 2 in a row');
});

test('attendance is a percentage of what was EXPECTED', () => {
  assert.equal(fillTokens('{{attendance_pct}}', ctx()), '50%');
});

test('nothing expected is an em dash, never 0%', () => {
  // The same rule the report follows. A member with no scheduled sessions has
  // no attendance to state, and "0%" tells her she attended none of them.
  assert.equal(fillTokens('{{attendance_pct}}', ctx({ expected: 0, attended: 0 })), '—');
});

test('an UNKNOWN token is left standing, not blanked', () => {
  // The one that ships a broken email. A stray {fist_name} rendering as
  // itself is visible in the preview; silently replaced with nothing it reads
  // as finished prose.
  assert.equal(fillTokens('Hi {{fist_name}},', ctx()), 'Hi {{fist_name}},');
  assert.deepEqual(unknownTokens('Hi {{fist_name}} and {{branchh}}'), ['{{fist_name}}', '{{branchh}}']);
});

test('unknownTokens ignores the ones that DO resolve', () => {
  assert.deepEqual(unknownTokens('{{first_name}} at {{branch_name}}'), []);
});

test('a value containing a token is not substituted again', () => {
  // A member actually called "{branch}" must come out as her name, not as
  // Coimbatore. Chained .replace() calls would rewrite the inserted value.
  const out = fillTokens('{{first_name}}', {
    member: member({ name: '{{branch_name}} Kumar' }),
    courseName: 'Prenatal Flow', branchName: 'Coimbatore',
    academyName: 'RosiFit', periodFrom: '18 Aug', periodTo: '24 Aug',
  });
  assert.equal(out, '{{branch_name}}');
});

test('the same token repeated is filled every time', () => {
  assert.equal(fillTokens('{{first_name}}, {{first_name}}', ctx()), 'Divya, Divya');
});

test('empty and undefined wording do not throw', () => {
  assert.equal(fillTokens('', ctx()), '');
  // @ts-expect-error -- the form can hand this through before it loads
  assert.equal(fillTokens(undefined, ctx()), '');
});

test('text with no tokens is returned unchanged', () => {
  assert.equal(fillTokens('We missed you this week.', ctx()), 'We missed you this week.');
});

test('the token list IS the sender’s variable map, name for name', () => {
  // supabase/functions/send-followups/index.ts builds exactly these. A token
  // offered here that the sender does not build would preview correctly and
  // arrive as literal text.
  const sender = [
    'first_name', 'member_name', 'course_name', 'branch_name',
    'period_from', 'period_to', 'expected_sessions', 'attended_sessions',
    'missed_sessions', 'attendance_pct', 'consecutive_missed',
    'last_attendance_date', 'academy_name',
  ];
  assert.deepEqual(MESSAGE_TOKENS.map(t => t.token.slice(2, -2)), sender);
});

test('SINGLE braces are not tokens — the sender only reads double', () => {
  // The bug this caught in the form: a single-brace filler turned the stored
  // template's "{{first_name}}" into "{Divya}" by matching the inner braces.
  assert.equal(fillTokens('Hi {first_name},', ctx()), 'Hi {first_name},');
});

test('the seeded template renders with nothing left over', () => {
  // 0009's default template, verbatim. It must preview clean, or every course
  // starts life showing a warning about wording nobody wrote.
  const seeded = 'Hello {{first_name}},\n\nYou were down for {{expected_sessions}} sessions in '
    + '{{course_name}} between {{period_from}} and {{period_to}}, and made {{attended_sessions}}.'
    + '\n\nNothing is wrong -- we would just like to see you back on the mat.\n\n{{academy_name}}';
  assert.deepEqual(unknownTokens(seeded), []);
  assert.ok(!fillTokens(seeded, ctx()).includes('{{'));
});

// ------------------------------------------------- inserting from the chips
// The academy writing this wording is not technical. The chip row exists so a
// 13-token vocabulary does not have to be memorised and typed letter-perfect,
// and these pin the part of that which is not visible at the call site.

test('every token carries a short chip label and a full meaning', () => {
  // The chip is what is tapped; `means` is what a screen reader is told. A
  // token with a blank either is a chip nobody can identify.
  for (const t of MESSAGE_TOKENS) {
    assert.ok(t.chip.trim().length > 0, `${t.token} has no chip label`);
    assert.ok(t.means.trim().length > 0, `${t.token} has no meaning`);
    assert.ok(t.chip.length <= 16, `${t.chip} is too long to sit in a chip row`);
  }
});

test('chip labels are unique — two chips reading the same is unusable', () => {
  const chips = MESSAGE_TOKENS.map(t => t.chip);
  assert.equal(new Set(chips).size, chips.length);
});

test('a token goes in at the cursor, not at the end', () => {
  const r = insertToken('Hello  and welcome', '{{first_name}}', 6, 6);
  assert.equal(r.text, 'Hello {{first_name}} and welcome');
});

test('the caret lands after the token, ready to keep typing', () => {
  const r = insertToken('', '{{first_name}}', 0, 0);
  assert.equal(r.text, '{{first_name}}');
  assert.equal(r.caret, '{{first_name}}'.length);
});

test('a space is added after a word, so "Hi," does not become "Hi,Divya"', () => {
  assert.equal(insertToken('Hi,', '{{first_name}}', 3, 3).text, 'Hi, {{first_name}}');
  assert.equal(insertToken('Hello', '{{first_name}}', 5, 5).text, 'Hello {{first_name}}');
});

test('no space is doubled where one already exists', () => {
  assert.equal(insertToken('Hi ', '{{first_name}}', 3, 3).text, 'Hi {{first_name}}');
});

test('closing punctuation keeps its place', () => {
  // "{{first_name}}," reads right; "{{first_name}} ," does not.
  const r = insertToken('Hello , welcome', '{{first_name}}', 6, 6);
  assert.equal(r.text, 'Hello {{first_name}}, welcome');
});

test('a selection is replaced, the way typing over it would', () => {
  const r = insertToken('Hello NAME there', '{{first_name}}', 6, 10);
  assert.equal(r.text, 'Hello {{first_name}} there');
});

test('a field never focused appends rather than inserting at the start', () => {
  // -1 is "no selection". Inserting at 0 would silently reorder a sentence
  // somebody had already written, which is the worse failure.
  assert.equal(insertToken('Hello', '{{first_name}}', -1, -1).text, 'Hello {{first_name}}');
});

test('an out-of-range cursor appends instead of throwing', () => {
  assert.equal(insertToken('Hi', '{{first_name}}', 99, 99).text, 'Hi {{first_name}}');
});

test('what the chips insert is exactly what the sender can fill', () => {
  // The whole point: a chip that inserted a token the Edge Function does not
  // build would send as literal braces to every member of the course.
  const all = MESSAGE_TOKENS.reduce(
    (acc, t) => insertToken(acc.text, t.token, -1, -1), { text: '', caret: 0 });
  assert.deepEqual(unknownTokens(all.text), []);
});

/**
 * The wording's length bounds — appended for RC-023.
 *
 * Reported as: editing the email template in Add a course and saving gave
 * `new row for relation "course_communication" violates check constraint
 * "course_communication_subject_check"`. The form collected a subject it had
 * no rule for; migration 0021 had the rule and nothing else did.
 */
test('a subject shorter than the database accepts is refused before Save', () => {
  // The reported case. 0021: between 3 and 200 characters.
  assert.match(String(wordingProblem('Hi', 'Hello there, we missed you this week.')), /subject/i);
  assert.match(String(wordingProblem('H', 'Hello there, we missed you this week.')), /subject/i);
});

test('the shortest subject the database accepts is accepted here too', () => {
  assert.equal(wordingProblem('Yes', 'Hello there, we missed you this week.'), null);
});

test('a subject longer than the database accepts is refused before Save', () => {
  assert.match(String(wordingProblem('x'.repeat(SUBJECT_MAX + 1), 'Hello there, we missed you.')),
    /subject/i);
  assert.equal(wordingProblem('x'.repeat(SUBJECT_MAX), 'Hello there, we missed you.'), null);
});

test('whitespace is not length — the database trims before it counts, so this does', () => {
  // btrim() in the constraint. A subject of three spaces is empty to Postgres.
  assert.match(String(wordingProblem('  a  ', 'Hello there, we missed you this week.')), /subject/i);
});

test('a body shorter than the database accepts is refused before Save', () => {
  assert.match(String(wordingProblem('We missed you', 'Too short')), /message/i);
  assert.equal(wordingProblem('We missed you', 'x'.repeat(BODY_MIN)), null);
});

test('blank is not a problem — it means the course follows its template', () => {
  // saveCourse sends `subject.trim() || null`, and NULL is what makes Reset
  // work (0021). Refusing an empty box would block a legal save.
  assert.equal(wordingProblem('', ''), null);
  assert.equal(wordingProblem('   ', '   '), null);
  assert.equal(wordingProblem('', 'Hello there, we missed you this week.'), null);
  assert.equal(wordingProblem('We missed you', ''), null);
});

test('both wrong reports the subject first, because it is the field above', () => {
  assert.match(String(wordingProblem('Hi', 'short')), /subject/i);
});

test('the sentence says what to do, not which constraint refused it', () => {
  // CP-003: the person never reads an engine string. This is the sentence the
  // form shows INSTEAD of the one the database would have raised.
  const tooShort = String(wordingProblem('Hi', 'Hello there, we missed you this week.'));
  const tooLong = String(wordingProblem('x'.repeat(SUBJECT_MAX + 1), 'Hello there, we missed you.'));
  for (const said of [tooShort, tooLong]) {
    assert.doesNotMatch(said, /constraint|relation|course_communication|violates/i);
  }
  // Each sentence names the bound it broke and nothing else — being told
  // "between 3 and 200" when you typed two characters is arithmetic homework.
  assert.match(tooShort, /3/);
  assert.match(tooLong, /200/);
});

test('a course name longer than the database accepts is refused before Save', () => {
  // `courses.name` is `between 2 and 80` (0005); the form checked >= 2 only,
  // so the upper half was enforced for the first time by courses_name_check.
  assert.equal(courseNameProblem('Gentle Recovery Yoga'), null);
  assert.equal(courseNameProblem('x'.repeat(COURSE_NAME_MAX)), null);
  assert.match(String(courseNameProblem('x'.repeat(COURSE_NAME_MAX + 1))), /course name/i);
  assert.match(String(courseNameProblem('x')), /course name/i);
});

test('an empty course name is left to the form to report, not said twice', () => {
  assert.equal(courseNameProblem(''), null);
  assert.equal(courseNameProblem('   '), null);
});

/**
 * The everyday split — appended 07-Sep-2026.
 *
 * Reported alongside the save failure: tapping along the chip row produced
 * "RosiFit Academy Main — 0 —". Every token resolved exactly as designed and
 * the message was worse for each one, because thirteen equally-weighted chips
 * read as thirteen suggestions to somebody who came to change a sentence.
 *
 * The fix SPLITS the list, it does not shorten it. These pin the difference,
 * which is the whole risk: a token quietly dropped is wording that stops
 * resolving in courses that already use it.
 */
test('the everyday seven are a SUBSET — no token was dropped', () => {
  // The list above still has to be the sender's map name for name; this only
  // says which of it the row offers first.
  assert.equal(MESSAGE_TOKENS.length, 13);
  for (const t of EVERYDAY_TOKENS) {
    assert.ok(MESSAGE_TOKENS.includes(t), `${t.token} is not in the full list`);
  }
});

test('the everyday seven are exactly what the seeded template already uses', () => {
  // 0009's default template is what every course starts life sending. A token
  // it uses that the row does not offer is a detail nobody could re-add after
  // deleting it; a token offered that it does not use is a suggestion.
  const seeded = 'Hello {{first_name}},\n\nYou were down for {{expected_sessions}} sessions in '
    + '{{course_name}} between {{period_from}} and {{period_to}}, and made {{attended_sessions}}.'
    + '\n\nNothing is wrong -- we would just like to see you back on the mat.\n\n{{academy_name}}';
  const used = new Set(seeded.match(/\{\{\w+\}\}/g) ?? []);
  assert.deepEqual(
    EVERYDAY_TOKENS.map(t => t.token).sort(),
    [...used].sort());
});

test('the six behind the More chip still fill — hidden is not unknown', () => {
  // The one way this change could break an academy: wording already written
  // with {{attendance_pct}} must keep resolving in the preview and the inbox.
  const rest = MESSAGE_TOKENS.filter(t => !t.everyday);
  assert.equal(rest.length, 6);
  const all = rest.reduce(
    (acc, t) => insertToken(acc.text, t.token, -1, -1), { text: '', caret: 0 });
  assert.deepEqual(unknownTokens(all.text), []);
  assert.ok(!fillTokens(all.text, ctx()).includes('{{'));
});

/**
 * The subject row is not the message row — appended 07-Sep-2026.
 *
 * Reported: "for subject her name is enough, no need of so many variables —
 * it can be only in the content." The subject box had come out as
 * "We missed you this week, {{first_name}} {{member_name}}", which is the
 * chip row's doing: it offered the same seven beside both fields, and a
 * subject is read in a list at one glance beside thirty others.
 */
test('the subject row opens on her name alone', () => {
  assert.deepEqual(SUBJECT_TOKENS.map(t => t.token), ['{{first_name}}']);
});

test('the subject row matches the seeded SUBJECT, as the message row matches the body', () => {
  // 0009's default subject. One rule applied to two fields, not two rules --
  // "what the academy's own template already uses" is what decides both.
  const seededSubject = 'We missed you this week, {{first_name}}';
  const used = new Set(seededSubject.match(/\{\{\w+\}\}/g) ?? []);
  assert.deepEqual(SUBJECT_TOKENS.map(t => t.token).sort(), [...used].sort());
});

test('the subject opens on FEWER than the message, and both are subsets', () => {
  // The relationship that has to hold whichever way the lists are edited: a
  // subject offering more than the message would invert the whole point.
  assert.ok(SUBJECT_TOKENS.length < EVERYDAY_TOKENS.length);
  for (const t of SUBJECT_TOKENS) {
    assert.ok(MESSAGE_TOKENS.includes(t), `${t.token} is not in the full list`);
  }
});

test('every token the subject row hides is still reachable and still fills', () => {
  // The More chip opens the FULL thirteen on both rows, so nothing became
  // unreachable from the subject — it stopped being suggested there.
  const behindMore = MESSAGE_TOKENS.filter(t => !SUBJECT_TOKENS.includes(t));
  assert.equal(behindMore.length, 12);
  const all = behindMore.reduce(
    (acc, t) => insertToken(acc.text, t.token, -1, -1), { text: '', caret: 0 });
  assert.deepEqual(unknownTokens(all.text), []);
  assert.ok(!fillTokens(all.text, ctx()).includes('{{'));
});

/**
 * The preview shows VALUES, never tokens — appended 07-Sep-2026.
 *
 * Reported: the Edit-email-template preview "shows variable names/placeholders
 * instead of their values". Two paths produced that, and both were the same
 * hole in one place — the form built its own context inline, so it could only
 * offer one when it happened to hold every part of one:
 *
 *   1. NO CONTEXT AT ALL. `previewCtx` was null whenever the register had no
 *      member to sample, which is the state EVERY course is in at the moment
 *      it is added. The panel then rendered a sentence about having nothing to
 *      show, directly under a box reading "Hello {{first_name}},". The braces
 *      were the only rendering of the wording on the screen.
 *   2. THE TEMPLATE PICKER's line, which was never filled at all — live
 *      templates take it from the first line of the body (fetchTemplates),
 *      which is where the tokens are thickest, so choosing between templates
 *      meant reading their source.
 *
 * `previewContext` closes both by having no null case: real figures where the
 * screen holds them, the sample where it does not. These specs pin that it
 * cannot regress to a partial context — the failure mode is not "wrong value",
 * it is "a brace on the screen", so most of them assert on `{{`.
 */
test('previewContext given NOTHING still resolves every documented token', () => {
  const all = MESSAGE_TOKENS.map(t => t.token).join(' ');
  const out = fillTokens(all, previewContext());
  assert.ok(!out.includes('{{'), out);
  assert.deepEqual(unknownTokens(out), []);
});

test('no token resolves to blank, an em dash, or the word undefined', () => {
  // Resolving is not the whole job. "Hello ," clears the brace check and is
  // the same defect wearing different clothes.
  const c = previewContext();
  for (const t of MESSAGE_TOKENS) {
    const out = fillTokens(t.token, c);
    assert.ok(out.trim().length > 0, `${t.token} filled blank`);
    assert.notEqual(out, '—', `${t.token} filled with an em dash`);
    assert.ok(!/undefined|null|NaN/.test(out), `${t.token} filled with ${out}`);
  }
});

test('the sample figures are all DIFFERENT, so each token is identifiable', () => {
  // The point of a preview is telling which token produced which number. A
  // sample of 0, 0, 0 resolves everything correctly and demonstrates nothing.
  const figures = [
    '{{expected_sessions}}', '{{attended_sessions}}',
    '{{missed_sessions}}', '{{attendance_pct}}',
  ].map(t => fillTokens(t, previewContext()));
  assert.equal(new Set(figures).size, figures.length, figures.join(' · '));
});

test('the sample attendance is a real percentage, not the nothing-expected dash', () => {
  // She must have been DUE at something, or {{attendance_pct}} previews as
  // '—' and the one token whose formatting has a rule is never demonstrated.
  assert.ok(SAMPLE_MEMBER.expected > 0);
  assert.equal(fillTokens('{{attendance_pct}}', previewContext()), '33%');
});

test('the sample name splits, so first and full name differ in the preview', () => {
  const c = previewContext();
  assert.notEqual(fillTokens('{{first_name}}', c), fillTokens('{{member_name}}', c));
});

test('a REAL member is preferred over the sample', () => {
  // The sample is a fallback and never a substitute: a token that resolves
  // for a fixture and not for her is what the preview exists to catch.
  const her = member({ name: 'Aarthi Venkat', expected: 4, attended: 4 });
  const c = previewContext({ member: her });
  assert.equal(fillTokens('{{member_name}} {{attendance_pct}}', c), 'Aarthi Venkat 100%');
});

test('course and branch fall back to the PREVIEW MEMBER’s own, not to a dash', () => {
  // What the Add-a-course form holds before a name is typed and a branch
  // picked. Both were rendering as '' and '—' into the middle of a sentence.
  const c = previewContext({ member: member({ course: 'Postnatal Core', branch: 'Madurai' }),
    courseName: '', branchName: '—' });
  assert.equal(fillTokens('{{course_name}} at {{branch_name}}', c), 'Postnatal Core at Madurai');
});

test('a course name that HAS been typed wins over the member’s course', () => {
  const c = previewContext({ member: member({ course: 'Postnatal Core' }), courseName: 'Aqua Natal' });
  assert.equal(fillTokens('{{course_name}}', c), 'Aqua Natal');
});

test('a still-loading academy name falls back rather than blanking the sign-off', () => {
  assert.equal(fillTokens('{{academy_name}}', previewContext({ academyName: null })), SAMPLE_ACADEMY);
  assert.equal(fillTokens('{{academy_name}}', previewContext({ academyName: 'RosiFit Madurai' })),
    'RosiFit Madurai');
});

test('the period is THIS WEEK, in the ISO shape the sender is handed', () => {
  // app/send/index.tsx passes currentWeek().from/.to straight to the Edge
  // Function, which substitutes them verbatim — so this is what a send made
  // today actually puts in the email. It used to read "the period start",
  // which is prose standing where a date belongs.
  const wednesday = new Date(2026, 8, 9);
  const week = currentWeek(wednesday);
  assert.equal(fillTokens('{{period_from}} to {{period_to}}', previewContext({}, wednesday)),
    `${week.from} to ${week.to}`);
  assert.match(fillTokens('{{period_from}}', previewContext({}, wednesday)), /^\d{4}-\d{2}-\d{2}$/);
});

test('a period the screen DOES hold is kept', () => {
  const c = previewContext({ periodFrom: '2026-08-18', periodTo: '2026-08-24' });
  assert.equal(fillTokens('{{period_from}}', c), '2026-08-18');
});

test('every seeded template previews clean — subject, body AND picker line', () => {
  // The picker line is a preview too. Live templates build it from the first
  // line of the body (fetchTemplates), which is where the tokens are thickest.
  const c = previewContext();
  for (const t of TEMPLATES) {
    for (const [what, text] of [['subject', t.subject], ['body', t.body], ['preview', t.preview]]) {
      assert.deepEqual(unknownTokens(text), [], `${t.name} ${what} has a stray token`);
      assert.ok(!fillTokens(text, c).includes('{{'), `${t.name} ${what} previewed a brace`);
    }
  }
});

test('filling stays a ONE-pass substitution through previewContext', () => {
  // The sample must not reopen the hole the single-pass fill closed: a member
  // called "{{branch_name}}" comes out as her name, never as the branch.
  const c = previewContext({ member: member({ name: '{{branch_name}} Kumar' }) });
  assert.equal(fillTokens('{{first_name}}', c), '{{branch_name}}');
});

test('the sample is a stand-in and says so — it is on no course row', () => {
  // A sample that carried a real course_id could be handed to a query and
  // quietly stand for somebody. It cannot: it belongs to no row.
  assert.equal(SAMPLE_MEMBER.course_id, null);
  assert.equal(SAMPLE_MEMBER.id, 'sample');
});
