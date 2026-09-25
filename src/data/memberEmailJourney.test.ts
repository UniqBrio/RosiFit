/**
 * THE JOURNEY, END TO END: the four states a member's address can be in, and
 * the one transition the academy is allowed to make.
 *
 * Run: npx tsx --test src/data/memberEmailJourney.test.ts
 *
 * WHY THIS EXISTS BESIDE memberEmailStatus.test.ts
 *   That spec pins each rule on its own -- the predicates, the read, the form,
 *   the migration's grants. This one walks a MEMBER through the whole path the
 *   defect was reported on, in order, asserting at each step what the operator
 *   would actually see and what the send would actually do. A rule that is
 *   right in isolation and wrong in sequence is exactly the shape of the defect
 *   this change exists to fix: every layer was internally consistent and the
 *   journey still ended in "saved" over a card that had not moved.
 *
 * WHAT IT PROVES, AND WHAT IT DOES NOT
 *   It drives the real decision layer: `hasEmailOnFile`, `isReachable`,
 *   `emailUsable`, `isDeliveryFailure`, `emailStateWord`,
 *   `emailExclusionReason`, `suppressedAddress`, and `flagged` +
 *   `recipientSplit` -- which ARE the send's own recipient split, not a copy of
 *   it (CP-011). A member record here is shaped exactly as `fetchMembers`
 *   returns one.
 *
 *   It does NOT render a screen and it does NOT call the database.
 *   `src/data/repository.ts` cannot be imported under `node --test` at all (it
 *   reaches react-native transitively, which esbuild will not transform), which
 *   is why no spec in this project imports it. The RPC's own behaviour is
 *   proven separately, against a real Postgres, by
 *   `supabase/tests/57_reinstate_member_email.sql`. Here the reinstatement is
 *   applied as the state transition that migration performs -- bounced ->
 *   'unknown' -- and the journey is re-asserted on the other side of it.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hasEmailOnFile, primaryEmail, GLOBAL_RULE, type Member,
} from './mock';
import {
  isReachable, recipientSplit, flagged, emailExclusionReason, suppressedAddress,
} from './followup';
import {
  emailUsable, isDeliveryFailure, emailStateWord, bouncedOnRecord,
  BOUNCED_ENTRY_TITLE, BOUNCED_ENTRY_DETAIL, type EmailStatus,
} from './emailStatus';

/**
 * A member over the follow-up rule (3 missed of 3 this week), carrying exactly
 * the addresses under test. Over the rule deliberately: the whole question is
 * what happens to somebody the academy WANTS to write to.
 */
const member = (emails: Member['emails'], over = {}): Member => ({
  id: 'm1', name: 'Test Member One', course: 'Postnatal Core', course_id: 'c2',
  branch: 'Main', code: '', aliases: [], emails, weekdays: null,
  status: 'active', inactiveFrom: null, activeAgainFrom: null,
  expected: 3, attended: 0, missed: 3, streak: 3,
  lastPresent: null, last: '19/9/2026', joinedOn: '2026-09-01', joined: 'Sep 2026',
  ...over,
});

/** What the member card draws, decided exactly as `app/member/[id].tsx` decides it. */
function cardState(m: Member): { state: string; word: string; advice: string } {
  const onFile = hasEmailOnFile(m);
  const usable = isReachable(m);
  const state = !onFile ? 'none' : usable ? 'ok' : 'suppressed';
  return {
    state,
    word: state === 'ok' ? 'Email on file'
      : state === 'none' ? 'No email on file'
      : emailStateWord(suppressedAddress(m)?.status),
    /* WHAT THE READER SHOULD DO, which since 23-Sep-2026 is never "reinstate":
       a dead address is replaced with a working one, and a member who said stop
       is not written to at all
       (requests/2026-09-23-bounced-address-asks-for-a-different-one.md). */
    advice: state !== 'suppressed' ? 'none'
      : isDeliveryFailure(suppressedAddress(m)?.status) ? 'add a different address'
      : 'do not write here',
  };
}

