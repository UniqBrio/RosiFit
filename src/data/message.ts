/**
 * Filling a course's wording with a real member's figures, for the preview.
 *
 * THIS MIRRORS THE SENDER, and that is the whole point of it existing.
 * supabase/functions/send-followups/index.ts renders a template with
 *
 *     tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`)
 *
 * so the syntax is DOUBLE braces and an unknown token is left standing rather
 * than blanked. Both are copied here deliberately. A preview that used a
 * different syntax would show `{{first_name}}` resolving in the form and
 * arriving unresolved in the inbox -- or worse, quietly agree while the two
 * drifted apart.
 *
 * The token list below is the sender's `vars` map, name for name. Anything
 * this file offers that the sender does not build would preview correctly and
 * send as literal text.
 *
 * WHY THE PREVIEW MATTERS MORE THAN IT LOOKS
 * The wording is authored once and sent to everyone in the course, so a
 * mistyped token is not a typo in one email -- it is a typo in every email
 * that course will ever send.
 */
import type { Member } from './mock';

/**
 * The tokens the Edge Function actually builds. Kept in this order because it
 * is the order the send function declares them in, which makes the two
 * readable side by side.
 */
/**
 * `chip` is the SHORT label a person taps; `means` is the full phrase read to
 * a screen reader and used in prose. They are separate on purpose: a chip row
 * has to stay one line and scannable, and "Sessions she was due at" does not,
 * while "Sessions due" alone is not enough for somebody who cannot see the
 * field it sits under.
 *
 * `everyday` is which of the thirteen the chip row OFFERS before it is asked
 * for more.
 *
 * WHY THE LIST IS SPLIT AND NOT SHORTENED
 * All thirteen are real -- each one is a key the Edge Function builds, and the
 * spec below pins that name for name. So none can be deleted: wording already
 * written with `{{attendance_pct}}` must keep resolving, in the preview and in
 * the inbox alike.
 *
 * What was wrong was offering all thirteen at once to somebody who came to
 * change a sentence. Tapping along the row produced lines like
 * "RosiFit Academy Main — 0 —": every token resolved correctly, and the
 * message was worse for each one. Thirteen equally-weighted chips read as
 * thirteen suggestions.
 *
 * `everyday: true` is exactly the seven the academy's own default template
 * uses (0009) -- the ones that make a follow-up read as a follow-up. The other
 * six are figures, and a figure belongs in a message only when somebody
 * deliberately went looking for it. They are one tap away, never gone.
 */
export const MESSAGE_TOKENS: {
  token: string; means: string; chip: string; everyday: boolean;
}[] = [
  { token: '{{first_name}}', means: 'her first name', chip: 'Her first name', everyday: true },
  { token: '{{member_name}}', means: 'her full name', chip: 'Her full name', everyday: false },
  { token: '{{course_name}}', means: 'the course', chip: 'Course', everyday: true },
  { token: '{{branch_name}}', means: 'the branch', chip: 'Branch', everyday: false },
  { token: '{{period_from}}', means: 'start of the period', chip: 'Period from', everyday: true },
  { token: '{{period_to}}', means: 'end of the period', chip: 'Period to', everyday: true },
  { token: '{{expected_sessions}}', means: 'sessions she was due at', chip: 'Sessions due', everyday: true },
  { token: '{{attended_sessions}}', means: 'sessions she made', chip: 'Sessions made', everyday: true },
  { token: '{{missed_sessions}}', means: 'sessions she missed', chip: 'Sessions missed', everyday: false },
  { token: '{{attendance_pct}}', means: 'her attendance', chip: 'Attendance %', everyday: false },
  { token: '{{consecutive_missed}}', means: 'missed in a row', chip: 'Missed in a row', everyday: false },
  { token: '{{last_attendance_date}}', means: 'when she was last present', chip: 'Last present', everyday: false },
  { token: '{{academy_name}}', means: 'the academy', chip: 'Academy', everyday: true },
];

/** The seven offered first. Order is MESSAGE_TOKENS' order, which is the
 *  sender's -- so the two lists stay readable side by side (see the spec). */
export const EVERYDAY_TOKENS = MESSAGE_TOKENS.filter(t => t.everyday);

export type MessageContext = {
  member: Member;
  courseName: string;
  branchName: string;
  academyName: string;
  periodFrom: string;
  periodTo: string;
};

/** The same map the send function builds, from the rows this app already has. */
function variables(ctx: MessageContext): Record<string, string> {
  const m = ctx.member;
  return {
    first_name: m.name.split(' ')[0],
    member_name: m.name,
    course_name: ctx.courseName,
    branch_name: ctx.branchName,
    period_from: ctx.periodFrom,
    period_to: ctx.periodTo,
    expected_sessions: String(m.expected),
    attended_sessions: String(m.attended),
    missed_sessions: String(m.missed),
    // Nothing expected is an em dash, never 0% -- the sender writes the same,
    // and "0%" would tell a member with no scheduled sessions that she
    // attended none of them.
    attendance_pct: m.expected > 0 ? `${Math.round((m.attended / m.expected) * 100)}%` : '—',
    consecutive_missed: String(m.streak),
    last_attendance_date: m.last,
    academy_name: ctx.academyName,
  };
}

export function fillTokens(text: string, ctx: MessageContext): string {
  const vars = variables(ctx);
  // ONE pass, exactly as the sender does it. A chained replace would rewrite
  // a value it had just inserted -- a member actually called "{{branch_name}}"
  // would come out as the branch.
  return String(text ?? '').replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : whole);
}

