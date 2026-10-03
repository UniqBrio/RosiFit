import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "When there is any validation issue in add member form its showing up in
 * bottom instead show it as toast" (requests/2026-10-03-member-form-validation-toast.md).
 *
 * Two things used to sit at the foot of the member dialog: the line under a
 * disabled Save naming what was missing, and the banner holding the
 * database's refusal after a save -- below a long form, out of view. Both are
 * now said as a toast at the moment Save is pressed or refused.
 *
 * Source-reading, like memberRefusalClears.test.ts beside it -- there is no
 * component harness in this project.
 */

const ROOT = process.env.MEMBER_TOAST_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('pressing Save on an incomplete form says what is missing as a toast', () => {
  const src = read(FORM);
  assert.match(src, /onConfirm=\{unresolved \? undefined : \(\) => \(valid \? void save\(\) : flash\(hint, 'warn'\)\)\}/,
    'an invalid press must flash the reason, not do nothing');
  assert.match(src, /confirmDisabled=\{saving\}/,
    'Save stays pressable while invalid -- a disabled button cannot say why');
  assert.match(src, /hint=\{unresolved \|\| !valid \? undefined : hint\}/,
    'the reason is not also left in the footer');
});

test('every reason Save is held for has words in the toast', () => {
  const src = read(FORM);
  // `valid` holds Save for a refused joining date too; without its own line
  // the toast would read "<course> · <branch>" for a form that will not save.
  assert.match(src, /: inactiveFromError \? inactiveFromError\s*\n\s*: activeFromError \? activeFromError/);
});

test('a refused save is said as a toast, not a banner at the foot of the form', () => {
  const src = read(FORM);
  assert.match(src, /useEffect\(\(\) => \{ if \(refusal\) flash\(refusal, 'warn'\); \}, \[refusal, flash\]\);/);
  assert.doesNotMatch(src, /\{refusal \? \(/, 'the banner is gone');
});
