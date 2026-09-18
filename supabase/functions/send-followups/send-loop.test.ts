// T-020 (RV-10): a failed `email_messages` insert must fail THAT recipient and
// leave the rest of the batch alone.
//
// What went wrong: index.ts:282 destructured `data` and not `error`, so a
// refused insert produced `msgRow === null`; the loop then sent the email
// anyway and reached `.eq('id', msgRow!.id)`, which throws TypeError. The
// throw escaped the loop, so every recipient after the first failure was
// never attempted and the batch was never finalised -- one bad insert, and a
// send stops silently part-way through with the batch row still `processing`.
//
// The ordering assertion is the one that matters most: the provider must NOT
// be called when the row could not be written. A message that goes out with
// no row to record it is worse than one that is not sent, because the batch
// counter then becomes its only trace -- see T-119, where 22 of 23 message
// rows are gone and the counters are all that is left.

import { assertEquals } from 'jsr:@std/assert@1';
import {
  runSendLoop,
  type AdminLike,
  type OutgoingEmail,
  type PreparedRecipient,
  type ProviderResult,
  type SendingProvider,
} from './send-loop.ts';

type Insert = { table: string; row: Record<string, unknown> };
type Update = { table: string; patch: Record<string, unknown>; column: string; value: unknown };

/** A fake admin client. `refuseInsertFor` names the member ids whose
 *  `email_messages` insert is refused, the way Postgres refuses one. */
function fakeAdmin(refuseInsertFor: Set<string> = new Set()) {
  const inserts: Insert[] = [];
  const updates: Update[] = [];
  let nextId = 1;

  const admin: AdminLike = {
    from(table: string) {
      return {
        insert(row: Record<string, unknown>) {
          return {
            select(_columns: string) {
              return {
                single() {
                  inserts.push({ table, row });
                  const member = String(row.member_id ?? '');
                  if (table === 'email_messages' && refuseInsertFor.has(member)) {
                    return Promise.resolve({
                      data: null,
                      error: { code: '23503', message: 'insert refused by the database' },
                    });
                  }
                  return Promise.resolve({ data: { id: `msg-${nextId++}` }, error: null });
                },
              };
            },
          };
        },
        update(patch: Record<string, unknown>) {
          return {
            eq(column: string, value: unknown) {
              updates.push({ table, patch, column, value });
              return Promise.resolve({ error: null });
            },
          };
        },
      };
    },
  };

  return { admin, inserts, updates };
}

function fakeProvider() {
  const sentTo: string[] = [];
  const provider: SendingProvider = {
    name: 'fake',
    send(msg: OutgoingEmail): Promise<ProviderResult> {
      sentTo.push(msg.to);
      return Promise.resolve({ ok: true, providerMessageId: `prov-${sentTo.length}` });
    },
  };
  return { provider, sentTo };
}

function recipient(memberId: string, name: string): PreparedRecipient {
  return {
    kind: 'send',
    memberId,
    name,
    toEmail: `${memberId}@example.test`,
    subject: 'Subject',
    text: 'Body',
    vars: {},
    fromAddress: 'academy@example.test',
    headers: [],
  };
}

Deno.test('a refused insert fails that recipient and the loop carries on', async () => {
  const { admin, updates } = fakeAdmin(new Set(['m2']));
  const { provider, sentTo } = fakeProvider();

  const outcome = await runSendLoop(
    admin, provider, 'batch-1',
    [recipient('m1', 'First'), recipient('m2', 'Second'), recipient('m3', 'Third')],
    () => '2026-09-18T00:00:00.000Z',
  );

  // Every recipient is accounted for, in order.
  assertEquals(outcome.results.map(r => r.member_id), ['m1', 'm2', 'm3']);
  assertEquals(outcome.results.map(r => r.status), ['sent', 'failed', 'sent']);

  // The one that could not be recorded is failed, and says why.
  const second = outcome.results[1];
  assertEquals(second.status, 'failed');
  assertEquals(typeof second.reason, 'string');
  assertEquals((second.reason ?? '').length > 0, true);

  // The email was NOT sent for the recipient whose row could not be written.
  assertEquals(sentTo, ['m1@example.test', 'm3@example.test']);

  // The loop reached the end and finalised the batch.
  assertEquals(outcome.sent, 2);
  assertEquals(outcome.failed, 1);
  assertEquals(outcome.excluded, 0);
  assertEquals(outcome.finalStatus, 'completed_with_failures');

  const batchUpdate = updates.find(u => u.table === 'email_batches');
  assertEquals(batchUpdate?.value, 'batch-1');
  assertEquals(batchUpdate?.patch.status, 'completed_with_failures');
  assertEquals(batchUpdate?.patch.sent_count, 2);
  assertEquals(batchUpdate?.patch.failed_count, 1);

  // No status update was attempted against the row that does not exist.
  const ghost = updates.filter(u => u.table === 'email_messages' && u.value == null);
  assertEquals(ghost.length, 0);
});

Deno.test('every insert refused still finalises the batch', async () => {
  const { admin } = fakeAdmin(new Set(['m1', 'm2']));
  const { provider, sentTo } = fakeProvider();

  const outcome = await runSendLoop(
    admin, provider, 'batch-2',
    [recipient('m1', 'First'), recipient('m2', 'Second')],
    () => '2026-09-18T00:00:00.000Z',
  );

  assertEquals(outcome.sent, 0);
  assertEquals(outcome.failed, 2);
  assertEquals(outcome.finalStatus, 'completed_with_failures');
  assertEquals(sentTo, []);
});

Deno.test('with no refusals nothing changes: all sent, batch completed', async () => {
  const { admin } = fakeAdmin();
  const { provider, sentTo } = fakeProvider();

  const outcome = await runSendLoop(
    admin, provider, 'batch-3',
    [recipient('m1', 'First'), recipient('m2', 'Second')],
    () => '2026-09-18T00:00:00.000Z',
  );

  assertEquals(outcome.sent, 2);
  assertEquals(outcome.failed, 0);
  assertEquals(outcome.finalStatus, 'completed');
  assertEquals(sentTo, ['m1@example.test', 'm2@example.test']);
});
