/**
 * One hook shape for every screen: loading -> ready | error, with retry.
 *
 * This is the live counterpart of useScreenState, and it keeps that file's
 * two hard-won properties:
 *   1. ALWAYS start at 'loading', on the server prerender and the client
 *      alike. Reading anything else during the first render made the static
 *      export disagree with the hydrated markup and React threw the whole
 *      screen away (hydration error #418).
 *   2. `?state=loading|error` still forces a state, so a reviewer can see
 *      every branch of a screen without breaking anything on purpose. On
 *      fixtures that is the only way to see the error path at all.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import type { ScreenState } from './useScreenState';
import {
  initialAsync, asyncReducer, LOAD_TIMEOUT_MS, type AsyncSnapshot,
} from './asyncState';
import { registerRevalidator } from './revalidate';
import { currentWeek, periodBuckets, type Period } from './period';
import {
  fetchMembers, fetchRules, fetchCourses, fetchTemplates, fetchStaff, fetchAudit,
  fetchRemarks, onRemarksChanged,
  fetchFilterOptions, fetchMonthSessions, fetchPendingSessions, fetchWeekRows,
  fetchBucketMetrics,
  fetchAcademy, fetchBranches, fetchOfferings,
  fetchBranchUsage, onBranchesChanged, fetchCourseMessage, fetchSenders,
  type CourseMessage,
  fetchNotifications, type Notification,
  fetchSentForPeriod,
  type Branch, type BranchUsage, type OfferingDetail,
  fetchAttendance, onCoursesChanged, onMembersChanged, onAttendanceChanged, onRulesChanged,
  fetchCourseWeekDays, fetchCourseDayRows, type CourseDayStatus,
  fetchHolidays, onHolidaysChanged, fetchMemberWeek, onStaffChanged,
  type Rules, type PendingSession, type Holiday,
} from './repository';
import { flagged } from './followup';
import type { BucketMetrics } from './buckets';
import type {
  Member, Course, Template, Staff, AuditEntry, Remark, SessionDay, WeekRow, AttendanceRow,
  MemberSession,
} from './mock';
import { onSentChanged, type SentMap } from './sent';

export type Async<T> = {
  state: ScreenState;
  data: T | null;
  /** what went wrong, in a sentence a person can act on */
  error: string | null;
  retry: () => void;
  /**
   * A fetch is open over data that is ALREADY ON SCREEN. Distinct from
   * `state === 'loading'`, which means there is nothing to show yet — see
   * asyncState.ts. A screen may draw a quiet mark for this; it must not draw
   * a skeleton, or the whole point is lost.
   */
  isRevalidating: boolean;
  /** when the data on screen was fetched, ms since epoch; null until one lands */
  fetchedAt: number | null;
};

/**
 * A request that never answers is worse than one that fails: the screen sits
 * on a skeleton forever with nothing to retry. A hung network (captive
 * portal, a blocked host, a dead tunnel) does exactly that, so every load
 * gets a deadline and turns into the ordinary, retryable error state.
 *
 * The constant itself now lives in asyncState.ts, so that `revalidate.ts` can
 * derive its staleness floor from it rather than inventing one. Unchanged at
 * twelve seconds.
 */

function withTimeout<T>(work: Promise<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error('This is taking too long. Check the connection and try again — nothing has been changed.')),
      LOAD_TIMEOUT_MS,
    );
    work.then(
      value => { clearTimeout(timer); resolve(value); },
      err => { clearTimeout(timer); reject(err); },
    );
  });
}

/**
 * A FORCED STATE MAY NAME ONE READ, `?state=error:week`.
 *
 * `?state=error` forces EVERY read on a screen, which is the right default and
 * is unchanged. But a screen whose first guard is `if (courses.state ===
 * 'error') return <ErrorState/>` renders that guard and nothing else — so the
 * branches BEHIND it have never been reachable by a reviewer at all. On the
 * course screen that hid the whole of Task 3: a failed week's seven Load failed
 * cells and their retry banner could not be looked at, on fixtures or
 * otherwise, and the browser check written to watch them found an empty screen.
 *
 * So a target may be named, and only the read carrying that tag is forced;
 * every other read on the screen loads normally and the guards in front of it
 * stay out of the way. Tags are opt-in, so a hook that names none behaves
 * exactly as it did.
 */
