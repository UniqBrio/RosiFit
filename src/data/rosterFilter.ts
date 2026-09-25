/**
 * WHICH MEMBERS THE COURSE ROSTER DRAWS, once the reading filter is applied.
 *
 * The roster card carries four readings for the selected day -- Present ·
 * Absent · Yet to mark, and *Not expected* where the course does not run --
 * plus the *No email* group underneath. The requester asked to be able to
 * pick one and see only those: "add filter to choose present, absent, yet to
 * mark & no emails".
 *
 * THE FILTER READS THE SAME DERIVATION THE CHIP DOES. `dayAttendance` is the
 * whole of "which chip is filled", and this module calls it rather than
 * re-deciding from the rows -- for the reason guardrail 1 states about the
 * follow-up list: a second derivation of one fact is exactly how a card
 * reading *Absent* ends up under a filter that says *Present*. Nothing here
 * stores a state; it narrows a list.
 *
 * *Yet to mark* is NOT every unmarked card. The card says *Yet to mark* only
 * where she was expected and no file has arrived; where the course does not
 * run that day it says *Not expected* instead, on the rule that "yet to mark"
 * there would promise an upload that is never coming (ADR-023). So the filter
 * matches the WORD ON THE CARD, and a not-expected member is left out of it.
 *
 * ANY NUMBER OF THE FOUR MAY BE TICKED AT ONCE, the way the Overview's
 * course and branch filters work -- the requester asked for exactly that
 * ("like in overview drop down multi selection is possible"). Several ticks
 * are an OR, which is what a list of checkboxes means everywhere else in
 * this app: *Absent* and *No email* together shows the members who are
 * either, and the line under the field says "or" in words so the reader is
 * never left to guess. NOTHING ticked is every member -- "narrowed to
 * nothing" and "narrowed to everything" are the same set.
 *
 * Pure, and takes rows and the clock as arguments, for the reason RC-012
 * records: a derivation that reaches for `mock.ts` cannot be tested against
 * anything else.
 */
import { dayAttendance } from './dayAttendance';
import { emailIssueFor } from './emailIssues';
import { isActiveOn } from './inactiveFrom';
import type { AttendanceRow, Member } from './mock';

export type RosterFilterKey =
  | 'all' | 'present' | 'absent' | 'unmarked' | 'no-email'
  | 'bounced' | 'unsubscribed'
  | 'active' | 'inactive';

/** The word a card reads on the selected day. `null` when it reads nothing --
 *  no day is selected, or the week has not arrived. */
export type RosterReading = 'present' | 'absent' | 'unmarked' | 'not-expected' | null;

/**
 * The options, in the order the requester listed them. The labels are the
 * words already on the cards, letter for letter -- a filter named differently
 * from the thing it filters is a second vocabulary for one fact.
 *
 * `all` heads the list and is NOT one of the tickable rows: on a checkbox
 * list "All" is the EMPTY selection, and an option carrying that name would
 * switch the filter off by being chosen alongside others. It is here so one
 * constant holds every label the screen can show, including the field's own.
 */
export const ROSTER_FILTERS: { key: RosterFilterKey; label: string }[] = [
  { key: 'all', label: 'All members' },
  { key: 'present', label: 'Present' },
  { key: 'absent', label: 'Absent' },
  { key: 'unmarked', label: 'Yet to mark' },
  { key: 'no-email', label: 'No email' },
  /* The two reasons an address that EXISTS still cannot be used, asked for by
     name. They sit directly under No email because they are the same kind of
     fact -- about the record, not about the day -- and because the section
     they narrow to sits directly under the No email section on the screen.
     The words are the group headings of that section, letter for letter
     (src/data/emailIssues.ts), for the reason the note above gives: a filter
     named differently from the thing it filters is a second vocabulary.
     A spam report is a third reason and is NOT offered here, deliberately:
     the academy asked for these two. Such a member is still LISTED, under
     Spam Reported in the section itself. */
  { key: 'bounced', label: 'Bounced' },
  { key: 'unsubscribed', label: 'Unsubscribed' },
  /* Active and Inactive sit AFTER the readings, and last, because they are a
     different kind of fact and the order says so: Present, Absent and Yet to
     mark are readings of the day's register, while these two -- like No email
     -- are facts about the RECORD, true whether a file has arrived or not.
     They are the words already on the roster's own pill and on the heading of
     the section below it, letter for letter (app/course/[id].tsx), because a
     filter named differently from the thing it filters is a second vocabulary
     for one fact. */
  { key: 'active', label: 'Active' },
  { key: 'inactive', label: 'Inactive' },
];

