/**
 * The one place that decides where data comes from.
 *
 * When EXPO_PUBLIC_SUPABASE_URL / ANON_KEY are set, every function here
 * reads the live project through the anon key (RLS decides what comes back).
 * When they are not, it returns the fixtures in ./mock — which is the
 * offline/dev mode, and what the route harness runs against. Screens never
 * branch on which one is in play: they get the same shapes either way.
 *
 * Engine numbers always come from member_period_metrics / member_stats, the
 * same functions the reports and charts read (C-87), never from a per-screen
 * calculation.
 */
import { supabase, isConfigured } from '../lib/supabase';
import { authLookup, staffDelete } from './api';
import { phoneDigits } from './signin';
import { cleanAlias, aliasProblem, aliasSaveError, MERGE_FAILED } from './alias';
import { sentenceOpening } from './refusalCase';
import { personReadable } from './engineWording';
import { iso, joinedLabel, type Period } from './period';
import { SUBJECT_MIN, SUBJECT_MAX, BODY_MIN, COURSE_NAME_MIN, COURSE_NAME_MAX } from './message';
import { bucketFixture, type BucketMetrics } from './buckets';
import type { SentMap } from './sent';
import { currentSchedules, today } from './schedule';
import { inactiveFromProblem } from './inactiveFrom';
import { enrolledIn, endEnrolment } from './course';
import { isoWeekday, storedStatus, dayInWords } from './dayAttendance';
// One blessed reading of a removal's metadata, shared with the plain-language
// pass so the fallback name is found the same way in both places.
import { isRemoval, subjectFromMeta } from './auditPlain';
import {
  NOTIFICATION_LIMIT, orderNotifications,
  awaitingNotification, sentNotification, excludedNotification, pinResetNotification,
  type Notification,
} from './notifications';
import {
  MEMBERS, COURSE_LIST, GLOBAL_RULE, COURSE_RULES, TEMPLATES, STAFF, AUDIT, REMARKS,
  BRANCHES, COURSES, MONTH_DAYS, PENDING_SESSIONS, WEEK_ROWS, attendanceFixture,
  MANUAL_MARKS, markFixtureAttendance, resetFixtureDay, primaryEmail, sessionsFor,
  HOLIDAYS, HOLIDAY_PREVIEW, SENDERS, COURSE_MESSAGES,
  type Member, type MemberStatus, type Course, type FollowUpRule, type Template, type Staff,
  type StaffAccess, type AuditEntry, type Remark, type SessionDay, type WeekRow,
  type AttendanceRow, type AttendanceStatus, type Holiday, type MemberSession,
} from './mock';
import { memberWeek, NO_SESSIONS_ROW, type MemberWeekSession } from './memberWeek';

export const dataSource: 'live' | 'fixtures' = isConfigured ? 'live' : 'fixtures';

/**
 * What the person reading the screen is told, and what the developer needs,
 * are different things. The technical detail goes to the console; the screen
 * gets a sentence that says what failed and — just as importantly — that
 * nothing was changed by it.
 */
function fail(context: string, error: { message?: string } | null): never {
  const detail = error?.message ?? 'unknown error';
  console.error(`${context}: ${detail}`);
  const unreachable = /fetch|network|timeout|Failed to send/i.test(detail);
  throw new Error(
    unreachable
      ? 'RosiFit could not reach the academy database. Check the connection and try again — nothing has been changed.'
      : `${context}. Nothing has been changed.`
  );
}

/**
 * The engine-wording guard lives in `./engineWording` (CP-003, RC-023).
 *
 * It was a private regex here, which meant the one rule standing between an
 * operator and a raw machine string had no spec -- and it was found to have a
 * hole: it knew Postgres' wording for a broken constraint and had never heard
 * PostgREST's wording for a function that is not there. `merge_member_into` is
 * written and unapplied in production (TD-033), so the No email card answered
 * "Could not find the function public.merge_member_into(p_stray, p_target) in
 * the schema cache" to somebody who had tapped a button beside a member's
 * name. `repository.ts` cannot be imported under node, so the rule moved out
 * to where a spec can pin it (`src/data/engineWording.test.ts`).
 */

// -------------------------------------------------------------------- auth
/**
 * Whether a mobile number already has an account. Asked by Continue on the
 * sign-in screen, before any PIN.
 *
 * It lives here rather than being called straight from the screen because it
 * is the one question sign-in asks that has to be answered differently in the
 * two data sources, and CP-001 puts that decision in exactly one module.
 * Live, it goes to auth-lookup -- app_users is unreadable to `anon`, which is
 * why this cannot be a `supabase.from()` read like everything else in this
 * file. On fixtures, the STAFF rows ARE the accounts.
 *
 * It throws on failure and never answers `false` for a lookup that did not
 * happen: "no account" sends somebody to registration, and doing that because
 * the network dropped is how a staff member ends up creating a second
 * academy. The caller turns the throw into `null` for continueDestination.
 */
export async function isRegisteredNumber(digits: string): Promise<boolean> {
  if (!isConfigured) return STAFF.some(s => phoneDigits(s.phone) === digits);
  try {
    const { registered } = await authLookup(digits);
    return registered;
  } catch (err) {
    // auth-lookup's own sentences are written for the person and are kept
    // (CP-004 guarantees no raw engine string reaches here). What is NOT
    // hers to read is supabase-js's transport wording, so an unreachable
    // network is translated the way `fail` above translates it.
    const detail = err instanceof Error ? err.message : '';
    console.error(`Could not check whether that number is registered: ${detail || 'unknown error'}`);
    throw new Error(
      /fetch|network|timeout|Failed to send/i.test(detail)
        ? 'RosiFit could not reach the academy database. Check the connection and try again.'
        : detail || 'That number could not be checked. Try again.'
    );
  }
}

// ------------------------------------------------------------------ members
type MetricRow = { member_id: string; expected: number; attended: number; missed: number };

export async function fetchMembers(period: Period): Promise<Member[]> {
  // A COPY, not the fixture array itself.
  //
  // Offline this used to hand back `MEMBERS` by reference, and every write
  // below replaces an ELEMENT of it (`MEMBERS[i] = {...}`) while the array
  // keeps its identity. So a screen that narrows the list in a `useMemo`
  // keyed on it -- the course roster does, `enrolledIn(members, course)` --
  // held the member objects from before the edit and went on drawing them:
  // the toast said saved, her own record showed the change, and the roster
  // behind it did not. That is RC-008's shape again, and the live path never
  // had it because every fetch builds a fresh array.
  //
  // Shallow is enough and is the point: the elements are replaced whole, so
  // a new array is a new identity for every memo that depends on one.
  if (!isConfigured) return [...MEMBERS];

  const [membersRes, emailsRes, aliasesRes, statsRes, enrolRes, schedRes, metricsRes] = await Promise.all([
    supabase.from('members').select('id, member_code, full_name, status, inactive_from, joined_on').is('deleted_at', null).order('full_name'),
    supabase.from('member_emails').select('member_id, email, is_primary, status').is('deleted_at', null),
    supabase.from('member_aliases').select('member_id, alias_display').eq('alias_type', 'name'),
    // last_present_date DATES the streak beside it. The run was printed bare
    // ("consecutive 6") beside a weekly miss count on a five-day course, which
    // is a number a reader can neither verify nor divide by anything on
    // screen; the day it counts back to is what makes it checkable.
    supabase.from('member_stats').select('member_id, current_streak, last_present_date, last_emailed_at'),
    supabase.from('member_enrollments').select('member_id, offering_id').eq('status', 'active'),
    supabase.from('member_schedules').select('member_id, weekdays, effective_from, effective_to'),
    supabase.rpc('member_period_metrics', { p_from: period.from, p_to: period.to }),
  ]);
  if (membersRes.error) fail('Could not load members', membersRes.error);
  // Her own days are the one read here whose SILENT failure is destructive:
  // an empty result reads as "nobody has days of her own", the edit form
  // opens her row on the course's days instead of hers, and Save then ends
  // an override nobody asked to end. A failed read says so (RC-020).
  if (schedRes.error) fail('Could not load the days members have of their own', schedRes.error);

  const offeringIds = [...new Set((enrolRes.data ?? []).map(e => e.offering_id as string))];
  // `deleted_at is null` on BOTH joins below, the same filter fetchCourses
  // applies. Without it a member could resolve onto a course the course list
  // does not have -- delete_course ends her enrolment, but a row that somehow
  // stayed active would still name the deleted course, and the next course
  // created with that name would inherit her. The course list and the member
  // list have to be reading the same set of courses or they cannot agree.
  const offerings = offeringIds.length
    ? await supabase.from('course_offerings').select('id, course_id, branch_id')
        .in('id', offeringIds).is('deleted_at', null)
    : { data: [], error: null };
  const courseIds = [...new Set((offerings.data ?? []).map(o => o.course_id as string))];
  const branchIds = [...new Set((offerings.data ?? []).map(o => o.branch_id as string))];
  const [coursesRes, branchesRes] = await Promise.all([
    courseIds.length ? supabase.from('courses').select('id, name').in('id', courseIds).is('deleted_at', null) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    branchIds.length ? supabase.from('branches').select('id, name').in('id', branchIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const offeringById = new Map((offerings.data ?? []).map(o => [o.id as string, o]));
  const courseName = new Map((coursesRes.data ?? []).map(c => [c.id, c.name]));
  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id, b.name]));
  const enrolByMember = new Map((enrolRes.data ?? []).map(e => [e.member_id as string, e.offering_id as string]));
  // Her OWN days, when she has any. member_schedules is effective-dated the
  // same way offering_schedules is, so it is answered by the same tested
  // resolver -- a second copy of the window arithmetic is exactly how two
  // answers to "which version is in force" drift apart (src/data/schedule.ts).
  // The resolver keys on `offering_id`, so the member id goes in that slot.
  const ownDaysByMember = currentSchedules(
    (schedRes.data ?? []).map(sc => ({
      offering_id: sc.member_id as string,
      weekdays: (sc.weekdays as number[]) ?? [],
      effective_from: sc.effective_from as string,
      effective_to: (sc.effective_to as string | null) ?? null,
    })), today());
  const metricByMember = new Map(((metricsRes.data ?? []) as MetricRow[]).map(m => [m.member_id, m]));
  const statByMember = new Map((statsRes.data ?? []).map(s => [s.member_id as string, s]));

  const aliasesByMember = new Map<string, string[]>();
  for (const a of aliasesRes.data ?? []) {
    const list = aliasesByMember.get(a.member_id as string) ?? [];
    list.push(a.alias_display as string);
    aliasesByMember.set(a.member_id as string, list);
  }
  const emailsByMember = new Map<string, { address: string; primary: boolean }[]>();
  for (const e of emailsRes.data ?? []) {
    if (e.status === 'bounced' || e.status === 'unsubscribed') continue;
    const list = emailsByMember.get(e.member_id as string) ?? [];
    list.push({ address: e.email as string, primary: Boolean(e.is_primary) });
    emailsByMember.set(e.member_id as string, list);
  }

  return (membersRes.data ?? []).map(m => {
    const offering = offeringById.get(enrolByMember.get(m.id as string) ?? '');
    const metric = metricByMember.get(m.id as string);
    const stat = statByMember.get(m.id as string);
    return {
      id: m.id as string,
      // '' rather than '—': there is no code to show, not an unknown one
      code: (m.member_code as string) ?? '',
      name: m.full_name as string,
      course: offering ? (courseName.get(offering.course_id as string) ?? '—') : '—',
      // The id her enrolment actually points at. Carried BESIDE the name
      // because a name is not an identity: screens join on this, and print
      // that. null when she is enrolled at nothing, or at an offering whose
      // course has been deleted -- either way she belongs to no course, and
      // no course created afterwards may claim her (src/data/course.ts).
      course_id: offering
        ? (courseName.has(offering.course_id as string) ? (offering.course_id as string) : null)
        : null,
      branch: offering ? (branchName.get(offering.branch_id as string) ?? '—') : '—',
      aliases: aliasesByMember.get(m.id as string) ?? [],
      emails: emailsByMember.get(m.id as string) ?? [],
      // null, not [], for a member who has no override: the schema cannot
      // hold an empty set of own days, and the two mean opposite things to
      // update_member (src/data/memberDays.ts). Carrying it is what lets the
      // form open her day chips on the days actually in force for her.
      weekdays: ownDaysByMember.get(m.id as string)?.weekdays ?? null,
      // The column was already in the SELECT above and was already being
      // thrown away. Carrying it is what lets the app apply the same
      // `status = 'active'` filter follow_up_candidates() has always applied.
      // Anything the CHECK constraint does not know is read as inactive:
      // "not on the register" is the safe answer for an unrecognised value,
      // because it withholds mail rather than sending it.
      status: (m.status === 'active' || m.status === 'paused' ? m.status : 'inactive') as MemberStatus,
      // FROM WHEN that status applies (0044). Null on every row written
      // before it, and null goes on meaning "on every day" -- so carrying
      // the column changes no reading of any existing record, and lets the
      // roster answer a question about a past week with the fact that was
      // true in that week (src/data/inactiveFrom.ts).
      inactiveFrom: (m.inactive_from as string | null) ?? null,
      // The stored date `joined` below is the LABEL of, carried EXACTLY as
      // the column holds it. This read used to format the column and throw
      // the date away, and a month is neither comparable nor openable: the
      // Edit form refuses an inactive date that falls before she arrived and
      // cannot compare one against "Mar 2026", and its "Joined on" row came
      // up blank on every member who had a joining date.
      joinedOn: (m.joined_on as string | null) ?? null,
      expected: metric?.expected ?? 0,
      attended: metric?.attended ?? 0,
      missed: metric?.missed ?? 0,
      streak: (stat?.current_streak as number) ?? 0,
      // The session that ENDED the run above -- null when she has never been
      // present, which src/data/streak.ts states rather than papering over.
      lastPresent: (stat?.last_present_date as string | null) ?? null,
      last: stat?.last_emailed_at ? new Date(stat.last_emailed_at as string).toLocaleDateString() : '—',
      // "Mar 2026", the way the canvas writes it. A day number would be
      // precision nobody asked for under a name. Derived from the date above
      // by the one function every producer of a Member calls, so the label
      // and the date cannot disagree.
      joined: joinedLabel((m.joined_on as string | null) ?? null),
    };
  });
}

// -------------------------------------------------------------- follow-up rules
export type Rules = { global: FollowUpRule; byCourseName: Record<string, FollowUpRule> };

/**
 * A counter every reader of the rules watches, bumped by every write that can
 * move a trigger.
 *
 * The same pattern `onCoursesChanged` carries, and the same reason: the send
 * dialog and the member pop-up now CHANGE the trigger, and the list underneath
 * them is derived from it. Without this, a trigger lowered from the draft left
 * the draft listing whoever the OLD number flagged — a screen showing one rule
 * and the list of another, which is the exact disagreement guardrail 1 exists
 * to prevent. Nothing is cached here; it only says "ask again".
 */
const ruleListeners = new Set<() => void>();

export function onRulesChanged(listener: () => void): () => void {
  ruleListeners.add(listener);
  return () => { ruleListeners.delete(listener); };
}

function rulesChanged(): void {
  for (const listener of ruleListeners) listener();
}

export async function fetchRules(): Promise<Rules> {
  if (!isConfigured) {
    // The fixtures key course rules by course id; screens work in names.
    const byCourseName: Record<string, FollowUpRule> = {};
    for (const c of COURSE_LIST) {
      const rule = COURSE_RULES[c.id];
      if (rule) byCourseName[c.name] = rule;
    }
    return { global: GLOBAL_RULE, byCourseName };
  }

  const [globalRes, courseRes, coursesRes] = await Promise.all([
    supabase.from('follow_up_config')
      .select('weekly_enabled, weekly_threshold, consecutive_enabled, consecutive_threshold, combination')
      .eq('is_active', true).maybeSingle(),
    supabase.from('course_follow_up_config')
      .select('course_id, weekly_enabled, weekly_threshold, consecutive_enabled, consecutive_threshold, combination')
      .eq('is_active', true),
    supabase.from('courses').select('id, name').is('deleted_at', null),
  ]);
  if (globalRes.error) fail('Could not load the follow-up rule', globalRes.error);

  const nameById = new Map((coursesRes.data ?? []).map(c => [c.id as string, c.name as string]));
  const byCourseName: Record<string, FollowUpRule> = {};
  for (const r of courseRes.data ?? []) {
    const name = nameById.get(r.course_id as string);
    if (!name) continue;
    byCourseName[name] = {
      source: 'course',
      weekly_enabled: r.weekly_enabled as boolean, weekly_threshold: r.weekly_threshold as number,
      consecutive_enabled: r.consecutive_enabled as boolean, consecutive_threshold: r.consecutive_threshold as number,
      combination: r.combination as 'OR' | 'AND',
    };
  }
  const g = globalRes.data;
  return {
    global: g
      ? {
          source: 'global',
          weekly_enabled: g.weekly_enabled as boolean, weekly_threshold: g.weekly_threshold as number,
          consecutive_enabled: g.consecutive_enabled as boolean,
          consecutive_threshold: g.consecutive_threshold as number,
          combination: g.combination as 'OR' | 'AND',
        }
      : GLOBAL_RULE,
    byCourseName,
  };
}

