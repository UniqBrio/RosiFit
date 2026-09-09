/**
 * When a member became one -- and what a date-scoped screen may show of her.
 *
 * A member added on 7 September was not on the register on the 6th. The
 * database has always known this: `create_member` (0026) opens her enrolment
 * at `coalesce(p_joined_on, current_date)`, and
 * `expected_members_for_session` (0007) will not expect anybody whose
 * `member_enrollments.effective_from` falls after the session's date. The APP
 * did not know it, because `fetchMembers` read `joined_on` and mapped it to a
 * formatted month for a subtitle -- so every date-scoped view rendered the
 * whole member list whatever date it claimed to be about, and a roster for
 * last Tuesday listed somebody who joined this morning as *Yet to mark*.
 *
 * This module is the whole of the rule, in one place, for the reason
 * `isEligible` is: a claim about a member that is computed inside a render
 * body is one nobody can test, and four screens each comparing two dates for
 * themselves is four chances to disagree about what "before" means.
 *
 * WHAT IT IS NOT. It is not the member register. A member is a member from
 * the day she is added, and the Members tab, the course's own roster count
 * and every search over the register show her whether or not a date is in
 * play. This narrows the views that are ABOUT a date -- a day's attendance, a
 * period's figures -- and nothing else.
 *
 * Dates are compared as ISO strings. `yyyy-mm-dd` sorts lexicographically in
 * date order, which is why the whole app compares days this way
 * (`dayIso > todayIso` in dayAttendance) and why nothing here builds a Date:
 * a Date carries a timezone, and a member who joined at 00:00 IST must not
 * become invisible for a day because the browser is in London.
 */

// `dateInWords` only. inactiveFrom.ts pulls in nothing at run time but
// `period` -- its `MemberStatus` import is type-only and is erased -- so the
// two ends of the membership window may name each other without a cycle.
import { dateInWords } from './inactiveFrom';

/** Anything carrying the column. Structural, so a caller may pass a row. */
export type HasJoinedOn = { joinedOn?: string | null };

/** yyyy-mm-dd, and nothing else. A half-typed date is not a date. */
const ISO = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Was she on the register on `iso`?
 *
 * INCLUSIVE of the joining day itself: added on the 7th means present on the
 * 7th. That is the requester's own boundary, and it is the one
 * `expected_members_for_session` uses -- `session_date >= effective_from`.
 *
 * NO DATE ON RECORD IS NOT A REASON TO HIDE HER. `members.joined_on` is
 * nullable (0006) and every member the bulk import created before 0049 has no
 * date at all (RC-033), so a member with no date is an ordinary member whose
 * paperwork is thin -- not a member
 * who joined in the future. Reading a missing date as "hide her from every
 * past date" would quietly empty the register of everybody imported before
 * the column was being filled in, which is a far worse answer than showing
 * one extra row.
 */
export function hasJoinedBy(m: HasJoinedOn, iso: string): boolean {
  const joined = typeof m.joinedOn === 'string' ? m.joinedOn.trim() : '';
  if (!ISO.test(joined)) return true;
  return joined <= iso;
}

/** The opposite, named so a screen can count what it is leaving out. */
export function joinedAfter(m: HasJoinedOn, iso: string): boolean {
  return !hasJoinedBy(m, iso);
}

/**
 * The members a ONE-DAY view may show: the roster the attendance chips are
 * about, the register for a session.
 *
 * A null day means "no day is selected", and then nothing is narrowed -- an
 * unselected strip must not empty the roster underneath it.
 */
export function membersOnDay<T extends HasJoinedOn>(members: T[], dayIso: string | null): T[] {
  if (!dayIso || !ISO.test(dayIso)) return members;
  return members.filter(m => hasJoinedBy(m, dayIso));
}

/**
 * The members a PERIOD view may show -- the Overview's ring, a report, a
 * bucketed trend.
 *
 * The test is the period's LAST day, not its first: a member who joined on
 * the Wednesday of the week being shown was a member for part of that week
 * and her sessions are in it. Only somebody who joined after the whole period
 * had passed was never in it at all.
 */
export function membersInPeriod<T extends HasJoinedOn>(
  members: T[], period: { to: string },
): T[] {
  return membersOnDay(members, period.to);
}

/**
 * The sentence a day-scoped roster owes the person reading it.
 *
 * A count that silently drops rows is the defect this fix exists to remove,
 * arriving from the other side: the roster says "Members (7)" on Monday and
 * "Members (8)" on Wednesday and nothing on screen says why. So the screen
 * states the omission, in the app's voice, or says nothing at all when there
 * is nothing to state.
 */
export function joinedLaterNote(hidden: number, dayLabel: string): string | null {
  if (hidden <= 0) return null;
  return hidden === 1
    ? `1 member joined after ${dayLabel} and is not listed for it. They are still on the course.`
    : `${hidden} members joined after ${dayLabel} and are not listed for it. They are still on the course.`;
}

/**
 * ACTIVE FROM (0057) -- why this date cannot be saved, as a sentence, or null
 * when it can.
 *
 * The exact mirror of `inactiveFromProblem` (src/data/inactiveFrom.ts), and
 * written to be read beside it: the two ends of the membership window get one
 * shape of answer, in the same order the database raises them, so the form
 * and `set_member_active_from` never disagree about which refusal applies.
 * The database is still the thing that decides -- this is what stops the
 * round trip, not what replaces it.
 *
 * THE THIRD REFUSAL IS NOT HERE, ON PURPOSE. `set_member_active_from` also
 * refuses a date later than the earliest session she is recorded at (0046
 * read forward), and the app cannot check it: `Member` carries her figures for
 * the period on screen, never the day of her first attendance row. Guessing
 * at it would be a fourth answer to a question the server already answers
 * exactly, so the form sends the date and shows what comes back.
 */
export function activeFromProblem(
  value: string,
  /** the far end of the window, ISO, or null when she has no date on record */
  inactiveFrom: string | null,
  /** today, ISO -- passed in rather than read, so this stays testable */
  todayIso: string,
): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Choose the day the member goes on the register';
  if (!ISO.test(trimmed)) return `“${trimmed}” is not a date — write it as YYYY-MM-DD`;
  // A member cannot have started next week. Same rule create_member (0016) and
  // set_member_active_from (0057) carry, said before the round trip.
  if (trimmed > todayIso) return 'A joining date in the future cannot be recorded';
  if (inactiveFrom && trimmed > inactiveFrom) {
    return `The member becomes inactive on ${dateInWords(inactiveFrom)},`
      + ' so cannot go on the register after that';
  }
  return null;
}
