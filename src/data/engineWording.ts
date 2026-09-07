/**
 * Whether a failure message is the ENGINE talking rather than this product.
 *
 * WHY THIS IS ITS OWN MODULE
 * It lived inside `repository.ts` as a private regex. `repository.ts` cannot
 * be imported under node -- it reaches for the Supabase client -- so the one
 * rule that stands between a person and a raw machine string had no spec, and
 * the day it was found to have a hole there was nothing to add a case to.
 * Same reason `alias.ts` and `refusalCase.ts` are separate: a rule with no way
 * to pin it is a rule that quietly stops being true.
 *
 * WHAT IT IS FOR
 * The write translators in `repository.ts` deliberately pass a refusal
 * through when the database wrote it for a person to read -- "she has an
 * email address of her own", "still runs 3 courses", the date a completed
 * session blocks. That decision is sound and is kept. What it must never do
 * is pass through a sentence NOBODY wrote for a reader. CP-003 is explicit
 * that a raw engine string must not reach a dialog; RC-023 is the last time
 * one did.
 *
 * TWO ENGINES SPEAK ON THIS WIRE, AND BOTH ARE COVERED
 *   * POSTGRES, when a constraint, a cast or a missing column fails. Its
 *     wording is fixed and recognisable: `new row for relation "x" violates
 *     check constraint "y"`.
 *   * POSTGREST, when the request never reaches a function at all -- most of
 *     all `PGRST202`, "Could not find the function public.merge_member_into
 *     (p_stray, p_target) in the schema cache", which is what a migration
 *     written but not applied answers with. That sentence names a schema
 *     cache and a C-style argument list to an academy manager who tapped a
 *     button, and until it was added here it reached her verbatim: it is not
 *     a constraint violation, so none of the Postgres shapes matched it
 *     (the No email card's "Add display name to existing member",
 *     07-Sep-2026 -- TD-033 is the migration half of the same fault).
 *
 * SHAPES ONLY, never a code list. A hand-raised `raise exception` matches
 * none of them and still passes through untouched, which is the whole point:
 * the sentences the migrations write for the operator are hers to read.
 */
const ENGINE_WORDING =
  /violates (check|unique|foreign key|not-null|exclusion) constraint|new row for relation|duplicate key value|null value in column|invalid input syntax|value too long for type|column .* does not exist|schema cache|PGRST\d{3}/i;

/**
 * The message when a person wrote it, the fallback when an engine did.
 *
 * An empty message is an engine failure too -- a request that came back with
 * nothing to say has said nothing a person can act on.
 */
export function personReadable(message: string, fallback: string): string {
  return ENGINE_WORDING.test(message) ? fallback : (message || fallback);
}