function forcedFor(forced: string | undefined, tag: string | undefined): string | null {
  if (!forced) return null;
  const at = forced.indexOf(':');
  if (at === -1) return forced;                             // `?state=error` — everything
  return forced.slice(at + 1) === tag ? forced.slice(0, at) : null;
}

/** what every bus in repository.ts and sent.ts looks like: subscribe, get back an unsubscribe */
type Bus = (listener: () => void) => () => void;

/**
 * A change-version fed by SEVERAL buses.
 *
 * The single-bus hooks above each write this out by hand, and are left alone.
 * What is new is the reads that more than one kind of write can move — the
 * dashboard's bars change when attendance moves AND when the membership does,
 * the "awaiting upload" list changes when an import completes a session AND
 * when the timetable generates one. Subscribing to the wrong one of a pair is
 * exactly the half-fix RC-034 warns about, so both are named.
 *
 * The bus functions are module-level and therefore stable, which is why the
 * empty dependency list is correct here.
 */
function useVersion(...buses: Bus[]): number {
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const bump = () => setVersion(v => v + 1);
    const offs = buses.map(on => on(bump));
    return () => { for (const off of offs) off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return version;
}

/**
 * TWO KINDS OF RELOAD, AND THEY MUST NOT LOOK THE SAME ON SCREEN.
 *
 * `deps` is the QUESTION. When it moves, a genuinely different dataset is
 * being asked for — another week, another course — and the screen goes back
 * to `loading`, exactly as it always did. Showing last week's rows under this
 * week's heading would be two answers to one question on one screen.
 *
 * `revalidateKey` is the SAME question, asked again: a write announced itself
 * on one of repository.ts's buses, or the app came back to the foreground.
 * The answer already on screen is the best one available until the new one
 * lands, so it STAYS there and `isRevalidating` goes true instead. Before
 * this, every hook folded its change-version into `deps`, so a write in
 * another part of the app blanked the list you were reading — and attaching
 * the same mechanism to focus would have blanked it every time you came back
 * to the tab. The rule and its cases are in asyncState.ts.
 *
 * Every live reader also REGISTERS itself, so `src/pwa/DataRefresh.tsx` can
 * ask the stale ones to fetch again when the app becomes active. Registration
 * is the ability to be asked and nothing else: no data is held here.
 */
export function useAsync<T>(
  load: () => Promise<T>, deps: unknown[], forced?: string, tag?: string,
  revalidateKey?: unknown,
): Async<T> {
  const [snapshot, dispatch] = useReducer(
    asyncReducer as (s: AsyncSnapshot<T>, e: Parameters<typeof asyncReducer<T>>[1]) => AsyncSnapshot<T>,
    undefined, initialAsync<T>);
  const [attempt, setAttempt] = useState(0);

  /* The run counter. A ref rather than state: it must be read and bumped
     inside the effect without causing one, and two overlapping runs have to
     get different numbers in the order they STARTED. */
  const seq = useRef(0);
  /* What `revalidateKey` was last time, so the effect can tell a question
     that moved from an answer that was merely asked for again. A ref, because
     comparing it must not itself be a dependency. */
  const lastKey = useRef<unknown>(revalidateKey);
  const firstRun = useRef(true);
  /* Set by `retry` and by the lifecycle registry, and cleared by the effect
     that reads it. Without it a retry from the error state would be taken for
     a dependency change; with it, a retry over data that is still on screen
     revalidates rather than blanking it. */
  const retriedRef = useRef(false);
  /* Read by the registry without re-registering on every fetch. */
  const fetchedAt = useRef<number | null>(null);
  fetchedAt.current = snapshot.fetchedAt;
  /* Whether a fetch is open right now. Set in the effect and cleared when it
     settles, so the registry can leave an in-flight read alone rather than
     cancelling it and starting again (see Revalidator.busy). */
  const busy = useRef(false);

  /* A READER HELD BY `?state=` MUST NOT BE REVALIDATED OUT OF IT.
     Both modes, not just 'loading': an error pinned for review still
     registered, so every lifecycle burst called its retry and re-dispatched
     the forced error — work with no effect, on a reader deliberately frozen
     for somebody to look at. */
  const pinned = forcedFor(forced, tag) !== null;

  useEffect(() => {
    let cancelled = false;
    const mode = forcedFor(forced, tag);
    if (mode === 'loading') return;                         // pinned for review
    if (mode === 'error') {
      dispatch({ kind: 'forcedError',
        message: `Forced error state (?state=${forced}). Nothing has been changed.` });
      return;
    }

    /* FRESH means the question changed. The first run is fresh by definition;
       after that, a run is a revalidation exactly when the only thing that
       moved was the revalidate key or the retry counter. `deps` moving is
       read as fresh because this effect cannot re-run for any other reason. */
    const keyMoved = lastKey.current !== revalidateKey;
    lastKey.current = revalidateKey;
    const fresh = firstRun.current ? true : !(keyMoved || retriedRef.current);
    firstRun.current = false;
    retriedRef.current = false;

    const mine = ++seq.current;
    busy.current = true;
    dispatch({ kind: 'start', fresh, seq: mine });
    withTimeout(load())
      .then(result => {
        busy.current = false;
        if (cancelled) return;
        dispatch({ kind: 'resolved', data: result, at: Date.now(), seq: mine });
      })
      .catch((err: unknown) => {
        busy.current = false;
        if (cancelled) return;
        dispatch({ kind: 'failed',
          message: err instanceof Error ? err.message : 'Something went wrong.', seq: mine });
      });
    /* The flag is NOT cleared here. A cleanup runs because a newer run is
       starting, and that run sets it again immediately — clearing it between
       the two would open a window in which the registry saw an idle read and
       restarted the one just begun. It is cleared only where a request
       actually settles, and `withTimeout` guarantees that happens. */
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forced, tag, attempt, revalidateKey, ...deps]);

  const retry = useCallback(() => {
    retriedRef.current = true;
    setAttempt(a => a + 1);
  }, []);

  /* WHAT MAY BE ASKED AGAIN when the app becomes active. A reader pinned by
     `?state=loading` is deliberately held there for review and must not be
     dragged out of it. Registration is torn down on unmount, so a screen
     nobody is on is never refetched. */
  useEffect(() => {
    if (pinned) return;
    return registerRevalidator({
      revalidate: retry,
      fetchedAt: () => fetchedAt.current,
      busy: () => busy.current,
    });
  }, [pinned, retry]);

  return {
    state: snapshot.state,
    data: snapshot.data,
    error: snapshot.error,
    isRevalidating: snapshot.isRevalidating,
    fetchedAt: snapshot.fetchedAt,
    retry,
  };
}

/**
 * The member list, refetched whenever a member is written.
 *
 * The same reason useCourses carries a version: a member added and then
 * missing from the list she was added to reads exactly like a save that did
 * nothing -- which is the complaint this work started from. The tab stays
 * mounted behind the edit screen and refetches nothing on its own.
 */
export function useMembers(forced?: string, period: Period = currentWeek()): Async<Member[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onMembersChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchMembers(period), [period.from, period.to], forced, undefined, version);
}