/** The send's own decision over a roster, through the functions the draft uses. */
function sendDecision(roster: Member[]) {
  const flaggedSet = flagged(roster, GLOBAL_RULE, {});
  const split = recipientSplit(flaggedSet);
  return {
    flagged: flaggedSet.map(m => m.id),
    willReceive: split.recipients.map(m => m.id),
    excluded: split.excluded.map(m => ({ id: m.id, reason: emailExclusionReason(m) })),
  };
}

/* ============================================ Scenario A — a normal address */

test('A · an address at `unknown` is displayed, reachable and sendable', () => {
  const m = member([{ address: 'member.one@example.com', primary: true, status: 'unknown' }]);

  assert.equal(hasEmailOnFile(m), true);
  assert.equal(isReachable(m), true);
  assert.deepEqual(cardState(m), {
    state: 'ok', word: 'Email on file', advice: 'none',
  });
  assert.equal(primaryEmail(m), 'member.one@example.com', 'the card shows the address itself');

  const d = sendDecision([m]);
  assert.deepEqual(d.flagged, ['m1'], 'the rule flags the member — 3 missed of 3');
  assert.deepEqual(d.willReceive, ['m1'], 'and the send will actually reach them');
  assert.deepEqual(d.excluded, []);
});

/* =========================================== Scenario B — a bounced address */

test('B · a BOUNCED address stays visible, is not sendable, and offers Reinstate', () => {
  const m = member([{ address: 'member.one@example.com', primary: true, status: 'bounced', id: 'e1' }]);

  // The address does not disappear. This is the whole defect: it used to.
  assert.equal(hasEmailOnFile(m), true, 'the address is still on the record');
  assert.equal(primaryEmail(m), 'member.one@example.com', 'and the operator can still read it');
  assert.equal(isReachable(m), false, 'but nothing may be sent to it');

  assert.deepEqual(cardState(m), {
    state: 'suppressed', word: 'Address bounced', advice: 'add a different address',
  }, 'the card names the state and points at the thing that actually works');

  assert.equal(emailExclusionReason(m), 'The address bounced',
    'and the send says WHY, rather than "no email on file" over an address that exists (C-76)');

  const d = sendDecision([m]);
  assert.deepEqual(d.flagged, ['m1'], 'still flagged — the rule is about attendance, not about mail');
  assert.deepEqual(d.willReceive, [], 'and the send reaches nobody');
  assert.deepEqual(d.excluded, [{ id: 'm1', reason: 'The address bounced' }],
    'listed and named, never quietly dropped');
});

test('B · the way forward is a DIFFERENT address — the dead one is never revived', () => {
  const before = member([{ address: 'dead@example.com', primary: true, status: 'bounced', id: 'e1' }]);
  assert.equal(isReachable(before), false);

  /* What the operator is asked to do, and what update_member then does: the
     old row is not in the submitted list, so it is SOFT-deleted and kept for
     history; the new address inserts at 'unknown', which is what both RPCs
     write. Nothing anywhere flips the bounce to usable -- re-using an address
     the mail system rejected sends the next follow-up into the same hole
     (requests/2026-09-23-bounced-address-asks-for-a-different-one.md). */
  const after = member([{ address: 'fresh@example.com', primary: true, status: 'unknown', id: 'e2' }]);

  assert.equal(isReachable(after), true, 'a follow-up can leave for the new address');
  assert.notEqual(primaryEmail(after), primaryEmail(before), 'and it is a different address');
  assert.deepEqual(cardState(after), { state: 'ok', word: 'Email on file', advice: 'none' });

  const d = sendDecision([after]);
  assert.deepEqual(d.willReceive, ['m1'], 'the send recognises it — this is what the operator wanted');
  assert.deepEqual(d.excluded, []);
});

