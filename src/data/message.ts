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
 */
export const MESSAGE_TOKENS: { token: string; means: string; chip: string }[] = [
  { token: '{{first_name}}', means: 'her first name', chip: 'Her first name' },
  { token: '{{member_name}}', means: 'her full name', chip: 'Her full name' },
  { token: '{{course_name}}', means: 'the course', chip: 'Course' },
  { token: '{{branch_name}}', means: 'the branch', chip: 'Branch' },
  { token: '{{period_from}}', means: 'start of the period', chip: 'Period from' },
  { token: '{{period_to}}', means: 'end of the period', chip: 'Period to' },
  { token: '{{expected_sessions}}', means: 'sessions she was due at', chip: 'Sessions due' },
  { token: '{{attended_sessions}}', means: 'sessions she made', chip: 'Sessions made' },
  { token: '{{missed_sessions}}', means: 'sessions she missed', chip: 'Sessions missed' },
  { token: '{{attendance_pct}}', means: 'her attendance', chip: 'Attendance %' },
  { token: '{{consecutive_missed}}', means: 'missed in a row', chip: 'Missed in a row' },
  { token: '{{last_attendance_date}}', means: 'when she was last present', chip: 'Last present' },
  { token: '{{academy_name}}', means: 'the academy', chip: 'Academy' },
];

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
