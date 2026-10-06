// The send loop: write the row, send it, record the outcome, finalise the
// batch. Lifted out of index.ts so a fake admin client can drive it (T-020).
//
// It is a separate module for one reason: index.ts calls `Deno.serve` at module
// scope, so importing it from a test starts a server. The loop is where the
// defect lives, so the loop is what a test has to be able to reach.
//
// The split is at the point where a recipient is fully RENDERED. Choosing the
// course's sender, reading the engine figures, building the unsubscribe link
// and filling the template all stay in index.ts; everything from the first
// write onwards lives here. That keeps one thing in each place: index.ts
// decides what each member is told, this file decides what is recorded.

/**
 * Why an address on file may not be written to, or null when it may. The one
 * place the send path reads `member_emails.status`: 'unknown' and 'valid' --
 * including an address a member or staff turned back on -- are sendable;
 * every suppression keeps its own reason.
 */
export function suppressionReason(status: string | null | undefined): string | null {
  switch (status) {
    case 'bounced': return 'Primary email has bounced';
    case 'unsubscribed': return 'Unsubscribed';
    case 'complained': return 'Marked as spam previously';
    case 'unknown': case 'valid': return null;
    default: return 'Email status is not recognised';
  }
}

/** Mirrors EmailMessage in ./email.ts. Restated so a test of the loop does not
 *  pull the SES client into its module graph. */
export type OutgoingEmail = {
  to: string; subject: string; text: string; from?: string;
  headers?: Array<{ name: string; value: string }>;
};

export type ProviderResult = { ok: boolean; providerMessageId?: string; error?: string };

export interface SendingProvider {
  readonly name: string;
  send(msg: OutgoingEmail): Promise<ProviderResult>;
}

/** The whole of the client surface the loop uses. Narrow on purpose: a fake
 *  that satisfies this is a few lines, and anything wider would be mimicry of
 *  the query builder rather than a test of the loop. */
export interface AdminLike {
  from(table: string): {
    insert(row: Record<string, unknown>): {
      select(columns: string): {
        single(): Promise<{ data: { id: string } | null; error: unknown }>;
      };
    };
    update(patch: Record<string, unknown>): {
      eq(column: string, value: unknown): Promise<{ error: unknown }>;
    };
  };
}

/** A recipient after rendering: either excluded with a reason, or ready to
 *  send with an address that is known to exist. `toEmail` is a plain string
 *  and not `string | null` precisely so the loop cannot be reached with a
 *  missing address -- that was the `emailRow!` assertion, moved into the type
 *  where the compiler enforces it instead of the author asserting it. */
export type PreparedRecipient =
  | { kind: 'excluded'; memberId: string; name: string; toEmail: string | null; subject: string; vars: Record<string, string>; reason: string; fromAddress?: string }
  | { kind: 'send'; memberId: string; name: string; toEmail: string; subject: string; text: string; vars: Record<string, string>; fromAddress?: string; headers: Array<{ name: string; value: string }> };

export type SendResultRow = { member_id: string; name: string; status: string; reason?: string };

export type SendLoopOutcome = {
  results: SendResultRow[];
  sent: number;
  failed: number;
  excluded: number;
  finalStatus: 'completed' | 'completed_with_failures';
};

/**
 * The sentence the operator reads next to this member on the result screen.
 * Named for what happened rather than for the database - "Could not record"
 * is what distinguishes this from a provider failure, and the two need
 * different actions from whoever reads the list.
 */
function describeWriteFailure(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  return code
    ? `Could not record this message, so it was not sent (${code}).`
    : 'Could not record this message, so it was not sent.';
}

/**
 * The template values as they are RECORDED -- everything but the member's
 * signed unsubscribe link.
 *
 * `email_messages` is readable by every signed-in account (0009,
 * `messages_read`), and since the Resubscribe button the link can undo an
 * opt-out as well as make one. A stored copy would let staff do what only the
 * member may (requests/2026-09-30-resubscribe-button.md). The email itself
 * still carries the link; only this record of it does not. Nothing reads
 * `variables` back to send, so dropping the key costs no behaviour.
 */
export function storableVars(vars: Record<string, string>): Record<string, string> {
  const { unsubscribe_url: _dropped, ...kept } = vars;
  return kept;
}

/**
 * HOW MANY RECIPIENTS ARE IN FLIGHT AT ONCE, and why not more.
 *
 * The loop was strictly serial: write the row, call the provider, record the
 * outcome, next -- 0.36-0.41 s a recipient in production, 120 s of function
 * time for 256 members, and a 1,000-member send past the Edge Function's
 * wall clock (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md RC-10).
 *
 * Now a bounded pool: at most SEND_CONCURRENCY recipients are between their
 * first write and their last at any moment. Four, by default, because the
 * ceiling that matters is SES's maximum send rate -- 14 a second once an
 * account is out of the sandbox, 1 a second inside it -- and four
 * recipients at ~0.3 s each is ~12 a second, under the production rate with
 * room for the database writes around each send; ISSUE_TRACKER T-010 is the
 * owner's read of the real figure, and SEND_CONCURRENCY (an Edge Function
 * secret) is the knob to turn once it is known. Unlimited concurrency would
 * trade a slow send for SES throttling (454 Throttling, recorded here as a
 * failed recipient) and PostgREST pool queueing.
 *
 * What the pool does NOT change: every recipient still writes its row before
 * the provider is called and records its outcome after; a refused write
 * still fails that recipient only; results come back in the order the
 * recipients were given; the batch is finalised once, after the last one.
 */
