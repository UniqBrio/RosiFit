/**
 * A member who is not ACTIVE is never followed up.
 *
 * This is not a new rule. `public.follow_up_candidates()` (0009) has carried
 * `m.status = 'active'` in its WHERE clause since the day it was written --
 * so until `Member.status` was carried through, the app's derivation and the
 * database's disagreed the moment anybody's status left 'active': the app
 * would list her, count her on the dashboard and offer to mail her, and the
 * server-side candidate query would not.
 *
 * These are the assertions that keep the two ends agreeing. Guardrail 1 says
 * the follow-up list is DERIVED from one member list; it is only worth
 * anything if the derivation reads the same columns the engine does.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { isEligible, isFollowable, ruleHits, flagged } from './followup';
import type { Member, FollowUpRule } from './mock';

const RULE: FollowUpRule = {
  source: 'global',
  weekly_enabled: true, weekly_threshold: 3,
  consecutive_enabled: true, consecutive_threshold: 3,
  combination: 'OR',
};

/** Somebody who fires BOTH conditions, so nothing but the status can be the
 *  reason she is left out below. */
const member = (over: Partial<Member> = {}): Member => ({
  id: 'm', code: '', name: 'Test Member',
  course: 'Prenatal Flow', branch: 'Coimbatore',
  aliases: [], emails: [{ address: 'a@b.com', primary: true }],
  status: 'active',
  expected: 6, attended: 0, missed: 6, streak: 6, last: '—', joined: 'Mar 2026', ...over,
});

test('an active member who meets the rule is eligible', () => {
  assert.equal(isEligible(member(), RULE), true);
});

test('an inactive member who meets the rule is NOT eligible', () => {
  assert.equal(isEligible(member({ status: 'inactive' }), RULE), false);
});

test('paused is read the same way as inactive — not active, so not followed up', () => {
  assert.equal(isEligible(member({ status: 'paused' }), RULE), false);
});

test('her figures are not rewritten — she is excluded, not zeroed', () => {
  // The card still shows what she missed. Being off the register stops the
  // academy writing to her; it does not edit her attendance.
  const off = member({ status: 'inactive' });
  assert.deepEqual(ruleHits(off, RULE), { weekly: true, consecutive: true });
  assert.equal(off.missed, 6);
});

test('isFollowable is the whole of the condition, and it names the column', () => {
  assert.equal(isFollowable(member()), true);
  assert.equal(isFollowable(member({ status: 'inactive' })), false);
});

test('the flagged set drops her, so the dashboard and the send draft do too', () => {
  const set = [
    member({ id: 'a', name: 'On the register' }),
    member({ id: 'b', name: 'Off the register', status: 'inactive' }),
  ];
  assert.deepEqual(flagged(set, RULE).map(m => m.name), ['On the register']);
});

test('marking her active again puts her straight back', () => {
  const off = member({ status: 'inactive' });
  assert.equal(isEligible(off, RULE), false);
  assert.equal(isEligible({ ...off, status: 'active' }, RULE), true);
});
