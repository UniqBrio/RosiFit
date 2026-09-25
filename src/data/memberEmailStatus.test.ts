/**
 * AN ADDRESS THE ACADEMY CANNOT SEND TO IS STILL AN ADDRESS ON THE RECORD.
 *
 * Run: npx tsx --test src/data/memberEmailStatus.test.ts
 *
 * THE DEFECT (requests/2026-09-22-saved-email-not-reflecting.md)
 *   A member whose only address had been suppressed -- SES reported a bounce,
 *   or the member clicked the opt-out link -- read "No usable email" on the
 *   card. Opening Edit showed NO ADDRESS AT ALL, so the operator typed the
 *   address the academy holds, saved, and the card did not move.
 *
 *   Three pieces, and only together are they a defect:
 *     1. `fetchMembers` DISCARDED a suppressed row (`repository.ts`, the
 *        `continue` on 'bounced' / 'unsubscribed'), so the record the whole
 *        app reads carried no trace of it;
 *     2. the Edit form seeds its address list from that record, so it opened
 *        blank and the operator re-entered the SAME address;
 *     3. `update_member` finds the row still live, sets `is_primary`, and
 *        never touches `status` -- so the save wrote nothing and reported
 *        success. Nothing anywhere in the repository ever cleared a
 *        suppression.
 *
 *   The class is RC-023's -- a rule that lives in exactly one place, invisible
 *   from where it has to be obeyed -- and RC-031's prevention read backwards:
 *   CARRY THE STORED VALUE AND DERIVE THE LABEL FROM IT, NEVER THE REVERSE.
 *   Under C2b it is also "claimed success" (RC-008, RC-017): the toast
 *   asserted the act, nothing asserted the effect.
 *
 * WHAT THIS SPEC PINS, one group each
 *   1. the two questions are DIFFERENT questions, and each has one answer:
 *      `hasEmailOnFile` (is there an address at all) and `isReachable` (can a
 *      follow-up actually leave). `hasEmail` used to answer both, which is how
 *      one question ended up with two answers;
 *   2. the read CARRIES the state rather than dropping the row, and no path
 *      in the repository builds an address record without it -- the hazard of
 *      an optional field is a future read that forgets it, and that future
 *      read is this defect coming back;
 *   3. the Edit form shows a suppressed address instead of opening blank;
 *   4. the card names which of the four states it is in -- word and icon, not
 *      colour (guardrail 3);
 *   5. the migration reinstates a BOUNCE and refuses an OPT-OUT, and is not
 *      executable by `anon` (RC-042 and RC-052 are that same grant shipped
 *      twice).
 *
 * Groups 2-5 read source rather than rendering, the way memberJoinedOn.test.ts
 * and duplicatePerCourse.test.ts do: there is no component harness in this
 * project, and the claims are about which fields a read carries, which rows a
 * form draws and what a migration grants -- each of which is exactly the shape
 * of the code.
 *
 * FAIL-FIRST: every group below was watched failing against the pre-fix tree
 * (`MEMBER_EMAIL_STATUS_SPEC_ROOT=<copy of the tree before the fix>`).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import * as mock from './mock';
import * as followup from './followup';
import { emailStateWord, isDeliveryFailure, type EmailStatus } from './emailStatus';
import type { Member } from './mock';

const ROOT = process.env.MEMBER_EMAIL_STATUS_SPEC_ROOT ?? process.cwd();
const REPO = 'src/data/repository.ts';
const FORM = 'app/member/edit.tsx';
const CARD = 'app/member/[id].tsx';
const MIGRATION = 'supabase/migrations/0078_reinstate_member_email.sql';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

test('the spec is looking at a real tree', () => {
  for (const rel of [REPO, FORM, CARD]) {
    assert.ok(fs.existsSync(path.join(ROOT, rel)),
      `${ROOT} is not the repository root: no ${rel}. Run from the root, or set MEMBER_EMAIL_STATUS_SPEC_ROOT.`);
  }
});

/** A member carrying exactly the addresses under test and nothing else that matters. */
const member = (emails: Member['emails']): Member => ({
  id: 'm1', name: 'Test Member', course: 'Prenatal Flow', course_id: 'c1',
  branch: 'Coimbatore', code: '', aliases: [], emails, weekdays: null,
  status: 'active', inactiveFrom: null, activeAgainFrom: null,
  expected: 3, attended: 0, missed: 3, streak: 3,
  lastPresent: null, last: '—', joinedOn: '2026-01-01', joined: 'Jan 2026',
});