export const DEFAULT_SEND_CONCURRENCY = 4;

/** How long one provider call may take before it is recorded as failed
 *  rather than holding its pool slot -- and the whole send -- for ever. A
 *  timed-out send is NOT retried here: SES may have accepted it, and a second
 *  copy is worse than a row that says "failed" the operator can read. */
export const SEND_TIMEOUT_MS = 20_000;

export function readConcurrency(raw: string | undefined, fallback = DEFAULT_SEND_CONCURRENCY): number {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= 16 ? n : fallback;
}

async function withSendTimeout(
  send: Promise<ProviderResult>, ms: number,
): Promise<ProviderResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<ProviderResult>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false, error: `The email provider did not answer within ${Math.round(ms / 1000)} s.` }), ms);
  });
  try {
    return await Promise.race([send, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

export type SendLoopOptions = { concurrency?: number; timeoutMs?: number };

export async function runSendLoop(
  admin: AdminLike,
  provider: SendingProvider,
  batchId: string,
  recipients: PreparedRecipient[],
  now: () => string = () => new Date().toISOString(),
  options: SendLoopOptions = {},
): Promise<SendLoopOutcome> {
  const concurrency = Math.max(1, Math.min(16, Math.floor(options.concurrency ?? DEFAULT_SEND_CONCURRENCY)));
  const timeoutMs = options.timeoutMs ?? SEND_TIMEOUT_MS;
  // One slot per recipient, filled as each settles, so the result list is in
  // the recipients' order whatever order the pool finishes them in.
  const results: SendResultRow[] = new Array(recipients.length);
  let sent = 0, failed = 0, excluded = 0;

  const one = async (r: PreparedRecipient, at: number): Promise<void> => {
    if (r.kind === 'excluded') {
      await admin.from('email_messages').insert({
        batch_id: batchId, member_id: r.memberId, to_email: r.toEmail,
        subject: r.subject, variables: storableVars(r.vars), status: 'excluded', exclusion_reason: r.reason,
        from_email: r.fromAddress ?? null,
      }).select('id').single();
      results[at] = ({ member_id: r.memberId, name: r.name, status: 'excluded', reason: r.reason });
      excluded++;
      return;
    }

    const { data: msgRow, error: msgErr } = await admin.from('email_messages').insert({
      batch_id: batchId, member_id: r.memberId, to_email: r.toEmail,
      subject: r.subject, variables: storableVars(r.vars), status: 'sending',
      // RECORDED, not inferred. The sender now varies per course, so "which
      // address did this go out as" stops being answerable from the current
      // value of a secret and has to be written down per message.
      from_email: r.fromAddress ?? null,
    }).select('id').single();

    // CHECKED, and it costs this recipient only (T-020, RV-10). The error was
    // discarded here and the id asserted with `!`, so a refused insert sent the
    // email anyway and then threw TypeError on `msgRow!.id` - which escaped the
    // loop, so every later recipient went unattempted and the batch was never
    // finalised. One refused row stopped the whole send, silently, part-way.
    //
    // The provider is NOT called. A message with no row to record it is worse
    // than one that is not sent: the batch counter becomes its only trace, which
    // is precisely the state T-119 found in production. Failing the recipient
    // here is recoverable - the operator sees it named on the result screen and
    // can send again - and nothing is delivered twice.
    if (msgErr || !msgRow) {
      const reason = describeWriteFailure(msgErr);
      results[at] = ({ member_id: r.memberId, name: r.name, status: 'failed', reason });
      failed++;
      return;
    }

    const result = await withSendTimeout(provider.send({
      to: r.toEmail, subject: r.subject, text: r.text, from: r.fromAddress,
      headers: r.headers,
    }), timeoutMs);

    if (result.ok) {
      await admin.from('email_messages').update({
        status: 'sent', provider: provider.name, provider_message_id: result.providerMessageId,
        sent_at: now(), attempt_count: 1,
      }).eq('id', msgRow.id);
      await admin.from('member_stats').update({ last_emailed_at: now() }).eq('member_id', r.memberId);
      results[at] = ({ member_id: r.memberId, name: r.name, status: 'sent' });
      sent++;
    } else {
      await admin.from('email_messages').update({
        status: 'failed', provider: provider.name, failure_reason: result.error, attempt_count: 1,
      }).eq('id', msgRow.id);
      results[at] = ({ member_id: r.memberId, name: r.name, status: 'failed', reason: result.error });
      failed++;
    }
  };

  // THE POOL. `next` is the only shared state: each worker takes the next
  // recipient in order until there are none, so at most `concurrency` are in
  // flight and every recipient is taken exactly once. A worker that throws
  // (it should not -- every failure above is recorded, not thrown) takes the
  // whole send down the way the serial loop did, rather than silently
  // skipping the rest.
  let next = 0;
  const worker = async (): Promise<void> => {
    for (;;) {
      const at = next++;
      if (at >= recipients.length) return;
      await one(recipients[at], at);
    }
  };
  await Promise.all(Array.from({ length: Math.min(concurrency, recipients.length) }, worker));

  const finalStatus = failed > 0 ? 'completed_with_failures' : 'completed';
  await admin.from('email_batches').update({
    sent_count: sent, failed_count: failed, excluded_count: excluded,
    status: finalStatus, completed_at: now(),
  }).eq('id', batchId);

  return { results, sent, failed, excluded, finalStatus };
}
