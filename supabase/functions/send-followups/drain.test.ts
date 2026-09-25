// T-049 — claim and drain. THIS SPEC IS RED ON PURPOSE and stays red until the
// drain is written: `drain.ts` is a signature-only stub that throws.
//
// Three cases, one per thing the row's Proof column asks for:
//
//   1. Kill the drain mid-slice → every row is defensible. What went out says
//      so, what was claimed and never attempted says `sending` with a claim
//      time, nothing is invented in either direction, and the next drain sends
//      none of it again.
//   2. Same key twice → nothing is sent twice. `enqueue_send` is idempotent on
//      the client key AND on the per-recipient unique key, which is why the
//      excluded rows matter: they carry `member_email_id is null`, so without
//      NULLS NOT DISTINCT the second enqueue quietly writes them all again.
//   3. Status is derived. `email_batch_state` is the authority; the drain
//      writes `email_batches.status` FROM the view after each slice and never
//      accumulates it, which is what stops a killed drain leaving counters
//      that disagree with the rows (T-119 is what that looks like afterwards).
//
// The fake below is not a mock of PostgREST. It is the agreed SQL semantics
// written out in TypeScript — the unique key with NULLS NOT DISTINCT, the
// claim that takes only `queued` rows in `created_at` order, the derived
// status — so that a change of mind about the SQL shows up here as a failing
// assertion rather than as a green test against a different design.
//
// Agreed RPC signatures this spec pins (the A-side spec is in T-049's row):
//   enqueue_send(p_client_batch_id text, p_template_id uuid, p_period_from date,
//                p_period_to date, p_recipients jsonb)
//     → table (batch_id uuid, queued int, excluded int, already boolean)
//   claim_send_slice(p_batch_id uuid, p_slice int default 100)
//     → setof (id, member_id, member_email_id, to_email, subject, variables, from_email)
//   view email_batch_state (batch_id, queued, sending, sent, failed, excluded,
//                           total, status)

import { assertEquals, assertRejects } from 'jsr:@std/assert@1';
import {
  DEFAULT_SLICE,
  runDrainSlice,
  type BatchState,
  type ClaimedRow,
  type DrainAdminLike,
} from './drain.ts';
import type { OutgoingEmail, ProviderResult, SendingProvider } from './send-loop.ts';

// ---------------------------------------------------------------------------
// The agreed database, in memory.
// ---------------------------------------------------------------------------

type MessageRow = {
  id: string;
  batch_id: string;
  member_id: string;
  member_email_id: string | null;
  to_email: string | null;
  subject: string;
  variables: Record<string, string>;
  from_email: string | null;
  status: string;
  exclusion_reason: string | null;
  provider: string | null;
  provider_message_id: string | null;
  failure_reason: string | null;
  attempt_count: number;
  created_at: string;
  claimed_at: string | null;
  sent_at: string | null;
};

type BatchRow = {
  id: string;
  client_batch_id: string;
  status: string;
  requested_count: number;
  sent_count: number;
  failed_count: number;
  excluded_count: number;
  completed_at: string | null;
};

/** One entry of `p_recipients`. `member_email_id` is written on EVERY row,
 *  including the excluded ones, where null is the meaning and not an omission
 *  (ruled 19-Sep-2026). */
type EnqueueRecipient = {
  member_id: string;
  member_email_id: string | null;
  to_email: string | null;
  subject: string;
  variables: Record<string, string>;
  from_email: string | null;
  exclusion_reason: string | null;
};

type EnqueueArgs = {
  p_client_batch_id: string;
  p_template_id: string;
  p_period_from: string;
  p_period_to: string;
  p_recipients: EnqueueRecipient[];
};

type EnqueueResult = { batch_id: string; queued: number; excluded: number; already: boolean };

