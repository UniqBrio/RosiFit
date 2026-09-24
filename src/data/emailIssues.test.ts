/**
 * EMAIL ISSUES — who cannot be written to, grouped by why.
 *
 * Run: npx tsx --test src/data/emailIssues.test.ts
 *
 * WHAT THE SECTION IS FOR
 *   Staff open a course and want one place that answers "whose email is not
 *   working, and what do I do about it". It is a READING of the roster the
 *   screen already has: no query, no write, and no new definition of any
 *   status -- every such question is asked of `src/data/emailStatus.ts`.
 *
 * THE TWO SECTIONS ARE NOT THE SAME QUESTION, and the spec keeps them apart:
 *   "No email"     -- no address exists. The answer is to add one.
 *   "Email issues" -- an address exists and cannot be used. The answer depends
 *                     on WHY, which is the whole point of the grouping.
 *
 * THE CASE THAT IS NOT OBVIOUS (RC-107) is a live row at 'unknown' whose
 * address was suppressed before it. `isReachable` says yes; the address is on
 * record as having bounced or been opted out of. This section reads the
 * history, so a fresh row cannot hide what came before it.
 *
 * FAIL-FIRST: see TEST_SUMMARY.md — the module and its spec were written
 * together, so the evidence here is mutation, recorded case by case.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  emailIssueFor, emailIssueGroups, emailIssueCount, effectiveStatus,
  ISSUE_READING, ISSUE_GROUP_LABEL, EMAIL_ISSUE_KINDS, issueBadge,
} from './emailIssues';
import { isReachable } from './followup';
import { hasEmailOnFile, type Member } from './mock';
import type { EmailStatus } from './emailStatus';

const ROOT = process.env.EMAIL_ISSUES_SPEC_ROOT ?? process.cwd();
const COURSE = 'app/course/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

let seq = 0;
const member = (
  name: string,
  emails: Member['emails'],
  suppressedBefore: Member['suppressedBefore'] = [],
  course = 'Postnatal Core',
): Member => ({
  id: `m${++seq}`, name, course, course_id: course === 'Postnatal Core' ? 'c2' : 'c9',
  branch: 'Main', code: '', aliases: [], emails, suppressedBefore, weekdays: null,
  status: 'active', inactiveFrom: null, activeAgainFrom: null,
  expected: 3, attended: 1, missed: 2, streak: 1,
  lastPresent: null, last: '—', joinedOn: '2026-01-01', joined: 'Jan 2026',
});
const live = (address: string, status: EmailStatus) => [{ address, primary: true, status, id: 'e1' }];

test('the spec is looking at a real tree', () => {
  assert.ok(fs.existsSync(path.join(ROOT, COURSE)),
    `${ROOT} is not the repository root: no ${COURSE}.`);
});

/* ============================================ 1-3 · each status is listed */

test('1-3 · a bounced, an unsubscribed and a complained member each appear', () => {
  for (const status of EMAIL_ISSUE_KINDS) {
    const m = member('Someone', live('a@example.com', status));
    const issue = emailIssueFor(m);
    assert.ok(issue, `${status} must be listed`);
    assert.equal(issue?.kind, status);
    assert.equal(issue?.address, 'a@example.com', 'and the row names the address');
  }
});

/* ================================= 4-5 · "No email" is a different section */

test('4-5 · a member with NO address is not an email issue — that is "No email"', () => {
  const m = member('No Address', []);
  assert.equal(hasEmailOnFile(m), false, 'they belong to the section above');
  assert.equal(emailIssueFor(m), undefined,
    'no address exists, so there is no address to have an issue WITH. Merging the two '
    + 'sections would lose the difference between "add one" and "this one does not work".');
});

test('4-5 · and neither is one whose suppressed address was removed entirely', () => {
  // History but no live row: the member has no address at all, so the answer
  // is still "add one" and the section above is still the right one.
  const m = member('Removed', [], [{ address: 'gone@example.com', status: 'unsubscribed' }]);
  assert.equal(emailIssueFor(m), undefined);
});

/* ===================================== 6 · a usable address is not an issue */

test('a member with a usable address is not listed, even holding a dead one', () => {
  const m = member('Two Addresses', [
    { address: 'good@example.com', primary: true, status: 'unknown', id: 'e1' },
    { address: 'dead@example.com', primary: false, status: 'bounced', id: 'e2' },
  ]);
  assert.equal(isReachable(m), true, 'a follow-up can still leave');
  assert.equal(emailIssueFor(m), undefined,
    'their email CAN be used; listing them is noise in a section about what needs attention');
});

