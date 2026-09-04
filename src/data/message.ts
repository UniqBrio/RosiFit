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
export const MESSAGE_TOKENS: { token: string; means: string }[] = [
  { token: '{{first_name}}', means: 'her first name' },
  { token: '{{member_name}}', means: 'her full name' },
  { token: '{{member_code}}', means: 'her RF- code' },
  { token: '{{course_name}}', means: 'the course' },
  { token: '{{branch_name}}', means: 'the branch' },
  { token: '{{period_from}}', means: 'start of the period' },
  { token: '{{period_to}}', means: 'end of the period' },
  { token: '{{expected_sessions}}', means: 'sessions she was due at' },
  { token: '{{attended_sessions}}', means: 'sessions she made' },
  { token: '{{missed_sessions}}', means: 'sessions she missed' },
  { token: '{{attendance_pct}}', means: 'her attendance' },
  { token: '{{consecutive_missed}}', means: 'missed in a row' },
  { token: '{{last_attendance_date}}', means: 'when she was last present' },
  { token: '{{academy_name}}', means: 'the academy' },
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
    member_code: m.code,
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
    member: { name: '', code: '', expected: 0, attended: 0, missed: 0, streak: 0, last: '' } as Member,
    courseName: '', branchName: '', academyName: '', periodFrom: '', periodTo: '',
  });
  const found = String(text ?? '').match(/\{\{\w+\}\}/g) ?? [];
  return [...new Set(found.filter(t => !Object.prototype.hasOwnProperty.call(known, t.slice(2, -2))))];
}
