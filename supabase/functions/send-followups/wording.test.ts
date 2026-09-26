// RC-109: a send renders each recipient from THE MEMBER'S COURSE wording, not the
// template the client named (requests/2026-09-26-send-uses-the-course-wording.md).
//
// The shape is the reported one: Postnatal carries its own subject and body,
// the academy's template is "Gentle check-in", and the delivered email came
// out as "We missed you this week, rosi" -- the template's words.

import { assertEquals } from 'jsr:@std/assert@1';
import { batchWording, sendable, wordingFor, withUnsubscribeLine, UNSUBSCRIBE_LINE, type Wording } from './wording.ts';

const TEMPLATE: Wording = {
  subject: 'We missed you this week, {{first_name}}',
  body: 'Hello {{first_name}},\n\nYou were down for {{expected_sessions}} sessions in {{course_name}}.',
};
const POSTNATAL: Wording = {
  subject: 'Live class attendance update',
  body: 'Hi Ma,\n\nWe noticed that you were unable to attend a few of the live workout sessions.',
};
const PRENATAL: Wording = {
  subject: 'Prenatal check-in',
  body: 'Hello {{first_name}}, a note from the Prenatal course.',
};

const byCourse = new Map<string, Wording>([
  ['postnatal', POSTNATAL],
  ['prenatal', PRENATAL],
]);

Deno.test("a member of a course with its own wording is sent the course's words", () => {
  assertEquals(wordingFor('postnatal', byCourse, TEMPLATE), POSTNATAL);
});

Deno.test('each course keeps its own wording -- one template for one course', () => {
  assertEquals(wordingFor('prenatal', byCourse, TEMPLATE), PRENATAL);
  assertEquals(wordingFor('postnatal', byCourse, TEMPLATE), POSTNATAL);
});

Deno.test('a member with no course, or a course the resolver had no row for, gets the template', () => {
  assertEquals(wordingFor(null, byCourse, TEMPLATE), TEMPLATE);
  assertEquals(wordingFor(undefined, byCourse, TEMPLATE), TEMPLATE);
  assertEquals(wordingFor('no-such-course', byCourse, TEMPLATE), TEMPLATE);
});

Deno.test("the batch records the course's wording when every recipient shares it", () => {
  assertEquals(batchWording(['postnatal'], byCourse, TEMPLATE), POSTNATAL);
  assertEquals(batchWording(['postnatal', 'postnatal'], byCourse, TEMPLATE), POSTNATAL);
});

Deno.test('a batch that rendered more than one wording says so, never claims the template', () => {
  assertEquals(batchWording(['postnatal', 'prenatal'], byCourse, TEMPLATE), null);
  assertEquals(batchWording(['postnatal', null], byCourse, TEMPLATE), null);
});

Deno.test('a batch whose recipients have no course records the template, because that is what was sent', () => {
  assertEquals(batchWording([null], byCourse, TEMPLATE), TEMPLATE);
});

Deno.test('a batch that rendered nobody has no single wording', () => {
  assertEquals(batchWording([], byCourse, TEMPLATE), null);
});

// Every course's wording says how to stop (0066), even a course's OWN wording
// (requests/2026-09-26-every-course-wording-says-how-to-stop.md).
Deno.test("a course's own wording without an opt-out gets 0066's line", () => {
  assertEquals(withUnsubscribeLine(POSTNATAL.body), POSTNATAL.body + UNSUBSCRIBE_LINE);
  assertEquals(UNSUBSCRIBE_LINE.includes('{{unsubscribe_url}}'), true);
});

Deno.test('wording that already places {{unsubscribe_url}} is left exactly as written', () => {
  const own = 'Hello {{first_name}}.\n\nTo stop: {{unsubscribe_url}}';
  assertEquals(withUnsubscribeLine(own), own);
});

Deno.test('a stored wording is made sendable: the subject untouched, the body with the line', () => {
  const w = sendable(POSTNATAL.subject, POSTNATAL.body);
  assertEquals(w.subject, POSTNATAL.subject);
  assertEquals(w.body.endsWith('you can stop them here:\n{{unsubscribe_url}}'), true);
  assertEquals(w.body.startsWith(POSTNATAL.body), true);
});
