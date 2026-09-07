import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "In add member form if only one branch is present show that branch as
 * default" (requests/2026-09-07-add-member-single-branch-default.md).
 *
 * The Branch row in `app/member/edit.tsx` offers the branches the chosen
 * course actually runs at. When that list has exactly ONE entry there is no
 * choice left to make, so the form makes it: the branch fills itself, the row
 * stops showing its placeholder, and `offering` resolves without anybody
 * opening a picker with one line in it.
 *
 * What this spec really guards is the pair of conditions around that fill,
 * because each one is a way to lose something:
 *   - `!soleBranch` -- two or more options are a real choice and stay blank;
 *   - `branch` non-empty -- a branch already in the field is never written
 *     over, which on the Edit form is her STORED branch. A member enrolled
 *     where her course no longer runs would otherwise be moved silently by a
 *     form nobody touched;
 *   - `editing && !seeded` -- while an edit is still fetching her record,
 *     nothing is defaulted into it at all.
 *
 * It reads source rather than rendering, for the same reason
 * addMemberEmail.test.ts and editDialog.test.ts do: there is no component
 * harness in this project, and the claim is about the shape of the gate.
 */

const ROOT = process.env.ADD_MEMBER_BRANCH_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, FORM)),
    `${ROOT} is not the repository root: no ${FORM}. Run from the root, or set ADD_MEMBER_BRANCH_SPEC_ROOT.`);
});

test('a single branch option is the default', () => {
  const src = read(FORM);
  // ONE option, named as such -- not a bare `branchOptions[0]`, which would
  // also read the first of several.
  assert.match(src, /const soleBranch = branchOptions\.length === 1 \? branchOptions\[0\] : null;/,
    'the sole branch must be derived from a list of exactly one');
  assert.match(src, /setBranch\(soleBranch\)/,
    'the sole branch must actually be put in the field');
});

test('the default never overwrites a branch already chosen', () => {
  const src = read(FORM);
  // Every clause in this guard matters; asserting the whole line is what
  // stops a later edit dropping half of it.
  assert.match(src, /if \(!soleBranch \|\| branch\) return;/,
    'a non-empty branch -- her stored one on the Edit form -- must stop the default');
  assert.match(src, /if \(editing && !seeded\) return;/,
    'an edit still waiting for her record must not be defaulted into');
});

test('the branch row is still a picker, not a locked field', () => {
  const src = read(FORM);
  // The default is a default. Two or more branches are still picked by hand,
  // and the one-branch case can still be opened -- so the row keeps both its
  // press path and its list.
  assert.match(src, /testID="member-branch"[\s\S]{0,400}?setPicker\('branch'\)/,
    'the branch row must still open its picker');
  assert.match(src, /options=\{branchOptions\.map\(label => \(\{ label \}\)\)\}/,
    'the picker must still list every branch the course runs at');
  // Zero options still refuses rather than filling anything.
  assert.ok(src.includes('does not run at any branch yet'),
    'a course with no offering must still say so');
});
