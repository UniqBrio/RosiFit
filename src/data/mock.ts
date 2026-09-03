/**
 * Stand-in data until the Edge Functions land.
 *
 * Every shape here mirrors what the SQL actually returns, so swapping in the
 * real calls is a change of source, not of screens:
 *   FollowUpCandidate <- public.follow_up_candidates()
 *   PeriodMetrics     <- public.member_period_metrics()
 *   MatchRow          <- csv-stage's five outcomes
 */

export type FollowUpCandidate = {
  member_id: string; full_name: string; course_name: string; branch_name: string;
  expected: number; attended: number; missed: number;
  attendance_pct: number | null; current_streak: number;
  config_source: 'course' | 'global';
  reason: string;             // names the condition that fired, not the rule
  has_email: boolean;         // C-76: false means listed but not sendable
};

// CANDIDATES is derived further down, once MEMBERS and the rule exist.

/** The five outcomes of CSV review (C-79). C, D and E block the import. */
export type MatchKind = 'matched' | 'noEmail' | 'possible' | 'ambiguous' | 'unmatched';

export const OUTCOME_META: Record<MatchKind, { tag: string; blocks: boolean; note: string }> = {
  matched:   { tag: 'A · Matched',          blocks: false, note: 'Matched to an existing member.' },
  noEmail:   { tag: 'B · No email',         blocks: false, note: 'Member identified, but no email is configured. Her attendance will still be recorded. She will not be included in follow-up emails until an address is added.' },
  possible:  { tag: 'C · Possible member',  blocks: true,  note: 'Possible existing member found. Nothing is applied until you choose — this is the prompt that stops a duplicate being created.' },
  ambiguous: { tag: 'D · Ambiguous',        blocks: true,  note: 'Two members could carry this name. Pick one explicitly — the import will not guess.' },
  unmatched: { tag: 'E · Not found',        blocks: true,  note: 'Member not found. No email, course or branch is invented; course and branch come from the session being imported.' },
};

export type Candidate = {
  member_id: string; name: string; code: string; course: string; branch: string;
  last_attended?: string; attendance?: string; aliases?: string;
  /** why this candidate is being offered, in one line */
  hint?: string;
  /** 'sure' reads as a confident read of the name, 'unsure' as a guess */
  hintTone?: 'sure' | 'unsure';
};
export type MatchRow = {
  row: number; kind: MatchKind; raw: string; first_seen: string; minutes: number;
  candidates: Candidate[];
};

/** From a real Google Meet export: Full Name, First Seen, Time in Call. No email. */
export const CSV_COLUMNS = ['Full Name', 'First Seen', 'Time in Call'] as const;

export const MATCH_ROWS: MatchRow[] = [
  { row: 12, kind: 'matched', raw: 'Divya Ramesh', first_seen: '5:58 pm', minutes: 61,
    candidates: [{ member_id: '1', name: 'Divya Ramesh', code: 'RF-000102',
      course: 'Prenatal Flow', branch: 'Coimbatore', last_attended: '21 Aug', attendance: '78%',
      aliases: '\u201cDivya\u201d, \u201cDivya R\u201d',
      hint: 'Matched on her canonical name', hintTone: 'sure' }] },
  { row: 47, kind: 'possible', raw: 'Shazia', first_seen: '6:02 pm', minutes: 58,
    candidates: [{ member_id: '2', name: 'Shazia Begum', code: 'RF-000118',
      course: 'Postnatal Core', branch: 'Madurai', last_attended: '28 Aug', attendance: '71%',
      aliases: '\u201cShazia F\u201d, \u201cShazia Begum\u201d',
      hint: 'Fuzzy match \u2014 one candidate, so nothing is assumed', hintTone: 'unsure' }] },
  { row: 52, kind: 'ambiguous', raw: 'priya l', first_seen: '6:00 pm', minutes: 52,
    candidates: [
      { member_id: '7', name: 'Lakshmi Priya', code: 'RF-000131', course: 'Prenatal Flow',
        branch: 'Chennai', last_attended: '19 Aug', attendance: '64%',
        aliases: '\u201cLakshmi P\u201d', hint: 'Name order reversed in Meet', hintTone: 'sure' },
      { member_id: '9', name: 'Priya Latha', code: 'RF-000148', course: 'Postnatal Core',
        branch: 'Chennai', last_attended: '15 Aug', attendance: '81%',
        aliases: 'none yet', hint: 'Also a plausible reading', hintTone: 'unsure' }] },
  { row: 88, kind: 'noEmail', raw: 'Meena Raj', first_seen: '6:04 pm', minutes: 52,
    candidates: [{ member_id: '8', name: 'Kavya Balaji', code: 'RF-000146',
      course: 'Postnatal Core', branch: 'Madurai', last_attended: '27 Aug', attendance: '66%',
      aliases: '\u201cMeena Raj\u201d', hint: 'Matched on her canonical name', hintTone: 'sure' }] },
  { row: 91, kind: 'unmatched', raw: 'kavi.s', first_seen: '6:11 pm', minutes: 9, candidates: [] },
];