/**
 * The saved follow-up rule, refetched whenever a trigger is written.
 *
 * The trigger is CHANGEABLE from the send draft and the member pop-up now
 * (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md), and both of
 * those stay mounted across the save. Without the version, the panel that just
 * wrote 2 goes on reading 4 back and offering to "change" a number the database
 * no longer holds.
 */
export function useRules(forced?: string): Async<Rules> {
  const [version, setVersion] = useState(0);
  useEffect(() => onRulesChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchRules(), [], forced, undefined, version);
}

/**
 * The members AND the flagged subset, from ONE fetch. Screens that show both
 * a member count and a follow-up count must read them from the same load, or
 * the two numbers can be a query apart and disagree on screen.
 */
export function useFollowUp(forced?: string, period: Period = currentWeek()):
  Async<{ members: Member[]; rules: Rules; flagged: Member[] }> {
  const [version, setVersion] = useState(0);
  useEffect(() => onMembersChanged(() => setVersion(v => v + 1)), []);
  /* AND on the rule, since the trigger can be changed from the send draft
     itself. `flagged` below is DERIVED from the rule this fetch reads, so a
     rule that moved with nothing refetched leaves the draft listing whoever
     the old number flagged -- one screen showing a trigger of 2 over the list
     of 4, which is precisely the disagreement guardrail 1 forbids. */
  useEffect(() => onRulesChanged(() => setVersion(v => v + 1)), []);
  return useAsync(async () => {
    const [members, rules] = await Promise.all([fetchMembers(period), fetchRules()]);
    return { members, rules, flagged: flagged(members, rules.global, rules.byCourseName) };
  }, [period.from, period.to], forced, undefined, version);
}

