/**
 * Cases for who a follow-up reaches and who it cannot.
 *
 * Run: npx tsx --test src/data/recipients.test.ts
 *
 * The send draft has no per-member selection any more -- the recipients ARE
 * the flagged set -- so this split IS the screen. C-76 is the rule it holds:
 * a member with no address is excluded and NAMED, never quietly dropped from
 * a list that then reads as complete.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { recipientSplit } from './followup';
import type { Member } from './mock';

const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', name: 'Test Member',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  expected: 6, attended: 0, missed: 6, streak: 6, last: '—', ...over,
});

test('a member with an address is a recipient', () => {
  const { recipients, excluded } = recipientSplit([member()]);
  assert.equal(recipients.length, 1);
  assert.equal(excluded.length, 0);
});

test('a member with NO address is excluded and kept, not dropped', () => {
  // C-76. She is over the threshold and cannot be emailed. Removing her from
  // both lists would leave a draft that reads as complete while it silently
  // skips somebody the rule named.
  const { recipients, excluded } = recipientSplit([member({ emails: [] })]);
  assert.equal(recipients.length, 0);
  assert.deepEqual(excluded.map(m => m.name), ['Test Member']);
});

test('the two halves account for EVERY flagged member', () => {
  const flagged = [
    member({ id: 'a' }),
    member({ id: 'b', emails: [] }),
    member({ id: 'c' }),
    member({ id: 'd', emails: [] }),
  ];
  const { recipients, excluded } = recipientSplit(flagged);
  assert.equal(recipients.length + excluded.length, flagged.length);
  assert.deepEqual(
    [...recipients, ...excluded].map(m => m.id).sort(),
    ['a', 'b', 'c', 'd']);
});

test('an empty flagged set produces two empty lists, not a throw', () => {
  assert.deepEqual(recipientSplit([]), { recipients: [], excluded: [] });
});

test('an empty address list is no address', () => {
  assert.equal(recipientSplit([member({ emails: [] })]).recipients.length, 0);
});

test('a non-primary address still counts as reachable', () => {
  // She can be written to. Which address is primary is a different question
  // from whether one exists.
  const { recipients } = recipientSplit([
    member({ emails: [{ address: 'x@y.com', primary: false }] }),
  ]);
  assert.equal(recipients.length, 1);
});

test('order is preserved inside each half', () => {
  const { recipients } = recipientSplit([
    member({ id: 'a', name: 'Aarthi' }),
    member({ id: 'b', name: 'Divya' }),
  ]);
  assert.deepEqual(recipients.map(m => m.name), ['Aarthi', 'Divya']);
});