/* ------------------------------------------- 1. two questions, two answers */

test('the predicates the app needs both exist, and they are not the same function', () => {
  assert.equal(typeof (mock as Record<string, unknown>).hasEmailOnFile, 'function',
    'hasEmailOnFile is missing: the card cannot tell "no address" from "an address that cannot be used".');
  assert.equal(typeof followup.isReachable, 'function',
    'isReachable is the predicate the SEND splits on and must stay in followup.ts (CP-011).');
  assert.equal((mock as Record<string, unknown>).hasEmail, undefined,
    'hasEmail is still exported. It answered both questions at once, which is the defect — '
    + 'every call site must be made to pick between hasEmailOnFile and isReachable.');
});

test('a usable address answers yes to both', () => {
  const m = member([{ address: 'a@b.com', primary: true, status: 'valid' }]);
  assert.equal(mock.hasEmailOnFile(m), true);
  assert.equal(followup.isReachable(m), true);
});

test('an address built without a status is usable — the fixtures and specs carry none', () => {
  // Absent is not the same fact as a value the database gave us and we did not
  // recognise. Absent means the record was constructed without the field, which
  // is every fixture in mock.ts and every hand-built member in the specs.
  const m = member([{ address: 'a@b.com', primary: true }]);
  assert.equal(mock.hasEmailOnFile(m), true);
  assert.equal(followup.isReachable(m), true);
});

test('a BOUNCED address is on file and is NOT reachable — this is the reported defect', () => {
  const m = member([{ address: 'a@b.com', primary: true, status: 'bounced' }]);
  assert.equal(mock.hasEmailOnFile(m), true,
    'the address exists — saying "no email on file" over it is what sent the operator to Edit');
  assert.equal(followup.isReachable(m), false,
    'and nothing may be sent to it');
});

test('an UNSUBSCRIBED address is on file and is NOT reachable', () => {
  const m = member([{ address: 'a@b.com', primary: true, status: 'unsubscribed' }]);
  assert.equal(mock.hasEmailOnFile(m), true);
  assert.equal(followup.isReachable(m), false);
});

test('a COMPLAINED address is suppressed too — a spam report is not a sendable address', () => {
  // Filtered by nobody and refused by nobody before this change: the client
  // dropped only bounced and unsubscribed, and send-followups refuses only
  // those two, so an address that had filed a spam report was treated as
  // perfectly sendable. AWS acts on complaint rates at 0.1%.
  const m = member([{ address: 'a@b.com', primary: true, status: 'complained' }]);
  assert.equal(mock.hasEmailOnFile(m), true);
  assert.equal(followup.isReachable(m), false);
});

test('a status the database knows and this app does not reads as UNSENDABLE', () => {
  // The safe answer withholds mail rather than sending it — the same reasoning
  // repository.ts applies to an unrecognised members.status, where anything the
  // CHECK does not name is read as "not on the register".
  const m = member([{ address: 'a@b.com', primary: true,
    status: 'quarantined' as unknown as NonNullable<Member['emails'][number]['status']> }]);
  assert.equal(mock.hasEmailOnFile(m), true);
  assert.equal(followup.isReachable(m), false);
});

