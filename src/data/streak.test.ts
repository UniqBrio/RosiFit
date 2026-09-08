/**
 * The missed run, worded so it cannot be read as a rule or as a week.
 *
 * The complaint this answers, in the requester's words: "in member card there
 * is sentence as consecutive 6 what does that mean 1.6 consecutive when the
 * frequency is 5 days for course and we have removed follow up for 4
 * consecutive session . that is confusing and also in reach out form the
 * missed streak is 6 how i am unable to understand".
 *
 * Aishwarya Nair's real row is the case: absent on 31 Aug, 1, 2, 3, 4 and 7
 * Sep -- six countable Gentle Yoga sessions, last present Fri 28 Aug -- on a
 * course that runs five days a week. Six is correct and stays six. What is
 * asserted here is that every reading of it names the SESSIONS it counts and
 * the day that ended it, and that neither screen may print the bare number
 * under the word "consecutive" again.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { streakReading, missLine, STREAK_LABEL } from './streak';

test('the run is dated to the session that ended it', () => {
  const r = streakReading({ streak: 6, lastPresent: '2026-08-28' });
  assert.equal(r.count, 6);
  assert.equal(r.short, '6 in a row since Fri 28 Aug');
  assert.match(r.sentence, /^6 sessions missed in a row/);
  assert.match(r.sentence, /last present on Fri 28 Aug/);
});

test('it says out loud that the week does not cap it -- the whole confusion', () => {
  const r = streakReading({ streak: 6, lastPresent: '2026-08-28' });
  assert.match(r.sentence, /carries across weeks/);
  assert.match(r.sentence, /not capped by the number the week holds/);
});

test('the word "consecutive" is gone from every reading', () => {
  for (const streak of [0, 1, 4, 6, 12]) {
    const r = streakReading({ streak, lastPresent: '2026-08-28' });
    const all = `${r.label} ${r.short ?? ''} ${r.sentence}`;
    assert.doesNotMatch(all, /consecutive/i,
      `"consecutive" named a trigger the course form no longer offers (0030), streak ${streak}`);
    assert.doesNotMatch(r.label, /streak/i, 'the label must not read as a rule');
  }
  assert.equal(STREAK_LABEL, 'Missed in a row');
});

test('one missed session is not "1 sessions"', () => {
  const r = streakReading({ streak: 1, lastPresent: '2026-09-04' });
  assert.match(r.sentence, /^1 session missed in a row/);
  assert.equal(r.short, '1 in a row since Fri 4 Sep');
});

test('nothing running adds nothing to the card', () => {
  const r = streakReading({ streak: 0, lastPresent: '2026-09-07' });
  assert.equal(r.short, null, 'a card that reads "0 in a row" spends a line saying nothing');
  assert.match(r.sentence, /Nothing running/);
});

test('a member who has never attended is told so, not given an invented date', () => {
  const r = streakReading({ streak: 3, lastPresent: null });
  assert.equal(r.short, '3 in a row');
  assert.match(r.sentence, /no attended session on record/);
  assert.doesNotMatch(r.sentence, /—\s*$/);
});

test('a nonsense streak is worded as nothing running, never as a negative run', () => {
  for (const bad of [-1, Number.NaN]) {
    const r = streakReading({ streak: bad, lastPresent: '2026-08-28' });
    assert.equal(r.count, 0);
    assert.equal(r.short, null);
  }
});

test('the card line carries the week and the run without either restating the other', () => {
  const reading = streakReading({ streak: 6, lastPresent: '2026-08-28' });
  assert.equal(
    missLine({ weekLabel: '7–13 Sep 2026', missed: 1, reading }),
    'Missed 7–13 Sep 2026: 1 · 6 in a row since Fri 28 Aug');
});

test('the card line drops the run entirely when there is none', () => {
  const reading = streakReading({ streak: 0, lastPresent: '2026-09-07' });
  assert.equal(
    missLine({ weekLabel: '7–13 Sep 2026', missed: 0, reading }),
    'Missed 7–13 Sep 2026: 0');
});