/**
 * The tokens a piece of wording uses that the SENDER cannot fill.
 *
 * Read from the same map, so this can never disagree with fillTokens about
 * what is known -- which would be the one way for the warning and the preview
 * to contradict each other.
 */
export function unknownTokens(text: string): string[] {
  const known = variables({
    member: { name: '', expected: 0, attended: 0, missed: 0, streak: 0, last: '' } as Member,
    courseName: '', branchName: '', academyName: '', periodFrom: '', periodTo: '',
  });
  const found = String(text ?? '').match(/\{\{\w+\}\}/g) ?? [];
  return [...new Set(found.filter(t => !Object.prototype.hasOwnProperty.call(known, t.slice(2, -2))))];
}

/**
 * Dropping a token into wording at the cursor.
 *
 * WHY THIS IS A FUNCTION AND NOT THREE LINES IN THE FORM
 * It is the whole behaviour of the chip row, it has four edge cases, and none
 * of them is visible by reading the call site. Here it is testable without
 * rendering anything.
 *
 * SPACING IS PART OF THE JOB, not a nicety. The people writing this wording
 * are not technical: they tap "Her first name" after typing "Hi," and expect
 * "Hi, Divya", not "Hi,Divya". So a space is added before the token when the
 * character to its left is not already whitespace, and after it when the
 * character to its right is neither whitespace nor closing punctuation. A
 * token dropped at the very start or end gets neither -- there is nothing to
 * separate it from.
 *
 * NO SELECTION MEANS APPEND. `start` of -1 (a field never focused) puts the
 * token at the end, which is the only defensible guess: inserting at index 0
 * would silently reorder a sentence somebody had already written.
 *
 * A selection RANGE is replaced, exactly as typing over selected text does.
 */
export function insertToken(
  text: string, token: string, start: number, end: number,
): { text: string; caret: number } {
  const src = String(text ?? '');
  const lo = Number.isInteger(start) && start >= 0 && start <= src.length ? start : src.length;
  const hi = Number.isInteger(end) && end >= lo && end <= src.length ? end : lo;

  const before = src.slice(0, lo);
  const after = src.slice(hi);
  const lead = before.length > 0 && !/\s$/.test(before) ? ' ' : '';
  // Closing punctuation needs no space before it -- "{{first_name}}," reads
  // right and "{{first_name}} ," does not.
  const trail = after.length > 0 && !/^[\s.,;:!?)\]]/.test(after) ? ' ' : '';
  const middle = `${lead}${token}${trail}`;
  return { text: before + middle + after, caret: before.length + middle.length };
}

// ------------------------------------------------------- the wording's bounds
/**
 * What `course_communication` will accept (0021), stated where the FORM can
 * obey it.
 *
 * These numbers already existed, in exactly one place: a CHECK constraint in
 * migration 0021, pinned by `supabase/tests/15_course_communication.sql` ("a
 * two-character subject is refused"). The rule was specified and tested at the
 * database and was invisible from the form that collects the field, so the
 * first thing that enforced it was the INSERT -- after Save had been offered,
 * pressed, and refused in Postgres' own words. Restated here, not moved: the
 * constraint stays the last line of defence, this is the first.
 *
 * BLANK IS LEGAL and is not a length failure. NULL means "use the template's"
 * (0021's column comment), and `saveCourse` sends `subject.trim() || null` --
 * so an empty box is a course that follows its template, which is what Reset
 * writes too. Only wording that EXISTS has to be long enough to send.
 */
/** `courses.name` (0005). Here beside the wording bounds because they are read
 *  together — every one of them is a rule the Add-a-course form must obey
 *  before it offers Save, and the form is where they were all missing. */
export const COURSE_NAME_MIN = 2;
export const COURSE_NAME_MAX = 80;

export const SUBJECT_MIN = 3;
export const SUBJECT_MAX = 200;
export const BODY_MIN = 10;

/**
 * Why this wording cannot be saved, in the words the person needs — or `null`
 * when it can.
 *
 * Takes the OVERRIDE, never what the box displays. A course that has not been
 * reworded shows its template's words and saves nothing, so judging the
 * template's length here would refuse a save the database would have accepted.
 */
export function wordingProblem(subject: string, body: string): string | null {
  const s = String(subject ?? '').trim();
  const b = String(body ?? '').trim();

  // Subject first: it is the field above, and reporting both at once gives a
  // person two things to fix and no order to fix them in.
  if (s.length > 0 && s.length < SUBJECT_MIN) {
    return `The subject needs at least ${SUBJECT_MIN} characters, or leave it empty to use the template's.`;
  }
  if (s.length > SUBJECT_MAX) {
    return `The subject is ${s.length} characters — it can be at most ${SUBJECT_MAX}.`;
  }
  if (b.length > 0 && b.length < BODY_MIN) {
    return `The message needs at least ${BODY_MIN} characters, or leave it empty to use the template's.`;
  }
  return null;
}

/**
 * Why this course name cannot be saved — or `null` when it can.
 *
 * The same defect as wordingProblem() on the field above it: `courses.name` is
 * `between 2 and 80` (0005) and the form checked only the lower half, so an
 * over-long name was refused as `courses_name_check` after Save. Empty is
 * reported by the form's own "A course name is required", not here, so this
 * stays silent on it rather than giving one field two required messages.
 */
export function courseNameProblem(name: string): string | null {
  const n = String(name ?? '').trim();
  if (n.length === 0) return null;
  if (n.length < COURSE_NAME_MIN) {
    return `A course name needs at least ${COURSE_NAME_MIN} characters.`;
  }
  if (n.length > COURSE_NAME_MAX) {
    return `The course name is ${n.length} characters — it can be at most ${COURSE_NAME_MAX}.`;
  }
  return null;
}