function fakeDatabase() {
  const batches: BatchRow[] = [];
  const rows: MessageRow[] = [];
  const batchWrites: Array<{ id: string; patch: Record<string, unknown> }> = [];
  let tick = 0;
  const now = () => new Date(Date.UTC(2026, 8, 19, 9, 0, tick++)).toISOString();

  /** `enqueue_send`. Idempotent twice over: the batch is found by its client
   *  key, and each recipient row is `on conflict do nothing` against
   *  `unique nulls not distinct (batch_id, member_id, member_email_id)`.
   *  Under today's constraint (nulls distinct) the `===` comparison of two
   *  nulls below would have to read "never clashes", and every excluded row
   *  would be written again on every retry — the change ruling 1 asks for. */
  function enqueueSend(args: EnqueueArgs): EnqueueResult {
    let batch = batches.find((b) => b.client_batch_id === args.p_client_batch_id);
    const already = batch !== undefined;
    if (!batch) {
      batch = {
        id: `batch-${batches.length + 1}`,
        client_batch_id: args.p_client_batch_id,
        status: 'queued',
        requested_count: args.p_recipients.length,
        sent_count: 0,
        failed_count: 0,
        excluded_count: 0,
        completed_at: null,
      };
      batches.push(batch);
    }
    const batchId = batch.id;

    let queued = 0;
    let excluded = 0;
    for (const r of args.p_recipients) {
      const clash = rows.some((m) =>
        m.batch_id === batchId
        && m.member_id === r.member_id
        && m.member_email_id === r.member_email_id
      );
      if (clash) continue;
      const status = r.exclusion_reason ? 'excluded' : 'queued';
      rows.push({
        id: `msg-${rows.length + 1}`,
        batch_id: batchId,
        member_id: r.member_id,
        member_email_id: r.member_email_id,
        to_email: r.to_email,
        subject: r.subject,
        variables: r.variables,
        from_email: r.from_email,
        status,
        exclusion_reason: r.exclusion_reason,
        provider: null,
        provider_message_id: null,
        failure_reason: null,
        attempt_count: 0,
        created_at: now(),
        claimed_at: null,
        sent_at: null,
      });
      if (status === 'queued') queued++;
      else excluded++;
    }
    return { batch_id: batchId, queued, excluded, already };
  }

  /** `claim_send_slice`. `queued` only, oldest first, `for update skip
   *  locked` — a row another drain is holding is invisible here, and so is a
   *  row a killed drain left in `sending`. Nothing is re-claimed. */
  function claimSendSlice(batchId: string, slice: number): ClaimedRow[] {
    const claimable = rows
      .filter((r) => r.batch_id === batchId && r.status === 'queued')
      .sort((a, b) =>
        a.created_at === b.created_at
          ? a.id.localeCompare(b.id)
          : a.created_at.localeCompare(b.created_at)
      )
      .slice(0, slice);
    const at = now();
    for (const r of claimable) {
      r.status = 'sending';
      r.claimed_at = at;
    }
    return claimable.map((r) => ({
      id: r.id,
      member_id: r.member_id,
      member_email_id: r.member_email_id,
      to_email: String(r.to_email),
      subject: r.subject,
      variables: r.variables,
      from_email: r.from_email,
    }));
  }

  /** The view `email_batch_state`. A batch is finished when no row is still
   *  queued or claimed; excluded rows do not hold it open. */
  function batchState(batchId: string): BatchState {
    const mine = rows.filter((r) => r.batch_id === batchId);
    const n = (s: string) => mine.filter((r) => r.status === s).length;
    const queued = n('queued');
    const sending = n('sending');
    const failed = n('failed');
    const status: BatchState['status'] = queued + sending > 0
      ? 'queued'
      : failed > 0
      ? 'completed_with_failures'
      : 'completed';
    return {
      batch_id: batchId,
      queued,
      sending,
      sent: n('sent'),
      failed,
      excluded: n('excluded'),
      total: mine.length,
      status,
    };
  }

  const admin: DrainAdminLike = {
    rpc(_fn, args) {
      return Promise.resolve({ data: claimSendSlice(args.p_batch_id, args.p_slice), error: null });
    },
    from(table: string) {
      return {
        update(patch: Record<string, unknown>) {
          return {
            eq(column: string, value: unknown) {
              const id = String(value);
              if (table === 'email_messages' && column === 'id') {
                const row = rows.find((r) => r.id === id);
                if (row) Object.assign(row, patch);
              } else if (table === 'email_batches' && column === 'id') {
                const batch = batches.find((b) => b.id === id);
                if (batch) Object.assign(batch, patch);
                batchWrites.push({ id, patch });
              }
              return Promise.resolve({ error: null });
            },
          };
        },
        select(_columns: string) {
          return {
            eq(_column: string, value: unknown) {
              return {
                single() {
                  return Promise.resolve({ data: batchState(String(value)), error: null });
                },
              };
            },
          };
        },
      };
    },
  };

  return {
    admin,
    enqueueSend,
    batchState,
    batchWrites,
    now,
    rowFor: (batchId: string, memberId: string) =>
      rows.find((r) => r.batch_id === batchId && r.member_id === memberId),
    rowsIn: (batchId: string) => rows.filter((r) => r.batch_id === batchId),
    batch: (batchId: string) => batches.find((b) => b.id === batchId),
  };
}

// ---------------------------------------------------------------------------
// The provider, and the two ways a slice can end badly.
// ---------------------------------------------------------------------------

/** The drain dying between the claim and the write — a redeploy, a wall
 *  clock, the operator closing the tab. It is NOT a send failure and must not
 *  be recorded as one. */
