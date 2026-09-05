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
