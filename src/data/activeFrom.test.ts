/**
 * ACTIVE FROM -- the near end of the membership window (0057).
 *
 * The requester's own words: "We have inactive from date selection but not
 * active from -- fix that." The gap was never cosmetic. `members.joined_on`
 * had exactly one writer, `create_member` at the moment she was added, so
 * after 0049 dated every bulk-imported member to the day of the UPLOAD there
 * was no way at all to say when she actually started -- and `joined.ts`
 * narrows every date-scoped screen by that column.
 *
 * What is asserted here:
 *   1. the two refusals the app can answer for itself, in the order
 *      `set_member_active_from` raises them, so the form and the database
 *      never disagree about which one applies
 *   2. that a LEGAL date is not refused -- including a past one, which is the
 *      whole point: the back-fill this exists for is entirely past dates
 *   3. that `activeFromProblem` and `inactiveFromProblem` agree about the
 *      window from both ends, because two mirrored rules that disagree on the
 *      boundary is worse than one rule
 *   4. that the date this validates is the one `hasJoinedBy` then narrows by,
 *      so a date the form accepts is a date the roster can actually use
 *
 * The THIRD server refusal -- a date later than the earliest session she is
 * recorded at (0046 read forward) -- is deliberately not here, because the
 * app cannot answer it: `Member` carries her figures for the period on
 * screen, never the day of her first attendance row. It is asserted in
 * supabase/tests/35_member_active_from.sql instead.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { activeFromProblem, hasJoinedBy, membersOnDay } from './joined';
import { inactiveFromProblem } from './inactiveFrom';

const TODAY = '2026-09-09';

test('a blank is refused, and says what to do rather than what is wrong', () => {
  assert.equal(activeFromProblem('', null, TODAY),
    'Choose the day the member goes on the register');
  assert.equal(activeFromProblem('   ', null, TODAY),
    'Choose the day the member goes on the register');
});

test('only YYYY-MM-DD is a date -- the shape check 0029 exists for', () => {
  // 0029's whole lesson: '01/09/2026' IS a date to Postgres, read under
  // DateStyle, and on this project that is MDY -- so a British or Indian date
  // imported as 9 January, silently. The shape is checked before anything
  // tries to read it as a day.
  assert.equal(activeFromProblem('01/09/2026', null, TODAY),
    '“01/09/2026” is not a date — write it as YYYY-MM-DD');
  assert.equal(activeFromProblem('9 September 2026', null, TODAY),
    '“9 September 2026” is not a date — write it as YYYY-MM-DD');
  // The offending value is QUOTED BACK. A refusal that does not name what it
  // refused makes the person hunt for the cell.
  assert.match(activeFromProblem('2026-9-9', null, TODAY) ?? '', /2026-9-9/);
});

test('a future joining date is refused -- she cannot have started next week', () => {
  assert.equal(activeFromProblem('2026-09-10', null, TODAY),
    'A joining date in the future cannot be recorded');
  // TODAY itself is not the future. The boundary is the one create_member
  // (0016) carries: `v_from > current_date`.
  assert.equal(activeFromProblem(TODAY, null, TODAY), null);
});

test('a PAST date is accepted, because the back-fill is the whole request', () => {
  // 0049 dates every bulk-imported member to the upload day. Correcting forty
  // of those to the day each member actually started is entirely past dates,
  // and a rule that refused them would refuse the only thing being asked for.
  assert.equal(activeFromProblem('2020-01-01', null, TODAY), null);
  assert.equal(activeFromProblem('2026-03-15', null, TODAY), null);
});

test('she cannot go on the register after she comes off it', () => {
  const why = activeFromProblem('2026-05-01', '2026-04-01', TODAY);
  // members_inactive_from_after_joined would raise this as a constraint name.
  // The person reads a sentence, with the date that blocks it IN it.
  assert.equal(why,
    'The member becomes inactive on 1 April 2026, so cannot go on the register after that');
  assert.match(why ?? '', /1 April 2026/);
});

test('the two ends may meet on one day, and neither rule refuses it', () => {
  // Joining and leaving on the same day is a real, if short, membership --
  // the constraint is `inactive_from >= joined_on`, not `>`. Both mirrors
  // have to read that boundary the same way or the form refuses a pair the
  // database would take, or offers one it would not.
  const day = '2026-04-01';
  assert.equal(activeFromProblem(day, day, TODAY), null);
  assert.equal(inactiveFromProblem(day, day), null);
});

test('the mirrors agree from both ends of the same window', () => {
  const joined = '2026-04-01';
  const left = '2026-03-01';        // before she joined: illegal, both ways
  assert.notEqual(activeFromProblem(joined, left, TODAY), null);
  assert.notEqual(inactiveFromProblem(left, joined), null);

  const ok = '2026-06-01';          // after she joined: legal, both ways
  assert.equal(activeFromProblem(joined, ok, TODAY), null);
  assert.equal(inactiveFromProblem(ok, joined), null);
});

test('a date this accepts is one the roster can narrow by', () => {
  // The point of validating at all. `hasJoinedBy` is what every date-scoped
  // screen calls, and it only understands yyyy-mm-dd -- anything else it
  // reads as "no date on record" and shows her on every day. So the shapes
  // the form lets through have to be the shapes that module can use.
  const accepted = '2026-03-15';
  assert.equal(activeFromProblem(accepted, null, TODAY), null);
  assert.equal(hasJoinedBy({ joinedOn: accepted }, '2026-03-14'), false);
  assert.equal(hasJoinedBy({ joinedOn: accepted }, '2026-03-15'), true);

  const members = [
    { id: 'a', joinedOn: accepted },
    { id: 'b', joinedOn: '2026-09-01' },
  ];
  assert.deepEqual(membersOnDay(members, '2026-03-20').map(m => m.id), ['a']);
});

test('no date on record stays legal to leave alone', () => {
  // Every member imported before 0049 carries a null, and joined.ts reads it
  // as "paperwork is thin, show her on every day". The form must not turn
  // opening her record into a demand to invent a date -- the blank is only
  // refused when somebody is actually submitting one.
  assert.equal(hasJoinedBy({ joinedOn: null }, '2020-01-01'), true);
  assert.equal(hasJoinedBy({}, '2020-01-01'), true);
});