class Killed extends Error {
  constructor() {
    super('the drain was killed mid-slice');
  }
}

function fakeProvider(opts: { killOn?: string; failOn?: string } = {}) {
  const sentTo: string[] = [];
  const provider: SendingProvider = {
    name: 'fake',
    send(msg: OutgoingEmail): Promise<ProviderResult> {
      if (opts.killOn && msg.to === opts.killOn) return Promise.reject(new Killed());
      sentTo.push(msg.to);
      if (opts.failOn && msg.to === opts.failOn) {
        return Promise.resolve({ ok: false, error: 'SES said no' });
      }
      return Promise.resolve({ ok: true, providerMessageId: `prov-${sentTo.length}` });
    },
  };
  return { provider, sentTo };
}

function render(row: ClaimedRow): OutgoingEmail {
  return {
    to: row.to_email,
    subject: row.subject,
    text: `Rendered for ${row.member_id}`,
    from: row.from_email ?? undefined,
  };
}

function sendable(memberId: string): EnqueueRecipient {
  return {
    member_id: memberId,
    member_email_id: `email-${memberId}`,
    to_email: `${memberId}@example.test`,
    subject: 'Subject',
    variables: { member_name: memberId },
    from_email: 'academy@example.test',
    exclusion_reason: null,
  };
}

/** An excluded recipient. `member_email_id` is null BY MEANING — there is no
 *  address on file to name — which is exactly the row the unique key has to
 *  keep catching. */
function excluded(memberId: string, reason = 'No email on file'): EnqueueRecipient {
  return {
    member_id: memberId,
    member_email_id: null,
    to_email: null,
    subject: 'Subject',
    variables: { member_name: memberId },
    from_email: 'academy@example.test',
    exclusion_reason: reason,
  };
}

function enqueueArgs(key: string, recipients: EnqueueRecipient[]): EnqueueArgs {
  return {
    p_client_batch_id: key,
    p_template_id: 'template-1',
    p_period_from: '2026-09-14',
    p_period_to: '2026-09-20',
    p_recipients: recipients,
  };
}

// ---------------------------------------------------------------------------
// 1. Kill the drain mid-slice.
// ---------------------------------------------------------------------------

Deno.test('a drain killed mid-slice leaves every row defensible, and sends none of them twice', async () => {
  const db = fakeDatabase();
  const { batch_id } = db.enqueueSend(
    enqueueArgs('key-kill', [sendable('m1'), sendable('m2'), sendable('m3')]),
  );
  const { provider, sentTo } = fakeProvider({ killOn: 'm2@example.test' });

  await assertRejects(
    () => runDrainSlice({ admin: db.admin, provider, render, now: db.now }, batch_id),
    Killed,
  );

  // What went out says so.
  const first = db.rowFor(batch_id, 'm1');
  assertEquals(first?.status, 'sent');
  assertEquals(typeof first?.sent_at, 'string');
  assertEquals(first?.provider_message_id, 'prov-1');

  // The one it died on is neither sent nor failed. It is claimed, with the
  // time it was claimed, and that is the whole of what is known about it.
  const inFlight = db.rowFor(batch_id, 'm2');
  assertEquals(inFlight?.status, 'sending');
  assertEquals(typeof inFlight?.claimed_at, 'string');
  assertEquals(inFlight?.sent_at, null);
  assertEquals(inFlight?.failure_reason, null);

  // The one it never reached is in the same honest state: claimed, unattempted.
  const untouched = db.rowFor(batch_id, 'm3');
  assertEquals(untouched?.status, 'sending');
  assertEquals(typeof untouched?.claimed_at, 'string');
  assertEquals(untouched?.sent_at, null);

  // The cache was not written by a half-run slice, so it cannot claim a
  // terminal state the rows do not support.
  assertEquals(db.batchWrites.length, 0);
  assertEquals(db.batch(batch_id)?.status, 'queued');
  assertEquals(db.batch(batch_id)?.sent_count, 0);

  // The view is where the truth is, and it says the batch is not finished.
  const state = db.batchState(batch_id);
  assertEquals(state.sent, 1);
  assertEquals(state.sending, 2);
  assertEquals(state.queued, 0);
  assertEquals(state.status, 'queued');

  // Resume. The two stranded rows are not re-claimed and not re-sent: they
  // belong to the sweeper (T-053) and to the result screen's third state.
  const resumed = await runDrainSlice({ admin: db.admin, provider, render, now: db.now }, batch_id);
  assertEquals(resumed.claimed, 0);
  assertEquals(resumed.sent, 0);
  assertEquals(sentTo, ['m1@example.test']);
});

