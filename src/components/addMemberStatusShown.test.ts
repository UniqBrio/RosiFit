import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "While adding member show active and inactive toggle by default it should
 * be active if they want to set as inactive they can cliq on edit and det as
 * inactive"
 * (requests/2026-09-07-add-member-status-toggle-default-active.md).
 *
 * `app/member/edit.tsx` is one file with two states. The EDIT state has
 * carried an Active/Inactive pick since ADR-025; the ADD state carried
 * nothing at all, and ADR-025 said so on purpose. This request reverses that
 * half: the Add form now SHOWS the status it is about to create -- a toggle
 * drawn on, reading Active -- and still does not offer to change it, because
 * `create_member` (0016) takes no status and the requester named Edit as the
 * place to turn it off.
 *
 * The three things that can silently go wrong here, each guarded below:
 *   - the block renders on `!editing`, not `!existing`. An edit whose record
 *     has not arrived yet satisfies `!existing` too, and would show "Active"
 *     over a member who may be inactive;
 *   - the Add block acquires a press handler later, quietly becoming a second
 *     way to write the column -- one that would need a write path it does not
 *     have;
 *   - the two states drift apart on wording, each holding its own "Active".
 *
 * It reads source rather than rendering, for the same reason
 * addMemberBranchDefault.test.ts and editDialog.test.ts do: there is no
 * component harness in this project, and the claim is about the shape of the
 * gate and what is inside it.
 */

const ROOT = process.env.ADD_MEMBER_STATUS_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** The Add block, from its gate to the gate that closes it. */
function addBlock(src: string): string {
  const open = src.indexOf('{!editing ? (');
  assert.notEqual(open, -1, 'the Add form has no status block gated on !editing');
  const close = src.indexOf(') : null}', open);
  assert.notEqual(close, -1, 'the Add status block is never closed');
  return src.slice(open, close);
}

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, FORM)),
    `${ROOT} is not the repository root: no ${FORM}. Run from the root, or set ADD_MEMBER_STATUS_SPEC_ROOT.`);
});

test('the Add form shows a status, and it is Active', () => {
  const block = addBlock(read(FORM));
  assert.match(block, /<Label[^>]*>Status<\/Label>/,
    'the Add block must label itself Status');
  assert.match(block, /testID="member-status-add"/,
    'the row a reviewer looks for must be findable by testID');
  assert.match(block, /ACTIVE_CHOICE\.label/,
    'the word must come from the shared Active constant, not a second literal');
  assert.match(block, /ACTIVE_CHOICE\.icon/,
    'the icon must come from the same place as the word (guardrail 3)');
  assert.doesNotMatch(block, /'inactive'|>Inactive</,
    'the Add form states what the create will do; it does not offer Inactive');
});

test('the Add block is gated on the ADD state, not on a missing record', () => {
  const src = read(FORM);
  // `existing` is null BOTH for an add and for an edit still fetching her
  // record. Only `editing` separates the two.
  assert.match(src, /\{!editing \? \(/,
    'the gate must be !editing -- !existing also matches an edit mid-fetch');
  assert.doesNotMatch(addBlock(src), /existing/,
    'nothing inside the Add block may depend on a record it will never have');
});

test('the Add toggle cannot write the column', () => {
  const block = addBlock(read(FORM));
  for (const forbidden of ['onPress', 'Pressable', 'setStatus', 'setMemberStatus', 'spaceSelects']) {
    assert.ok(!block.includes(forbidden),
      `the Add status block must stay a statement, not a control: found ${forbidden}. `
      + 'Making it pickable needs a second write after create_member (0016), which takes no '
      + 'status -- see the request and ADR-025 before adding one.');
  }
});

test('the Edit form keeps its own pick, untouched', () => {
  const src = read(FORM);
  // MUST NOT CHANGE: the radio group, its pending value and the Save that
  // writes it. If this ever fails, the Add change has reached the Edit state.
  assert.match(src, /accessibilityRole="radiogroup"/,
    'the Edit status control is still a radio group');
  assert.match(src, /testID=\{`member-status-\$\{choice\.value\}`\}/,
    'the Edit status rows keep their testIDs');
  assert.match(src, /if \(statusChanged\) \{/,
    'Save still writes her status only when the pick differs from her record');
  assert.match(src, /await setMemberStatus\(existing\.id, status\)/,
    'set_member_status (0031) is still the only path that writes the column');
});

test('one source for the Active words', () => {
  const src = read(FORM);
  assert.match(src, /const ACTIVE_CHOICE = \{/,
    'the Active row must be a named constant both states read');
  assert.match(src, /const STATUS_CHOICES:[\s\S]{0,160}?\n  ACTIVE_CHOICE,/,
    'the Edit choices must reuse that constant rather than restate it');
  assert.equal(src.match(/label: 'Active'/g)?.length, 1,
    "'Active' must be written once in this file, or the two states can drift");
});
