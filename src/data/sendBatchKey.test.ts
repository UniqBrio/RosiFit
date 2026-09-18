/**
 * T-017: ONE send, however many times the button is pressed.
 *
 * Run: npx tsx --test src/data/sendBatchKey.test.ts
 *
 * `email_batches.client_batch_id` has been `text not null unique` since
 * 0009_communication.sql:168, so the database has always been ready to refuse
 * a second batch for one attempt. Nothing ever gave it the chance: no caller
 * passed a key, the type at api.ts:269 made it optional, and
 * send-followups/index.ts:55 mints its own UUID when the caller omits one --
 * a key that by construction cannot collide with anything. Every retry was
 * therefore a new batch and a second set of emails to the same members, which
 * cannot be recalled (RV-06, A:F-05, B:F-05, C:RF-05).
 *
 * C:RF-05 names the paths that press the button twice without anybody
 * deciding to: a dropped response on a slow connection, a page refresh, and
 * the PWA's own auto-reload (RV-30, C:RF-20), which fires on 60s idle or
 * `hidden` and can land in the middle of a send. The first two survive the
 * component; the third survives the whole document. So the key cannot live in
 * component state -- it is held in `sessionStorage` under the screen and the
 * period, and a remount picks the same one back up.
 *
 * FOUR CLAIMS, each able to be lost on its own:
 *
 *   THE KEY DEDUPES -- driven against a fake server that enforces the unique
 *   index the way Postgres does. Two attempts, one key, one batch, and the
 *   second attempt is answered with what the first one did rather than with a
 *   failure that invites a third.
 *
 *   THE KEY SURVIVES A REMOUNT -- a reload mid-send is the case the whole row
 *   exists for, and a key minted in `useState` alone would be gone exactly
 *   when it is needed.
 *
 *   THE KEY IS RELEASED at a terminal outcome, so the next deliberate send
 *   for the same period is a new batch and not a permanent refusal.
 *
 *   THE CALL SITES PASS IT -- read from the source, because a screen that
 *   silently drops the key still sends, still succeeds, and has no runtime
 *   signal to test for. That is precisely how this shipped.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  FunctionError, attemptSend, openSendBatchKey, closeSendBatchKey,
  sendBatchName, memoryKeyStore,
  type BatchSummary, type SendFollowUpsInput, type SendResult,
} from './sendBatch';

const ROOT = process.env.SEND_BATCH_KEY_SPEC_ROOT ?? process.cwd();
const read = (rel: string) => {
  const full = path.join(ROOT, rel);
  assert.ok(fs.existsSync(full),
    `${ROOT} is not the repository root: no ${rel}. Run from the root, or set SEND_BATCH_KEY_SPEC_ROOT.`);
  return fs.readFileSync(full, 'utf8');
};
/** The source with its comments removed, so a rule NAMED in prose is not read
 *  as a rule kept in code. */