/**
 * The course list, refetched whenever a course is written.
 *
 * Every mounted list hears the same notification, so the Courses tab is
 * correct the moment you come back from the edit screen rather than at its
 * next remount -- a saved course that is not on the list it was saved to
 * reads exactly like a save that did nothing.
 */
export function useCourses(forced?: string): Async<Course[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onCoursesChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchCourses(), [], forced, undefined, version);
}

/**
 * NOT SUBSCRIBED, AND THAT IS THE VERIFIED ANSWER.
 *
 * The audit listed this one, and the read is real -- `email_templates`. But
 * the only writer of that table in the whole app is `setTemplateActive`
 * (repository.ts), and nothing calls it: it is reachable from no screen. A
 * read with no reachable mutation cannot go stale, and subscribing it would
 * be a subscription to an event that is never fired. If a template editor is
 * ever built, it rings a bus here and this comment comes out.
 */
export function useTemplates(forced?: string): Async<Template[]> {
  return useAsync(() => fetchTemplates(), [], forced);
}

export function useStaff(forced?: string): Async<Staff[]> {
  /* The staff writes are Edge Functions called through api.ts, which
     announces nothing on its own -- so repository.ts grew a bus for them and
     their call sites ring it, exactly as app/upload.tsx rings
     attendanceImported() after a commit. Needed because staff/add is a
     DIALOG over this list and the More tab's staff count outlives every
     screen; neither can reach the list's own retry(). */
  const version = useVersion(onStaffChanged);
  return useAsync(() => fetchStaff(), [], forced, undefined, version);
}

/**
 * The audit log, narrowed by a date range when one is chosen.
 *
 * `period` is nullable and starts null on the Audit screen, which is the one
 * place in the app where a default date filter would be wrong: every other
 * screen answers "how are we doing lately", and this one answers "what has
 * happened" — a default range would hide changes nobody asked it to hide.
 */
export function useAudit(forced?: string, period?: Period | null): Async<AuditEntry[]> {
  /* THE ONE READ THAT EVERY WRITE MOVES, and the only place in this file
     where naming every bus is the accurate answer rather than a lazy one:
     `audit_logs` records each of them, so each of them dates this list. It
     is not a subscription to "everything" -- there is no such bus -- it is
     the enumerated set of writes this screen is a report of. Remarks are
     next door in useRemarks and stay there, because the two fail
     independently (0043). */
  const version = useVersion(
    onAttendanceChanged, onMembersChanged, onCoursesChanged,
    onBranchesChanged, onHolidaysChanged, onRulesChanged, onSentChanged,
    // audit_app_users (0004:107) fires on every staff insert, update and
    // delete, so the claim above is only true with this one in the list. It
    // was missing, which is what an enumeration gets wrong.
    onStaffChanged);
  return useAsync(() => fetchAudit(period),
    [period?.from ?? '', period?.to ?? ''], forced, undefined, version);
}

/**
 * The remarks beside the audit log, refetched whenever one is added.
 *
 * Separate from useAudit rather than folded into it, because the two fail
 * independently: remarks live in their own table (0043) and a project that
 * has not had it applied must still show the log. One hook for both would
 * make the log's success depend on the remarks' success.
 */
export function useRemarks(forced?: string): Async<Remark[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onRemarksChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchRemarks(), [], forced, undefined, version);
}