test('a member holding one dead address and one live one is still reachable', () => {
  const m = member([
    { address: 'dead@b.com', primary: true, status: 'bounced' },
    { address: 'live@b.com', primary: false, status: 'unknown' },
  ]);
  assert.equal(followup.isReachable(m), true,
    'isReachable is "can a follow-up leave", not "is the primary one well" — '
    + 'it is the predicate the send itself splits on, so it may not be stricter than the send.');
});

test('no addresses at all is the fourth state, and it is not the same as a suppressed one', () => {
  const m = member([]);
  assert.equal(mock.hasEmailOnFile(m), false);
  assert.equal(followup.isReachable(m), false);
});

/* ------------------------------------- 2. the read carries it, every time */

test('the read no longer throws a suppressed address away', () => {
  const src = read(REPO);
  assert.ok(!/status === 'bounced'\s*\|\|\s*e?\.?status === 'unsubscribed'/.test(src),
    'repository.ts still drops suppressed rows on the way out of fetchMembers. '
    + 'That is piece 1 of the defect: the record carries no trace of an address that exists.');
});

test('every address record the repository builds carries its status', () => {
  // The hazard of an OPTIONAL field is a read that forgets to map it: absent
  // reads as usable, which is exactly this defect returning. There is no type
  // error to catch that, so the rung is here.
  const src = read(REPO);
  const built = src.match(/\{\s*address:[^}]*\}/g) ?? [];
  assert.ok(built.length > 0, 'no address records found in repository.ts — has the shape moved?');
  for (const record of built) {
    assert.match(record, /status/,
      `an address record is built without its status:\n${record}\n`
      + 'Absent means "constructed without the field" and reads as usable, so a read that '
      + 'forgets it silently un-suppresses every address it returns.');
  }
});

/* ------------------------------------------ 3. the Edit form shows what is there */

test('the Edit form draws a suppressed address instead of opening blank', () => {
  const src = read(FORM);
  assert.match(src, /suppressed|SUPPRESSED/,
    'app/member/edit.tsx does not distinguish a suppressed address. It opened blank over a '
    + 'member who HAS one, which is what made the operator retype the address already on file.');
  // The way FORWARD, which replaced the Reinstate action on 23-Sep-2026: the
  // form refuses the re-entry and asks for a different address instead.
  // Pinned in full by src/data/bouncedReentry.test.ts.
  assert.match(src, /suppressedOnRecord/,
    'the form does not detect a re-entered address that has already been suppressed.');
});

test('the form classifies a suppression through the shared rule, not its own copy', () => {
  const src = read(FORM);
  assert.match(src, /isDeliveryFailure/,
    'the form must ask the shared rule whether a suppression is the mail system\'s verdict '
    + 'on the address or the member\'s own decision. A form carrying its own list of states '
    + 'is a second copy of the rule, and the copies drift — RC-023, the class this whole '
    + 'defect belongs to.');
  assert.ok(!/status\s*===\s*'unsubscribed'/.test(src),
    'the form is testing the opt-out state by hand. That decision lives in emailStatus.ts; '
    + 'a second copy here can only drift.');
});

/* --------------------------------------------- 4. the card names the state */

test('every state has its own word — copy-lock', () => {
  // The words live in ONE module so the card and the Edit form cannot come to
  // name the same state differently, which is the shape of the whole defect.
  assert.equal(emailStateWord('valid'), 'Email on file');
  assert.equal(emailStateWord(undefined), 'Email on file');
  assert.equal(emailStateWord('bounced'), 'Address bounced');
  assert.equal(emailStateWord('complained'), 'Marked as spam');
  assert.equal(emailStateWord('unsubscribed'), 'Member unsubscribed');
  assert.equal(emailStateWord('quarantined' as EmailStatus), 'Address unusable',
    'a state we do not recognise still gets a word rather than falling through blank');
});

test('the member card no longer claims there is no address when there is one', () => {
  const src = read(CARD);
  assert.ok(!src.includes('No usable email'),
    '"No usable email" was drawn over a member who HAD one. It cannot survive the fix: '
    + 'the card now names which of the four states is true.');
  assert.ok(src.includes('No email on file'),
    'the genuinely-empty case still needs its own words (C-76: listed and excluded).');
  assert.match(src, /emailStateWord/,
    'the card must take its wording from the shared module, not spell the states out '
    + 'again — two copies of the wording is how the card and the form drift apart.');
});