export const ALL_MEMBERS = ROSTER_FILTERS[0].label;

/** The rows a checkbox list offers -- every option but the empty one. */
export const ROSTER_FILTER_OPTIONS = ROSTER_FILTERS.filter(f => f.key !== 'all');

export function rosterFilterKey(label: string): RosterFilterKey {
  return ROSTER_FILTERS.find(f => f.label === label)?.key ?? 'all';
}

/** The ticked LABELS, as the keys that decide. The list holds labels because
 *  that is what the checkbox rows tick and what the field prints. */
export function rosterFilterKeys(labels: string[]): RosterFilterKey[] {
  return labels.map(rosterFilterKey).filter(k => k !== 'all');
}

export function rosterFilterLabel(key: RosterFilterKey): string {
  return ROSTER_FILTERS.find(f => f.key === key)?.label ?? ALL_MEMBERS;
}

/** Everything about the DAY the roster is showing, which is what the three
 *  attendance readings are answers about. */
export type RosterScope = {
  /** every attendance row loaded for the week on screen */
  rows: AttendanceRow[];
  /** the day the strip has selected, ISO. null when none is */
  dayIso: string | null;
  /** the offerings of this course, narrowed to the branches in scope */
  weekdays: number[];
  /** today, ISO, passed in so the caller owns the clock */
  todayIso: string;
  /**
   * Whether the week's register has actually ARRIVED.
   *
   * `useAsync` keeps the previous week's rows while the next one loads, so a
   * filter applied then would narrow this week's roster by last week's
   * readings -- names shown under a word that was never true of them. While
   * it is false the three attendance filters narrow NOTHING, and the screen
   * says so in a line rather than letting the roster quietly widen.
   */
  ready: boolean;
};

/** What the card for this member READS on the scope's day. */
export function rosterReading(
  member: Pick<Member, 'id' | 'name' | 'course' | 'course_id' | 'weekdays'>,
  scope: RosterScope,
): RosterReading {
  if (!scope.ready || scope.dayIso === null) return null;
  const day = dayAttendance({
    rows: scope.rows, member, dayIso: scope.dayIso,
    weekdays: scope.weekdays, todayIso: scope.todayIso,
  });
  if (day.state === 'present' || day.state === 'absent') return day.state;
  return day.expected ? 'unmarked' : 'not-expected';
}

/**
 * The status fields are OPTIONAL here, though `Member.status` is required.
 *
 * Every real caller hands over a whole `Member`, so nothing in the app reaches
 * the default. What it buys is that a record which states no status reads as
 * ACTIVE -- the same answer `statusOn` gives a row carrying no dates, and the
 * answer every member written before those columns existed has always had.
 * Requiring it here would have meant editing an existing spec's fixture to
 * satisfy a type rather than to assert anything.
 */
type RosterMember =
  Pick<Member, 'id' | 'name' | 'course' | 'course_id' | 'weekdays' | 'emails'>
  & Pick<Partial<Member>, 'status' | 'inactiveFrom' | 'activeAgainFrom' | 'suppressedBefore'>;

