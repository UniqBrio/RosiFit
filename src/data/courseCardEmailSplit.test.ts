/**
 * "Under Postnatal course the no of member under no emails are 59 in
 * attendance screen but under courses screen the count appears to be 79"
 * (the academy, 30-Sep-2026).
 *
 * Two differences, and both have to go for the figures to agree:
 *  1. the card counted every ENROLLED member; the course screen's roster is
 *     the members on the register that day -- no inactive member, nobody
 *     who has not joined yet;
 *  2. the card's "without email" was `!isReachable`, which also counts a
 *     bounced or unsubscribed address; the screen lists those separately,
 *     "with an email issue".
 *
 * Run: npx tsx --test src/data/courseCardEmailSplit.test.ts
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { courseSummary } from './course';
import type { Member, FollowUpRule } from './mock';

const RULE: FollowUpRule = {
  source: 'global',
  weekly_enabled: true, weekly_threshold: 3,
  consecutive_enabled: true, consecutive_threshold: 4,
  combination: 'OR',
};
const TODAY = '2026-09-30';

let n = 0;
const member = (over: Partial<Member> = {}): Member => ({
  id: `m${++n}`, code: '', name: 'Test Member',
  course: 'Postnatal', course_id: 'c1', branch: 'Main',
  aliases: [], emails: [{ address: `m${n}@example.com`, primary: true, status: 'unknown' }],
  weekdays: null, status: 'active',
  expected: 4, attended: 4, missed: 0, streak: 0, last: '—',
  joinedOn: '2026-03-01', joined: 'Mar 2026', ...over,
});

/** The Postnatal shape in miniature: working, none, bounced, unsubscribed,
 *  plus an inactive member with no address and one who joins tomorrow. */
function postnatal(): Member[] {
  return [
    member(), member(), member(),                                   // 3 with a working address
    member({ emails: [] }), member({ emails: [] }),                 // 2 no address on file
    member({ emails: [{ address: 'b@example.com', primary: true, status: 'bounced' }] }),
    member({ emails: [{ address: 'u@example.com', primary: true, status: 'unsubscribed' }] }),
    member({ emails: [], status: 'inactive', inactiveFrom: '2026-09-01' }), // off the register
    member({ emails: [], joinedOn: '2026-10-01' }),                 // not joined yet
  ];
}

test('"without email" is no address on file, among the members on today\'s register', () => {
  const s = courseSummary(postnatal(), 4, RULE, TODAY);
  assert.equal(s.noMail, 2,
    'the inactive member and the one not yet joined are not on the course screen, and a bounce is not "no address"');
});

test('a bounced or unsubscribed address is its own figure, as on the course screen', () => {
  const s = courseSummary(postnatal(), 4, RULE, TODAY);
  assert.equal(s.emailIssues, 2);
  assert.equal(s.withMail, 3);
});

test('the three figures add up, and the members they leave out are named', () => {
  const s = courseSummary(postnatal(), 4, RULE, TODAY);
  assert.equal(s.withMail + s.noMail + s.emailIssues, 7);
  assert.equal(s.freqLine, '4 days/week · 9 members · 2 not on today’s register');
  assert.equal(s.note, 'Nobody needs follow-up · 2 without email · 2 with an email issue');
});

test('a course with everybody active reads exactly as it did', () => {
  const s = courseSummary([member(), member({ emails: [] })], 3, RULE, TODAY);
  assert.equal(s.freqLine, '3 days/week · 2 members');
  assert.equal(s.note, 'Nobody needs follow-up · 1 without email');
});
