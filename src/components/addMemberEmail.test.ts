import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "email address is mandatory for add member"
 * (requests/2026-09-06-add-member-email-required.md).
 *
 * The Add form -- `app/member/edit.tsx` with no id in the route -- does not
 * offer to save a member who has no address. The rule already held for a
 * member arriving in a FILE (memberImport.test.ts); this is the same rule on
 * the form that creates one member at a time, and the two must not drift.
 *
 * The Edit form is deliberately NOT under this rule: a member created by the
 * attendance import (C-76) has no address, and she must still be renamed,
 * moved or marked inactive without somebody inventing one for her.
 *
 * It reads source rather than rendering, for the same reason
 * editDialog.test.ts does: there is no component harness in this project,
 * and the claim is about the shape of the gate, not one screen's pixels.
 * Every assertion is a plain string or a regex literal -- a regex built
 * inside a template literal loses its own backslashes.
 */

// The repository root. `npm run test:unit` runs from it; the override exists
// to replay this spec against an exported copy of an EARLIER tree, which is
// how .evidence/add-member-email-fail-first.txt was recorded.
const ROOT = process.env.ADD_MEMBER_EMAIL_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, FORM)),
    `${ROOT} is not the repository root: no ${FORM}. Run from the root, or set ADD_MEMBER_EMAIL_SPEC_ROOT.`);
});

test('the Add form gates its save on an address; the Edit form does not', () => {
  const src = read(FORM);
  // The rule is decided by the ROUTE, like Add-vs-Edit itself (RC-021):
  // `editing` is the id from the URL, not the result of a lookup.
  assert.ok(src.includes('const emailRequired = !editing;'),
    'the address is required on the Add path, and the Add path is the route with no id');
  // The gate that disables Add Member reads that decision.
  assert.match(src, /const valid = [^;]*\(!emailRequired \|\| emails\.length > 0\)/,
    'the save gate must refuse an Add with no address');
});

test('the form SAYS the address is required, with the shared mark', () => {
  const src = read(FORM);
  // CP-017: one mark, drawn by the label renderer, never a second asterisk.
  assert.match(src, /<Label required=\{emailRequired\}[^>]*>Email addresses<\/Label>/,
    'the Email addresses label must carry `required` on the Add form');
  // The footer no longer promises that her name is enough on the Add form.
  assert.doesNotMatch(src, /!name\.trim\(\)\s*\?\s*'Her name is all that is required'/,
    'the Add form footer still says her name is all that is required');
  assert.ok(src.includes('Her name and an email address are required'),
    'the Add form footer names both required fields');
});
