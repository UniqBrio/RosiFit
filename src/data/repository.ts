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
import {
  MEMBERS, COURSE_LIST, GLOBAL_RULE, COURSE_RULES, TEMPLATES, STAFF, AUDIT,
  BRANCHES, COURSES, MONTH_DAYS, PENDING_SESSIONS, WEEK_ROWS,
  type Member, type Course, type FollowUpRule, type Template, type Staff,
  type StaffAccess, type AuditEntry, type SessionDay, type WeekRow,
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
  // the schedule effective now, per offering: the latest one whose window is open
  const today = new Date().toISOString().slice(0, 10);
  const weekdaysByOffering = new Map<string, number[]>();
  for (const s of schedulesRes.data ?? []) {
    const from = s.effective_from as string;
    const to = s.effective_to as string | null;
    if (from > today || (to && to < today)) continue;
    weekdaysByOffering.set(s.offering_id as string, (s.weekdays as number[]) ?? []);
  }

  return (coursesRes.data ?? []).map(c => ({
    id: c.id as string,
    name: c.name as string,
    start_time: (c.default_start_time as string | null)?.slice(0, 5) ?? null,
    end_time: (c.default_end_time as string | null)?.slice(0, 5) ?? null,
    frequency: (c.default_frequency as number | null) ?? null,
    offerings: (offeringsRes.data ?? [])
      .filter(o => o.course_id === c.id)
      .map(o => ({
        branch: branchName.get(o.branch_id as string) ?? '—',
        weekdays: weekdaysByOffering.get(o.id as string) ?? [],
      })),
  }));
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
