import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { exclusionKind, exclusionSummary } from './followup';
import type { Member } from './mock';
import type { EmailStatus } from './emailStatus';

// THE SEND CONFIRMATIONS COUNT EACH REASON AS ITSELF
// (requests/2026-10-01-unsubscribe-get-confirms.md, owner step 6). They said
// "N without an address" for every excluded member, an unsubscribed one
// included.

const ROOT = process.env.EXCLUSION_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const member = (id: string, ...statuses: EmailStatus[]) => ({
  id, name: `M${id}`,
  emails: statuses.map((status, i) => ({ address: `m${id}-${i}@x.com`, primary: i === 0, status })),
}) as unknown as Member;

test('each excluded member is one of five kinds', () => {
  assert.equal(exclusionKind(member('1')), 'no_email');
  assert.equal(exclusionKind(member('2', 'unsubscribed')), 'unsubscribed');
  assert.equal(exclusionKind(member('3', 'bounced')), 'bounced');
  assert.equal(exclusionKind(member('4', 'complained')), 'complained');
  assert.equal(exclusionKind(member('5', 'bounced', 'unsubscribed')), 'unsubscribed', 'an opt-out leads');
  assert.equal(exclusionKind(member('6', 'bounced', 'complained')), 'complained', 'then a spam report');
});

test('one reason reads as its own count; several are listed after the total', () => {
  assert.equal(exclusionSummary([]), '');
  assert.equal(exclusionSummary([member('1', 'unsubscribed')]), '1 unsubscribed');
  assert.equal(exclusionSummary([member('1'), member('2')]), '2 with no email address');
  assert.equal(
    exclusionSummary([member('1'), member('2', 'unsubscribed'), member('3', 'bounced'),
      member('4', 'complained'), member('5', 'unsubscribed')]),
    '5 left out: 2 unsubscribed, 1 marked as spam, 1 bounced, 1 with no email address');
});

test('neither send confirmation says "without an address" any more', () => {
  const send = read('app/send/index.tsx');
  assert.doesNotMatch(send, /without an address/);
  assert.match(send, /exclusionSummary\(excluded\)/);
  const panel = read('src/components/FollowUpTriggerPanel.tsx');
  assert.doesNotMatch(panel, /without an address|no email address on file/);
  assert.match(read('app/member/[id].tsx'), /excludedSummary=\{exclusionSummary\(split\.excluded\)\}/);
});
