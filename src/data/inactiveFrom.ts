/**
 * WHEN a member comes off the register — the whole of the rule, in one place.
 *
 * WHAT WAS WRONG
 * `members.status` (0006) is a bare present-tense flag. The only thing any
 * control could say about it was "now": `status_changed_at` records when
 * somebody pressed the pill, which is the same moment by construction. So a
 * member who is active today and leaving next month could only be recorded
 * twice over — left active and remembered, or marked inactive a month early
 * and dropped out of a follow-up rule she is still owed.
 *
 * `inactive_from` (0044) is the missing half: `status` stays the STATED
 * answer, and this date says from when it applies. Every reading of her
 * status is therefore a reading about a DAY, and the roster's week strip —
 * which can step 26 weeks either way — stops answering a question about
 * three weeks ago with a fact about today.
 *
 * WHAT IT IS NOT
 * Not a departure, and not an enrolment. 0031 says out loud that inactive
 * means "stop following her up" and moves no enrolment, session, expectation
 * or attendance record; a DATE on it is still that same fact, dated. Which
 * sessions expect her is `expected_members_for_session` (0007) resolving
 * offering schedule → enrolment window → member override, and
 * `members.status` is not one of those three. So a scheduled inactive date
 * leaves every expectation and every attendance record exactly where it is,
 * before the date and after it (`inactiveFrom.test.ts` holds that).
 *
 * Pure, and it takes the day as an argument: a derivation that reads the
 * clock itself cannot be asked "what was true on 3 August", which is the
 * whole point of it.
 */
import type { MemberStatus } from './mock';
import { parseISO } from './period';

/**
 * The pair, as any producer of a member record holds it.
 *
 * `inactiveFrom` is optional and nullable, and both spellings mean the same
 * thing: no date on record. That is what every row written before 0044
 * carries, and it must go on reading exactly as it always did — inactive,
 * full stop, on every day.
 */
export type StatusRecord = {
  status: MemberStatus;
  /** ISO yyyy-mm-dd, the first day the member is off the register */
  inactiveFrom?: string | null;
  /**
   * ISO yyyy-mm-dd, the first day a stated ACTIVE applies -- the mirror, and
   * new in 0072. Optional and nullable for the same reason its twin is: no
   * date on record is what every row written before 0072 carries, and those
   * must go on reading exactly as they always did -- active, full stop, on
   * every day.
   */
  activeAgainFrom?: string | null;
};

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * "1 October 2026" — locale-free, for the reason `period.joinedLabel` is:
 * `toLocaleDateString` writes a different month name per device, and a
 * sentence the form and its refusal both quote has to be one string.
 * An unparseable value comes back verbatim rather than as "Invalid Date".
 */
