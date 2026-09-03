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
import type { Period } from './period';
import { currentSchedules, today } from './schedule';
import {
  MEMBERS, COURSE_LIST, GLOBAL_RULE, COURSE_RULES, TEMPLATES, STAFF, AUDIT,
  BRANCHES, COURSES, MONTH_DAYS, PENDING_SESSIONS, WEEK_ROWS, attendanceFixture,
  HOLIDAYS, HOLIDAY_PREVIEW,
  type Member, type Course, type FollowUpRule, type Template, type Staff,
  type StaffAccess, type AuditEntry, type SessionDay, type WeekRow,
  type AttendanceRow, type AttendanceStatus, type Holiday,
} from './mock';

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

// ------------------------------------------------------------------ members
type MetricRow = { member_id: string; expected: number; attended: number; missed: number };

export async function fetchMembers(period: Period): Promise<Member[]> {
  if (!isConfigured) return MEMBERS;

  const [membersRes, emailsRes, aliasesRes, statsRes, enrolRes, metricsRes] = await Promise.all([
    supabase.from('members').select('id, member_code, full_name, status').is('deleted_at', null).order('full_name'),
    supabase.from('member_emails').select('member_id, email, is_primary, status').is('deleted_at', null),
    supabase.from('member_aliases').select('member_id, alias_display').eq('alias_type', 'name'),
    supabase.from('member_stats').select('member_id, current_streak, last_emailed_at'),
    supabase.from('member_enrollments').select('member_id, offering_id').eq('status', 'active'),
    supabase.rpc('member_period_metrics', { p_from: period.from, p_to: period.to }),
  ]);
  if (membersRes.error) fail('Could not load members', membersRes.error);

  const offeringIds = [...new Set((enrolRes.data ?? []).map(e => e.offering_id as string))];
  const offerings = offeringIds.length
    ? await supabase.from('course_offerings').select('id, course_id, branch_id').in('id', offeringIds)
    : { data: [], error: null };
  const courseIds = [...new Set((offerings.data ?? []).map(o => o.course_id as string))];
  const branchIds = [...new Set((offerings.data ?? []).map(o => o.branch_id as string))];
  const [coursesRes, branchesRes] = await Promise.all([
    courseIds.length ? supabase.from('courses').select('id, name').in('id', courseIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    branchIds.length ? supabase.from('branches').select('id, name').in('id', branchIds) : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const offeringById = new Map((offerings.data ?? []).map(o => [o.id as string, o]));
  const courseName = new Map((coursesRes.data ?? []).map(c => [c.id, c.name]));
  const branchName = new Map((branchesRes.data ?? []).map(b => [b.id, b.name]));
  const enrolByMember = new Map((enrolRes.data ?? []).map(e => [e.member_id as string, e.offering_id as string]));
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
      code: m.member_code as string,
      name: m.full_name as string,
      course: offering ? (courseName.get(offering.course_id as string) ?? '—') : '—',
      branch: offering ? (branchName.get(offering.branch_id as string) ?? '—') : '—',
      aliases: aliasesByMember.get(m.id as string) ?? [],
      emails: emailsByMember.get(m.id as string) ?? [],
      expected: metric?.expected ?? 0,
      attended: metric?.attended ?? 0,
      missed: metric?.missed ?? 0,
      streak: (stat?.current_streak as number) ?? 0,
      last: stat?.last_emailed_at ? new Date(stat.last_emailed_at as string).toLocaleDateString() : '—',
    };
  });
}

// -------------------------------------------------------------- follow-up rules
export type Rules = { global: FollowUpRule; byCourseName: Record<string, FollowUpRule> };

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

/** RLS and the CHECK constraints answer in Postgres' words. These are the
 *  three a person can actually act on, so they are translated; anything else
 *  keeps the database's own message rather than a guess at what it meant. */
function courseWriteError(error: { code?: string; message?: string } | null): string {
  const code = error?.code ?? '';
  const message = error?.message ?? '';
  if (code === '42501' || /row-level security/i.test(message)) {
    return 'Only the super admin can add or change a course, and only while the subscription is active. Nothing has been saved.';
  }
  if (code === '23505' || /courses_name_live/.test(message)) {
    return 'A course with this name already exists. Nothing has been saved.';
  }
  if (/default_end_time|courses_check/.test(message)) {
    return 'The end time must be after the start time. Nothing has been saved.';
  }
  return `${message || 'The course could not be saved'}. Nothing has been saved.`;
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
    throw new Error('That course could not be changed — only the super admin may, and only while the subscription is active. Nothing has been saved.');
  }
  coursesChanged();
}

