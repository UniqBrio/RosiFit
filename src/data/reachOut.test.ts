/**
 * Cases for what the member pop-up says about her next email, and for when
 * Reach out asks before it acts
 * (requests/2026-09-07-reach-out-already-sent-and-rule-label.md).
 *
 * Run: npx tsx --test src/data/reachOut.test.ts
 *
 * The two strings the requester wrote are asserted BYTE-EXACT, capitals,
 * comma and all. They are the request's binding content, and a later "tidy"
 * of the comma into an en dash would be a product change nobody approved
 * (the freeze rule) that no other test would notice.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { reachOutState, REACH_OUT, warnsBeforeReachOut } from './reachOut';
import { mergeSent, sentOn, sentLabel } from './sent';

test('the rule decides first, and not being flagged is not a fault', () => {
  // Every other fact about her is irrelevant while the rule says no: this is
  // the screenshot's member -- 0 expected, an address on file, never
  // contacted -- and the answer is that nothing is owed to her.
  assert.equal(reachOutState({ ruleMet: false, hasEmail: true }), 'rule-not-met');
  assert.equal(reachOutState({ ruleMet: false, hasEmail: false }), 'rule-not-met');
  assert.equal(reachOutState({ ruleMet: false, hasEmail: true, sentAt: '2026-09-03T09:00:00Z' }),
    'rule-not-met');
  // Neutral, not a warning tone: "nobody needs following up" is good news and
  // must not read like a failure, which is the same rule the weekly screen's
  // empty state already follows.
  assert.equal(REACH_OUT['rule-not-met'].tone, 'none');
});

test('the two strings the requester wrote are byte-exact', () => {
  assert.equal(REACH_OUT['rule-not-met'].text, 'Rule is not met, No email to send');
  assert.equal(REACH_OUT.sent.text, 'Rule is met, Email sent');
});

test('a flagged member nobody has written to does NOT read "Email sent"', () => {
  // RC-017 was "the app said SENT for an email it never sent". This is the
  // same claim one layer up, and this assertion is what stops it.
  const s = reachOutState({ ruleMet: true, hasEmail: true });
  assert.equal(s, 'unsent');
  assert.equal(REACH_OUT[s].text, 'Rule is met, Email not sent yet');
  assert.notEqual(REACH_OUT[s].text, REACH_OUT.sent.text);
});

test('a flagged member with no address has no email to send either', () => {
  // She is excluded from every send and stays counted (C-76). The words are
  // the requester's own, recombined -- no new vocabulary for a case she did
  // not write a string for.
  const s = reachOutState({ ruleMet: true, hasEmail: false });
  assert.equal(s, 'no-address');
  assert.equal(REACH_OUT[s].text, 'Rule is met, No email to send');
  // Missing address wins over an old stamp: if the address has since gone,
  // nothing can leave now, whatever left before.
  assert.equal(reachOutState({ ruleMet: true, hasEmail: false, sentAt: '2026-09-03T09:00:00Z' }),
    'no-address');
});

test('a send this period is what turns the label to "Email sent"', () => {
  assert.equal(reachOutState({ ruleMet: true, hasEmail: true, sentAt: '2026-09-03T09:00:00Z' }),
    'sent');
});

test('every state carries a word AND an icon, never a colour alone', () => {
  // Guardrail 3 / CP-010, asserted rather than assumed: a state added later
  // with a tone and no glyph fails here instead of shipping a blank box.
  for (const [state, l] of Object.entries(REACH_OUT)) {
    assert.ok(l.text.length > 0, `${state} has no word`);
    assert.ok(l.icon.length > 0, `${state} has no icon`);
    assert.ok(l.tone.length > 0, `${state} has no tone`);
  }
});

test('Reach out warns only when a message has actually gone out', () => {
  // A warning, not a bar: the ordinary case -- nothing sent yet -- must not
  // acquire a dialog in front of the button it exists for.
  assert.equal(warnsBeforeReachOut('2026-09-03T09:00:00Z'), true);
  assert.equal(warnsBeforeReachOut(undefined), false);
});

test('the warning asks about the SEND, not about the rule', () => {
  // It takes the stamp rather than the state deliberately. Two members would
  // otherwise go quietly through: one emailed this week whose figures have
  // since been corrected so the rule no longer flags her, and ANY member in
  // the moment before the rule has loaded, when there is no state to read.
  const sentAt = '2026-09-03T09:00:00Z';
  assert.equal(reachOutState({ ruleMet: false, hasEmail: true, sentAt }), 'rule-not-met');
  // the state says nothing is owed; the warning still fires, because one went
  assert.equal(warnsBeforeReachOut(sentAt), true);
});

test('the warning reads the same merged history the send draft marks rows from', () => {
  // The pop-up must not be able to say "never contacted" over a send this
  // session already made. mergeSent is the one answer both read.
  const server = { m1: '2026-09-03T09:00:00Z' };
  const thisSession = { m2: '2026-09-05T11:00:00Z' };
  const sent = mergeSent(server, thisSession);
  assert.equal(reachOutState({ ruleMet: true, hasEmail: true, sentAt: sent.m1 }), 'sent');
  assert.equal(reachOutState({ ruleMet: true, hasEmail: true, sentAt: sent.m2 }), 'sent');
  assert.equal(reachOutState({ ruleMet: true, hasEmail: true, sentAt: sent.m3 }), 'unsent');
});

test('one date formatter, so the row and the warning cannot name different days', () => {
  // sentOn was extracted from sentLabel for the warning sentence; the row's
  // own label must be unchanged by that extraction.
  const at = '2026-09-03T09:00:00Z';
  assert.equal(sentLabel(at), `Sent ${sentOn(at)}`);
  // A stamp that is not a date has no day to name, and the row still says
  // something true rather than "Sent Invalid Date".
  assert.equal(sentOn('not-a-date'), null);
  assert.equal(sentLabel('not-a-date'), 'Already sent');
});
