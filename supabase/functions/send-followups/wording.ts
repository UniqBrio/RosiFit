// WHICH WORDS A RECIPIENT IS SENT (RC-109,
// requests/2026-09-26-send-uses-the-course-wording.md).
//
// The requester's rule: "One template for one course. Every course should
// follow its own template mentioned in course edit/create form" -- for the
// member pop-up's Reach out and the course's Send communication alike.
//
// Until this file, the function rendered the template the client named and
// nothing else. The course's own subject and body (course_communication,
// 0021) were saved, previewed on the form and shown as the course's in the
// draft -- and never read by the one step that sends. The course's SENDER was
// wired in on 07-Sep; its WORDING was not, so the email left from the right
// address with the wrong words.
//
// `effective_course_message()` (0021) has always been the resolver for this:
// the course's own wording where set, else the template the course names,
// else the default template. Its own comment calls it the resolver behind
// "the batch" too; this is the batch finally asking it.
//
// Kept out of index.ts for the reason send-loop.ts is: index.ts calls
// Deno.serve at module scope, so a spec cannot import it.

export type Wording = { subject: string; body: string };

/**
 * The words one recipient is rendered from: the member's course's resolved
 * wording, or -- when the member has no course, or the resolver returned no row --
 * the template the send was asked for. That fallback is not a guess: with no
 * course there is no course wording to prefer, and the template is what the
 * function has always sent.
 */
export function wordingFor(
  courseId: string | null | undefined,
  byCourse: ReadonlyMap<string, Wording>,
  template: Wording,
): Wording {
  return (courseId ? byCourse.get(courseId) : undefined) ?? template;
}

/**
 * The ONE wording a batch rendered, or null when it rendered more than one.
 * `email_batches.body_snapshot` is the only record of a body -- email_messages
 * keeps the subject and variables, not the text -- so the caller passes the
 * course of every recipient it actually RENDERS (never an id it could not
 * find), and a null is recorded as mixed rather than papered over with the
 * template's words, which would read as what was sent when it was not.
 * Both send screens send for one course, so null is reachable only through a
 * batch spanning courses (TD-033).
 */
export function batchWording(
  courseIds: ReadonlyArray<string | null | undefined>,
  byCourse: ReadonlyMap<string, Wording>,
  template: Wording,
): Wording | null {
  const seen = new Map<string, Wording>();
  for (const id of courseIds) {
    const w = wordingFor(id, byCourse, template);
    seen.set(`${w.subject}\u0000${w.body}`, w);
  }
  return seen.size === 1 ? [...seen.values()][0] : null;
}

/**
 * The opt-out line 0066 put into every stored template, verbatim
 * (requests/2026-09-26-every-course-wording-says-how-to-stop.md). A course's
 * OWN wording bypasses the template, so since RC-109 a course that wrote its
 * own words sent no visible way to stop -- 0066's title is "every follow-up
 * email says how to stop getting them", and a course's wording is not an
 * exception to it. The List-Unsubscribe headers are sent regardless; this is
 * the line a person can SEE.
 *
 * `src/data/sendPreview.ts` carries the same string, and
 * `src/data/sendPreview.test.ts` reads this file to hold the two together.
 */
export const UNSUBSCRIBE_LINE =
  '\n\n--\nIf you would rather not get these check-ins, you can stop them here:\n{{unsubscribe_url}}';

/** The body with the opt-out line, appended only when the wording does not
 *  already place {{unsubscribe_url}} itself -- the same guard 0066 used, so a
 *  course that worded its own opt-out keeps it exactly as written. */
export function withUnsubscribeLine(body: string): string {
  return body.includes('{{unsubscribe_url}}') ? body : body + UNSUBSCRIBE_LINE;
}
