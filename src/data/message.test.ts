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
import { fillTokens, unknownTokens, MESSAGE_TOKENS, insertToken } from './message';
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