/** What a deletion actually did, so the toast can say it rather than guess. */
export type CourseDeletion = {
  name: string | null;
  offerings: number;
  sessionsRemoved: number;
  sessionsKept: number;
  enrolmentsEnded: number;
  alreadyDeleted: boolean;
};

/**
 * Deleting a course, as ONE call.
 *
 * An RPC and not a direct write, and not by preference. The confirmation
 * promises that attendance history STAYS while the course and its sessions
 * go, and a client cannot keep that promise:
 *
 *   * hiding the courses row leaves its offerings live, and every read of
 *     expected attendance goes through course_offerings ->
 *     offering_schedules -> sessions, never through courses. The course would
 *     leave the list and go on expecting attendance and emailing members.
 *   * sessions cannot be hidden from a client at all: 0007 grants
 *     authenticated `update (status, cancellation_reason)` and nothing else,
 *     deliberately.
 *
 * public.delete_course (0020) does the whole thing in one transaction, and
 * draws the line where the promise draws it: COMPLETED sessions, their frozen
 * expectations and every attendance record are untouched.
 */
export async function deleteCourse(id: string): Promise<CourseDeletion> {
  if (!isConfigured) {
    const at = COURSE_LIST.findIndex(c => c.id === id);
    if (at < 0) {
      return { name: null, offerings: 0, sessionsRemoved: 0, sessionsKept: 0,
               enrolmentsEnded: 0, alreadyDeleted: true };
    }
    const [course] = COURSE_LIST.splice(at, 1);
    coursesChanged();
    return {
      name: course.name, offerings: course.offerings.length,
      sessionsRemoved: 0, sessionsKept: 0,
      enrolmentsEnded: MEMBERS.filter(m => m.course === course.name).length,
      alreadyDeleted: false,
    };
  }

  const { data, error } = await supabase.rpc('delete_course', { p_course_id: id });
  if (error) {
    console.error('deleteCourse:', error.message);
    if (/only the super admin|not writable/i.test(error.message)) {
      throw new Error('Only the super admin can delete a course, and only while the subscription is active. Nothing has been changed.');
    }
    throw new Error(`${error.message}. Nothing has been changed.`);
  }
  coursesChanged();

  const r = (data ?? {}) as Record<string, unknown>;
  return {
    name: (r.name as string | null) ?? null,
    offerings: Number(r.offerings ?? 0),
    sessionsRemoved: Number(r.sessions_removed ?? 0),
    sessionsKept: Number(r.sessions_kept ?? 0),
    enrolmentsEnded: Number(r.enrolments_ended ?? 0),
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
 *  These are the ones a person can act on; anything else keeps the
 *  database's message rather than a guess at what it meant. */
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
  return `${message || 'The branch could not be saved'}. Nothing has been changed.`;
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
    return 'Only the super admin can add an offering, and only while the subscription is active. Nothing has been saved.';
  }
  if (code === '23505' || /offerings_unique_live/.test(message)) {
    return 'This course already runs at that branch. Edit that offering instead of adding a second one.';
  }
  return `${message || 'The offering could not be saved'}. Nothing has been saved.`;
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
    throw new Error(`${error.message || 'The schedule could not be saved'}. Nothing has been saved.`);
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
  if (!isConfigured) return STAFF;

  const { data, error } = await supabase.from('app_users')
    .select('id, name, phone_e164, role_label, is_active, pin_set_at, last_login_at, created_at')
    .is('deleted_at', null).order('name');
  if (error) fail('Could not load staff', error);

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
    };
  });
}