// ------------------------------------------------------------------ courses
export async function fetchCourses(): Promise<Course[]> {
  if (!isConfigured) return COURSE_LIST;

  const [coursesRes, offeringsRes, branchesRes, schedulesRes] = await Promise.all([
    supabase.from('courses')
      .select('id, name, default_start_time, default_end_time, default_frequency')
      .is('deleted_at', null).order('name'),
    supabase.from('course_offerings').select('id, course_id, branch_id').is('deleted_at', null),
    supabase.from('branches').select('id, name').is('deleted_at', null),
    supabase.from('offering_schedules').select('offering_id, weekdays, effective_from, effective_to'),
  ]);
  if (coursesRes.error) fail('Could not load courses', coursesRes.error);

  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id as string, b.name as string]));
  // The version in force today, per offering. One shared, tested resolver --
  // this and fetchOfferings each carried their own copy of the window
  // arithmetic and had to agree with each other by hand.
  const weekdaysByOffering = currentSchedules(
    (schedulesRes.data ?? []).map(s => ({
      offering_id: s.offering_id as string,
      weekdays: (s.weekdays as number[]) ?? [],
      effective_from: s.effective_from as string,
      effective_to: (s.effective_to as string | null) ?? null,
    })), today());

  return (coursesRes.data ?? []).map(c => ({
    id: c.id as string,
    name: c.name as string,
    start_time: (c.default_start_time as string | null)?.slice(0, 5) ?? null,
    end_time: (c.default_end_time as string | null)?.slice(0, 5) ?? null,
    frequency: (c.default_frequency as number | null) ?? null,
    offerings: (offeringsRes.data ?? [])
      .filter(o => o.course_id === c.id)
      .map(o => ({
        // the id travels with the offering: enrolling a member names the
        // course AT a branch, and that is this row, not the course
        id: o.id as string,
        branch: branchName.get(o.branch_id as string) ?? '—',
        weekdays: weekdaysByOffering.get(o.id as string)?.weekdays ?? [],
      })),
  }));
}

/**
 * Adding or renaming a course.
 *
 * This is a DIRECT write, not an Edge Function, and deliberately so: 0005
 * gives `authenticated` INSERT and UPDATE on public.courses behind an RLS
 * policy of `is_super_admin() and is_subscription_writable()`, and the
 * audit_courses trigger records who changed what either way. There is
 * nothing an Edge Function would add here except a second place for the
 * rule to drift.
 *
 * Because the policy is the gate, a refusal is what a staff member who is
 * not the super admin gets — and it must be SAID, not swallowed. The screen
 * that calls this previously flashed "saved" unconditionally and never wrote
 * anything at all, which is the defect this function exists to close.
 */
/**
 * A write has to reach the LIST, not just the database.
 *
 * Without this, adding a course succeeded and the Courses tab still showed
 * the set it fetched when it mounted -- indistinguishable, on screen, from
 * the save having done nothing, which is the very complaint this work
 * started from. The tab stays mounted behind the edit screen, so returning
 * to it is not a remount and refetches nothing on its own.
 *
 * A counter every useCourses reads, bumped by every course write. Not a
 * cache: nothing is stored here, it only says "ask again".
 */
const courseListeners = new Set<() => void>();

export function onCoursesChanged(listener: () => void): () => void {
  courseListeners.add(listener);
  return () => { courseListeners.delete(listener); };
}

function coursesChanged(): void {
  for (const listener of courseListeners) listener();
}

export type CourseInput = {
  name: string;
  /** 'HH:MM' or null. A DEFAULT for new offerings only (CR-06) — writing it
   *  never touches an offering that already exists. */
  start_time: string | null;
  end_time: string | null;
  /** stated intent (C-59); the engine never reads it */
  frequency: number | null;
};

/** RLS and the CHECK constraints answer in Postgres' words. These are the ones
 *  a person can actually act on, so they are translated; anything else keeps
 *  the database's own message rather than a guess at what it meant -- unless
 *  the database GENERATED it, which personReadable() tells apart (CP-003). */
function courseWriteError(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === '42501' || /row-level security/i.test(message)) {
    // 0050: NOT a role any more. Staff own the courses the register is kept
    // for, so a 42501 here can only mean the account is inactive or the
    // subscription has lapsed -- and naming the super admin would send a staff
    // member looking for a permission she already has.
    return 'A course can only be saved by an active account, and only while the subscription is active. Nothing has been saved.';
  }
  if (code === '23505' || /courses_name_live/.test(message)) {
    return 'A course with this name already exists. Nothing has been saved.';
  }
  if (/default_end_time|courses_check/.test(message)) {
    return 'The end time must be after the start time. Nothing has been saved.';
  }
  if (/courses_name_check/.test(message)) {
    return `A course name needs between ${COURSE_NAME_MIN} and ${COURSE_NAME_MAX} characters. Nothing has been saved.`;
  }
  return `${personReadable(message, 'The course could not be saved')}. Nothing has been saved.`;
}

export async function createCourse(input: CourseInput): Promise<Course> {
  if (!isConfigured) {
    // Offline the list IS the store, so the new course has to land in it or
    // the screen would say "saved" over a list that never changed -- the
    // same lie, moved one layer down.
    const course: Course = {
      id: `local-${Date.now()}`, name: input.name,
      start_time: input.start_time, end_time: input.end_time,
      frequency: input.frequency, offerings: [],
    };
    COURSE_LIST.push(course);
    coursesChanged();
    return course;
  }

  const { data, error } = await supabase.from('courses')
    .insert({
      name: input.name,
      default_start_time: input.start_time,
      default_end_time: input.end_time,
      default_frequency: input.frequency,
    })
    .select('id, name, default_start_time, default_end_time, default_frequency')
    .single();
  if (error || !data) {
    console.error('createCourse:', error?.message ?? 'no row returned');
    throw new Error(courseWriteError(error));
  }

  coursesChanged();
  return {
    id: data.id as string,
    name: data.name as string,
    start_time: (data.default_start_time as string | null)?.slice(0, 5) ?? null,
    end_time: (data.default_end_time as string | null)?.slice(0, 5) ?? null,
    frequency: (data.default_frequency as number | null) ?? null,
    offerings: [],
  };
}

export async function updateCourse(id: string, input: CourseInput): Promise<void> {
  if (!isConfigured) {
    const course = COURSE_LIST.find(c => c.id === id);
    if (course) Object.assign(course, input);
    coursesChanged();
    return;
  }

  const { data, error } = await supabase.from('courses')
    .update({
      name: input.name,
      default_start_time: input.start_time,
      default_end_time: input.end_time,
      default_frequency: input.frequency,
    })
    .eq('id', id)
    .select('id');
  if (error) {
    console.error('updateCourse:', error.message);
    throw new Error(courseWriteError(error));
  }
  // RLS refuses an UPDATE by returning NO ROWS, not an error. Without this
  // the screen would report a save that the policy silently declined.
  if (!data || data.length === 0) {
    // 0050: the policy is is_active_app_user(), not is_super_admin().
    throw new Error('That course could not be changed — an active account may, and only while the subscription is active. Nothing has been saved.');
  }
  coursesChanged();
}

/** What a deletion actually did, so the toast can say it rather than guess. */
export type CourseDeletion = {
  name: string | null;
  offerings: number;
  sessionsRemoved: number;
  attendanceRemoved: number;
  importsRemoved: number;
  enrolmentsRemoved: number;
  membersRecomputed: number;
  alreadyDeleted: boolean;
};

/**
 * What a deletion WOULD destroy, before anybody confirms it.
 *
 * The confirmation used to state a promise it could keep without asking
 * anything -- "attendance history stays". Since 0047 it can promise nothing,
 * so it states a quantity instead, and the courses read holds none of these
 * numbers: it carries offerings and a roster, never sessions or attendance.
 * Read-only, and gated exactly as the deletion is.
 */
export type CourseDeletionPreview = {
  name: string | null;
  offerings: number;
  /** distinct PEOPLE, not enrolment rows -- one member at two branches is one member */
  membersEnrolled: number;
  sessions: number;
  sessionsCompleted: number;
  attendanceRecords: number;
  imports: number;
  alreadyDeleted: boolean;
};

export async function courseDeletionPreview(id: string): Promise<CourseDeletionPreview> {
  if (!isConfigured) {
    // The fixture store holds courses and a roster and nothing that happened
    // on a day, so the honest offline count of sessions and attendance is
    // zero -- that IS what deleting from this device destroys.
    const course = COURSE_LIST.find(c => c.id === id);
    if (!course) {
      return { name: null, offerings: 0, membersEnrolled: 0, sessions: 0,
               sessionsCompleted: 0, attendanceRecords: 0, imports: 0, alreadyDeleted: true };
    }
    return {
      name: course.name, offerings: course.offerings.length,
      membersEnrolled: enrolledIn(MEMBERS, course).length,
      sessions: 0, sessionsCompleted: 0, attendanceRecords: 0, imports: 0,
      alreadyDeleted: false,
    };
  }
  const { data, error } = await supabase.rpc('course_deletion_preview', { p_course_id: id });
  if (error) {
    console.error('courseDeletionPreview:', error.message);
    throw new Error(`${personReadable(error.message, 'What this deletion would remove could not be counted')}. Nothing has been changed.`);
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    name: (r.name as string | null) ?? null,
    offerings: Number(r.offerings ?? 0),
    membersEnrolled: Number(r.members_enrolled ?? 0),
    sessions: Number(r.sessions ?? 0),
    sessionsCompleted: Number(r.sessions_completed ?? 0),
    attendanceRecords: Number(r.attendance_records ?? 0),
    imports: Number(r.imports ?? 0),
    alreadyDeleted: Boolean(r.already_deleted),
  };
}

/**
 * Deleting a course, as ONE call.
 *
 * An RPC and not a direct write, and not by preference: a client cannot reach
 * sessions or attendance at all (0007 grants authenticated `update (status,
 * cancellation_reason)` on sessions and nothing else), and most of the
 * foreign keys between these tables are NO ACTION, so the deletion has to run
 * children-first in one transaction at a level that can reach all of them.
 *
 * public.delete_course is a HARD delete since 0047, by the repo owner's
 * decision (requests/2026-09-08-hard-delete-course.md): the course, its
 * offerings, every session including completed ones, their expectations and
 * attendance records, the enrolments and the import records all leave the
 * database. Members survive; only their enrolment in THIS course goes. 0020's
 * promise that history stayed is withdrawn, and the confirmation says so.
 */
export async function deleteCourse(id: string): Promise<CourseDeletion> {
  if (!isConfigured) {
    const at = COURSE_LIST.findIndex(c => c.id === id);
    if (at < 0) {
      return { name: null, offerings: 0, sessionsRemoved: 0, attendanceRemoved: 0,
               importsRemoved: 0, enrolmentsRemoved: 0, membersRecomputed: 0,
               alreadyDeleted: true };
    }
    const [course] = COURSE_LIST.splice(at, 1);
    // Offline the arrays ARE the store, so the deletion has to do to them
    // what delete_course does to the tables: take the enrolment away. Leaving
    // the members pointing at the course that has just gone is how the next
    // course created with this name inherited them -- the defect this whole
    // path exists to close. Matched on the course's id, so a course that
    // merely SHARES the name keeps its own roster. The fixture store has no
    // enrolment ROW to delete -- a member carries her course as a field --
    // so clearing that field is the whole of the deletion here.
    const ended = enrolledIn(MEMBERS, course);
    // In place: the exported array IS the store, and every screen already
    // holds a reference to it. The RULE for what ending an enrolment leaves
    // behind lives in one tested place, so this path and the live one cannot
    // come to different answers about what she belongs to afterwards.
    for (const m of ended) Object.assign(m, endEnrolment(m, course.id));
    coursesChanged();
    // Her enrolment changed, so the MEMBER lists have to hear about it too.
    // Without this the Courses tab refetched its courses and went on reading
    // the member list it loaded before the deletion -- every screen still
    // holding the deleted course's roster in memory, ready to hand it to the
    // next course of that name.
    membersChanged();
    return {
      name: course.name, offerings: course.offerings.length,
      sessionsRemoved: 0, attendanceRemoved: 0, importsRemoved: 0,
      enrolmentsRemoved: ended.length, membersRecomputed: ended.length,
      alreadyDeleted: false,
    };
  }

  const { data, error } = await supabase.rpc('delete_course', { p_course_id: id });
  if (error) {
    console.error('deleteCourse:', error.message);
    // 0038 opened this to any active user, so the refusal left to map is the
    // SUBSCRIPTION one. The role half of the pattern stays because a database
    // still running 0020 raises the old wording, and a person reading a stale
    // deployment should get a sentence rather than a Postgres string.
    if (/only the super admin|only a signed-in|not writable/i.test(error.message)) {
      throw new Error('That course could not be deleted — the subscription has to be active. Nothing has been changed.');
    }
    throw new Error(`${personReadable(error.message, 'The course could not be deleted')}. Nothing has been changed.`);
  }
  coursesChanged();
  // delete_course removes every enrolment on the course's offerings and
  // rebuilds member_stats for the people it touched, so this is a member
  // write as much as a course write and both lists have to be re-read.
  // Announcing only the course list left the members cached as they were a
  // moment ago -- still naming the deleted course -- which is what put its
  // counts on the next course created with the same name.
  membersChanged();

  const r = (data ?? {}) as Record<string, unknown>;
  return {
    name: (r.name as string | null) ?? null,
    offerings: Number(r.offerings ?? 0),
    sessionsRemoved: Number(r.sessions_removed ?? 0),
    attendanceRemoved: Number(r.attendance_removed ?? 0),
    importsRemoved: Number(r.imports_removed ?? 0),
    enrolmentsRemoved: Number(r.enrolments_removed ?? 0),
    membersRecomputed: Number(r.members_recomputed ?? 0),
    alreadyDeleted: Boolean(r.already_deleted),
  };
}

// ----------------------------------------------------------------- offerings
/**
 * An OFFERING is the course at one branch -- the thing that actually runs --
 * and its SCHEDULE is the weekdays it runs on. 0005 calls offering_schedules
 * *** THE source of expected attendance ***, and until 0018 there was no way
 * for the app to write one: the table carries a read policy and, on purpose,
 * no INSERT/UPDATE policy at all. So a course could state a frequency and
 * never acquire the days that frequency is an intent ABOUT.
 *
 * Offerings are inserted directly (0005 grants that to the super admin behind
 * `is_super_admin() and is_subscription_writable()`); the SCHEDULE goes
 * through set_offering_schedule, which is the only path that exists.
 */
export type Branch = { id: string; name: string };

export async function fetchBranches(): Promise<Branch[]> {
  if (!isConfigured) {
    return BRANCHES.filter(b => b !== 'All branches')
      .map(name => ({ id: `local-branch-${name.toLowerCase()}`, name }));
  }
  const { data, error } = await supabase.from('branches')
    .select('id, name').is('deleted_at', null).order('name');
  if (error) fail('The branch list could not be loaded', error);
  return (data ?? []).map(b => ({ id: b.id as string, name: b.name as string }));
}

/* ------------------------------------------------------- branches, written
 *
 * More offered a "Branches" row that flashed the names in a toast and went
 * nowhere: the canvas gives it a screen that adds one, counts what runs at
 * each, and removes one. Adding and removing are ordinary writes through the
 * policies 0005 already states (`is_super_admin() and
 * is_subscription_writable()`); 0019 supplies the two things a client must
 * not decide for itself -- the unique `code`, derived from the name, and the
 * refusal to remove a branch anything still points at.
 */

const branchListeners = new Set<() => void>();

export function onBranchesChanged(listener: () => void): () => void {
  branchListeners.add(listener);
  return () => { branchListeners.delete(listener); };
}

function branchesChanged(): void {
  for (const listener of branchListeners) listener();
}

/** A branch with the two counts the screen states before offering a delete. */
export type BranchUsage = Branch & { courses: number; members: number };

/**
 * The branches AND what runs at each, from ONE load -- the same reason
 * useFollowUp reads members and the flagged subset together. A count fetched
 * separately from the row it labels can be a query apart from it, and the
 * delete guard is stated FROM that count.
 */
export async function fetchBranchUsage(): Promise<BranchUsage[]> {
  if (!isConfigured) {
    // the same literal fetchBranches filters on -- ALL_BRANCHES lives in
    // src/state, which reads FROM this file
    return BRANCHES.filter(b => b !== 'All branches').map(name => ({
      id: `local-branch-${name.toLowerCase()}`,
      name,
      courses: COURSE_LIST.filter(c => c.offerings.some(o => o.branch === name)).length,
      members: MEMBERS.filter(m => m.branch === name).length,
    }));
  }

  const [branchesRes, offeringsRes, enrolRes] = await Promise.all([
    supabase.from('branches').select('id, name').is('deleted_at', null).order('name'),
    supabase.from('course_offerings').select('id, course_id, branch_id').is('deleted_at', null),
    supabase.from('member_enrollments').select('member_id, offering_id').eq('status', 'active'),
  ]);
  if (branchesRes.error) fail('The branch list could not be loaded', branchesRes.error);

  // A course running at a branch twice is ONE course there, so the count is of
  // distinct courses rather than of offerings -- the row reads "2 courses",
  // and two offerings of the same course would otherwise make that say 2 when
  // the person can name only one.
  const coursesAt = new Map<string, Set<string>>();
  const offeringBranch = new Map<string, string>();
  for (const o of offeringsRes.data ?? []) {
    const branchId = o.branch_id as string;
    offeringBranch.set(o.id as string, branchId);
    const set = coursesAt.get(branchId) ?? new Set<string>();
    set.add(o.course_id as string);
    coursesAt.set(branchId, set);
  }

  const membersAt = new Map<string, Set<string>>();
  for (const e of enrolRes.data ?? []) {
    const branchId = offeringBranch.get(e.offering_id as string);
    if (!branchId) continue;
    const set = membersAt.get(branchId) ?? new Set<string>();
    set.add(e.member_id as string);
    membersAt.set(branchId, set);
  }

  return (branchesRes.data ?? []).map(b => ({
    id: b.id as string,
    name: b.name as string,
    courses: coursesAt.get(b.id as string)?.size ?? 0,
    members: membersAt.get(b.id as string)?.size ?? 0,
  }));
}

