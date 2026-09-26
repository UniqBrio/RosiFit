// The preview on the last send step (requests/2026-09-26-preview-before-send.md):
// the course's own wording, filled for the first ticked member.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { firstTicked, sendPreview, senderPct, UNSUBSCRIBE_STAND_IN, UNSUBSCRIBE_LINE } from './sendPreview';
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
/** What the preview shows at the foot of a wording that carries no opt-out of
 *  its own: 0066's line, with the stand-in where each member's link goes. */
const withLine = (body: string) => body + UNSUBSCRIBE_LINE.replace('{{unsubscribe_url}}', UNSUBSCRIBE_STAND_IN);
const WEEK = { periodFrom: '2026-09-21', periodTo: '2026-09-27', academyName: 'RosiFit Academy', followUpTrigger: 2 };

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
  assert.equal(p.body, withLine(POSTNATAL.body));
});

test("every token is filled with the member's own figures and this send's period", () => {
  const p = sendPreview(WITH_TOKENS, rosi, WEEK);
  assert.equal(p.subject, 'We missed you this week, rosi');
  assert.equal(p.body, withLine(
    'You were down for 4 sessions in Postnatal between 2026-09-21 and 2026-09-27, and made 0.'
    + '\n\nRosiFit Academy'));
  assert.ok(!p.subject.includes('{{') && !p.body.includes('{{'));
});

test('the label names whose figures these are', () => {
  assert.equal(sendPreview(WITH_TOKENS, sharmila, WEEK).label, 'Preview · J Sharmila');
});

// ------------------------------------------------ the sender's own format
// Code review, 26-Sep-2026: four tokens the form preview's map fills
// differently from send-followups. The send preview must match the SENDER.

test('{{last_attendance_date}} is the last session attended (ISO), not the last email', () => {
  const m = member('m-x', 'Kavya', { lastPresent: '2026-09-12', last: '24/9/2026' });
  assert.equal(sendPreview({ subject: 's', body: '{{last_attendance_date}}' }, m, WEEK).body, withLine('2026-09-12'));
  const never = member('m-y', 'Kavya', { lastPresent: null, last: '24/9/2026' });
  assert.equal(sendPreview({ subject: 's', body: '{{last_attendance_date}}' }, never, WEEK).body, withLine('—'));
});

test('{{attendance_pct}} carries the database one-decimal rounding', () => {
  assert.equal(senderPct(1, 3), '33.3%');
  assert.equal(senderPct(2, 3), '66.7%');
  assert.equal(senderPct(1, 2), '50%');
  assert.equal(senderPct(0, 0), '—');
  const m = member('m-z', 'Kavya', { expected: 3, attended: 1 });
  assert.equal(sendPreview({ subject: 's', body: '{{attendance_pct}}' }, m, WEEK).body, withLine('33.3%'));
});

test('{{follow_up_trigger}} is the number in force, or an em dash when no condition is on', () => {
  assert.equal(sendPreview({ subject: 's', body: '{{follow_up_trigger}}' }, rosi, WEEK).body, withLine('2'));
  assert.equal(sendPreview({ subject: 's', body: '{{follow_up_trigger}}' }, rosi,
    { ...WEEK, followUpTrigger: null }).body, withLine('—'));
});

test('{{unsubscribe_url}} says what goes there, never a URL that looks like the real one', () => {
  const body = 'Stop them here:\n{{unsubscribe_url}}';
  const p = sendPreview({ subject: 's', body }, rosi, WEEK);
  assert.equal(p.body, `Stop them here:\n${UNSUBSCRIBE_STAND_IN}`);
  assert.ok(!p.body.includes('http'));
});

// ------------------------------------------- every wording says how to stop
// requests/2026-09-26-every-course-wording-says-how-to-stop.md

test("a course's own wording with no opt-out previews with 0066's line, as it is sent", () => {
  const p = sendPreview(POSTNATAL, rosi, WEEK);
  assert.ok(p.body.startsWith(POSTNATAL.body));
  assert.ok(p.body.endsWith(`you can stop them here:\n${UNSUBSCRIBE_STAND_IN}`));
});

test('a wording that places its own opt-out gets no second line', () => {
  const own = { subject: 's', body: 'Hi.\n\nTo stop: {{unsubscribe_url}}' };
  assert.equal(sendPreview(own, rosi, WEEK).body, `Hi.\n\nTo stop: ${UNSUBSCRIBE_STAND_IN}`);
});

test('the preview appends the SAME line the send appends (send-followups/wording.ts)', () => {
  const src = fs.readFileSync(path.join(process.cwd(), 'supabase/functions/send-followups/wording.ts'), 'utf8');
  const m = src.match(/export const UNSUBSCRIBE_LINE =\s*'([^']*)';/);
  assert.ok(m, 'send-followups/wording.ts no longer declares UNSUBSCRIBE_LINE as one string literal');
  assert.equal(JSON.parse(`"${m[1]}"`), UNSUBSCRIBE_LINE);
});