export function useFilterOptions(forced?: string): Async<{ branches: string[]; courses: string[] }> {
  /* Branch NAMES and course NAMES, and nothing else (fetchFilterOptions).
     So the two writes that can move it are a branch write and a course write
     -- not attendance, which changes no name. A course added while the
     Attendance tab sat open was absent from its own filter list until the
     screen was remounted, which reads as a course that did not save. */
  const version = useVersion(onCoursesChanged, onBranchesChanged);
  return useAsync(() => fetchFilterOptions(), [], forced, undefined, version);
}

/** The academy name and its branches, for the profile's academy row. Named
 *  for the DETAILS to keep it distinct from state/academy's useAcademy,
 *  which is the branch-scope picker and fetches nothing. */
export function useAcademyDetails(forced?: string): Async<{ name: string; branches: string[] }> {
  return useAsync(() => fetchAcademy(), [], forced);
}

/**
 * Everything the offering editor needs, from ONE load: the course it belongs
 * to, the branches it could run at, and the offerings it already has. They
 * are fetched together because the screen compares them -- the course's
 * stated frequency against the days actually scheduled (C-59/CR-07) -- and
 * two separate loads could show a frequency from one moment against weekdays
 * from another.
 */
export function useOfferingEditor(courseId: string, forced?: string):
  Async<{ course: Course | null; branches: Branch[]; offerings: OfferingDetail[] }> {
  /* Courses, branches and this course's offerings with their schedules.
     `createOffering` and `setOfferingSchedule` both announce on the course
     bus, and a branch added from the branches screen has to appear in the
     branch picker here. Attendance is deliberately NOT one of these: a mark
     changes nothing this editor shows. */
  const version = useVersion(onCoursesChanged, onBranchesChanged);
  return useAsync(async () => {
    const [courses, branches, offerings] = await Promise.all([
      fetchCourses(), fetchBranches(), fetchOfferings(courseId),
    ]);
    return { course: courses.find(c => c.id === courseId) ?? null, branches, offerings };
  }, [courseId], forced, undefined, version);
}

export function useMonthSessions(year: number, month: number, forced?: string): Async<SessionDay[]> {
  /* `sessions.status` and its counts for the month. Three writes move it:
     an import completes a session (and a day reset returns one to
     scheduled), the timetable generates or removes them, and a holiday
     applied or lifted rewrites their status through apply_holiday /
     remove_holiday (0007, 0017). */
  const version = useVersion(onAttendanceChanged, onCoursesChanged, onHolidaysChanged);
  return useAsync(() => fetchMonthSessions(year, month), [year, month], forced, undefined, version);
}

/** Every attendance fact in the period, for the Attendance tab. The period
 *  is part of the key, so changing the filter refetches rather than
 *  re-labelling rows that were counted over a different range.
 *
 *  Refetched whenever attendance is written, for the reason useCourses
 *  carries a version: a member marked present whose week strip still says
 *  "awaiting upload" is two answers to one question on one screen. */
/**
 * The seven day statuses for ONE course's week (0067).
 *
 * Seven rows instead of every attendance record in the week for every course.
 * See fetchCourseWeekDays for what that costs today and what it costs after.
 *
 * It listens to the same `onAttendanceChanged` the row list does, so an upload
 * or a reset refreshes the strip — otherwise a day would keep its old cell
 * until the screen was left and re-entered, which is the "a save that did
 * nothing" complaint this file's other hooks carry a version for.
 *
 * `courseId` is nullable because the course record arrives from its own read:
 * a null means there is nothing to ask about yet, and the hook resolves to an
 * empty week rather than sending a query for `undefined`.
 */
export function useCourseWeekDays(
  courseId: string | null, weekStart: string, branchId: string | null, forced?: string,
): Async<CourseDayStatus[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onAttendanceChanged(() => setVersion(v => v + 1)), []);
  return useAsync(
    () => courseId ? fetchCourseWeekDays(courseId, weekStart, branchId) : Promise.resolve([]),
    [courseId ?? '', weekStart, branchId ?? ''], forced, 'week', version);
}

