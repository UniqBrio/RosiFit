/**
 * T-021: the app does not throw itself away while it is writing.
 *
 * Run: npx tsx --test src/data/inFlight.test.ts
 *
 * `DeploymentRefresh` reloads the tab when a new build is served, and it is
 * right to: an installed PWA is a tab that is never closed, so without it a
 * week of deployments can go by under somebody who never quit the app. Its
 * safety rule is `safeToReload(hidden, msSinceInteraction)` — sixty seconds
 * of no touch, OR the tab being backgrounded.
 *
 * Both of those are TRUE in the middle of a send (RV-30, C:RF-20). The
 * operator taps Send on 456 recipients and stops touching the screen, because
 * there is nothing left to touch; a serial send is minutes of wall clock
 * (RV-07). Sixty seconds in, the idle rule says the hands are off and the
 * page is thrown away mid-request. Backgrounding is worse and faster: switch
 * tabs to do something else while it runs and `hidden` permits the reload
 * immediately, with no waiting at all.
 *
 * What the reload costs is not the render. It is that the client never learns
 * what the write did — the batch id is gone, the result screen never opens,
 * and the operator is left to guess whether to send again (RV-12, T-054). The
 * same holds for an import commit, which is one transaction that either
 * landed or did not.
 *
 * THE FLAG IS A COUNTER, NOT A BOOLEAN, and that is the case worth pinning: a
 * bulk import started while a send is still running must not have the first
 * of the two to finish declare the app idle.
 *
 * The Playwright half — that a real reload is actually withheld — waits for
 * T-036 to put the browser checks in CI. This is the unit half.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { isWriteInFlight, duringWrite, resetInFlight } from './inFlight';

const ROOT = process.env.IN_FLIGHT_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set IN_FLIGHT_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};
const code = (rel: string) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

/** A write that does not finish until it is told to. */
function pending<T>(): { promise: Promise<T>; settle: (value: T) => void; fail: (e: Error) => void } {
  let settle!: (value: T) => void;
  let fail!: (e: Error) => void;
  const promise = new Promise<T>((resolve, reject) => { settle = resolve; fail = reject; });
  return { promise, settle, fail };
}

test('nothing is in flight to begin with', () => {
  resetInFlight();
  assert.equal(isWriteInFlight(), false);
});

test('a write in progress is in flight, and is not once it answers', async () => {
  resetInFlight();
  const write = pending<string>();
  const ran = duringWrite(() => write.promise);

  assert.equal(isWriteInFlight(), true, 'in flight while the request is open');
  write.settle('done');
  await ran;
  assert.equal(isWriteInFlight(), false, 'released once it answers');
});

test('a write that THROWS still releases the flag', async () => {
  resetInFlight();
  const write = pending<string>();
  const ran = duringWrite(() => write.promise);
  write.fail(new Error('the network dropped'));

  await assert.rejects(ran, /the network dropped/);
  // A failed send must not leave the app unable to take a new build for the
  // rest of the tab's life. The release belongs in a `finally`.
  assert.equal(isWriteInFlight(), false);
});

test('two overlapping writes: the first to finish does not declare the app idle', async () => {
  resetInFlight();
  const send = pending<string>();
  const importing = pending<string>();
  const sending = duringWrite(() => send.promise);
  const imported = duringWrite(() => importing.promise);

  send.settle('sent');
  await sending;
  // The import is still open. A boolean flag would read false here, and the
  // reload would land in the middle of it.
  assert.equal(isWriteInFlight(), true, 'still writing: the import has not answered');

  importing.settle('imported');
  await imported;
  assert.equal(isWriteInFlight(), false);
});

test('the write returns its own answer through the wrapper', async () => {
  resetInFlight();
  // The guard must be invisible to the caller, or call sites will grow
  // reasons not to use it.
  assert.equal(await duringWrite(async () => 'the batch id'), 'the batch id');
});

test('the send and the import commit are both wrapped', () => {
  const src = code('src/data/api.ts');

  for (const fn of ['sendFollowUps', 'csvCommit', 'csvPreview']) {
    const at = src.indexOf(`export function ${fn}`);
    assert.notEqual(at, -1, `${fn} is not in api.ts`);
    const body = src.slice(at, at + 700);
    assert.match(body, /duringWrite\(/, `${fn} does not hold the in-flight flag`);
  }
});

test('the bulk importers are wrapped too', () => {
  const src = code('src/data/repository.ts');

  for (const fn of ['bulkImportMembers', 'bulkSetMemberDates', 'bulkDeleteMembers']) {
    const at = src.indexOf(`export async function ${fn}`);
    assert.notEqual(at, -1, `${fn} is not in repository.ts`);
    const body = src.slice(at, at + 900);
    assert.match(body, /duringWrite\(/, `${fn} does not hold the in-flight flag`);
  }
});

test('the reload path consults the flag', () => {
  const wiring = code('src/pwa/DeploymentRefresh.tsx');

  assert.match(wiring, /isWriteInFlight\(\)/,
    'DeploymentRefresh must ask whether a write is in flight before reloading');
});

test('neither hidden nor idle can get past the flag', () => {
  const wiring = code('src/pwa/DeploymentRefresh.tsx');
  const guard = wiring.slice(wiring.indexOf('const reloadWhenIdle'));
  const condition = guard.slice(0, guard.indexOf('\n    }'));

  // `hidden` is the dangerous one: it permits a reload with NO waiting at
  // all, so a backgrounded tab mid-send is the fastest way to lose a write.
  // The flag therefore has to sit outside `safeToReload`, not inside its
  // idle branch.
  assert.match(condition, /isWriteInFlight\(\)\s*\|\|\s*!safeToReload\(/,
    'the in-flight check must short-circuit before the hidden/idle rule');
});
