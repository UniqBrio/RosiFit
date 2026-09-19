// The claim-and-drain slice (T-049). NOT IMPLEMENTED — this file is the
// SIGNATURE ONLY, written so that `drain.test.ts` (the failing spec, which
// comes first) names a real surface and is type checked by `check:edge` along
// with everything else. `runDrainSlice` throws. Every test in drain.test.ts is
// red until the drain is written on top of A's RPCs.
//
// Why a stub rather than a spec that imports nothing: `npm run check` runs
// `deno check **/*.ts` over this tree, and it is the definition of done for
// every session sharing this repository. A spec importing a module that does
// not exist turns their gate red for a reason that is not theirs. A stub that
// throws keeps the type check honest and leaves the failure where it belongs
// — in `deno test`, on the three cases T-049 has to satisfy.
//
// THE SHAPE, as ruled on 19-Sep-2026:
//   • The client drives the drain, one slice per call. There is no
//     self-chaining and no background loop; `pg_cron` arrives later, with the
//     stale-claim sweeper (T-053).
//   • `enqueue_send` writes every recipient's row up front — queued, or
//     excluded with its reason — and is idempotent on the client key.
//   • `claim_send_slice` flips a slice of `queued` rows to `sending` with
//     `claimed_at`, under `for update skip locked`, and returns them.
//   • Status is DERIVED: `email_batch_state` is the authority.
//     `email_batches.status` is a cache this function writes FROM the view
//     after each slice, never a counter it accumulates itself.
//   • A killed drain leaves its claimed rows in `sending` with a `claimed_at`.
//     They are not re-claimed and not guessed at: the sweeper ages them and
//     the result screen says the academy did not hear back. Resending
//     something that may already have gone out is T-052's question, not this
//     one.

import type { OutgoingEmail, SendingProvider } from './send-loop.ts';

/** One row of `claim_send_slice`'s result. The columns the send needs and no
 *  others — the template body is re-rendered from the stored template and
 *  these `variables`, the same split send-loop.ts already makes. */
export type ClaimedRow = {
  id: string;
  member_id: string;
  member_email_id: string | null;
  to_email: string;
  subject: string;
  variables: Record<string, string>;
  from_email: string | null;
};

/** One row of the derived view `email_batch_state`. This is what the result
 *  screen polls and what this function writes the cache from. */
export type BatchState = {
  batch_id: string;
  queued: number;
  sending: number;
  sent: number;
  failed: number;
  excluded: number;
  total: number;
  status: 'queued' | 'completed' | 'completed_with_failures';
};

/** The whole of the client surface the drain uses. Narrow, for the same
 *  reason `AdminLike` is narrow in send-loop.ts: a fake that satisfies it is
 *  a few lines, and anything wider is mimicry of the query builder. */
export interface DrainAdminLike {
  rpc(
    fn: 'claim_send_slice',
    args: { p_batch_id: string; p_slice: number },
  ): Promise<{ data: ClaimedRow[] | null; error: unknown }>;
  from(table: string): {
    update(patch: Record<string, unknown>): {
      eq(column: string, value: unknown): Promise<{ error: unknown }>;
    };
    select(columns: string): {
      eq(column: string, value: unknown): {
        single(): Promise<{ data: BatchState | null; error: unknown }>;
      };
    };
  };
}

export type DrainDeps = {
  admin: DrainAdminLike;
  provider: SendingProvider;
  /** Re-renders a claimed row into the message that goes out. */
  render: (row: ClaimedRow) => OutgoingEmail;
  slice?: number;
  now?: () => string;
};

export type DrainSliceOutcome = {
  claimed: number;
  sent: number;
  failed: number;
  /** Read back from `email_batch_state` AFTER the slice — never counted up
   *  from this call's own results. */
  state: BatchState;
};

/** A STARTING POINT, not a measured figure (ruled 19-Sep-2026). It is the
 *  number of rows a kill can strand in `sending`, so it is also the number the
 *  sweeper may have to age; move it when there is a measurement to move it
 *  with. */
export const DEFAULT_SLICE = 100;

export async function runDrainSlice(
  _deps: DrainDeps,
  _batchId: string,
): Promise<DrainSliceOutcome> {
  throw new Error(
    'T-049: runDrainSlice is not implemented. The spec in drain.test.ts is the '
    + 'contract; it stays red until A\'s enqueue_send / claim_send_slice / '
    + 'email_batch_state land and this file is written against them.',
  );
}
