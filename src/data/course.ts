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

/**
 * The members of ONE course -- joined on the course's IDENTITY, never on its
 * name.
 *
 * WHY THIS FUNCTION EXISTS AT ALL
 * Every screen wrote this join itself, inline, as
 * `members.filter(m => m.course === c.name)`. That is a join on a LABEL, and
 * a label is reused: delete "Prenatal Flow" and create "Prenatal Flow"
 * again, and the new course -- a different row, with no offerings, no
 * schedule and nobody enrolled -- was handed the deleted course's members.
 * Its card opened saying "2 members · 1 with email · 1 without" on the day it
 * was created, and every one of those was a fact about a course that had
 * been deleted.
 *
 * `course_id` is what her enrolment actually points at, so a member follows
 * her enrolment: when delete_course ENDS it (0020), she stops being anyone's
 * member until she is enrolled again, and the new course starts empty
 * because it IS empty.
 *
 * Written once, here, beside the summary it feeds -- the same reason
 * courseSummary is not computed in a render body. Both are claims about the
 * academy, and a claim nobody can test is one nobody can trust.
 */
export function enrolledIn<T extends { course_id: string | null }>(
  members: T[], course: { id: string } | null | undefined,
): T[] {
  if (!course) return [];
  return members.filter(m => m.course_id === course.id);
}

/** What a member's course reads as when she is enrolled at nothing. The
 *  register's own dash, not a blank -- there is no course, which is a fact,
 *  rather than a course whose name we failed to load. */
export const NO_COURSE = '—';

/**
 * A member after the course she was enrolled in is deleted.
 *
 * delete_course (0020) ENDS her enrolment rather than removing it: the row
 * goes to status 'ended' with effective_to today, so her history of having
 * attended the course survives the course. Once it is ended she is enrolled
 * at NOTHING, and that is the state this returns -- no course id to match
 * on, and the register's dash where a course name used to be.
 *
 * It matters that this is a step and not an omission. Leaving her pointing
 * at the deleted course is precisely how the next course created with that
 * name inherited her: the card asked for "members of a course called this",
 * and she still answered to the name. She stops being anyone's member here,
 * and stays that way until somebody enrols her again.
 *
 * A member of a DIFFERENT course is returned untouched, identity compared,
 * so deleting one of two courses that share a name cannot empty the other.
 */
export function endEnrolment<T extends { course: string; course_id: string | null }>(
  member: T, courseId: string,
): T {
  if (member.course_id !== courseId) return member;
  return { ...member, course: NO_COURSE, course_id: null };
}

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
    : 'Nobody needs follow-up';
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