/** RLS and the two constraints 0019 adds answer in Postgres' own words.
 *  These are the ones a person can act on; anything else keeps the database's
 *  message rather than a guess at what it meant -- unless the database was
 *  generating it rather than writing it, which is what personReadable() tells
 *  apart (CP-003, RC-023). */
function branchWriteError(error: { code?: string; message?: string } | null, verb: string): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return `Only the super admin can ${verb} a branch, and only while the subscription is active. Nothing has been changed.`;
  }
  if (code === '23505' || /branches_name_live/.test(message)) {
    return 'A branch with this name already exists. Nothing has been changed.';
  }
  if (/still runs|is the scope of/.test(message)) {
    // 0019 names the count in its own message, which is more use than a
    // sentence written here that has to guess at it.
    return `${message}. Nothing has been changed.`;
  }
  if (/length\(btrim/.test(message)) {
    return 'A branch needs a name of at least two characters. Nothing has been changed.';
  }
  return `${personReadable(message, 'The branch could not be saved')}. Nothing has been changed.`;
}

export async function createBranch(name: string): Promise<void> {
  if (!isConfigured) {
    // Offline the array IS the store, so the branch has to land in it or the
    // screen would report an addition over a list that never changed.
    if (BRANCHES.some(b => b.toLowerCase() === name.toLowerCase())) {
      throw new Error('A branch with this name already exists. Nothing has been changed.');
    }
    BRANCHES.push(name);
    branchesChanged();
    return;
  }

  // `code` is deliberately absent: 0019 derives it from the name, so two
  // clients adding at once cannot pick the same one.
  const { error } = await supabase.from('branches').insert({ name });
  if (error) {
    console.error('createBranch:', error.message);
    throw new Error(branchWriteError(error, 'add'));
  }
  branchesChanged();
}

/**
 * Removal is a soft delete -- deleted_at, the column every read already
 * filters on -- not a DELETE. course_offerings.branch_id and
 * holidays.branch_id reference the row with no ON DELETE clause, so a hard
 * delete is refused by the foreign key anyway; and keeping the row is what
 * lets a past session still name the branch it happened at.
 */
export async function removeBranch(id: string, name: string): Promise<void> {
  if (!isConfigured) {
    const at = BRANCHES.indexOf(name);
    if (at >= 0) BRANCHES.splice(at, 1);
    branchesChanged();
    return;
  }

  const { data, error } = await supabase.from('branches')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id).is('deleted_at', null).select('id');
  if (error) {
    console.error('removeBranch:', error.message);
    throw new Error(branchWriteError(error, 'remove'));
  }
  // RLS refuses an UPDATE by matching NO ROWS rather than by erroring -- the
  // same shape that let updateCourse report a save the policy had declined.
  if (!data || data.length === 0) {
    throw new Error(`${name} could not be removed — only the super admin may, and only while the subscription is active. Nothing has been changed.`);
  }
  branchesChanged();
}

export type OfferingDetail = {
  id: string;
  branch_id: string;
  branch: string;
  start_time: string | null;
  end_time: string | null;
  /** the schedule in force today; empty means this offering has none yet */
  weekdays: number[];
  effective_from: string | null;
};

export async function fetchOfferings(courseId: string): Promise<OfferingDetail[]> {
  if (!isConfigured) {
    const course = COURSE_LIST.find(c => c.id === courseId);
    return (course?.offerings ?? []).map(o => ({
      id: o.id,
      branch_id: `local-branch-${o.branch.toLowerCase()}`,
      branch: o.branch,
      start_time: course?.start_time ?? null,
      end_time: course?.end_time ?? null,
      weekdays: o.weekdays,
      effective_from: null,
    }));
  }

  const [offeringsRes, branchesRes, schedulesRes] = await Promise.all([
    supabase.from('course_offerings')
      .select('id, branch_id, start_time, end_time')
      .eq('course_id', courseId).is('deleted_at', null),
    supabase.from('branches').select('id, name').is('deleted_at', null),
    supabase.from('offering_schedules')
      .select('offering_id, weekdays, effective_from, effective_to'),
  ]);
  if (offeringsRes.error) fail('The offerings could not be loaded', offeringsRes.error);

  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id as string, b.name as string]));
  // the version in force TODAY -- the same resolver fetchCourses reads, so the
  // Courses tab and this screen cannot disagree about an offering's days
  const current = currentSchedules(
    (schedulesRes.data ?? []).map(sc => ({
      offering_id: sc.offering_id as string,
      weekdays: (sc.weekdays as number[]) ?? [],
      effective_from: sc.effective_from as string,
      effective_to: (sc.effective_to as string | null) ?? null,
    })), today());

  return (offeringsRes.data ?? []).map(o => ({
    id: o.id as string,
    branch_id: o.branch_id as string,
    branch: branchName.get(o.branch_id as string) ?? '—',
    start_time: (o.start_time as string | null)?.slice(0, 5) ?? null,
    end_time: (o.end_time as string | null)?.slice(0, 5) ?? null,
    weekdays: current.get(o.id as string)?.weekdays ?? [],
    effective_from: current.get(o.id as string)?.effective_from ?? null,
  }));
}

export type OfferingInput = {
  course_id: string;
  branch_id: string;
  start_time: string | null;
  end_time: string | null;
};

function offeringWriteError(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === '42501' || /row-level security/i.test(message)) {
    // 0050: course_offerings_insert is is_active_app_user() now.
    return 'An offering can only be added by an active account, and only while the subscription is active. Nothing has been saved.';
  }
  if (code === '23505' || /offerings_unique_live/.test(message)) {
    return 'This course already runs at that branch. Edit that offering instead of adding a second one.';
  }
  return `${personReadable(message, 'The offering could not be saved')}. Nothing has been saved.`;
}

export async function createOffering(input: OfferingInput): Promise<string> {
  if (!isConfigured) {
    const course = COURSE_LIST.find(c => c.id === input.course_id);
    if (!course) throw new Error('That course no longer exists. Nothing has been saved.');
    const branch = input.branch_id.replace('local-branch-', '');
    const id = `local-offering-${Date.now()}`;
    course.offerings.push({
      id,
      branch: branch.charAt(0).toUpperCase() + branch.slice(1),
      weekdays: [],
    });
    coursesChanged();
    return id;
  }

  const { data, error } = await supabase.from('course_offerings')
    .insert({
      course_id: input.course_id,
      branch_id: input.branch_id,
      start_time: input.start_time,
      end_time: input.end_time,
    })
    .select('id')
    .single();
  if (error || !data) {
    console.error('createOffering:', error?.message ?? 'no row returned');
    throw new Error(offeringWriteError(error));
  }
  coursesChanged();
  return data.id as string;
}

/**
 * The ONLY write path to offering_schedules (0018). Its refusals are written
 * for an operator -- "this offering has a completed session on 6 Oct, so a
 * schedule cannot start on or before it" -- so they are surfaced as-is rather
 * than flattened into a generic failure.
 */
export async function setOfferingSchedule(
  offeringId: string, weekdays: number[], effectiveFrom: string,
): Promise<void> {
  if (!isConfigured) {
    for (const course of COURSE_LIST) {
      const offering = course.offerings.find(o => o.id === offeringId);
      if (offering) { offering.weekdays = [...weekdays].sort((a, b) => a - b); break; }
    }
    coursesChanged();
    return;
  }

  const { error } = await supabase.rpc('set_offering_schedule', {
    p_offering_id: offeringId,
    p_weekdays: weekdays,
    p_effective_from: effectiveFrom,
    p_note: null,
  });
  if (error) {
    console.error('setOfferingSchedule:', error.message);
    throw new Error(`${personReadable(error.message ?? '', 'The schedule could not be saved')}. Nothing has been saved.`);
  }
  coursesChanged();
}

// ---------------------------------------------------------------- templates
export async function fetchTemplates(): Promise<Template[]> {
  if (!isConfigured) return TEMPLATES;

  const { data, error } = await supabase.from('email_templates')
    .select('id, name, subject, body_text, is_active').order('name');
  if (error) fail('Could not load templates', error);

  return (data ?? []).map(t => ({
    id: t.id as string,
    name: t.name as string,
    subject: t.subject as string,
    body: t.body_text as string,
    active: Boolean(t.is_active),
    // the canvas glyph is a presentation detail with no column of its own
    icon: 'favorite',
    preview: (t.body_text as string).split('\n').find(Boolean) ?? '',
  }));
}

/* ------------------------------------------------- a course's own message
 *
 * The canvas edits a course's sender, template and exact wording INSIDE the
 * course form. 0021 stores it; effective_course_message() resolves it -- the
 * course's words where it has any, the template's where it has not.
 *
 * ONE resolver, read by the form's preview, the read-only send draft and the
 * batch alike, for the same reason effective_follow_up_config() exists for
 * the counting rule: three places deciding what a course says is three places
 * for them to disagree.
 */

/**
 * The addresses this deployment may send AS.
 *
 * OPEN GAP -- the schema has nowhere to put one.
 * This used to read `app_settings.reply_to_email` and lead the list with it.
 * No migration has ever created that column: PostgREST answered 400 every
 * time the Add/Edit Course dialog opened, the error went into a discarded
 * destructure, and `configured` was therefore always null. So the live app
 * has only ever offered SENDERS -- two FIXTURE addresses -- as the from-
 * address for a real course.
 *
 * AMENDED 07-Sep-2026. The two addresses are no longer fictitious: SENDERS
 * now reads support@getfit.rosifit.com / support@getfit.ravisfit.com, and
 * both domains are verified identities in SES, so either is sendable. The
 * bounce-every-message half of this gap is therefore closed. What remains is
 * that the list is HARDCODED -- adding or changing an address is a code
 * change, not a setting -- and that save_course stores the pick while
 * send-followups sends as SES_FROM_ADDRESS regardless, so the per-course
 * choice does not yet reach SES.
 *
 * Deliberately NOT repointed at another column: `app_settings` carries
 * `sender_name` and no address at all, so there is nothing truthful to read.
 * Closing this is a migration plus a settings field, not a one-line fix, and
 * inventing a column name here would put the silent 400 back.
 */
export async function fetchSenders(): Promise<string[]> {
  return SENDERS;
}

export type CourseMessage = {
  /** 'course' = its own wording, 'template' = the one it names, 'default' = neither chosen yet */
  source: 'course' | 'template' | 'default';
  from_email: string | null;
  template_id: string;
  template_name: string;
  subject: string;
  body: string;
};

export async function fetchCourseMessage(courseId: string): Promise<CourseMessage> {
  if (!isConfigured) {
    const local = COURSE_MESSAGES[courseId];
    const template = TEMPLATES.find(t => t.id === local?.template_id) ?? TEMPLATES[0];
    return {
      source: local?.subject || local?.body ? 'course' : local ? 'template' : 'default',
      from_email: local?.from_email ?? null,
      template_id: template.id,
      template_name: template.name,
      subject: local?.subject || template.subject,
      body: local?.body || template.body,
    };
  }

  const { data, error } = await supabase.rpc('effective_course_message', { p_course_id: courseId });
  if (error) fail("Could not load this course's message", error);
  const row = (data ?? [])[0] as {
    source: string; from_email: string | null; template_id: string;
    template_name: string; subject: string; body_text: string;
  } | undefined;
  if (!row) {
    // No default template configured at all. Saying so beats an empty form
    // that looks like a course with nothing to say.
    throw new Error('No message template is configured, so a course has no wording to start from.');
  }
  return {
    source: row.source as CourseMessage['source'],
    from_email: row.from_email,
    template_id: row.template_id,
    template_name: row.template_name,
    subject: row.subject,
    body: row.body_text,
  };
}

export type SaveCourseInput = {
  /** null creates; an id edits that course in place */
  id: string | null;
  name: string;
  branch_id: string;
  /** 1 = Monday .. 7 = Sunday. At least one, or nothing is expected of anyone. */
  weekdays: number[];
  rule: 'week' | 'consec';
  /** how many missed sessions trigger the follow-up. 1..7 (0030) — a week has
   *  seven days, so a weekly threshold above seven can never fire, and one
   *  below one would flag a member who has missed nothing. */
  threshold: number;
  from_email: string;
  template_id: string;
  /** empty means "use the template's" -- stored as NULL, which is what lets
   *  Reset work and stops an untouched course holding a stale copy */
  subject: string;
  body: string;
};

function courseSaveError(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === '42501' || /only the super admin|row-level security/i.test(message)) {
    // 0050: save_course asks is_active_app_user(). The `only the super admin`
    // arm of the test stays because a project that has not had 0050 applied
    // yet still raises those words, and this sentence is the honest reading of
    // both: something about the ACCOUNT, not about the role.
    return 'A course can only be saved by an active account, and only while the subscription is active. Nothing has been saved.';
  }
  if (/at least one frequency day/.test(message)) {
    return 'A course needs at least one frequency day, or nothing is expected of anyone. Nothing has been saved.';
  }
  if (code === '23505' || /courses_name_live/.test(message)) {
    return 'A course with this name already exists. Nothing has been saved.';
  }
  if (/completed session/.test(message)) {
    // set_offering_schedule's own refusal, which names the date -- more use
    // than a sentence written here that has to guess at it.
    return `${message}. Nothing has been saved.`;
  }
  /* The wording bounds (0021). The FORM refuses to offer Save without these
     now (app/course/edit.tsx), so reaching them means something got past it --
     a course saved by another route, or a bound that moved. Either way the
     person reads the rule rather than the constraint carrying it. RC-023. */
  if (/course_communication_subject_check/.test(message)) {
    return `The subject needs between ${SUBJECT_MIN} and ${SUBJECT_MAX} characters, or none at all to use the template's. Nothing has been saved.`;
  }
  if (/courses_name_check/.test(message)) {
    return `A course name needs between ${COURSE_NAME_MIN} and ${COURSE_NAME_MAX} characters. Nothing has been saved.`;
  }
  if (/course_communication_body_text_check/.test(message)) {
    return `The message needs at least ${BODY_MIN} characters, or none at all to use the template's. Nothing has been saved.`;
  }
  return `${personReadable(message, 'The course could not be saved')}. Nothing has been saved.`;
}

/**
 * The whole Add/Edit Course dialog, as ONE call.
 *
 * Seven fields land in five tables and offering_schedules has no direct write
 * policy at all, so this goes through save_course (0022) rather than being
 * sequenced here. A failure half way through a client-side sequence leaves a
 * course with no offering, or an offering with no schedule -- expected at no
 * session, in no follow-up list, counted by nobody.
 */
export async function saveCourse(input: SaveCourseInput): Promise<{ id: string; created: boolean }> {
  if (!isConfigured) {
    const existing = input.id ? COURSE_LIST.find(c => c.id === input.id) : undefined;
    const id = existing?.id ?? `local-${Date.now()}`;
    const branch = BRANCHES.find(b => `local-branch-${b.toLowerCase()}` === input.branch_id)
      ?? input.branch_id;
    const course: Course = {
      id, name: input.name,
      start_time: null, end_time: null, frequency: input.weekdays.length,
      offerings: [{ id: `local-offering-${id}`, branch, weekdays: [...input.weekdays].sort() }],
    };
    if (existing) Object.assign(existing, course); else COURSE_LIST.push(course);
    COURSE_MESSAGES[id] = {
      from_email: input.from_email, template_id: input.template_id,
      subject: input.subject.trim(), body: input.body.trim(),
    };
    coursesChanged();
    return { id, created: !existing };
  }

  const { data, error } = await supabase.rpc('save_course', {
    p_name: input.name.trim(),
    p_threshold: input.threshold,
    p_branch_id: input.branch_id,
    p_weekdays: [...new Set(input.weekdays)].sort((a, b) => a - b),
    p_rule: input.rule,
    p_from_email: input.from_email,
    p_template_id: input.template_id,
    p_subject: input.subject.trim() || null,
    p_body_text: input.body.trim() || null,
    p_course_id: input.id,
  });
  if (error) {
    console.error('saveCourse:', error.message);
    throw new Error(courseSaveError(error));
  }
  coursesChanged();
  rulesChanged();
  const result = data as { course_id: string; created: boolean };
  return { id: result.course_id, created: result.created };
}

/**
 * THE FOLLOW-UP TRIGGER ALONE, changed from the screen that acts on it
 * (requests/2026-09-08-follow-up-trigger-on-send-and-reach-out.md).
 *
 * WHY THIS GOES THROUGH save_course AND NOT A NEW RPC
 * `course_follow_up_config` has no direct write policy — 0009 grants the table
 * nothing an anon or authenticated client can use, deliberately, because the
 * rule decides who receives email. `save_course` (0022, threshold since 0030)
 * is the ONE audited, permission-checked path into that column, and it already
 * writes exactly the row this needs. A second path would mean a migration, a
 * second set of permission checks to keep in step with 0050, and a second place
 * for the 1..7 bound to be enforced — three ways for the two to drift, to save
 * one round trip.
 *
 * SO EVERY OTHER FIELD IS READ AND PASSED BACK UNCHANGED. That is the whole
 * risk of reusing it, and it is handled field by field:
 *   - name: the course's own, re-sent verbatim.
 *   - branch and days: the offering's, from `fetchOfferings` — and 0040 means
 *     an unchanged day list opens NO new schedule version, so this cannot trip
 *     the completed-session guard the way an unconditional save once did.
 *   - wording: '' whenever the course does not hold its OWN subject and body.
 *     `save_course` stores `nullif(btrim(...), '')`, so empty keeps the course
 *     on its template — sending the template's rendered words back would copy
 *     them onto the course as an override nobody asked for, and Reset in the
 *     course form would then have nothing to reset to.
 *   - rule: 'week', the only trigger the app offers. A course still stored as
 *     consecutive is CONVERTED, which is why the panel says so before it saves
 *     (`triggerConverts`, followupTrigger.ts).
 *
 * A course with no offering, or one with no schedule in force, cannot be saved
 * at all — `save_course` refuses without weekdays — so that is answered here,
 * in words that name the thing to go and do, rather than as the RPC's own
 * refusal arriving from a dialog that has no day picker on it.
 */
