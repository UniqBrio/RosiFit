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
import { fillTokens, unknownTokens, MESSAGE_TOKENS } from './message';
import type { Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Divya Ramesh',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  status: 'active',
  expected: 6, attended: 3, missed: 3, streak: 2, last: '—', joined: 'Mar 2026', ...over,
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
