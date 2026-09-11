import { useEffect, useMemo, useState } from 'react';
import { View, Text, Pressable, ScrollView, TextInput, useWindowDimensions } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Muted, Label, Skeleton, EmptyState, ErrorState, DeepBackground } from '../../src/components/ui';
import { Icon } from '../../src/components/Icon';
import { ConfirmDialog, SearchPicker } from '../../src/components/Sheet';
import {
  DropdownRow, DropdownField, DropdownPanel, DropdownList, DropdownCheckList,
} from '../../src/components/Dropdown';
import { useTheme } from '../../src/theme/ThemeProvider';
import { useAutoFocus } from '../../src/components/openingFocus';
import { useToast } from '../../src/components/Toast';
import { SPACE, RADIUS, TAP_MIN, STATUS, statusSurface, type StatusKey } from '../../src/theme/tokens';
import { DAY_NAMES, ruleSentence, AVATAR_TINTS, initials, primaryEmail, type Member, type MemberStatus } from '../../src/data/mock';
import { useCourses, useFollowUp, useAttendance } from '../../src/data/hooks';
import { weekStart, iso, label as periodLabel } from '../../src/data/period';
import {
  setMemberStatus, mergeMemberInto, deleteMember, memberDeletionPreview, dataSource,
  attendanceResetPreview, resetDayAttendance, bulkDeleteMembers,
} from '../../src/data/repository';
import { ResetRegisterDialog } from '../../src/components/ResetRegisterDialog';
import { Tooltip } from '../../src/components/Tooltip';
import {
  resetPreview, resetOutcome, resetFailure,
  type ResetPreview, type ResetTarget, deleteWarning,
} from '../../src/data/attendanceReset';
import {
  removalOutcome, removalFailure, deletionWarning, type PreviewState,
} from '../../src/data/memberRemoval';
import { dayAttendance, dayInWords, type DayState } from '../../src/data/dayAttendance';
import {
  ROSTER_FILTER_OPTIONS, ALL_MEMBERS, rosterFilterKeys, rosterFilterPhrase,
  narrowRoster, rosterFilterCounts, type RosterScope,
} from '../../src/data/rosterFilter';
// The two the Overview's own multi-choice filters are built from, so this one
// prints its field and toggles its ticks by exactly the same rules.
import { fieldValue, toggle } from '../../src/data/overview';
import { streakReading, missLine } from '../../src/data/streak';
import { enrolledIn } from '../../src/data/course';
import { offersUpload } from '../../src/data/uploadWindow';
// The RC-039 rule, pure and specced next door: "not uploaded" is a claim
// only a COMPLETED read may make (src/data/dayLoad.ts).
import { dayLoad, dayStatusKey, type DayLoad } from '../../src/data/dayLoad';
import { membersOnDay, joinedLaterNote } from '../../src/data/joined';
import {
  isActiveOn, pendingInactiveFrom, dateInWords, membersActiveOn, leftEarlierNote,
} from '../../src/data/inactiveFrom';
import type { AttendanceRow } from '../../src/data/mock';
import type { ScreenState } from '../../src/data/useScreenState';
import { MERGE_FAILED } from '../../src/data/alias';
import { ALL_BRANCHES } from '../../src/state/academy';
import { backFrom } from '../../src/data/nav';
import { ShellScreen } from '../../src/components/AppShell';

/**
 * The canvas' COURSE DETAIL.
 *
 * WHAT WAS MISSING
 * A course had an edit form, a rules form and an offering form, and no screen
 * that simply SHOWED it. The Courses tab's "Members" link went to the members
 * tab unscoped -- every member of every course -- so the question the canvas
 * asks here ("who is in this course, and how are they doing this week") had
 * no answer anywhere in the app. Its delete answered with
 * `flash('Removing X needs a confirmation')`, which was true and was the
 * whole implementation.
 *
 * THE WEEK STRIP IS READ, NEVER DERIVED FROM FREQUENCY
 * A course states a frequency; 0005 says out loud that expected attendance is
 * derived from offering_schedules and *** NEVER *** from that number. So the
 * strip reads the attendance rows for the week and gives a day the status its
 * rows actually carry -- and a day the offering does not run says "not
 * expected" rather than inventing a session from `frequency`. That is the
 * difference between this screen and one that quietly disagrees with the
 * register.
 */

/** How many weeks either way a person can step. Far enough to answer "what
 *  happened last month", short enough that each fetch stays one week wide. */
const WEEK_LIMIT = 26;

/** "Mon 31 Aug" -- the day named on the roster caption. Short, because it
 *  sits under a search box; the sentences say it in full (dayInWords). */
function dayLabel(dayIso: string): string {
  return new Date(`${dayIso}T00:00:00`).toLocaleDateString(undefined,
    { weekday: 'short', day: 'numeric', month: 'short' });
}

/** The three readings, in the order the requester listed them. `state` is
 *  which one is true. None of the three is a control (ADR-023): the register
 *  is written by the uploaded session file and this row reports it. The
 *  unmarked reading carries its own tone and word at render, because it
 *  stands for two different facts -- see the block that draws it. */
const CHIPS: { state: DayState; word: string; icon: string; tone: StatusKey | null }[] = [
  { state: 'present',  word: 'Present',      icon: 'check',                   tone: 'present' },
  { state: 'absent',   word: 'Absent',       icon: 'close',                   tone: 'absent'  },
  { state: 'unmarked', word: 'Yet to mark',  icon: 'radio_button_unchecked',  tone: null      },
];

/**
 * How wide a filter control on this screen gets.
 *
 * A field holding "2 filters" and a list of five short words does not need
 * the 1900pt a desktop will hand it: at full width the checkbox and the count
 * on the same row end up at opposite ends of the screen, with a hand's width
 * of empty rule between the word and the number it belongs to. The search box
 * above it stays full width on purpose -- a name being typed uses the room, a
 * five-word list does not.
 *
 * A MAXIMUM, paired with width 100%, so a phone still gets every point it
 * has and only a wide screen is capped. The panel takes the row's width, so
 * capping the row caps both halves of the control and they cannot drift into
 * two different widths.
 */
const FILTER_WIDTH = 340;

/**
 * What the roster says when the reading filter leaves nobody on it. Each is
 * the card's own word turned into a sentence about the day -- an empty list
 * under a filter has to say which fact emptied it, or it reads as a roster
 * that lost its members.
 */
const FILTER_EMPTY: Record<string, string> = {
  present: 'Nobody is marked present',
  absent: 'Nobody is marked absent',
  unmarked: 'Nothing is left to mark',
  'no-email': 'Everybody here has an email address',
};

/**
 * The sentence a failed week says, and the only one it says.
 *
 * Exported so the spec pins the literal rather than a paraphrase of it, and
 * so nothing retypes it. The word STATUS.awaiting carries is the one this
 * screen must never put in front of a person whose read failed, and the two
 * states are one line apart in the derivation.
 */
export const ATTENDANCE_LOAD_FAILED = "Couldn't load attendance. Tap to retry.";

type DayCell = {
  iso: string;
  dayNum: string;
  mon: string;
  dow: string;
  /** what the app knows. `key` is only how that is drawn */
  load: DayLoad;
  key: StatusKey;
  /** may this day offer its own upload button -- see ../src/data/uploadWindow */
  canUpload: boolean;
  /** the rows behind the cell, for the day's own summary line */
  present: number;
  absent: number;
  expected: number;
};

