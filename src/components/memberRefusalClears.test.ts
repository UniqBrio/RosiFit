import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "As soon as user started changing the display name, remove this message
 * from display" (requests/2026-09-07-display-name-refusal-clears-and-case.md).
 *
 * A refused save leaves its sentence in a banner at the foot of the member
 * dialog, and the sentence names the display name that is taken. The answer
 * to it is to change that name -- so while "anit" was being typed into the
 * box, the banner underneath still read "the display name "ani" already
 * belongs to another member. Nothing has been saved." about a value the form
 * no longer held.
 *
 * Three gestures change the display name and all three clear it: typing in
 * the draft (`changeAliasDraft`), committing a draft as a row (`addAlias` --
 * which is also what blur runs, addMemberDraftCommit.test.ts), and removing a
 * row. What this spec pins is that none of the three is dropped later: a
 * clear on the keystroke alone would leave the likeliest fix of all, taking
 * the clashing name off, staring at the refusal it just resolved.
 *
 * It also pins what must NOT spread: the refusal is not cleared by editing
 * her name, her addresses or her days. The request named the display name,
 * and a banner that vanishes when an unrelated field is touched is a refusal
 * the operator never got to read.
 *
 * Source-reading, like addMemberDraftCommit.test.ts beside it -- there is no
 * component harness in this project.
 */

const ROOT = process.env.MEMBER_REFUSAL_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, FORM)),
    `${ROOT} is not the repository root: no ${FORM}. Run from the root, or set MEMBER_REFUSAL_SPEC_ROOT.`);
});

test('typing in the display-name box clears the refusal', () => {
  const src = read(FORM);
  assert.match(src, /const changeAliasDraft = \([^)]*\) => \{[^}]*clearRefusal\(\)/,
    'changeAliasDraft must clear the refusal before it records the keystroke');
  assert.match(src, /testID="member-alias"[\s\S]{0,120}onChange=\{changeAliasDraft\}/,
    'the display-name AddRow must be wired to changeAliasDraft, not straight to setAliasDraft');
});

test('committing a display name clears the refusal', () => {
  const src = read(FORM);
  const addAlias = src.slice(src.indexOf('const addAlias ='), src.indexOf('const addEmail ='));
  assert.ok(addAlias.includes('clearRefusal()'),
    'addAlias must clear the refusal -- it is what + Add, Enter and blur all run');
  // The duplicate refusal returns BEFORE the clear: nothing changed, so
  // nothing about the banner should change either.
  assert.ok(addAlias.indexOf('already on her record') < addAlias.indexOf('clearRefusal()'),
    'the on-record duplicate must still return before anything is cleared');
});

test('removing a display name clears the refusal', () => {
  const src = read(FORM);
  assert.match(src, /member-alias-remove-\$\{a\}[\s\S]{0,160}clearRefusal\(\)[\s\S]{0,120}setAliases/,
    'the Remove control must clear the refusal as well as drop the row');
});

test('only a refusal ABOUT a display name is cleared', () => {
  const src = read(FORM);
  // The banner is one state holding whichever refusal came back. Clearing it
  // wholesale would dismiss a half-read address clash under a keystroke aimed
  // at the display-name box -- the request asked for THIS message to go, not
  // for the banner to empty.
  assert.match(src, /const clearRefusal = \(\) => setRefusal\([^)]*namesADisplayName\(/,
    'clearRefusal must gate on the refusal naming a display name');
  assert.match(src, /import \{ namesADisplayName \} from '\.\.\/\.\.\/src\/data\/refusalCase'/,
    'the phrase belongs to src/data/refusalCase.ts, where a spec can reach it');
  // Functional update, not a read of `refusal` from the closure: these
  // handlers are wired into onChange/onPress and would otherwise clear
  // against whatever the banner held when the handler was last built.
  assert.match(src, /setRefusal\(r => \(r &&/,
    'the gate must read the CURRENT refusal, not a captured one');
});

test('the refusal is not cleared by the fields the request did not name', () => {
  const src = read(FORM);
  const addEmail = src.slice(src.indexOf('const addEmail ='), src.indexOf('const save ='));
  assert.ok(!addEmail.includes('clearRefusal()'),
    'adding an address must not clear a refusal about a display name');
  assert.match(src, /testID="member-email"[\s\S]{0,120}onChange=\{setEmailDraft\}/,
    'the email AddRow stays wired straight to its draft setter');
});

test('the save still clears the refusal it is about to replace', () => {
  const src = read(FORM);
  const save = src.slice(src.indexOf('const save ='));
  assert.match(save.slice(0, 600), /setSaving\(true\);\s*\n\s*setRefusal\(null\);/,
    'a new attempt must not run underneath the previous attempt\u2019s sentence');
});
