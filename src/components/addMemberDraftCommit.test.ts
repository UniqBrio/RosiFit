import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "user have to enter email id and click on add to add email and same goes
 * with display name -- as soon as they enter value and navigate to next
 * field save the value"
 * (requests/2026-09-07-add-member-commit-draft-on-blur.md).
 *
 * The display-name row and the email row in `app/member/edit.tsx` each hold a
 * DRAFT beside a + Add button. The draft became a real entry on two gestures
 * only, the button and Enter -- so typing an address and moving to the next
 * field left it in a box that `valid` does not count and Save discards
 * without a word. Leaving the field now runs the same handler.
 *
 * The SAME handler is the whole claim. Blur must not become a second, laxer
 * way in: the trim, the case-insensitive duplicate refusal, the address-shape
 * check and "the first address becomes primary" all live inside `addAlias`
 * and `addEmail`, and this spec pins them there so a later edit cannot
 * quietly commit a malformed address on the way past.
 *
 * The empty-draft early return in both handlers is also what makes leaving
 * the field BY pressing + Add add once rather than twice: blur commits and
 * clears the draft, and the button's handler then finds nothing to add.
 *
 * Source-reading, like addMemberEmail.test.ts beside it -- there is no
 * component harness in this project.
 */

const ROOT = process.env.ADD_MEMBER_DRAFT_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, FORM)),
    `${ROOT} is not the repository root: no ${FORM}. Run from the root, or set ADD_MEMBER_DRAFT_SPEC_ROOT.`);
});

test('leaving the field commits the draft, on both rows', () => {
  const src = read(FORM);
  // ONE AddRow renders both the display-name row and the email row, so one
  // onBlur covers both -- and both call sites must go through it.
  assert.match(src, /onSubmitEditing=\{onAdd\} onBlur=\{onAdd\}/,
    'leaving the draft field must run the same handler + Add runs');
  assert.match(src, /<AddRow testID="member-alias"[\s\S]{0,200}?onAdd=\{addAlias\}/,
    'the display-name row must add through addAlias');
  assert.match(src, /<AddRow testID="member-email"[\s\S]{0,200}?onAdd=\{addEmail\}/,
    'the email row must add through addEmail');
});

test('blur is not a laxer way in than + Add', () => {
  const src = read(FORM);
  // Every refusal stays inside the shared handlers, which is what makes
  // "the same handler" mean the same rules.
  const addEmail = src.match(/const addEmail = \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(addEmail, 'addEmail must still be the one email path');
  assert.match(addEmail[0], /if \(!e\) return;/,
    'an empty draft must add nothing -- this is also what stops a double add on + Add');
  assert.ok(addEmail[0].includes('That does not look like an address'),
    'a malformed address must still be refused, not committed on the way past');
  assert.match(addEmail[0], /primary: p\.length === 0/,
    'the first address must still become primary');

  const addAlias = src.match(/const addAlias = \(\) => \{[\s\S]*?\n  \};/);
  assert.ok(addAlias, 'addAlias must still be the one display-name path');
  assert.match(addAlias[0], /if \(!a\) return;/,
    'an empty display-name draft must add nothing');
  assert.ok(addAlias[0].includes('That display name is already on the record'),
    'a duplicate display name must still be refused');
});

test('+ Add and Enter still work', () => {
  const src = read(FORM);
  // Blur is a third way in, not a replacement for the two that shipped.
  assert.match(src, /label="\+ Add" variant="secondary" onPress=\{onAdd\}/,
    'the + Add button must still add');
  assert.match(src, /onSubmitEditing=\{onAdd\}/,
    'Enter must still add');
});
