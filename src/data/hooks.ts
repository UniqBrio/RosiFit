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
import { useCallback, useEffect, useState } from 'react';
import type { ScreenState } from './useScreenState';
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
  fetchHolidays, onHolidaysChanged,
  type Rules, type PendingSession, type Holiday,
} from './repository';
import { flagged } from './followup';
import type { BucketMetrics } from './buckets';
import type { Member, Course, Template, Staff, AuditEntry, Remark, SessionDay, WeekRow, AttendanceRow } from './mock';
import { onSentChanged, type SentMap } from './sent';

export type Async<T> = {
  state: ScreenState;
  data: T | null;
  /** what went wrong, in a sentence a person can act on */
  error: string | null;
  retry: () => void;
};

/**
 * A request that never answers is worse than one that fails: the screen sits
 * on a skeleton forever with nothing to retry. A hung network (captive
 * portal, a blocked host, a dead tunnel) does exactly that, so every load
 * gets a deadline and turns into the ordinary, retryable error state.
 */
const LOAD_TIMEOUT_MS = 12_000;

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

export function useAsync<T>(load: () => Promise<T>, deps: unknown[], forced?: string): Async<T> {
  const [state, setState] = useState<ScreenState>('loading');
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    if (forced === 'loading') return;                       // pinned for review
    if (forced === 'error') {
      setState('error');
      setError('Forced error state (?state=error). Nothing has been changed.');
      return;
    }
    setState('loading');
    withTimeout(load())
      .then(result => {
        if (cancelled) return;
        setData(result);
        setError(null);
        setState('ready');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Something went wrong.');
        setState('error');
      });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forced, attempt, ...deps]);

  const retry = useCallback(() => setAttempt(a => a + 1), []);
  return { state, data, error, retry };
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
  return useAsync(() => fetchMembers(period), [period.from, period.to, version], forced);
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
  return useAsync(() => fetchRules(), [version], forced);
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
  }, [period.from, period.to, version], forced);
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
  return useAsync(() => fetchCourses(), [version], forced);
}

export function useTemplates(forced?: string): Async<Template[]> {
  return useAsync(() => fetchTemplates(), [], forced);
}

export function useStaff(forced?: string): Async<Staff[]> {
  return useAsync(() => fetchStaff(), [], forced);
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
  return useAsync(() => fetchAudit(period), [period?.from ?? '', period?.to ?? ''], forced);
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
  return useAsync(() => fetchRemarks(), [version], forced);
}

export function useFilterOptions(forced?: string): Async<{ branches: string[]; courses: string[] }> {
  return useAsync(() => fetchFilterOptions(), [], forced);
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
  return useAsync(async () => {
    const [courses, branches, offerings] = await Promise.all([
      fetchCourses(), fetchBranches(), fetchOfferings(courseId),
    ]);
    return { course: courses.find(c => c.id === courseId) ?? null, branches, offerings };
  }, [courseId], forced);
}

export function useMonthSessions(year: number, month: number, forced?: string): Async<SessionDay[]> {
  return useAsync(() => fetchMonthSessions(year, month), [year, month], forced);
}

/** Every attendance fact in the period, for the Attendance tab. The period
 *  is part of the key, so changing the filter refetches rather than
 *  re-labelling rows that were counted over a different range.
 *
 *  Refetched whenever attendance is written, for the reason useCourses
 *  carries a version: a member marked present whose week strip still says
 *  "awaiting upload" is two answers to one question on one screen. */
export function useAttendance(period: Period, forced?: string): Async<AttendanceRow[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onAttendanceChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchAttendance(period), [period.from, period.to, version], forced);
}

/** Holidays, refetched whenever one is added or removed -- the list a person
 *  deletes from must be the list the delete changed, or removing one leaves
 *  its row on screen and reads as a delete that did nothing. */
export function useHolidays(forced?: string): Async<Holiday[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onHolidaysChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchHolidays(), [version], forced);
}

export function usePendingSessions(forced?: string): Async<PendingSession[]> {
  return useAsync(() => fetchPendingSessions(), [], forced);
}

/** The notification tray. One load, three kinds -- see fetchNotifications. */
export function useNotifications(forced?: string): Async<Notification[]> {
  return useAsync(() => fetchNotifications(), [], forced);
}

/**
 * The branches, each with what runs at it. Refetched whenever a branch is
 * written, for the reason useHolidays carries a version: a branch added and
 * then missing from the list it was added to reads exactly like a save that
 * did nothing.
 */
/** A course's resolved message: its own wording, or the template's. */
export function useCourseMessage(courseId: string | null, forced?: string): Async<CourseMessage | null> {
  return useAsync(
    () => (courseId ? fetchCourseMessage(courseId) : Promise.resolve(null)),
    [courseId], forced);
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
  return useAsync(() => fetchSentForPeriod(period), [period.from, period.to, version], forced);
}

/** The addresses this deployment may send as. */
export function useSenders(forced?: string): Async<string[]> {
  return useAsync(() => fetchSenders(), [], forced);
}

export function useBranchUsage(forced?: string): Async<BranchUsage[]> {
  const [version, setVersion] = useState(0);
  useEffect(() => onBranchesChanged(() => setVersion(v => v + 1)), []);
  return useAsync(() => fetchBranchUsage(), [version], forced);
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
  return useAsync(() => fetchBucketMetrics(buckets), [key], forced);
}

/** The last four weeks, most recent first. Mon–Sun, per week_start_day. */
export function useWeekRows(forced?: string): Async<WeekRow[]> {
  const weeks = [0, 1, 2, 3].map(back => {
    const d = new Date();
    d.setDate(d.getDate() - back * 7);
    return currentWeek(d);
  });
  const key = weeks.map(w => w.from).join(',');
  return useAsync(() => fetchWeekRows(weeks), [key], forced);
}
