/**
 * WHAT THE SEND IS ABOUT TO SAY, shown where the last Send button is
 * (requests/2026-09-26-preview-before-send.md).
 *
 * The requester: *"It would be easier if the user sees what content will be
 * sent before hitting send button either using "Send communication" or
 * "Reach out" button. Quickly show the message in the last screen where final
 * send button exists."*
 *
 * WHO IT IS RENDERED FOR: the FIRST TICKED member, in list order -- the same
 * member whose name leads the confirmation's "who" line, so the preview and
 * the line above it are about one person. Every other recipient receives the
 * same wording, filled from that member's own row, which the label says by
 * naming whose figures these are. Reach out has one member, so it is that member.
 *
 * WHAT IT IS RENDERED FROM: the wording the course resolves to
 * (`effective_course_message`, read by `useCourseMessage`) -- the same one
 * `send-followups` renders since RC-109 -- filled by `fillTokens`, the same
 * one-pass substitution the course form's preview uses. There is no second
 * wording: a preview that could disagree with the send would be worse than
 * none.
 *
 * FOUR TOKENS ARE FILLED HERE FIRST, in the SENDER's format, because the form
 * preview's map (`variables()` in message.ts) does not match the sender for
 * them and its specs pin that on purpose for the form:
 *   - {{last_attendance_date}}: the sender prints `last_present_date` (ISO);
 *     `Member.last` is the date the member was last EMAILED.
 *   - {{attendance_pct}}: the database rounds to one decimal (0008, 0075), so
 *     33.3%, never 33%; em dash when nothing was expected.
 *   - {{follow_up_trigger}}: em dash when no condition is on, as `triggerOf`.
 *   - {{unsubscribe_url}}: minted per recipient at send time, so no screen can
 *     hold it -- the preview says what goes there instead of showing a URL
 *     that looks like the member's real one.
 *
 * Kept out of the screens for the reason every rule in this layer is: a file
 * importing react-native cannot be run by a spec.
 */

import { fillTokens, previewContext } from './message';
import type { Member } from './mock';

export type SendPreview = {
  /** whose figures these are -- "Preview · <name>" */
  label: string;
  subject: string;
  body: string;
};

/** The opt-out line send-followups appends to a wording that lacks one
 *  (`UNSUBSCRIBE_LINE` in supabase/functions/send-followups/wording.ts, 0066's
 *  text). Restated because the app cannot import the Deno tree; the spec
 *  reads that file and fails if the two drift. */
export const UNSUBSCRIBE_LINE =
  '\n\n--\nIf you would rather not get these check-ins, you can stop them here:\n{{unsubscribe_url}}';

/** Shown where each member's own signed opt-out link goes (0066). */
export const UNSUBSCRIBE_STAND_IN = '[the member’s own unsubscribe link]';

/** `member_period_metrics.attendance_pct` as the sender prints it: one decimal,
 *  trailing zero dropped the way a JSON number drops it. */
export function senderPct(attended: number, expected: number): string {
  return expected > 0 ? `${Math.round((attended / expected) * 1000) / 10}%` : '—';
}

/** The first member of `list` whose id is ticked, in LIST order -- never in
 *  the order the boxes were ticked, which the confirmation's name line does
 *  not follow either. Null when nobody is ticked. */
export function firstTicked<T extends { id: string }>(list: readonly T[], picked: readonly string[]): T | null {
  return list.find(x => picked.includes(x.id)) ?? null;
}

/**
 * The message as `member` will read it: subject and body with every token
 * filled from the member's own row, this send's period, the academy name and
 * the trigger in force.
 *
 * The academy name and the trigger are REQUIRED, not defaulted. The label
 * names a real member, so a sample value standing in for one that has not
 * loaded would read as that member's actual email -- "RosiFit" over an
 * academy licensed under another name. A screen that has not read them yet
 * draws no preview rather than a plausible one.
 */
export function sendPreview(
  wording: { subject: string; body: string },
  member: Member,
  over: {
    periodFrom: string; periodTo: string;
    /** null when no condition is switched on -- the sender prints an em dash */
    academyName: string; followUpTrigger: number | null;
  },
): SendPreview {
  const sender: Record<string, string> = {
    last_attendance_date: member.lastPresent ?? '—',
    attendance_pct: senderPct(member.attended, member.expected),
    follow_up_trigger: over.followUpTrigger == null ? '—' : String(over.followUpTrigger),
    unsubscribe_url: UNSUBSCRIBE_STAND_IN,
  };
  // One pass over the four, then fillTokens over the rest. None of the values
  // above contains a brace, so the second pass cannot re-expand them.
  const pre = (text: string) => String(text ?? '').replace(/\{\{(\w+)\}\}/g, (whole, key: string) =>
    Object.prototype.hasOwnProperty.call(sender, key) ? sender[key] : whole);
  const ctx = previewContext({
    member,
    courseName: member.course,
    branchName: member.branch,
    academyName: over.academyName,
    periodFrom: over.periodFrom,
    periodTo: over.periodTo,
    followUpTrigger: over.followUpTrigger,
  });
  // The send appends the opt-out line when the wording has none, so the
  // preview does too -- before the tokens are filled, exactly as the send.
  const body = wording.body.includes('{{unsubscribe_url}}') ? wording.body : wording.body + UNSUBSCRIBE_LINE;
  return {
    label: `Preview · ${member.name}`,
    subject: fillTokens(pre(wording.subject), ctx),
    body: fillTokens(pre(body), ctx),
  };
}