export async function saveCourseTrigger(courseId: string, threshold: number): Promise<void> {
  if (!isConfigured) {
    // The fixtures' own rules, keyed by course id. Written to look EXACTLY like
    // what save_course stores for p_rule = 'week' (0030): the count lands on
    // both columns, the weekly condition is on and the consecutive one off --
    // so the offline app and the live one answer the same rule to the same
    // press, and the conversion warning is true on fixtures too.
    const rule: FollowUpRule = {
      source: 'course',
      weekly_enabled: true, weekly_threshold: threshold,
      consecutive_enabled: false, consecutive_threshold: threshold,
      combination: 'OR',
    };
    COURSE_RULES[courseId] = rule;
    rulesChanged();
    return;
  }

  const [courses, offerings, message] = await Promise.all([
    fetchCourses(), fetchOfferings(courseId), fetchCourseMessage(courseId),
  ]);
  const course = courses.find(c => c.id === courseId);
  if (!course) {
    throw new Error('That course is no longer on the list. Nothing has been changed.');
  }
  // The offering that HAS days in force. A course can hold more than one, and
  // the schedule is what save_course needs; picking the first regardless would
  // send an empty day list for a branch that has not been scheduled yet and be
  // refused for a course that is perfectly well scheduled elsewhere.
  const offering = offerings.find(o => o.weekdays.length > 0);
  if (!offering) {
    throw new Error(`${course.name} has no days scheduled, so its follow-up trigger cannot be changed from here. Set its days on the course first. Nothing has been changed.`);
  }

  const { data, error } = await supabase.rpc('save_course', {
    p_name: course.name,
    p_threshold: threshold,
    p_branch_id: offering.branch_id,
    p_weekdays: [...new Set(offering.weekdays)].sort((a, b) => a - b),
    p_rule: 'week',
    p_from_email: message.from_email ?? SENDERS[0],
    p_template_id: message.template_id,
    // its OWN wording or nothing -- never the template's, copied
    p_subject: message.source === 'course' ? message.subject : null,
    p_body_text: message.source === 'course' ? message.body : null,
    p_course_id: courseId,
  });
  if (error) {
    console.error('saveCourseTrigger:', error.message);
    throw new Error(courseSaveError(error));
  }
  void data;
  // Both, and in this order: the rule moved, and the course row was touched by
  // the same call. A screen listening for one and not the other would show a
  // trigger from after the save over a list derived from before it.
  rulesChanged();
  coursesChanged();
}

/**
 * Activating or deactivating a template is a deliberate, audited act
 * (C-68) -- and one of the few writes that does NOT need an Edge Function,
 * because email_templates is a table `authenticated` was deliberately
 * granted UPDATE on (0009) and the audit trigger fires either way.
 */
export async function setTemplateActive(id: string, active: boolean): Promise<void> {
  if (!isConfigured) return;
  const { error } = await supabase.from('email_templates').update({ is_active: active }).eq('id', id);
  if (error) fail('Could not change that template', error);
}

// -------------------------------------------------------------------- staff
/** The four-state access fact (see mock.ts): "has a record", "has a PIN",
 *  "has used it" and "was turned off" need different actions, so they are
 *  not collapsed into a boolean here either. */
function accessOf(u: { is_active: boolean; pin_set_at: string | null; last_login_at: string | null }): StaffAccess {
  if (!u.is_active) return 'disabled';
  if (!u.pin_set_at) return 'notEnabled';
  if (!u.last_login_at) return 'awaiting';
  return 'active';
}

export async function fetchStaff(): Promise<Staff[]> {
  // A COPY, exactly as fetchMembers returns one. Handing the fixture array
  // back by reference means a screen that removes a row calls setState with
  // the identical object React is already holding, and React bails out of the
  // re-render -- the row leaves the store and stays on the screen (RC-008).
  if (!isConfigured) return [...STAFF];

  const { data, error } = await supabase.from('app_users')
    .select('id, name, phone_e164, role_label, is_active, pin_set_at, last_login_at, created_at')
    .is('deleted_at', null).order('name');
  if (error) fail('Could not load staff', error);

  // Open PIN-reset asks, so the list can say who is waiting on the academy.
  // RLS (0034) hands these to the academy admin only; for anyone else the
  // result is empty and every row simply reads as it did before. A failure
  // here loses the highlight and nothing else -- the staff list is not worth
  // failing over a flag.
  const asks = await supabase.from('pin_reset_requests')
    .select('app_user_id').is('resolved_at', null);
  if (asks.error) console.error('fetchStaff pin reset requests:', asks.error.message);
  const asked = new Set((asks.data ?? []).map(r => r.app_user_id as string));

  return (data ?? []).map(u => {
    const access = accessOf(u as never);
    const when = (v: string | null) => (v ? new Date(v).toLocaleDateString() : '');
    const meta =
      access === 'disabled' ? 'access turned off'
      : access === 'notEnabled' ? `added ${when(u.created_at as string)}`
      : access === 'awaiting' ? `PIN issued ${when(u.pin_set_at as string)}, not used yet`
      : `last signed in ${when(u.last_login_at as string)}`;
    return {
      id: u.id as string, name: u.name as string, phone: u.phone_e164 as string,
      role: u.role_label as string, access, meta,
      pinResetRequested: asked.has(u.id as string),
    };
  });
}

/**
 * Removing a staff member.
 *
 * The write itself is the Edge Function (`staffDelete` in ./api) -- deleted_at
 * is one of the columns `guard_app_users()` refuses from PostgREST, so there
 * is no client path to it and there is not meant to be one. This wrapper
 * exists for the same reason `deleteMember` does: the fixtures are a store
 * too, and a row that leaves the screen but not the list is the lie RC-008
 * was about.
 *
 * Idempotent on both sides -- a second tap on a row already gone reports the
 * removal rather than an error.
 */
export async function deleteStaff(id: string): Promise<{ name: string | null }> {
  if (!isConfigured) {
    const at = STAFF.findIndex(s => s.id === id);
    if (at < 0) return { name: null };
    const [gone] = STAFF.splice(at, 1);
    return { name: gone.name };
  }
  const { name } = await staffDelete(id);
  return { name };
}

// -------------------------------------------------------------------- audit
/** A value that is an identifier and nothing a person can read. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Every identifier in a batch of audit rows, resolved to the name of the
 * thing it points at.
 *
 * WHY THIS IS WORTH TWO ROUND TRIPS
 * `entity_id` is the ONE field that says who the entry is about, and it is a
 * UUID. So is every `member_id`, `course_id`, `created_by` and `branch_id`
 * inside `changes`. Printed raw they are 36 characters of nothing; resolved
 * they are the whole point of the row. The cost is bounded by the fifty rows
 * the screen loads, and a failure degrades to "not resolved" — the caller
 * shows a dash, never an identifier and never an error.
 *
 * The offerings pass is separate because an offering's NAME is two other
 * rows: the course and the branch. Its ids are learned from the offering and
 * have to join the second lookup, so the order is offerings, then everything.
 */
type AuditContext = {
  /** id -> the name of the thing it points at */
  names: Map<string, string>;
  /** id -> the branch that thing belongs to, where it belongs to one */
  branchOf: Map<string, string>;
};

async function resolveContext(ids: string[]): Promise<AuditContext> {
  const names = new Map<string, string>();
  const branchOf = new Map<string, string>();
  if (ids.length === 0) return { names, branchOf };

  // Pass 1 — offerings, and the enrolments that put a MEMBER at a branch.
  // Both are silent on failure: an unresolved id is a dash, and refusing the
  // whole audit log over one would be a worse answer.
  const [offerings, enrolments] = await Promise.all([
    supabase.from('course_offerings').select('id, course_id, branch_id').in('id', ids),
    supabase.from('member_enrollments').select('member_id, offering_id').in('member_id', ids).eq('status', 'active'),
  ]);
  const offeringRows = (offerings.data ?? []) as { id: string; course_id: string; branch_id: string }[];
  const enrolRows = (enrolments.data ?? []) as { member_id: string; offering_id: string }[];

  // A member's branch is her offering's branch, so the offerings her
  // enrolments name have to be resolved too even though no audit row
  // mentioned them.
  const enrolledOfferingIds = [...new Set(enrolRows.map(e => e.offering_id))]
    .filter(id => !offeringRows.some(o => o.id === id));
  const extraOfferings = enrolledOfferingIds.length
    ? await supabase.from('course_offerings').select('id, course_id, branch_id').in('id', enrolledOfferingIds)
    : { data: [] as { id: string; course_id: string; branch_id: string }[] };
  const allOfferings = [...offeringRows, ...((extraOfferings.data ?? []) as typeof offeringRows)];

  const wanted = [...new Set([
    ...ids,
    ...allOfferings.map(o => o.course_id),
    ...allOfferings.map(o => o.branch_id),
  ])];

  // Pass 2 — everything an id can name. Each read is scoped to the ids we
  // actually saw, so a table contributes nothing unless it was referenced.
  const [members, courses, branches, users] = await Promise.all([
    supabase.from('members').select('id, full_name').in('id', wanted),
    supabase.from('courses').select('id, name').in('id', wanted),
    supabase.from('branches').select('id, name').in('id', wanted),
    supabase.from('app_users').select('id, name').in('id', wanted),
  ]);
  for (const m of (members.data ?? []) as { id: string; full_name: string }[]) names.set(m.id, m.full_name);
  for (const c of (courses.data ?? []) as { id: string; name: string }[]) names.set(c.id, c.name);
  for (const b of (branches.data ?? []) as { id: string; name: string }[]) names.set(b.id, b.name);
  for (const u of (users.data ?? []) as { id: string; name: string }[]) names.set(u.id, u.name);

  // A branch is its own branch: an entry ABOUT a branch belongs to it.
  for (const b of (branches.data ?? []) as { id: string; name: string }[]) branchOf.set(b.id, b.name);

  // An offering is named by what runs and where — the same "Course · Branch"
  // the Courses screen writes — and it carries its branch.
  const offeringBranch = new Map<string, string>();
  for (const o of allOfferings) {
    const course = names.get(o.course_id);
    const branch = names.get(o.branch_id);
    if (course) names.set(o.id, branch ? `${course} · ${branch}` : course);
    if (branch) { branchOf.set(o.id, branch); offeringBranch.set(o.id, branch); }
  }

  // A member sits at the branch of the offering she is enrolled in TODAY.
  // `audit_logs` records no branch, so there is nothing else to go on — and
  // the screen says as much rather than implying the branch was read from
  // the entry itself.
  for (const e of enrolRows) {
    const branch = offeringBranch.get(e.offering_id);
    if (branch && !branchOf.has(e.member_id)) branchOf.set(e.member_id, branch);
  }

  return { names, branchOf };
}

/**
 * A date range as the two instants that bound it.
 *
 * `occurred_at` is a timestamptz; a `Period` is two calendar dates. Comparing
 * one against the other directly would compare a moment with a bare date and
 * silently answer in UTC — so the day boundaries are built in LOCAL time (a
 * date string with no Z is parsed local) and sent as instants.
 */
function dayBounds(period: Period): { from: string; to: string } {
  return {
    from: new Date(`${period.from}T00:00:00`).toISOString(),
    to: new Date(`${period.to}T23:59:59.999`).toISOString(),
  };
}

/**
 * The audit log, newest first.
 *
 * `period` narrows the QUERY rather than the result, and that distinction is
 * the whole point: the log returns the fifty most recent rows, so filtering
 * fifty rows client-side would answer "the changes in August" with "the ones
 * that happen to be in the last fifty" — which is a different question and
 * looks identical on screen. Narrowing the query makes it the fifty most
 * recent changes IN THE PERIOD.
 */
export async function fetchAudit(period?: Period | null): Promise<AuditEntry[]> {
  if (!isConfigured) {
    if (!period) return AUDIT;
    const { from, to } = dayBounds(period);
    return AUDIT.filter(a => a.when >= from && a.when <= to);
  }

  let query = supabase.from('audit_logs')
    .select('id, occurred_at, action, entity_type, entity_id, changes, metadata, actor_app_user_id, actor_kind')
    .order('occurred_at', { ascending: false }).limit(50);
  if (period) {
    const { from, to } = dayBounds(period);
    query = query.gte('occurred_at', from).lte('occurred_at', to);
  }
  const { data, error } = await query;
  if (error) fail('Could not load the audit log', error);

  const rows = (data ?? []) as {
    id: number; occurred_at: string; action: string; entity_type: string;
    entity_id: string | null; actor_app_user_id: string | null; actor_kind: string;
    changes: { field: string; old: unknown; new: unknown }[] | null;
    metadata: Record<string, unknown> | null;
  }[];

  // Every identifier anywhere in the batch, in one set: the subjects, the
  // actors, and any changed value that is itself a reference.
  const ids = new Set<string>();
  const collect = (v: unknown) => { if (typeof v === 'string' && UUID.test(v)) ids.add(v); };
  for (const r of rows) {
    collect(r.entity_id);
    collect(r.actor_app_user_id);
    for (const c of r.changes ?? []) { collect(c.old); collect(c.new); }
  }
  const { names, branchOf } = await resolveContext([...ids]);

  /* THE NAMES NO TABLE CAN STILL ANSWER FOR.
   *
   * `resolveContext` asks the tables what each id is called, which works for
   * every id except the ones this screen most needs: a member, course or
   * branch that was deleted for good has no row left to ask. The log knows the
   * answer anyway -- purge_member (0051), purge_course (0047) and the purges
   * in 0053-0055 each record the name in metadata BEFORE deleting -- so the
   * log's own record is the fallback, and it is filled in here rather than in
   * the screen because it names her on every OTHER row in the batch too: the
   * alias, the address and the enrolment entries that point at the same id.
   *
   * `set` only where nothing was found. A live row always wins: an id that
   * still resolves is the present truth, and a stale metadata name must never
   * override it. */
  for (const r of rows) {
    if (!isRemoval(r.action) || !r.entity_id || names.has(r.entity_id)) continue;
    const recorded = subjectFromMeta(r.metadata ?? undefined);
    if (recorded) names.set(r.entity_id, recorded);
  }

  /** A recorded value, with any identifier in it swapped for the name it
   *  points at. An identifier that names nothing becomes null — the screen
   *  draws a dash. A UUID must never reach a person (Q9). */
  const readable = (v: unknown): string | null => {
    if (v === null || v === undefined) return null;
    const s = String(v);
    if (UUID.test(s)) return names.get(s) ?? null;
    return s;
  };

  /** The branch a row can be traced to: what it is ABOUT first, then
   *  anything it points at. Null is a real answer — a message template and an
   *  academy setting belong to no branch, and pretending otherwise would put
   *  them under every one. */
  const branchFor = (r: typeof rows[number]): string | null => {
    if (r.entity_id && branchOf.has(r.entity_id)) return branchOf.get(r.entity_id) ?? null;
    for (const c of r.changes ?? []) {
      for (const v of [c.new, c.old]) {
        if (typeof v === 'string' && branchOf.has(v)) return branchOf.get(v) ?? null;
      }
    }
    return null;
  };

  return rows.map(r => ({
    id: String(r.id),
    who: r.actor_app_user_id ? (names.get(r.actor_app_user_id) ?? 'Unknown') : 'System',
    whoKind: (r.actor_kind as AuditEntry['whoKind']) ?? 'system',
    branch: branchFor(r),
    // ISO, not a formatted string: the screen says "Today, 3:11 PM" and
    // cannot work that out from "9/7/2026, 3:11:49 PM".
    when: r.occurred_at,
    action: r.action,
    entity: r.entity_type,
    subject: r.entity_id ? (names.get(r.entity_id) ?? null) : null,
    changes: (r.changes ?? []).map(c => ({
      field: c.field, old: readable(c.old), new: readable(c.new),
    })),
    // Passed through as recorded. Nothing here is rendered as a value; one
    // action's metadata (a bulk import's file name and counts) is read by
    // the grouping in auditGroups.ts, and the rest is carried for free.
    meta: r.metadata ?? undefined,
  }));
}

// ------------------------------------------------------------------ remarks
const remarkListeners = new Set<() => void>();

export function onRemarksChanged(listener: () => void): () => void {
  remarkListeners.add(listener);
  return () => { remarkListeners.delete(listener); };
}

function remarksChanged(): void {
  for (const listener of remarkListeners) listener();
}

/** The longest a remark may be. Stated here AND as a check constraint in
 *  0043, because a form that refuses at 2,000 and a table that refuses at
 *  1,000 is a save that fails after the typing. */
export const REMARK_MAX = 1000;

/**
 * Whether a failure is "0043 has not been applied to this project yet".
 *
 * PostgREST answers a missing table with 42P01 from Postgres, or PGRST205
 * from its own schema cache. Neither sentence means anything to the person
 * reading the screen, and "could not be loaded" would send her looking for a
 * network fault that is not there.
 */
function isMissingTable(error: { code?: string; message?: string } | null): boolean {
  const code = error?.code ?? '';
  return code === '42P01' || code === 'PGRST205'
    || /relation .*audit_remarks.* does not exist|Could not find the table/i.test(error?.message ?? '');
}

const REMARKS_NOT_READY =
  'Remarks are not switched on for this academy yet — the 0043 update has not been applied. '
  + 'The audit log above is unaffected.';

