import test from 'node:test';
import assert from 'node:assert/strict';
import { unquoteSecret, isFromAddress } from '../../supabase/functions/_shared/from-address.ts';

// RC-017 was "the app says SENT and sends nothing". Its last mile was a
// from-address that SES refused with `400 Missing final '@domain'` -- a
// message naming neither the field nor the value. These pin the two rules
// that stand between a secrets field and that refusal.
//
// This imports the module the Edge Function imports. A copy of the regex kept
// here would pass while production failed, which is the failure mode the
// whole exercise is about.

// ------------------------------------------------------------- unquoting
test('a value a shell wrapped in double quotes is unwrapped', () => {
  // Exactly what was on this project: `supabase secrets set FROM="X <a@b>"`
  // in PowerShell stored the quote characters as part of the value.
  assert.equal(unquoteSecret('"UniqBrio <uniqbotzinfo@gmail.com>"'),
    'UniqBrio <uniqbotzinfo@gmail.com>');
});

test('single quotes are unwrapped too', () => {
  assert.equal(unquoteSecret("'me@example.com'"), 'me@example.com');
});

test('a doubly-wrapped value is fully unwrapped', () => {
  // A shell quoting a value a human had already quoted.
  assert.equal(unquoteSecret('""me@example.com""'), 'me@example.com');
  assert.equal(unquoteSecret('\'"me@example.com"\''), 'me@example.com');
});

test('surrounding whitespace goes, inside and outside the quotes', () => {
  assert.equal(unquoteSecret('  " me@example.com "  '), 'me@example.com');
});

test('a correctly quoted DISPLAY NAME is left alone', () => {
  // `"UniqBrio" <a@b.com>` is valid RFC 5322 and the quotes are content.
  // It ends `>`, not a quote, so the unwrap rule never touches it -- this is
  // the case that makes stripping safe rather than reckless.
  const v = '"UniqBrio" <uniqbotzinfo@gmail.com>';
  assert.equal(unquoteSecret(v), v);
  assert.ok(isFromAddress(unquoteSecret(v)));
});

test('mismatched or lone quotes are not treated as a pair', () => {
  assert.equal(unquoteSecret('"me@example.com'), '"me@example.com');
  assert.equal(unquoteSecret('\'me@example.com"'), '\'me@example.com"');
  assert.equal(unquoteSecret('"'), '"');
});

test('an ordinary value passes through untouched', () => {
  assert.equal(unquoteSecret('ap-southeast-1'), 'ap-southeast-1');
  assert.equal(unquoteSecret('AKIAIOSFODNN7EXAMPLE'), 'AKIAIOSFODNN7EXAMPLE');
});

// --------------------------------------------------------- the from shape
test('both forms SES accepts are accepted', () => {
  assert.ok(isFromAddress('uniqbotzinfo@gmail.com'));
  assert.ok(isFromAddress('UniqBrio <uniqbotzinfo@gmail.com>'));
});

test('whitespace inside the angle brackets is tolerated', () => {
  // This is the regression guard. Written as a plain template literal the
  // pattern read `<s*...s*>` -- the letter s, because a non-raw literal eats
  // `\s`. The common no-space form still matched, so the bug was invisible.
  assert.ok(isFromAddress('UniqBrio < uniqbotzinfo@gmail.com >'));
  assert.ok(isFromAddress('UniqBrio <  uniqbotzinfo@gmail.com  >'));
});

test('a still-quoted value is refused, so the unwrap is load-bearing', () => {
  assert.ok(!isFromAddress('"UniqBrio <uniqbotzinfo@gmail.com>"'));
});

test('a pasted whole assignment line is refused', () => {
  // `=` is excluded from the address for exactly this.
  assert.ok(!isFromAddress('SES_FROM=uniqbotzinfo@gmail.com'));
  assert.ok(!isFromAddress('SES_FROM_ADDRESS=UniqBrio <a@b.com>'));
});

test('two addresses in one value are refused', () => {
  assert.ok(!isFromAddress('a@example.com,b@example.com'));
});

test('things that are not addresses at all are refused', () => {
  assert.ok(!isFromAddress('UniqBrio'));
  assert.ok(!isFromAddress('uniqbotzinfo'));
  assert.ok(!isFromAddress('uniqbotzinfo@gmail'));      // no dot in the domain
  assert.ok(!isFromAddress('<uniqbotzinfo@gmail.com'));  // unclosed
  assert.ok(!isFromAddress(''));
});

test('the quoted value from the live failure works once unquoted', () => {
  // End to end, on the exact string the project had on 05-Sep-2026.
  const stored = '"UniqBrio <uniqbotzinfo@gmail.com>"';
  assert.ok(!isFromAddress(stored), 'as stored, refused');
  assert.ok(isFromAddress(unquoteSecret(stored)), 'unquoted, accepted');
});
