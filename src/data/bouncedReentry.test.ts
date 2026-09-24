/**
 * RE-ENTERING AN ADDRESS THAT HAS ALREADY BOUNCED.
 *
 * Run: npx tsx --test src/data/bouncedReentry.test.ts
 *
 * THE CHANGE (requests/2026-09-23-bounced-address-asks-for-a-different-one.md)
 *   RC-106 made a suppressed address VISIBLE and gave a bounce a way back: a
 *   Reinstate action calling `reinstate_member_email` (0078). The academy asked
 *   for the opposite answer, and it is the better one: an address the mail
 *   system has already rejected is not repaired by marking it un-rejected. The
 *   next follow-up goes into the same hole. So the form now REFUSES the
 *   re-entry, says why in words, and asks for a different address.
 *
 *   What is NOT changed, and is asserted here so it cannot drift:
 *     - the address stays ON THE RECORD and stays visible (RC-106's fix);
 *     - an opt-out keeps its own wording and its own refusal;
 *     - `unknown` and `valid` behave exactly as before;
 *     - no status is written by any of this -- the stored row is untouched.
 *
 * WHAT THIS SPEC PINS
 *   1. the rule itself: which stored address a typed one collides with, under
 *      the SAME normalisation the write path uses;
 *   2. the wording, in full, because the request specified it exactly;
 *   3. the form: it refuses the add, blocks Save, renders the message inline
 *      rather than as a toast, and no longer calls the reinstate RPC at all;
 *   4. accessibility: the whole sentence is reachable without hover.
 *
 * Group 3 reads source, the way memberEmailStatus.test.ts does -- there is no
 * component harness in this project, and the claims are about which branch a
 * form takes and what it renders.
 *
 * FAIL-FIRST: see TEST_SUMMARY.md. Every group was watched failing before the
 * change, and the two that could pass vacuously were mutation-tested instead.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  bouncedOnRecord, suppressedOnRecord, normalizeEmail, isDeliveryFailure, emailUsable,
  entryRefusal, BOUNCED_ENTRY_TITLE, BOUNCED_ENTRY_DETAIL, type EmailStatus,
} from './emailStatus';

const ROOT = process.env.BOUNCED_REENTRY_SPEC_ROOT ?? process.cwd();
const FORM = 'app/member/edit.tsx';
const CARD = 'app/member/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/** A member's stored addresses, as `fetchMembers` returns them. */
const record = (...rows: [string, EmailStatus][]) =>
  rows.map(([address, status], i) => ({ address, status, primary: i === 0, id: `e${i}` }));

test('the spec is looking at a real tree', () => {
  for (const rel of [FORM, CARD]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)),
      `${ROOT} is not the repository root: no ${rel}. Run from the root, or set BOUNCED_REENTRY_SPEC_ROOT.`);
  }
});

/* ------------------------------------------------------------- 1. the rule */

test('the same address, already bounced, is found', () => {
  const on = record(['abc@example.com', 'bounced']);
  assert.equal(bouncedOnRecord('abc@example.com', on)?.address, 'abc@example.com');
});

test('it is matched the way the DATABASE matches it, not the way a form might', () => {
  // update_member (0027) compares `btrim(lower(v_email))`, and member_emails.email
  // is citext on top of that. A form using a stricter or looser rule would
  // disagree with the database for exactly the inputs that matter.
  const on = record(['abc@example.com', 'bounced']);
  for (const typed of ['ABC@example.com', '  abc@example.com  ', 'Abc@Example.com', 'abc@EXAMPLE.COM']) {
    assert.ok(bouncedOnRecord(typed, on), `"${typed}" should collide with the stored address`);
  }
  assert.equal(normalizeEmail('  ABC@Example.COM '), 'abc@example.com');
});

test('a DIFFERENT address does not collide — this is the way forward', () => {
  const on = record(['abc@example.com', 'bounced']);
  assert.equal(bouncedOnRecord('xyz@example.com', on), undefined);
});

test('an address on the record that is NOT bounced does not trigger this at all', () => {
  // The refusal is specifically about a delivery failure. An opt-out is a
  // different conversation with its own wording; `unknown` and `valid` are
  // simply already there, which is not an error.
  for (const status of ['unknown', 'valid', 'unsubscribed', 'complained'] as EmailStatus[]) {
    assert.equal(bouncedOnRecord('abc@example.com', record(['abc@example.com', status])), undefined,
      `${status} must not be reported as a bounced re-entry`);
  }
});

test('an empty box is not an error', () => {
  assert.equal(bouncedOnRecord('', record(['abc@example.com', 'bounced'])), undefined);
  assert.equal(bouncedOnRecord('   ', record(['abc@example.com', 'bounced'])), undefined);
});