export async function fetchRemarks(): Promise<Remark[]> {
  if (!isConfigured) return [...REMARKS].sort((a, b) => b.when.localeCompare(a.when));

  const { data, error } = await supabase.from('audit_remarks')
    .select('id, created_at, body, author_app_user_id, audit_log_id')
    .order('created_at', { ascending: false }).limit(100);
  if (error) {
    if (isMissingTable(error)) throw new Error(REMARKS_NOT_READY);
    fail('The remarks could not be loaded', error);
  }

  const rows = (data ?? []) as {
    id: number; created_at: string; body: string; author_app_user_id: string | null;
    audit_log_id: number | null;
  }[];
  const authorIds = [...new Set(rows.map(r => r.author_app_user_id).filter(Boolean))] as string[];
  const authors = authorIds.length
    ? await supabase.from('app_users').select('id, name').in('id', authorIds)
    : { data: [] as { id: string; name: string }[] };
  const authorName = new Map((authors.data ?? []).map(a => [a.id, a.name]));

  return rows.map(r => ({
    id: String(r.id),
    body: r.body,
    who: r.author_app_user_id ? (authorName.get(r.author_app_user_id) ?? 'Unknown') : 'System',
    when: r.created_at,
    // Stringified to match AuditEntry.id, which the screen keys rows by.
    // A bigint and its decimal string are the same entry; comparing one to
    // the other silently matches nothing, and the column just looks empty.
    entryId: r.audit_log_id === null ? null : String(r.audit_log_id),
  }));
}

/**
 * Adds a remark. The AUTHOR is not sent: `audit_remarks.author_app_user_id`
 * defaults to `current_app_user_id()` and the insert policy refuses any other
 * value, for the same reason `audit_log_as` is denied to clients (RC-011) —
 * a client that could name its own author could sign somebody else's name.
 */
export async function addRemark(body: string, entryId: string): Promise<void> {
  const text = body.trim();
  if (text === '') throw new Error('A remark needs some words in it. Nothing has been saved.');
  if (text.length > REMARK_MAX) {
    throw new Error(`A remark can be at most ${REMARK_MAX} characters. Nothing has been saved.`);
  }

  if (!isConfigured) {
    REMARKS.push({
      id: `r${REMARKS.length + 1}-${Date.now()}`,
      body: text, who: 'Rosi Owner', when: new Date().toISOString(), entryId,
    });
    remarksChanged();
    return;
  }

  /* The AUTHOR is still not sent -- the column defaults to
   * current_app_user_id() and the insert policy refuses any other value
   * (RC-011). The ENTRY is sent, because only the client knows which row the
   * reader was looking at when she wrote it. It is a reference to an
   * immutable row, so naming the wrong one writes a misfiled note, never a
   * changed audit entry. */
  const { error } = await supabase.from('audit_remarks')
    .insert({ body: text, audit_log_id: Number(entryId) });
  if (error) {
    if (isMissingTable(error)) throw new Error(REMARKS_NOT_READY);
    console.error('addRemark:', error.message);
    throw new Error('The remark could not be saved — only the academy admin may add one. Nothing has been saved.');
  }
  remarksChanged();
}

// ------------------------------------------------------------------ filters
export async function fetchFilterOptions(): Promise<{ branches: string[]; courses: string[] }> {
  if (!isConfigured) return { branches: BRANCHES, courses: COURSES };

  const [b, c] = await Promise.all([
    supabase.from('branches').select('name').is('deleted_at', null).order('name'),
    supabase.from('courses').select('name').is('deleted_at', null).order('name'),
  ]);
  return {
    branches: ['All branches', ...(b.data ?? []).map(x => x.name as string)],
    courses: ['All courses', ...(c.data ?? []).map(x => x.name as string)],
  };
}

// ------------------------------------------------------------------ academy
/**
 * The academy the signed-in person administers. Both tables are readable by
 * any active account (app_settings_read, branches_read), so a staff member
 * sees the same academy line the super admin does.
 */
export async function fetchAcademy(): Promise<{ name: string; branches: string[] }> {
  if (!isConfigured) {
    return { name: 'RosiFit', branches: BRANCHES.filter(b => b !== 'All branches') };
  }

  const [settings, branches] = await Promise.all([
    supabase.from('app_settings').select('academy_name').eq('id', 1).maybeSingle(),
    supabase.from('branches').select('name').is('deleted_at', null).order('name'),
  ]);
  if (settings.error) fail('The academy details could not be loaded', settings.error);
  if (branches.error) fail('The branch list could not be loaded', branches.error);

  return {
    name: settings.data?.academy_name ?? 'RosiFit',
    branches: (branches.data ?? []).map(x => x.name as string),
  };
}

// ----------------------------------------------------------------- sessions
export async function fetchMonthSessions(year: number, month: number): Promise<SessionDay[]> {
  if (!isConfigured) return MONTH_DAYS;

  const first = `${year}-${String(month + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(year, month + 1, 0).getDate();
  const last = `${year}-${String(month + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { data, error } = await supabase.from('sessions')
    .select('session_date, status, expected_count, present_count')
    .gte('session_date', first).lte('session_date', last).is('deleted_at', null);
  if (error) fail('Could not load the session calendar', error);

  const byDate = new Map((data ?? []).map(s => [s.session_date as string, s]));
  return Array.from({ length: lastDay }, (_, i) => {
    const day = i + 1;
    const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const s = byDate.get(date);
    // "nothing scheduled" is its own state, not an empty day of misses
    if (!s) return { date, day, status: 'none' as const };
    return {
      date, day,
      status: s.status as SessionDay['status'],
      expected: s.expected_count as number,
      present: s.present_count as number,
    };
  });
}

// ---------------------------------------------- period-wise attendance
/**
 * Expected and attended per BUCKET, keeping the member id.
 *
 * Same RPC as the donut, the member report and the course bars -- run once
 * per sub-range -- so the "based on period" bars on Overview sum back to the
 * ring above them rather than answering a second query with its own idea of
 * the period (C-84/C-87). The member id travels with the figures because the
 * branch and course filters have to reach the trend too; the week table this
 * replaces had to admit in its own caption that they did not.
 *
 * One call per bucket, and src/data/period.ts caps the count: a day-grain
 * week is seven, a month is five or six, a long custom range is twelve.
 */
export async function fetchBucketMetrics(buckets: Period[]): Promise<BucketMetrics[]> {
  if (!isConfigured) return bucketFixture(buckets, MEMBERS);

  return Promise.all(buckets.map(async b => {
    const { data, error } = await supabase.rpc('member_period_metrics', { p_from: b.from, p_to: b.to });
    // A bucket that failed silently would draw as a zero bar -- an academy
    // that attended nothing that week, which is a different fact from a
    // query that did not answer.
    if (error) fail('Could not load the period breakdown', error);
    return {
      label: b.label, from: b.from, to: b.to,
      metrics: ((data ?? []) as MetricRow[]).map(m => ({
        member_id: m.member_id, expected: m.expected ?? 0, attended: m.attended ?? 0,
      })),
    };
  }));
}

// ------------------------------------------------- week-wise attendance
/**
 * Expected and attended per week (C-88). Every figure comes from
 * member_period_metrics — the SAME function the member report and the donut
 * read — so a chart cannot disagree with the report beside it (C-87).
 */
export async function fetchWeekRows(weeks: Period[]): Promise<WeekRow[]> {
  if (!isConfigured) return WEEK_ROWS;

  const rows = await Promise.all(weeks.map(async (w, i) => {
    const { data } = await supabase.rpc('member_period_metrics', { p_from: w.from, p_to: w.to });
    const list = (data ?? []) as { expected: number; attended: number }[];
    return {
      label: w.label,
      expected: list.reduce((n, m) => n + (m.expected ?? 0), 0),
      attended: list.reduce((n, m) => n + (m.attended ?? 0), 0),
      current: i === 0,
    };
  }));
  return rows;
}

// -------------------------------------------- sessions awaiting an upload
/** A session with no attendance file yet counts for NOBODY — it is neither
 *  attended nor missed — so these are surfaced as work to do rather than
 *  quietly treated as absences. */
// Declared in mock.ts, beside the fixture of the same shape, so the pure
// modules and their specs can name it without pulling in the Supabase client.
// Re-exported here because this is where callers expect to find it.
import type { PendingSession } from './mock';
import type { MemberImportRow, ImportResult } from './memberImport';
export type { PendingSession };

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function fetchPendingSessions(): Promise<PendingSession[]> {
  if (!isConfigured) {
    return PENDING_SESSIONS.map(({ date, course_id, course, ...p }) => ({
      ...p, session_id: null, offering_id: '', session_date: date, course_id, course,
    }));
  }

  const today = new Date().toISOString().slice(0, 10);
  const { data: sessions, error } = await supabase.from('sessions')
    .select('id, offering_id, session_date, start_time, expected_count')
    .eq('status', 'scheduled').lte('session_date', today).is('deleted_at', null)
    .order('session_date', { ascending: false }).limit(20);
  if (error) fail('Could not load sessions awaiting upload', error);

  const offeringIds = [...new Set((sessions ?? []).map(s => s.offering_id as string))];
  if (offeringIds.length === 0) return [];
  const { data: offerings } = await supabase.from('course_offerings')
    .select('id, course_id, branch_id').in('id', offeringIds);
  const courseIds = [...new Set((offerings ?? []).map(o => o.course_id as string))];
  const branchIds = [...new Set((offerings ?? []).map(o => o.branch_id as string))];
  const [coursesRes, branchesRes] = await Promise.all([
    supabase.from('courses').select('id, name').in('id', courseIds),
    supabase.from('branches').select('id, name').in('id', branchIds),
  ]);
  const offeringById = new Map((offerings ?? []).map(o => [o.id as string, o]));
  const courseName = new Map((coursesRes.data ?? []).map(c => [c.id as string, c.name as string]));
  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id as string, b.name as string]));

  return (sessions ?? []).map(s => {
    const offering = offeringById.get(s.offering_id as string);
    const course = offering ? (courseName.get(offering.course_id as string) ?? 'Course') : 'Course';
    const branch = offering ? (branchName.get(offering.branch_id as string) ?? '') : '';
    const date = new Date(`${s.session_date}T00:00:00`);
    const time = (s.start_time as string | null)?.slice(0, 5) ?? '';
    return {
      session_id: s.id as string,
      offering_id: s.offering_id as string,
      session_date: s.session_date as string,
      course_id: (offering?.course_id as string | undefined) ?? null,
      course,
      dayNum: String(date.getDate()),
      mon: MONTHS_SHORT[date.getMonth()],
      title: `${course}${time ? ` · ${time}` : ''}`,
      meta: `${branch} · ${s.expected_count ?? 0} expected · awaiting upload`,
      label: `${DAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()][0]}${MONTHS_SHORT[date.getMonth()].slice(1).toLowerCase()} · ${course}${time ? ` ${time}` : ''}`,
    };
  });
}

// --------------------------------------------------- per-user appearance
/* ---------------------------------------------------------- notifications
 *
 * The canvas' NOTIFICATIONS sheet. It builds its list from the pending
 * sessions plus TWO hardcoded entries -- "1 check-in email sent" and "1 email
 * could not be sent" -- naming members and a template. Shipping those as
 * literals would be a notification tray that says the same thing on every
 * device forever, which is worse than none: a person would act on it.
 *
 * All three kinds are readable facts, so all three are read:
 *
 *   awaiting  a session that ran with no attendance file. Already fetched by
 *             fetchPendingSessions -- reused rather than re-queried.
 *   sent      the last email batches, from email_batches (batches_read is
 *             is_active_app_user(), and 0015 grants the select).
 *   excluded  email_messages rows the send DECLINED -- status 'excluded' or
 *             'failed'. This is the real version of "could not be sent", and
 *             unlike a derived guess it carries the reason the send itself
 *             recorded.
 *
 * No new table, no new policy, no new grant. The SHAPING -- what counts, what
 * comes first, how each line reads -- lives in ./notifications, which is pure
 * and therefore tested; this function only fetches and hands over.
 */
export type { Notification } from './notifications';

export async function fetchNotifications(): Promise<Notification[]> {
  const pending = await fetchPendingSessions();
  const awaiting = pending.slice(0, NOTIFICATION_LIMIT).map((p, i) =>
    awaitingNotification({
      id: p.session_id ?? (p.offering_id || String(i)),
      title: p.title, meta: p.meta, label: p.label,
    }));

  if (!isConfigured) {
    // Offline there is no send history to read, and inventing one is the
    // defect this function exists to remove. The awaiting entries are real
    // even on fixtures, so the sheet is not empty -- it is just honest about
    // having nothing else to say.
    return orderNotifications(awaiting);
  }

  const [batches, excluded, pinReqs] = await Promise.all([
    supabase.from('email_batches')
      .select('id, sent_count, failed_count, subject_snapshot, created_at, completed_at')
      .order('created_at', { ascending: false }).limit(NOTIFICATION_LIMIT),
    supabase.from('email_messages')
      .select('id, member_id, status, exclusion_reason, failure_reason')
      .in('status', ['excluded', 'failed']).limit(NOTIFICATION_LIMIT),
    // Open PIN-reset asks. RLS (0034) returns rows to the academy admin only,
    // so for a staff member this is simply empty rather than forbidden -- no
    // branch on role is needed here, and none should be: the database is the
    // one place that decision belongs.
    // The FK is NAMED. pin_reset_requests has TWO foreign keys into app_users
    // -- app_user_id (who asked) and resolved_by (who answered) -- so a bare
    // `app_users(...)` embed is ambiguous and PostgREST refuses the whole
    // request with PGRST201 rather than picking one. That refusal is why this
    // tray entry never appeared for anybody: the read failed every time, the
    // catch below logged it, and the admin saw a bell with no PIN reset in it
    // however many staff were locked out.
    //
    // Not `!inner`, either. An inner embed DROPS a request whose app_users row
    // is not readable, which is the opposite of what the mapping below is
    // written for -- it falls back to 'A staff member' precisely so somebody
    // locked out is still shown when her name cannot be read.
    supabase.from('pin_reset_requests')
      .select('id, requested_at, app_users!pin_reset_requests_app_user_id_fkey(name)')
      .is('resolved_at', null)
      .order('requested_at', { ascending: false }).limit(NOTIFICATION_LIMIT),
  ]);

  // A tray that fails is not worth failing a screen over: the awaiting half is
  // already in hand, so a broken read costs its own entries and nothing else.
  // The console keeps the reason.
  if (batches.error) console.error('fetchNotifications batches:', batches.error.message);
  if (excluded.error) console.error('fetchNotifications excluded:', excluded.error.message);
  if (pinReqs.error) console.error('fetchNotifications pinResets:', pinReqs.error.message);

  const sent = (batches.data ?? [])
    .filter(b => Number(b.sent_count) > 0)
    .map(b => sentNotification({
      id: b.id as string,
      sent: Number(b.sent_count),
      failed: Number(b.failed_count),
      subject: b.subject_snapshot as string,
      when: new Date((b.completed_at ?? b.created_at) as string).toLocaleString(),
    }));

  const memberIds = [...new Set((excluded.data ?? []).map(m => m.member_id as string))];
  const names = memberIds.length
    ? await supabase.from('members').select('id, full_name').in('id', memberIds)
    : { data: [] as { id: string; full_name: string }[] };
  const nameById = new Map((names.data ?? []).map(m => [m.id, m.full_name]));

  const notSent = (excluded.data ?? []).map(m => excludedNotification({
    id: m.id as string,
    name: nameById.get(m.member_id as string) ?? null,
    status: m.status as string,
    exclusionReason: (m.exclusion_reason as string | null) ?? null,
    failureReason: (m.failure_reason as string | null) ?? null,
  }));

  // The joined row comes back as app_users: {name} or [{name}] depending on
  // how PostgREST resolves the embed, so both shapes are handled rather than
  // guessed at. A request whose name cannot be read is still shown -- the
  // admin needs to know somebody is locked out even if the join disappoints.
  const resets = (pinReqs.data ?? []).map(r => {
    const joined = (r as { app_users?: { name?: string } | { name?: string }[] }).app_users;
    const named = Array.isArray(joined) ? joined[0] : joined;
    return pinResetNotification({
      id: r.id as string,
      name: named?.name ?? 'A staff member',
      when: new Date(r.requested_at as string).toLocaleString(),
    });
  });

  return orderNotifications([...resets, ...awaiting, ...notSent, ...sent]);
}


/* -------------------------------------------------- who has already been sent to
 *
 * The mark the send draft puts on a member who has already had THIS period's
 * follow-up. It is a read of what the send itself recorded, never a second
 * record of it: email_batches carries the period in its context (0009, the
 * same object send-followups writes), and email_messages carries the
 * per-member outcome under it.
 *
 * The BATCH's period is what is matched, not the message's timestamp. A week
 * is usually mailed on the Monday after it ends, so "sent during the week"
 * would miss every ordinary send and mark nobody.
 *
 * A failure here costs the mark and nothing else. The draft is still correct
 * without it -- every member still shows, the send still works -- so a broken
 * read must not take the dialog down with it. The console keeps the reason.
 */
export async function fetchSentForPeriod(period: Period): Promise<SentMap> {
  if (!isConfigured) return {};

  const batches = await supabase.from('email_batches').select('id')
    .eq('context->>period_from', period.from)
    .eq('context->>period_to', period.to);
  if (batches.error) {
    console.error('fetchSentForPeriod batches:', batches.error.message);
    return {};
  }
  const ids = (batches.data ?? []).map(b => b.id as string);
  if (ids.length === 0) return {};

  const messages = await supabase.from('email_messages')
    .select('member_id, sent_at').in('batch_id', ids).eq('status', 'sent');
  if (messages.error) {
    console.error('fetchSentForPeriod messages:', messages.error.message);
    return {};
  }

  const out: SentMap = {};
  for (const m of messages.data ?? []) {
    // A row can be 'sent' with no timestamp only if the update that stamped
    // it half-failed; the batch's period is still the honest answer to WHEN,
    // and claiming "sent" with no date at all is the one thing the row must
    // not do.
    const at = (m.sent_at as string | null) ?? `${period.to}T00:00:00.000Z`;
    const id = m.member_id as string;
    if (!out[id] || out[id] < at) out[id] = at;
  }
  return out;
}

