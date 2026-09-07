/**
 * Cases for the opening letter of a refusal the database wrote.
 *
 * Run: npx tsx --test src/data/refusalCase.test.ts
 *
 * "the display name "ani" already belongs to another member. Nothing has been
 * saved." >> "The display name "ani" already belongs to another member."
 * — a case-sensitive correction (requests/2026-09-07-display-name-refusal-clears-and-case.md).
 *
 * Every `raise exception` in supabase/migrations/ opens lowercase, and the
 * banner in the member dialog shows one of them as its only sentence. What is
 * pinned here is that the correction touches the FIRST LETTER and nothing
 * else: a refusal is the operator's evidence about what the database refused,
 * so a helper that also trimmed, re-punctuated or reworded it would be
 * rewriting the answer while claiming to fix its capitalisation.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { sentenceOpening, namesADisplayName } from './refusalCase';

test('the reported refusal opens with a capital', () => {
  // Byte-exact, and the quotes are STRAIGHT because that is what
  // 0026/0027 raise -- `raise exception 'the display name "%" already
  // belongs to another member'`. The sentence below, plus the guarantee
  // memberWriteError appends, is what the banner in the screenshot shows.
  const raised = 'the display name "ani" already belongs to another member';
  assert.equal(`${sentenceOpening(raised)}. Nothing has been saved.`,
    'The display name "ani" already belongs to another member. Nothing has been saved.');
});

test('nothing but the first letter changes', () => {
  // The quoted name keeps its own case: "ani" does not become "Ani". What she
  // typed is evidence about which name clashed, not prose to be tidied.
  assert.equal(
    sentenceOpening('the address "ani@g.com" is already on another member'),
    'The address "ani@g.com" is already on another member');
});

test('a sentence already written for a person is returned untouched', () => {
  // The fallbacks in repository.ts open with a capital already, so the helper
  // has to be a no-op over them -- it runs on both, and one of the two must
  // not be reshaped on the way past.
  const written = 'The member could not be saved';
  assert.equal(sentenceOpening(written), written);
});

test('applying it twice says the same thing as applying it once', () => {
  const once = sentenceOpening('the subscription is not writable, so nothing was merged');
  assert.equal(sentenceOpening(once), once);
});

test('a message opening with no letter comes back unchanged', () => {
  // 0032_merge_member.sql interpolates the member's own name at the front
  // of its refusal, and other refusals open on a quote or a digit. Raising
  // a character that has no upper case must leave the sentence alone rather
  // than invent one. (That merge refusal does not reach memberWriteError,
  // and must not start to: a member recorded as "ani" would be misquoted
  // as "Ani" -- the one case where raising a letter changes a fact.)
  assert.equal(sentenceOpening('“Rani Sham” is already a display name'),
    '“Rani Sham” is already a display name');
  assert.equal(sentenceOpening('3 rows need a decision'), '3 rows need a decision');
});

test('an empty message stays empty', () => {
  // memberWriteError falls back before this runs, so an empty string here
  // means something upstream changed -- it must not become a crash.
  assert.equal(sentenceOpening(''), '');
});

// ------------------------------------------------- namesADisplayName
/**
 * The member dialog's banner is one state holding whichever refusal came
 * back, and the form clears it only when she starts changing the thing it is
 * about. These cases are the boundary of that "only".
 */

test('both display-name refusals a member write can raise are recognised', () => {
  // 0026/0027 -- the one in the report.
  assert.ok(namesADisplayName('the display name "ani" already belongs to another member'));
  // 0011's alias trigger, the other way a display name is refused.
  assert.ok(namesADisplayName('a display name must contain at least one letter or digit'));
});

test('it is recognised whatever case the sentence arrived in', () => {
  // It runs on the banner's text, which has been through sentenceOpening --
  // so it must hold on both sides of that.
  assert.ok(namesADisplayName('The display name "ani" already belongs to another member'));
});

test('the refusals that share the banner are NOT display-name refusals', () => {
  // Each of these can be showing when she starts typing a display name, and
  // each must survive it: dismissing an address clash under a keystroke aimed
  // at something else takes an unread refusal off the screen.
  for (const other of [
    'the address "ani@g.com" is already on another member',
    'her days must be days the course actually runs (Mon, Wed)',
    'that course is not offered at that branch',
    'the subscription is not writable, so nothing can be added',
    'her name is longer than 120 characters',
    'Her status could not be changed',
  ]) assert.equal(namesADisplayName(other), false, other);
});

test('an empty banner is not a display-name refusal', () => {
  assert.equal(namesADisplayName(''), false);
});
