import test from 'node:test';
import assert from 'node:assert/strict';
import { personReadable } from './engineWording';

/**
 * CP-003: no raw engine string ever reaches a person. RC-023 was the last
 * time one did, and this is the second: the guard knew Postgres' wording for
 * a broken constraint and had never heard POSTGREST's wording for a function
 * that is not there.
 *
 * `merge_member_into` is defined in `supabase/migrations/0032_merge_member.sql`
 * and was never applied to the live project (TD-033). So the No email card's
 * "Add display name to existing member" answered the academy manager with
 *
 *     Could not find the function public.merge_member_into(p_stray, p_target)
 *     in the schema cache
 *
 * which is a sentence about a cache and an argument list, offered to somebody
 * who tapped a button next to a member's name.
 *
 * The migration is the fix for the BUTTON. This is the fix for the SENTENCE:
 * whatever else is missing from a deployment, what the operator reads is the
 * product's own words.
 */

const FALLBACK = 'That merge did not run. Nothing has been changed.';

test('PostgREST\'s missing-function answer never reaches a person', () => {
  // Verbatim, as supabase-js hands it over for PGRST202.
  const pgrst202 = 'Could not find the function public.merge_member_into(p_stray, p_target) in the schema cache';
  assert.equal(personReadable(pgrst202, FALLBACK), FALLBACK);
});

test('a PostgREST error code is engine wording wherever it sits', () => {
  assert.equal(
    personReadable('PGRST202: no matching function', FALLBACK), FALLBACK);
  assert.equal(
    personReadable('Perhaps you meant to call the function public.merge_member_into', FALLBACK),
    'Perhaps you meant to call the function public.merge_member_into',
    'a hint with no engine shape in it is not what this guard is for — only the shapes are');
});

test('Postgres\' own shapes are still caught', () => {
  // The RC-023 case, kept: the guard gained a hole, it did not lose a wall.
  for (const engine of [
    'new row for relation "course_communication" violates check constraint "course_communication_subject_check"',
    'duplicate key value violates unique constraint "member_aliases_unique"',
    'null value in column "full_name" violates not-null constraint',
    'invalid input syntax for type date: "31-02-2026"',
    'value too long for type character varying(120)',
    'column "member_code" does not exist',
  ]) {
    assert.equal(personReadable(engine, FALLBACK), FALLBACK, engine);
  }
});

test('a refusal a migration wrote for the operator is passed through', () => {
  // The half of this guard that must NOT change: these sentences are the
  // academy's answer and the operator can act on every one of them.
  for (const written of [
    'Ani has an email address of her own, so merging her would have to choose which address wins. Add the display name by hand instead.',
    'that member is not on the register',
    'the display name "nitha" already belongs to another member',
    'the subscription is not writable, so nothing was merged',
    'her days must be days the course actually runs (1,4)',
  ]) {
    assert.equal(personReadable(written, FALLBACK), written);
  }
});

test('nothing to say is not a sentence', () => {
  assert.equal(personReadable('', FALLBACK), FALLBACK);
});
