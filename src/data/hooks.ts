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
import { currentWeek, type Period } from './period';
import {
  fetchMembers, fetchRules, fetchCourses, fetchTemplates, fetchStaff, fetchAudit,
  fetchFilterOptions, fetchMonthSessions, type Rules,
} from './repository';
import { flagged } from './followup';
import type { Member, Course, Template, Staff, AuditEntry, SessionDay } from './mock';

export type Async<T> = {
  state: ScreenState;
  data: T | null;
  /** what went wrong, in a sentence a person can act on */
  error: string | null;
  retry: () => void;
};

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
    load()
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

export function useMembers(forced?: string, period: Period = currentWeek()): Async<Member[]> {
  return useAsync(() => fetchMembers(period), [period.from, period.to], forced);
}

export function useRules(forced?: string): Async<Rules> {
  return useAsync(() => fetchRules(), [], forced);
}

/**
 * The members AND the flagged subset, from ONE fetch. Screens that show both
 * a member count and a follow-up count must read them from the same load, or
 * the two numbers can be a query apart and disagree on screen.
 */
export function useFollowUp(forced?: string, period: Period = currentWeek()):
  Async<{ members: Member[]; rules: Rules; flagged: Member[] }> {
  return useAsync(async () => {
    const [members, rules] = await Promise.all([fetchMembers(period), fetchRules()]);
    return { members, rules, flagged: flagged(members, rules.global, rules.byCourseName) };
  }, [period.from, period.to], forced);
}

export function useCourses(forced?: string): Async<Course[]> {
  return useAsync(() => fetchCourses(), [], forced);
}

export function useTemplates(forced?: string): Async<Template[]> {
  return useAsync(() => fetchTemplates(), [], forced);
}

export function useStaff(forced?: string): Async<Staff[]> {
  return useAsync(() => fetchStaff(), [], forced);
}

export function useAudit(forced?: string): Async<AuditEntry[]> {
  return useAsync(() => fetchAudit(), [], forced);
}

export function useFilterOptions(forced?: string): Async<{ branches: string[]; courses: string[] }> {
  return useAsync(() => fetchFilterOptions(), [], forced);
}

export function useMonthSessions(year: number, month: number, forced?: string): Async<SessionDay[]> {
  return useAsync(() => fetchMonthSessions(year, month), [year, month], forced);
}