test('the bounced one is found among several addresses', () => {
  const on = record(['good@example.com', 'unknown'], ['dead@example.com', 'bounced']);
  assert.equal(bouncedOnRecord('dead@example.com', on)?.address, 'dead@example.com');
  assert.equal(bouncedOnRecord('good@example.com', on), undefined);
});

test('a delivery failure is a bounce and nothing else', () => {
  assert.equal(isDeliveryFailure('bounced'), true);
  for (const s of ['unsubscribed', 'complained', 'unknown', 'valid', undefined] as (EmailStatus | undefined)[]) {
    assert.equal(isDeliveryFailure(s), false, `${s} is not the mail system's verdict on the address`);
  }
});

/* ---------------------------------------------------------- 2. the wording */

test('the message says what is true, and what to do about it', () => {
  assert.equal(BOUNCED_ENTRY_TITLE, 'Email address is not active');
  // The three things the request asked the explanation to carry.
  assert.match(BOUNCED_ENTRY_DETAIL, /previously sent to this address but could not be delivered/,
    'it must say the previous email could not be delivered');
  assert.match(BOUNCED_ENTRY_DETAIL, /may be inactive or invalid/,
    'it must say what that means about the address');
  assert.match(BOUNCED_ENTRY_DETAIL, /try adding a different email address/,
    'it must say what to do next — this is the whole point of the change');
});

test('the wording is about the member, and leaks nothing technical', () => {
  const both = `${BOUNCED_ENTRY_TITLE} ${BOUNCED_ENTRY_DETAIL}`;
  assert.ok(!/\b(she|her|hers|his|he)\b/i.test(both), 'copy is gender-neutral');
  for (const leak of ['bounced', 'status', 'SES', 'SMTP', 'RPC', 'null', 'member_emails']) {
    assert.ok(!both.toLowerCase().includes(leak.toLowerCase()),
      `the operator does not need the word "${leak}" — constraint 5`);
  }
});

/* ------------------------------------------------------------- 3. the form */

test('the form asks the shared rule, rather than carrying its own copy', () => {
  const src = read(FORM);
  assert.match(src, /suppressedOnRecord/,
    'the form must use the shared check; a second copy of "is this the same address" '
    + 'would answer differently from the database (RC-023).');
  assert.match(src, /existing\.suppressedBefore/,
    'and it must ask the HISTORY, not only the addresses currently on the record. '
    + 'update_member soft-deletes an address left out of a save, so a check over the live '
    + 'list alone stops seeing a suppression the moment the row is removed — which is how '
    + 'an opt-out was erased in production (RC-107).');
});

test('Save is blocked while the box holds a bounced address', () => {
  const src = read(FORM);
  const valid = src.slice(src.indexOf('const valid = '), src.indexOf('const valid = ') + 700);
  assert.match(valid, /!refusedDraft/,
    'Save must be disabled. A form that accepted it and then showed no new address is '
    + 'the defect this whole line of work began with (RC-106).');
});

test('a bounced address already ON the record does not block Save', () => {
  // Six live members have one. If the gate were on the LIST rather than the
  // draft, none of them could ever be edited again.
  const src = read(FORM);
  const valid = src.slice(src.indexOf('const valid = '), src.indexOf('const valid = ') + 700);
  assert.ok(!/emails\.some\([^)]*bounced/.test(valid),
    'the gate must be on the DRAFT, not on the address list.');
});

