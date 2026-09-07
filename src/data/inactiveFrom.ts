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
  /** ISO yyyy-mm-dd, the first day she is off the register */
  inactiveFrom?: string | null;
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
 * The sentence a day-scoped roster owes the reader for the members it left
 * out because they were off the register that day.
 *
 * Worded like `joinedLaterNote`, and ending in the same reassurance, because
 * they are two halves of one fact and a reader should not have to notice
 * that the app phrases them differently.
 */
export function leftEarlierNote(hidden: number, dayLabel: string): string | null {
  if (hidden <= 0) return null;
  return hidden === 1
    ? `1 member was inactive on ${dayLabel} and is not listed for it. She is still on the course.`
    : `${hidden} members were inactive on ${dayLabel} and are not listed for it. They are still on the course.`;
}

/**
 * The one line a screen puts under her status word, or null when there is
 * nothing to add. Never the only signal — the word and the icon carry the
 * status itself (guardrail 3); this dates it.
 */
export function statusNote(m: StatusRecord, todayIso: string): string | null {
  const from = m.inactiveFrom ?? null;
  if (m.status === 'active' || !from) return null;
  return from > todayIso
    ? `Inactive from ${dateInWords(from)} — she is in the follow-up rule until then`
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
  if (!trimmed) return 'Choose the date she becomes inactive';
  if (!parseISO(trimmed)) return `“${trimmed}” is not a date — write it as YYYY-MM-DD`;
  if (joinedOn && trimmed < joinedOn) {
    return `She joined on ${dateInWords(joinedOn)}, so she cannot become inactive before that`;
  }
  return null;
}