/**
 * ONE course's ONE day — the rows the roster under the strip lists.
 *
 * The other half of 0067. The strip asks the database for seven statuses; this
 * asks for the records of the day somebody actually tapped, for the course
 * they are looking at. Nothing fetches a week of every course any more.
 *
 * A null day is "nothing is selected", and resolves to an empty list rather
 * than a query — the same reason useCourseWeekDays takes a nullable course.
 */
export function useCourseDay(
  courseId: string | null, dateIso: string | null, branch: string | null, forced?: string,
): Async<AttendanceRow[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onAttendanceChanged(() => setVersion(v => v + 1)), []);
  return useAsync(
    () => courseId && dateIso
      ? fetchCourseDayRows(courseId, dateIso, branch)
      : Promise.resolve([] as AttendanceRow[]),
    [courseId ?? '', dateIso ?? '', branch ?? ''], forced, undefined, version);
}

export function useAttendance(period: Period, forced?: string): Async<AttendanceRow[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onAttendanceChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchAttendance(period), [period.from, period.to], forced, undefined, version);
}

/**
 * ONE member's sessions in a period, for her pop-up's *Her sessions this week*.
 *
 * That list was `sessionsFor(m)` -- six fixture rows, the same six for every
 * member, every course and every week. It sat directly under her live figures,
 * so nothing counted in it could ever reproduce the numbers above it.
 *
 * Refetched on the same signals `useAttendance` answers to, and for the same
 * reason: a member marked present in the roster behind this card, whose card
 * still lists her absent, is two answers to one question on one screen. It
 * also refetches when a HOLIDAY moves, because a holiday is what turns one of
 * these rows from a miss into a day that does not count (C-92).
 */
export function useMemberWeek(memberId: string | null, period: Period, forced?: string):
  Async<MemberSession[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onAttendanceChanged(() => setVersion(v => v + 1)), []);
  useEffect(() => onHolidaysChanged(() => setVersion(v => v + 1)), []);
  return useAsync(
    () => (memberId ? fetchMemberWeek(memberId, period) : Promise.resolve([])),
    [memberId, period.from, period.to], forced, undefined, version);
}

/** Holidays, refetched whenever one is added or removed -- the list a person
 *  deletes from must be the list the delete changed, or removing one leaves
 *  its row on screen and reads as a delete that did nothing. */
export function useHolidays(forced?: string): Async<Holiday[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onHolidaysChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchHolidays(), [], forced, undefined, version);
}

export function usePendingSessions(forced?: string): Async<PendingSession[]> {
  /* RC-034's defect on a different hook, and one of the two the audit called
     out by name. This is the list of days AWAITING A FILE -- and the moment
     an import completes, the day it landed on stops awaiting one. Without
     this, the upload dialog and the notification tray went on offering a day
     that had just been uploaded, which reads as an upload that did nothing.
     The course bus is the other half: a session has to exist before it can
     be pending, and the timetable is what creates it.

     AND HOLIDAYS. This read filters on `status = 'scheduled'`, and that is
     the exact column a holiday rewrites: apply_holiday sets it to 'holiday'
     and remove_holiday sets it back (0007). Missed on the first pass, while
     useMonthSessions one hook below -- the same table, the same column --
     got it right. Without it the tray goes on offering a day the academy was
     closed, and a lifted holiday never reappears as awaiting. */
  const version = useVersion(onAttendanceChanged, onCoursesChanged, onHolidaysChanged);
  return useAsync(() => fetchPendingSessions(), [], forced, undefined, version);
}

/** The notification tray. One load, three kinds -- see fetchNotifications. */
export function useNotifications(forced?: string): Async<Notification[]> {
  /* FOUR kinds, so four sources -- the first draft of this comment said
     three and named three, and the missing one was the one this very change
     built a bus for:
       · days awaiting a file, which is fetchPendingSessions again, so it
         moves on an import, on the timetable, AND on a holiday;
       · the recent email batches and messages, moved by a send;
       · open PIN-reset requests, moved by the staff writes -- answering a
         request from the staff list left the tray asking for it forever.
     The tray is mounted in AppShell, so it outlives every screen: it is the
     read most likely to be the oldest thing anybody is looking at. */
  const version = useVersion(onAttendanceChanged, onCoursesChanged, onSentChanged,
    onHolidaysChanged, onStaffChanged);
  return useAsync(() => fetchNotifications(), [], forced, undefined, version);
}

