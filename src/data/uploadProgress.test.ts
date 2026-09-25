import test from 'node:test';
import assert from 'node:assert/strict';
import {
  stageWords, stillWorkingWords, WAITING_NOTE, STILL_WORKING_MS, type UploadStage,
} from './uploadProgress';

/**
 * THE PROGRESS WORDS: honest about a wait, silent about its length.
 *
 * Run: npx tsx --test src/data/uploadProgress.test.ts
 *
 * The feasibility work was explicit that no numeric estimate is supportable
 * yet: there is no measurement of this path in the repository at all, the
 * matcher benchmark (T-068, V-01) has never been run, and the documented
 * Edge CPU ceiling of 2s sits an order of magnitude under the 15s that was
 * proposed for display. So these assertions are mostly about what the words
 * must NOT contain.
 */

const STAGES: UploadStage[] = ['reading', 'matching', 'writing'];
const every = [
  ...STAGES.map(s => stageWords(s, 1)),
  ...STAGES.map(s => stageWords(s, 4)),
  ...STAGES.map(s => stillWorkingWords(s)),
  WAITING_NOTE,
];

test('every stage says something', () => {
  for (const s of STAGES) {
    assert.ok(stageWords(s, 1).trim().length > 0, `${s} has no words`);
  }
});

test('the three stages are three different sentences', () => {
  const said = new Set(STAGES.map(s => stageWords(s, 1)));
  assert.equal(said.size, 3, 'two stages say the same thing, so the stage tells you nothing');
});

/* ------------------------------------------- no invented numbers, anywhere */

test('no progress word promises a number of seconds', () => {
  for (const line of every) {
    assert.doesNotMatch(line, /\b\d+\s*(seconds?|secs?|s)\b/i,
      `"${line}" puts a duration on a path nothing in this repository has measured`);
  }
});

test('no progress word shows a percentage', () => {
  for (const line of every) {
    assert.doesNotMatch(line, /\d\s*%|percent/i, `"${line}" invents a percentage`);
  }
});

test('no progress word counts down or estimates', () => {
  for (const line of every) {
    assert.doesNotMatch(line, /\bestimat|\bremaining\b|\babout \d|\bin \d+\b|\bETA\b/i,
      `"${line}" reads as an estimate`);
  }
});

test('no progress word promises that it will finish', () => {
  // The server decides. A sentence that says it "will be done" is the same
  // claim a countdown reaching zero makes, said in words.
  for (const line of every) {
    assert.doesNotMatch(line, /almost (there|done)|nearly (there|done)|finishing up/i,
      `"${line}" promises an outcome the client does not have`);
  }
});

/* ------------------------------------------------ it says what it is doing */

test('the file count is used — it is the one number this screen legitimately has', () => {
  // The operator picked them, so saying how many is a fact, not a prediction.
  assert.match(stageWords('reading', 4), /4/);
  assert.match(stageWords('matching', 4), /4/);
});

test('one file does not say "1 files"', () => {
  for (const s of STAGES) {
    assert.doesNotMatch(stageWords(s, 1), /\b1 files\b/);
  }
});

/* ------------------------------------- "still processing" is a label only */

test('the still-working line never declares an outcome', () => {
  for (const s of STAGES) {
    const line = stillWorkingWords(s);
    assert.doesNotMatch(line, /\b(completed|complete|success|succeeded|imported successfully)\b/i,
      `"${line}" reads as a result, and this line appears while the request is still open`);
  }
});

test('the still-working line says the server is what is being waited on', () => {
  for (const s of STAGES) {
    assert.match(stillWorkingWords(s), /server/i);
  }
});

test('only the writing stage asks for the screen to be left open', () => {
  // Only the commit has an answer that can be lost: the transaction may
  // complete with nobody left to hear it (T-021, T-109).
  // Re-pinned with the copy it names: the sentence changed in this same
  // change, and the copy gate was right that the old one overstated the cost.
  assert.match(stillWorkingWords('writing'), /[Ll]eave this screen open/);
  assert.doesNotMatch(stillWorkingWords('matching'), /[Ll]eave this screen open/);
});

test('the quiet note says completion comes from the server', () => {
  assert.match(WAITING_NOTE, /server confirms/i);
});

/* -------------------------------------------------------------- the delay */

test('the still-working line waits long enough not to flash', () => {
  // A stage that comes and goes should not flash a sentence nobody can read.
  assert.ok(STILL_WORKING_MS >= 5_000, 'too eager — this would flicker on an ordinary upload');
});

test('the still-working delay is not a timeout and not a promise', () => {
  // It must not read as "this should have finished by now": it is when the
  // wording changes, not when anything is decided.
  assert.ok(STILL_WORKING_MS <= 30_000);
});