/* ============================ 9-11 · history survives, and cannot be hidden */

test('9 · a soft-deleted BOUNCE is still detected behind a fresh row', () => {
  const m = member('Re-added', live('abc@example.com', 'unknown'),
    [{ address: 'abc@example.com', status: 'bounced' }]);
  assert.equal(isReachable(m), true, 'the send path is deliberately unchanged by this feature');
  assert.equal(emailIssueFor(m)?.kind, 'bounced',
    'but the SECTION reports it — the row is new, the address is not (RC-107)');
});

test('10 · a soft-deleted OPT-OUT is still detected behind a fresh row', () => {
  const m = member('Re-added', live('abc@example.com', 'unknown'),
    [{ address: 'abc@example.com', status: 'unsubscribed' }]);
  assert.equal(emailIssueFor(m)?.kind, 'unsubscribed');
});

test('11 · a new `unknown` row cannot hide the history, however it was created', () => {
  // The Edit form refuses this since 23-Sep, but the bulk import does not go
  // through the Edit form, so the shape is still reachable.
  const m = member('Imported', live('abc@example.com', 'unknown'),
    [{ address: 'abc@example.com', status: 'complained' }]);
  assert.equal(emailIssueFor(m)?.kind, 'complained');
  assert.equal(emailIssueFor(m)?.address, 'abc@example.com');
});

test('history for a DIFFERENT address does not taint a good one', () => {
  const m = member('Moved On', live('fresh@example.com', 'unknown'),
    [{ address: 'old@example.com', status: 'bounced' }]);
  assert.equal(emailIssueFor(m), undefined,
    'the old address is gone and the new one is not the same address');
});

test('the address is matched the way the database matches it', () => {
  const m = member('Cased', live('ABC@Example.COM', 'unknown'),
    [{ address: '  abc@example.com ', status: 'bounced' }]);
  assert.equal(emailIssueFor(m)?.kind, 'bounced', 'normalisation is the shared one');
});

test('effectiveStatus leads with what most constrains the academy', () => {
  const history = [
    { address: 'a@example.com', status: 'bounced' as EmailStatus },
    { address: 'a@example.com', status: 'unsubscribed' as EmailStatus },
  ];
  assert.equal(effectiveStatus('a@example.com', history, 'unknown'), 'unsubscribed',
    'an opt-out outranks a bounce, so no screen offers "update the address" to somebody '
    + 'who asked not to be written to');
});

/* ======================================= 7-8 · grouping, counts and scoping */

test('7 · only the roster handed in is read — the caller owns course scoping', () => {
  const courseA = [
    member('A Bounced', live('a@example.com', 'bounced'), [], 'Postnatal Core'),
    member('A OptedOut', live('b@example.com', 'unsubscribed'), [], 'Postnatal Core'),
  ];
  const courseB = [member('B Bounced', live('c@example.com', 'bounced'), [], 'Prenatal Flow')];

  const a = emailIssueGroups(courseA);
  assert.equal(emailIssueCount(a), 2);
  assert.deepEqual(a.map(g => [g.label, g.rows.length]), [['Bounced', 1], ['Unsubscribed', 1]]);
  assert.ok(!a.some(g => g.rows.some(r => r.member.course === 'Prenatal Flow')),
    'a member of another course can only appear if the caller hands one in');

  const b = emailIssueGroups(courseB);
  assert.equal(emailIssueCount(b), 1);
  assert.deepEqual(b.map(g => [g.label, g.rows.length]), [['Bounced', 1]]);
});

test('8 · the count IS the rows — one pass, so the two cannot drift', () => {
  const roster = [
    member('One', live('1@example.com', 'bounced')),
    member('Two', live('2@example.com', 'bounced')),
    member('Three', live('3@example.com', 'unsubscribed')),
    member('Four', live('4@example.com', 'complained')),
    member('Fine', live('5@example.com', 'unknown')),
    member('None', []),
  ];
  const groups = emailIssueGroups(roster);
  assert.equal(emailIssueCount(groups), 4);
  assert.equal(emailIssueCount(groups), groups.flatMap(g => g.rows).length,
    'the total is derived from the same array the rows come from (guardrail 1)');
  assert.deepEqual(groups.map(g => [g.label, g.rows.length]),
    [['Bounced', 2], ['Unsubscribed', 1], ['Spam Reported', 1]]);
});

test('an empty section is no section at all', () => {
  assert.deepEqual(emailIssueGroups([]), []);
  assert.deepEqual(emailIssueGroups([member('Fine', live('a@example.com', 'unknown'))]), []);
  assert.equal(emailIssueCount([]), 0);
});