/**
 * The branches, each with what runs at it. Refetched whenever a branch is
 * written, for the reason useHolidays carries a version: a branch added and
 * then missing from the list it was added to reads exactly like a save that
 * did nothing.
 */
/** A course's resolved message: its own wording, or the template's. */
export function useCourseMessage(courseId: string | null, forced?: string): Async<CourseMessage | null> {
  /* `effective_course_message` -- the course's own wording, or the template
     it names. `saveCourse` and `saveCourseTrigger` are what write it, and
     both announce on the course bus. The send draft keeps this mounted
     underneath the editor that changes it. */
  const version = useVersion(onCoursesChanged);
  return useAsync(
    () => (courseId ? fetchCourseMessage(courseId) : Promise.resolve(null)),
    [courseId], forced, undefined, version);
}

/**
 * Who has already had this period's follow-up, so the send draft can say so
 * on her row rather than leaving a second identical email to somebody's
 * memory. Empty on fixtures and whenever the read fails -- the mark is an
 * addition to the draft, never a precondition for it.
 */
export function useSentForPeriod(period: Period, forced?: string): Async<SentMap> {
  // Every mounted screen hears the same notification, the way the member and
  // course lists do: the member pop-up stays mounted UNDER the send dialog it
  // opened, so a send made from it has to reach the label on it without
  // waiting for a remount.
  const [version, setVersion] = useState(0);
  useEffect(() => onSentChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchSentForPeriod(period), [period.from, period.to], forced, undefined, version);
}

/**
 * The addresses this deployment may send as.
 *
 * NOT SUBSCRIBED, and for a blunter reason than useTemplates: `fetchSenders`
 * returns the `SENDERS` constant (src/data/mock.ts) and reads nothing at all.
 * There is no server state here to be stale about. The audit listed it from
 * the shape of the hook rather than from what it fetches.
 */
export function useSenders(forced?: string): Async<string[]> {
  return useAsync(() => fetchSenders(), [], forced);
}

export function useBranchUsage(forced?: string): Async<BranchUsage[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onBranchesChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchBranchUsage(), [], forced, undefined, version);
}

/**
 * The "based on period" bars: the SAME metric as the ring, per sub-range.
 *
 * Keyed on the buckets themselves rather than on the period's label, so a
 * custom range that resolves to the same days does not refetch, and a change
 * of grain always does.
 */
export function useBucketMetrics(period: Period, forced?: string): Async<BucketMetrics[]> {
  const buckets = periodBuckets(period);
  const key = buckets.map(b => `${b.from}/${b.to}`).join(',');
  /* THE OTHER HOOK THE AUDIT NAMED, and the sharper of the two: these bars
     sit on the Overview directly beside a ring fed by useFollowUp, which
     DOES refetch when a member or an import moves. So an upload left the two
     disagreeing on one screen -- precisely the failure guardrail 1 exists to
     forbid. member_period_metrics is attendance per member, so both buses
     move it: the register changing, and who is counted changing. */
  const version = useVersion(onAttendanceChanged, onMembersChanged);
  return useAsync(() => fetchBucketMetrics(buckets), [key], forced, undefined, version);
}

/** The last four weeks, most recent first. Mon–Sun, per week_start_day. */
export function useWeekRows(forced?: string): Async<WeekRow[]> {
  const weeks = [0, 1, 2, 3].map(back => {
    const d = new Date();
    d.setDate(d.getDate() - back * 7);
    return currentWeek(d);
  });
  const key = weeks.map(w => w.from).join(',');
  /* The same metric as useBucketMetrics over four fixed weeks, so the same
     two writes move it, for the same reason. */
  const version = useVersion(onAttendanceChanged, onMembersChanged);
  return useAsync(() => fetchWeekRows(weeks), [key], forced, undefined, version);
}
