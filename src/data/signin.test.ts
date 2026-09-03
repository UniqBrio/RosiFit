/**
 * Cases for the two decisions sign-in makes before it has a session.
 *
 * Run: npx tsx --test src/data/signin.test.ts
 *
 * needsRegistration is the one that matters. It decides whether a person who
 * failed to sign in is sent to create an academy. A predicate that is too
 * eager walks a member who mistyped her PIN into registering a second
 * academy; one that is too strict strands the very first admin on a PIN
 * screen no PIN can pass.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { groupPhone, phoneDigits, isCompletePhone, needsRegistration } from './signin';

// ------------------------------------------------------------ groupPhone
test('ten digits are grouped five and five', () => {
  assert.equal(groupPhone('8056329742'), '80563 29742');
});

test('the group appears only once past five digits', () => {
  assert.equal(groupPhone('80563'), '80563');
  assert.equal(groupPhone('805632'), '80563 2');
});

test('an already grouped number regroups to itself', () => {
  assert.equal(groupPhone('80563 29742'), '80563 29742');
});

test('punctuation and spaces are dropped, never counted', () => {
  assert.equal(groupPhone('+91 (80563) 29-742'), '80563 29742');
});

test('an eleventh digit cannot be typed', () => {
  assert.equal(groupPhone('80563297429'), '80563 29742');
});

test('a pasted +91 number keeps its ten local digits', () => {
  // The field sits beside a fixed +91 label, so a whole pasted number used to
  // shift by two and become 91805 63297 -- a plausible number belonging to
  // nobody at all.
  assert.equal(groupPhone('+91 80563 29742'), '80563 29742');
  assert.equal(phoneDigits('+918056329742'), '8056329742');
});

test('a pasted 0-prefixed number keeps its ten local digits', () => {
  assert.equal(groupPhone('080563 29742'), '80563 29742');
});

test('a real number BEGINNING 91 is left alone', () => {
  // 91234 56789 is ten digits and starts with 91. Stripping unconditionally
  // would silently eat two of somebody's real digits.
  assert.equal(groupPhone('9123456789'), '91234 56789');
  assert.ok(isCompletePhone('9123456789'));
});

test('letters do not become digits or spaces', () => {
  assert.equal(groupPhone('80563abc29742'), '80563 29742');
});

test('nothing typed is the empty string, not "undefined"', () => {
  assert.equal(groupPhone(''), '');
  assert.equal(groupPhone(undefined as unknown as string), '');
});

// ---------------------------------------------------- digits / completeness
test('the digits sent to the server carry no separator', () => {
  assert.equal(phoneDigits('80563 29742'), '8056329742');
});

test('ten digits is complete; nine is not', () => {
  assert.ok(isCompletePhone('80563 29742'));
  assert.equal(isCompletePhone('80563 2974'), false);
});

test('the grouping space is not mistaken for a digit', () => {
  // '80563 2974' is 11 characters and 10 would be complete if the space
  // counted -- Continue would enable one digit early.
  assert.equal('80563 2974'.length, 10);
  assert.equal(isCompletePhone('80563 2974'), false);
});

// ------------------------------------------------------- needsRegistration
test('the bootstrap refusal routes to registration', () => {
  assert.ok(needsRegistration(
    'This academy has not been registered yet. Use “Register your academy” to create the admin account first.'));
});

test('a wrong PIN does NOT route to registration', () => {
  // The generic failure auth-login sends for both a wrong PIN and an unknown
  // number, once the academy exists. Treating it as "unknown" would be the
  // enumeration leak the server refuses to give.
  assert.equal(needsRegistration('That mobile number and PIN do not match.'), false);
});

test('a lockout does NOT route to registration', () => {
  assert.equal(needsRegistration('Too many attempts. Try again in 15 minutes.'), false);
});

test('a disabled account does NOT route to registration', () => {
  assert.equal(needsRegistration('This account has been disabled. Contact your academy admin.'), false);
});

test('a network failure does NOT route to registration', () => {
  assert.equal(needsRegistration('Failed to fetch'), false);
  assert.equal(needsRegistration(''), false);
  assert.equal(needsRegistration(undefined as unknown as string), false);
});

test('the sentence is matched however it is cased', () => {
  assert.ok(needsRegistration('THIS ACADEMY HAS NOT BEEN REGISTERED YET.'));
});
