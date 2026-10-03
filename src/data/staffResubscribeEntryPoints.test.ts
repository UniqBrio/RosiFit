import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

// EVERY STAFF ENTRY POINT, ONE SECURE OPERATION
// (requests/2026-10-01-staff-resubscribe-everywhere.md).
//
// Reach Out (the member pop-up and the send draft it opens) and Attendance
// offer "Resubscribe" through ONE hook, which calls ONE repository wrapper,
// which calls ONE RPC -- staff_resubscribe_member_email (0084), the only path
// the database allows (its guard refuses a direct write). Edit Member keeps
// its own button and calls the same wrapper. This reads the source, the
// repository's convention for wiring that a type checker cannot see.

const ROOT = process.env.STAFF_RESUBSCRIBE_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

const SCREENS = {
  'Reach Out pop-up': 'app/member/[id].tsx',
  'Reach Out send draft': 'app/send/index.tsx',
  'Attendance': 'app/(tabs)/attendance.tsx',
};

for (const [name, file] of Object.entries(SCREENS)) {
  test(`${name}: offers Resubscribe through the shared flow, and only for an unsubscribed address`, () => {
    const src = read(file);
    assert.match(src, /useStaffResubscribe\(\)/, `${file} must use the shared hook`);
    assert.match(src, /\{resubscribe\.dialog\}/, `${file} must mount the shared confirmation`);
    assert.match(src, /resubscribe\.open\(/, `${file} must open the shared confirmation, never write`);
    assert.match(src, /resubscribe\.offers\(|resubscribableAddresses\(/,
      `${file} must gate the action on the shared unsubscribed-only rule`);
    assert.doesNotMatch(src, /staffResubscribeEmail|staff_resubscribe_member_email/,
      `${file} must not call the operation itself -- one caller, the hook`);
    assert.match(src, /RESUBSCRIBE_COPY\.action/, `${file} must use the shared label`);
  });
}

test('the hook is the one caller on those screens, and it calls the repository wrapper', () => {
  const hook = read('src/components/useStaffResubscribe.tsx');
  assert.match(hook, /await staffResubscribeEmail\(memberEmailId, source, note\)/);
  assert.match(hook, /resubscribableAddresses\(emails\)/);
  assert.match(hook, /flash\(resubscribeOutcomeMessage\(result\)\)/, 'success and already-on are both told');
  assert.match(hook, /setRefusal\(/, 'a refusal (bounce, spam, not allowed) is shown in the dialog');
});

test('the repository wrapper calls the 0084 RPC, and Edit Member uses the same wrapper', () => {
  assert.match(read('src/data/repository.ts'), /rpc\('staff_resubscribe_member_email'/);
  assert.match(read('app/member/edit.tsx'), /staffResubscribeEmail\(resubscribing\.id, source, note\)/);
});

test('nothing in the app writes member_emails directly', () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })) {
      const rel = path.join(dir, e.name);
      if (e.isDirectory()) walk(rel);
      else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\./.test(e.name)) files.push(rel);
    }
  };
  walk('app'); walk('src');
  const writers = files.filter(f =>
    /from\(['"]member_emails['"]\)\s*\.\s*(update|insert|upsert|delete)\b/.test(read(f)));
  assert.deepEqual(writers, []);
});

// Review round (code-reviewer M1/M2, copy-gate M2, 01-Oct-2026).
test('Attendance reads only the unsubscribed addresses, never the whole member list', () => {
  const src = read('app/(tabs)/attendance.tsx');
  assert.match(src, /useUnsubscribedAddresses\(forced\)/);
  assert.doesNotMatch(src, /useMembers\(/, 'the register must not pay for seven paged member reads');
  const repo = read('src/data/repository.ts');
  assert.match(repo,
    /from\('member_emails'\)\s*\.select\('id, member_id, email, status'\)\.eq\('status', 'unsubscribed'\)\.is\('deleted_at', null\)/);
  assert.match(read('src/data/hooks.ts'),
    /export function useUnsubscribedAddresses[\s\S]{0,200}onMembersChanged/, 'refreshes after the change');
});

test('the dialog says on screen why Confirm is held when no address is chosen', () => {
  const src = read('src/components/StaffResubscribeDialog.tsx');
  assert.match(src, /source && !chosen && problem \?[\s\S]{0,300}testID="resubscribe-address-problem"/);
});
