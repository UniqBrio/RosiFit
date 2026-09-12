import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

/**
 * "A load failure renders as a business state. No data received must never
 *  mean no upload exists."
 *
 * The strip's side of the RC-039 rule. `src/data/dayLoad.test.ts` pins the
 * derivation, which is where the inference lives; this pins what the SCREEN
 * does with it, which is where it is seen.
 *
 * What can silently regress, and is guarded below:
 *
 *   - the strip goes back to rendering nothing on an error, so a failed week
 *     reads as a course with no week rather than a week that would not load,
 *     and the dates go with it;
 *   - the derivation is re-implemented inline, so the screen and the specced
 *     function drift and only one of them is tested;
 *   - the retry sentence is reworded, retyped, or loses its press;
 *   - the failed day starts offering an upload again.
 *
 * It reads source rather than rendering, for the reason
 * dayStripUploadButton.test.ts gives: there is no component harness here, and
 * every claim is about what is drawn where. One assertion per test.
 */
const ROOT = process.env.COURSE_WEEK_FAILED_SPEC_ROOT ?? process.cwd();
const src = fs.readFileSync(path.join(ROOT, 'app/course/[id].tsx'), 'utf8');
const code = src.split('\n').filter(l => !/^\s*(\*|\/\/|\/\*)/.test(l)).join('\n');

test('THE SEVEN CELLS SURVIVE A FAILED WEEK', () => {
  /*
   * The strip used to be `attendance.state === 'error' ? null : (...)`. A
   * week that would not load then had no dates on screen at all, so the
   * message underneath had nothing to be about and the arrows had nothing to
   * step off from.
   */
  assert.doesNotMatch(code, /attendance\.state === 'error' \? null/,
    'a failed week must still draw its days — wearing Load failed, not wearing nothing');
});

test('the strip still shows a skeleton while the week is in flight', () => {
  assert.match(code, /attendance\.state === 'loading' \? \(\s*<Skeleton/,
    'loading is its own state and must not be drawn as a week of failures');
});

test('the derivation is the specced one, not a second copy of it', () => {
  // Two derivations of one rule is how a cell and the card under it end up
  // disagreeing about the same day.
  assert.match(code, /dayLoad\(attendance\.state,/,
    'the screen must ask src/data/dayLoad, which is where the rule is tested');
});

test('the day status is read from that derivation too', () => {
  assert.match(code, /dayStatusKey\(load,/,
    'the tone a cell wears follows the load state, not a ternary beside it');
});

test('a day the app could not read is never offered an upload', () => {
  /*
   * With no clause of its own. The two presses are gated on the status key --
   * `awaiting` for the first, present/absent for the second -- and a failed
   * day wears neither, so the guard is the mapping itself. What has to hold
   * is that the mapping stays the specced one, which the test above pins;
   * this only checks the presses are still read from `d.key` and not from
   * some second reading of the rows.
   */
  assert.match(code, /const waiting = d\.key === 'awaiting' && d\.canUpload;/,
    "the awaiting press must be gated on the day's status key");
  assert.match(code, /const second = d\.canUpload && \(d\.key === 'present' \|\| d\.key === 'absent'\)/,
    'the second-file press likewise');
});

test('THE RETRY SAYS EXACTLY WHAT WAS ASKED FOR', () => {
  // A copy-lock. The sentence is the request's own wording and nothing else
  // on this screen may paraphrase it.
  assert.match(src, /const ATTENDANCE_LOAD_FAILED = "Couldn't load attendance\. Tap to retry\.";/,
    'the wording is fixed, and it lives in one exported constant');
});

test('and the sentence is never retyped as a second literal', () => {
  const literals = src.match(/Couldn't load attendance/g) ?? [];
  assert.equal(literals.length, 1,
    'one definition. A retyped copy is how a string and its spec stop agreeing');
});

test('the whole banner is the press, and it retries the read', () => {
  assert.match(code, /testID="course-week-retry"[\s\S]{0,120}onPress=\{attendance\.retry\}/,
    'a retry the reader has to find is a retry nobody presses');
});

test('the banner wears the failed status, not a colour of its own', () => {
  assert.match(code, /STATUS\.failed\.(fgDark|fgLight|icon)/,
    'the strip and the message under it must agree about what this state looks like');
});

test('the technical reason is still on screen, under the sentence', () => {
  // "Couldn't load attendance" is what a person needs; the timeout or the
  // PostgREST message is what the next person debugging it needs.
  assert.match(code, /\{attendance\.error \?\? 'Nothing has been changed\.'\}/,
    'the underlying error must not be swallowed by the friendlier sentence');
});

test('the roster card states a failed week rather than guessing at it', () => {
  assert.match(code, /Attendance for this week could not be loaded\./,
    'a card whose week failed must not fall through to "Yet to mark"');
});
