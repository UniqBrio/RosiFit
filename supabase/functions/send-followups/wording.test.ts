// RC-109: a send renders each recipient from THEIR COURSE's wording, not the
// template the client named (requests/2026-09-26-send-uses-the-course-wording.md).
//
// The shape is the reported one: Postnatal carries its own subject and body,
// the academy's template is "Gentle check-in", and the delivered email came
// out as "We missed you this week, rosi" -- the template's words.

import { assertEquals } from 'jsr:@std/assert@1';
import { batchWording, wordingFor, type Wording } from './wording.ts';

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

Deno.test('a batch spanning courses with different wordings keeps the template snapshot', () => {
  assertEquals(batchWording(['postnatal', 'prenatal'], byCourse, TEMPLATE), TEMPLATE);
  assertEquals(batchWording([], byCourse, TEMPLATE), TEMPLATE);
});
