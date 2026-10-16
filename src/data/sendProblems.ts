/**
 * THE MEMBERS A SEND DID NOT REACH, as a file the academy can work through.
 *
 * Two kinds, on request (16-Oct-2026): "download list of members for whom
 * email is sent failed and bounced".
 *
 *   FAILED  -- the provider refused this message (`status: 'failed'`).
 *   BOUNCED -- not attempted, because the address on file has already
 *              bounced (`status: 'excluded'` with a bounce reason).
 *
 * Every other exclusion -- no email on file, unsubscribed, marked as spam --
 * stays on screen and out of this file: the ask was the two above, and an
 * opt-out is not something the academy is meant to chase.
 *
 * A bounce is told apart by its REASON because that is all the result row
 * carries. Both wordings it can arrive in are pinned in sendProblems.test.ts:
 * the send function's (`suppressionReason`, send-loop.ts) and the offline
 * fixtures' (`emailExclusionReason`, followup.ts).
 *
 * Pure on purpose, like csvFormat.ts: no `document`, so it is tested under
 * scripts/tsconfig.json with nothing to mock.
 */
import type { SendResult } from './sendBatch';
import { toCsv } from './csvFormat';

type ResultRow = SendResult['results'][number];

export type SendProblem = { name: string; outcome: 'Failed' | 'Bounced'; reason: string };

export const isBounceReason = (reason: string | undefined): boolean => /\bbounced\b/i.test(reason ?? '');

/** Failed first, then bounced, each in the order the result listed them. */
export function sendProblems(results: ResultRow[]): SendProblem[] {
  const failed = results.filter(r => r.status === 'failed')
    .map(r => ({ name: r.name, outcome: 'Failed' as const,
                 reason: r.reason ?? 'The provider refused the message.' }));
  const bounced = results.filter(r => r.status === 'excluded' && isBounceReason(r.reason))
    .map(r => ({ name: r.name, outcome: 'Bounced' as const, reason: r.reason ?? '' }));
  return [...failed, ...bounced];
}

export function sendProblemsCsv(rows: SendProblem[]): string {
  return toCsv(['Member', 'Outcome', 'Reason'], rows.map(r => [r.name, r.outcome, r.reason]));
}

export function sendProblemsFileName(at: Date): string {
  return `rosifit-email-failed-bounced-${at.toISOString().slice(0, 10)}.csv`;
}
