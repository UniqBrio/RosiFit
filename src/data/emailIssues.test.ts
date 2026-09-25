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
  ISSUE_READING, ISSUE_GROUP_LABEL, EMAIL_ISSUE_KINDS, issueBadge, emailIssueIds,
} from './emailIssues';
import { isReachable } from './followup';
import { hasEmailOnFile, type Member } from './mock';
import type { EmailStatus } from './emailStatus';

const ROOT = process.env.EMAIL_ISSUES_SPEC_ROOT ?? process.cwd();
const COURSE = 'app/course/[id].tsx';
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

/**
 * A window of SOURCE LINES, never of characters — T-302.
 *
 * `src.slice(at, at + N)` reads a different number of LINES on a CRLF
 * checkout than on an LF one, because every line costs one extra character,
 * so a source-reading case can pass in CI and fail on a Windows machine with
 * the same tree. Counting lines from the anchor is the fix that row
 * prescribes, and it costs nothing here.
 */
function linesFrom(src: string, anchor: string, count: number, before = 0): string {
  const lines = src.split(/\r?\n/);
  const at = lines.findIndex(l => l.includes(anchor));
  assert.ok(at >= 0, `the anchor "${anchor}" is gone; this guard needs re-pointing.`);
  return lines.slice(Math.max(0, at - before), at + count).join('\n');
}

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

/**
 * AMENDED, NOT APPENDED — 24-Sep-2026, and said plainly because specs here
 * are append-only by rule.
 *
 * This case asserted `const withEmail = shown.filter(m => m.emails.length > 0)`
 * — that the section was a pure addition and the roster above it kept every
 * member it had. The academy then reported the consequence of exactly that:
 * an unsubscribed member was listed among the members WITH email, address
 * printed as though a follow-up would reach it, AND again under Email issues.
 * The owner reversed the behaviour this pinned, so the assertion is re-pointed
 * at the partition that replaced it. No assertion is dropped, nothing is
 * skipped, and "No email" is asserted unchanged in the same breath.
 */