export type Preferences = { theme_mode: 'light' | 'dark' | 'system'; accent_key: string; accent_hue: number };

/** Own row only — user_preferences has no policy that lets anyone, super
 *  admin included, read another person's appearance (0010). */
export async function fetchPreferences(appUserId: string): Promise<Preferences | null> {
  if (!isConfigured) return null;
  const { data, error } = await supabase.from('user_preferences')
    .select('theme_mode, accent_key, accent_hue').eq('app_user_id', appUserId).maybeSingle();
  if (error || !data) return null;
  return data as Preferences;
}

export async function savePreferences(appUserId: string, prefs: Partial<Preferences>): Promise<void> {
  if (!isConfigured) return;
  await supabase.from('user_preferences').upsert(
    { app_user_id: appUserId, ...prefs }, { onConflict: 'app_user_id' }
  );
}

// -------------------------------------------------------- attendance list
/**
 * Every attendance fact in a period, one row per member per session.
 *
 * The Attendance tab lists these; it does not compute anything from them.
 * Totals on that screen are counts of these rows, so the list and its own
 * summary cannot disagree — and neither can restate a figure the engine
 * (member_period_metrics) would put differently, because a count of facts is
 * all either one is.
 */
export async function fetchAttendance(period: Period): Promise<AttendanceRow[]> {
  if (!isConfigured) return attendanceFixture(period.from, period.to);

  const { data: sessions, error } = await supabase.from('sessions')
    .select('id, offering_id, session_date, start_time')
    .gte('session_date', period.from).lte('session_date', period.to)
    .is('deleted_at', null)
    .order('session_date', { ascending: false });
  if (error) fail('Could not load attendance', error);

  const sessionIds = (sessions ?? []).map(s => s.id as string);
  if (sessionIds.length === 0) return [];

  const { data: records, error: recordError } = await supabase.from('attendance_records')
    .select('id, session_id, member_id, status, expected, minutes_in_call')
    .in('session_id', sessionIds).is('deleted_at', null);
  if (recordError) fail('Could not load attendance', recordError);
  if (!records || records.length === 0) return [];

  // The same manual joins the rest of this file uses, rather than a PostgREST
  // embed: an embed silently returns null for a row RLS hides on the far
  // side, and a member who vanished that way would read as a blank name.
  const memberIds = [...new Set(records.map(r => r.member_id as string))];
  const offeringIds = [...new Set((sessions ?? []).map(s => s.offering_id as string))];
  const [membersRes, offeringsRes] = await Promise.all([
    supabase.from('members').select('id, full_name').in('id', memberIds),
    supabase.from('course_offerings').select('id, course_id, branch_id').in('id', offeringIds),
  ]);
  const courseIds = [...new Set((offeringsRes.data ?? []).map(o => o.course_id as string))];
  const branchIds = [...new Set((offeringsRes.data ?? []).map(o => o.branch_id as string))];
  const [coursesRes, branchesRes] = await Promise.all([
    courseIds.length ? supabase.from('courses').select('id, name').in('id', courseIds)
                     : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    branchIds.length ? supabase.from('branches').select('id, name').in('id', branchIds)
                     : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const sessionById = new Map((sessions ?? []).map(s => [s.id as string, s]));
  const memberById = new Map((membersRes.data ?? []).map(m => [m.id as string, m]));
  const offeringById = new Map((offeringsRes.data ?? []).map(o => [o.id as string, o]));
  const courseName = new Map((coursesRes.data ?? []).map(c => [c.id as string, c.name as string]));
  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id as string, b.name as string]));

  return records.map(r => {
    const session = sessionById.get(r.session_id as string);
    const offering = session ? offeringById.get(session.offering_id as string) : undefined;
    const member = memberById.get(r.member_id as string);
    return {
      id: r.id as string,
      member_id: r.member_id as string,
      // '—' rather than '' so a row RLS hid the member of still reads as a
      // row, instead of an unexplained blank
      member: (member?.full_name as string) ?? '—',
      course: offering ? (courseName.get(offering.course_id as string) ?? '—') : '—',
      course_id: (offering?.course_id as string | undefined) ?? null,
      branch: offering ? (branchName.get(offering.branch_id as string) ?? '—') : '—',
      date: (session?.session_date as string) ?? '',
      time: (session?.start_time as string | null)?.slice(0, 5) ?? '',
      status: r.status as AttendanceStatus,
      expected: Boolean(r.expected),
      minutes: (r.minutes_in_call as number | null) ?? null,
    };
  }).sort((a, b) => (a.date === b.date ? a.member.localeCompare(b.member) : b.date.localeCompare(a.date)));
}

// ------------------------------------------------------------ her own week
/**
 * ONE MEMBER'S SESSIONS in a period, as her pop-up lists them.
 *
 * Its own read rather than a slice of `fetchAttendance`, for two reasons the
 * list exists to serve. `fetchAttendance` returns one row PER ATTENDANCE
 * RECORD, so a holiday, a cancellation and a day whose file has not arrived --
 * the three that carry no record at all -- would simply be absent from her
 * week, and a day that is missing from the list reads as a day that did not
 * happen. And it carries no `sessions.status`, so a class the academy closed
 * could not be told from one she skipped.
 *
 * Narrowed to the offerings she is actually enrolled at, so the list is hers
 * and not her branch's.
 *
 * The SHAPING is memberWeek.ts, which is pure and tested. Everything below is
 * the read.
 */
export async function fetchMemberWeek(memberId: string, period: Period): Promise<MemberSession[]> {
  // Offline, her week is the fixture it has always been -- MEMBER_WEEK, via
  // the same `sessionsFor` the pop-up used to call directly. What changes
  // live is that the list is HERS; what stays is that the demo has one.
  if (!isConfigured) {
    const m = MEMBERS.find(x => x.id === memberId);
    return m ? sessionsFor(m).map(s => ({ ...s })) : [NO_SESSIONS_ROW];
  }

  const { data: enrol, error: enrolError } = await supabase
    .from('member_enrollments').select('offering_id')
    .eq('member_id', memberId).eq('status', 'active');
  if (enrolError) fail('Could not load her sessions', enrolError);

  const offeringIds = [...new Set((enrol ?? []).map(e => e.offering_id as string))];
  // Enrolled at nothing is a fact, and it is the "No sessions" row -- not an
  // empty list, which would read as a week of misses nobody recorded.
  if (offeringIds.length === 0) return [NO_SESSIONS_ROW];

  const { data: sessions, error } = await supabase.from('sessions')
    .select('id, offering_id, session_date, start_time, status, cancellation_reason, holiday_id')
    .in('offering_id', offeringIds)
    .gte('session_date', period.from).lte('session_date', period.to)
    .is('deleted_at', null);
  if (error) fail('Could not load her sessions', error);
  if (!sessions || sessions.length === 0) return [NO_SESSIONS_ROW];

  const { data: records, error: recordError } = await supabase.from('attendance_records')
    .select('session_id, status, expected')
    .eq('member_id', memberId)
    .in('session_id', sessions.map(s => s.id as string))
    .is('deleted_at', null);
  if (recordError) fail('Could not load her sessions', recordError);

  // The same manual joins the rest of this file uses rather than a PostgREST
  // embed: an embed returns null for a row RLS hides on the far side, and a
  // course that vanished that way would read as a blank name on her card.
  const offerings = await supabase.from('course_offerings')
    .select('id, course_id, branch_id').in('id', offeringIds).is('deleted_at', null);
  const courseIds = [...new Set((offerings.data ?? []).map(o => o.course_id as string))];
  const branchIds = [...new Set((offerings.data ?? []).map(o => o.branch_id as string))];
  const holidayIds = [...new Set(
    sessions.map(s => s.holiday_id as string | null).filter((x): x is string => Boolean(x)))];
  const [coursesRes, branchesRes, holidaysRes] = await Promise.all([
    courseIds.length ? supabase.from('courses').select('id, name').in('id', courseIds)
                     : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    branchIds.length ? supabase.from('branches').select('id, name').in('id', branchIds)
                     : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    holidayIds.length ? supabase.from('holidays').select('id, name').in('id', holidayIds)
                      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const offeringById = new Map((offerings.data ?? []).map(o => [o.id as string, o]));
  const courseName = new Map((coursesRes.data ?? []).map(c => [c.id as string, c.name as string]));
  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id as string, b.name as string]));
  const holidayName = new Map((holidaysRes.data ?? []).map(h => [h.id as string, h.name as string]));
  const recordBySession = new Map((records ?? []).map(r => [r.session_id as string, r]));

  const rows: MemberWeekSession[] = sessions.map(s => {
    const offering = offeringById.get(s.offering_id as string);
    const record = recordBySession.get(s.id as string);
    return {
      iso: s.session_date as string,
      time: (s.start_time as string | null) ?? null,
      sessionStatus: s.status as MemberWeekSession['sessionStatus'],
      // '—' rather than '', so a row whose course RLS hid still reads as a
      // row instead of an unexplained blank
      course: offering ? (courseName.get(offering.course_id as string) ?? '—') : '—',
      branch: offering ? (branchName.get(offering.branch_id as string) ?? '—') : '—',
      holidayName: s.holiday_id ? (holidayName.get(s.holiday_id as string) ?? null) : null,
      cancellationReason: (s.cancellation_reason as string | null) ?? null,
      record: record
        ? { status: record.status as AttendanceStatus, expected: Boolean(record.expected) }
        : null,
    };
  });

  // `iso(new Date())` and NOT schedule.ts's `today()`, which is
  // toISOString().slice(0,10) and so reads UTC: before 05:30 IST that names
  // yesterday, and a day still to run would be listed as "Awaiting upload".
  return memberWeek(rows, iso(new Date()));
}

// ----------------------------------------------------------------- holidays
/**
 * Holidays, and the two writes that keep their sessions honest.
 *
 * The session effects are NOT applied from here. 0017 puts them on triggers
 * on public.holidays, so inserting the row marks its sessions and deleting
 * the row returns them to `scheduled` (C-92) without the client being trusted
 * to remember either step. apply_holiday and remove_holiday stay
 * service_role-only as direct calls, which is what stops a staff member
 * rewriting the status of every session in a date range.
 *
 * What this file does is the row, behind the RLS policies 0005 already wrote:
 * super admin, and only while the subscription is writable.
 */
// One shape, declared beside the fixtures that have to satisfy it (mock.ts)
// and re-exported here so screens keep reading it from the repository like
// every other row type. Two identical declarations is how the fixture and the
// live row quietly stop matching.
export type { Holiday };

const holidayListeners = new Set<() => void>();

export function onHolidaysChanged(listener: () => void): () => void {
  holidayListeners.add(listener);
  return () => { holidayListeners.delete(listener); };
}

function holidaysChanged(): void {
  for (const listener of holidayListeners) listener();
}

/** RLS and the CHECK constraints answer in Postgres' own words; these are the
 *  three a person can act on. Anything else keeps the database's message
 *  rather than a guess at what it meant. */
function holidayWriteError(error: { code?: string; message?: string } | null, verb: string): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === '42501' || /row-level security|permission denied/i.test(message)) {
    return `Only the super admin can ${verb} a holiday, and only while the subscription is active. Nothing has been changed.`;
  }
  if (/holiday_range_valid/.test(message)) {
    return 'The end date must be on or after the start date. Nothing has been changed.';
  }
  if (/length\(btrim/.test(message)) {
    return 'A holiday needs a name of at least two characters. Nothing has been changed.';
  }
  return `${personReadable(message, 'The holiday could not be saved')}. Nothing has been changed.`;
}

export async function fetchHolidays(): Promise<Holiday[]> {
  if (!isConfigured) return HOLIDAYS.map(h => ({ ...h }));

  const { data, error } = await supabase.from('holidays')
    .select('id, name, start_date, end_date, branch_id')
    .order('start_date', { ascending: false });
  if (error) fail('Could not load holidays', error);
  if (!data || data.length === 0) return [];

  // The session count is what the delete confirmation promises to restore, so
  // it is counted from sessions.holiday_id -- the same link remove_holiday
  // walks -- rather than re-derived from the date range. A range recount could
  // disagree with what deleting actually does.
  const branchIds = [...new Set(data.map(h => h.branch_id).filter(Boolean))] as string[];
  const [branchesRes, sessionsRes] = await Promise.all([
    branchIds.length
      ? supabase.from('branches').select('id, name').in('id', branchIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    supabase.from('sessions')
      .select('holiday_id')
      .in('holiday_id', data.map(h => h.id as string))
      .eq('status', 'holiday').is('deleted_at', null),
  ]);
  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id as string, b.name as string]));
  const held = new Map<string, number>();
  for (const s of sessionsRes.data ?? []) {
    const id = s.holiday_id as string;
    held.set(id, (held.get(id) ?? 0) + 1);
  }

  return data.map(h => ({
    id: h.id as string,
    name: h.name as string,
    from: h.start_date as string,
    to: h.end_date as string,
    branch: h.branch_id ? (branchName.get(h.branch_id as string) ?? '-') : null,
    sessions: held.get(h.id as string) ?? 0,
  }));
}

/**
 * The impact, before the act (C-91). preview_holiday() is the SAME query
 * apply_holiday() runs, which is what stops the number shown from disagreeing
 * with the number marked. It is `stable` and 0011 grants it to authenticated,
 * so no new permission is involved.
 */
export async function previewHoliday(from: string, to: string, branchName: string | null):
  Promise<{ label: string; n: number }[]> {
  if (!isConfigured) {
    return HOLIDAY_PREVIEW.filter(p => branchName === null || p.label.endsWith(branchName));
  }
  let branchId: string | null = null;
  if (branchName) {
    const { data } = await supabase.from('branches').select('id').eq('name', branchName).maybeSingle();
    branchId = (data?.id as string) ?? null;
  }
  const { data, error } = await supabase.rpc('preview_holiday', {
    p_start: from, p_end: to, p_branch_id: branchId,
  });
  if (error) fail('Could not work out which sessions this would affect', error);
  return ((data ?? []) as { course_name: string; branch_name: string; session_count: number }[])
    .map(r => ({ label: `${r.course_name} - ${r.branch_name}`, n: Number(r.session_count) }));
}

export async function createHoliday(input:
  { name: string; from: string; to: string; branch: string | null }): Promise<void> {
  if (!isConfigured) {
    HOLIDAYS.unshift({
      id: `local-${Date.now()}`, name: input.name,
      from: input.from, to: input.to, branch: input.branch,
      sessions: HOLIDAY_PREVIEW
        .filter(p => input.branch === null || p.label.endsWith(input.branch))
        .reduce((n, p) => n + p.n, 0),
    });
    holidaysChanged();
    return;
  }

  let branchId: string | null = null;
  if (input.branch) {
    const { data } = await supabase.from('branches').select('id').eq('name', input.branch).maybeSingle();
    // A scope naming a branch nobody has would fall through to branch_id null,
    // which the column reads as EVERY branch -- the widest possible blast
    // radius from a typo. Refuse it rather than widen it.
    if (!data?.id) throw new Error(`There is no branch called ${input.branch}. Nothing has been changed.`);
    branchId = data.id as string;
  }

  const { error } = await supabase.from('holidays').insert({
    name: input.name, start_date: input.from, end_date: input.to, branch_id: branchId,
  });
  if (error) {
    console.error('createHoliday:', error.message);
    throw new Error(holidayWriteError(error, 'add'));
  }
  holidaysChanged();
}

/**
 * Deleting the row is the whole operation: the BEFORE DELETE trigger from
 * 0017 restores the sessions first, which is also what lets the delete past
 * the foreign key on sessions.holiday_id.
 */
export async function deleteHoliday(id: string): Promise<void> {
  if (!isConfigured) {
    const at = HOLIDAYS.findIndex(h => h.id === id);
    if (at >= 0) HOLIDAYS.splice(at, 1);
    holidaysChanged();
    return;
  }

  const { data, error } = await supabase.from('holidays').delete().eq('id', id).select('id');
  if (error) {
    console.error('deleteHoliday:', error.message);
    throw new Error(holidayWriteError(error, 'remove'));
  }
  // RLS refuses a DELETE by matching NO ROWS, not by erroring -- the same
  // shape that let updateCourse report a save the policy had declined.
  if (!data || data.length === 0) {
    throw new Error('That holiday could not be removed - only the super admin may, and only while the subscription is active. Nothing has been changed.');
  }
  holidaysChanged();
}

/* ------------------------------------------------------------------ members
 *
 * Adding a member, as ONE call.
 *
 * app/member/edit.tsx flashed "<name> added" and called router.back(). It
 * wrote nothing -- the same defect as Add Course (RC-008), and the reason
 * this function exists.
 *
 * Unlike createCourse this is an RPC, not a direct write, and not by
 * preference: 0006 gives `authenticated` INSERT on members, member_emails and
 * member_aliases, but member_enrollments and member_schedules have a READ
 * policy and nothing else -- by design, because the weekday-subset rule needs
 * the offering schedule effective on the same dates, which no CHECK
 * constraint can see. A member inserted directly would land with no
 * enrolment: expected at no session, in no follow-up list, counted by
 * nobody. public.create_member (0016) does the whole write in one
 * transaction so that cannot half-happen.
 */
const memberListeners = new Set<() => void>();

export function onMembersChanged(listener: () => void): () => void {
  memberListeners.add(listener);
  return () => { memberListeners.delete(listener); };
}

function membersChanged(): void {
  for (const listener of memberListeners) listener();
}

export type MemberInput = {
  full_name: string;
  /** the course AT one branch — course_offerings.id */
  offering_id: string;
  /** ISO, or null for "not recorded" */
  joined_on: string | null;
  /** Google Meet display names (C-71) */
  aliases: string[];
  /** the FIRST address becomes primary (C-73); an empty list is a real answer */
  emails: string[];
  /** her own days as 1..7, or null to follow the offering's schedule */
  weekdays: number[] | null;
};