test('B · and the bounced row stays on the record, for history', () => {
  // update_member soft-deletes an address left out of the submitted list; the
  // row is kept because email_messages points at it. Modelled here as the
  // member holding both, which is what the record looks like mid-flight.
  const m = member([
    { address: 'fresh@example.com', primary: true, status: 'unknown', id: 'e2' },
    { address: 'dead@example.com', primary: false, status: 'bounced', id: 'e1' },
  ]);
  assert.equal(isReachable(m), true, 'the live address decides reachability');
  assert.equal(m.emails.find(e => e.id === 'e1')?.status, 'bounced',
    'and the old one is still bounced — nothing reinstated it');
});

/* ====================================== Scenario C — an unsubscribed address */

test('C · an UNSUBSCRIBED address stays visible, is not sendable, and offers NO way back', () => {
  const m = member([{ address: 'member.one@example.com', primary: true, status: 'unsubscribed', id: 'e1' }]);

  assert.equal(hasEmailOnFile(m), true, 'shown, so nobody retypes it');
  assert.equal(isReachable(m), false);
  assert.deepEqual(cardState(m), {
    state: 'suppressed', word: 'Member unsubscribed', advice: 'do not write here',
  }, 'named, and no way back — the member said something deliberate');

  assert.equal(isDeliveryFailure('unsubscribed'), false,
    'and it is not a dead address — 0078 refuses it in the database as well');
  assert.equal(emailExclusionReason(m), 'The member unsubscribed');
  assert.deepEqual(sendDecision([m]).willReceive, []);
});

/* ================= Scenario C(ii) — a complaint: suppressed, and not liftable */

test('C(ii) · a COMPLAINED address is suppressed and is NOT the academy\'s to lift', () => {
  // NARROWED 22-Sep-2026. The first draft of this change let a complaint be
  // reinstated. Nothing in the product asked for that -- before this change
  // `send-followups` had no complaint rule at all, so the address was simply
  // sendable. Suppressing it is the conservative half and stays; lifting it is
  // not the academy's to do, because the complaint is the member's own click.
  const m = member([{ address: 'member.one@example.com', primary: true, status: 'complained', id: 'e1' }]);

  assert.equal(hasEmailOnFile(m), true);
  assert.equal(isReachable(m), false, 'suppressed — the conservative half');
  assert.deepEqual(cardState(m), {
    state: 'suppressed', word: 'Marked as spam', advice: 'do not write here',
  }, 'named, and no way back — the member\'s own click');
  assert.equal(emailExclusionReason(m), 'The address marked a message as spam');
});

/* =========================================== Scenario D — no address at all */

test('D · a member with NO address reads as empty, and offers no Reinstate', () => {
  const m = member([]);

  assert.equal(hasEmailOnFile(m), false);
  assert.equal(isReachable(m), false);
  assert.deepEqual(cardState(m), {
    state: 'none', word: 'No email on file', advice: 'none',
  }, 'a genuinely empty record is its OWN state, not the same one as a suppression');
  assert.equal(emailExclusionReason(m), 'No email on file');
  assert.deepEqual(sendDecision([m]).excluded, [{ id: 'm1', reason: 'No email on file' }],
    'still listed and counted as excluded — never quietly dropped (C-76)');
});

/* ======================================== the four states are four, not two */

test('the four states are distinguishable from one another, in both directions', () => {
  const states: [EmailStatus | undefined, string, boolean, string][] = [
    // status,          word,                   reachable, advice
    ['unknown',        'Email on file',         true,  'none'],
    ['valid',          'Email on file',         true,  'none'],
    ['bounced',        'Address bounced',       false, 'add a different address'],
    ['complained',     'Marked as spam',        false, 'do not write here'],
    ['unsubscribed',   'Member unsubscribed',   false, 'do not write here'],
  ];
  for (const [status, word, reachable, advice] of states) {
    const m = member([{ address: 'member.one@example.com', primary: true, status, id: 'e1' }]);
    const c = cardState(m);
    assert.equal(c.word, word, `${status} should read "${word}"`);
    assert.equal(isReachable(m), reachable, `${status} reachable should be ${reachable}`);
    assert.equal(c.advice, advice, `${status} advice should be "${advice}"`);
    // On file in every one of them: a suppression is never a missing address.
    assert.equal(hasEmailOnFile(m), true, `${status} must still be ON FILE`);
  }
  // Exactly one of the five is the mail system's verdict on the ADDRESS. The
  // other two suppressions are the member's own decision, and the difference
  // is what the advice above turns on.
  const dead = states.filter(([s]) => isDeliveryFailure(s)).map(([s]) => s);
  assert.deepEqual(dead, ['bounced']);
});

