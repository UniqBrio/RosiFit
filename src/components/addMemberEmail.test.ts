import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "email address is mandatory for add member" -- and, on the requester's
 * follow-up the same day, "same for edit member as well"
 * (requests/2026-09-06-add-member-email-required.md).
 *
 * `app/member/edit.tsx` does not offer to save a member who has no address,
 * whichever form it is. The rule already held for a member arriving in a
 * FILE (memberImport.test.ts); this is the same rule on the form that
 * creates or changes one member at a time, and the two must not drift.
 *
 * A member the attendance import created has no address, and that is why
 * the upload offers two ways out of it -- add her as a new member, or make
 * the name a display name of somebody already on the register. Editing her
 * is the third: it asks for the address before it saves anything.
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

test('both forms gate their save on an address', () => {
  const src = read(FORM);
  // ONE gate, no Add-vs-Edit branch in it: the first cut of this rule held
  // for Add only, and the requester's follow-up removed the exception.
  assert.match(src, /const valid = [^;]*emails\.length > 0/,
    'the save gate must refuse a save with no address');
  assert.doesNotMatch(src, /emailRequired/,
    'the rule no longer depends on which form this is');
});

test('the form SAYS the address is required, with the shared mark', () => {
  const src = read(FORM);
  // CP-017: one mark, drawn by the label renderer, never a second asterisk.
  assert.match(src, /<Label required[^>]*>Email addresses<\/Label>/,
    'the Email addresses label must carry `required`');
  // The footer no longer promises that her name is enough.
  assert.ok(!src.includes('Her name is all that is required'),
    'the footer still says her name is all that is required');
  assert.ok(src.includes('Member name and an email address are required'),
    'the footer names both required fields');
  // A member with no address can no longer be SAVED from here, so the form
  // must not describe that as a state it will produce.
  assert.ok(!src.includes('excluded from every send'),
    'the form still describes saving her with no address');
});