/** The rows a person must decide. A clean match needs no decision. */
export const DECISION_ROWS = MATCH_ROWS.filter(r => r.kind !== 'matched');

/** What can be done with a row, per outcome. Each says what it will DO. */
export type MatchAction = { icon: string; label: string; note: string; primary?: boolean };

export const MATCH_ACTIONS: Record<MatchKind, MatchAction[]> = {
  matched: [],
  possible: [
    { icon: 'person_add', label: 'Add as new member', primary: true,
      note: 'Pre-filled from this row \u00b7 email left blank \u00b7 duplicate guard runs first' },
    { icon: 'help_outline', label: 'Keep unmatched',
      note: 'Recorded as not-a-member. Nothing is created' },
  ],
  noEmail: [
    { icon: 'alternate_email', label: 'Add email to existing member', primary: true,
      note: 'She becomes eligible for follow-up sends' },
    { icon: 'east', label: 'Continue without email',
      note: 'Attendance still imports \u00b7 excluded from sends, with the reason shown' },
  ],
  ambiguous: [
    { icon: 'person_off', label: 'Not a member \u2014 leave this row out',
      note: 'No record is created' },
  ],
  unmatched: [
    { icon: 'person_add', label: 'Add as new member', primary: true,
      note: 'Course and branch come from the session being imported' },
    { icon: 'link', label: 'Link to an existing member', note: 'Search the register yourself' },
    { icon: 'skip_next', label: 'Skip this row', note: 'Left out of the import entirely' },
  ],
};

/** The question each outcome puts to the person deciding. */
export const MATCH_QUESTION: Record<MatchKind, string> = {
  matched: 'Matched to',
  possible: 'Is this her?',
  noEmail: 'Matched to',
  ambiguous: 'Who is she?',
  unmatched: 'What should happen to this row?',
};

export type Member = {
  id: string; code: string; name: string; course: string; branch: string;
  aliases: string[];
  /** A member can hold several addresses; exactly one is primary. An EMPTY
   *  list means no usable address -- she is still listed and still counted,
   *  never quietly dropped (C-76). */
  emails: { address: string; primary: boolean }[];
  expected: number; attended: number; missed: number;
  /** her CURRENT run of consecutive misses -- not the week's total */
  streak: number;
  /** last time anyone reached out, or '\u2014' for never */
  last: string;
};

/**
 * ONE member list. The follow-up set is DERIVED from it by the rule below,
 * so the dashboard count, the weekly list and the member report cannot
 * disagree -- there was previously a second, differently-populated list for
 * follow-up, which is exactly how those numbers drift apart.
 */
