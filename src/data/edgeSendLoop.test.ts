import test from 'node:test';
import assert from 'node:assert/strict';
import {
  runSendLoop, readConcurrency, DEFAULT_SEND_CONCURRENCY,
  type AdminLike, type PreparedRecipient, type SendingProvider, type OutgoingEmail, type ProviderResult,
} from '../../supabase/functions/send-followups/send-loop';
import { loadPeriodMetrics } from '../../supabase/functions/send-followups/load';

/**
 * THE SEND LOOP IS A BOUNDED POOL (send-followups,
 * docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-10).
 *
 * Run: npx tsx --test src/data/edgeSendLoop.test.ts
 *
 * send-loop.ts and load.ts are plain TypeScript the Edge Function bundles, so
 * they run under node here, where this box can run them; the Deno test
 * beside them (send-loop-pool.test.ts) runs the same claims in CI. Pinned:
 * at most N recipients in flight; every recipient written before its send
 * and recorded after; results in the recipients' order; a provider that
 * never answers is a failed recipient, not a hung send; and the batch's
 * figures come from ONE paged read rather than a call per recipient.
 */
function fakeAdmin() {
  const inserts: Record<string, unknown>[] = [];
  const updates: { table: string; patch: Record<string, unknown> }[] = [];
  let n = 0;
  const admin: AdminLike = {
    from(table) {
      return {
        insert(row) {
          return { select() { return { single() { inserts.push({ table, ...row }); return Promise.resolve({ data: { id: `msg-${++n}` }, error: null }); } }; } };
        },
        update(patch) { return { eq() { updates.push({ table, patch }); return Promise.resolve({ error: null }); } }; },
      };
    },
  };
  return { admin, inserts, updates };
}

function slowProvider(ms: number, hang: Set<string> = new Set()) {
  let inFlight = 0, peak = 0;
  const order: string[] = [];
  const provider: SendingProvider = {
    name: 'fake',
    send(msg: OutgoingEmail): Promise<ProviderResult> {
      order.push(msg.to);
      if (hang.has(msg.to)) return new Promise(() => {});          // never answers
      inFlight++; peak = Math.max(peak, inFlight);
      return new Promise(resolve => setTimeout(() => { inFlight--; resolve({ ok: true, providerMessageId: `p-${msg.to}` }); }, ms));
    },
  };
  return { provider, order, peak: () => peak };
}

const recipient = (i: number): PreparedRecipient => ({
  kind: 'send', memberId: `m${i}`, name: `Member ${i}`, toEmail: `m${i}@example.test`,
  subject: 's', text: 't', vars: {}, headers: [],
});

test('at most `concurrency` recipients are in flight, every one is sent once, results keep their order', async () => {
  const { admin, inserts, updates } = fakeAdmin();
  const { provider, order, peak } = slowProvider(20);
  const recipients = Array.from({ length: 23 }, (_, i) => recipient(i));
  const outcome = await runSendLoop(admin, provider, 'b1', recipients, () => 'now', { concurrency: 4 });
  assert.equal(peak(), 4, 'the pool is bounded at four');
  assert.equal(outcome.sent, 23);
  assert.equal(outcome.failed, 0);
  assert.deepEqual(outcome.results.map(r => r.member_id), recipients.map(r => r.memberId), 'results in the recipients\' order');
  assert.equal(new Set(order).size, 23, 'every recipient sent exactly once');
  assert.equal(inserts.filter(i => i.table === 'email_messages').length, 23, 'a row per recipient');
  // the batch finalised once, last
  const batch = updates.filter(u => u.table === 'email_batches');
  assert.equal(batch.length, 1);
  assert.equal(batch[0].patch.sent_count, 23);
  assert.equal(updates[updates.length - 1].table, 'email_batches', 'finalised after the last recipient');
});