test('the message is rendered inline, not flashed as a toast', () => {
  const src = read(FORM);
  const at = src.indexOf('member-email-bounced');
  assert.ok(at > 0, 'the inline block is missing from the form.');
  const block = src.slice(at - 400, at + 1400);
  assert.match(block, /draftRefusal\.title/, 'it must show the title');
  assert.match(block, /draftRefusal\.detail/, 'and the explanation');
  assert.ok(!/flash\(/.test(block),
    'this must not be a toast: the answer is an instruction about the field the caret '
    + 'is in, and a toast leaves before it has been read.');
});

test('the field itself reads as unusable, and not by colour alone', () => {
  const src = read(FORM);
  assert.match(src, /invalid=\{!!refusedDraft\}/, 'the input must take the invalid state');
  assert.match(src, /aria-invalid/, 'and expose it, not just colour it');
});

test('RC-107 · every suppression is refused, not only a bounce', () => {
  // An opt-out and a spam report are refused too, each in its own words. The
  // bounce message must NOT be shown over a member who asked not to be written
  // to: "the address may be invalid" would be untrue and would invite another
  // attempt.
  for (const [status, title] of [
    ['bounced', BOUNCED_ENTRY_TITLE],
    ['unsubscribed', 'This address has opted out'],
    ['complained', 'This address reported spam'],
  ] as [EmailStatus, string][]) {
    const on = record(['abc@example.com', status]);
    assert.ok(suppressedOnRecord('abc@example.com', on), `${status} must be refused`);
    assert.equal(entryRefusal(status).title, title, `${status} gets its own words`);
  }
  // And a usable address is still not an error.
  for (const status of ['unknown', 'valid'] as EmailStatus[]) {
    assert.equal(suppressedOnRecord('abc@example.com', record(['abc@example.com', status])), undefined);
  }
});

test('RC-107 · an opt-out outranks a complaint outranks a bounce', () => {
  // The same order `suppressedAddress` uses: a screen leads with the state
  // that most constrains what the academy may do.
  const on = record(['a@example.com', 'bounced'], ['a@example.com', 'unsubscribed']);
  assert.equal(suppressedOnRecord('a@example.com', on)?.status, 'unsubscribed');
});

test('RC-107 · a REMOVED suppression is still found — the hole that let an opt-out be erased', () => {
  /* This is the whole point of carrying history. In production one member's
     opted-out address was removed by a save (update_member soft-deletes an
     address left out of the list), then typed back in -- and because the
     member read filtered soft-deleted rows out, nothing in the app could see
     that it had ever been suppressed. A brand-new row was inserted at
     'unknown' and the member was back on the send list. */
  const history = [{ address: 'gone@example.com', status: 'unsubscribed' as EmailStatus }];
  const liveList: typeof history = [];   // removed from the record entirely
  assert.equal(suppressedOnRecord('gone@example.com', liveList), undefined,
    'the live list alone cannot see it — this is the defect');
  assert.equal(suppressedOnRecord('gone@example.com', [...history, ...liveList])?.status,
    'unsubscribed', 'and the history is what closes it');
});

test('the form no longer reinstates anything', () => {
  const src = read(FORM);
  assert.ok(!src.includes('reinstateMemberEmail'),
    'the Edit flow must not call the reinstate RPC.');
  assert.ok(!/Reinstate/.test(src),
    'and must not offer a Reinstate control — re-using an address the mail system '
    + 'rejected sends the next follow-up into the same hole.');
});

test('the card points at the same answer as the form', () => {
  const src = read(CARD);
  assert.match(src, /add a different address/i,
    'the member card must send the reader to the thing that works.');
  assert.ok(!/reinstate it/i.test(src),
    'and must not advertise a Reinstate action that no longer exists.');
});

test('RC-107 · the member read must keep reading soft-deleted rows', () => {
  /* The rung for the hole. `suppressedBefore` is only as good as the read that
     fills it, and the cheapest way for this defect to come back is somebody
     restoring `.is('deleted_at', null)` to the addresses query while tidying.
     There is no type error for that -- the field would just quietly go empty. */
  const src = read('src/data/repository.ts');
  const at = src.indexOf("paged('member addresses'");
  assert.ok(at > 0, 'the member addresses read has moved; this guard needs re-pointing.');
  const line = src.slice(at, src.indexOf('\n', at));
  assert.ok(!/is\('deleted_at', null\)/.test(line),
    'the addresses read filters out soft-deleted rows again. That erases the suppression '
    + 'history `suppressedBefore` is built from, and an opt-out becomes re-addable (RC-107).');
  assert.match(line, /deleted_at/,
    'and it must SELECT deleted_at, or the live list cannot be partitioned out of it.');
  assert.match(src, /suppressedBefore:/, 'the record must carry the history it reads.');
});

/* -------------------------------------------- 4. the record is not written */

test('nothing here changes a stored status', () => {
  // The rule is a READ. Asserted structurally because the cheapest way for this
  // to go wrong is a well-meant "fix" that flips the row to unknown on entry.
  const on = record(['abc@example.com', 'bounced']);
  const before = JSON.stringify(on);
  bouncedOnRecord('abc@example.com', on);
  bouncedOnRecord('ABC@EXAMPLE.COM ', on);
  assert.equal(JSON.stringify(on), before, 'the stored record must be untouched');
  assert.equal(on[0].status, 'bounced');
  assert.equal(emailUsable(on[0]), false, 'and it is still not sendable');
});

/* ---------------------------------------------------- 5. accessibility */

test('the whole sentence is reachable without hovering anything', () => {
  const src = read(FORM);
  const at = src.indexOf('member-email-bounced');
  const block = src.slice(at - 400, at + 1400);
  assert.match(block, /accessibilityRole="alert"/,
    'the message must announce itself when it appears.');
  assert.match(block, /accessibilityLabel=\{`\$\{draftRefusal\.title\}\. \$\{draftRefusal\.detail\}`\}/,
    'and carry BOTH halves as its label — a title alone does not say what to do.');
  assert.ok(!/title=|onHover|hoverText/.test(block),
    'nothing here may depend on hover (constraint 7).');
  // The glyph is inside an `accessible` wrapper, so it is not announced twice
  // and needs no label of its own.
  assert.match(block, /accessible\b/, 'the block is one accessible unit');
});
