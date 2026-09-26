// The preview on the last send step (requests/2026-09-26-preview-before-send.md):
// the course's own wording, filled for the first ticked member.

import test from 'node:test';
import assert from 'node:assert/strict';
import { firstTicked, sendPreview } from './sendPreview';
import type { Member } from './mock';

const member = (id: string, name: string, over: Partial<Member> = {}): Member => ({
  id, code: '', course_id: 'c-postnatal', name, course: 'Postnatal', branch: 'Main',
  aliases: [], emails: [{ address: `${id}@example.com`, primary: true }],
  status: 'active', weekdays: null,
  expected: 4, attended: 0, missed: 4, streak: 4,
  last: '12 Sep', joinedOn: '2026-06-01', joined: 'Jun 2026',
  ...over,
});

const rosi = member('m-rosi', 'rosi');
const aanchal = member('m-aanchal', 'Aanchal Rajasthan');
const sharmila = member('m-sharmila', 'J Sharmila');

// The Postnatal wording the requester saved, verbatim apart from the length.
const POSTNATAL = {
  subject: 'Live class attendance update',
  body: 'Hi Ma,\n\nWe noticed that you were unable to attend a few of the live workout sessions '
    + 'between 14th and 20th September.\n\nRegards,\nRosiFit Team',
};
const WITH_TOKENS = {
  subject: 'We missed you this week, {{first_name}}',
  body: 'You were down for {{expected_sessions}} sessions in {{course_name}} between '
    + '{{period_from}} and {{period_to}}, and made {{attended_sessions}}.\n\n{{academy_name}}',
};
const WEEK = { periodFrom: '2026-09-21', periodTo: '2026-09-27' };

test('the first TICKED member in list order, not the first in the list', () => {
  const list = [aanchal, rosi, sharmila];
  assert.equal(firstTicked(list, ['m-sharmila', 'm-rosi'])?.id, 'm-rosi');
});

test('nobody ticked is no preview member, never the first row by default', () => {
  assert.equal(firstTicked([aanchal, rosi], []), null);
});

test("the course's own wording is shown as stored when it carries no tokens", () => {
  const p = sendPreview(POSTNATAL, rosi, WEEK);
  assert.equal(p.subject, POSTNATAL.subject);
  assert.equal(p.body, POSTNATAL.body);
});

test("every token is filled with the member's own figures and this send's period", () => {
  const p = sendPreview(WITH_TOKENS, rosi, { ...WEEK, academyName: 'RosiFit Academy' });
  assert.equal(p.subject, 'We missed you this week, rosi');
  assert.equal(p.body,
    'You were down for 4 sessions in Postnatal between 2026-09-21 and 2026-09-27, and made 0.'
    + '\n\nRosiFit Academy');
  assert.ok(!p.subject.includes('{{') && !p.body.includes('{{'));
});

test('the label names whose figures these are', () => {
  assert.equal(sendPreview(WITH_TOKENS, sharmila, WEEK).label, 'Preview · J Sharmila');
});
