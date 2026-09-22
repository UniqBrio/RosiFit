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
 *   `emailUsable`, `suppressionLiftable`, `emailStateWord`,
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
import { emailUsable, suppressionLiftable, emailStateWord, type EmailStatus } from './emailStatus';

/**
 * A member over the follow-up rule (3 missed of 3 this week), carrying exactly
 * the addresses under test. Over the rule deliberately: the whole question is
 * what happens to somebody the academy WANTS to write to.
 */
const member = (emails: Member['emails'], over = {}): Member => ({
  id: 'm1', name: 'Ajma Tenkasi', course: 'Postnatal Core', course_id: 'c2',
  branch: 'Main', code: '', aliases: [], emails, weekdays: null,
  status: 'active', inactiveFrom: null, activeAgainFrom: null,
  expected: 3, attended: 0, missed: 3, streak: 3,
  lastPresent: null, last: '19/9/2026', joinedOn: '2026-09-01', joined: 'Sep 2026',
  ...over,
});

/** What the member card draws, decided exactly as `app/member/[id].tsx` decides it. */
function cardState(m: Member): { state: string; word: string; offersReinstate: boolean } {
  const onFile = hasEmailOnFile(m);
  const usable = isReachable(m);
  const state = !onFile ? 'none' : usable ? 'ok' : 'suppressed';
  return {
    state,
    word: state === 'ok' ? 'Email on file'
      : state === 'none' ? 'No email on file'
      : emailStateWord(suppressedAddress(m)?.status),
    offersReinstate: state === 'suppressed'
      && suppressionLiftable(suppressedAddress(m)?.status),
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
  const m = member([{ address: 'ajma@gmail.com', primary: true, status: 'unknown' }]);

  assert.equal(hasEmailOnFile(m), true);
  assert.equal(isReachable(m), true);
  assert.deepEqual(cardState(m), {
    state: 'ok', word: 'Email on file', offersReinstate: false,
  });
  assert.equal(primaryEmail(m), 'ajma@gmail.com', 'the card shows the address itself');

  const d = sendDecision([m]);
  assert.deepEqual(d.flagged, ['m1'], 'the rule flags the member — 3 missed of 3');
  assert.deepEqual(d.willReceive, ['m1'], 'and the send will actually reach them');
  assert.deepEqual(d.excluded, []);
});

/* =========================================== Scenario B — a bounced address */

test('B · a BOUNCED address stays visible, is not sendable, and offers Reinstate', () => {
  const m = member([{ address: 'ajma@gmail.com', primary: true, status: 'bounced', id: 'e1' }]);

  // The address does not disappear. This is the whole defect: it used to.
  assert.equal(hasEmailOnFile(m), true, 'the address is still on the record');
  assert.equal(primaryEmail(m), 'ajma@gmail.com', 'and the operator can still read it');
  assert.equal(isReachable(m), false, 'but nothing may be sent to it');

  assert.deepEqual(cardState(m), {
    state: 'suppressed', word: 'Address bounced', offersReinstate: true,
  }, 'the card names the state and offers the way out');

  assert.equal(emailExclusionReason(m), 'The address bounced',
    'and the send says WHY, rather than "no email on file" over an address that exists (C-76)');

  const d = sendDecision([m]);
  assert.deepEqual(d.flagged, ['m1'], 'still flagged — the rule is about attendance, not about mail');
  assert.deepEqual(d.willReceive, [], 'and the send reaches nobody');
  assert.deepEqual(d.excluded, [{ id: 'm1', reason: 'The address bounced' }],
    'listed and named, never quietly dropped');
});

test('B · after an explicit Reinstate, the same member becomes reachable', () => {
  const before = member([{ address: 'ajma@gmail.com', primary: true, status: 'bounced', id: 'e1' }]);
  assert.equal(isReachable(before), false);

  // The transition `reinstate_member_email` (0078) performs, and the ONLY one
  // it performs: bounced -> 'unknown'. Not 'valid' -- nothing has verified the
  // address, and nothing in the schema writes 'valid' at all.
  const after = member([{ address: 'ajma@gmail.com', primary: true, status: 'unknown', id: 'e1' }]);

  assert.equal(hasEmailOnFile(after), true, 'the address is the SAME address — reinstating is not re-adding');
  assert.equal(primaryEmail(after), primaryEmail(before), 'and it did not change');
  assert.equal(isReachable(after), true, 'and now a follow-up can leave');
  assert.deepEqual(cardState(after), {
    state: 'ok', word: 'Email on file', offersReinstate: false,
  });

  const d = sendDecision([after]);
  assert.deepEqual(d.willReceive, ['m1'], 'the send logic recognises it — this is what the operator was trying to achieve');
  assert.deepEqual(d.excluded, []);
});

/* ====================================== Scenario C — an unsubscribed address */

test('C · an UNSUBSCRIBED address stays visible, is not sendable, and offers NO way back', () => {
  const m = member([{ address: 'ajma@gmail.com', primary: true, status: 'unsubscribed', id: 'e1' }]);

  assert.equal(hasEmailOnFile(m), true, 'shown, so nobody retypes it');
  assert.equal(isReachable(m), false);
  assert.deepEqual(cardState(m), {
    state: 'suppressed', word: 'Member unsubscribed', offersReinstate: false,
  }, 'named, and NO Reinstate — the member said something deliberate');

  assert.equal(suppressionLiftable('unsubscribed'), false,
    'no screen may offer it, and 0078 refuses it in the database as well');
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
  const m = member([{ address: 'ajma@gmail.com', primary: true, status: 'complained', id: 'e1' }]);

  assert.equal(hasEmailOnFile(m), true);
  assert.equal(isReachable(m), false, 'suppressed — the conservative half');
  assert.deepEqual(cardState(m), {
    state: 'suppressed', word: 'Marked as spam', offersReinstate: false,
  }, 'named, and NO Reinstate — the narrowing');
  assert.equal(emailExclusionReason(m), 'The address marked a message as spam');
});

