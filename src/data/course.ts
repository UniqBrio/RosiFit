/**
 * The lines a course card states on the Attendance workspace.
 *
 * The canvas' card is a summary, not a listing: a branch, a frequency, a
 * member count, how many of those members can be emailed, and ONE sentence
 * saying whether anybody in the course needs following up. The screen that
 * replaced it listed every offering and its weekdays instead, which is the
 * detail screen's job -- the card had become a second, worse copy of it.
 *
 * Pure and separate for the reason distribution() and reportRows() are: these
 * sentences are claims about the academy, and a claim computed inside a
 * render body is one nobody can test.
 *
 * The follow-up count uses the app's real rule engine (isEligible), NOT the
 * prototype's `missed >= 4`. The prototype hardcodes one threshold because it
 * has no rules table; this product resolves a per-course rule and falls back
 * to the global one, and guardrail 1 says the follow-up set is DERIVED from
 * the member list by that rule in exactly one place.
 */
import { hasEmail, type Member, type FollowUpRule } from './mock';
import { isEligible } from './followup';

export type CourseSummary = {
  /** "3 days/week · 3 members", or "No days set · 1 member" */
  freqLine: string;
  /** members with a usable address, and without */
  withMail: number;
  noMail: number;
  /** how many are over this course's threshold */
  flagged: number;
  /** 'error' | 'favorite' | 'check_circle' -- a word always accompanies it */
  icon: string;
  /** the whole sentence, so the icon is never the only signal */
  note: string;
  /** true when the course has no weekdays, so nothing is expected of anyone */
  noDays: boolean;
};

export function courseSummary(
  members: Member[], weekdayCount: number, rule: FollowUpRule,
): CourseSummary {
  const noDays = weekdayCount === 0;
  const noMail = members.filter(m => !hasEmail(m)).length;

  // A member with no address cannot be followed up even when she is over the
  // threshold, so she is counted in `noMail` and not in `flagged` -- the card
  // would otherwise promise a send that has nowhere to go (C-76).
  const flagged = members.filter(m => hasEmail(m) && isEligible(m, rule)).length;

  const freq = noDays
    ? 'No days set'
    : `${weekdayCount} ${weekdayCount === 1 ? 'day' : 'days'}/week`;
  const memberLine = `${members.length} ${members.length === 1 ? 'member' : 'members'}`;

  return {
    freqLine: `${freq} · ${memberLine}`,
    withMail: members.length - noMail,
    noMail,
    flagged,
    // No weekdays is not "nobody needs follow-up" -- it is the more serious
    // fact that NOTHING IS EXPECTED of anyone, so no absence can be counted
    // and the course is silently outside the engine entirely.
    icon: noDays ? 'error' : flagged ? 'favorite' : 'check_circle',
    note: noDays
      ? 'No frequency days — nothing is expected'
      : (flagged
          ? `${flagged} ${flagged === 1 ? 'member needs' : 'members need'} follow-up`
          : 'Nobody needs follow-up')
        + (noMail ? ` · ${noMail} without email` : ''),
    noDays,
  };
}

/** "4 courses · 3 branches · 1 need follow-up" -- generated, never typed. */
export function coursesHeadline(
  courseCount: number, branchCount: number, needFollowUp: number,
): string {
  const courses = `${courseCount} ${courseCount === 1 ? 'course' : 'courses'}`;
  const branches = `${branchCount} ${branchCount === 1 ? 'branch' : 'branches'}`;
  const need = needFollowUp
    ? `${needFollowUp} need follow-up`
    : 'nobody needs follow-up';
  return `${courses} · ${branches} · ${need}`;
}

/**
 * The course a roster claims to show, or null for "show everybody".
 *
 * The members screen is opened scoped by the chevron on a course card, and
 * the course travels in the URL. That makes it UNTRUSTED INPUT on a heading:
 * without this, /members?courseName=anything would render "anything" as the
 * screen's title and "Nobody is enrolled in anything" underneath -- the app
 * confidently describing a course that does not exist, in its own voice.
 *
 * It also handles the honest version of the same case: a link kept from
 * before a course was renamed or deleted. Falling back to the full list is
 * right there too -- an empty roster for a course nobody has is a worse
 * answer than every member.
 *
 * Matched case-insensitively on the trimmed name because a URL round-trips
 * through encoding and hand-editing, but the value RETURNED is the academy's
 * own spelling, never the caller's -- so the heading reads the way the course
 * list reads.
 */
export function rosterScope(known: string[], asked: unknown): string | null {
  const want = typeof asked === 'string' ? asked.trim() : '';
  if (!want) return null;
  return known.find(n => n.trim().toLowerCase() === want.toLowerCase()) ?? null;
}
