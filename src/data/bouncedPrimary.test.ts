import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { sendingAddress, promoteWorkingOverBounced } from './emailStatus';
import { isReachable, recipientSplit } from './followup';
import { emailIssueFor } from './emailIssues';
import type { Member } from './mock';

/**
 * 17-Oct-2026, Postnatal. Three members had bounced; on 12-13 Oct each was
 * given a corrected address beside the bounced one. The form saved the new
 * address as a SECOND address and left the bounced one PRIMARY. The course's
 * Bounced filter then read 0 -- "an address works" -- while send-followups,
 * which writes only to the primary, skipped all three with "Primary email has
 * bounced". These pin the two halves of the fix: the screens ask the send's
 * question, and a working address takes over from a bounced primary.
 */

type Row = Member['emails'][number];
const member = (emails: Row[]): Member => ({
  id: 'm1', name: 'Anju K', course: 'Postnatal', course_id: 'c2', branch: 'Main', code: '',
  aliases: [], emails, weekdays: null, status: 'active', expected: 4, attended: 0, missed: 4,
  streak: 4, lastPresent: null, last: '—', joinedOn: '2026-09-08', joined: 'Sep 2026',
} as unknown as Member);

const BOUNCED_PRIMARY_PLUS_FIX: Row[] = [
  { address: 'anju.rajesh.krithi@gamil.com', primary: true, status: 'bounced', id: 'e1' },
  { address: 'anju.rajesh.krithi@gmail.com', primary: false, status: 'unknown', id: 'e2' },
];

// ------------------------------------------------- the screens ask the send's question

test('the address a follow-up goes to is the primary one', () => {
  assert.equal(sendingAddress(BOUNCED_PRIMARY_PLUS_FIX)?.id, 'e1');
  assert.equal(sendingAddress([]), undefined);
});

test('a bounced primary is NOT reachable, whatever else the member holds -- as the send decides', () => {
  const m = member(BOUNCED_PRIMARY_PLUS_FIX);
  assert.equal(isReachable(m), false);
  assert.deepEqual(recipientSplit([m]).excluded.map(x => x.id), ['m1'], 'the draft names them as excluded');
});

test('and the course counts them under Bounced, naming the bounced primary', () => {
  const issue = emailIssueFor(member(BOUNCED_PRIMARY_PLUS_FIX));
  assert.equal(issue?.kind, 'bounced');
  assert.equal(issue?.address, 'anju.rajesh.krithi@gamil.com');
});

test('a working primary is reachable and no issue, even beside a dead second address', () => {
  const m = member([
    { address: 'good@example.com', primary: true, status: 'unknown' },
    { address: 'dead@example.com', primary: false, status: 'bounced' },
  ]);
  assert.equal(isReachable(m), true);
  assert.equal(emailIssueFor(m), undefined);
});

// ------------------------------------------- a working address takes over from a bounce

test('a working address takes over from a bounced primary; the bounced row stays, demoted', () => {
  const out = promoteWorkingOverBounced(BOUNCED_PRIMARY_PLUS_FIX);
  assert.deepEqual(out.map(r => [r.id, r.primary]), [['e1', false], ['e2', true]]);
  assert.equal(out.find(r => r.id === 'e1')?.status, 'bounced', 'nothing reinstated');
  assert.equal(isReachable(member(out)), true, 'and the send will now use the corrected address');
});

test('the NEWEST working address is the one promoted', () => {
  const out = promoteWorkingOverBounced([
    { address: 'dead@example.com', primary: true, status: 'bounced' },
    { address: 'older@example.com', primary: false, status: 'unknown' },
    { address: 'newest@example.com', primary: false, status: 'unknown' },
  ]);
  assert.equal(sendingAddress(out)?.address, 'newest@example.com');
});

test('ONLY a bounce: an unsubscribed or spam-reported primary is left exactly as it is', () => {
  for (const status of ['unsubscribed', 'complained'] as const) {
    const rows: Row[] = [
      { address: 'said-stop@example.com', primary: true, status },
      { address: 'other@example.com', primary: false, status: 'unknown' },
    ];
    assert.equal(promoteWorkingOverBounced(rows), rows, `${status}: the member's own decision is not routed around`);
  }
});

test('nothing to promote to: a bounced primary with no working address stays as it is', () => {
  const rows: Row[] = [
    { address: 'dead@example.com', primary: true, status: 'bounced' },
    { address: 'gone@example.com', primary: false, status: 'unsubscribed' },
  ];
  assert.equal(promoteWorkingOverBounced(rows), rows);
});

test('a working primary is never moved', () => {
  const rows: Row[] = [
    { address: 'good@example.com', primary: true, status: 'unknown' },
    { address: 'also@example.com', primary: false, status: 'unknown' },
  ];
  assert.equal(promoteWorkingOverBounced(rows), rows);
});

// ------------------------------------------------------------- where it is applied

test('the edit form applies it as the record opens, as an address is added, and on save', () => {
  const edit = fs.readFileSync(path.join(process.cwd(), 'app/member/edit.tsx'), 'utf8');
  assert.match(edit, /useState\(\(\) => promoteWorkingOverBounced\(existing\?\.emails \?\? \[\]\)\)/, 'first render');
  assert.match(edit, /setEmails\(promoteWorkingOverBounced\(existing\.emails\)\)/, 'seeded from the record');
  assert.match(edit, /setEmails\(p => promoteWorkingOverBounced\(\[\.\.\.p, \{ address: e/, 'an address added');
  assert.match(edit, /const addresses = promoteWorkingOverBounced\(emails\)\.sort/, 'the order sent to update_member');
});

test('the rule the screens follow is the one the send follows: the primary row only', () => {
  const load = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/send-followups/load.ts'), 'utf8');
  assert.match(load, /from\('member_emails'\)[\s\S]{0,120}\.eq\('is_primary', true\)/);
});
