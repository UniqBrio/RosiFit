/**
 * The two pure rules that decide whether a secrets field holds a usable SES
 * from-address. Pure and Deno-global-free on purpose: `src/data/fromAddress.test.ts`
 * imports THIS file, so the rule that runs in production is the rule under
 * test, not a copy of it kept in step by hand.
 */

/**
 * Strips wrapping quotes a shell left behind.
 *
 * `supabase secrets set SES_FROM_ADDRESS="UniqBrio <me@example.com>"` in
 * PowerShell stores the quote CHARACTERS as part of the value, and so does
 * pasting a quoted value into the dashboard field. The result reads correctly
 * to a person and is wrong to every consumer.
 *
 * This is safe for every secret this project holds because none of them may
 * legitimately begin AND end with a quote: an AWS key is `[A-Za-z0-9/+]{40}`,
 * a region is a slug, and a from-address ends `>` or with the domain. Note
 * that `"UniqBrio" <me@example.com>` -- where the quotes correctly wrap only
 * the display name -- ends in `>`, so it is left exactly as it is.
 *
 * Applied to ALL of them, not just the from-address, because a quoted
 * `AWS_SECRET_ACCESS_KEY` fails far worse: the signature simply does not
 * match, and SES answers 403 with nothing that points at the quotes.
 */
export function unquoteSecret(raw: string): string {
  let v = raw.trim();
  // Loop rather than strip once: a value quoted by both a shell and a human
  // arrives double-wrapped, and one pass would leave it still broken.
  while (v.length >= 2) {
    const first = v[0];
    if ((first === '"' || first === "'") && v[v.length - 1] === first) {
      v = v.slice(1, -1).trim();
    } else break;
  }
  return v;
}

// `=` and `,` are excluded from the address deliberately. Both are legal in an
// email local part and neither is ever used in one, and their absence catches
// the two mistakes people actually make in a secrets field: pasting the whole
// `SES_FROM=someone@example.com` line, and putting two addresses in one value.
const ADDR = String.raw`[^<>@\s=,]+@[^<>@\s=,]+\.[^<>@\s=,]+`;

// String.raw on BOTH halves, and that is not a style choice. Written as a
// plain template literal this read `<\s*...\s*>`, and a plain literal eats an
// unrecognised escape -- `\s` became the letter `s`, so the pattern matched a
// run of the letter s where it meant whitespace. It still accepted the common
// `Academy <me@example.com>` (zero s's, zero spaces), which is why nothing
// caught it; `Academy < me@example.com >` was refused for no stated reason.
const FROM_SHAPE = new RegExp(
  String.raw`^(?:${ADDR}|[^<>=]*<\s*${ADDR}\s*>)$`
);

/**
 * A from-address SES will accept: either a bare `name@example.com` or the
 * display form `Academy <name@example.com>`.
 *
 * Checked HERE because SES's own refusal is `400 Missing final '@domain'`,
 * which names neither the field nor the value -- it arrived on this project as
 * a per-member failure on a send where the RECIPIENT was demonstrably fine,
 * and the only way to know it meant the sender was to reason it out.
 */
export function isFromAddress(value: string): boolean {
  return FROM_SHAPE.test(value);
}

/**
 * WHICH address a given message goes out as.
 *
 * Until 07-Sep-2026 there was nothing to decide: `send-followups` called SES
 * with `SES_FROM_ADDRESS` and never looked at anything else, so the From Email
 * ID picked in the course form was STORED BY `save_course` AND NEVER USED. An
 * academy that set one course to its second address watched every message from
 * that course go out as the first one, with nothing anywhere reporting a
 * difference -- the send said SENT and it was telling the truth about delivery
 * while being wrong about the sender.
 *
 * So the course's own address wins where it has one, and the secret is the
 * fallback for a course that has never been configured. That is the same
 * "the course's own where it has any, the deployment's where it has not"
 * shape `effective_course_message` already uses for wording, stated here for
 * the sender.
 *
 * REFUSING RATHER THAN QUIETLY SUBSTITUTING. A stored address that is not an
 * address comes back `ok: false`, and the caller excludes that recipient
 * naming it. Falling back to the secret would be the worse answer: the send
 * would succeed, the academy would be told it sent, and the course's
 * deliberate choice of sender would have been discarded silently -- which is
 * the exact defect this function exists to end. The caller still records the
 * address it used on every message, so "which address did this go out as" is
 * answerable per message rather than inferred from a secret's current value.
 *
 * WHAT THIS CANNOT CHECK. Shape only. Whether SES will ACCEPT the address --
 * whether its domain is a verified identity in the sending region -- is not
 * knowable here and is not guessed at: SES answers that at send time and its
 * refusal is recorded in `failure_reason`, per message.
 */
export type FromChoice =
  /** `from` is undefined ONLY on the dev provider, which has no sender at all.
   *  Every SES path reaches this with SES_FROM_ADDRESS in hand, because
   *  resolveEmailProvider refuses to build the provider without it. */
  | { ok: true; from: string | undefined; source: 'course' | 'default' }
  | { ok: false; badValue: string };

export function chooseFromAddress(
  courseFrom: string | null | undefined,
  defaultFrom: string | undefined,
): FromChoice {
  const stored = (courseFrom ?? '').trim();
  // No row, or a row from before the course was ever configured: the
  // deployment's own address. Not an error -- most courses are this.
  if (!stored) return { ok: true, from: defaultFrom, source: 'default' };
  // Deliberately NOT unquoteSecret'd. That strips quotes a SHELL left on a
  // secrets field; this value came from a form and a picker, and a quote in
  // it is content, not packaging.
  if (!isFromAddress(stored)) return { ok: false, badValue: stored };
  return { ok: true, from: stored, source: 'course' };
}
