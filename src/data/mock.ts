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
  /** the COUNT the rule fired at -- what `{{follow_up_trigger}}` renders as.
   *  `config_source` says WHOSE rule listed her; this says what it was set to,
   *  and until now the number was nowhere in the shape the wording renders
   *  against. */
  follow_up_trigger: number;
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
  member_id: string; name: string; email: string; course: string; branch: string;
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
    candidates: [{ member_id: '1', name: 'Divya Ramesh', email: 'divya.r@gmail.com',
      course: 'Prenatal Flow', branch: 'Coimbatore', last_attended: '21 Aug', attendance: '78%',
      aliases: '\u201cDivya\u201d, \u201cDivya R\u201d',
      hint: 'Matched on her canonical name', hintTone: 'sure' }] },
  { row: 47, kind: 'possible', raw: 'Shazia', first_seen: '6:02 pm', minutes: 58,
    candidates: [{ member_id: '2', name: 'Shazia Begum', email: 'shazia.b@gmail.com',
      course: 'Postnatal Core', branch: 'Madurai', last_attended: '28 Aug', attendance: '71%',
      aliases: '\u201cShazia F\u201d, \u201cShazia Begum\u201d',
      hint: 'Fuzzy match \u2014 one candidate, so nothing is assumed', hintTone: 'unsure' }] },
  { row: 52, kind: 'ambiguous', raw: 'priya l', first_seen: '6:00 pm', minutes: 52,
    candidates: [
      { member_id: '7', name: 'Lakshmi Priya', email: 'lakshmi.p@gmail.com', course: 'Prenatal Flow',
        branch: 'Chennai', last_attended: '19 Aug', attendance: '64%',
        aliases: '\u201cLakshmi P\u201d', hint: 'Name order reversed in Meet', hintTone: 'sure' },
      { member_id: '9', name: 'Priya Latha', email: 'priya.l@gmail.com', course: 'Postnatal Core',
        branch: 'Chennai', last_attended: '15 Aug', attendance: '81%',
        aliases: 'none yet', hint: 'Also a plausible reading', hintTone: 'unsure' }] },
  { row: 88, kind: 'noEmail', raw: 'Meena Raj', first_seen: '6:04 pm', minutes: 52,
    candidates: [{ member_id: '8', name: 'Kavya Balaji', email: '',
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

/**
 * The three values `members.status` may hold (0006). The app writes only the
 * two outer ones; 'paused' is read, never set -- see Member.status.
 */
export type MemberStatus = 'active' | 'paused' | 'inactive';

export type Member = {
  id: string; name: string; course: string; branch: string;
  /**
   * The course she is enrolled in BY IDENTITY -- `courses.id`, reached
   * through her active enrolment's offering. null when she is enrolled at
   * nothing, which is exactly what an ended enrolment leaves behind.
   *
   * `course` above is the course's NAME, and a name is not an identity. A
   * course can be deleted and another created with the same name the next
   * minute; every screen that gathered "this course's members" by name then
   * handed the NEW course the deleted one's roster, and its card opened
   * stating member counts belonging to a course that no longer exists.
   * Names are for reading. This is for matching -- see enrolledIn() in
   * src/data/course.ts, which is the only place the join is written.
   */
  course_id: string | null;
  /**
   * Her RF- code, or '' for anyone added since 0026 retired the scheme.
   *
   * SEARCHABLE, never rendered. Nothing assigns one any more and no screen
   * prints one, but the codes minted before 0026 are still on old exports
   * and in the audit log, so somebody holding one can still find her by it.
   * A blank is the normal case now, not a missing value.
   */
  code: string;
  aliases: string[];
  /** A member can hold several addresses; exactly one is primary. An EMPTY
   *  list means no usable address -- she is still listed and still counted,
   *  never quietly dropped (C-76). */
  emails: { address: string; primary: boolean }[];
  /**
   * Whether she is ON the register right now -- `members.status` (0006), the
   * column the app has never written and never read.
   *
   * It is NOT the same fact as `expected === 0`. Expected-at-nothing is what
   * her OFFERING says this week -- a course with no weekdays set, a week she
   * is enrolled at nothing. Status is what the ACADEMY says about her, set by
   * hand and lasting until it is set back. A member on maternity leave is
   * inactive in a week that expected her at four; a member of a course with
   * no schedule yet is expected at nothing and still very much active.
   *
   * It decides follow-up: `follow_up_candidates()` (0009) has required
   * `m.status = 'active'` since the day it was written, so honouring it here
   * is what makes the app's derivation and the database's agree rather than a
   * new rule (guardrail 1).
   *
   * 'paused' is in the column's CHECK and no screen sets it; it is read the
   * same way as 'inactive' -- not active, therefore not followed up.
   */
  status: MemberStatus;
  /**
   * The day `status` STARTS applying -- `members.inactive_from` (0044) --
   * or null/absent when her record carries no date.
   *
   * `status` on its own could only ever say "now": the pill wrote it, and
   * `status_changed_at` recorded the press. A member who is active today and
   * leaving next month had no way to be recorded truthfully at all. This is
   * the other half, and `src/data/inactiveFrom.ts` is the whole of what the
   * pair means -- she is active on every day before it and off the register
   * from it onward.
   *
   * NULL IS NOT "TODAY". Every row written before 0044 carries null, and
   * null goes on meaning what those rows have always meant: inactive with no
   * date on record, on every day anybody asks about.
   *
   * It dates the FOLLOW-UP, never the enrolment. Which sessions expect her
   * is offering schedule -> enrolment window -> member override (0007), and
   * this column is none of the three.
   */
  inactiveFrom?: string | null;
  /**
   * Her OWN weekdays (1..7, Monday = 1), or null when she follows the days
   * her offering runs.
   *
   * member_schedules (0006) is an OVERRIDE, not a copy: most members have no
   * row and go on following the offering when its schedule changes. The
   * record carried no such field at all, so the member form had nothing to
   * open her day chips from -- it showed a blank row for a member who HAD
   * days of her own, and update_member reads a blank row as 'put her back on
   * the course' (RC-020).
   */
  weekdays: number[] | null;
  expected: number; attended: number; missed: number;
  /** her CURRENT run of missed sessions -- not the week's total */
  streak: number;
  /**
   * The last day she was present, ISO, exactly as `member_stats.last_present_date`
   * holds it -- or null when she has never attended, or when the read predates
   * this field.
   *
   * It is here to DATE `streak` above. The bare run was printed as
   * "consecutive 6" beside a weekly miss count of 1, on a course running five
   * days a week: arithmetically impossible-looking, unverifiable against
   * anything on screen, and named after a trigger the course form no longer
   * offers. The run is right; what it lacked was the session that ended it.
   * `src/data/streak.ts` is the whole of the wording, so the roster card and
   * the member pop-up cannot describe one number two ways.
   *
   * OPTIONAL on purpose. Every existing producer of a `Member` -- the offline
   * fixtures, the import previews, the specs -- goes on satisfying the type
   * untouched, and a missing date reads as "no attended session on record"
   * rather than as an invented one.
   */
  lastPresent?: string | null;
  /** last time anyone reached out, or '\u2014' for never */
  last: string;
  /**
   * The day she joined, ISO ('2026-03-14'), exactly as `members.joined_on`
   * holds it -- or null when her record carries no date.
   *
   * The record used to carry the LABEL below and nothing else, and a month is
   * not a date: the Edit form opens a date field on this fact and had nothing
   * to open it from, so "Joined on" came up blank on every member who had a
   * joining date. Carrying the stored value is what lets the form show what
   * the register actually holds.
   *
   * `joined` is derived from this by `joinedLabel` (src/data/period.ts), so
   * the two can never tell different stories.
   */
  joinedOn: string | null;
  /**
   * When she joined, already formatted ("Mar 2026"), or '\u2014' when the
   * record carries no date.
   *
   * The canvas shows `branch \u00b7 joined Mar 2026` under her name. The app
   * showed `branch \u00b7 RF-000102` instead -- an internal identifier, in the
   * one place a person looks to confirm she has the right member. A code
   * tells her nothing she can check; a joining month she can.
   */
  joined: string;
};

/**
 * ONE member list. The follow-up set is DERIVED from it by the rule below,
 * so the dashboard count, the weekly list and the member report cannot
 * disagree -- there was previously a second, differently-populated list for
 * follow-up, which is exactly how those numbers drift apart.
 */
export const MEMBERS: Member[] = [
  { id: '1', code: 'RF-000102', name: 'Divya Ramesh',       course: 'Prenatal Flow',            course_id: 'c1', branch: 'Coimbatore', aliases: ['Divya', 'Divya R'], emails: [{ address: 'divya.r@gmail.com', primary: true }],   weekdays: null, status: 'active', expected: 3, attended: 0, missed: 3, streak: 3, lastPresent: '2026-08-13', last: '14 Aug', joinedOn: '2026-03-01', joined: 'Mar 2026' },
  { id: '2', code: 'RF-000118', name: 'Shazia Begum',       course: 'Postnatal Core',           course_id: 'c2', branch: 'Madurai',    aliases: ['Shazia', 'Shazia F'], emails: [{ address: 'shazia.b@gmail.com', primary: true }], weekdays: [2, 6], status: 'active', expected: 3, attended: 1, missed: 2, streak: 2, lastPresent: '2026-08-18', last: '20 Aug', joinedOn: '2026-01-01', joined: 'Jan 2026' },
  { id: '3', code: 'RF-000151', name: 'Meenakshi Sundaram', course: 'Trimester 3 Gentle',       course_id: 'c3', branch: 'Chennai',    aliases: ['Meena S'],          emails: [{ address: 'meena.s@yahoo.in', primary: true }],    weekdays: null, status: 'active', expected: 4, attended: 0, missed: 4, streak: 6, lastPresent: '2026-08-01', last: '2 Aug', joinedOn: '2026-04-01', joined: 'Apr 2026' },
  { id: '4', code: 'RF-000127', name: 'Aarthi Venkat',      course: 'Prenatal Flow',            course_id: 'c1', branch: 'Coimbatore', aliases: [],                   emails: [{ address: 'aarthi.v@gmail.com', primary: true }],  weekdays: null, status: 'active', expected: 3, attended: 3, missed: 0, streak: 0, lastPresent: '2026-08-24', last: '\u2014', joinedOn: '2026-02-01', joined: 'Feb 2026' },
  { id: '5', code: 'RF-000133', name: 'Nithya Krishnan',    course: 'Pelvic Floor Foundations', course_id: 'c4', branch: 'Madurai',    aliases: [],                   emails: [],                    weekdays: null, status: 'inactive', expected: 0, attended: 0, missed: 0, streak: 0, lastPresent: null, last: '11 Aug', joinedOn: '2026-05-01', joined: 'May 2026' },
  { id: '6', code: 'RF-000140', name: 'Fathima Rizwan',     course: 'Postnatal Core',           course_id: 'c2', branch: 'Coimbatore', aliases: ['Fathima'],          emails: [],                    weekdays: null, status: 'active', expected: 3, attended: 0, missed: 3, streak: 4, lastPresent: '2026-08-07', last: '9 Aug', joinedOn: '2025-12-01', joined: 'Dec 2025' },
  { id: '7', code: 'RF-000131', name: 'Lakshmi Priya',      course: 'Prenatal Flow',            course_id: 'c1', branch: 'Chennai',    aliases: ['Lakshmi P'],        emails: [{ address: 'lakshmi.p@gmail.com', primary: true }], weekdays: null, status: 'active', expected: 4, attended: 2, missed: 2, streak: 1, lastPresent: '2026-08-21', last: '\u2014', joinedOn: '2025-11-01', joined: 'Nov 2025' },
  { id: '8', code: 'RF-000146', name: 'Kavya Balaji',       course: 'Postnatal Core',           course_id: 'c2', branch: 'Madurai',    aliases: [],                   emails: [],                    weekdays: null, status: 'active', expected: 3, attended: 0, missed: 3, streak: 3, lastPresent: '2026-08-05', last: '6 Aug', joinedOn: '2026-06-01', joined: 'Jun 2026' },
];

export const WEEK = { from: '18 Aug', to: '24 Aug 2026', label: '18\u201324 Aug 2026' };
export const BRANCHES = ['All branches', 'Coimbatore', 'Madurai', 'Chennai'];
export const COURSES  = ['All courses', 'Prenatal Flow', 'Postnatal Core', 'Trimester 3 Gentle', 'Pelvic Floor Foundations'];
export const SUPPORT_PHONE = '9994871158';
/**
 * Support is UniqBrio's desk, not a RosiFit inbox -- the academy calls a
 * person there, and that person answers as UniqBrio. Naming it is part of
 * the C-90 anti-phishing control: the screen states who picks up as well as
 * on which number.
 */
export const SUPPORT_NAME = 'UniqBrio support';
/** The number is an Indian mobile; +91 is what a dialler and wa.me both need. */
export const SUPPORT_DIAL_CODE = '+91';
/** What the screen SHOWS. */
export const SUPPORT_PHONE_DISPLAY = `${SUPPORT_DIAL_CODE} ${SUPPORT_PHONE}`;
/** What a `tel:` link carries -- no space, so no dialler has to parse one. */
export const SUPPORT_PHONE_E164 = `${SUPPORT_DIAL_CODE}${SUPPORT_PHONE}`;
/** wa.me wants the digits alone: country code, no '+', no separators. */
export const SUPPORT_WHATSAPP_URL = `https://wa.me/91${SUPPORT_PHONE}`;

/**
 * The maker's mark at the foot of Help & support. Two sites, both UniqBrio's
 * own -- they are an attribution, NOT a second support channel, and the card
 * above them says so.
 */
export const POWERED_BY = {
  name: 'UniqBrio',
  sites: [
    { label: 'uniqbrio.com', url: 'https://uniqbrio.com' },
    { label: 'uniqbotz.com', url: 'https://uniqbotz.com' },
  ],
} as const;

/**
 * The addresses the academy may send AS.
 *
 * A list to choose from, never free text: a from-address nobody owns bounces
 * every message the course will ever send. Both of these sit under domains
 * VERIFIED in SES -- getfit.rosifit.com and getfit.ravisfit.com -- which is
 * what makes them sendable; the bare rosifit.com / ravisfit.com addresses
 * these replaced on 07-Sep-2026 were not verified anywhere (TD-016).
 *
 * A verified DOMAIN covers every address under it, so support@ needs no
 * mailbox and no separate verification. What it does NOT do is choose the
 * envelope sender: SES is called with SES_FROM_ADDRESS, not with the address
 * picked here, so a course's pick is stored and not yet honoured (TD-016).
 */
export const SENDERS = ['support@getfit.rosifit.com', 'support@getfit.ravisfit.com'];

/**
 * A course's own sender, template and wording, offline.
 *
 * Keyed by course id. An ABSENT entry means the course has never been
 * configured and falls back to the default template -- which is not the same
 * as an entry with empty wording, and the two must stay distinguishable or
 * "Reset to template" has nothing to mean.
 */
export const COURSE_MESSAGES: Record<string,
  { from_email: string; template_id: string; subject: string; body: string }> = {};

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
// Same reason, for the other rule the fixtures have to obey: a member is
// only in a day's data from the day she joined, and one implementation of
// that decides it for the fixture generator and the screens alike.
import { hasJoinedBy } from './joined';
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

export const TOKENS = ['{{first_name}}','{{member_name}}','{{course_name}}',
  '{{branch_name}}','{{period_from}}','{{period_to}}','{{expected_sessions}}','{{attended_sessions}}',
  '{{missed_sessions}}','{{attendance_pct}}','{{consecutive_missed}}','{{last_attendance_date}}','{{academy_name}}',
  '{{follow_up_trigger}}'];

/** Server-side rendering is what the real thing does; this mirrors it so the
 *  preview shows real values rather than placeholders. */
export function renderTemplate(tpl: string, c: FollowUpCandidate): string {
  const map: Record<string, string> = {
    first_name: c.full_name.split(' ')[0], member_name: c.full_name,
    course_name: c.course_name, branch_name: c.branch_name,
    period_from: WEEK.from, period_to: WEEK.to,
    expected_sessions: String(c.expected), attended_sessions: String(c.attended),
    missed_sessions: String(c.missed), attendance_pct: c.attendance_pct === null ? '—' : `${c.attendance_pct}%`,
    consecutive_missed: String(c.current_streak), last_attendance_date: '21 Aug',
    academy_name: 'RosiFit Academy',
    follow_up_trigger: String(c.follow_up_trigger),
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
  /**
   * She has asked for a new PIN and nobody has issued one yet (0034).
   *
   * NOT a StaffAccess value, deliberately. Access is what her ACCOUNT is --
   * enabled, awaiting, disabled, active -- and she is 'active' throughout:
   * the account is fine, she just cannot remember the PIN. Folding it into
   * the same field would make an ask look like an account state and lose the
   * real one behind it.
   */
  pinResetRequested?: boolean;
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
/**
 * One recorded entry, exactly as the database holds it.
 *
 * Everything here is RAW on purpose — the action code, the entity type, the
 * column names inside `changes`. The screen never prints any of them; it
 * asks `src/data/auditPlain.ts` for the words. Storing the readable form
 * here instead would put the translation in two places, and the live rows
 * (which arrive as codes and cannot be anything else) would take the other
 * path — which is how the fixtures end up describing a screen that does not
 * exist.
 */
export type AuditEntry = {
  id: string;
  /** the actor's name, or 'System' when the row carries no actor */
  who: string;
  /** `actor_kind` — what that name IS. The screen says Owner or Staff. */
  whoKind: 'super_admin' | 'staff' | 'system' | 'anon' | 'provider';
  /** ISO 8601. The screen decides how to say it (whenText). */
  when: string;
  action: string;
  entity: string;
  /** who or what the entry is about, already resolved to a name. null when
   *  nothing on the row names one — never an identifier. */
  subject: string | null;
  /** The branch the change can be traced to, when it can be traced to one.
   *  `audit_logs` records no branch — this is worked out from what the row
   *  POINTS AT (a branch, an offering, or a member through her enrolment),
   *  so it is the branch that holds today. null means the change belongs to
   *  no single branch: a message template, a setting, an account. */
  branch: string | null;
  changes: { field: string; old: string | null; new: string | null }[];
  /**
   * `audit_logs.metadata` — what the WRITER of the entry chose to record
   * beside the changed columns. Only a handful of actions set it, and only
   * one thing reads it: a bulk import's own summary row carries the file
   * name and the inserted/skipped/failed counts, which is how the screen
   * can say "4 members added from register.csv" rather than counting rows
   * and hoping. Absent on almost every entry, so it is optional.
   */
  meta?: Record<string, unknown>;
};

/** A fixed clock for the fixtures, so "Today" in the prototype means today. */
const auditAt = (daysAgo: number, h: number, m: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

export const AUDIT: AuditEntry[] = [
  { id: 'a1', who: 'Priya Menon', whoKind: 'staff', when: auditAt(0, 10, 32),
    action: 'csv_import.matched_existing', entity: 'member', subject: 'Shazia Farheen', branch: 'Coimbatore',
    changes: [{ field: 'alias_display', old: null, new: 'Shazia' }] },
  { id: 'a2', who: 'Priya Menon', whoKind: 'staff', when: auditAt(0, 10, 18),
    action: 'member_email.update', entity: 'member_email', subject: 'Divya Ramesh', branch: 'Madurai',
    changes: [{ field: 'email', old: 'old@example.com', new: 'divya@example.com' }] },
  { id: 'a3', who: 'Rosi Owner', whoKind: 'super_admin', when: auditAt(1, 18, 40),
    action: 'course_follow_up_config.update', entity: 'course_follow_up_config', subject: 'Prenatal Yoga', branch: null,
    changes: [
      { field: 'weekly_threshold', old: '3', new: '2' },
      { field: 'consecutive_threshold', old: '4', new: '3' },
      { field: 'combination', old: 'or', new: 'and' }] },
  { id: 'a4', who: 'Rosi Owner', whoKind: 'super_admin', when: auditAt(1, 9, 2),
    action: 'holiday.applied', entity: 'holiday', subject: 'Diwali', branch: null,
    changes: [
      { field: 'from_date', old: null, new: '2026-10-20' },
      { field: 'to_date', old: null, new: '2026-10-22' },
      { field: 'scope', old: null, new: 'all_branches' }] },
  { id: 'a5', who: 'Priya Menon', whoKind: 'staff', when: auditAt(2, 16, 15),
    action: 'offering_schedule.update', entity: 'offering_schedule', subject: 'Prenatal Fitness · Coimbatore', branch: 'Coimbatore',
    changes: [{ field: 'weekdays', old: '1,2,4,6', new: '1,2,3,4,6' }] },
  // Present so the prototype shows what the screen now HIDES: a sign-in is
  // recorded and is not a change. If the filter ever stops working, this row
  // appears and the defect is visible without a live project.
  { id: 'a6', who: 'System', whoKind: 'anon', when: auditAt(0, 16, 7),
    action: 'auth.login_succeeded', entity: 'app_user', subject: null, branch: null, changes: [] },
  // A CREATION, carrying every column members (0006) is born with. The screen
  // prints the one that identifies her and says it left five behind -- the
  // requester asked for "only name of member and email".
  { id: 'a7', who: 'Rosi Owner', whoKind: 'super_admin', when: auditAt(0, 9, 12),
    action: 'member.insert', entity: 'member', subject: 'Anitha Raman', branch: 'Coimbatore',
    changes: [
      { field: 'full_name', old: null, new: 'Anitha Raman' },
      { field: 'member_code', old: null, new: 'RF-0148' },
      { field: 'status', old: null, new: 'active' },
      { field: 'joined_on', old: null, new: '2026-09-07' },
      { field: 'notes', old: null, new: 'Referred by Divya' },
      { field: 'created_by', old: null, new: 'Rosi Owner' }] },
  // Her address, on its own entry, naming the member it belongs to.
  { id: 'a8', who: 'Rosi Owner', whoKind: 'super_admin', when: auditAt(0, 9, 12),
    action: 'member_email.insert', entity: 'member_email', subject: 'Anitha Raman', branch: 'Coimbatore',
    changes: [
      { field: 'member_id', old: null, new: 'Anitha Raman' },
      { field: 'email', old: null, new: 'anitha.r@gmail.com' },
      { field: 'is_primary', old: null, new: 'true' }] },
  /* ONE BULK IMPORT, as the database actually writes it: every row below
   * shares an occurred_at, because audit_logs.occurred_at defaults to now()
   * and now() is the TRANSACTION timestamp. Four members went in and eight
   * entries came out - the screen shows one row for the run (auditGroups).
   * Deliberately lopsided: Raja has her alias, address and enrolment here
   * and the other three do not, so the group cannot be counting entries and
   * calling it members. */
  { id: 'a9', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member.bulk_imported', entity: 'member_import_run', subject: null, branch: 'Coimbatore',
    changes: [],
    meta: { file_name: 'register-sep.csv', total: 4, inserted: 4, skipped: 0, failed: 0 } },
  { id: 'a10', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member.insert', entity: 'member', subject: 'Raja', branch: 'Coimbatore',
    changes: [
      { field: 'full_name', old: null, new: 'Raja' },
      { field: 'member_code', old: null, new: 'RF-0201' },
      { field: 'status', old: null, new: 'active' },
      { field: 'joined_on', old: null, new: '2026-09-08' },
      { field: 'created_by', old: null, new: 'Shazia' }] },
  { id: 'a11', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member_alias.insert', entity: 'member_alias', subject: 'Raja', branch: 'Coimbatore',
    changes: [
      { field: 'member_id', old: null, new: 'Raja' },
      { field: 'alias_display', old: null, new: 'Raj' }] },
  { id: 'a12', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member_email.insert', entity: 'member_email', subject: 'Raja', branch: 'Coimbatore',
    changes: [
      { field: 'member_id', old: null, new: 'Raja' },
      { field: 'email', old: null, new: 'raja@gmail.com' }] },
  { id: 'a13', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member_enrollment.insert', entity: 'member_enrollment', subject: 'Raja', branch: 'Coimbatore',
    changes: [
      { field: 'member_id', old: null, new: 'Raja' },
      { field: 'offering_id', old: null, new: 'Prenatal Yoga · Coimbatore' }] },
  { id: 'a14', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member.insert', entity: 'member', subject: 'Priya Sharma', branch: 'Coimbatore',
    changes: [{ field: 'full_name', old: null, new: 'Priya Sharma' }] },
  { id: 'a15', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member.insert', entity: 'member', subject: 'Anu Nair', branch: 'Coimbatore',
    changes: [{ field: 'full_name', old: null, new: 'Anu Nair' }] },
  { id: 'a16', who: 'Shazia', whoKind: 'super_admin', when: auditAt(0, 8, 17),
    action: 'member.insert', entity: 'member', subject: 'Kavya Iyer', branch: 'Coimbatore',
    changes: [{ field: 'full_name', old: null, new: 'Kavya Iyer' }] },
  /* A PERMANENT DELETION, in the shape purge_member (0051) actually writes:
   * no changed fields, no subject -- her members row went in the same
   * transaction, so the id resolves to nothing -- and everything the entry
   * knows in `meta`. That is the whole defect in one fixture, and it is here
   * so the prototype shows the row the live project shows. Without it the
   * screen was only ever seen on data where every subject resolved. */
  { id: 'a17', who: 'Rosi Owner', whoKind: 'super_admin', when: auditAt(0, 13, 32),
    action: 'member.hard_deleted', entity: 'member', subject: null, branch: null,
    changes: [],
    meta: { name: 'Sumathi', member_code: null, was_soft_deleted_at: null, note: null,
            enrolments: 1, emails_sent: 0, attendance_records: 2, sessions_touched: 2 } },
  /* The same act ordered by a MIGRATION rather than by a person: attributed
   * to nobody, which is exactly why the note exists and why it has to reach
   * the screen. */
  { id: 'a18', who: 'System', whoKind: 'anon', when: auditAt(0, 12, 59),
    action: 'member.hard_deleted', entity: 'member', subject: null, branch: null,
    changes: [],
    meta: { name: 'Rohini', member_code: 'RF-000109', enrolments: 0, emails_sent: 4,
            attendance_records: 0, sessions_touched: 0,
            note: '0055_purge_every_member: the entire register removed at the repo owner’s '
                + 'explicit request of 08-Sep-2026' } },
  /* A course, so the family is represented by more than the member case the
   * request named -- purge_course (0047) writes the identical shape. */
  { id: 'a19', who: 'Rosi Owner', whoKind: 'super_admin', when: auditAt(1, 16, 12),
    action: 'course.hard_deleted', entity: 'course', subject: null, branch: null,
    changes: [],
    meta: { name: 'Aqua Fitness', was_soft_deleted_at: null, note: null,
            sessions: 12, attendance_records: 38, imports: 3 } },
  /* And an action added after the plain-language pass was written, kept so
   * the prototype shows one: it read "Attendance — attendance day reset" and
   * appeared under Courses, because the entry is filed against the course. */
  { id: 'a20', who: 'Rosi Owner', whoKind: 'super_admin', when: auditAt(0, 13, 31),
    action: 'attendance.day_reset', entity: 'course', subject: 'Prenatal Yoga', branch: 'Coimbatore',
    changes: [],
    meta: { session_date: '2026-09-08', marks_cleared: 2, imports_reverted: 1,
            sessions_reverted: 1, members_deleted: 0 } },
];

// ---------------------------------------------------------------- remarks
/**
 * A note somebody wrote by hand beside the log. It is NOT an audit entry:
 * `audit_logs` records what the app did, is redacted on write and cannot be
 * added to by a person. A remark is the other half — why it was done — and
 * it lives in its own table for exactly that reason.
 */
export type Remark = {
  id: string;
  body: string;
  /**
   * The audit entry this remark is about, or null for a free-standing one.
   * Null is every remark written before 0044 moved them into the table; the
   * screen no longer offers a way to make a new one.
   */
  entryId: string | null;
  /** who wrote it */
  who: string;
  /** ISO 8601 */
  when: string;
};

export const REMARKS: Remark[] = [
  // Attached to a3, the entry that shows those thresholds changing -- which
  // is the whole point of the move: the note sits beside its own change.
  { id: 'r1', who: 'Rosi Owner', when: auditAt(1, 19, 5), entryId: 'a3',
    body: 'Lowered the Prenatal Yoga thresholds after the Saturday batch moved — expect more follow-ups for a fortnight.' },
  { id: 'r2', who: 'Priya Menon', when: auditAt(0, 10, 40), entryId: 'a1',
    body: 'She goes by Shazia on the call, so the register matches what the tutor hears.' },
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
  follow_up_trigger: GLOBAL_RULE.weekly_threshold,
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
/**
 * A session that has run and has no attendance file yet.
 *
 * Declared HERE rather than in repository.ts because repository.ts imports
 * the Supabase client, which needs React Native and DOM globals -- so a pure
 * module that named the type from there could not be type-checked by
 * scripts/tsconfig.json, where the specs run under plain node. The fixture
 * below is the same shape, which is the other reason it belongs beside it.
 */
export type PendingSession = {
  session_id: string | null; offering_id: string; session_date: string;
  /** the course this session belongs to, so the upload screen can be scoped */
  course_id: string | null; course: string;
  dayNum: string; mon: string; title: string; meta: string; label: string;
};

export const PENDING_SESSIONS = [
  // course_id matches COURSES' ids, so the fixtures exercise the scoped
  // upload entry points rather than only the academy-wide one.
  { dayNum: '22', mon: 'AUG', date: '2026-08-22', course_id: 'c1', course: 'Prenatal Flow',
    title: 'Prenatal Flow · 6:00 pm',
    meta: 'Coimbatore · 18 expected · awaiting upload',
    label: 'Fri 22 Aug · Prenatal Flow 6:00 pm' },
  { dayNum: '23', mon: 'AUG', date: '2026-08-23', course_id: 'c2', course: 'Postnatal Core',
    title: 'Postnatal Core · 8:00 am',
    meta: 'Madurai · 12 expected · awaiting upload',
    label: 'Sat 23 Aug · Postnatal Core 8:00 am' },
];

/**
 * Days that ALREADY have a register, and the file that put it there.
 *
 * Here for the same reason PENDING_SESSIONS carries a `date`: the upload
 * screen asks before it REPLACES a register (0037), and which file already
 * covers a day is a fact only the server holds — so offline, the one question
 * the dialog exists to ask could never be reached. CP-001 is why it is in this
 * module and not in the screen: one place decides what the fixtures say.
 *
 * Both days are ones MONTH_DAYS already reports as `completed`, and neither is
 * one of the two AWAITING a file above — a day cannot be both.
 */
export const IMPORTED_DAYS: Record<string, string> = {
  '2026-08-18': 'meet_18-08_prenatal-flow.csv',
  '2026-08-20': 'meet_20-08_postnatal-core.csv',
};

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
  id: string; member_id: string; member: string;
  course: string; branch: string;
  /**
   * The course this row's session belongs to, by identity, or null when the
   * offering behind it can no longer be resolved.
   *
   * Since 0047 delete_course removes the course's sessions and attendance
   * records outright, so a row whose offering cannot be resolved is a
   * transient state rather than a permanent one. The identity match stays
   * for the same reason it was written: the week strip must never ask "rows
   * whose course is called this", or a new course could open showing the
   * attendance of one that shared its name.
   */
  course_id: string | null;
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
/**
 * Attendance marked by hand while the app is on fixtures.
 *
 * The generator below RE-DERIVES its rows on every call, so a chip that
 * writes into the array it returns changes nothing anybody reads again. This
 * map is the offline store: `${member_id}|${date}` -> what a person marked,
 * applied as an overlay at the end of the generator. Without it the offline
 * mode is the lie RC-008 records — a control that reports a change and shows
 * the old value the moment the week is reloaded.
 */
export const MANUAL_MARKS = new Map<string, AttendanceStatus>();

export function markFixtureAttendance(
  memberId: string, date: string, status: AttendanceStatus): void {
  MANUAL_MARKS.set(`${memberId}|${date}`, status);
}

/**
 * Days a reset has cleared, offline: `${course_id}|${date}`.
 *
 * A SUPPRESSION SET AND NOT A DELETION, because the generator below is
 * deterministic: it rebuilds every past Mon/Wed/Fri from the seed on each
 * call, so rows removed from its output would simply be regenerated by the
 * next read and the reset would appear to undo itself. MANUAL_MARKS has the
 * same shape of answer for the same reason.
 */
export const RESET_DAYS = new Set<string>();

/** Clear one course's day offline, the way reset_day_attendance (0054) does. */
export function resetFixtureDay(courseId: string, date: string): void {
  RESET_DAYS.add(`${courseId}|${date}`);
  // A hand-made mark is a row like any other and goes with the rest, or the
  // overlay below would put it straight back on a day that was just cleared.
  for (const key of [...MANUAL_MARKS.keys()]) {
    if (key.endsWith(`|${date}`)) MANUAL_MARKS.delete(key);
  }
}

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
      // NOT BEFORE SHE JOINED. The generator used to give every member a row
      // on every past Mon/Wed/Fri, so a member added this morning arrived
      // with weeks of attendance behind her and the offline register told a
      // story the live one never could -- the same defect the roster had,
      // one layer down (src/data/joined.ts).
      if (!hasJoinedBy(m, date)) return;
      // deterministic, so the same day always reads the same way
      const seed = (d.getDate() + i * 3) % 5;
      const status: AttendanceStatus = seed === 0 ? 'absent' : seed === 4 && i === 2 ? 'extra' : 'present';
      rows.push({
        id: `${date}-${m.id}`, member_id: m.id, member: m.name,
        course: m.course, course_id: m.course_id, branch: m.branch, date,
        time: m.course === 'Postnatal Core' ? '08:00' : '18:00',
        status,
        expected: status !== 'extra',
        minutes: status === 'absent' ? null : 45 + ((d.getDate() + i) % 20),
      });
    });
  }

  // The overlay. A mark can CHANGE a generated row, and it can add one the
  // generator never made -- a Tuesday, or a member the seed left out -- which
  // is why it is applied here rather than by editing rows in place.
  for (const [key, status] of MANUAL_MARKS) {
    const [memberId, date] = key.split('|');
    if (date < from || date > to) continue;
    const member = MEMBERS.find(m => m.id === memberId);
    if (!member) continue;
    const existing = rows.find(r => r.member_id === memberId && r.date === date);
    if (existing) {
      existing.status = status;
      existing.expected = status !== 'extra';
      if (status === 'absent') existing.minutes = null;
      continue;
    }
    rows.push({
      id: `${date}-${memberId}`, member_id: memberId, member: member.name,
      course: member.course, course_id: member.course_id, branch: member.branch, date,
      time: member.course === 'Postnatal Core' ? '08:00' : '18:00',
      status, expected: status !== 'extra',
      minutes: status === 'absent' ? null : 45,
    });
  }

  // A DAY THAT WAS RESET HOLDS NOTHING, and that is applied last so it covers
  // the overlay above as well as the generated rows -- a reset clears the
  // register, not merely the part of it a seed invented.
  const live = RESET_DAYS.size === 0 ? rows
    : rows.filter(r => !RESET_DAYS.has(`${r.course_id}|${r.date}`));

  return live.sort((a, b) => (a.date === b.date ? a.member.localeCompare(b.member) : b.date.localeCompare(a.date)));
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