/**
 * Whether this member is ON the register on the day the roster is showing.
 *
 * `isActiveOn` and nothing else -- the same predicate the screen splits the
 * roster with (`membersActiveOn` / `membersInactiveOn`), so a member cannot be
 * listed under the Inactive heading and matched by the *Active* tick at the
 * same time. Guardrail 1, applied to the one fact these two filters are about.
 *
 * NO DAY SELECTED IS EVERYBODY ACTIVE, which is not a guess: with no day the
 * screen builds no Inactive section at all (`membersInactiveOn` answers `[]`
 * for a null day), so there is nobody for *Inactive* to match and every card
 * on screen is one *Active* should keep.
 */
function activeOnDay(member: RosterMember, scope: RosterScope): boolean {
  if (scope.dayIso === null) return true;
  return isActiveOn({
    status: member.status ?? 'active',
    inactiveFrom: member.inactiveFrom ?? null,
    activeAgainFrom: member.activeAgainFrom ?? null,
  }, scope.dayIso);
}

/**
 * A FACT ABOUT THE RECORD, rather than a reading of the day's register.
 *
 * The distinction decides three separate things, which is exactly why it is
 * written down once instead of being restated wherever it is needed:
 *   - `matchesOne` answers these ABOVE the `ready` gate, so they narrow while
 *     a week is still loading and on a day the course does not run;
 *   - the screen must not say "the roster is not narrowed to X yet" over a
 *     roster that HAS been narrowed to X -- a sentence that is simply untrue;
 *   - an empty state under one of these must not name a day, because no day
 *     was asked about.
 *
 * It was a hand-kept list inside `app/course/[id].tsx` -- `k !== 'no-email'
 * && k !== 'active' && k !== 'inactive'` -- which went wrong every time this
 * union grew, including when Bounced and Unsubscribed were added to the
 * derivation, to the counts, and not to that line. A predicate that lives
 * beside the union it reads cannot be forgotten in the same way.
 */
export const isRecordFact = (key: RosterFilterKey): boolean =>
  key === 'no-email' || key === 'bounced' || key === 'unsubscribed'
  || key === 'active' || key === 'inactive';

/** One ticked option, against one member. */
function matchesOne(member: RosterMember, key: RosterFilterKey, scope: RosterScope): boolean {
  if (key === 'all') return true;
  // A fact about the RECORD, not about the day -- so it is answered whether
  // the week has loaded or not, and on a day the course does not run.
  if (key === 'no-email') return member.emails.length === 0;
  /* Why this asks `emailIssueFor` rather than reading `status` off an address:
     a suppression survives being removed and re-added (RC-107), so the answer
     is about the member's HISTORY as well as the live rows -- and it is
     already written down once, in the module the section below the roster
     draws from. Asking it here is what keeps the filter and that section
     showing the same people. */
  if (key === 'bounced' || key === 'unsubscribed') {
    return emailIssueFor(member)?.kind === key;
  }
  // The same, and for the same reason: whether somebody is on the register is
  // not a reading of a register that may not have arrived. Answered ABOVE the
  // `ready` gate below, so these two narrow while a week is still loading.
  if (key === 'active') return activeOnDay(member, scope);
  if (key === 'inactive') return !activeOnDay(member, scope);
  const reading = rosterReading(member, scope);
  // No reading to filter by: the cards show no chips either, so narrowing
  // here would hide members for a word nothing on screen is saying.
  if (reading === null) return true;
  return reading === key;
}

/**
 * Does this member belong on the roster under that choice.
 *
 * Takes one key or several. Several is an OR, and NONE is everybody -- see
 * the head of this file for why those are the same rule read twice.
 */
export function matchesRosterFilter(
  member: RosterMember, keys: RosterFilterKey | RosterFilterKey[], scope: RosterScope,
): boolean {
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length === 0) return true;
  return list.some(k => matchesOne(member, k, scope));
}

export function narrowRoster<T extends RosterMember>(
  members: T[], keys: RosterFilterKey | RosterFilterKey[], scope: RosterScope,
): T[] {
  const list = Array.isArray(keys) ? keys : [keys];
  if (list.length === 0 || list.includes('all')) return members;
  return members.filter(m => matchesRosterFilter(m, list, scope));
}