/* =========================================== Scenario D — no address at all */

test('D · a member with NO address reads as empty, and offers no Reinstate', () => {
  const m = member([]);

  assert.equal(hasEmailOnFile(m), false);
  assert.equal(isReachable(m), false);
  assert.deepEqual(cardState(m), {
    state: 'none', word: 'No email on file', offersReinstate: false,
  }, 'a genuinely empty record is its OWN state, not the same one as a suppression');
  assert.equal(emailExclusionReason(m), 'No email on file');
  assert.deepEqual(sendDecision([m]).excluded, [{ id: 'm1', reason: 'No email on file' }],
    'still listed and counted as excluded — never quietly dropped (C-76)');
});

/* ======================================== the four states are four, not two */

test('the four states are distinguishable from one another, in both directions', () => {
  const states: [EmailStatus | undefined, string, boolean, boolean][] = [
    // status,          word,                   reachable, offersReinstate
    ['unknown',        'Email on file',         true,  false],
    ['valid',          'Email on file',         true,  false],
    ['bounced',        'Address bounced',       false, true],
    ['complained',     'Marked as spam',        false, false],
    ['unsubscribed',   'Member unsubscribed',   false, false],
  ];
  for (const [status, word, reachable, offers] of states) {
    const m = member([{ address: 'a@b.com', primary: true, status, id: 'e1' }]);
    const c = cardState(m);
    assert.equal(c.word, word, `${status} should read "${word}"`);
    assert.equal(isReachable(m), reachable, `${status} reachable should be ${reachable}`);
    assert.equal(c.offersReinstate, offers, `${status} Reinstate offered should be ${offers}`);
    // On file in every one of them: a suppression is never a missing address.
    assert.equal(hasEmailOnFile(m), true, `${status} must still be ON FILE`);
  }
  // And exactly one of the five may ever be lifted.
  const liftable = states.filter(([s]) => suppressionLiftable(s)).map(([s]) => s);
  assert.deepEqual(liftable, ['bounced'],
    'exactly one state is the academy\'s to lift, and it is the bounce');
});

/* ================================= the original report, walked start to end */

test('THE ORIGINAL BUG: the whole reported journey, step by step', () => {
  // 1. The member as the academy actually held her: one address, bounced after
  //    the follow-up that went out on 19/9.
  const step1 = member([{ address: 'ajma@gmail.com', primary: true, status: 'bounced', id: 'e1' }]);

  // 2. The member screen shows the address AND the state.
  const card = cardState(step1);
  assert.equal(card.state, 'suppressed');
  assert.equal(card.word, 'Address bounced');
  assert.notEqual(card.word, 'No usable email',
    'the sentence that started this: drawn over an address sitting in the table');
  assert.equal(suppressedAddress(step1)?.address, 'ajma@gmail.com',
    'and the card can name the address, so nobody is sent to Edit to guess at it');

  // 3. The Edit form shows it — it seeds from this same record, and the record
  //    now carries the row instead of having had it filtered away.
  assert.equal(step1.emails.length, 1, 'Edit opens with the address, not blank');
  assert.ok(step1.emails[0].id, 'and with its row id, so Reinstate can name it by identity');

  // 4. Reinstate is offered, because a bounce is the academy's to lift.
  assert.equal(card.offersReinstate, true);

  // 5. The RPC moves the row bounced -> 'unknown' (proven against a real
  //    Postgres in supabase/tests/57_reinstate_member_email.sql).
  const step5 = member([{ address: 'ajma@gmail.com', primary: true, status: 'unknown', id: 'e1' }]);

  // 6/7. The member refreshes; the address is still there and still the same.
  assert.equal(hasEmailOnFile(step5), true);
  assert.equal(primaryEmail(step5), 'ajma@gmail.com');

  // 8. isReachable becomes true.
  assert.equal(isReachable(step5), true);

  // 9. The send recognises it — the ACTUAL split the draft uses.
  const d = sendDecision([step5]);
  assert.deepEqual(d.willReceive, ['m1']);
  assert.deepEqual(d.excluded, []);

  // And the card says so.
  assert.deepEqual(cardState(step5), {
    state: 'ok', word: 'Email on file', offersReinstate: false,
  });
});

test('an unrelated save can never be what un-suppresses an address', () => {
  // The property that must survive this fix. `update_member` is sent the WHOLE
  // address list on every save, so reinstatement lives in its own RPC; the app
  // never derives 'unknown' from an edit. Asserted here as the invariant it is:
  // the status a member record carries is the one the database gave it, and no
  // predicate in this layer rewrites it.
  const m = member([{ address: 'ajma@gmail.com', primary: true, status: 'bounced', id: 'e1' }]);
  const saved = { ...m, name: 'Ajma Tenkasi June', aliases: ['Ajma'] };  // an ordinary edit
  assert.equal(saved.emails[0].status, 'bounced', 'the suppression is untouched by an unrelated edit');
  assert.equal(isReachable(saved), false, 'and the member is still unreachable');
  assert.equal(emailUsable(saved.emails[0]), false);
});
