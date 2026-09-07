import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * A no-email card RESOLVES THE MEMBER ON IT. Neither of its two buttons
 * creates a second person.
 *
 * The defect this holds shut (07-Sep-2026, the requester's own words: "i
 * added nitha as new member then the record should be removed from no email
 * section but its still their"): "Add as new member" pushed
 * `/member/edit?name=<her name>`, which is the ADD form. The import had
 * already created her record and enrolled her (0024, 0037) -- that is why
 * the card exists at all -- so saving there wrote a SECOND member. The new
 * one carried the address, the stray kept the attendance, and the No email
 * group still listed the stray afterwards, because the group is DERIVED from
 * the member list (guardrail 1) and the stray still had no address.
 *
 * The fix is one word in a route: the button opens HER record by id, where
 * the address the form already requires (C-73) is what takes her out of the
 * group. The other button was already a real merge (0032), which retires the
 * stray rather than duplicating it.
 *
 * It reads source rather than rendering, for the same reason
 * editDialog.test.ts does: there is no component harness in this project,
 * and the claim is about the shape of the code, not one screen's pixels.
 */

const ROOT = process.env.NO_EMAIL_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const ROSTER = 'app/course/[id].tsx';
const FORM = 'app/member/edit.tsx';

test('the spec is looking at a real tree', () => {
  // A source-reading spec that cannot find the source must say so. Silently
  // scanning nothing is the green-by-omission the gate exists to prevent.
  for (const f of [ROSTER, FORM]) {
    assert.ok(fs.existsSync(path.join(ROOT, f)),
      `${ROOT} is not the repository root: no ${f}. Run from the root, or set NO_EMAIL_SPEC_ROOT.`);
  }
});

test('"Add as new member" opens HER record, by id', () => {
  const src = read(ROSTER);
  const at = src.indexOf('course-member-add-new-');
  assert.ok(at > 0, `${ROSTER} no longer carries the course-member-add-new testID.`);
  // The press handler sits immediately under the testID. 400 characters is
  // the whole Pressable opening, style block included.
  const button = src.slice(at, at + 400);
  assert.ok(button.includes("pathname: '/member/edit'"),
    'The no-email "add as new member" button no longer opens the member form.');
  assert.ok(button.includes('params: { id: member.id }'),
    'The no-email "add as new member" button must open HER record by id. '
    + 'Prefilling the ADD form instead creates a second member and leaves '
    + 'the stray in the No email group.');
});

test('no route into the member form carries a name', () => {
  const src = read(ROSTER);
  // The whole file, not just the button: any caller that hands the form a
  // name is handing it the create path with somebody already on the register.
  const routes = src.split("pathname: '/member/edit'").slice(1);
  assert.ok(routes.length > 0, `${ROSTER} no longer routes to the member form.`);
  for (const after of routes) {
    const params = after.slice(0, 120);
    assert.ok(!params.includes('name:'),
      `${ROSTER} routes to /member/edit with a name param: ${params.split('\n')[0]}`);
  }
});

test('the member form reads no name off the route', () => {
  const src = read(FORM);
  const at = src.indexOf('useLocalSearchParams');
  assert.ok(at > 0, `${FORM} no longer reads route params.`);
  // The destructure and its type argument, which is where a re-introduced
  // prefill would have to be declared.
  const params = src.slice(at, at + 200);
  assert.ok(!params.includes('name'),
    `${FORM} accepts a name off the query string again. That is the door the `
    + 'duplicate member came through.');
});