test('15 · a member with an issue leaves the roster above — one section each', () => {
  const src = read(COURSE);
  assert.match(src, /const withEmail = shown\.filter\(m => m\.emails\.length > 0 && !issueIds\.has\(m\.id\)\)/,
    'the roster above must exclude the members the issues section has taken');
  assert.match(src, /const withoutEmail = shown\.filter\(m => m\.emails\.length === 0\)/,
    'and "No email" still means exactly what it meant: no address on file');
  assert.match(src, /const issueIds = useMemo\(\(\) => emailIssueIds\(issueGroups\)/,
    'and the exclusion reads the SAME derivation the section renders, never a '
    + 'second filter that could disagree with it (guardrail 1)');
});

/* ===================== 16-19 · the partition, and what moving a member costs
 *
 * FAIL-FIRST, observed against the pre-change tree (both source files stashed,
 * restored byte-identical and diffed):
 *   15  'the roster above must exclude the members the issues section has taken'
 *   16-18 '(0 , import_emailIssues.emailIssueIds) is not a function'
 *   19  'each group is addressable, so a screen check can name one'
 *   +   'the note comes from the shared reading, never from a string typed
 *        into the screen'
 * Six cases, all red, before a line of the fix existed.
 */

test('16 · the three predicates partition the roster: nobody twice, nobody lost', () => {
  const roster = [
    member('Fine', live('fine@example.com', 'unknown')),
    member('Bounced', live('b@example.com', 'bounced')),
    member('OptedOut', live('u@example.com', 'unsubscribed')),
    member('Spam', live('c@example.com', 'complained')),
    member('Re-added', live('r@example.com', 'unknown'), [{ address: 'r@example.com', status: 'unsubscribed' }]),
    member('NoAddress', []),
  ];
  const ids = emailIssueIds(emailIssueGroups(roster));

  // The screen's own three predicates, as `app/course/[id].tsx` writes them.
  const withoutEmail = roster.filter(m => m.emails.length === 0);
  const withEmail = roster.filter(m => m.emails.length > 0 && !ids.has(m.id));
  const inIssues = roster.filter(m => ids.has(m.id));

  assert.deepEqual(withEmail.map(m => m.name), ['Fine'],
    'only a member who can actually be written to is left in the ordinary roster');
  assert.deepEqual(withoutEmail.map(m => m.name), ['NoAddress']);
  assert.deepEqual(inIssues.map(m => m.name).sort(),
    ['Bounced', 'OptedOut', 'Re-added', 'Spam']);

  assert.equal(withEmail.length + withoutEmail.length + inIssues.length, roster.length,
    'every member is in exactly one section — the counts add up to the roster');
  const seen = [...withEmail, ...withoutEmail, ...inIssues].map(m => m.id);
  assert.equal(new Set(seen).size, seen.length, 'and nobody is listed twice');
});

test('17 · the unsubscribed member the academy reported is no longer listed as reachable', () => {
  // The exact shape from the report: a live address the member opted out of.
  const optedOut = member('Reported', live('one@example.com', 'unsubscribed'));
  const ids = emailIssueIds(emailIssueGroups([optedOut]));
  assert.ok(ids.has(optedOut.id), 'the member belongs to Email issues');
  assert.equal([optedOut].filter(m => m.emails.length > 0 && !ids.has(m.id)).length, 0,
    'and must NOT also appear under the members-with-email list, which is what was wrong');
});

test('18 · emailIssueIds is the ids of the rows drawn, and nothing else', () => {
  const roster = [
    member('B', live('b@example.com', 'bounced')),
    member('Fine', live('f@example.com', 'valid')),
  ];
  const groups = emailIssueGroups(roster);
  assert.deepEqual([...emailIssueIds(groups)], groups.flatMap(g => g.rows).map(r => r.member.id),
    'one derivation feeds the section AND the exclusion, so they cannot disagree');
  assert.equal(emailIssueIds([]).size, 0, 'no issues, nobody excluded');
});

test('19 · a member moved here keeps the attendance card, not a summary row', () => {
  // Moving a member out of the roster above must not cost what the screen is
  // FOR. The section draws the same MemberCard, so the day's reading and the
  // tick travel with the member; only the line under the name changes.
  const src = read(COURSE);
  const block = linesFrom(src, 'issueGroups.map(group =>', 90);
  assert.match(block, /testID=\{`course-email-issue-group-\$\{group\.kind\}`\}/,
    'each group is addressable, so a screen check can name one');
  assert.match(block, /<MemberCard key=\{row\.member\.id\} member=\{row\.member\}/,
    'an issue row is a MemberCard — the same card, so attendance is not lost');
  assert.match(block, /attendanceState=\{marks\.state\}/, 'with the week it is drawn from');
  assert.match(block, /emailIssue=\{\{ address: row\.address, word: issueBadge\(row\.kind\) \}\}/,
    'and the address line names the offending address and the app\'s own word for it, '
    + 'rather than printing it exactly as a working address');
});

test('the reason is stated once per group, from ISSUE_READING', () => {
  const src = read(COURSE);
  const block = linesFrom(src, 'issueGroups.map(group =>', 90);
  assert.match(block, /ISSUE_READING\[group\.kind\]/,
    'the note comes from the shared reading, never from a string typed into the screen');
  assert.match(block, /reading\.action === 'edit'/,
    'and only a bounce is pointed at the Edit form');
});

test('it reads the roster the screen is already drawing — no second query', () => {
  const src = read(COURSE);
  assert.match(src, /emailIssueGroups\(shown\)/,
    'the section must derive from `shown`, the same array the roster renders, so its count '
    + 'cannot drift from what is on screen and no member of another course can reach it.');
  // Both sides of the derivation, as the character window it replaces was.
  const around = linesFrom(src, 'emailIssueGroups(shown)', 20, 20);
  assert.ok(!/useQuery|supabase\.|fetch[A-Z]/.test(around),
    'no read of its own: Member.emails and Member.suppressedBefore arrive with the roster.');
});

test('the section does not offer to send or to reinstate', () => {
  const src = read(COURSE);
  const block = linesFrom(src, 'testID="course-email-issues"', 110);
  assert.ok(!/Reinstate/i.test(block), 'no reinstatement — this is a reporting section');
  assert.ok(!/sendFollowUps|Send email|Send Email/.test(block), 'and it sends nothing');
});

/* ======================= 20-21 · an address row that holds an empty string
 *
 * The bulk import has written one. Two cases fall out of it, and both were
 * found by review rather than by the suite, which is why they are pinned.
 *
 * FAIL-FIRST: the tiebreak was reverted in place and the suite re-run.
 * '20 · at equal severity, the row that NAMES an address wins' was observed
 * FAILING (30/31) against the severity-only sort; the other two passed, since
 * they do not depend on the tiebreak. The file was restored from a scratchpad
 * copy and `diff` run to prove it byte-identical.
 */

test('20 · at equal severity, the row that NAMES an address wins', () => {
  const m = member('Blank And Real', [
    { address: '', primary: true, status: 'bounced', id: 'e1' },
    { address: 'real@example.com', primary: false, status: 'bounced', id: 'e2' },
  ]);
  const issue = emailIssueFor(m);
  assert.equal(issue?.kind, 'bounced');
  assert.equal(issue?.address, 'real@example.com',
    'the address and the word must be about the SAME address — borrowing one row\'s '
    + 'address to sit beside another row\'s status is worse than either fact alone');
});

test('20 · but severity still outranks it — a named bounce never beats a blank opt-out', () => {
  const m = member('Blank OptOut', [
    { address: '', primary: true, status: 'unsubscribed', id: 'e1' },
    { address: 'real@example.com', primary: false, status: 'bounced', id: 'e2' },
  ]);
  const issue = emailIssueFor(m);
  assert.equal(issue?.kind, 'unsubscribed',
    'never offer "update the address" over somebody who asked not to be written to, '
    + 'however much nicer the other row reads');
  assert.equal(issue?.address, '', 'and the screen says "Address not recorded" for this');
});

test('21 · every address blank still produces a row, named honestly', () => {
  const m = member('All Blank', [{ address: '', primary: true, status: 'bounced', id: 'e1' }]);
  const issue = emailIssueFor(m);
  assert.ok(issue, 'the member still has a live row, so this is not the "No email" case');
  assert.equal(issue?.address, '',
    'no address is invented to fill the gap — the screen draws "Address not recorded"');
});

/* ============== 22-24 · the three things the SCREEN had to learn as well
 *
 * All three were found by review, not by the suite, and all three are on the
 * path the academy actually asked for: tick Unsubscribed and look.
 *
 * FAIL-FIRST: each was observed red against the tree as first written —
 * 'the pending note asks isRecordFact' (the screen carried its own hand-kept
 * list), 'the header's split names every section it has' (two terms over
 * three sections), and 'ticking Bounced or Unsubscribed opens the section'
 * (issuesOpen was a bare useState(false) and nothing set it).
 */

test('22 · the "not narrowed yet" note asks isRecordFact, not a list kept by hand', () => {
  const src = read(COURSE);
  assert.match(src, /const showPending = showKeys\.some\(k => !isRecordFact\(k\)\)/,
    'Bounced and Unsubscribed narrow ABOVE the ready gate, so a screen that keeps its own '
    + 'list of exempt keys tells the operator the roster is NOT narrowed to Unsubscribed '
    + 'over a roster narrowed to exactly that — and suppresses the truthful line while it does');
  assert.ok(!/k !== 'no-email' && k !== 'active' && k !== 'inactive'/.test(src),
    'the hand-kept list is gone, not merely shadowed');
});

test('23 · the header\'s split names every section it has', () => {
  const src = read(COURSE);
  const split = linesFrom(src, 'const memberSplit =', 3);
  assert.match(split, /issueTotal > 0 \?/,
    'with issue members in neither term, "9 with email · 0 without" sat under a heading '
    + 'reading 10 and nothing said where the tenth went');
  assert.match(split, /with an email issue/);
});

test('24 · ticking Bounced or Unsubscribed opens the section', () => {
  const src = read(COURSE);
  const block = linesFrom(src, 'const askedForIssues =', 8);
  assert.match(block, /showKeys\.some\(k => k === 'bounced' \|\| k === 'unsubscribed'\)/);
  assert.match(block, /setIssuesOpen\(true\)/,
    'otherwise the answer to "show me the unsubscribed members" is a heading, a count and '
    + 'a chevron: both lists above are empty, no empty state fires, and no card is drawn');
  assert.match(block, /closedByHand/,
    'and a close the operator chose must outrank it, or the screen argues with them');
});