// -------------------------------------------------------------------- audit
export async function fetchAudit(): Promise<AuditEntry[]> {
  if (!isConfigured) return AUDIT;

  const { data, error } = await supabase.from('audit_logs')
    .select('id, occurred_at, action, entity_type, entity_id, changes, actor_app_user_id')
    .order('occurred_at', { ascending: false }).limit(50);
  if (error) fail('Could not load the audit log', error);

  const actorIds = [...new Set((data ?? []).map(r => r.actor_app_user_id).filter(Boolean))] as string[];
  const actors = actorIds.length
    ? await supabase.from('app_users').select('id, name').in('id', actorIds)
    : { data: [] as { id: string; name: string }[] };
  const actorName = new Map((actors.data ?? []).map(a => [a.id, a.name]));

  return (data ?? []).map(r => ({
    id: String(r.id),
    who: r.actor_app_user_id ? (actorName.get(r.actor_app_user_id as string) ?? 'Unknown') : 'System',
    when: new Date(r.occurred_at as string).toLocaleString(),
    action: r.action as string,
    entity: r.entity_type as string,
    subject: (r.entity_id as string) ?? '—',
    changes: ((r.changes ?? []) as { field: string; old: unknown; new: unknown }[]).map(c => ({
      field: c.field,
      old: c.old === null || c.old === undefined ? null : String(c.old),
      new: c.new === null || c.new === undefined ? null : String(c.new),
    })),
  }));
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
export type PendingSession = {
  session_id: string | null; offering_id: string; session_date: string;
  dayNum: string; mon: string; title: string; meta: string; label: string;
};

const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export async function fetchPendingSessions(): Promise<PendingSession[]> {
  if (!isConfigured) {
    return PENDING_SESSIONS.map(p => ({
      ...p, session_id: null, offering_id: '', session_date: '',
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
      dayNum: String(date.getDate()),
      mon: MONTHS_SHORT[date.getMonth()],
      title: `${course}${time ? ` · ${time}` : ''}`,
      meta: `${branch} · ${s.expected_count ?? 0} expected · awaiting upload`,
      label: `${DAYS_SHORT[date.getDay()]} ${date.getDate()} ${MONTHS_SHORT[date.getMonth()][0]}${MONTHS_SHORT[date.getMonth()].slice(1).toLowerCase()} · ${course}${time ? ` ${time}` : ''}`,
    };
  });
}

// --------------------------------------------------- per-user appearance
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
    supabase.from('members').select('id, member_code, full_name').in('id', memberIds),
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
      code: (member?.member_code as string) ?? '—',
      course: offering ? (courseName.get(offering.course_id as string) ?? '—') : '—',
      branch: offering ? (branchName.get(offering.branch_id as string) ?? '—') : '—',
      date: (session?.session_date as string) ?? '',
      time: (session?.start_time as string | null)?.slice(0, 5) ?? '',
      status: r.status as AttendanceStatus,
      expected: Boolean(r.expected),
      minutes: (r.minutes_in_call as number | null) ?? null,
    };
  }).sort((a, b) => (a.date === b.date ? a.member.localeCompare(b.member) : b.date.localeCompare(a.date)));
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
  return `${message || 'The holiday could not be saved'}. Nothing has been changed.`;
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
 */
function memberWriteError(error: { message?: string } | null): string {
  const message = (error?.message ?? '').trim();
  return `${message || 'The member could not be saved'}. Nothing has been saved.`;
}

export async function createMember(input: MemberInput): Promise<{ id: string; code: string }> {
  if (!isConfigured) {
    // Offline the fixture list IS the store, so she has to land in it — a
    // screen that says "added" over a list that never changed is the same
    // lie, moved one layer down.
    const course = COURSE_LIST.find(c => c.offerings.some(o => o.id === input.offering_id));
    const offering = course?.offerings.find(o => o.id === input.offering_id);
    const member: Member = {
      id: `local-${Date.now()}`,
      code: `RF-${String(MEMBERS.length + 1).padStart(6, '0')}`,
      name: input.full_name,
      course: course?.name ?? '—',
      branch: offering?.branch ?? '—',
      aliases: input.aliases,
      emails: input.emails.map((address, i) => ({ address, primary: i === 0 })),
      expected: 0, attended: 0, missed: 0, streak: 0, last: '\u2014',
    };
    MEMBERS.push(member);
    membersChanged();
    return { id: member.id, code: member.code };
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
  return {
    id: (data as { member_id: string }).member_id,
    code: (data as { member_code: string }).member_code,
  };
}
