// The send loop is a bounded pool: at most N recipients in flight, every one
// written before its send and recorded after, results in the recipients'
// order, a provider that never answers recorded as failed. The same claims
// run under node in src/data/edgeSendLoop.test.ts; this file runs them in CI
// with the Edge Functions' own Deno.
import { assertEquals } from 'jsr:@std/assert@1';
import {
  runSendLoop, readConcurrency, DEFAULT_SEND_CONCURRENCY,
  type AdminLike, type PreparedRecipient, type SendingProvider, type OutgoingEmail, type ProviderResult,
} from './send-loop.ts';

function fakeAdmin() {
  const updates: { table: string; patch: Record<string, unknown> }[] = [];
  let n = 0;
  const admin: AdminLike = {
    from(table) {
      return {
        insert(_row) {
          return { select() { return { single() { return Promise.resolve({ data: { id: `msg-${++n}` }, error: null }); } }; } };
        },
        update(patch) { return { eq() { updates.push({ table, patch }); return Promise.resolve({ error: null }); } }; },
      };
    },
  };
  return { admin, updates };
}

function slowProvider(ms: number, hang: Set<string> = new Set()) {
  let inFlight = 0, peak = 0;
  const provider: SendingProvider = {
    name: 'fake',
    send(msg: OutgoingEmail): Promise<ProviderResult> {
      if (hang.has(msg.to)) return new Promise(() => {});
      inFlight++; peak = Math.max(peak, inFlight);
      return new Promise((resolve) => setTimeout(() => { inFlight--; resolve({ ok: true, providerMessageId: `p-${msg.to}` }); }, ms));
    },
  };
  return { provider, peak: () => peak };
}

const recipient = (i: number): PreparedRecipient => ({
  kind: 'send', memberId: `m${i}`, name: `Member ${i}`, toEmail: `m${i}@example.test`,
  subject: 's', text: 't', vars: {}, headers: [],
});

Deno.test('at most `concurrency` in flight, every recipient once, results in order, batch finalised last', async () => {
  const { admin, updates } = fakeAdmin();
  const { provider, peak } = slowProvider(10);
  const recipients = Array.from({ length: 23 }, (_, i) => recipient(i));
  const outcome = await runSendLoop(admin, provider, 'b1', recipients, () => 'now', { concurrency: 4 });
  assertEquals(peak(), 4);
  assertEquals(outcome.sent, 23);
  assertEquals(outcome.results.map((r) => r.member_id), recipients.map((r) => r.memberId));
  assertEquals(updates[updates.length - 1].table, 'email_batches');
});

Deno.test('a provider that never answers is a failed recipient; the rest still go', async () => {
  const { admin } = fakeAdmin();
  const { provider } = slowProvider(5, new Set(['m1@example.test']));
  const outcome = await runSendLoop(admin, provider, 'b1', [recipient(0), recipient(1), recipient(2)], () => 'now',
    { concurrency: 2, timeoutMs: 50 });
  assertEquals(outcome.results.map((r) => r.status), ['sent', 'failed', 'sent']);
  assertEquals(outcome.finalStatus, 'completed_with_failures');
});

Deno.test('the concurrency knob is read defensively', () => {
  assertEquals(readConcurrency(undefined), DEFAULT_SEND_CONCURRENCY);
  assertEquals(readConcurrency('8'), 8);
  assertEquals(readConcurrency('0'), DEFAULT_SEND_CONCURRENCY);
  assertEquals(readConcurrency('many'), DEFAULT_SEND_CONCURRENCY);
});