export const MEMBERS: Member[] = [
  { id: '1', code: 'RF-000102', name: 'Divya Ramesh',       course: 'Prenatal Flow',            branch: 'Coimbatore', aliases: ['Divya', 'Divya R'], emails: [{ address: 'divya.r@gmail.com', primary: true }],   expected: 3, attended: 0, missed: 3, streak: 3, last: '14 Aug' },
  { id: '2', code: 'RF-000118', name: 'Shazia Begum',       course: 'Postnatal Core',           branch: 'Madurai',    aliases: ['Shazia', 'Shazia F'], emails: [{ address: 'shazia.b@gmail.com', primary: true }], expected: 3, attended: 1, missed: 2, streak: 2, last: '20 Aug' },
  { id: '3', code: 'RF-000151', name: 'Meenakshi Sundaram', course: 'Trimester 3 Gentle',       branch: 'Chennai',    aliases: ['Meena S'],          emails: [{ address: 'meena.s@yahoo.in', primary: true }],    expected: 4, attended: 0, missed: 4, streak: 6, last: '2 Aug' },
  { id: '4', code: 'RF-000127', name: 'Aarthi Venkat',      course: 'Prenatal Flow',            branch: 'Coimbatore', aliases: [],                   emails: [{ address: 'aarthi.v@gmail.com', primary: true }],  expected: 3, attended: 3, missed: 0, streak: 0, last: '\u2014' },
  { id: '5', code: 'RF-000133', name: 'Nithya Krishnan',    course: 'Pelvic Floor Foundations', branch: 'Madurai',    aliases: [],                   emails: [],                    expected: 0, attended: 0, missed: 0, streak: 0, last: '11 Aug' },
  { id: '6', code: 'RF-000140', name: 'Fathima Rizwan',     course: 'Postnatal Core',           branch: 'Coimbatore', aliases: ['Fathima'],          emails: [],                    expected: 3, attended: 0, missed: 3, streak: 4, last: '9 Aug' },
  { id: '7', code: 'RF-000131', name: 'Lakshmi Priya',      course: 'Prenatal Flow',            branch: 'Chennai',    aliases: ['Lakshmi P'],        emails: [{ address: 'lakshmi.p@gmail.com', primary: true }], expected: 4, attended: 2, missed: 2, streak: 1, last: '\u2014' },
  { id: '8', code: 'RF-000146', name: 'Kavya Balaji',       course: 'Postnatal Core',           branch: 'Madurai',    aliases: [],                   emails: [],                    expected: 3, attended: 0, missed: 3, streak: 3, last: '6 Aug' },
];

export const WEEK = { from: '18 Aug', to: '24 Aug 2026', label: '18\u201324 Aug 2026' };
export const BRANCHES = ['All branches', 'Coimbatore', 'Madurai', 'Chennai'];
export const COURSES  = ['All courses', 'Prenatal Flow', 'Postnatal Core', 'Trimester 3 Gentle', 'Pelvic Floor Foundations'];
export const SUPPORT_PHONE = '9994871158';

// ---------------------------------------------------------------- courses
export type Course = {
  id: string; name: string;
  start_time: string | null; end_time: string | null;
  frequency: number | null;              // stated intent, never counted
  /** `id` is the course_offerings row -- the course AT one branch. Enrolling
   *  a member names the OFFERING, not the course, so dropping the id here is
   *  what left the member form unable to enrol anyone. */
  offerings: { id: string; branch: string; weekdays: number[] }[];
};

export const COURSE_LIST: Course[] = [
  { id: 'c1', name: 'Prenatal Flow', start_time: '06:00', end_time: '07:00', frequency: 3,
    offerings: [{ id: 'o1', branch: 'Coimbatore', weekdays: [1,3,5] }, { id: 'o2', branch: 'Chennai', weekdays: [1,3,5] }] },
  { id: 'c2', name: 'Postnatal Core', start_time: '07:00', end_time: '08:00', frequency: 3,
    offerings: [{ id: 'o3', branch: 'Madurai', weekdays: [2,4,6] }, { id: 'o4', branch: 'Coimbatore', weekdays: [2,4,6] }] },
  { id: 'c3', name: 'Trimester 3 Gentle', start_time: '07:00', end_time: '08:15', frequency: 4,
    offerings: [{ id: 'o5', branch: 'Chennai', weekdays: [1,4] }] },
  // no offering on purpose: a course with no offering has no schedule, and
  // the UI must say so rather than invent one
  { id: 'c4', name: 'Pelvic Floor Foundations', start_time: null, end_time: null, frequency: 2,
    offerings: [] },
];