const code = (rel: string) => read(rel)
  .replace(/\/\*[\s\S]*?\*\//g, '')
  .split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');

const PERIOD = { from: '2026-09-14', to: '2026-09-20' };

/**
 * `email_batches` with its unique index, and the function that sits in front
 * of it. A duplicate `client_batch_id` raises 23505, which
 * send-followups/index.ts:183 turns into a 409 -- so that is what the fake
 * throws, as the typed error `callFn` raises for a non-2xx answer.
 */
function fakeServer() {
  const batches: Array<BatchSummary & { key: string }> = [];
  return {
    batches,
    send(input: SendFollowUpsInput): Promise<SendResult> {
      if (batches.some(b => b.key === input.client_batch_id)) {
        return Promise.reject(new FunctionError('This send has already been submitted.', 409));
      }
      batches.push({
        key: input.client_batch_id,
        id: `batch-${batches.length + 1}`,
        requested: input.member_ids.length,
        sent: input.member_ids.length,
        failed: 0,
        excluded: 0,
        status: 'completed',
        createdAt: '2026-09-18T09:00:00.000Z',
      });
      return Promise.resolve({
        batch_id: `batch-${batches.length}`,
        requested: input.member_ids.length,
        sent: input.member_ids.length,
        failed: 0,
        excluded: 0,
        results: input.member_ids.map(id => ({ member_id: id, name: id, status: 'sent' as const })),
      });
    },
    readBatch(key: string): Promise<BatchSummary | null> {
      const found = batches.find(b => b.key === key);
      return Promise.resolve(found ? { ...found } : null);
    },
  };
}

const draft = (key: string): SendFollowUpsInput => ({
  member_ids: ['m-1', 'm-2', 'm-3'],
  template_id: 't-1',
  period_from: PERIOD.from,
  period_to: PERIOD.to,
  client_batch_id: key,
});

test('two attempts carrying one key write exactly one batch', async () => {
  const server = fakeServer();
  const store = memoryKeyStore();
  const name = sendBatchName('draft:course-1', PERIOD);

  // The dropped-response case: the operator never saw an answer, so they
  // press Send again. The key is read back, not minted again.
  await attemptSend(server, draft(openSendBatchKey(name, store)));
  await attemptSend(server, draft(openSendBatchKey(name, store)));

  assert.equal(server.batches.length, 1);
});

test('the second attempt is answered with what the first one did', async () => {
  const server = fakeServer();
  const store = memoryKeyStore();
  const name = sendBatchName('draft:course-1', PERIOD);

  const first = await attemptSend(server, draft(openSendBatchKey(name, store)));
  const second = await attemptSend(server, draft(openSendBatchKey(name, store)));

  // Not a failure: a failure reads as "nothing happened, try again", which is
  // the sentence that sends the second set of emails (RV-12, T-054).
  assert.deepEqual(
    { kind: second.kind, sent: second.kind === 'already' ? second.batch?.sent : null },
    { kind: 'already', sent: first.kind === 'sent' ? first.result.sent : null },
  );
});

test('a 409 whose batch cannot be read back still answers "already", never "failed"', async () => {
  const server = fakeServer();
  const key = 'key-held-by-a-batch-this-caller-cannot-see';
  await attemptSend(server, draft(key));

  // RLS, a dropped read, a batch written by somebody else: the lookup is how
  // the figures are shown, never how the outcome is decided.
  const blind = { send: server.send, readBatch: () => Promise.reject(new Error('read failed')) };
  const second = await attemptSend(blind, draft(key));

  assert.deepEqual({ kind: second.kind, batch: second.kind === 'already' ? second.batch : undefined },
    { kind: 'already', batch: null });
});

test('two separate drafts hold two keys and write two batches', async () => {
  const server = fakeServer();
  const store = memoryKeyStore();

  await attemptSend(server, draft(openSendBatchKey(sendBatchName('draft:course-1', PERIOD), store)));
  await attemptSend(server, draft(openSendBatchKey(sendBatchName('draft:course-2', PERIOD), store)));

  // The key must not dedupe sends that are genuinely different, or one course
  // a week would be the most the academy could ever write to.
  assert.equal(server.batches.length, 2);
});

test('a remount for the same screen and period picks the same key back up', () => {
  const store = memoryKeyStore();
  const name = sendBatchName('draft:course-1', PERIOD);

  // The PWA reloaded, or the operator refreshed: a new mount, the same draft.
  const minted = openSendBatchKey(name, store);
  const remounted = openSendBatchKey(name, store);

  assert.equal(remounted, minted);
});

test('the next period is a different key', () => {
  const store = memoryKeyStore();
  const thisWeek = openSendBatchKey(sendBatchName('draft:course-1', PERIOD), store);
  const nextWeek = openSendBatchKey(
    sendBatchName('draft:course-1', { from: '2026-09-21', to: '2026-09-27' }), store);

  assert.notEqual(nextWeek, thisWeek);
});

test('a terminal outcome releases the key, so the next send is a new batch', async () => {
  const server = fakeServer();
  const store = memoryKeyStore();
  const name = sendBatchName('draft:course-1', PERIOD);

  await attemptSend(server, draft(openSendBatchKey(name, store)));
  // The operator has been SHOWN the outcome. Holding the key past that point
  // would refuse every later send for this period for as long as the tab
  // lives -- a member flagged on Friday could never be written to.
  closeSendBatchKey(name, store);
  await attemptSend(server, draft(openSendBatchKey(name, store)));

  assert.equal(server.batches.length, 2);
});

test('the key is minted once per draft, not once per attempt', () => {
  const store = memoryKeyStore();
  const name = sendBatchName('draft:course-1', PERIOD);
  openSendBatchKey(name, store);
  openSendBatchKey(name, store);
  openSendBatchKey(name, store);

  assert.equal(store.size(), 1);
});

test('the send input requires client_batch_id — an omitted key is a typecheck failure', () => {
  const src = code('src/data/sendBatch.ts');
  const start = src.indexOf('export type SendFollowUpsInput');
  const block = src.slice(start, src.indexOf('};', start));

  // `client_batch_id?: string` is what shipped: two call sites omitted it and
  // every check stayed green. The `?` is the whole defect, so it is the
  // character this assertion is here to refuse.
  assert.match(block, /client_batch_id\s*:\s*string\s*;/);
});

test('the required input is the one the api function takes', () => {
  // The type can only make an omission a build failure if the exported
  // function actually uses it -- a second, looser inline shape beside it
  // would put the rule back where it was.
  assert.match(code('src/data/api.ts'),
    /export function sendFollowUps\(input:\s*SendFollowUpsInput\)/);
});

test('the send draft mints its key when the draft opens and passes it', () => {
  const src = code('app/send/index.tsx');

  assert.ok(
    /useState\(\s*\(\)\s*=>\s*openSendBatchKey\(/.test(src) && /client_batch_id:/.test(src),
    'app/send/index.tsx must open a key in useState and pass it to the send',
  );
});

test('the member record mints its key when the draft opens and passes it', () => {
  const src = code('app/member/[id].tsx');

  assert.ok(
    /useState\(\s*\(\)\s*=>\s*openSendBatchKey\(/.test(src) && /client_batch_id:/.test(src),
    'app/member/[id].tsx must open a key in useState and pass it to the send',
  );
});

test('neither call site clears the key on an ordinary failure', () => {
  // The retry case IS the point: a transport failure leaves the outcome
  // unknown, and that is exactly when the key must still be there.
  for (const rel of ['app/send/index.tsx', 'app/member/[id].tsx']) {
    const src = code(rel);
    const catchBlock = src.slice(src.indexOf('} catch'), src.indexOf('} finally'));
    assert.ok(!catchBlock.includes('closeSendBatchKey'), `${rel} releases the key on a failure`);
  }
});