test('ONLY a bounce is the mail system\'s verdict — the rule, in one place', () => {
  // The line is whose act the suppression was. A bounce is the mail system
  // reporting a dead address; a complaint and an opt-out are the MEMBER'S OWN
  // CLICK. It decides what a screen ADVISES and nothing else: since
  // 23-Sep-2026 no screen in this app reinstates an address at all.
  assert.equal(isDeliveryFailure('bounced'), true);
  assert.equal(isDeliveryFailure('complained'), false,
    'a complaint is the member clicking "report spam", not a dead address.');
  assert.equal(isDeliveryFailure('unsubscribed'), false,
    'the member said something deliberate; the address itself may be perfectly fine.');
  assert.equal(isDeliveryFailure('unknown'), false);
  assert.equal(isDeliveryFailure(undefined), false);
});

test('a complaint stays SUPPRESSED even though it cannot be lifted', () => {
  // The two halves are independent and both matter: not sendable (the
  // conservative fix, which stays) and not reinstatable (the narrowing).
  const m = member([{ address: 'a@b.com', primary: true, status: 'complained' }]);
  assert.equal(mock.hasEmailOnFile(m), true, 'the address is still on the record and still shown');
  assert.equal(followup.isReachable(m), false, 'and nothing may be sent to it');
  assert.equal(isDeliveryFailure('complained'), false, 'and it is not a delivery failure');
});

test('the card copy is about the member, never gendered', () => {
  // Standing rule: member-facing copy AND the comments around it are written
  // about "the member". The academy is a women's academy; the software is not.
  const src = read('src/data/emailStatus.ts');
  assert.ok(!/\b(she|her|hers|his|he)\b/i.test(src),
    'the shared email wording carries a gendered pronoun. The academy is a women\'s '
    + 'academy; the software is not, and this copy ships to anyone who licenses it.');
});

/* ------------------------------------------------- 5. the migration's rules */

test('the reinstate migration exists', () => {
  assert.ok(fs.existsSync(path.join(ROOT, MIGRATION)),
    `${MIGRATION} is missing: there is still no route back from a bounce, which is why `
    + 'saving the address again changed nothing.');
});

test('reinstatement clears a bounce and REFUSES an opt-out', () => {
  const sql = read(MIGRATION);
  assert.match(sql, /'unsubscribed'/,
    'the function does not name the opt-out case, so it would clear one.');
  assert.match(sql, /raise exception/i,
    'refusing an opt-out has to be a refusal the operator READS, not a silent no-op — '
    + 'a silent no-op is the defect this whole change is about.');
  assert.match(sql, /'bounced'/, 'the function does not name the state it exists to clear.');
});

test('the new function is not executable by anon', () => {
  // RC-042 and RC-052 are this same grant, shipped twice.
  const sql = read(MIGRATION);
  assert.match(sql, /revoke\s+(all|execute)\s+on\s+function\s+public\.reinstate_member_email/i,
    'a new SECURITY DEFINER function without an explicit revoke has shipped twice already.');
  assert.match(sql, /grant\s+execute\s+on\s+function\s+public\.reinstate_member_email[^;]*to\s+authenticated/i,
    'and it has to be granted to the role that actually calls it.');
});

test('the migration does not restate update_member', () => {
  // T-120 measured update_member at 9,625 bytes on production against 11,213
  // in the harness replay. Restating a divergent body reverts production to
  // whatever the repo happens to hold — RC-047's mechanism, T-125's warning.
  const sql = read(MIGRATION);
  assert.ok(!/function\s+public\.update_member/i.test(sql),
    'this migration restates update_member. That body differs on production and has never '
    + 'been read, so restating it would revert whatever live carries.');
});
