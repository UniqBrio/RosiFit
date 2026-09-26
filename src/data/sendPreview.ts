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
 * wording and no second filler: a preview that could disagree with the send
 * would be worse than none.
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
    academyName: string; followUpTrigger: number;
  },
): SendPreview {
  const ctx = previewContext({
    member,
    courseName: member.course,
    branchName: member.branch,
    academyName: over.academyName,
    periodFrom: over.periodFrom,
    periodTo: over.periodTo,
    followUpTrigger: over.followUpTrigger,
  });
  return {
    label: `Preview · ${member.name}`,
    subject: fillTokens(wording.subject, ctx),
    body: fillTokens(wording.body, ctx),
  };
}