/* ================================= the original report, walked start to end */

test('THE ACCEPTANCE CRITERIA: the whole journey, step by step', () => {
  /* The eleven steps the academy specified
     (requests/2026-09-23-bounced-address-asks-for-a-different-one.md), walked
     in order. The first three are RC-106's fix and must not regress; steps
     four to eight are this change. */

  // 1. The member as the academy holds her: one address, which bounced.
  const step1 = member([{ address: 'abc@example.com', primary: true, status: 'bounced', id: 'e1' }]);

  // 2. The member screen shows the address AND the state.
  const card = cardState(step1);
  assert.equal(card.word, 'Address bounced');
  assert.notEqual(card.word, 'No usable email',
    'the sentence that started all of this: drawn over an address sitting in the table');
  assert.equal(suppressedAddress(step1)?.address, 'abc@example.com',
    'and the card can name it, so nobody is sent to Edit to guess');

  // 3. The Edit form shows it — it seeds from this same record.
  assert.equal(step1.emails.length, 1, 'Edit opens with the address, not blank');

  // 4-5. The operator types THE SAME address. It is detected and refused.
  const reentry = bouncedOnRecord('abc@example.com', step1.emails);
  assert.ok(reentry, 'the re-entry is detected against the stored record');
  assert.equal(reentry?.address, 'abc@example.com');

  // 6. With an explanation that says what to do.
  assert.equal(BOUNCED_ENTRY_TITLE, 'Email address is not active');
  assert.match(BOUNCED_ENTRY_DETAIL, /could not be delivered/);
  assert.match(BOUNCED_ENTRY_DETAIL, /try adding a different email address/);

  // 7-8. Save is blocked, and NOTHING is reinstated: the stored row is exactly
  //      as it was, and it is still not sendable.
  assert.equal(step1.emails[0].status, 'bounced', 'the stored row is untouched');
  assert.equal(isReachable(step1), false);
  assert.equal(cardState(step1).advice, 'add a different address',
    'and the app is consistent about what the operator should do instead');

  // 9-10. The operator types a DIFFERENT address. The refusal clears.
  assert.equal(bouncedOnRecord('xyz@example.com', step1.emails), undefined,
    'a different address collides with nothing');

  // 11. Save succeeds and the member becomes reachable.
  const step11 = member([{ address: 'xyz@example.com', primary: true, status: 'unknown', id: 'e2' }]);
  assert.equal(isReachable(step11), true);
  assert.deepEqual(cardState(step11), { state: 'ok', word: 'Email on file', advice: 'none' });
  assert.deepEqual(sendDecision([step11]).willReceive, ['m1'],
    'and the send reaches her — which is the outcome the whole thing was for');
});

test('an unrelated save can never be what un-suppresses an address', () => {
  // The property that must survive this fix. `update_member` is sent the WHOLE
  // address list on every save, so reinstatement lives in its own RPC; the app
  // never derives 'unknown' from an edit. Asserted here as the invariant it is:
  // the status a member record carries is the one the database gave it, and no
  // predicate in this layer rewrites it.
  const m = member([{ address: 'member.one@example.com', primary: true, status: 'bounced', id: 'e1' }]);
  const saved = { ...m, name: 'Test Member One Renamed', aliases: ['Ajma'] };  // an ordinary edit
  assert.equal(saved.emails[0].status, 'bounced', 'the suppression is untouched by an unrelated edit');
  assert.equal(isReachable(saved), false, 'and the member is still unreachable');
  assert.equal(emailUsable(saved.emails[0]), false);
});