test('100 recipients at 50 ms each take a quarter of the serial time with four in flight', async () => {
  const { admin } = fakeAdmin();
  const recipients = Array.from({ length: 100 }, (_, i) => recipient(i));
  const t0 = performance.now();
  const serial = await runSendLoop(admin, slowProvider(50).provider, 'b1', recipients, () => 'now', { concurrency: 1 });
  const serialMs = performance.now() - t0;
  const t1 = performance.now();
  const pooled = await runSendLoop(admin, slowProvider(50).provider, 'b2', recipients, () => 'now', { concurrency: 4 });
  const pooledMs = performance.now() - t1;
  assert.equal(serial.sent, 100); assert.equal(pooled.sent, 100);
  assert.ok(serialMs >= 5000, `serial took ${serialMs.toFixed(0)} ms`);
  assert.ok(pooledMs < serialMs / 3, `pooled took ${pooledMs.toFixed(0)} ms against serial ${serialMs.toFixed(0)} ms`);
});

test('a provider that never answers is a failed recipient with a sentence, and the rest still go', async () => {
  const { admin, updates } = fakeAdmin();
  const { provider } = slowProvider(5, new Set(['m1@example.test']));
  const outcome = await runSendLoop(admin, provider, 'b1', [recipient(0), recipient(1), recipient(2)], () => 'now',
    { concurrency: 2, timeoutMs: 100 });
  assert.deepEqual(outcome.results.map(r => r.status), ['sent', 'failed', 'sent']);
  assert.match(outcome.results[1].reason ?? '', /did not answer/);
  const failedRow = updates.find(u => u.table === 'email_messages' && u.patch.status === 'failed');
  assert.ok(failedRow, 'the timed-out recipient\'s row says failed');
  assert.equal(outcome.finalStatus, 'completed_with_failures');
});

test('the concurrency knob is read defensively', () => {
  assert.equal(readConcurrency(undefined), DEFAULT_SEND_CONCURRENCY);
  assert.equal(readConcurrency('8'), 8);
  assert.equal(readConcurrency('0'), DEFAULT_SEND_CONCURRENCY);
  assert.equal(readConcurrency('99'), DEFAULT_SEND_CONCURRENCY);
  assert.equal(readConcurrency('many'), DEFAULT_SEND_CONCURRENCY);
  assert.ok(DEFAULT_SEND_CONCURRENCY >= 2 && DEFAULT_SEND_CONCURRENCY <= 8, 'a default under SES\'s production rate');
});

test('the batch\'s period figures are one paged read, keyed by member', async () => {
  const calls: Record<string, unknown>[] = [];
  const all = Array.from({ length: 1500 }, (_, i) => ({ member_id: `m${String(i).padStart(5, '0')}`, expected: 4, attended: i % 4, missed: 4 - (i % 4), attendance_pct: 50 }));
  const admin = {
    rpc(name: string, args: Record<string, unknown>) {
      calls.push({ name, ...args });
      const after = args.p_after_member_id as string | null;
      const limit = args.p_limit as number;
      const page = all.filter(r => after == null || r.member_id > after).slice(0, limit);
      return Promise.resolve({ data: page, error: null });
    },
  };
  const wanted = ['m00003', 'm01499', 'm00777', 'nobody'];
  const map = await loadPeriodMetrics(admin, wanted, '2026-09-28', '2026-10-04');
  // A full page and a 500-row page: the shorter page ends the read (the
  // pager's rule since 06-Oct-2026), so two calls -- not one per recipient.
  assert.equal(calls.length, 2, 'two pages -- not one call per recipient');
  assert.ok(calls.every(c => c.name === 'member_period_metrics_page'));
  assert.equal(map.get('m00003')?.attended, 3);
  assert.equal(map.get('m01499')?.attended, 3);
  assert.equal(map.get('m00777')?.missed, 3);
  assert.equal(map.has('nobody'), false, 'a member with no attendance has no row -- the caller keeps the zeros');
  assert.equal(map.size, 3, 'only the batch\'s members are kept');
});