function CourseDetailBody() {
  const { theme } = useTheme();
  // The caret starts in the member search: this screen's first field. It sits
  // below the course's own header, which is why the focus is placed without
  // scrolling to it (openingFocus.ts) -- the screen opens where it always did.
  const search = useAutoFocus<TextInput>(true);
  // The box carries the focus, not a ring inside it -- see Field.tsx.
  const [searching, setSearching] = useState(false);
  const { flash } = useToast();
  const router = useRouter();
  const { id, state: forced, from } = useLocalSearchParams<
    { id?: string; state?: string; from?: string }>();

  /**
   * LEAVING THE COURSE. The Courses tab pushes this screen, so popping is
   * right and keeps that tab exactly as it was left. But `back()` on an EMPTY
   * stack does nothing at all -- and this screen is the app's first route
   * whenever it is refreshed, bookmarked or relaunched on its own URL, which
   * is the whole of "the back button stops working after a refresh".
   * `backFrom` decides which of the two is true; nav.ts holds the reasoning.
   */
  const leave = () => {
    const to = backFrom(router.canGoBack(), from, '/courses');
    if (to === 'back') router.back(); else router.replace(to);
  };

  /**
   * The three breakpoints, and the only place they are stated.
   *
   *   >= 1024  desktop -- actions beside the title, search under the heading
   *   768-1023 tablet  -- the header wraps, the seven-card strip stays
   *   <  768   phone   -- actions stacked, ONE date card, search under the heading
   *
   * A phone is not a narrow desktop here: three 42pt buttons side by side at
   * 360pt truncate to one word each, and seven date cards give each day 44pt
   * to hold a month, a number, a weekday and an icon.
   *
   * WHY THE WIDTH IS IGNORED ON THE FIRST RENDER
   * This app ships as a STATIC export, so every route is prerendered in node
   * and then hydrated. react-native-web has no window there and reports a
   * width of 0 (Dimensions/index.js), while the browser reports the real one
   * on its very first render -- so reading the width directly would draw the
   * phone layout on the server and the desktop layout into the same markup,
   * which is a hydration mismatch: React discards the tree and remounts it.
   * That is the defect the note at the top of src/components/Icon.tsx was
   * written for, and this is the same shape of it.
   *
   * So the first render uses 0 on BOTH sides -- identical markup, by
   * construction -- and the measured width takes over on the render after
   * mount.
   */
  const { width } = useWindowDimensions();
  const [measured, setMeasured] = useState(false);
  useEffect(() => { setMeasured(true); }, []);
  const shownWidth = measured ? width : 0;
  const wide = shownWidth >= 1024;
  const compact = shownWidth < 768;

  const courses = useCourses(forced);
  const followUp = useFollowUp(forced);

  const [weekOffset, setWeekOffset] = useState(0);
  const [branch, setBranch] = useState<string>(ALL_BRANCHES);
  const [branchOpen, setBranchOpen] = useState(false);
  // The roster's reading filter -- Present · Absent · Yet to mark · No email,
  // any number of them at once. Held as LABELS, because that is what the
  // checkbox rows tick and what the field prints; rosterFilterKeys turns them
  // into the decision (src/data/rosterFilter). EMPTY is every member: on a
  // checkbox list "All" is the absence of ticks, never a row of its own.
  const [rosterShow, setRosterShow] = useState<string[]>([]);
  const [showOpen, setShowOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  // Roster search. It filters what this screen DRAWS and nothing else -- no
  // refetch, no scope change: the branch filter above is what narrows the
  // query.
  const [query, setQuery] = useState('');

  // The week being shown, as a Period -- the shape useAttendance takes, so
  // stepping weeks refetches rather than re-slicing a stale load.
  const week = useMemo(() => {
    const start = weekStart(new Date());
    start.setDate(start.getDate() + weekOffset * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return { from: iso(start), to: iso(end), label: periodLabel(start, end) };
  }, [weekOffset]);

  // ONE read of the clock for this screen. The strip asks it twice -- which
  // day is selected by default, and which days may offer an upload -- and two
  // reads is how those two answers end up on different sides of midnight.
  const todayIso = iso(new Date());

  const attendance = useAttendance(week, forced);

  const course = (courses.data ?? []).find(c => c.id === id);
  const members = followUp.data?.members ?? [];
  const rules = followUp.data?.rules;

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;

  // Only the branches this course actually runs at. Offering one it has no
  // offering at would filter every member away and read as "nobody is
  // enrolled" rather than "it does not run there".
  const branchOptions = useMemo(() => {
    const own = [...new Set((course?.offerings ?? []).map(o => o.branch))].sort();
    return [ALL_BRANCHES, ...own];
  }, [course]);

  // The roster, by the course's IDENTITY. Gathering it by name meant a
  // course created after one of the same name was deleted opened on the
  // deleted course's members -- and this screen is where their names, their
  // addresses and their attendance were then printed.
  const scoped = useMemo(
    () => enrolledIn(members, course)
      .filter(m => branch === ALL_BRANCHES || m.branch === branch),
    [members, course, branch]);

  /**
   * The seven cells, built from the attendance rows for this course so the
   * strip and the register cannot disagree:
   *
   *   the read has not answered -> loading. Nothing is claimed.
   *   the read FAILED           -> load failed. Still nothing is claimed:
   *                               no rows arrived, and "no rows arrived" is
   *                               not evidence about any file.
   *   rows present             -> completed; present/absent as recorded
   *   no rows, offering is off -> not expected
   *   no rows                  -> awaiting upload. No file has arrived for a
   *                               day this course runs, which is the state
   *                               the Upload action exists for. Reachable
   *                               ONLY from a read that came back whole.
   *
   * A day still to come used to be its own key, `scheduled`, drawn with a
   * clock. Nothing on the screen said what the clock meant: it was left out
   * of the legend because the day panel underneath spelled it out in a
   * sentence, and that panel has since been removed. So the strip now speaks
   * the four states its legend names, and an un-uploaded day wears the
   * cloud whether the date has passed or not (0034).
   *
   * WEARING THE CLOUD AND OFFERING THE UPLOAD ARE TWO DIFFERENT CLAIMS.
   * `key` is what the day IS; `canUpload` is whether a file can be attached
   * to it yet, and it is the narrower of the two -- the current week, and
   * only as far as today, which is the same window fetchPendingSessions
   * queries (`session_date <= today`). A future day keeps its cloud and its
   * word and simply has nothing to press, the way an uploaded day has
   * nothing to press. See src/data/uploadWindow for why, and for the week
   * boundary.
   */
  // One ink for the failed state, read from the same STATUS map the cells
  // above use. Two copies of a colour is how a banner and the strip it
  // belongs to end up disagreeing about what red means.
  const failedInk = theme.isDark ? STATUS.failed.fgDark : STATUS.failed.fgLight;

  const days: DayCell[] = useMemo(() => {
    // By course id: a deleted course's COMPLETED sessions are kept on
    // purpose (0020), so its rows are still in the week's load under its old
    // name, and a strip asking for rows "called this" would show them.
    const rows = (attendance.data ?? []).filter(r => r.course_id === course?.id
      && (branch === ALL_BRANCHES || r.branch === branch));
    const byDate = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = byDate.get(r.date) ?? [];
      list.push(r);
      byDate.set(r.date, list);
    }

    // The weekdays this course runs across the branches in scope. 1..7 with
    // Monday = 1, which is what offering_schedules.weekdays stores.
    const runsOn = new Set<number>();
    for (const o of course?.offerings ?? []) {
      if (branch !== ALL_BRANCHES && o.branch !== branch) continue;
      for (const d of o.weekdays) runsOn.add(d);
    }

    const start = new Date(`${week.from}T00:00:00`);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(start);
      date.setDate(date.getDate() + i);
      const dateIso = iso(date);
      const dayRows = byDate.get(dateIso) ?? [];
      // JS puts Sunday at 0; offering weekdays put Monday at 1, Sunday at 7.
      const weekday = date.getDay() === 0 ? 7 : date.getDay();

      const present = dayRows.filter(r => r.status === 'present' || r.status === 'extra').length;
      const absent = dayRows.filter(r => r.status === 'absent').length;
      const expected = dayRows.filter(r => r.expected).length;

      /*
       * THE READ'S OWN OUTCOME FIRST, the rows second. `attendance.data` is
       * null while a read is in flight AND null when one has failed, so
       * `?? []` turns either into "no records anywhere" -- which is the exact
       * shape of a week nobody has uploaded. That single collapse is RC-039.
       */
      const load: DayLoad = dayLoad(attendance.state, dayRows.length > 0);
      const key: StatusKey = dayStatusKey(load, { present, absent, runsToday: runsOn.has(weekday) });

      return {
        iso: dateIso,
        dayNum: String(date.getDate()),
        mon: date.toLocaleDateString(undefined, { month: 'short' }).toUpperCase(),
        dow: DAY_NAMES[weekday],
        load, key,
        canUpload: offersUpload(dateIso, todayIso),
        present, absent, expected,
      };
    });
  }, [attendance.data, attendance.state, course, branch, week.from, todayIso]);

  /**
   * The weekdays this course runs across the branches in scope, hoisted out
   * of the strip's own memo so the roster chips answer "was she expected"
   * from the SAME set the strip drew its cells from. Two derivations of one
   * schedule is how a day reads "not expected" in the strip and offers
   * Absent on the card below it.
   */
  const scopeWeekdays = useMemo(() => {
    const runs = new Set<number>();
    for (const o of course?.offerings ?? []) {
      if (branch !== ALL_BRANCHES && o.branch !== branch) continue;
      for (const d of o.weekdays) runs.add(d);
    }
    return [...runs];
  }, [course, branch]);

  // Today when it falls in the week being shown, otherwise the first day: a
  // strip with nothing selected has no detail panel, and an empty panel is
  // worse than a default one.
  const chosen = days.find(d => d.iso === selectedDay)
    ?? days.find(d => d.iso === todayIso)
    ?? days[0];

  /**
   * THE ROSTER IS ABOUT THE SELECTED DAY, so it holds the members who were
   * members that day.
   *
   * The line under the heading says "Attendance for Sun 6 September" and
   * every card carries a reading for that date -- which made a member added
   * on the 7th read as *Yet to mark* on the 6th: the academy blamed for
   * failing to record a session she could not have attended, in the one place
   * somebody acts on it. `members.joined_on` (0006) has always held the
   * answer; the rule that reads it is in src/data/joined.ts, with its specs.
   *
   * SHE IS NOT OFF THE COURSE. The Members tab, the search, the course card's
   * own member count and every send list are untouched -- none of them is
   * about a date. Only this list, and only while a day is selected, and the
   * note below says so in words rather than letting a count change silently.
   */
  const joinedByDay = useMemo(
    () => membersOnDay(scoped, chosen?.iso ?? null), [scoped, chosen?.iso]);
  /**
   * ...and the OTHER end of the same window: she is off the roster for a day
   * she was off the register (0045).
   *
   * "when i set member as inactive from 1st oct then when i click on date
   * card of 1st oct that member should not show up" — the requester, with a
   * screenshot of exactly that. Her pill already read Inactive on the day,
   * which was right and was not what was asked for: the day's roster is who
   * the academy HAD that day, so on the 1st she is not on it at all.
   *
   * Narrowed in two steps rather than one predicate so each omission can be
   * counted and named separately — "joined later" and "was inactive" are
   * different facts and a reader deserves to be told which one applies.
   */
  const onDay = useMemo(
    () => membersActiveOn(joinedByDay, chosen?.iso ?? null), [joinedByDay, chosen?.iso]);
  const joinedLater = chosen ? joinedLaterNote(scoped.length - joinedByDay.length,
    dayLabel(chosen.iso)) : null;
  const leftEarlier = chosen ? leftEarlierNote(joinedByDay.length - onDay.length,
    dayLabel(chosen.iso)) : null;

  // The members of that day, less anything the search box hides. Name or
  // address, because those are the two things written on a card.
  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return onDay;
    return onDay.filter(m => m.name.toLowerCase().includes(q)
      || m.emails.some(e => e.address.toLowerCase().includes(q)));
  }, [onDay, query]);

  /**
   * ...and then the READING filter, asked for by name: "add filter to choose
   * present, absent, yet to mark & no emails".
   *
   * SEARCH FIRST, THEN THE FILTER, so the panel's own counts are counts of
   * what picking that row would actually give -- the same rule the Attendance
   * tab's totals follow, where every figure is a count of the rows below it.
   *
   * The decision itself is in src/data/rosterFilter, which asks dayAttendance
   * -- the very function each card's chips are drawn from. One derivation, so
   * a card reading *Absent* can never appear under *Present*.
   */
  const rosterScope: RosterScope = useMemo(() => ({
    rows: attendance.data ?? [],
    dayIso: chosen?.iso ?? null,
    weekdays: scopeWeekdays,
    todayIso,
    ready: attendance.state === 'ready',
  }), [attendance.data, attendance.state, chosen?.iso, scopeWeekdays, todayIso]);

  // Recomputed from the labels rather than held beside them: two pieces of
  // state for one choice is how a tick and the list it narrows drift apart.
  const showKeys = useMemo(() => rosterFilterKeys(rosterShow), [rosterShow]);
  const shown = useMemo(
    () => narrowRoster(searched, showKeys, rosterScope), [searched, showKeys, rosterScope]);
  const showCounts = useMemo(
    () => rosterFilterCounts(searched, rosterScope), [searched, rosterScope]);
  // What the field prints, and what the notes below say in words. Several
  // ticks are an OR and the phrase says so -- "Present or No email".
  const showValue = fieldValue(rosterShow, ALL_MEMBERS, 'filters');
  const showPhrase = rosterFilterPhrase(rosterShow, ALL_MEMBERS);

  // A reading filter with no register behind it narrows NOTHING (rosterFilter
  // says why), so the roster is wider than the field claims. Said in a line
  // rather than left to be noticed: this screen's own rule is that a count
  // which drops -- or keeps -- rows silently is the defect.
  const showPending = showKeys.some(k => k !== 'no-email')
    && attendance.state !== 'ready';

  const withEmail = shown.filter(m => m.emails.length > 0);
  const withoutEmail = shown.filter(m => m.emails.length === 0);

  /* ------------------------------------------------ resetting the day
   *
   * The one way back out of an uploaded register (0056). It acts on the
   * SELECTED day and nothing else, and the day returns to its awaiting state
   * by derivation rather than by a flag: `days` above gives a day `awaiting`
   * when it holds no attendance rows, so clearing the rows IS the change.
   * Nothing here sets a status that could then disagree with them -- and the
   * word that day then wears is STATUS.awaiting.word, never a copy of it.
   */
  /**
   * SELECTION ON THE ROSTER, asked for by name — "enable select and deselect
   * option in members screen where we upload attendnace".
   *
   * Off by default and entered deliberately, because the roster's ordinary job
   * is reading and opening a member: turning every card into a checkbox all
   * the time would put a tick between a finger and the profile it was reaching
   * for. What the selection FEEDS is the reset's delete list, which is the
   * only destructive thing on this screen — so the selection is carried into
   * that dialog rather than acted on from here, where nothing states what a
   * deletion costs.
   */
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  /* THE TICKED MEMBERS WITH NO ADDRESS -- the only ones bulk delete may ever
     touch. Derived rather than kept as a second set (guardrail 1): one
     selection, and this is a reading of it. */
  const selectedNoEmail = useMemo(
    () => withoutEmail.filter(m => selected.has(m.id)), [withoutEmail, selected]);
  /** the same list, under the name the No email section's own bar reads it by */
  const noEmailSelected = selectedNoEmail;
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const toggleSelected = (id: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  // A selection is about the day it was made on. Leaving it standing across a
  // day change would carry ticks onto a roster that never showed them.
  useEffect(() => { setSelected(new Set()); setSelectMode(false); }, [chosen?.iso, course?.id]);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPreviewData, setResetPreviewData] = useState<ResetPreview | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const [resetBusy, setResetBusy] = useState(false);

  /**
   * The marks this day carries, read from the SAME rows the strip drew its
   * cell from. This is what decides whether Reset is offered at all: a day
   * with nothing on it has nothing to undo, and a button that opens a dialog
   * saying "nothing to reset" is a button that should not have been there.
   */
  const dayMarks = useMemo(() => (attendance.data ?? []).filter(
    r => r.course_id === course?.id && r.date === (chosen?.iso ?? '')
      && (branch === ALL_BRANCHES || r.branch === branch)).length,
    [attendance.data, course?.id, chosen?.iso, branch]);

  const openReset = async () => {
    if (!course || !chosen) return;
    setResetOpen(true);
    setResetError(null);
    setResetLoading(true);
    // The screen's own rows answer immediately, so the dialog opens with real
    // numbers rather than an empty frame; the server then replaces them. It
    // is the authority on WHO has an address -- a member the register marks
    // while enrolled in no course is not on this screen's roster at all, and
    // she is exactly who the delete offer exists for.
    // NARROWED TO THE SELECTION (0057). The reset acts on the members who
    // were ticked, so the preview has to count the same rows -- a preview of
    // the whole day over a reset of three members is a number describing a
    // write that is not going to happen.
    const picked = [...selected];
    setResetPreviewData(
      resetPreview(attendance.data ?? [], scoped, course.id, chosen.iso, picked));
    try {
      setResetPreviewData(await attendanceResetPreview(course.id, chosen.iso, picked));
    } catch (err) {
      setResetError(err instanceof Error ? err.message
        : 'What this reset would clear could not be counted. Nothing has been changed.');
    } finally {
      setResetLoading(false);
    }
  };

  /**
   * BULK DELETE. One `delete_member` call per member through the repository,
   * which is the audited hard-delete path the member card already uses --
   * never a bulk RPC of its own, or there would be two definitions of
   * "delete a member" free to drift apart.
   *
   * Only the ticked members WITH NO ADDRESS, which is what the control is
   * drawn over: `selectedNoEmail`, not `selected`. A member the academy can
   * still email is never removed by a bulk control.
   */
  const runBulkDelete = async () => {
    if (selectedNoEmail.length === 0) return;
    setBulkDeleting(true);
    try {
      const { deleted, failed } = await bulkDeleteMembers(selectedNoEmail.map(m => m.id));
      setConfirmBulkDelete(false);
      setSelected(new Set());
      setSelectMode(false);
      // BOTH numbers when some did not go. "3 deleted" over a selection of
      // five is the toast that makes somebody think the other two are gone.
      flash(
        failed.length === 0
          ? `${deleted} ${deleted === 1 ? 'member' : 'members'} deleted.`
          : `${deleted} deleted, ${failed.length} could not be — ${failed[0].reason}`,
        failed.length === 0 ? 'ok' : 'warn');
    } catch (err) {
      setConfirmBulkDelete(false);
      flash(err instanceof Error ? err.message
        : 'Those members could not be deleted. Nothing has been removed.', 'warn');
    } finally {
      setBulkDeleting(false);
    }
  };

  const runReset = async () => {
    if (!course || !chosen) return;
    setResetBusy(true);
    try {
      // The SELECTION, which is what the reset is now about. Nothing is
      // deleted here at all -- that is its own control below, with its own
      // confirmation, because the requester asked for the two apart.
      const outcome = await resetDayAttendance(course.id, chosen.iso, [...selected]);
      const words = resetOutcome(outcome, dayLabel(chosen.iso));
      setResetOpen(false);
      // The members those ticks pointed at may not exist any more, so the
      // selection cannot survive the write that acted on it.
      setSelected(new Set());
      setSelectMode(false);
      flash(words.message, words.tone);
    } catch (err) {
      // The dialog STAYS OPEN on a failure, carrying the reason. Closing it
      // would leave a toast as the only evidence, over a register the person
      // has every reason to believe was cleared.
      setResetError(resetFailure(err));
    } finally {
      setResetBusy(false);
    }
  };



  if (courses.state === 'loading') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={{ padding: SPACE.lg }}><Skeleton lines={6} /></ScrollView>
    );
  }
  if (courses.state === 'error') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SPACE.lg }}>
        <ErrorState onRetry={courses.retry}
          message={courses.error ?? 'The course could not be loaded. Nothing has been changed.'} />
      </ScrollView>
    );
  }
  if (!course) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }} contentContainerStyle={{ padding: SPACE.lg }}>
        {/* A deleted course reached by a stale link is not an error. It is an
            answer, and it says which. */}
        <EmptyState
          title="That course is not here"
          body="It may have been deleted, or the link may be out of date. The Courses tab lists every course the academy runs."
          action="Back to courses" onAction={() => router.replace('/(tabs)/courses')} />
      </ScrollView>
    );
  }

  const rule = rules?.byCourseName[course.name] ?? rules?.global;
  const freqLine = course.offerings.length === 0
    ? 'No offering yet, so no schedule and nobody is expected'
    : course.offerings.map(o => `${o.branch}: ${o.weekdays.length
        ? o.weekdays.map(d => DAY_NAMES[d]).join(', ') : 'No days set'}`).join(' · ');

  const memberSplit = `${withEmail.length} with email · ${withoutEmail.length} without`;

  // ONE line under the course name, where the hero used to spend three: how
  // many branches it runs at, and which days it runs on. Both facts were
  // already here; they were just on separate rows.
  const branchLine = branch === ALL_BRANCHES
    ? `${course.offerings.length} ${course.offerings.length === 1 ? 'branch' : 'branches'}`
    : `${branch} Branch`;
  const metaLine = `${branchLine} · ${freqLine}`;

  return (
    <>
        {/* --------------------------------------- THE COMPACT COURSE HEADER
            PINNED: this bar is a sibling ABOVE the roster's ScrollView, not
            its first child, so the course name and its three actions stay
            while the week strip and the member cards scroll beneath them
            (requests/2026-09-07-pin-screen-header-on-scroll.md). The same
            sibling-above pattern ShellScreen uses one level up for the
            academy header.
            The course is named ONCE, at heading size, with the back arrow
            beside it and the schedule directly underneath. What was here
            before said it twice -- a `Courses -> Postnatal` breadcrumb over a
            25pt hero -- across four rows and 22pt of bottom padding.

            The three primary actions ride this header rather than being spread
            down the screen. Send Communication was already here; Upload Session
            was reachable only from a day that happened to be awaiting; Add
            Member was a full-width bar pinned below the strip. They are the
            three things a person opens this screen to do, so they are one
            group, in one place. Deleting a course is not one of them: that
            lives on the Courses tab, so this header carries no trash icon. */}
        {/* fill={false}: this gradient is a BAR, not the screen. It is a
            sibling above the roster's ScrollView, and both defaulting to
            flex: 1 split the viewport in half -- 417pt of header carrying
            56pt of content, with the week strip and the members pushed below
            the fold. It hugs its three rows now. */}
        <DeepBackground fill={false} style={{
          paddingHorizontal: SPACE.lg, paddingTop: SPACE.sm, paddingBottom: SPACE.md,
        }}>
          <View style={{
            flexDirection: wide ? 'row' : 'column',
            alignItems: wide ? 'center' : 'stretch',
            gap: wide ? SPACE.lg : SPACE.md,
          }}>
            <View style={{ flex: wide ? 1 : undefined, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
                {/* THE ONE back control on this screen, and the reason the day
                    arrows below are square, smaller and live inside the strip:
                    "leave this course" and "move one day" were the same arrow
                    drawn twice, and nobody could tell which was which. */}
                <Pressable testID="course-back" onPress={leave} accessibilityRole="button"
                  accessibilityLabel="Go back" hitSlop={6}
                  style={({ pressed }) => ({
                    width: 34, height: 34, borderRadius: RADIUS.md,
                    alignItems: 'center', justifyContent: 'center',
                    backgroundColor: theme.deepControl,
                    borderWidth: 1, borderColor: theme.deepControlLine,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Icon name="arrow_back" size={19} color={theme.onAccent} />
                </Pressable>

                <Text numberOfLines={1} style={{
                  flex: 1, minWidth: 0, fontSize: 26, fontWeight: '800',
                  color: theme.onAccent, letterSpacing: -0.5, lineHeight: 30,
                }}>{course.name}</Text>
              </View>

              {/* Indented to the title, not the arrow, so the two read as one
                  block. Two lines at most -- a course at four branches states
                  four schedules, and that is a fact for the strip below to
                  show rather than for the header to grow into. */}
              <Text numberOfLines={2} style={{
                fontSize: 12.5, color: theme.onDeep, marginTop: 4, marginLeft: 42,
                fontVariant: ['tabular-nums'],
              }}>{metaLine}</Text>
            </View>

            <View style={{
              flexDirection: compact ? 'column' : 'row',
              flexWrap: compact ? 'nowrap' : 'wrap',
              alignItems: compact ? 'stretch' : 'center',
              justifyContent: 'flex-end', gap: SPACE.sm,
            }}>
              {/* The COURSE, not a date. The awaiting day below keeps its own
                  button because that one arrives already scoped to the session
                  she tapped; this one opens the flow asking which. */}
              <HeaderAction testID="course-upload" icon="cloud_upload" label="Upload Session" primary
                accessibilityLabel={`Upload a session for ${course.name}`}
                onPress={() => router.push({ pathname: '/upload', params: { courseId: course.id } })} />
              <HeaderAction testID="course-send" icon="send" label="Send Communication"
                accessibilityLabel={`Send communication for ${course.name}`}
                onPress={() => router.push({ pathname: '/send', params: { id } })} />
              <HeaderAction testID="course-add-member" icon="person_add" label="Add Member"
                accessibilityLabel={`Add a member to ${course.name}`}
                onPress={() => router.push({ pathname: '/member/edit', params: { courseId: course.id } })} />
            </View>
          </View>
        </DeepBackground>

      <ScrollView style={{ flex: 1, backgroundColor: theme.bg }}
        contentContainerStyle={{ paddingBottom: 110 }}>
        {/* THE LIFT THAT LETS A FILTER PANEL FLOAT. Read with the twin on
            the members block below and the note on the Show filter itself.

            Both panels are pop-ups: absolutely positioned, painted OVER the
            page rather than pushing it down. That only holds if the container
            they sit in out-ranks the member cards, which are a LATER SIBLING
            of this View -- and a later sibling wins by default however high
            the z-index INSIDE this one goes. So the lift is applied at every
            step of the chain from the panel to the cards' own parent, and
            only while a panel is actually out: a container left permanently
            above the rest of the page would take presses meant for them. */}
        <View style={{
          paddingHorizontal: SPACE.lg, paddingTop: SPACE.md,
          zIndex: branchOpen || showOpen ? 40 : 0,
        }}>
          {rule ? <Muted style={{ marginBottom: SPACE.sm }}>{ruleSentence(rule, course.name)}</Muted> : null}

          {/* ------------------------------------------------ branch filter */}
          {branchOptions.length > 2 ? (
            <>
              {/* The panel belongs INSIDE the row: it was a sibling of it,
                  so "below the field" resolved against this whole padded
                  block and put the branch list under the member heading, half
                  a screen from the field that opened it. The same defect the
                  requester reported on the Show filter, in the control next
                  to it -- unseen only because it is drawn at two branches and
                  up. It floats, like every other filter in this app; what
                  makes that safe is the lift on this View's own container. */}
              <DropdownRow open={branchOpen}
                style={{ width: '100%', maxWidth: FILTER_WIDTH }}
                dismiss={{ onPress: () => setBranchOpen(false), testID: 'course-branch-dismiss' }}>
                <DropdownField label="Branch" value={branch} open={branchOpen}
                  testID="course-branch-field"
                  onPress={() => { setShowOpen(false); setBranchOpen(o => !o); }} />
                {branchOpen ? (
                  <DropdownPanel>
                    <DropdownList
                      options={branchOptions.map(b => ({ label: b }))}
                      value={branch} testID="course-branch"
                      onSelect={v => { setBranch(v); setBranchOpen(false); }} />
                  </DropdownPanel>
                ) : null}
              </DropdownRow>
            </>
          ) : null}

          {/* ----------------------------- the week: its range and its legend
              One row on anything but a phone. The legend is here rather than in
              a section of its own because the only thing it explains is the
              icon on a date card, and it is four words wide. */}
          <View style={{
            flexDirection: compact ? 'column' : 'row',
            alignItems: compact ? 'flex-start' : 'center',
            gap: compact ? 6 : SPACE.md, marginTop: SPACE.md,
          }}>
            <Text style={{
              flex: compact ? undefined : 1, fontSize: 13, fontWeight: '700',
              color: theme.fg, fontVariant: ['tabular-nums'],
            }}>{weekOffset === 0 ? `${week.label} · this week` : week.label}</Text>
            <DayLegend />
          </View>

          {/* -------------------------------------------------- week strip
              The arrows flank the CARDS, not a caption. They used to sit on a
              row of their own with the week label centred between them, two
              controls a finger's width from the edges of the screen and a
              full row away from the thing they move. The week they are
              stepping is stated above, left-aligned where a heading goes, and
              the arrows are now the ends of the strip itself.

              They are rendered OUTSIDE the loading branch on purpose: stepping
              a week refetches, and arrows that blinked out for the duration
              would be arrows you cannot press twice in a row.

              SEVEN CARDS AT EVERY WIDTH, on request. A phone shows the whole
              week and every day stays one tap away; only the gaps close up to
              pay for it. What changed on the phone is the height of a card,
              not how many there are. */}
          <View style={{
            flexDirection: 'row', alignItems: 'center',
            gap: compact ? 6 : SPACE.sm, marginTop: SPACE.sm,
          }}>
            <StripArrow testID="course-week-prev" icon="chevron_left" label="Previous week"
              disabled={weekOffset <= -WEEK_LIMIT}
              onPress={() => {
                setWeekOffset(o => Math.max(o - 1, -WEEK_LIMIT)); setSelectedDay(null);
              }} />

            <View style={{ flex: 1, minWidth: 0 }}>
              {/* A FAILED WEEK STILL DRAWS ITS SEVEN DAYS. The strip used to
                  vanish on an error, which reads as "this course has no week"
                  rather than "the week could not be fetched" -- and it took
                  the dates with it, so there was nothing left to orient the
                  message below against. The cells stay; they wear Load failed,
                  which is its own word, its own icon and an ink unlike any
                  other status here, and they offer no upload. */}
              {attendance.state === 'loading' ? (
                <Skeleton lines={2} />
              ) : (
                <View style={{ flexDirection: 'row', gap: compact ? 4 : 6 }}>
                  {days.map(d => {
                    const on = chosen?.iso === d.iso;
                    const tone = STATUS[d.key];
                    const ink = theme.isDark ? tone.fgDark : tone.fgLight;
                    // The cell hands its icon slot to the upload button, so
                    // this is "awaiting AND pressable", not "awaiting". A day
                    // awaiting a file it cannot be given yet -- a future day,
                    // or one in a week that is not this one -- falls to the
                    // other branch and keeps the cloud in the cell, with
                    // nothing to press (src/data/uploadWindow).
                    /* A DAY THE APP COULD NOT READ IS OFFERED NEITHER
                       BUTTON, and it falls out of the status key rather than
                       needing a clause here: a failed day wears `failed` and
                       a loading one wears `none`, so neither of the two tests
                       below can be true of it. That is the whole reason
                       dayStatusKey never maps those two onto a business word,
                       and src/data/dayLoad.test.ts pins the mapping. */
                    const waiting = d.key === 'awaiting' && d.canUpload;
                    /* A DAY THAT ALREADY HAS A REGISTER can still take another
                       file. A course runs several meetings on one day -- a
                       morning batch and an evening one, each with its own Meet
                       export -- and "awaiting a file" is a state the day leaves
                       the moment the FIRST one lands, so the press left with it
                       and the second export had no route in from the day it is
                       about. The register is the union of its files and no file
                       undoes another's (0044), so this adds nothing to reverse:
                       it adds the way to reach it.

                       Gated on the SAME d.canUpload, deliberately. "May this day
                       take a file" is one question with one answer, and asking
                       it twice is the defect uploadWindow was written to end. */
                    const second = d.canUpload && (d.key === 'present' || d.key === 'absent');
                    const dayWords = `${d.dow} ${d.dayNum} ${d.mon}`;
                    const box = statusSurface(ink);
                    return (
                      /* A FRAME, not a press. An awaiting day holds TWO controls
                         -- the date block, which selects the day, and the upload
                         button under it -- and they are siblings inside this
                         frame, never one inside the other: a button inside a
                         button is one control to a screen reader and a
                         coin-toss to a finger. The frame wears the card's
                         border and fill, so the two read as one card. */
                      <View key={d.iso} style={{
                        flex: 1, minWidth: 0, borderRadius: 12,
                        backgroundColor: on ? statusSurface(theme.accent).bg : theme.surface,
                        borderWidth: 1, borderColor: on ? theme.accent : theme.line,
                      }}>
                        <Pressable testID={`course-day-${d.iso}`}
                          onPress={() => setSelectedDay(d.iso)}
                          accessibilityRole="button"
                          accessibilityState={{ selected: on }}
                          // The word, not the colour. The cell shows an icon and a
                          // number, so the STATUS has to reach a screen reader
                          // some other way.
                          accessibilityLabel={`${dayWords}, ${tone.word}`}
                          style={{
                            alignItems: 'center', gap: 1,
                            paddingTop: 7, paddingBottom: waiting || second ? 5 : 7,
                            paddingHorizontal: compact ? 1 : 2,
                          }}>
                          <Text style={{ fontSize: 8.5, fontWeight: '800', color: on ? theme.accentInk : theme.dim }}>
                            {d.mon}
                          </Text>
                          <Text style={{
                            fontSize: 15, fontWeight: '800', fontVariant: ['tabular-nums'],
                            color: on ? theme.fgStrong : theme.fg,
                          }}>{d.dayNum}</Text>
                          <Text style={{ fontSize: 8.5, fontWeight: '700', color: on ? theme.accentInk : theme.dim }}>
                            {d.dow}
                          </Text>
                          {/* An uploaded day shows what it recorded, a day the
                              course does not run shows its dash. The awaiting
                              day hands this slot to the button below instead. */}
                          {waiting ? null : <Icon name={tone.icon} size={13} color={ink} />}
                        </Pressable>

                        {/* ---------------------------------- upload, ON THE DAY
                            Third round on this surface. The button used to live
                            on a card under the strip, wrapped in a sentence, and
                            went with the card when the requester called the
                            pair "a dialog in the way". The button and the message
                            were two things; only the message was the complaint.
                            So the button is back on the day it is about -- only a
                            day AWAITING a file has one, and only in the week the
                            file could exist for: the current week, as far as
                            today. That is the window fetchPendingSessions itself
                            queries, so a button is never offered for a session
                            the upload screen would then say is not waiting
                            (requests/2026-09-07-awaiting-upload-current-week-only.md).
                            It opens the upload
                            with that date, which is what lets the import ASK when
                            the file turns out to be from another day (0024). The
                            undated Upload Session in the course bar stays.

                            The word is the status word the legend already uses,
                            read from STATUS and never retyped. Under 768pt the
                            seven cards leave each about 33pt, narrower than the
                            word at any legible size, so a phone gets the cloud
                            alone on the same press -- the word is in the legend
                            one line up, as it is for the other three icons. */}
                        {waiting ? (
                          <Pressable testID={`course-day-upload-${d.iso}`}
                            onPress={() => router.push({
                              pathname: '/upload', params: { courseId: course.id, date: d.iso },
                            })}
                            accessibilityRole="button"
                            accessibilityLabel={`Upload a session for ${dayWords}`}
                            style={({ pressed }) => ({
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              gap: 4, minHeight: compact ? 26 : 24,
                              marginHorizontal: compact ? 3 : 5, marginBottom: compact ? 3 : 5,
                              paddingHorizontal: compact ? 0 : 5, paddingVertical: 2,
                              borderRadius: RADIUS.sm,
                              backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
                              opacity: pressed ? 0.7 : 1,
                            })}>
                            <Icon name={tone.icon} size={13} color={ink} />
                            {compact ? null : (
                              <Text numberOfLines={2} style={{
                                flexShrink: 1, fontSize: 9.5, fontWeight: '800', lineHeight: 12,
                                color: ink, textAlign: 'center',
                              }}>{tone.word}</Text>
                            )}
                          </Pressable>
                        ) : null}

                        {/* ------------------------------ another file, ON THE DAY
                            The same press for the day that is no longer waiting.
                            It carries no status word: the word belongs to the
                            tick above it, which still says what the day
                            recorded, and this says what can be done next. Quiet
                            on purpose -- an ordinary uploaded day wants its tick
                            read first, not a second call to action.

                            It keeps the date, which is the whole point of a
                            press that lives on a day: the upload screen compares
                            the file's own "Created on" against it and ASKS when
                            the two disagree (0024). The undated Upload Session in
                            the course bar cannot. */}
                        {second ? (
                          <Pressable testID={`course-day-add-${d.iso}`}
                            onPress={() => router.push({
                              pathname: '/upload', params: { courseId: course.id, date: d.iso },
                            })}
                            accessibilityRole="button"
                            accessibilityLabel={`Upload another file for ${dayWords}`}
                            style={({ pressed }) => ({
                              flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
                              gap: 4, minHeight: compact ? 26 : 24,
                              marginHorizontal: compact ? 3 : 5, marginBottom: compact ? 3 : 5,
                              paddingHorizontal: compact ? 0 : 5, paddingVertical: 2,
                              borderRadius: RADIUS.sm,
                              backgroundColor: theme.surface2,
                              borderWidth: 1, borderColor: theme.lineStrong,
                              opacity: pressed ? 0.7 : 1,
                            })}>
                            <Icon name="add" size={13} color={theme.accentInk} />
                            {/* Under 768pt a card is about 33pt wide, narrower
                                than any legible word, so the phone gets the sign
                                alone -- the same trade the awaiting button makes
                                one branch up. The spoken label above is what
                                carries the meaning either way. */}
                            {compact ? null : (
                              <Text numberOfLines={2} style={{
                                flexShrink: 1, fontSize: 9.5, fontWeight: '800', lineHeight: 12,
                                color: theme.fg, textAlign: 'center',
                              }}>Upload again</Text>
                            )}
                          </Pressable>
                        ) : null}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <StripArrow testID="course-week-next" icon="chevron_right" label="Next week"
              disabled={weekOffset >= WEEK_LIMIT}
              onPress={() => {
                setWeekOffset(o => Math.min(o + 1, WEEK_LIMIT)); setSelectedDay(null);
              }} />
          </View>

          {/* A week that could not be loaded is stated under the strip
              rather than in place of it: the arrows still work, so stepping
              off the broken week is one tap and not a reload.

              THE WHOLE BANNER IS THE BUTTON. The cells above are 33pt wide on
              a phone -- there is no room in one for a sentence, and a retry
              hidden behind a second tap on a day is a retry nobody finds. So
              the strip carries the state and this carries the action, in one
              target the width of the screen.

              The technical reason stays, underneath and quieter: "Couldn't
              load attendance" is what a person needs, and the timeout or the
              PostgREST message is what the next person debugging it needs. */}
          {attendance.state === 'error' ? (
            <Pressable testID="course-week-retry" onPress={attendance.retry}
              accessibilityRole="button"
              accessibilityLabel={`${ATTENDANCE_LOAD_FAILED} ${attendance.error ?? ''}`.trim()}
              style={({ pressed }) => ({
                marginTop: SPACE.md, padding: SPACE.md, borderRadius: RADIUS.lg,
                borderWidth: 1, borderColor: statusSurface(failedInk).border,
                backgroundColor: statusSurface(failedInk).bg,
                flexDirection: 'row', alignItems: 'flex-start', gap: SPACE.sm,
                minHeight: TAP_MIN, opacity: pressed ? 0.7 : 1,
              })}>
              <Icon name={STATUS.failed.icon} size={18} color={failedInk} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={{ fontSize: 14, fontWeight: '800', color: failedInk }}>
                  {ATTENDANCE_LOAD_FAILED}
                </Text>
                <Text style={{ fontSize: 12, color: theme.muted, marginTop: 2, lineHeight: 17 }}>
                  {attendance.error ?? 'Nothing has been changed.'}
                </Text>
              </View>
            </Pressable>
          ) : null}

          {/* THE DAY PANEL IS GONE. Tapping a day used to open a card under
              the strip -- the status in words, a sentence about it, and an
              Upload session button for that date. The requester asked for it
              to go: the course header already carries Upload Session, and a
              second one under the strip, wrapped in a message, read as a
              dialog the screen had put in her way. The strip itself is
              untouched: every cell still speaks its date and status, and the
              tapped day still holds its highlight. The upload still takes a
              date, from the file itself (0024). */}

          {/* ----------------------------------------------------- members
              The heading carries the count; the search box is the row UNDER
              it, full width at every size. It used to share the heading row
              on a desktop, at the far right, where the requester's screenshot
              cut it off -- so it is under the heading now, where it was asked
              for. Name or address, because those are the two things written
              on a card.

              THE PINNED ADD MEMBER BAR IS GONE. It was a full-width button in
              a sticky child of its own, pinned because the roster is the long
              part of this screen and the way to add somebody scrolled off the
              top after four members. The action is now in the course header
              with the other two, which is above the fold at every width and
              needs no pinning to stay there -- so the sticky child, and the
              61pt band it cost every scroll position, both go. Nothing was
              removed: it is the same route, the same params and the same
              testID.

              Bulk Import is still not here, on the earlier request that took
              it off this heading. It remains on the Attendance tab. */}
          <View style={{
            gap: SPACE.sm, marginTop: SPACE.xl,
            // the middle link of the chain described at the top of this
            // ScrollView -- without it the Show panel is lifted inside a
            // block that is not itself lifted, and the cards paint over it
            zIndex: showOpen ? 40 : 0,
          }}>
            <View style={{
              minWidth: 0,
              flexDirection: 'row', alignItems: 'baseline', gap: SPACE.sm,
            }}>
              <Label>{`Members (${shown.length})`}</Label>
              <Text numberOfLines={1} style={{
                flex: 1, minWidth: 0, fontSize: 11.5, color: theme.muted,
                fontVariant: ['tabular-nums'],
              }}>{memberSplit}</Text>
            </View>

            <View style={{
              flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
              height: 42, borderRadius: RADIUS.md, backgroundColor: theme.surface,
              borderWidth: 1, borderColor: searching ? theme.accent : theme.lineStrong,
              paddingHorizontal: 12,
            }}>
              <Icon name="search" size={18} color={theme.muted} />
              <TextInput ref={search} testID="course-member-search"
                value={query} onChangeText={setQuery}
                placeholder="Search by name or email"
                placeholderTextColor={theme.muted}
                accessibilityLabel="Search the members of this course"
                onFocus={() => setSearching(true)} onBlur={() => setSearching(false)}
                selectionColor={theme.accent}
                style={{ flex: 1, minWidth: 0, color: theme.fgStrong, fontSize: 13.5, fontWeight: '600',
                  outlineWidth: 0, outlineStyle: 'solid' }} />
            </View>

            {/* ------------------------------------------ the reading filter
                "add filter to choose present, absent, yet to mark & no
                emails" -- the four words already printed on the cards below,
                and ANY NUMBER of them at once, which is the second half of
                the ask: "like in overview drop down multi selection is
                possible". So it is the OVERVIEW's control rather than the
                Attendance tab's: checkboxes, headed by the All members row
                that clears them, ticking as many as you like. Several ticks
                are an OR, and the line under the field says so in words.

                UNDER THE SEARCH BOX, not beside it: at 360pt a field and a
                search box on one row leave neither enough to read, and this
                is the same stack the branch filter above uses.

                IT IS A POP-UP, drawn OVER the roster and never pushing it
                down -- the requester, on being shown the pushing version:
                "on click of filter open it on top of it as pop up does".

                That is what the panel does by default, and it is why the
                options were invisible to begin with: a floating panel is
                placed by z-order, and this row is nested two containers deep
                inside the scroller while the member cards are a LATER SIBLING
                of those containers. A later sibling wins by default, so the
                cards painted over the options however high the z-index went
                HERE. Lifting the row alone cannot settle it; the lift has to
                run the whole chain, which is what the two containers above
                now carry while a panel is open. With that in place the panel
                floats, the roster stays exactly where it was, and the counts
                the filter is being chosen against stay on screen (ADR-035).

                It stays OPEN on a tick, because a multi-choice panel that shut
                on the first one could never take a second (ADR-035); the way
                out is the field again, or a press beside it. Each row carries
                the number it would leave, counted off the very list below. */}
            <DropdownRow open={showOpen}
              style={{ width: '100%', maxWidth: FILTER_WIDTH }}
              dismiss={{ onPress: () => setShowOpen(false), testID: 'course-show-dismiss' }}>
              <DropdownField label="Show" value={showValue} open={showOpen}
                testID="course-show-field"
                highlight={rosterShow.length > 0}
                onPress={() => { setBranchOpen(false); setShowOpen(o => !o); }} />
              {showOpen ? (
                <DropdownPanel>
                  <DropdownCheckList testID="course-show"
                    allLabel={ALL_MEMBERS}
                    options={ROSTER_FILTER_OPTIONS.map(f => ({
                      label: f.label,
                      // null is "the week has not arrived", and it is drawn as
                      // no number at all -- a 0 there would claim nobody is
                      // present when nothing has been counted yet.
                      meta: showCounts[f.key] === null ? undefined
                        : `${showCounts[f.key]}`,
                    }))}
                    selected={rosterShow}
                    onToggle={l => setRosterShow(v => toggle(v, l))}
                    onAll={() => setRosterShow([])} />
                </DropdownPanel>
              ) : null}
            </DropdownRow>

            {/* WHICH DAY the chips below are about, said once for the whole
                roster rather than on every card. The strip above highlights
                it, but the strip scrolls away and the chips do not -- and a
                register where you cannot tell which day you are marking is
                worse than one with no chips at all. */}
            {chosen ? (
              <View style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm, minHeight: 30,
              }}>
                <Text testID="course-attendance-day" style={{
                  flex: 1, minWidth: 0, fontSize: 11.5, color: theme.muted,
                }}>{`Attendance for ${dayLabel(chosen.iso)}`}</Text>

                {/* ------------------------------------------------- select mode
                    ON THIS LINE, not on the Members heading, because the
                    requester asked for it "just above member cards not above
                    search bar" -- and she is right about which row that is:
                    the heading sits above a search box and two notes, so a
                    control there is three elements away from the ticks it
                    turns on.

                    The way in and the way out are the SAME control, so there
                    is never a selection with no visible way to leave it.
                    Leaving clears the ticks: a selection that survived its own
                    mode would be an invisible one, and the next reset would
                    open with members ticked that nobody can see they ticked. */}
                {shown.length > 0 ? (
                  <Pressable testID="course-select-toggle"
                    onPress={() => {
                      setSelectMode(m => !m);
                      if (selectMode) setSelected(new Set());
                    }}
                    accessibilityRole="button"
                    accessibilityState={{ selected: selectMode }}
                    accessibilityLabel={selectMode
                      ? 'Leave selection mode' : 'Select members'}
                    style={({ pressed }) => ({
                      flexDirection: 'row', alignItems: 'center', gap: 5,
                      minHeight: 30, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                      backgroundColor: selectMode
                        ? statusSurface(theme.accent).bg : theme.surface,
                      borderWidth: 1,
                      borderColor: selectMode ? theme.accent : theme.lineStrong,
                      opacity: pressed ? 0.7 : 1,
                    })}>
                    <Icon name={selectMode ? 'close' : 'checklist'} size={14}
                      color={selectMode ? theme.accentInk : theme.muted} />
                    {/* the WORD, never the colour alone (guardrail 3) */}
                    <Text style={{
                      fontSize: 11, fontWeight: '800',
                      color: selectMode ? theme.accentInk : theme.fg,
                    }}>{selectMode ? 'Done' : 'Select'}</Text>
                  </Pressable>
                ) : null}

                {/* ------------------------------------------- reset the day
                    ALWAYS SHOWN, on every day the roster is drawn for --
                    requester, 08-Sep-2026, on finding it absent from a day
                    awaiting its file: *"always show reset"*.

                    It was drawn only where `dayMarks > 0`, on the rule that a
                    day with nothing on it has nothing to undo. That rule is
                    still TRUE and is now carried by the button's STATE rather
                    than by its absence: a control that vanishes teaches
                    nobody where it went, and the day it is missing from is
                    exactly the day somebody goes looking for it. Empty day,
                    the button is there and visibly dead, and the reason is on
                    it for a screen reader.

                    It sits on this line rather than on the day card because
                    that is where the requester put it, and because the line
                    already names the day it is about: a control and its
                    subject, one above the other, with nothing between them to
                    misread. */}
                {(() => {
                  /* GATED ON THE SELECTION, which is the requester's whole
                     instruction: "The reset of attendance should happend only
                     when user selects the members using select option and when
                     they select members and click on reset only those members
                     attendance should be reset."

                     So an empty selection is a dead button, not a whole-day
                     reset. Nothing is lost: Select all is one tap, and the
                     day-wide reset 0056 was built for is still reachable that
                     way -- but it now has to be ASKED FOR rather than being
                     what happens when nobody chose anything.

                     Still drawn rather than hidden, and the reason is the one
                     already on this control: a button that vanishes tells
                     nobody where it went, and the state it vanishes in is
                     exactly the state somebody goes looking for it in. The
                     label says which of the two reasons it is dead. */
                  const noMarks = dayMarks === 0;
                  const noneTicked = selected.size === 0;
                  const nothingToReset = noMarks || noneTicked;
                  const ink = nothingToReset ? theme.dim : dangerInk;

                  /* WHY IT IS DEAD, WRITTEN ONCE AND SAID TWICE.
                     `null` when the button works, which is also how the
                     tooltip knows it has nothing to explain.

                     It reaches a sighted person as the bubble and a screen
                     reader as this control's own label, and those two must be
                     the same sentence: two wordings of one reason is how the
                     screen and the reader come to disagree about why somebody
                     cannot do what they are trying to do.

                     The first branch is the requester's, 11-Sep-2026: *"add a
                     tooltip as this will be enable only after first upload of
                     attendance file"*. It names the ACT that would change the
                     answer -- uploading a file for this day -- rather than
                     describing the state, because "no attendance is recorded"
                     told somebody what was wrong and not what to do. */
                  const why = noMarks
                    ? `Reset becomes available once an attendance file has been uploaded for ${dayInWords(chosen.iso)}`
                    : noneTicked
                      ? `Nothing to reset for ${dayInWords(chosen.iso)} — tick the members whose marks to clear first`
                      : null;
                  const label = why
                    ?? `Reset the marks of ${selected.size} selected ${selected.size === 1 ? 'member' : 'members'} for ${dayInWords(chosen.iso)}`;
                  return (
                    /* The tooltip WRAPS the button rather than sitting on it.
                       A disabled Pressable on this platform receives no
                       pointer events, no hover and no focus, so nothing hung
                       on the button itself could ever be triggered -- see
                       src/components/Tooltip.tsx and KL-006. */
                    <Tooltip text={why} testID="course-day-reset-why">
                    <Pressable testID="course-day-reset"
                      onPress={() => void openReset()}
                      disabled={nothingToReset}
                      accessibilityRole="button"
                      accessibilityState={{ disabled: nothingToReset }}
                      accessibilityLabel={label}
                      style={({ pressed }) => ({
                        flexDirection: 'row', alignItems: 'center', gap: 5,
                        minHeight: 30, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                        // A dead control must not wear the danger colour: red
                        // says "this does something you cannot take back", and
                        // on an empty day it does nothing at all.
                        backgroundColor: nothingToReset ? theme.surface : statusSurface(dangerInk).bg,
                        borderWidth: 1,
                        borderColor: nothingToReset ? theme.line : statusSurface(dangerInk).border,
                        opacity: pressed && !nothingToReset ? 0.7 : 1,
                      })}>
                      <Icon name="restart_alt" size={14} color={ink} />
                      {/* the WORD, never the colour alone (guardrail 3) */}
                      <Text style={{ fontSize: 11, fontWeight: '800', color: ink }}>
                        Reset
                      </Text>
                    </Pressable>
                    </Tooltip>
                  );
                })()}
              </View>
            ) : null}

            {/* A COUNT THAT DROPS ROWS SILENTLY IS THE SAME DEFECT, INVERTED.
                "Members (7)" on Monday and "Members (8)" on Wednesday with
                nothing on screen to explain it reads as a member who has
                disappeared. So the day-scoped roster states what it is
                leaving out, and that they are still on the course. */}
            {joinedLater ? (
              <Text testID="course-joined-later" style={{
                fontSize: 11.5, color: theme.muted,
              }}>{joinedLater}</Text>
            ) : null}

            {/* The same sentence for the other end of the window. Its own
                line, not folded into the one above: a reader who sees a
                count drop needs to know WHICH fact took the row out, and
                "joined later" and "was inactive" are opposite answers. */}
            {leftEarlier ? (
              <Text testID="course-left-earlier" style={{
                fontSize: 11.5, color: theme.muted,
              }}>{leftEarlier}</Text>
            ) : null}

            {/* WHAT THE FILTER IS LEAVING OUT, for the same reason the two
                notes above exist: a count that changes with nothing on
                screen to explain it reads as members who have disappeared.
                The field above says which filter is on; this line says what
                it cost and how to undo it.

                And where the week has not arrived, the opposite admission:
                the filter is narrowing NOTHING yet, so the roster is wider
                than the field claims and the line says so rather than
                letting the extra names read as matches. */}
            {showPending ? (
              <Text testID="course-show-note" style={{ fontSize: 11.5, color: theme.muted }}>
                {attendance.state === 'error'
                  ? `This week's register could not be loaded, so the roster is not narrowed to ${showPhrase}. Every member of the day is listed.`
                  : `This week's register is still loading, so the roster is not narrowed to ${showPhrase} yet.`}
              </Text>
            ) : rosterShow.length > 0 && shown.length < searched.length ? (
              <Text testID="course-show-note" style={{ fontSize: 11.5, color: theme.muted }}>
                {`Showing ${shown.length} of ${searched.length} — ${showPhrase} only. The rest are on this roster and unchanged; All members brings them back.`}
              </Text>
            ) : null}

            {/* What is selected, and the bulk action over it. LAST before the
                cards, so the count and the ticks it counts are adjacent --
                the two notes above are rare, and putting the bar over them
                would separate it from the rows it describes. Its own row
                rather than a badge on the toggle: "3 of 5 selected" has to be
                readable without hunting, and Select all is what makes a long
                roster usable at all. */}
            {selectMode ? (
              <View testID="course-selection-bar" style={{
                flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                paddingHorizontal: 11, paddingVertical: 8, borderRadius: RADIUS.md,
                backgroundColor: statusSurface(theme.accent).bg,
                borderWidth: 1, borderColor: statusSurface(theme.accent).border,
              }}>
                <Text style={{
                  flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: '700',
                  color: theme.fg, fontVariant: ['tabular-nums'],
                }}>
                  {selected.size === 0
                    ? 'Nobody selected — tick the members whose marks to reset'
                    : `${selected.size} of ${shown.length} selected`}
                </Text>
                {/* BULK DELETE MOVED to the No email section's own bar
                    (09-Sep-2026). It was here, on the roster-wide selection
                    bar, where it read as a delete over "3 of 5 selected" while
                    only ever acting on the addressless ones -- a scoping
                    nobody could see. The requester asked for it beside the
                    list it acts on, and that is also where it stops being
                    surprising. */}
                <Pressable testID="course-select-all"
                  onPress={() => setSelected(selected.size === shown.length
                    ? new Set()
                    : new Set(shown.map(m => m.id)))}
                  accessibilityRole="button"
                  accessibilityLabel={selected.size === shown.length
                    ? 'Deselect every member' : 'Select every member'}
                  style={({ pressed }) => ({
                    minHeight: 28, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                    justifyContent: 'center', backgroundColor: theme.surface,
                    borderWidth: 1, borderColor: theme.lineStrong,
                    opacity: pressed ? 0.7 : 1,
                  })}>
                  <Text style={{ fontSize: 11, fontWeight: '800', color: theme.fg }}>
                    {selected.size === shown.length ? 'Deselect all' : 'Select all'}
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>

        <View style={{ paddingHorizontal: SPACE.lg, paddingBottom: SPACE.lg }}>
          {followUp.state === 'loading' ? (
            <View style={{ marginTop: SPACE.md }}><Skeleton lines={3} /></View>
          ) : followUp.state === 'error' ? (
            <View style={{ marginTop: SPACE.md }}>
              <ErrorState onRetry={followUp.retry}
                message={followUp.error ?? 'The members could not be loaded. Nothing has been changed.'} />
            </View>
          ) : scoped.length === 0 ? (
            <View style={{ marginTop: SPACE.md }}>
              <EmptyState
                title={branch === ALL_BRANCHES ? 'Nobody is enrolled yet' : `Nobody is enrolled at ${branch}`}
                body="Adding a member names the OFFERING, the course at one branch, so she is expected at the days that offering runs." />
            </View>
          ) : onDay.length === 0 ? (
            /* ENROLLED, but not yet on the day being shown -- every member of
               this course joined after it. Distinct from "nobody is enrolled",
               which is a fact about the course, and it says which day it is
               about so the strip above is the way out of it. */
            <View style={{ marginTop: SPACE.md }}>
              <EmptyState
                title={`Nobody had joined by ${chosen ? dayLabel(chosen.iso) : 'that day'}`}
                body={`All ${scoped.length} ${scoped.length === 1 ? 'member' : 'members'} of this course joined later, so there is no attendance to show for that day. Pick a later day on the strip above.`} />
            </View>
          ) : searched.length === 0 ? (
            /* SEARCHED away, not absent. The count it offers to bring back is
               the day's roster, so the two states can never be confused. */
            <View style={{ marginTop: SPACE.md }}>
              <EmptyState
                title="No member matches that"
                body={`Nothing on this roster matches “${query.trim()}”. Clearing the search brings all ${onDay.length} back.`}
                action="Clear search" onAction={() => setQuery('')} />
            </View>
          ) : shown.length === 0 ? (
            /* FILTERED away -- a third state, and it must not borrow either of
               the other two's words. The roster has members, the search kept
               them, and the reading picked above is true of none of them. It
               says which reading and which day, and the way out is the filter
               itself rather than the search. */
            <View style={{ marginTop: SPACE.md }}>
              <EmptyState
                title={(showKeys.length === 1 ? FILTER_EMPTY[showKeys[0]] : null)
                  ?? 'Nobody matches those filters'}
                body={showKeys.length === 1 && showKeys[0] === 'no-email'
                  ? `Every member on this roster has an address, so every one of them is counted for follow-up.${query.trim() ? ' That is of the members matching your search.' : ''}`
                  : `No member on this roster reads ${showPhrase} for ${chosen ? dayLabel(chosen.iso) : 'that day'}.${query.trim() ? ' That is of the members matching your search.' : ''} All members brings all ${searched.length} back.`}
                action="Show all members" onAction={() => setRosterShow([])} />
            </View>
          ) : (
            <>
              <View style={{ gap: SPACE.sm, marginTop: SPACE.md }}>
                {withEmail.map((m, i) => (
                  <MemberCard key={m.id} member={m} tint={AVATAR_TINTS[(i + 3) % AVATAR_TINTS.length]}
                    weekLabel={week.label} noEmail={false} allMembers={members}
                    dayIso={chosen?.iso ?? null} weekdays={scopeWeekdays}
                    rows={attendance.data ?? []} attendanceState={attendance.state}
                    selectable={selectMode} selected={selected.has(m.id)}
                    onToggleSelect={() => toggleSelected(m.id)} />
                ))}
              </View>

              {/* C-76: a member with no address is still listed and still
                  counted. She is separated because the follow-up rule cannot
                  reach her, which is a fact about the SEND and not about her
                  attendance -- and the note says exactly that. */}
              {withoutEmail.length > 0 ? (
                <View style={{ marginTop: SPACE.xl }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                    <Icon name="mail_off" size={16} color={dangerInk} />
                    <Label style={{ flex: 1, color: dangerInk }}>No email</Label>
                    <Text style={{ fontSize: 11.5, color: theme.muted, fontVariant: ['tabular-nums'] }}>
                      {`${withoutEmail.length} of ${shown.length}`}
                    </Text>
                  </View>
                  <View style={{
                    marginTop: 9, padding: 13, borderRadius: RADIUS.md,
                    backgroundColor: statusSurface(dangerInk).bg,
                    borderWidth: 1, borderColor: statusSurface(dangerInk).border,
                  }}>
                    <Muted style={{ color: theme.fg }}>
                      Their attendance is recorded as usual, but they are never counted for
                      follow-up: there is no address to send to. Add an email and they join the rule.
                    </Muted>
                  </View>
                  {/* SELECT AND DELETE, ON THIS SECTION AND ABOVE ITS CARDS.
                      The requester asked for it here by name -- "for no email
                      member give select and deselect right above that section
                      so that they can select in bulk".

                      It is drawn WITHOUT the header's Select toggle having
                      been pressed, which is the part that had actually gone
                      wrong: selection existed, but behind a control at the top
                      of the screen, so from down here the feature simply was
                      not there. A section that offers a bulk delete has to
                      offer the ticking that feeds it, in the same place.

                      Only these members are ever counted or deleted here --
                      `withoutEmail`, never the whole roster. A member the
                      academy can still email is not on this list and cannot be
                      swept up by it. */}
                  <View testID="course-noemail-bar" style={{
                    flexDirection: 'row', alignItems: 'center', gap: SPACE.sm,
                    marginTop: 10, paddingHorizontal: 11, paddingVertical: 8,
                    borderRadius: RADIUS.md,
                    backgroundColor: theme.surface2,
                    borderWidth: 1, borderColor: theme.line,
                  }}>
                    <Text style={{
                      flex: 1, minWidth: 0, fontSize: 11.5, fontWeight: '700',
                      color: theme.fg, fontVariant: ['tabular-nums'],
                    }}>
                      {noEmailSelected.length === 0
                        ? 'Tick the ones to delete'
                        : `${noEmailSelected.length} of ${withoutEmail.length} selected`}
                    </Text>

                    <Pressable testID="course-noemail-select-all"
                      onPress={() => setSelected(prev => {
                        const next = new Set(prev);
                        if (noEmailSelected.length === withoutEmail.length) {
                          for (const m of withoutEmail) next.delete(m.id);
                        } else {
                          for (const m of withoutEmail) next.add(m.id);
                        }
                        return next;
                      })}
                      accessibilityRole="button"
                      accessibilityLabel={noEmailSelected.length === withoutEmail.length
                        ? 'Deselect every member with no email'
                        : 'Select every member with no email'}
                      style={({ pressed }) => ({
                        minHeight: 28, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                        justifyContent: 'center', backgroundColor: theme.surface,
                        borderWidth: 1, borderColor: theme.lineStrong,
                        opacity: pressed ? 0.7 : 1,
                      })}>
                      <Text style={{ fontSize: 11, fontWeight: '800', color: theme.fg }}>
                        {noEmailSelected.length === withoutEmail.length ? 'Deselect all' : 'Select all'}
                      </Text>
                    </Pressable>

                    {/* Drawn only once something is ticked: a delete button
                        over an empty selection is a control that lies. */}
                    {noEmailSelected.length > 0 ? (
                      <Pressable testID="course-noemail-delete"
                        onPress={() => setConfirmBulkDelete(true)}
                        accessibilityRole="button"
                        accessibilityLabel={`Delete ${noEmailSelected.length} selected members with no email`}
                        style={({ pressed }) => ({
                          minHeight: 28, paddingHorizontal: 10, borderRadius: RADIUS.sm,
                          flexDirection: 'row', alignItems: 'center', gap: 5,
                          justifyContent: 'center',
                          backgroundColor: statusSurface(dangerInk).bg,
                          borderWidth: 1, borderColor: statusSurface(dangerInk).border,
                          opacity: pressed ? 0.7 : 1,
                        })}>
                        <Icon name="delete" size={13} color={dangerInk} />
                        {/* the WORD, never the colour alone (guardrail 3) */}
                        <Text style={{ fontSize: 11, fontWeight: '800', color: dangerInk }}>
                          {`Delete ${noEmailSelected.length}`}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>

                  <View style={{ gap: SPACE.sm, marginTop: 10 }}>
                    {withoutEmail.map((m, i) => (
                      <MemberCard key={m.id} member={m} tint={AVATAR_TINTS[i % AVATAR_TINTS.length]}
                        weekLabel={week.label} noEmail allMembers={members}
                        dayIso={chosen?.iso ?? null} weekdays={scopeWeekdays}
                        rows={attendance.data ?? []} attendanceState={attendance.state}
                        /* Always tickable, toggle or no toggle: the bar above
                           offers a delete over these cards, so the cards have
                           to be selectable from here. */
                        selectable selected={selected.has(m.id)}
                        onToggleSelect={() => toggleSelected(m.id)} />
                    ))}
                  </View>
                </View>
              ) : null}
            </>
          )}

          {/* THE "ATTENDANCE" ACTION ROWS ARE GONE, on request.
              Send Communication was the same destination as the button in
              this screen's own header, three scroll-lengths apart; Upload
              Attendance is on the day strip above, where the awaiting day
              actually is and where it arrives already scoped to that session.
              Two rows out of three were a second copy of a control this
              screen already had.

              WEEKLY REVIEW HAD NO OTHER ROUTE and now has none: /weekly is
              reachable only by URL. Recorded rather than quietly accepted --
              see TECH_DEBT TD-014, which this joins. */}
        </View>
      </ScrollView>

      {/* Outside the ScrollView, like every other dialog on this screen: a
          modal nested in a scroller inherits its clipping on web. */}
      <ResetRegisterDialog
        open={resetOpen}
        onClose={() => setResetOpen(false)}
        dayWords={chosen ? dayLabel(chosen.iso) : ''}
        preview={resetPreviewData}
        loading={resetLoading}
        error={resetError}
        busy={resetBusy}
        onConfirm={() => void runReset()} />

      {/* BULK DELETE'S OWN CONFIRMATION, which is the half the requester
          asked for by name. It is a separate dialog from the reset because it
          is a separate act: the reset un-marks and can be re-uploaded, this
          removes people and cannot be undone at all. deleteWarning names who
          goes and what else goes with them (0051 is a hard delete), and the
          emphasis sits on the answer that keeps them. */}
      <ConfirmDialog
        open={confirmBulkDelete}
        onClose={() => setConfirmBulkDelete(false)}
        title={selectedNoEmail.length === 1
          ? `Delete ${selectedNoEmail[0].name}?`
          : `Delete ${selectedNoEmail.length} members?`}
        body={deleteWarning(selectedNoEmail.map(m => ({
          member_id: m.id, name: m.name, has_email: false, other_days: 0,
        }))) ?? ''}
        emphasis="cancel"
        cancelLabel="No"
        confirmLabel={bulkDeleting ? 'Deleting…' : 'Yes'}
        onConfirm={() => { void runBulkDelete(); }} />
    </>
  );
}

/**
 * One of the three primary course actions, on the deep header.
 *
 * Same height, same radius, same icon-and-word shape for all three; only the
 * fill separates the primary from the two secondaries, and the WORD is what
 * says which action it is. Full width when the parent stacks them (a phone),
 * natural width when it lines them up.
 */
function HeaderAction({ testID, icon, label, onPress, primary, accessibilityLabel }: {
  testID: string; icon: string; label: string; onPress: () => void;
  primary?: boolean; accessibilityLabel: string;
}) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        height: 42, borderRadius: RADIUS.md, paddingHorizontal: 13,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
        backgroundColor: primary ? theme.accent : theme.deepControl,
        borderWidth: 1, borderColor: primary ? theme.accent : theme.deepControlLine,
        opacity: pressed ? 0.8 : 1,
      })}>
      <Icon name={icon} size={17} color={theme.onAccent} />
      <Text numberOfLines={1} style={{ fontSize: 12.5, fontWeight: '800', color: theme.onAccent }}>
        {label}
      </Text>
    </Pressable>
  );
}

/**
 * A DATE control, and deliberately not the page back button.
 *
 * 30pt square on the app surface with a 9pt radius, inside the strip it moves.
 * The back button is 34pt, filled, rounded to RADIUS.md and up on the deep
 * header beside the course name. hitSlop takes this to the 44pt minimum
 * without taking the drawn control back up to the size of the one it must not
 * be mistaken for.
 */
function StripArrow({ testID, icon, label, disabled, onPress }: {
  testID: string; icon: string; label: string; disabled: boolean; onPress: () => void;
}) {
  const { theme } = useTheme();
  return (
    <Pressable testID={testID} onPress={onPress} disabled={disabled}
      accessibilityRole="button" accessibilityLabel={label}
      accessibilityState={{ disabled }} hitSlop={7}
      style={({ pressed }) => ({
        width: 30, height: 30, borderRadius: 9,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: theme.surface, borderWidth: 1, borderColor: theme.lineStrong,
        opacity: pressed ? 0.7 : disabled ? 0.4 : 1,
      })}>
      <Icon name={icon} size={17} color={theme.fg} />
    </Pressable>
  );
}

/**
 * What the icon on a date card means, in one wrapping row.
 *
 * The four states a WEEK of this course can be in -- and the four the strip
 * above draws, exactly. Every icon on a date card is named here, which is
 * what a legend is for.
 */
function DayLegend() {
  const { theme } = useTheme();
  const keys: StatusKey[] = ['present', 'absent', 'awaiting', 'none'];
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: SPACE.md }}>
      {keys.map(k => {
        const tone = STATUS[k];
        const ink = theme.isDark ? tone.fgDark : tone.fgLight;
        return (
          <View key={k} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Icon name={tone.icon} size={13} color={ink} />
            <Text style={{ fontSize: 10.5, fontWeight: '700', color: theme.muted }}>{tone.word}</Text>
          </View>
        );
      })}
    </View>
  );
}

/**
 * One member on the course roster. Extracted because the with-email and
 * no-email sections draw the SAME card with a different reason attached, and
 * two copies would be two places for the miss counts to drift.
 */
function MemberCard({ member, tint, weekLabel, noEmail, allMembers,
  dayIso, weekdays, rows, attendanceState,
  selectable, selected, onToggleSelect }:
  { member: Member; tint: string; weekLabel: string; noEmail: boolean;
    /**
     * The roster is in selection mode, so this card carries a tick.
     *
     * IT IS NOT AN ATTENDANCE CONTROL, and that distinction is the whole
     * reason it may exist here at all. ADR-030 made the three readings on
     * this card a READING -- "nothing on the row is tappable" -- and that is
     * untouched: the chips below are still inert, and this tick says only
     * "include her in the reset's delete list". The guard in
     * memberCardAttendanceReadOnly asserts on the attendance block, which
     * this sits well outside of.
     */
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
    /** the register this member's display name can be linked INTO -- only a
     *  no-email card offers it, but the prop is passed by both call sites so
     *  the two cards stay one component */
    allMembers: Member[];
    /** the day the strip has selected -- what the three chips are about */
    dayIso: string | null;
    /** the weekdays this course runs across the branches in scope */
    weekdays: number[];
    /** the week's attendance rows, already loaded by the screen */
    rows: AttendanceRow[];
    /** so a card can say the week failed rather than guess a state from an
     *  empty list -- an unloaded week and a member nobody has marked look
     *  identical from here, and they mean opposite things */
    attendanceState: ScreenState }) {
  const { theme } = useTheme();
  const { flash } = useToast();
  const router = useRouter();

  const dangerInk = theme.isDark ? STATUS.absent.fgDark : STATUS.absent.fgLight;
  const okInk = theme.isDark ? STATUS.present.fgDark : STATUS.present.fgLight;

  const todayIso = iso(new Date());

  /**
   * ON the register, or off it -- `members.status`, not `expected === 0`.
   *
   * This pill used to read the WEEK: a member expected at nothing was drawn
   * "Inactive". That was a fact about her schedule wearing the word for a
   * fact about her membership, and nobody could change it, because nothing
   * anywhere wrote the column it was pretending to show. Now it shows the
   * column, and tapping it sets it (0031).
   *
   * TWO READINGS, NOT ONE, since her status carries a date (0045).
   *
   *   `inactive`      -- where she stood on the day THE STRIP IS SHOWING.
   *                      This is what the pill draws, because the rest of
   *                      the card is about that day and a pill answering for
   *                      today beside chips answering for 17 August is two
   *                      different questions wearing one row.
   *   `inactiveToday` -- where she stands NOW. This is what the tap is
   *                      about: a control on a past week that flipped the
   *                      state as it was three weeks ago would undo every
   *                      change made since, which is not what anybody
   *                      pressing it means.
   *
   * They differ only for a member whose date falls between the two days, and
   * where they differ the pill says so rather than letting the reader assume
   * the word is about today -- see the label and the confirmation below.
   */
  const statusDay = dayIso ?? todayIso;
  const inactive = !isActiveOn(member, statusDay);
  const inactiveToday = !isActiveOn(member, todayIso);
  /**
   * The day she is DUE off, when it has not arrived: what "Active" leaves out.
   *
   * Read against the day the CARD is about, not against today. Read against
   * today it contradicted the pill beside it: on the 1 Oct date card a member
   * inactive from 1 Oct drew an "Inactive" pill and, underneath,
   * "Inactive from 1 October 2026" -- a line promising a departure that,
   * on the day being shown, had already happened. A departure is only
   * pending while the day on screen is before it.
   */
  const pending = pendingInactiveFrom(member, statusDay);
  /** The pill is about another day than the tap is. Said, never assumed. */
  const readingIsHistoric = inactive !== inactiveToday;
  /**
   * "was", or "will be". The strip runs Monday to Sunday, so on a Monday
   * four of its seven cells are days that have not happened -- and a member
   * whose date falls on the Wednesday of this week reads differently there
   * in the FUTURE tense, not the past one. One word, and getting it wrong is
   * a sentence claiming something already happened.
   */
  const wasOrWillBe = dayIso && dayIso > todayIso ? 'will be' : 'was';
  const statusInk = inactive ? theme.dim : okInk;
  const box = statusSurface(statusInk);
  // The threshold the canvas paints the miss line at. A READING aid, not the
  // follow-up rule: the rule lives in one place (src/data/followup) and this
  // line never decides anything.
  const heavy = member.missed >= 4 || member.streak >= 4;
  /* THE RUN, worded rather than printed bare. This line used to read
     "Missed 7–13 Sep 2026: 1 · consecutive 6" -- a weekly count and an
     all-time run, side by side, with nothing to say they were counted over
     different spans. On a course running five days a week the second number
     looked arithmetically impossible, and *consecutive* named a follow-up
     trigger the course form no longer offers (0030), directly under the
     banner stating the trigger that does. Same number, dated to the session
     that ended it; the member pop-up reads it from the same function, so the
     two cannot describe it two ways (src/data/streak.ts). */
  const run = streakReading({ streak: member.streak, lastPresent: member.lastPresent ?? null });

  // Taking somebody off the register stops the academy writing to her, so it
  // is asked for rather than toggled -- and the question says which way it is
  // going and what follows.
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [saving, setSaving] = useState(false);
  // Removing her is a DIFFERENT act from marking her inactive, and the two sit
  // side by side on this row, so each asks its own question before it writes.
  // This one cannot be undone from the app at all.
  const [confirmRemove, setConfirmRemove] = useState(false);
  /** The same preview the Members tab's card takes: since 0051 the deletion
   *  can promise nothing, so the dialog states a quantity instead. */
  const [previewState, setPreviewState] = useState<PreviewState>({ kind: 'counting' });
  const [removing, setRemoving] = useState(false);
  // "Add display name to existing member" -- open, and mid-save.
  const [linking, setLinking] = useState(false);
  const [linkingSave, setLinkingSave] = useState(false);

  /** Where she stands on the selected day -- read here, never written. */
  const day = dayIso
    ? dayAttendance({ rows, member, dayIso, weekdays, todayIso })
    : null;

  const applyStatus = async () => {
    if (saving) return;
    setConfirmStatus(false);
    setSaving(true);
    // From TODAY's reading, never the strip's: this pill is a one-tap "now"
    // control and always has been. Scheduling a departure is the Edit form's
    // date field (0045); this writes today's date, which is what the tap has
    // always meant -- "she is off the register from now on".
    const wanted: MemberStatus = inactiveToday ? 'active' : 'inactive';
    const first = member.name.split(' ')[0];
    const said = wanted === 'active' ? 'active again' : 'inactive';
    try {
      await setMemberStatus(member.id, wanted, wanted === 'active' ? null : todayIso);
      flash(dataSource === 'live'
        ? `${first} is ${said}`
        : `${first} is ${said} on this device only. The academy database is not configured.`,
        dataSource === 'live' ? 'ok' : 'warn');
    } catch (err) {
      flash(err instanceof Error ? err.message
        : 'The status could not be changed. Nothing has been saved.', 'warn');
    } finally {
      setSaving(false);
    }
  };

  /**
   * The roster's bin. The same write the Members tab's card makes -- one
   * `delete_member` (0038/0044), and the four outcomes worded in
   * src/data/memberRemoval.ts rather than a ternary in here, so this card and
   * that one say the same thing after the same result. `deleteMember` calls
   * `membersChanged()`, so this roster, the dashboard count and the follow-up
   * list all re-read from the one member source (guardrail 1) -- the card does
   * not remove itself from a second list.
   */
  /**
   * The count behind the question, asked when the dialog opens and never
   * before: a preview fetched on render would query once per member on a
   * roster for a button most people never press. The Members tab's card does
   * exactly this, and the two must not drift.
   */
  useEffect(() => {
    let cancelled = false;
    if (!confirmRemove) return;
    setPreviewState({ kind: 'counting' });
    memberDeletionPreview(member.id)
      .then(p => { if (!cancelled) setPreviewState({ kind: 'counted', preview: p }); })
      .catch(() => { if (!cancelled) setPreviewState({ kind: 'uncounted' }); });
    return () => { cancelled = true; };
  }, [confirmRemove, member.id]);

  const remove = async () => {
    if (removing) return;
    setConfirmRemove(false);
    setRemoving(true);
    try {
      const { message, tone } = removalOutcome(
        member.name, await deleteMember(member.id), dataSource);
      flash(message, tone);
    } catch (err) {
      const { message, tone } = removalFailure(err);
      flash(message, tone);
    } finally {
      setRemoving(false);
    }
  };

  return (
    <View style={{
      padding: 11, borderRadius: RADIUS.md, backgroundColor: theme.surface,
      borderWidth: 1, borderColor: noEmail ? statusSurface(dangerInk).border : theme.line,
    }}>
      {/* ONE row. The status and the Edit control sit together at its right
          hand, where the reference app puts them; Edit used to hang on a
          divided footer row of its own, three lines below the pill it belongs
          beside, costing every card 43pt of height to say one word.

          The card's own tap target is a SIBLING of those two rather than
          their parent: a pressable nested inside the card button is how "it
          opened her profile instead of editing her" happens. */}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: SPACE.sm }}>
        {/* ------------------------------------------------ the selection tick
            A SIBLING of the card's own press, never inside it -- a checkbox
            nested in a button is one control to a screen reader and a
            coin-toss to a finger, which is the rule the day strip already
            follows one screen up. */}
        {selectable ? (
          <Pressable testID={`course-member-select-${member.id}`}
            onPress={onToggleSelect}
            accessibilityRole="checkbox"
            accessibilityState={{ checked: !!selected }}
            accessibilityLabel={`Select ${member.name}`}
            hitSlop={6}
            style={({ pressed }) => ({
              width: 26, height: 26, borderRadius: 7,
              alignItems: 'center', justifyContent: 'center',
              backgroundColor: selected ? theme.accent : theme.surface2,
              borderWidth: selected ? 0 : 1.5,
              borderColor: theme.lineStrong,
              opacity: pressed ? 0.7 : 1,
            })}>
            {selected ? <Icon name="check" size={16} color={theme.onAccent} /> : null}
          </Pressable>
        ) : null}

        <Pressable testID={`course-member-${member.id}`}
          onPress={() => router.push({ pathname: '/member/[id]', params: { id: member.id } })}
          accessibilityRole="button"
          accessibilityLabel={`${member.name}, ${inactive ? 'inactive' : 'active'}. ${
            noEmail ? 'No email on file, not in follow-up' : member.emails[0]?.address ?? ''
          }. ${missLine({ weekLabel, missed: member.missed, reading: run })}`}
          style={({ pressed }) => ({
            flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10,
            opacity: pressed ? 0.7 : 1,
          })}>
          <View style={{
            width: 34, height: 34, borderRadius: 17, backgroundColor: tint,
            alignItems: 'center', justifyContent: 'center',
          }}>
            <Text style={{ fontSize: 12.5, fontWeight: '800', color: theme.onAccent }}>
              {initials(member.name)}
            </Text>
          </View>
          {/* minWidth 0 is what makes the ellipsis happen. The default minimum
              of a flex child is its CONTENT, so a long address pushed the
              status pill and the edit button off the right edge instead of
              truncating -- which is the one thing a roster of email addresses
              is guaranteed to contain. */}
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text numberOfLines={1} style={{
              fontSize: 14, fontWeight: '700', color: theme.fgStrong,
            }}>{member.name}</Text>
            <Text numberOfLines={1} style={{
              fontSize: 11.5, marginTop: 2,
              color: noEmail ? dangerInk : theme.muted,
            }}>
              {noEmail ? 'No email on file · not in follow-up' : member.emails[0]?.address ?? ''}
            </Text>
            <Text numberOfLines={1} style={{
              fontSize: 11, marginTop: 1, fontVariant: ['tabular-nums'],
              color: heavy ? dangerInk : theme.dim,
            }}>
              {missLine({ weekLabel, missed: member.missed, reading: run })}
            </Text>
            {/* A departure that has not happened yet -- the one fact the
                pill's word cannot carry. It reads "Active", truthfully, and
                would go on reading it right up to the day; this is what
                stops that being a surprise. Only when there IS one, so no
                card gains a line for a member nobody is leaving. */}
            {pending ? (
              <Text numberOfLines={1} testID={`course-member-pending-${member.id}`}
                style={{ fontSize: 11, marginTop: 1, color: theme.dim }}>
                {`Inactive from ${dateInWords(pending)}`}
              </Text>
            ) : null}
          </View>
        </Pressable>

        {/* The pill still STATES the status in a word and an icon (guardrail
            3); it is now also how the status is changed. Its label spells out
            what the tap does, because a pill reading "Active" that means
            "make her inactive" is a control nobody can read. */}
        <Pressable testID={`course-member-status-${member.id}`}
          onPress={() => setConfirmStatus(true)}
          disabled={saving}
          accessibilityRole="button"
          accessibilityState={{ disabled: saving }}
          /* What she IS, and what the tap will do -- separately, because
             since 0045 they can be about two different days. A label reading
             "is active" over a pill that will mark her active again is the
             control nobody can read, arriving from the other direction. */
          accessibilityLabel={[
            readingIsHistoric && dayIso
              ? `${member.name} ${wasOrWillBe} ${inactive ? 'inactive' : 'active'} on ${dayInWords(dayIso)}.`
                + ` Today: ${inactiveToday ? 'inactive' : 'active'}.`
              : `${member.name} is ${inactive ? 'inactive' : 'active'}.`,
            pending ? `Due to become inactive on ${dateInWords(pending)}.` : '',
            inactiveToday ? 'Mark active.' : 'Mark inactive from today.',
          ].filter(Boolean).join(' ')}
          hitSlop={6}
          style={({ pressed }) => ({
            flexDirection: 'row', alignItems: 'center', gap: 4,
            minHeight: 30, paddingHorizontal: 8, borderRadius: RADIUS.pill,
            backgroundColor: box.bg, borderWidth: 1, borderColor: box.border,
            opacity: pressed || saving ? 0.6 : 1,
          })}>
          <Icon name={inactive ? 'pause_circle' : 'check_circle'} size={13} color={statusInk} />
          <Text style={{ fontSize: 9.5, fontWeight: '800', color: statusInk }}>
            {inactive ? 'Inactive' : 'Active'}
          </Text>
        </Pressable>

        <Pressable testID={`course-member-edit-${member.id}`}
          onPress={() => router.push({ pathname: '/member/edit', params: { id: member.id } })}
          accessibilityRole="button"
          accessibilityLabel={noEmail ? `Add an email for ${member.name}` : `Edit ${member.name}`}
          hitSlop={6}
          style={({ pressed }) => ({
            width: 32, height: 30, borderRadius: RADIUS.sm,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusSurface(noEmail ? dangerInk : theme.accent).bg,
            borderWidth: 1, borderColor: statusSurface(noEmail ? dangerInk : theme.accent).border,
            opacity: pressed ? 0.7 : 1,
          })}>
          <Icon name={noEmail ? 'mail_off' : 'edit'} size={15}
            color={noEmail ? dangerInk : theme.accentInk} />
        </Pressable>

        {/* Remove her from the academy -- last on the row, after the two
            controls that only change how she reads, because it is the only
            one on the card that cannot be undone from the app.

            It keeps its own bin glyph and its own label in both states: on a
            no-email card the Edit button beside it is already drawn in the
            danger colour, so the two are told apart by icon and label and
            never by the colour alone (guardrail 3). */}
        <Pressable testID={`course-member-remove-${member.id}`}
          onPress={() => setConfirmRemove(true)}
          disabled={removing}
          accessibilityRole="button"
          accessibilityState={{ disabled: removing }}
          accessibilityLabel={`Remove ${member.name} from the academy`}
          hitSlop={6}
          style={({ pressed }) => ({
            width: 32, height: 30, borderRadius: RADIUS.sm,
            alignItems: 'center', justifyContent: 'center',
            backgroundColor: statusSurface(dangerInk).bg,
            borderWidth: 1, borderColor: statusSurface(dangerInk).border,
            opacity: pressed || removing ? 0.6 : 1,
          })}>
          <Icon name="delete" size={15} color={dangerInk} />
        </Pressable>
      </View>

      {/* ------------------------------------------------ attendance status
          Present · Absent · Yet to mark, for the day the strip has selected.

          THREE READINGS OF ONE FACT, NOT THREE CONTROLS (ADR-023). The
          register is written by the uploaded session file and by nothing
          else, so this row reports what that file said and offers no way to
          disagree with it. It reverses the tap half of ADR-021 on the
          requester's word: "they are not button they are just status ...
          dont make is clickable and manual action".

          Their own row, for the reason the two buttons below have one: three
          labels squeezed in beside an avatar, a pill and an edit button
          truncate, and the WORD is half of what a status carries (DR-3).

          Which one is filled:
            a row was uploaded    -> Present or Absent, exactly as recorded
            expected, no row yet  -> Yet to mark, in the same amber the day
                                     strip's own cell for that day carries
            not expected, no row  -> Not expected. "Yet to mark" there would
                                     promise an upload that is never coming,
                                     for a session that does not run. */}
      {/* THE SAME RULE AS THE STRIP, one level in. A card whose week failed
          says so; it does not fall through to "Yet to mark", which is a
          business claim about an upload nobody has made. The retry is the
          banner under the strip -- one action for one failed read, not one
          per card. */}
      {attendanceState === 'error' ? (
        <Text style={{ fontSize: 11, color: theme.dim, marginTop: 11 }}>
          Attendance for this week could not be loaded.
        </Text>
      ) : attendanceState === 'loading' ? (
        // 44 + 4, the exact height the row occupies once it lands, so the
        // card does not jump under the reader when the week arrives.
        <View style={{ height: 44, marginTop: 4 }} />
      ) : day && dayIso ? (
        <View
          // Not a radiogroup, and no radios inside it: a reader that
          // announces three choices invites a tap that has nowhere to go.
          // One label on the group states where she stands, in a sentence.
          accessibilityLabel={`Attendance for ${member.name} on ${dayInWords(dayIso)}: ${
            day.state === 'present' ? 'present'
              : day.state === 'absent' ? 'absent'
              : day.expected ? 'yet to be marked'
              : 'not expected'
          }`}
          // marginTop 4, not 11: each reading carries 7pt of its own padding
          // above, so the gap a reader sees under the name block is the same
          // 11pt the no-email action row leaves.
          style={{ flexDirection: 'row', flexWrap: 'wrap', columnGap: SPACE.sm, marginTop: 4 }}>
          {CHIPS.map(chip => {
            const on = day.state === chip.state;
            // The third reading stands for two different facts, and it says
            // which of them it is rather than wearing one word for both.
            const missing = chip.state === 'unmarked' && !day.expected;
            // `awaiting` is the tone the strip already uses one line above
            // for "the session ran and no file has arrived" -- the same fact
            // this reading carries, so it wears the same colour.
            const tone = missing ? STATUS.none : chip.tone ? STATUS[chip.tone] : STATUS.awaiting;
            const ink = on ? (theme.isDark ? tone.fgDark : tone.fgLight) : theme.muted;
            const box = on ? statusSurface(ink) : null;
            return (
              <View key={chip.state}
                testID={`course-member-attendance-${chip.state}-${member.id}`}
                // 7pt above and below is what this row measured when these
                // were touch targets. Kept, so making them inert did not
                // move every card -- but at FULL opacity, not the 0.45 a
                // disabled control was allowed: these are static text now,
                // and static text has to clear 4.5:1 (DR-2).
                style={{ paddingVertical: 7 }}>
                <View style={{
                  flexDirection: 'row', alignItems: 'center', gap: 4,
                  minHeight: 30, paddingHorizontal: 8, borderRadius: RADIUS.pill,
                  backgroundColor: box ? box.bg : 'transparent',
                  borderWidth: 1, borderColor: box ? box.border : theme.line,
                }}>
                  <Icon name={missing ? tone.icon : chip.icon} size={13} color={ink} />
                  <Text style={{ fontSize: 9.5, fontWeight: '800', color: ink }}>
                    {missing ? tone.word : chip.word}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      ) : null}

      {/* ------------------------------------------ the two no-email actions
          A name with no address reached the register one of two ways: she is
          somebody new who has not given one, or she is somebody ALREADY on
          the register under a different display name. The two buttons are
          those two answers, and each says which one it is.

          BOTH RESOLVE THE ROW THAT IS ON SCREEN. She is already a member --
          the import created her record and enrolled her (0024, 0037), which
          is the whole reason this card can be drawn at all. So "add as new
          member" means COMPLETE HER RECORD, and it opens hers by id.

          It used to open the ADD form prefilled with her name, which created
          a SECOND member: the new one had the address, the stray kept the
          attendance, and this section still listed her afterwards -- the
          requester's report on 07-Sep-2026, "i added nitha as new member
          then the record should be removed from no email section but its
          still their". A member with no address is exactly the thing the
          edit form refuses to save (C-73), so adding the address there is
          what takes her out of this group -- one member, one record.

          They sit on their own row rather than beside the status pill: both
          labels are sentences, and squeezed in beside an avatar and a pill
          they truncate to "Add as..." / "Add display..." -- two buttons that
          read the same are worse than one. */}
      {noEmail ? (
        <View style={{ flexDirection: 'row', gap: SPACE.sm, marginTop: 11 }}>
          <Pressable testID={`course-member-add-new-${member.id}`}
            onPress={() => router.push({
              pathname: '/member/edit', params: { id: member.id } })}
            accessibilityRole="button"
            accessibilityLabel={`Add ${member.name} as a new member — full details, with the email the follow-up rule needs`}
            style={({ pressed }) => ({
              flex: 1, minHeight: 34, borderRadius: RADIUS.sm,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              paddingHorizontal: 8,
              backgroundColor: statusSurface(theme.accentInk).bg,
              borderWidth: 1, borderColor: statusSurface(theme.accentInk).border,
              opacity: pressed ? 0.7 : 1,
            })}>
            <Icon name="person_add" size={14} color={theme.accentInk} />
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: theme.accentInk }}>
              Add as new member
            </Text>
          </Pressable>

          <Pressable testID={`course-member-add-alias-${member.id}`}
            onPress={() => setLinking(true)}
            disabled={linkingSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: linkingSave }}
            accessibilityLabel={`Add ${member.name} as a display name for an existing member`}
            style={({ pressed }) => ({
              flex: 1, minHeight: 34, borderRadius: RADIUS.sm,
              flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5,
              paddingHorizontal: 8,
              backgroundColor: theme.surface2,
              borderWidth: 1, borderColor: theme.lineStrong,
              opacity: pressed || linkingSave ? 0.6 : 1,
            })}>
            <Icon name="link" size={14} color={theme.fg} />
            <Text numberOfLines={1} style={{ fontSize: 11, fontWeight: '800', color: theme.fg }}>
              {linkingSave ? 'Saving…' : 'Add display name to existing member'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      {/* Every member on the register, searched by the operator -- nothing is
          guessed from the name. Selected by member_id, never by label: two
          members can share a name, and attaching a display name to the wrong
          one is exactly what the import would then act on. */}
      <SearchPicker
        open={linking}
        onClose={() => setLinking(false)}
        placement="top"
        title={`Who is “${member.name}”?`}
        placeholder="Search by name or email"
        /* THE ADDRESS IS ON THE ROW, not only in the query. The register holds
           two live members called "Kavitha Ramesh"; on a name alone these were
           two identical rows over an irreversible merge. `search` carries
           EVERY address she holds, so an old address on a spreadsheet still
           finds her, while the row prints the primary one -- the same address
           the roster card and the send list print for her. */
        options={allMembers
          .filter(m => m.id !== member.id)
          .map(m => ({
            label: m.name,
            /* C-76's own words, the ones this screen already prints two cards
               up: a member with no address is NAMED, never silently blank. A
               blank line here reads as "still loading", and two same-named
               members with no address between them would be two identical
               rows again -- which is the defect this picker was opened for. */
            sub: primaryEmail(m) || 'No email on file',
            search: m.emails.map(e => e.address).join(' '),
            meta: `${m.course} · ${m.branch}`,
            value: m.id,
          }))}
        confirmLabel="Add as display name"
        busy={linkingSave}
        /* WHAT IT WILL DO, naming both halves. The attendance move is the
           half nobody would guess from the button, and it is the half that
           cannot be undone by tapping something else. */
        confirmNote={chosen =>
          `“${member.name}” becomes a display name for ${chosen.label}, and every class `
          + `${member.name} was marked present at moves across to that record. `
          + `${member.name} is then retired — the same person is not on the register twice.`}
        onSelect={memberId => {
          const chosen = allMembers.find(m => m.id === memberId);
          if (!chosen || linkingSave) return;
          void (async () => {
            setLinkingSave(true);
            try {
              const result = await mergeMemberInto(member.id, chosen.id);
              setLinking(false);
              flash(dataSource === 'live'
                ? `“${member.name}” is now a display name for ${chosen.name}`
                  + (result.attendance_moved > 0
                      ? ` · ${result.attendance_moved} attendance record${result.attendance_moved === 1 ? '' : 's'} moved`
                      : '')
                : `“${member.name}” merged into ${chosen.name} on this device only. The academy database is not configured.`,
                dataSource === 'live' ? 'ok' : 'warn');
            } catch (err) {
              // Every refusal here is a real answer about the register -- the
              // name already points at somebody, she carries an address of her
              // own -- not a glitch to swallow. The picker stays OPEN on a
              // failure, so the message lands next to what caused it.
              flash(err instanceof Error ? err.message : MERGE_FAILED, 'warn');
            } finally {
              setLinkingSave(false);
            }
          })();
        }}
        emptyNote="No member matches that. Add a new member instead — course and branch come from this course." />

      {/* What the mark DOES, in both directions, because "inactive" on its own
          could mean deleted, paused or unenrolled -- and which of those it is
          decides whether anybody dares tap it. */}
      <ConfirmDialog
        open={confirmStatus}
        onClose={() => setConfirmStatus(false)}
        /* TODAY's reading, in the title, the body and the button -- the
           three places the decision is stated. The pill above may be drawing
           a past day (0045); the act is always about now, and the body's
           first sentence says which day it is about whenever those two
           differ, rather than leaving the reader to notice. */
        title={inactiveToday ? `Mark ${member.name} active?` : `Mark ${member.name} inactive?`}
        body={[
          readingIsHistoric && dayIso
            ? `The pill is showing ${dayInWords(dayIso)}, when ${member.name} ${wasOrWillBe} `
              + `${inactive ? 'inactive' : 'active'}. Today: `
              + `${inactiveToday ? 'inactive' : 'active'}, and this changes that.`
            : '',
          /* A date already set is what this tap would OVERWRITE, and the one
             thing nobody would guess from a button reading "Mark inactive".
             Naming it is what makes the tap recoverable: whoever set the
             30th finds out here, not next month. */
          pending && !inactiveToday
            ? `${member.name} is already due to become inactive on ${dateInWords(pending)}. `
              + 'Marking inactive now brings that forward to today; use Edit to change '
              + 'the date instead.'
            : '',
          inactiveToday
            ? 'This member goes back into the follow-up rule from now on, and is listed and written to again after a missed session. Any inactive date on the record is cleared. The enrolment and the attendance history are unchanged — they never went anywhere.'
            : 'This member stays on the roster and attendance goes on being recorded, but is left out of the follow-up rule from today: not listed for follow-up, and nothing is sent. The enrolment and the history are untouched, and marking active again puts everything straight back. Recorded in the audit log.',
        ].filter(Boolean).join(' ')}
        cancelLabel="Cancel"
        confirmLabel={saving ? 'Saving…' : inactiveToday ? 'Mark active' : 'Mark inactive'}
        onConfirm={() => { void applyStatus(); }} />

      {/* The same question the Members tab asks, word for word, because it is
          the same write -- which is why the sentence lives in
          src/data/memberRemoval.ts and not in either screen. Shortened to two
          sentences on 08-Sep-2026; the note over `deletionWarning` says what
          went and why the counts are still fetched behind it. */}
      <ConfirmDialog
        open={confirmRemove}
        onClose={() => setConfirmRemove(false)}
        title={`Delete ${member.name} and every record?`}
        body={deletionWarning(previewState)}
        cancelLabel="No"
        confirmLabel={removing ? 'Deleting…' : 'Yes'}
        emphasis="cancel"
        onConfirm={() => { void remove(); }} />
    </View>
  );
}

/**
 * Under the shell, not instead of it. This screen is pushed on the root
 * stack, so it is not one of the tab navigator's own and wore no academy
 * header and no Home · Reports · More pill until ShellScreen drew them.
 */
export default function CourseDetail() {
  return <ShellScreen><CourseDetailBody /></ShellScreen>;
}