test('groups keep their order: Bounced, Unsubscribed, Spam Reported', () => {
  const roster = [
    member('C', live('c@example.com', 'complained')),
    member('U', live('u@example.com', 'unsubscribed')),
    member('B', live('b@example.com', 'bounced')),
  ];
  assert.deepEqual(emailIssueGroups(roster).map(g => g.label),
    ['Bounced', 'Unsubscribed', 'Spam Reported'], 'whatever order the roster arrived in');
});

/* ================================== 12-14 · what each row says and offers */

test('12-13 · an opt-out offers NO action — no send, no reinstatement', () => {
  assert.equal(ISSUE_READING.unsubscribed.action, null);
  assert.equal(ISSUE_READING.complained.action, null,
    'a spam report is the member saying stop, exactly as an opt-out is');
});

test('14 · a bounce points at the Edit form the app already has', () => {
  assert.equal(ISSUE_READING.bounced.action, 'edit',
    'the address is wrong and the way to fix it is to change it — not to un-mark it');
});

test('each row says what is true and, where it can, what to do', () => {
  assert.equal(ISSUE_READING.bounced.title, 'Email address is not active');
  assert.match(ISSUE_READING.bounced.detail, /could not be delivered/);
  assert.match(ISSUE_READING.bounced.detail, /inactive or invalid/);

  assert.equal(ISSUE_READING.unsubscribed.title, 'Email address is unsubscribed');
  assert.match(ISSUE_READING.unsubscribed.detail, /opted out of receiving emails/);

  assert.equal(ISSUE_READING.complained.title, 'Email reported as spam');
  assert.match(ISSUE_READING.complained.detail, /should not be used for email communication/);

  for (const kind of EMAIL_ISSUE_KINDS) {
    const both = `${ISSUE_READING[kind].title} ${ISSUE_READING[kind].detail}`;
    assert.ok(!/\b(she|her|hers|his|he)\b/i.test(both), `${kind} copy is gender-neutral`);
  }
});

test('the badge is the app\'s existing per-status word, not a new one', () => {
  assert.equal(issueBadge('bounced'), 'Address bounced');
  assert.equal(issueBadge('unsubscribed'), 'Member unsubscribed');
  assert.equal(issueBadge('complained'), 'Marked as spam');
  assert.deepEqual(Object.values(ISSUE_GROUP_LABEL), ['Bounced', 'Unsubscribed', 'Spam Reported']);
});

/* ============================== 6, 15 · where it sits, and what it leaves alone */

test('6 · the section is rendered immediately BELOW "No email"', () => {
  const src = read(COURSE);
  const noEmail = src.indexOf("<Label style={{ flex: 1, color: dangerInk }}>No email</Label>");
  const issues = src.indexOf('course-email-issues');
  assert.ok(noEmail > 0, 'the No email section has moved; this guard needs re-pointing.');
  assert.ok(issues > 0, 'the Email issues section is missing from the course screen.');
  assert.ok(issues > noEmail, 'Email issues must come after No email, never before it.');
});

test('15 · the existing sections are left alone', () => {
  const src = read(COURSE);
  assert.match(src, /const withEmail = shown\.filter\(m => m\.emails\.length > 0\)/,
    'the roster split is unchanged');
  assert.match(src, /const withoutEmail = shown\.filter\(m => m\.emails\.length === 0\)/,
    'and "No email" still means exactly what it meant: no address on file');
});

test('it reads the roster the screen is already drawing — no second query', () => {
  const src = read(COURSE);
  assert.match(src, /emailIssueGroups\(shown\)/,
    'the section must derive from `shown`, the same array the roster renders, so its count '
    + 'cannot drift from what is on screen and no member of another course can reach it.');
  const at = src.indexOf('emailIssueGroups(shown)');
  const around = src.slice(Math.max(0, at - 600), at + 600);
  assert.ok(!/useQuery|supabase\.|fetch[A-Z]/.test(around),
    'no read of its own: Member.emails and Member.suppressedBefore arrive with the roster.');
});

test('the section does not offer to send or to reinstate', () => {
  const src = read(COURSE);
  const at = src.indexOf('course-email-issues');
  const block = src.slice(at, at + 3000);
  assert.ok(!/Reinstate/i.test(block), 'no reinstatement — this is a reporting section');
  assert.ok(!/sendFollowUps|Send email|Send Email/.test(block), 'and it sends nothing');
});