/**
 * The ticked options as a phrase -- "Present", "Present or Absent",
 * "Present, Absent or No email". It is what the note under the field prints,
 * so the OR the checkboxes mean is stated in words rather than inferred from
 * a count. Empty gives the all-label, because that is what no ticks shows.
 */
export function rosterFilterPhrase(labels: string[], allLabel: string): string {
  if (labels.length === 0) return allLabel;
  if (labels.length === 1) return labels[0];
  return `${labels.slice(0, -1).join(', ')} or ${labels[labels.length - 1]}`;
}

/**
 * Whether the INACTIVE section below the roster belongs to this choice.
 *
 * The section is not part of the day's register, and the three reading filters
 * deliberately never reached it -- Present, Absent and Yet to mark are
 * readings of a register these members are not on, so narrowing by one of them
 * left the section whole. That stays exactly as it was.
 *
 * *Active* and *Inactive* are the two that DO speak about it, because it is
 * the half of the split they name:
 *
 *   Inactive ticked  -> the section shows (and the register above it empties,
 *                       on its own, because every card in it is active).
 *   Active ticked, Inactive not -> the section is hidden. Somebody who asked
 *                       for the active members and is still shown a list of
 *                       inactive ones has been given an answer to a question
 *                       they did not ask.
 *   Neither ticked   -> unchanged, whatever else is ticked.
 *
 * Both ticked is everybody, which falls out of the first line rather than
 * needing a case of its own.
 */
export function showsInactive(keys: RosterFilterKey[]): boolean {
  if (keys.includes('inactive')) return true;
  if (keys.includes('active')) return false;
  return true;
}

/**
 * How many members each choice would leave, for the meta on its row: a filter
 * that offers a word with nobody behind it should say so before it is picked,
 * not after. `null` is "not known yet" -- the week has not arrived -- and is
 * drawn as no number at all rather than as a zero.
 */
export function rosterFilterCounts(
  members: RosterMember[], scope: RosterScope,
  /**
   * The members listed under the INACTIVE heading below the roster.
   *
   * Passed in rather than derived here, and this is the whole reason: the
   * `members` argument is the day's register, which by construction holds only
   * people who are ACTIVE on it -- the screen has already split them
   * (`membersActiveOn` / `membersInactiveOn`). Counting *Inactive* over that
   * list would print a confident `0` beside a row that, once ticked, reveals a
   * section full of names. The two lists are two halves of one split, so the
   * count needs both halves.
   *
   * Defaulted to empty so a caller with no inactive section -- no day
   * selected, where the screen builds none -- reads `0`, which is true there.
   */
  inactive: RosterMember[] = [],
): Record<RosterFilterKey, number | null> {
  const known = scope.ready && scope.dayIso !== null;
  const counts: Record<RosterFilterKey, number | null> = {
    all: members.length,
    present: known ? 0 : null,
    absent: known ? 0 : null,
    unmarked: known ? 0 : null,
    'no-email': 0,
    // Facts about the record, counted in the same pass as No email and for
    // the same reason: they are true whether or not the week has arrived.
    bounced: 0,
    unsubscribed: 0,
    active: members.length,
    inactive: inactive.length,
  };
  for (const m of members) {
    if (m.emails.length === 0) counts['no-email'] = (counts['no-email'] ?? 0) + 1;
    const issue = emailIssueFor(m);
    if (issue?.kind === 'bounced' || issue?.kind === 'unsubscribed') {
      counts[issue.kind] = (counts[issue.kind] ?? 0) + 1;
    }
    if (!known) continue;
    const reading = rosterReading(m, scope);
    if (reading === 'present' || reading === 'absent' || reading === 'unmarked') {
      counts[reading] = (counts[reading] ?? 0) + 1;
    }
  }
  return counts;
}