/**
 * Every refusal create_member raises is already written for a person to read
 * — the offering that does not exist, the display name that belongs to
 * somebody else, the subscription that has expired. So the database's own
 * words are kept and only the guarantee is added; inventing a friendlier
 * sentence here would be a second place for the rule to drift.
 *
 * A constraint violation is not one of those refusals. Nobody wrote it, and it
 * names a relation and a constraint rather than anything the person can act on
 * — personReadable() is what separates the two (CP-003, RC-023).
 *
 * Kept, but not kept verbatim in one respect: those sentences are raised
 * lowercase, as Postgres messages are, and what the dialog shows is a
 * sentence. sentenceOpening() raises the first letter and nothing else, so
 * "the display name … already belongs to another member" arrives at the
 * banner reading as the academy's answer rather than as a leaked fragment
 * (requests/2026-09-07-display-name-refusal-clears-and-case.md).
 *
 * That is safe for every refusal that reaches HERE — create_member (0026),
 * update_member (0027) and the bulk import (0029) all raise sentences opening
 * on a common word. It would NOT be safe for the merge refusal (0032), which
 * opens by interpolating the member's own name: a woman recorded as "ani"
 * would be shown as "Ani", a quiet misquote of her record. mergeMemberInto
 * translates its own refusal for that reason and must stay off this function.
 */
function memberWriteError(error: { message?: string } | null): string {
  const message = (error?.message ?? '').trim();
  return `${sentenceOpening(personReadable(message, 'The member could not be saved'))}. Nothing has been saved.`;
}

export async function createMember(input: MemberInput): Promise<{ id: string }> {
  if (!isConfigured) {
    // Offline the fixture list IS the store, so she has to land in it — a
    // screen that says "added" over a list that never changed is the same
    // lie, moved one layer down.
    const course = COURSE_LIST.find(c => c.offerings.some(o => o.id === input.offering_id));
    const offering = course?.offerings.find(o => o.id === input.offering_id);
    const member: Member = {
      id: `local-${Date.now()}`,
      // create_member stopped minting one in 0026; offline says the same
      code: '',
      name: input.full_name,
      course: course?.name ?? '—',
      // The course she is enrolled AT, by id -- the offering names it, so it
      // is known here and never inferred from the name afterwards.
      course_id: course?.id ?? null,
      branch: offering?.branch ?? '—',
      // what the form decided, kept the same way live does: null is "she
      // follows the offering", not "no days"
      weekdays: input.weekdays,
      aliases: input.aliases,
      // create_member (0016) coalesces a null date to current_date; offline
      // says the same, and says it once -- the label is derived from the date.
      joinedOn: input.joined_on ?? iso(new Date()),
      joined: joinedLabel(input.joined_on ?? iso(new Date())),
      emails: input.emails.map((address, i) => ({ address, primary: i === 0 })),
      // create_member (0016) inserts 'active' explicitly; offline says the same.
      status: 'active',
      expected: 0, attended: 0, missed: 0, streak: 0, last: '\u2014',
    };
    MEMBERS.push(member);
    membersChanged();
    return { id: member.id };
  }

  const { data, error } = await supabase.rpc('create_member', {
    p_full_name: input.full_name,
    p_offering_id: input.offering_id,
    p_joined_on: input.joined_on,
    p_aliases: input.aliases,
    p_emails: input.emails,
    p_weekdays: input.weekdays,
  });
  if (error || !data) {
    console.error('createMember:', error?.message ?? 'no row returned');
    throw new Error(memberWriteError(error));
  }

  membersChanged();
  return { id: (data as { member_id: string }).member_id };
}

/**
 * BULK IMPORT — one call, one file, every row judged on its own (0028).
 *
 * The parsed and client-validated rows go up as one jsonb array and come
 * back as one verdict per row. The server judges again -- the duplicate
 * rule, the offering, and every rule create_member enforces -- so the client
 * preview is what lets a person see the outcome before the tap and the
 * server is what makes it true.
 *
 * NOT owner-only, and this comment said it was until 08-Sep-2026. 0038 opened
 * the RPC to any active user and 0050 is the migration that actually delivered
 * that to production -- 0038 never reached it, which is why a staff account
 * was still shown "Only the academy admin can bulk import members" four days
 * after the decision was taken. Nothing in this file has ever asked the role.
 */
export async function bulkImportMembers(input: {
  rows: MemberImportRow[];
  default_offering_id: string | null;
  file_name: string;
}): Promise<ImportResult> {
  if (!isConfigured) {
    // Offline the fixture list IS the store, so the rows land in it; a
    // results screen over a roster that never changed is the lie RC-008 was.
    const result: ImportResult = {
      run_id: `local-${Date.now()}`, total: input.rows.length,
      inserted: 0, skipped: 0, failed: 0, rows: [],
    };
    for (const r of input.rows) {
      if (MEMBERS.some(m => m.name.toLowerCase() === r.full_name.toLowerCase())) {
        result.skipped++;
        result.rows.push({ row: r.row, full_name: r.full_name, status: 'skipped',
          reason: 'already on the register — edit her instead' });
        continue;
      }
      const course = COURSE_LIST.find(c => c.name.toLowerCase() === r.course.toLowerCase())
        ?? COURSE_LIST.find(c => c.offerings.some(o => o.id === input.default_offering_id));
      const offering = course?.offerings.find(o => !r.branch || o.branch.toLowerCase() === r.branch.toLowerCase())
        ?? course?.offerings[0];
      if (!course || !offering) {
        result.failed++;
        result.rows.push({ row: r.row, full_name: r.full_name, status: 'failed', reason: 'no course' });
        continue;
      }
      const id = `local-${Date.now()}-${r.row}`;
      MEMBERS.push({
        id, code: '', name: r.full_name, course: course.name, course_id: course.id,
        branch: offering.branch,
        aliases: r.aliases, emails: r.email ? [{ address: r.email, primary: true }] : [],
        // the import gives nobody days of her own; every row follows its course
        weekdays: null,
        status: 'active',
        expected: 0, attended: 0, missed: 0, streak: 0, last: '\u2014',
        // The file carries no joining date, so create_member's current_date
        // is what she joins on; offline says the same, in the same words the
        // rest of the register uses. It used to say 'today', which is the one
        // label that stops being true tomorrow.
        joinedOn: iso(new Date()), joined: joinedLabel(iso(new Date())),
      });
      result.inserted++;
      result.rows.push({ row: r.row, full_name: r.full_name, status: 'inserted', member_id: id });
    }
    membersChanged();
    return result;
  }

  const { data, error } = await supabase.rpc('bulk_import_members', {
    p_members: input.rows.map(r => ({
      row: r.row, full_name: r.full_name, email: r.email || null,
      course: r.course || null, branch: r.branch || null,
      // No joining date is SENT, and none is asked for: the file has no
      // Joined On column any more. bulk_import_members reads a missing key as
      // null and create_member stores coalesce(p_joined_on, current_date), so
      // a bulk-imported member joins the day she was imported. That coalesce
      // reached only her ENROLMENT until 0049 -- her record was dated null and
      // this comment was wrong about it for two days (RC-033).
      aliases: r.aliases,
    })),
    p_default_offering_id: input.default_offering_id,
    p_file_name: input.file_name,
  });
  if (error || !data) {
    console.error('bulkImportMembers:', error?.message ?? 'no row returned');
    throw new Error(memberWriteError(error));
  }
  membersChanged();
  return data as ImportResult;
}

/** The academy's own name, for the branded template file. */
export async function fetchAcademyName(): Promise<string> {
  if (!isConfigured) return 'RosiFit Academy';
  const { data } = await supabase.from('app_settings').select('academy_name').eq('id', 1).maybeSingle();
  return (data?.academy_name as string | null) ?? 'RosiFit Academy';
}

/**
 * CHANGING a member she already is.
 *
 * The arrays are the WHOLE desired list, not a patch, because the form shows
 * the whole list: a display name removed on screen is a row deleted here, and
 * an address removed is a row soft-deleted. A patch API behind a screen that
 * shows the complete set is how a removal turns into a silent no-op.
 *
 * `joined_on` is deliberately NOT a parameter. The day she joined is a fact
 * about the past; a write path that could rewrite it would let a typo move
 * every session she was ever expected at.
 *
 * The Edit form SHOWS it -- read-only, seeded from `Member.joinedOn` -- which
 * is a different thing from offering to change it. Saving her therefore
 * cannot clear or overwrite the date, because no save carries one:
 * src/data/memberJoined.test.ts holds both halves of that.
 */
export type MemberUpdate = Omit<MemberInput, 'joined_on'> & { id: string };

export async function updateMember(input: MemberUpdate): Promise<{ moved: boolean }> {
  if (!isConfigured) {
    // Offline the fixture list IS the store. A screen that says "saved" over
    // a list that never changed is the same lie this whole path was fixed
    // for -- RC-008 -- so she is changed in place.
    const i = MEMBERS.findIndex(m => m.id === input.id);
    if (i < 0) throw new Error('That member is not on the register. Nothing has been saved.');
    const course = COURSE_LIST.find(c => c.offerings.some(o => o.id === input.offering_id));
    const offering = course?.offerings.find(o => o.id === input.offering_id);
    const moved = MEMBERS[i].course !== (course?.name ?? MEMBERS[i].course);
    MEMBERS[i] = {
      ...MEMBERS[i],
      name: input.full_name,
      course: course?.name ?? MEMBERS[i].course,
      branch: offering?.branch ?? MEMBERS[i].branch,
      aliases: input.aliases,
      emails: input.emails.map((address, n) => ({ address, primary: n === 0 })),
      // `joinedOn` and `joined` are NOT among the fields written here, and
      // the spread above is what keeps them: saving a member without touching
      // her joining date must leave the date she actually joined on alone.
      // Live, the same guarantee is structural -- update_member takes no
      // p_joined_on, so there is nothing to send (see MemberUpdate).
    };
    membersChanged();
    return { moved };
  }

  const { data, error } = await supabase.rpc('update_member', {
    p_member_id: input.id,
    p_full_name: input.full_name,
    p_offering_id: input.offering_id,
    p_aliases: input.aliases,
    p_emails: input.emails,
    p_weekdays: input.weekdays,
  });
  if (error || !data) {
    console.error('updateMember:', error?.message ?? 'no row returned');
    throw new Error(memberWriteError(error));
  }

  // Her expected/attended figures move with her enrolment, so this
  // revalidates the roster the whole app derives from -- the follow-up list
  // and the dashboard count come off the same query (guardrail 1), so one
  // notification is all of them.
  membersChanged();
  return { moved: Boolean((data as { moved_offering?: boolean }).moved_offering) };
}

/**
 * ADD ONE Google Meet display name to a member, additively.
 *
 * DELIBERATELY NOT `updateMember`. That RPC REPLACES the whole member --
 * aliases, emails, offering and weekdays -- and the course screen's `Member`
 * carries no `offering_id` and no weekdays to hand back, so routing a
 * nickname through it would silently wipe her enrolment to save a name.
 *
 * The alias index is unique across the WHOLE register (`member_aliases_unique`
 * on alias_type + alias_normalized, 0006), which is what stops one display
 * name pointing at two people. A name already claimed is therefore refused
 * with that fact, never swallowed -- the import matches on these, so a
 * silently dropped alias would look like a working link and match nobody.
 *
 * `alias_normalized` is not supplied: the `member_aliases_normalize` trigger
 * computes it, and duplicating that here is how the two would drift.
 */
export async function addMemberAlias(memberId: string, alias: string): Promise<void> {
  const display = cleanAlias(alias);

  if (!isConfigured) {
    const i = MEMBERS.findIndex(m => m.id === memberId);
    if (i < 0) throw new Error('That member is not on the register. Nothing has been saved.');
    // The same rule the unique index applies live, run against the fixture
    // register -- one module, so the two paths cannot tell different stories.
    const problem = aliasProblem(display, MEMBERS.flatMap(m => m.aliases));
    if (problem) throw new Error(problem);
    MEMBERS[i] = { ...MEMBERS[i], aliases: [...MEMBERS[i].aliases, display] };
    membersChanged();
    return;
  }

  // Live, the register is the database's to know; only the empty name can be
  // ruled out from here, and 23505 answers the rest.
  const empty = aliasProblem(display, []);
  if (empty) throw new Error(empty);

  const { error } = await supabase.from('member_aliases').insert({
    member_id: memberId, alias_type: 'name', alias_display: display, source: 'manual',
  });
  if (error) {
    console.error('addMemberAlias:', error.message);
    throw new Error(aliasSaveError(error.code, display));
  }
  membersChanged();
}

/**
 * FOLD a member created in error into the member she actually is.
 *
 * WHY THIS IS NOT `addMemberAlias`
 * The alias is the visible half of the act. The other half is the attendance.
 * The importer now auto-creates a member for a Meet display name it cannot
 * resolve, and marks HER present -- so the record that says somebody came to
 * class is on "Rani Sham", while Rani is still expected and therefore still
 * absent. Teaching the matcher the spelling fixes every FUTURE file and
 * leaves THIS one saying a woman who attended did not.
 *
 * So the alias write stayed where it was, for the case it is still right for
 * (a nickname on a member who is genuinely herself), and the merge is its own
 * act with its own name. `merge_member_into` (0032) does both halves in one
 * transaction; the rules that decide which record survives a clash live there
 * and are asserted in `supabase/tests/25_merge_member.sql`.
 */
export async function mergeMemberInto(strayId: string, targetId: string):
  Promise<{ display_name: string; attendance_moved: number }> {
  if (!isConfigured) {
    const si = MEMBERS.findIndex(m => m.id === strayId);
    const ti = MEMBERS.findIndex(m => m.id === targetId);
    if (si < 0 || ti < 0) throw new Error('That member is not on the register. Nothing has been saved.');
    if (strayId === targetId) {
      throw new Error('That is the same member — a member cannot be merged into herself.');
    }
    const stray = MEMBERS[si];
    if (stray.emails.length > 0) {
      throw new Error(
        `${stray.name} has an email address of her own, so merging her would have to choose which address wins. Add the display name by hand instead.`);
    }
    // The same rule the unique index applies live, run against the fixture
    // register -- one module, so the two paths cannot tell different stories.
    const problem = aliasProblem(cleanAlias(stray.name), MEMBERS.flatMap(m => m.aliases));
    if (problem) throw new Error(problem);

    // The fixture register keeps COUNTS, not per-session records, so the move
    // is expressed in the counts: what she was marked present for stops being
    // one of the target's absences. The per-session rules -- which record
    // survives when both were in one class -- are the migration's, and 0032's
    // specs are what hold them.
    const target = MEMBERS[ti];
    const moved = stray.attended;
    MEMBERS[ti] = {
      ...target,
      aliases: [...target.aliases, cleanAlias(stray.name), ...stray.aliases],
      attended: target.attended + moved,
      missed: Math.max(0, target.missed - moved),
    };
    MEMBERS.splice(si, 1);
    membersChanged();
    return { display_name: stray.name, attendance_moved: moved };
  }

  const { data, error } = await supabase.rpc('merge_member_into', {
    p_stray: strayId, p_target: targetId,
  });
  if (error) {
    console.error('mergeMemberInto:', error.message);
    // merge_member_into's own RAISE messages are written for an operator --
    // "she has an email address of her own", "not on the register" -- so they
    // are passed through rather than replaced by a generic failure.
    throw new Error(personReadable(error.message ?? '', MERGE_FAILED));
  }
  membersChanged();
  const result = (data ?? {}) as { display_name?: string; attendance_moved?: number };
  return {
    display_name: result.display_name ?? '',
    attendance_moved: result.attendance_moved ?? 0,
  };
}

/**
 * MARKING a member active or inactive.
 *
 * WHY THIS IS A WRITE AT ALL
 * `members.status` has existed since 0006 and nothing has ever set it, while
 * `follow_up_candidates()` (0009) has always required it to be 'active'. So
 * the column silently decided who the server would mail and no screen could
 * see it, let alone change it. This is the control for it.
 *
 * WHY AN RPC when `members` carries an UPDATE policy
 * The policy would let this be a direct `.update({ status })`, and a direct
 * update cannot stamp `status_changed_at` and `updated_by` truthfully: the
 * client does not know the actor's app_users row, only its auth uid. 0031
 * resolves the actor server-side, the same way every other member write does,
 * so the audit trigger records WHO took her off the register and when.
 *
 * It is not a toggle server-side. The caller states the status it wants, so
 * two people tapping at once land on a value one of them chose rather than on
 * whichever order the round-trips happened to arrive in.
 *
 * FROM WHEN, since 0044. `inactiveFrom` is the first day the status applies:
 * omit it (or pass null) and the status applies on every day, which is what
 * the one-tap roster pill has always meant and what every row written before
 * 0044 carries. Marking her active clears it server-side -- coming back on
 * has no date to it -- and the fixture path does the same, or the two stores
 * would tell different stories about the same tap.
 */