// ---------------------------------------------------------------------------
// 2. The same key, twice.
// ---------------------------------------------------------------------------

Deno.test('the same client key enqueues once — excluded rows included — and drains once', async () => {
  const db = fakeDatabase();
  const recipients = [sendable('m1'), excluded('m2'), excluded('m3', 'Unsubscribed')];

  const first = db.enqueueSend(enqueueArgs('key-retry', recipients));
  assertEquals(first.already, false);
  assertEquals(first.queued, 1);
  assertEquals(first.excluded, 2);

  // The retry the operator's client makes after a dropped response.
  const second = db.enqueueSend(enqueueArgs('key-retry', recipients));
  assertEquals(second.already, true);
  assertEquals(second.batch_id, first.batch_id);
  assertEquals(second.queued, 0);
  assertEquals(second.excluded, 0);

  // Three rows, not six. The two that collided carry `member_email_id is
  // null`, so this assertion fails under a NULLS DISTINCT unique key.
  assertEquals(db.rowsIn(first.batch_id).length, 3);

  const { provider, sentTo } = fakeProvider();
  const drained = await runDrainSlice(
    { admin: db.admin, provider, render, now: db.now },
    first.batch_id,
  );
  assertEquals(drained.claimed, 1);
  assertEquals(drained.sent, 1);
  assertEquals(drained.state.status, 'completed');
  assertEquals(drained.state.excluded, 2);

  // A third enqueue and a second drain, both after the send: still one email.
  const third = db.enqueueSend(enqueueArgs('key-retry', recipients));
  assertEquals(third.already, true);
  assertEquals(third.queued, 0);
  const again = await runDrainSlice(
    { admin: db.admin, provider, render, now: db.now },
    first.batch_id,
  );
  assertEquals(again.claimed, 0);
  assertEquals(again.sent, 0);
  assertEquals(sentTo, ['m1@example.test']);
});

// ---------------------------------------------------------------------------
// 3. The view is the authority; the column is a cache.
// ---------------------------------------------------------------------------

Deno.test('status is read from the derived view and written to the cache, slice by slice', async () => {
  const db = fakeDatabase();
  const recipients = Array.from(
    { length: 101 },
    (_, i) => sendable(`m${String(i + 1).padStart(3, '0')}`),
  );
  const { batch_id } = db.enqueueSend(enqueueArgs('key-slices', recipients));
  // The last one fails at the provider, so the finished batch has to come out
  // `completed_with_failures` — derived from the rows, not from a counter.
  const { provider, sentTo } = fakeProvider({ failOn: 'm101@example.test' });

  const one = await runDrainSlice({ admin: db.admin, provider, render, now: db.now }, batch_id);
  assertEquals(DEFAULT_SLICE, 100);
  assertEquals(one.claimed, 100);
  assertEquals(one.sent, 100);
  assertEquals(one.state.queued, 1);
  assertEquals(one.state.status, 'queued');

  // The cache now carries the view's numbers and the new `queued` value, and
  // says nothing about being finished.
  assertEquals(db.batch(batch_id)?.status, 'queued');
  assertEquals(db.batch(batch_id)?.sent_count, 100);
  assertEquals(db.batch(batch_id)?.completed_at, null);

  const two = await runDrainSlice({ admin: db.admin, provider, render, now: db.now }, batch_id);
  assertEquals(two.claimed, 1);
  assertEquals(two.sent, 0);
  assertEquals(two.failed, 1);
  assertEquals(two.state.status, 'completed_with_failures');
  assertEquals(two.state.sent, 100);
  assertEquals(two.state.queued, 0);
  assertEquals(two.state.sending, 0);

  // Cache and view agree because one was written from the other.
  assertEquals(db.batch(batch_id)?.status, 'completed_with_failures');
  assertEquals(db.batch(batch_id)?.sent_count, 100);
  assertEquals(db.batch(batch_id)?.failed_count, 1);
  assertEquals(db.batch(batch_id)?.excluded_count, 0);
  assertEquals(typeof db.batch(batch_id)?.completed_at, 'string');

  assertEquals(sentTo.length, 101);

  // A slice size is a parameter, not a constant of the design.
  const small = fakeDatabase();
  const smallBatch = small.enqueueSend(
    enqueueArgs('key-small', [sendable('a'), sendable('b'), sendable('c')]),
  );
  const { provider: p2 } = fakeProvider();
  const sliced = await runDrainSlice(
    { admin: small.admin, provider: p2, render, slice: 2, now: small.now },
    smallBatch.batch_id,
  );
  assertEquals(sliced.claimed, 2);
  assertEquals(sliced.state.queued, 1);
  assertEquals(sliced.state.status, 'queued');
});
