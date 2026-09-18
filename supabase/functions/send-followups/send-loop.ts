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

export async function runSendLoop(
  admin: AdminLike,
  provider: SendingProvider,
  batchId: string,
  recipients: PreparedRecipient[],
  now: () => string = () => new Date().toISOString(),
): Promise<SendLoopOutcome> {
  const results: SendResultRow[] = [];
  let sent = 0, failed = 0, excluded = 0;

  for (const r of recipients) {
    if (r.kind === 'excluded') {
      await admin.from('email_messages').insert({
        batch_id: batchId, member_id: r.memberId, to_email: r.toEmail,
        subject: r.subject, variables: r.vars, status: 'excluded', exclusion_reason: r.reason,
        from_email: r.fromAddress ?? null,
      }).select('id').single();
      results.push({ member_id: r.memberId, name: r.name, status: 'excluded', reason: r.reason });
      excluded++;
      continue;
    }

    const { data: msgRow, error: msgErr } = await admin.from('email_messages').insert({
      batch_id: batchId, member_id: r.memberId, to_email: r.toEmail,
      subject: r.subject, variables: r.vars, status: 'sending',
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
      results.push({ member_id: r.memberId, name: r.name, status: 'failed', reason });
      failed++;
      continue;
    }

    const result = await provider.send({
      to: r.toEmail, subject: r.subject, text: r.text, from: r.fromAddress,
      headers: r.headers,
    });

    if (result.ok) {
      await admin.from('email_messages').update({
        status: 'sent', provider: provider.name, provider_message_id: result.providerMessageId,
        sent_at: now(), attempt_count: 1,
      }).eq('id', msgRow.id);
      await admin.from('member_stats').update({ last_emailed_at: now() }).eq('member_id', r.memberId);
      results.push({ member_id: r.memberId, name: r.name, status: 'sent' });
      sent++;
    } else {
      await admin.from('email_messages').update({
        status: 'failed', provider: provider.name, failure_reason: result.error, attempt_count: 1,
      }).eq('id', msgRow.id);
      results.push({ member_id: r.memberId, name: r.name, status: 'failed', reason: result.error });
      failed++;
    }
  }

  const finalStatus = failed > 0 ? 'completed_with_failures' : 'completed';
  await admin.from('email_batches').update({
    sent_count: sent, failed_count: failed, excluded_count: excluded,
    status: finalStatus, completed_at: now(),
  }).eq('id', batchId);

  return { results, sent, failed, excluded, finalStatus };
}