export const DAY_NAMES = ['', 'Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

/** Mirrors public.effective_follow_up_config(). */
export type FollowUpRule = {
  source: 'course' | 'global';
  weekly_enabled: boolean;  weekly_threshold: number;
  consecutive_enabled: boolean; consecutive_threshold: number;
  combination: 'OR' | 'AND';
};

export const GLOBAL_RULE: FollowUpRule = {
  source: 'global', weekly_enabled: true, weekly_threshold: 3,
  consecutive_enabled: false, consecutive_threshold: 4, combination: 'OR',
};

export const COURSE_RULES: Record<string, FollowUpRule> = {
  c1: { source: 'course', weekly_enabled: true, weekly_threshold: 3,
        consecutive_enabled: true, consecutive_threshold: 4, combination: 'OR' },
  c2: { source: 'course', weekly_enabled: true, weekly_threshold: 2,
        consecutive_enabled: true, consecutive_threshold: 3, combination: 'AND' },
};

// The rule logic itself lives in ./followup, so the fixtures and live
// Supabase data are judged by exactly ONE implementation. Imported for use
// below and re-exported because every screen already reaches for it here.
import { isEligible, reasonFor, attendancePct } from './followup';
export { ruleHits, isEligible, reasonFor, attendancePct, ruleSentence, flagged, toCandidate } from './followup';

// -------------------------------------------------------------- templates
export type Template = {
  id: string; name: string; subject: string; body: string; active: boolean;
  /** the canvas' glyph for this template */
  icon: string;
  /** one line of the wording, for the picker */
  preview: string;
};

export const TEMPLATES: Template[] = [
  { id: 't1', name: 'Gentle check-in', active: true, icon: 'favorite',
    preview: 'We missed you this week — you were down for {{expected_sessions}} and made {{attended_sessions}}.',
    subject: 'We missed you this week, {{first_name}}',
    body: 'Hello {{first_name}},\n\nYou were down for {{expected_sessions}} sessions in {{course_name}} between {{period_from}} and {{period_to}}, and made {{attended_sessions}}.\n\nNothing is wrong — we would just like to see you back on the mat.\n\n{{academy_name}}' },
  { id: 't2', name: 'Trimester check', active: true, icon: 'pregnant_woman',
    preview: 'If this trimester is hard right now, tell us and we will move your slots.',
    subject: 'How is this trimester treating you, {{first_name}}?',
    body: 'Hello {{first_name}},\n\nIf the timing is hard right now, tell us and we will move your slots.\n\n{{academy_name}}' },
  { id: 't3', name: 'Long absence', active: true, icon: 'schedule',
    preview: 'It has been {{consecutive_missed}} sessions. Shall we pause your enrolment?',
    subject: 'Shall we pause your enrolment, {{first_name}}?',
    body: 'Hello {{first_name}},\n\nIt has been {{consecutive_missed}} sessions in a row. We can pause and hold your place.\n\n{{academy_name}}' },
  { id: 't4', name: 'Schedule change notice', active: false, icon: 'edit_calendar',
    preview: 'Inactive — not offered in the send flow while it is switched off.',
    subject: 'A change to your {{course_name}} times',
    body: 'Hello {{first_name}},\n\nInactive — not offered in the send flow while it is switched off.\n\n{{academy_name}}' },
];

export const TOKENS = ['{{first_name}}','{{member_name}}','{{member_code}}','{{course_name}}',
  '{{branch_name}}','{{period_from}}','{{period_to}}','{{expected_sessions}}','{{attended_sessions}}',
  '{{missed_sessions}}','{{attendance_pct}}','{{consecutive_missed}}','{{last_attendance_date}}','{{academy_name}}'];

/** Server-side rendering is what the real thing does; this mirrors it so the
 *  preview shows real values rather than placeholders. */
export function renderTemplate(tpl: string, c: FollowUpCandidate): string {
  const map: Record<string, string> = {
    first_name: c.full_name.split(' ')[0], member_name: c.full_name,
    member_code: c.member_id, course_name: c.course_name, branch_name: c.branch_name,
    period_from: WEEK.from, period_to: WEEK.to,
    expected_sessions: String(c.expected), attended_sessions: String(c.attended),
    missed_sessions: String(c.missed), attendance_pct: c.attendance_pct === null ? '—' : `${c.attendance_pct}%`,
    consecutive_missed: String(c.current_streak), last_attendance_date: '21 Aug',
    academy_name: 'RosiFit Academy',
  };
  return tpl.replace(/\{\{(\w+)\}\}/g, (_, k) => map[k] ?? `{{${k}}}`);
}

// ------------------------------------------------------------------ staff
/**
 * Access is a four-state fact, not a boolean. "Has a record" / "has a PIN" /
 * "has used it" / "was turned off" are different situations that need
 * different actions, and collapsing them into has_login hid the two that
 * actually need the academy to do something.
 */
export type StaffAccess = 'notEnabled' | 'awaiting' | 'disabled' | 'active';

export type Staff = {
  id: string; name: string; phone: string; role: string;
  access: StaffAccess;
  /** why this person is in this state, in their own row */
  meta: string;
};

export const STAFF_ACCESS: Record<StaffAccess, {
  word: string; icon: string; action: string;
  /** the two states that need an action get the filled button */
  primary: boolean; rank: number;
}> = {
  notEnabled: { word: 'Not enabled',  icon: 'lock_open',      action: 'Generate PIN', primary: true,  rank: 0 },
  awaiting:   { word: 'Awaiting PIN', icon: 'hourglass_top',  action: 'Regenerate',   primary: true,  rank: 1 },
  disabled:   { word: 'Disabled',     icon: 'block',          action: 'Re-enable',    primary: false, rank: 2 },
  active:     { word: 'Active',       icon: 'lock',           action: 'Reset PIN',    primary: false, rank: 3 },
};

export const STAFF: Staff[] = [
  { id: 's1', name: 'Sowmya Iyer',   phone: '+91 90032 71144', role: 'Front desk',    access: 'notEnabled', meta: 'added 21 Aug' },
  { id: 's2', name: 'Nandhini R',    phone: '+91 99406 33871', role: 'Coach',         access: 'awaiting',   meta: 'PIN issued 22 Aug, not used yet' },
  { id: 's3', name: 'Deepa Suresh',  phone: '+91 94422 10098', role: 'Coach',         access: 'disabled',   meta: 'left the academy' },
  { id: 's4', name: 'Revathi Anand', phone: '+91 98431 55210', role: 'Coach',         access: 'active',     meta: 'signed in today' },
  { id: 's5', name: 'Priya Menon',   phone: '+91 80563 29742', role: 'Academy admin', access: 'active',     meta: 'that\u2019s you' },
];

/**
 * Which STAFF row the fixtures treat as the signed-in person. It is an id
 * rather than a second copy of the row, so the staff list and the profile
 * cannot drift the way two lists always do.
 */
export const FIXTURE_SELF_ID = 's5';

export const ROLE_LABELS = ['Academy admin', 'Coach', 'Front desk'];

/** A number is enough to identify someone; the middle is not needed on screen. */
export function maskPhone(phone: string): string {
  return phone.slice(0, 7) + '\u2022\u2022\u2022\u2022\u2022 ' + phone.slice(-2);
}

export const AVATAR_TINTS = [
  '#5C0F63', '#8A2C7A', '#B03A6E', '#6B2E8A',
  '#93245F', '#7A1B6B', '#A32E86', '#5E2478',
];

export const initials = (n: string) =>
  n.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();

// ----------------------------------------------------------------- audit
export type AuditEntry = {
  id: string; who: string; when: string; action: string;
  entity: string; subject: string;
  changes: { field: string; old: string | null; new: string | null }[];
};
export const AUDIT: AuditEntry[] = [
  { id: 'a1', who: 'Priya Menon', when: '31 Aug 2026, 10:32 am', action: 'CSV match decision',
    entity: 'Member', subject: 'Shazia Farheen (RF-000118)',
    changes: [{ field: 'Display names', old: '“Shazia F”, “Shazia Farheen”', new: '“Shazia F”, “Shazia Farheen”, “Shazia”' }] },
  { id: 'a2', who: 'Priya Menon', when: '31 Aug 2026, 10:18 am', action: 'Member email changed',
    entity: 'Member', subject: 'Divya Ramesh (RF-000102)',
    changes: [{ field: 'Primary email', old: 'old@example.com', new: 'divya@example.com' }] },
  { id: 'a3', who: 'Rosi Owner', when: '30 Aug 2026, 6:40 pm', action: 'Follow-up rule changed',
    entity: 'Course', subject: 'Prenatal Yoga',
    changes: [
      { field: 'Weekly threshold', old: '3', new: '2' },
      { field: 'Consecutive threshold', old: '4', new: '3' },
      { field: 'Combination', old: 'OR', new: 'AND' }] },
  { id: 'a4', who: 'Rosi Owner', when: '30 Aug 2026, 9:02 am', action: 'Holiday added',
    entity: 'Holiday', subject: 'Diwali · 20–22 Oct 2026 · All branches',
    changes: [{ field: 'Sessions marked', old: null, new: '12' }] },
  { id: 'a5', who: 'Priya Menon', when: '29 Aug 2026, 4:15 pm', action: 'Schedule changed',
    entity: 'Offering', subject: 'Prenatal Fitness · Coimbatore',
    changes: [{ field: 'Weekdays', old: 'Mon Tue Thu Sat', new: 'Mon Tue Wed Thu Sat' }] },
];

// --------------------------------------------------------------- sessions
export type SessionDay = {
  date: string; day: number;
  status: 'completed' | 'scheduled' | 'holiday' | 'cancelled' | 'none';
  expected?: number; present?: number;
};
export const MONTH_LABEL = 'August 2026';
export const MONTH_DAYS: SessionDay[] = Array.from({ length: 31 }, (_, i) => {
  const day = i + 1;
  const dow = new Date(2026, 7, day).getDay();       // 0 = Sun
  const runs = [1, 2, 4, 6].includes(dow === 0 ? 7 : dow);
  if (!runs) return { date: `2026-08-${day}`, day, status: 'none' };
  if (day === 25) return { date: `2026-08-25`, day, status: 'holiday' };
  if (day === 19) return { date: `2026-08-19`, day, status: 'cancelled' };
  if (day <= 24) return { date: `2026-08-${day}`, day, status: 'completed', expected: 8, present: 5 + (day % 3) };
  return { date: `2026-08-${day}`, day, status: 'scheduled', expected: 8 };
});

export const SECURITY_QUESTIONS = [
  'What was the name of your first school?',
  'In which city were you born?',
  "What is your mother's maiden name?",
  'What was the name of your first pet?',
  'What is the name of the street you grew up on?',
];

// ---------------------------------------------------------------- reports
/**
 * Weeks run Monday to Sunday. A part-week at the start of a range is FLAGGED
 * rather than blended in -- averaging it into the neighbouring week silently
 * moves the percentage everyone reads.
 */
export type WeekRow = {
  label: string; expected: number; attended: number;
  current?: boolean; partial?: boolean;
};

export const WEEK_ROWS: WeekRow[] = [
  { label: '18\u201324 Aug', expected: 22, attended: 6,  current: true },
  { label: '11\u201317 Aug', expected: 24, attended: 15 },
  { label: '4\u201310 Aug',  expected: 24, attended: 19 },
  { label: '28 Jul \u2013 3 Aug', expected: 18, attended: 14, partial: true },
];

/** The period a dashboard range names, so no tile can imply a different one. */
export const PERIODS: Record<string, string> = {
  'This week':    '18\u201324 Aug 2026',
  'Last week':    '11\u201317 Aug 2026',
  'Last 4 weeks': '28 Jul \u2013 24 Aug 2026',
  'This month':   '1\u201324 Aug 2026',
};

type StatusKeyName = 'present' | 'absent' | 'awaiting' | 'scheduled' | 'cancelled' | 'holiday' | 'extra' | 'none';

/* ------------------------------------------------------- follow-up, derived
 * The canvas computes the follow-up set from MEMBERS and the saved rule
 * rather than storing it. Keeping that here is what makes the dashboard
 * count, the weekly list and the send flow agree by construction: there is
 * no second list to fall out of step. Live data goes through the same
 * ./followup functions -- see the note at the top of that file.
 */
export function flaggedMembers(r: FollowUpRule = GLOBAL_RULE): Member[] {
  return MEMBERS.filter(m => isEligible(m, r));
}

/**
 * The legacy follow-up shape, now DERIVED. Kept so the send flow and the
 * rules preview read the same members as everything else.
 */
export const CANDIDATES: FollowUpCandidate[] = flaggedMembers().map(m => ({
  member_id: m.id, full_name: m.name, course_name: m.course, branch_name: m.branch,
  expected: m.expected, attended: m.attended, missed: m.missed,
  attendance_pct: attendancePct(m), current_streak: m.streak,
  config_source: COURSE_RULES[m.id] ? 'course' : 'global',
  reason: reasonFor(m, GLOBAL_RULE),
  has_email: m.emails.length > 0,
}));

/** Her primary address, or '' when there is none on file. */
export const primaryEmail = (m: Member): string =>
  (m.emails.find(e => e.primary) ?? m.emails[0])?.address ?? '';

/** C-76: no email means listed-and-excluded, never silently dropped. */
export const hasEmail = (m: Member): boolean => primaryEmail(m) !== '';

/**
 * A member's week, session by session. Holidays and cancellations are LISTED
 * and say why they do not count -- a blank row would read as a miss, which is
 * the whole point of showing them (C-92).
 */
export type MemberSession = {
  status: StatusKeyName; date: string; time: string; detail: string;
};

export const MEMBER_WEEK: MemberSession[] = [
  { status: 'absent',    date: 'Mon 18 Aug', time: '6:00 pm', detail: 'Prenatal Flow · Google Meet' },
  { status: 'holiday',   date: 'Tue 19 Aug', time: '—',  detail: 'Onam — does not count' },
  { status: 'absent',    date: 'Wed 20 Aug', time: '6:00 pm', detail: 'Prenatal Flow · Google Meet' },
  { status: 'cancelled', date: 'Thu 21 Aug', time: '—',  detail: 'Coach unwell — does not count' },
  { status: 'absent',    date: 'Fri 22 Aug', time: '6:00 pm', detail: 'Prenatal Flow · Google Meet' },
  { status: 'awaiting',  date: 'Sat 23 Aug', time: '8:00 am', detail: 'File not uploaded — counts for nobody' },
];

/** Nothing scheduled is its own state, not an empty list of misses. */
export const NO_SESSIONS: MemberSession[] = [
  { status: 'none', date: 'No sessions', time: '—', detail: 'She had none scheduled this week' },
];

export const sessionsFor = (m: Member): MemberSession[] =>
  m.expected === 0 ? NO_SESSIONS : MEMBER_WEEK;

/**
 * Sessions whose attendance file has not arrived yet.
 *
 * `date` is the ISO day the label already names in words. It is here because
 * the upload screen checks the date INSIDE the chosen Meet file against the
 * session being imported into -- and with no date on the fixture that check
 * could only ever answer "cannot tell", so the one thing the panel exists to
 * catch was undemonstrable offline.
 */
export const PENDING_SESSIONS = [
  { dayNum: '22', mon: 'AUG', date: '2026-08-22', title: 'Prenatal Flow · 6:00 pm',
    meta: 'Coimbatore · 18 expected · awaiting upload',
    label: 'Fri 22 Aug · Prenatal Flow 6:00 pm' },
  { dayNum: '23', mon: 'AUG', date: '2026-08-23', title: 'Postnatal Core · 8:00 am',
    meta: 'Madurai · 12 expected · awaiting upload',
    label: 'Sat 23 Aug · Postnatal Core 8:00 am' },
];

// ------------------------------------------------------- attendance list
/**
 * One row per member per session — the fact the Attendance tab lists, and
 * the same shape public.attendance_records returns (0008).
 *
 * `expected` travels with the status because the table's own invariant
 * (`status <> 'absent' or expected`) is what makes "missed <= expected"
 * true, and a row that hides it would let the list imply a miss that the
 * database could not represent. An 'extra' is the reverse: she turned up
 * when she was not expected, so it never counts as a miss.
 */
export type AttendanceStatus = 'present' | 'absent' | 'extra';

export type AttendanceRow = {
  id: string; member_id: string; member: string; code: string;
  course: string; branch: string;
  /** ISO yyyy-mm-dd — the query filters on this, the screen formats it */
  date: string;
  /** 'HH:MM' 24-hour, or '' when the offering carries no time */
  time: string;
  status: AttendanceStatus;
  expected: boolean;
  /** Time in Call, the third and last column the Meet export carries */
  minutes: number | null;
};

/**
 * Offline rows, generated relative to TODAY rather than pinned to August
 * 2026 like the rest of this file. The attendance list is the one screen
 * whose whole point is a date filter, and fixtures dated a month in the past
 * would show an empty list under every period a person is likely to pick —
 * which reads as "no attendance", not as "no fixtures".
 */
export function attendanceFixture(from: string, to: string): AttendanceRow[] {
  const rows: AttendanceRow[] = [];
  const start = new Date(`${from}T00:00:00`);
  const end = new Date(`${to}T00:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const dow = d.getDay();                       // 0 = Sun
    if (![1, 3, 5].includes(dow)) continue;       // Mon / Wed / Fri offerings
    if (d > new Date()) continue;                 // a future session has no attendance yet
    const date = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    MEMBERS.forEach((m, i) => {
      // deterministic, so the same day always reads the same way
      const seed = (d.getDate() + i * 3) % 5;
      const status: AttendanceStatus = seed === 0 ? 'absent' : seed === 4 && i === 2 ? 'extra' : 'present';
      rows.push({
        id: `${date}-${m.id}`, member_id: m.id, member: m.name, code: m.code,
        course: m.course, branch: m.branch, date,
        time: m.course === 'Postnatal Core' ? '08:00' : '18:00',
        status,
        expected: status !== 'extra',
        minutes: status === 'absent' ? null : 45 + ((d.getDate() + i) % 20),
      });
    });
  }
  return rows.sort((a, b) => (a.date === b.date ? a.member.localeCompare(b.member) : b.date.localeCompare(a.date)));
}

// ---------------------------------------------------------------- holidays
/**
 * Offline holidays. `sessions` is what deleting one would return to
 * `scheduled`, which is the number the delete confirmation promises -- so it
 * is a property of the holiday here, exactly as it is a count of
 * sessions.holiday_id against the live database, and not a second derivation
 * from the date range that could disagree with what deleting actually does.
 */
export type Holiday = {
  id: string;
  name: string;
  /** ISO yyyy-mm-dd, inclusive at both ends */
  from: string;
  to: string;
  /** null means every branch -- the column's own meaning, not a sentinel */
  branch: string | null;
  /** sessions this holiday currently holds; deleting it returns exactly these */
  sessions: number;
};

export const HOLIDAYS: Holiday[] = [
  { id: 'h1', name: 'Diwali',  from: '2026-10-20', to: '2026-10-22', branch: null,         sessions: 14 },
  { id: 'h2', name: 'Pongal',  from: '2027-01-14', to: '2027-01-16', branch: null,         sessions: 12 },
  { id: 'h3', name: 'Local strike', from: '2026-09-18', to: '2026-09-18', branch: 'Coimbatore', sessions: 2 },
];

/** What preview_holiday() answers with, per offering, for the impact panel. */
export const HOLIDAY_PREVIEW = [
  { label: 'Prenatal Flow · Coimbatore', n: 6 },
  { label: 'Postnatal Core · Madurai', n: 5 },
  { label: 'Trimester 3 Gentle · Chennai', n: 3 },
];