export async function setMemberStatus(
  id: string, status: MemberStatus, inactiveFrom: string | null = null):
  Promise<{ changed: boolean }> {
  const from = status === 'active' ? null : inactiveFrom;
  if (!isConfigured) {
    // Offline the fixture list IS the store -- a pill that flips and a list
    // that did not change is the lie RC-008 was about.
    const i = MEMBERS.findIndex(m => m.id === id);
    if (i < 0) throw new Error('That member is not on the register. Nothing has been saved.');
    // The same refusal set_member_status raises, run against the fixture
    // register: a form that saves offline what the database would decline is
    // a form nobody can trust the offline mode of.
    const problem = from ? inactiveFromProblem(from, MEMBERS[i].joinedOn ?? null) : null;
    if (problem) throw new Error(`${problem}. Nothing has been saved.`);
    const changed = MEMBERS[i].status !== status
      || (MEMBERS[i].inactiveFrom ?? null) !== from;
    MEMBERS[i] = { ...MEMBERS[i], status, inactiveFrom: from };
    membersChanged();
    return { changed };
  }

  const { data, error } = await supabase.rpc('set_member_status', {
    p_member_id: id,
    p_status: status,
    p_inactive_from: from,
  });
  if (error || !data) {
    console.error('setMemberStatus:', error?.message ?? 'no row returned');
    // Raised into the SAME banner on the SAME form as memberWriteError's
    // refusals (app/member/edit.tsx) -- the status pick sits inside the edit
    // dialog. set_member_status (0031) raises lowercase like every other RPC,
    // so without this the one banner opens two ways depending on which half
    // of the form was refused, which is the very thing this change was asked
    // to fix (requests/2026-09-07-display-name-refusal-clears-and-case.md).
    // The missing personReadable() guard here is TD-030, not this change.
    throw new Error(`${sentenceOpening((error?.message ?? '').trim() || 'Her status could not be changed')}. Nothing has been saved.`);
  }

  // Her eligibility for follow-up moves with it, and the flagged set is
  // DERIVED from this one list (guardrail 1) -- so revalidating the roster is
  // the dashboard count, the weekly list and the send draft, all of them.
  membersChanged();
  return { changed: Boolean((data as { changed?: boolean }).changed) };
}

/** What a deletion actually did, so the toast can say it rather than guess.
 *  Counts of what WENT since 0051 -- until then this carried `attendanceKept`,
 *  because until then the deletion kept it. */
export type MemberDeletion = {
  name: string | null;
  attendanceRemoved: number;
  /** the days her attendance spanned; those sessions survive, their figures change */
  sessionsTouched: number;
  enrolmentsRemoved: number;
  emailsRemoved: number;
  aliasesRemoved: number;
  messagesRemoved: number;
  alreadyDeleted: boolean;
};

/**
 * What the confirmation is allowed to say BEFORE the tap.
 *
 * Since 0051 the dialog can promise nothing -- "her attendance history stays"
 * was withdrawn with the soft delete -- so it states a quantity instead, and
 * the app holds none of these numbers: the members read carries a roster and a
 * status, never her attendance rows or her sent mail. Read-only, and gated
 * exactly as the deletion is.
 */
export type MemberDeletionPreview = {
  name: string | null;
  attendanceRecords: number;
  sessionsAttended: number;
  enrolments: number;
  emailsSent: number;
  alreadyDeleted: boolean;
};

export async function memberDeletionPreview(id: string): Promise<MemberDeletionPreview> {
  if (!isConfigured) {
    // The fixture store holds members and their course and nothing that
    // happened on a day, so the honest offline count of attendance and mail is
    // zero -- that IS what deleting from this device destroys.
    const member = MEMBERS.find(m => m.id === id);
    if (!member) {
      return { name: null, attendanceRecords: 0, sessionsAttended: 0, enrolments: 0,
               emailsSent: 0, alreadyDeleted: true };
    }
    return { name: member.name, attendanceRecords: 0, sessionsAttended: 0,
             enrolments: member.course ? 1 : 0, emailsSent: 0, alreadyDeleted: false };
  }
  const { data, error } = await supabase.rpc('member_deletion_preview', { p_member_id: id });
  if (error) {
    console.error('memberDeletionPreview:', error.message);
    throw new Error(`${personReadable(error.message, 'What this deletion would remove could not be counted')}. Nothing has been changed.`);
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    name: (r.name as string | null) ?? null,
    attendanceRecords: Number(r.attendance_records ?? 0),
    sessionsAttended: Number(r.sessions_attended ?? 0),
    enrolments: Number(r.enrolments ?? 0),
    emailsSent: Number(r.emails_sent ?? 0),
    alreadyDeleted: Boolean(r.already_deleted),
  };
}

/**
 * Removing a member from the register.
 *
 * WHY THIS IS NOT set_member_status('inactive')
 * They answer different questions. Inactive is a member who is still on the
 * register and is not being followed up; deleted is a member who should not be
 * on it -- a duplicate, a test row, somebody entered twice under two spellings.
 * The register offers both because the requester asked for CRUD and the D is
 * the one the roster's bin icon has always claimed to be
 * (requests/2026-09-07-staff-write-access.md).
 *
 * A HARD DELETE SINCE 0051, by the repo owner's decision
 * (requests/2026-09-08-hard-delete-member.md): "delete that record entirely
 * from database". Her row, her addresses, her aliases, her enrolments, her
 * schedules, her stats, her attendance records, her expected-slots and the
 * mail the academy sent her all leave the database. Nothing of her is left in
 * any table.
 *
 * WHAT THIS REPLACED, AND WHY THERE WAS NO MIDDLE OPTION
 * Until 0051 this was a soft delete, because attendance_records.member_id --
 * and session_expectations.member_id, and email_messages.member_id --
 * reference members(id) with no ON DELETE, so a hard delete was refused by the
 * foreign key whatever anyone intended. That is why the request could not be
 * answered by deleting less: those rows either go with her or the deletion
 * does not happen. The requester was shown the live counts and chose the
 * removal.
 *
 * An RPC and not a direct write, and not by preference: a client cannot reach
 * attendance_records or session_expectations at all, and the constraint that
 * bites -- email_messages pointing at member_emails, which cascades from
 * members -- means the removal has to run children-first in one transaction at
 * a level that can reach all of them.
 *
 * Idempotent, like deleteCourse: a second tap reports `alreadyDeleted` rather
 * than an error.
 */
export async function deleteMember(id: string): Promise<MemberDeletion> {
  if (!isConfigured) {
    // Offline the fixture list IS the store -- a row that vanishes from the
    // screen and not from the list is the lie RC-008 was about.
    const at = MEMBERS.findIndex(m => m.id === id);
    if (at < 0) {
      return { name: null, attendanceRemoved: 0, sessionsTouched: 0, enrolmentsRemoved: 0,
               emailsRemoved: 0, aliasesRemoved: 0, messagesRemoved: 0, alreadyDeleted: true };
    }
    const [member] = MEMBERS.splice(at, 1);
    membersChanged();
    return { name: member.name, attendanceRemoved: 0, sessionsTouched: 0,
             enrolmentsRemoved: member.course ? 1 : 0, emailsRemoved: 0,
             aliasesRemoved: 0, messagesRemoved: 0, alreadyDeleted: false };
  }

  const { data, error } = await supabase.rpc('delete_member', { p_member_id: id });
  if (error) {
    console.error('deleteMember:', error.message);
    if (/not writable/i.test(error.message)) {
      throw new Error('She could not be removed — the subscription has to be active. Nothing has been changed.');
    }
    throw new Error(`${personReadable(error.message, 'She could not be removed')}. Nothing has been changed.`);
  }

  // The flagged set is DERIVED from this one list (guardrail 1), so
  // revalidating the roster is the dashboard count, the weekly list and the
  // send draft, all of them.
  membersChanged();
  // NEW WITH 0051, and not optional. The deletion now removes attendance ROWS,
  // so a day strip or week view mounted right now is holding figures that
  // counted her -- the same class of staleness deleteCourse had to announce.
  // Without this the roster loses her and the day beside it still says she was
  // present.
  attendanceChanged();

  const r = (data ?? {}) as Record<string, unknown>;
  return {
    name: (r.name as string | null) ?? null,
    attendanceRemoved: Number(r.attendance_removed ?? 0),
    sessionsTouched: Number(r.sessions_touched ?? 0),
    enrolmentsRemoved: Number(r.enrolments_removed ?? 0),
    emailsRemoved: Number(r.emails_removed ?? 0),
    aliasesRemoved: Number(r.aliases_removed ?? 0),
    messagesRemoved: Number(r.messages_removed ?? 0),
    alreadyDeleted: Boolean(r.already_deleted),
  };
}

/* -------------------------------------------------- undoing a day's register
 *
 * The counterpart commit_csv_import never had. See 0056 for why the day goes
 * back to awaiting by DERIVATION -- rows cleared, session returned to
 * `scheduled`, the day's imports moved to `reverted` so the same export can be
 * uploaded again -- and why the delete offer is driven by the REGISTER rather
 * than by the roster.
 */
export type ResetDeletable = {
  member_id: string;
  name: string;
  has_email: boolean;
  other_days: number;
};

export type ResetPreviewResult = {
  marks: number;
  members: number;
  /** of those, the ones WITH an address -- the members a reset only un-marks */
  keeping: number;
  deletable: ResetDeletable[];
};

/**
 * 0056 may not be applied yet. PostgREST answers a missing function with
 * PGRST202 and Postgres with 42883, and both arrive as a sentence about a
 * schema cache -- which tells the person nothing about what to do and reads
 * as a fault of theirs. Naming it is the honest answer, and it is a different
 * fact from "the write was refused". The same treatment setAttendance gives
 * 0035, for the same reason.
 */
function missingReset(error: { code?: string } | null): boolean {
  const code = error?.code ?? '';
  return code === 'PGRST202' || code === '42883';
}

export async function attendanceResetPreview(
  courseId: string, dayIso: string,
): Promise<ResetPreviewResult> {
  if (!isConfigured) {
    // Offline the fixture IS the store, and the same derivation the screen
    // uses answers here -- a second rule in this file is how the offline mode
    // starts telling a different story from the live one.
    const rows = attendanceFixture(dayIso, dayIso)
      .filter(r => r.course_id === courseId && r.date === dayIso);
    const seen = new Map<string, ResetDeletable>();
    for (const r of rows) {
      if (seen.has(r.member_id)) continue;
      const member = MEMBERS.find(m => m.id === r.member_id);
      seen.set(r.member_id, {
        member_id: r.member_id,
        name: r.member,
        has_email: Boolean(member && primaryEmail(member)),
        // The fixture holds no history beyond what the generator makes, so
        // the honest offline answer is zero rather than an invented count.
        other_days: 0,
      });
    }
    const members = [...seen.values()];
    return {
      marks: rows.length,
      members: members.length,
      keeping: members.filter(m => m.has_email).length,
      deletable: members.filter(m => !m.has_email)
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }

  const { data, error } = await supabase.rpc('attendance_reset_preview', {
    p_course_id: courseId, p_session_date: dayIso,
  });
  if (error) {
    console.error('attendanceResetPreview:', error.message);
    if (missingReset(error)) {
      throw new Error('The academy database cannot reset a register yet — '
        + 'migration 0056 has not been applied. Nothing has been changed.');
    }
    throw new Error(`${personReadable(error.message, 'What this reset would clear could not be counted')}. Nothing has been changed.`);
  }
  const r = (data ?? {}) as Record<string, unknown>;
  return {
    marks: Number(r.marks ?? 0),
    members: Number(r.members ?? 0),
    keeping: Number(r.keeping ?? 0),
    deletable: ((r.deletable ?? []) as Record<string, unknown>[]).map(d => ({
      member_id: String(d.member_id ?? ''),
      name: String(d.name ?? '—'),
      has_email: Boolean(d.has_email),
      other_days: Number(d.other_days ?? 0),
    })),
  };
}

/**
 * Clear one day of one course, and hard-delete whichever addressless members
 * the operator ticked.
 *
 * `deleteMemberIds` is a REQUEST, not an instruction: 0056 intersects it with
 * the members that day's register actually marks who have no address, so an
 * id that is neither is ignored rather than obeyed. The screen never sends
 * one; the intersection is what stops this being a delete-any-member endpoint
 * if anything else ever calls it.
 */
export async function resetDayAttendance(
  courseId: string, dayIso: string, deleteMemberIds: string[] = [],
): Promise<{ cleared: number; deleted: number }> {
  if (!isConfigured) {
    const before = attendanceFixture(dayIso, dayIso)
      .filter(r => r.course_id === courseId && r.date === dayIso).length;
    resetFixtureDay(courseId, dayIso);
    let deleted = 0;
    for (const id of deleteMemberIds) {
      const at = MEMBERS.findIndex(m => m.id === id);
      if (at < 0) continue;
      MEMBERS.splice(at, 1);
      deleted += 1;
    }
    attendanceChanged();
    membersChanged();
    return { cleared: before, deleted };
  }

  const { data, error } = await supabase.rpc('reset_day_attendance', {
    p_course_id: courseId,
    p_session_date: dayIso,
    p_delete_member_ids: deleteMemberIds,
  });
  if (error) {
    console.error('resetDayAttendance:', error.message);
    if (missingReset(error)) {
      throw new Error('The academy database cannot reset a register yet — '
        + 'migration 0056 has not been applied. Nothing has been cleared.');
    }
    if (/not writable/i.test(error.message)) {
      throw new Error('The register could not be reset — the subscription has to be active. Nothing has been cleared.');
    }
    throw new Error(personReadable(error.message, 'The register could not be reset'));
  }

  // Both, and for the reason attendanceImported announces both: the register
  // moved AND the per-member figures derived from it did. A day strip that
  // went back to awaiting beside a Missed count that still counts the marks
  // it cleared is two answers to one question on one screen.
  attendanceChanged();
  membersChanged();

  const r = (data ?? {}) as Record<string, unknown>;
  return { cleared: Number(r.cleared ?? 0), deleted: Number(r.deleted ?? 0) };
}

/* ------------------------------------------------ marking attendance by hand
 *
 * A counter every mounted useAttendance reads, bumped by every attendance
 * write. Not a cache: nothing is stored here, it only says "ask again".
 * Without it, a chip that filled and a week strip that still said "awaiting
 * upload" would be two answers to one question on one screen.
 */
const attendanceListeners = new Set<() => void>();

export function onAttendanceChanged(listener: () => void): () => void {
  attendanceListeners.add(listener);
  return () => { attendanceListeners.delete(listener); };
}

function attendanceChanged(): void {
  for (const listener of attendanceListeners) listener();
}

/**
 * A CSV import landed.
 *
 * The import is written by an Edge Function through `api.ts`, not through
 * this file, so none of the notifications above fire on their own -- and
 * what it wrote is exactly what the member cards, the day strip and the
 * week view are showing. Without this the Members tab keeps the figures it
 * loaded before the upload until something remounts it, which reads as an
 * import that did nothing.
 *
 * Both, for the reason setAttendance announces both: the register moved AND
 * the per-member figures derived from it did, and a card whose attendance
 * changed beside a Missed count that did not is two answers to one question
 * on one screen.
 */
export function attendanceImported(): void {
  attendanceChanged();
  membersChanged();
}

/**
 * MARKING one member present or absent on one day.
 *
 * WHY AN RPC and not a write on the table
 * `authenticated` holds only SELECT on attendance_records, deliberately: the
 * anon key is compiled into the bundle, and the guarantee that a stolen one
 * cannot forge attendance is what that grant buys (guardrail 4, and RC-007
 * is the incident where every narrow grant turned out to be a no-op). 0035
 * is a SECURITY DEFINER function that re-checks the caller and keeps four
 * things out of the client's hands: whether she was expected, whether the
 * day's session exists, what the register said before somebody disagreed
 * with it, and which app_users row the actor is.
 *
 * `status` is what the PERSON chose. What is stored may be 'extra' — she
 * turned up when nobody expected her — and that is the server's decision,
 * not this function's.
 */
export async function setAttendance(
  memberId: string, date: string, status: 'present' | 'absent',
): Promise<{ changed: boolean; status: AttendanceStatus }> {
  if (!isConfigured) {
    // Offline the fixture IS the store. The same two rules the RPC applies,
    // through the same derivation the chips used to decide what to offer —
    // a second answer here is how the offline mode starts telling a
    // different story from the live one.
    const member = MEMBERS.find(m => m.id === memberId);
    if (!member) throw new Error('That member is not on the register. Nothing has been saved.');
    const offering = COURSE_LIST.find(c => c.name === member.course)
      ?.offerings.find(o => o.branch === member.branch);
    const schedule = member.weekdays ?? offering?.weekdays ?? [];
    const expected = schedule.includes(isoWeekday(date));
    if (status === 'absent' && !expected) {
      throw new Error(`${member.name} was not expected on ${dayInWords(date)}. `
        + 'Mark her present and it is recorded as extra.');
    }
    const stored = storedStatus(status, expected);
    const changed = MANUAL_MARKS.get(`${memberId}|${date}`) !== stored;
    markFixtureAttendance(memberId, date, stored);
    attendanceChanged();
    membersChanged();
    return { changed, status: stored };
  }

  const { data, error } = await supabase.rpc('set_attendance', {
    p_member_id: memberId,
    p_date: date,
    p_status: status,
  });
  if (error || !data) {
    console.error('setAttendance:', error?.message ?? 'no row returned');
    // 0035 may not be applied yet. PostgREST answers a missing function with
    // PGRST202 and Postgres with 42883, and both arrive here as a sentence
    // about a schema cache — which tells the person nothing about what to do
    // and reads as a fault of theirs. Naming it is the honest answer, and it
    // is a different fact from "the write was refused".
    const code = (error as { code?: string } | null)?.code ?? '';
    if (code === 'PGRST202' || code === '42883') {
      throw new Error('The academy database cannot record attendance by hand yet — '
        + 'migration 0035 has not been applied. Nothing has been saved.');
    }
    throw new Error(`${sentenceOpening((error?.message ?? '').trim()
      || 'Her attendance could not be changed')}. Nothing has been saved.`);
  }

  const result = data as { changed?: boolean; status?: AttendanceStatus };
  // The week strip and the roster both read attendance; her Missed and
  // consecutive figures come from member_period_metrics and member_stats,
  // which the RPC has just recomputed. Both are revalidated, or the screen
  // shows a chip that moved beside numbers that did not.
  attendanceChanged();
  membersChanged();
  return {
    changed: Boolean(result.changed),
    status: (result.status as AttendanceStatus) ?? status,
  };
}