export function dateInWords(value: string): string {
  const d = parseISO(value);
  return d ? `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : value;
}

/** The day before `value`, ISO — the last day she is still on the register. */
export function dayBefore(value: string): string {
  const d = parseISO(value);
  if (!d) return value;
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Her status ON a given day — the ONE derivation.
 *
 *   stated 'active'            → active, whatever date is on the record
 *   a date, and the day is before it → active
 *   otherwise                  → what the record states
 *
 * The first line is not a shortcut: the date is cleared whenever the pick
 * moves back to Active (`set_member_status`, 0044), so a stale date on an
 * active row is a row nothing should be reading anyway — and reading it
 * would make somebody inactive that nobody marked.
 *
 * The comparison is a STRING comparison, which is exact for ISO dates and is
 * the same comparison `member_status_on` makes in SQL. Building two Dates to
 * compare them is how a timezone gets into a question that has none.
 */
export function statusOn(m: StatusRecord, onIso: string): MemberStatus {
  /**
   * THE RETURN DATE IS READ FIRST, and the order is the whole of the rule
   * (0072). A row carrying one states 'active', so asking the second line
   * first would answer 'active' for every day including the ones before the
   * member came back -- which is the defect 0045 removed from the other
   * direction, arriving from this one.
   *
   * This is the same CASE, branch for branch, as `member_status_on` in the
   * database: the two are one rule kept in two languages, and a screen that
   * disagreed with `follow_up_candidates` about who is on the register is
   * exactly what that costs.
   */
  const again = m.activeAgainFrom ?? null;
  if (again && onIso < again) return 'inactive';
  if (m.status === 'active') return 'active';
  const from = m.inactiveFrom ?? null;
  if (from && onIso < from) return 'active';
  return m.status;
}

/** On the register that day. 'paused' reads as not-active, exactly as every
 *  other reading in the app folds it (src/components/memberDialog.ts). */
export const isActiveOn = (m: StatusRecord, onIso: string): boolean =>
  statusOn(m, onIso) === 'active';

/**
 * The date she is DUE to come off, when that day has not arrived yet — and
 * null when there is nothing pending, either because she is active, because
 * she is already off, or because her record carries no date.
 *
 * This is what lets a screen say "Active" and still name what is coming,
 * rather than making the reader tap through to find out.
 */
export function pendingInactiveFrom(m: StatusRecord, todayIso: string): string | null {
  const from = m.inactiveFrom ?? null;
  if (m.status === 'active' || !from) return null;
  return from > todayIso ? from : null;
}

/**
 * The day the member is DUE BACK, when that day has not arrived yet -- and
 * null when there is nothing pending, either because no return was dated or
 * because the day has already come.
 *
 * The exact mirror of `pendingInactiveFrom`, and it exists for the same
 * reason: it is what lets a screen draw "Inactive" and still name what is
 * coming, rather than making the reader tap through to find out that somebody
 * has already been put back from the 1st.
 */
export function pendingActiveAgainFrom(m: StatusRecord, todayIso: string): string | null {
  const again = m.activeAgainFrom ?? null;
  if (m.status !== 'active' || !again) return null;
  return again > todayIso ? again : null;
}

/**
 * Why a RETURN date cannot be saved, as a sentence, or null when it can.
 *
 * The mirror of `inactiveFromProblem`, written to be read beside it: the same
 * shape of answer in the same order the database raises it, so the dialog and
 * `set_member_status` never disagree about which refusal applies. The
 * database is still the thing that decides.
 *
 * A PAST date is deliberately allowed, for the reason its twin allows one:
 * recording a return somebody forgot to enter last month is the same act as
 * scheduling one for next month, and refusing it would leave the only way to
 * say it being to mark the member active today and misdate them by four weeks.
 */
export function activeAgainFromProblem(
  value: string,
  /** the member's joining date, ISO, or null when the record carries none */
  joinedOn: string | null,
): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Choose the date they go back on the register';
  if (!parseISO(trimmed)) return `“${trimmed}” is not a date — write it as YYYY-MM-DD`;
  if (joinedOn && trimmed < joinedOn) {
    return `The member joined on ${dateInWords(joinedOn)}, so cannot go back on the register before that`;
  }
  return null;
}

/**
 * The members a DAY-SCOPED view may show — the other end of the membership
 * window from `joined.ts`, and deliberately its mirror image.
 *
 * `membersOnDay` (src/data/joined.ts) drops anybody who had not joined by the
 * day being shown, because she was not a member yet. This drops anybody who
 * is off the register ON that day, for the same reason read the other way:
 * the roster under "Attendance for Thu 1 Oct" is who the academy had that
 * day, and a member who went inactive on the 1st is not one of them. Compose
 * them and the list is the register as it stood on that date.
 *
 * SHE IS NOT OFF THE COURSE, exactly as `joined.ts` says of its half. The
 * Members tab, the search, the course's own member count and every send list
 * are untouched — none of them is about a date. Step the strip back to a day
 * before her date and she is on the roster again, with her pill, which is
 * also how she is marked active again from this screen. The caller states
 * the omission (`leftEarlierNote`) rather than letting a count drop rows in
 * silence.
 *
 * A null day means "no day is selected", and then nothing is narrowed — an
 * unselected strip must not empty the roster underneath it.
 *
 * NOTE ON WHAT THIS DOES NOT MOVE. Her enrolment stays open, so
 * `expected_members_for_session` (0007) goes on expecting her at sessions
 * after the date and the day's expected count still counts her. That is the
 * one place the roster and the register can now disagree, and it is why the
 * note matters. Making them agree means ENDING the enrolment at the date,
 * which is a different act (ADR-030) and is not taken here.
 */
export function membersActiveOn<T extends StatusRecord>(
  members: T[], dayIso: string | null,
): T[] {
  if (!dayIso) return members;
  return members.filter(m => isActiveOn(m, dayIso));
}

/**
 * The OTHER half of the same split: who `membersActiveOn` left behind.
 *
 * Derived from the very predicate that drops them, never assembled a second
 * way — the roster's inactive section and the roster itself have to be two
 * views of one rule, or a member turns up in both or in neither (guardrail 1).
 *
 * An unselected strip narrows nothing, so it has dropped nothing: null gives
 * the empty list rather than the whole register, which is the exact mirror of
 * `membersActiveOn` returning the whole register for the same argument.
 */
export function membersInactiveOn<T extends StatusRecord>(
  members: T[], dayIso: string | null,
): T[] {
  if (!dayIso) return [];
  return members.filter(m => !isActiveOn(m, dayIso));
}

/**
 * The sentence a day-scoped roster owes the reader for the members it did not
 * list among the day's rows because they were off the register that day.
 *
 * Worded like `joinedLaterNote`, and ending in the same reassurance, because
 * they are two halves of one fact and a reader should not have to notice
 * that the app phrases them differently.
 *
 * THE SENTENCE MOVED WITH THE ROWS (16-Sep-2026). It used to end "and is not
 * listed for it", which was true while the day dropped them outright; the
 * roster now gathers them into a section of its own underneath — "show
 * inactive members at bottom" — so the note points there instead of
 * announcing an absence the reader can see is not one. The copy-lock in
 * inactiveFrom.test.ts is re-pointed at the new string, which is that spec
 * doing its job.
 */
export function leftEarlierNote(hidden: number, dayLabel: string): string | null {
  if (hidden <= 0) return null;
  return hidden === 1
    ? `1 member was inactive on ${dayLabel} and is listed under Inactive below. They are still on the course.`
    : `${hidden} members were inactive on ${dayLabel} and are listed under Inactive below. They are still on the course.`;
}

/**
 * The one line a screen puts under her status word, or null when there is
 * nothing to add. Never the only signal — the word and the icon carry the
 * status itself (guardrail 3); this dates it.
 */
export function statusNote(m: StatusRecord, todayIso: string): string | null {
  const again = m.activeAgainFrom ?? null;
  if (m.status === 'active' && again) {
    // The mirror sentence, and it says the same two things its twin says:
    // which day, and what the member is until it comes.
    return again > todayIso
      ? `Active from ${dateInWords(again)} — out of the follow-up rule until then`
      : `Active since ${dateInWords(again)}`;
  }
  const from = m.inactiveFrom ?? null;
  if (m.status === 'active' || !from) return null;
  return from > todayIso
    ? `Inactive from ${dateInWords(from)} — in the follow-up rule until then`
    : `Inactive since ${dateInWords(from)}`;
}

/**
 * Why this date cannot be saved, as a sentence, or null when it can.
 *
 * The same three refusals `set_member_status` (0044) raises, said in the
 * same order, so the form and the database do not disagree about which one
 * applies. The database is still the thing that decides — this is what stops
 * the round trip, not what replaces it.
 *
 * A PAST date is deliberately allowed. Recording a departure somebody forgot
 * to enter last month is the same act as scheduling one for next month, and
 * refusing it would leave the only way to say it being to mark her inactive
 * today and misdate her by four weeks.
 */
export function inactiveFromProblem(
  value: string,
  /** her joining date, ISO, or null when her record carries none */
  joinedOn: string | null,
): string | null {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return 'Choose the date they become inactive';
  if (!parseISO(trimmed)) return `“${trimmed}” is not a date — write it as YYYY-MM-DD`;
  if (joinedOn && trimmed < joinedOn) {
    return `The member joined on ${dateInWords(joinedOn)}, so cannot become inactive before that`;
  }
  return null;
}
