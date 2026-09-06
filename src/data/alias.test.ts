/**
 * Cases for attaching a Google Meet display name to a member.
 *
 * Run: npx tsx --test src/data/alias.test.ts
 *
 * The importer MATCHES on these names, so each of these is a case where
 * getting it wrong is silent: an alias refused after the operator was told it
 * saved, or a duplicate accepted so one display name points at two members
 * and the next import marks the wrong woman present.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cleanAlias, aliasProblem, aliasSaveError, aliasClaimedMessage,
  ALIAS_EMPTY, ALIAS_FAILED,
} from './alias';

// ------------------------------------------------------------- cleanAlias
test('surrounding space is trimmed off a display name', () => {
  assert.equal(cleanAlias('  Rani Sham  '), 'Rani Sham');
});

test('inner spacing is left exactly as Meet wrote it', () => {
  // Meet writes what she typed. "Rani  Sham" is hers, not ours to tidy --
  // and tidying it here would stop it matching the file it came from.
  assert.equal(cleanAlias('Rani  Sham'), 'Rani  Sham');
});

// ----------------------------------------------------------- aliasProblem
test('a name nobody has claimed can be saved', () => {
  assert.equal(aliasProblem('Rani Sham', ['Meena Raj', 'Kavi S']), null);
});

test('an empty display name is refused, not saved as blank', () => {
  assert.equal(aliasProblem('', ['Meena Raj']), ALIAS_EMPTY);
});

test('a name already on the register is refused, and the message names it', () => {
  assert.equal(
    aliasProblem('Rani Sham', ['Rani Sham']),
    '“Rani Sham” is already a display name for somebody on the register.');
});

test('the claim check ignores case, because the database normalizes before its unique index', () => {
  // Caught here or caught by 23505 -- but caught HERE is the difference
  // between a refusal and a refusal that arrives after "saved".
  assert.equal(aliasProblem('RANI SHAM', ['Rani Sham']), aliasClaimedMessage('RANI SHAM'));
});

test('a claimed name padded with space is still the same claim', () => {
  assert.equal(aliasProblem('Rani Sham', ['  Rani Sham ']), aliasClaimedMessage('Rani Sham'));
});

test('an empty register claims nothing', () => {
  assert.equal(aliasProblem('Rani Sham', []), null);
});

// --------------------------------------------------------- aliasSaveError
test('23505 is reported as the name already pointing at somebody', () => {
  assert.equal(aliasSaveError('23505', 'Rani Sham'), aliasClaimedMessage('Rani Sham'));
});

test('any other failure says nothing was changed, and does not guess why', () => {
  assert.equal(aliasSaveError('42501', 'Rani Sham'), ALIAS_FAILED);
});

test('a failure with no code still gets an honest message', () => {
  assert.equal(aliasSaveError(undefined, 'Rani Sham'), ALIAS_FAILED);
});

test('the two paths agree: the offline refusal and the live 23505 read identically', () => {
  // The whole reason these rules are one module. If these two ever differ,
  // the same mistake reports differently depending on whether the academy
  // database happens to be configured.
  assert.equal(aliasProblem('Rani Sham', ['Rani Sham']), aliasSaveError('23505', 'Rani Sham'));
});
