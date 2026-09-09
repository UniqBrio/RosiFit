/**
 * The audit log, in words a person who does not read databases can read.
 *
 * WHY THIS MODULE EXISTS
 * `audit_logs` is written by the database, for the database: the action is a
 * code (`member.insert`), the changed field is a COLUMN name (`full_name`),
 * and anything that points at another row is a UUID. The screen printed all
 * three verbatim, so the academy owner — the only person who may open it —
 * read "member.insert / created_by / a98a2d1a-32de-45f4-8b67-…" and learned
 * nothing. Nothing was wrong with the record; the translation was missing.
 *
 * THE ONE RULE HERE: TOTALITY.
 * Every function below answers for an input it has never seen. A mapping
 * table that falls through to the raw code would put the defect back the
 * first time somebody adds an action — and it would do it silently, on a
 * screen nobody looks at until something has gone wrong. So each lookup ends
 * in `prettify()`, which turns `some.new_action` into "Some new action":
 * imperfect, but never a code.
 *
 * AND THAT WAS NOT ENOUGH, which is the lesson of RC-036. `prettify` makes
 * the fall-through survivable, not correct: "Csv import previewed" is not a
 * code and is not English either, and the noun branch below produced "Member —
 * member hard deleted", which is a code with a noun in front of it. Neither
 * looks like a gap. The coverage claim was a list somebody kept in
 * `auditPlain.test.ts` — accurate the day it was written, and blind to the
 * fourteen actions nine later migrations added. So `hasPlainTitle` names the
 * fall-through, and `auditActionCoverage.test.ts` reads `supabase/` at test
 * time rather than quoting a grep of it: an audit_log call added in a
 * migration fails the suite until somebody writes the words for it.
 *
 * WHAT THIS MODULE IS NOT
 * It does not filter, sort or fetch. It converts one recorded value into one
 * readable value, and nothing here knows what a screen looks like.
 */

/* ------------------------------------------------------------------ shared */

/** Sentence case from a code: `csv_import.row_skipped` -> "Csv import row skipped". */
function prettify(code: string): string {
  const words = code.replace(/[._]+/g, ' ').trim().toLowerCase();
  if (!words) return 'Change recorded';
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/* ---------------------------------------------------------- sign-in traffic
 * Signing in is not a CHANGE. These six actions record an ATTEMPT to prove
 * who somebody is — before a session exists, which is why they carry no
 * actor at all (RC-011, "deliberately not attributed"). They go on being
 * written and go on being readable in the table; this list only says they
 * are not what the Audit log SHOWS, which is every change made in the app.
 *
 * Account MANAGEMENT is deliberately absent from this list: creating a staff
 * account, issuing a PIN or changing a mobile number all change a stored
 * record, and the screen's own promise covers "or account".
 */
export const SESSION_ACTIONS: ReadonlySet<string> = new Set([
  'auth.login_succeeded',
  'auth.login_failed',
  'auth.bootstrap_completed',
  'auth.recovery_passed',
  'auth.recovery_failed',
  'auth.pin_reset_requested',
]);

export function isSessionAction(action: string): boolean {
  return SESSION_ACTIONS.has(action);
}

/* ---------------------------------------------------------------- entities
 * `entity_type` as the triggers write it, in the words the app already uses
 * for the same thing elsewhere. "Offering" is on this list rather than
 * translated away because the Courses screen already says it out loud
 * ("its 3 offerings and every session still to come").
 */
const ENTITY_NOUN: Record<string, string> = {
  member: 'Member',
  member_email: 'Member email address',
  member_alias: 'Name used on Meet',
  member_enrollment: 'Course enrolment',
  member_schedule: 'Custom days',
  course: 'Course',
  offering: 'Course offering',
  offering_schedule: 'Course schedule',
  session: 'Session',
  attendance: 'Attendance',
  holiday: 'Holiday',
  branch: 'Branch',
  app_user: 'Account',
  app_settings: 'Academy settings',
  email_template: 'Message template',
  course_communication: 'Course message',
  follow_up_config: 'Follow-up rule',
  course_follow_up_config: 'Course follow-up rule',
  email_batch: 'Follow-up emails',
  csv_import: 'Attendance upload',
  member_import_run: 'Member import',
  member_dates_import: 'Member dates import',
  'auth.mobile_changed': 'Mobile number',
};

/** The trigger's three operations, as something that happened. */
const OP_VERB: Record<string, string> = {
  insert: 'added',
  update: 'updated',
  delete: 'removed',
};

/**
 * The verbs that would read wrongly with the generic ones. Attendance is not
 * "added", it is marked; settings are not "added" at all.
 */
const ENTITY_OP_TITLE: Record<string, Record<string, string>> = {
  attendance: { insert: 'Attendance marked', update: 'Attendance changed', delete: 'Attendance removed' },
  app_settings: { insert: 'Academy settings set', update: 'Academy settings updated', delete: 'Academy settings removed' },
  session: { insert: 'Session scheduled', update: 'Session changed', delete: 'Session removed' },
  member_schedule: { insert: 'Custom days set', update: 'Custom days changed', delete: 'Custom days removed' },
  'auth.mobile_changed': { insert: 'Mobile number changed', update: 'Mobile number changed', delete: 'Mobile number change withdrawn' },
};

/**
 * The actions written by hand through `audit_log()` / `audit_log_as()`.
 * These are not `<entity>.<op>` and cannot be composed, so each is stated.
 */
const ACTION_TITLE: Record<string, string> = {
  'member.created': 'Member added',
  'member.updated': 'Member updated',
  'member.merged': 'Two member records merged',
  'member.bulk_imported': 'Members added from a file',
  // 0058, and deliberately worded so it cannot be mistaken for the line
  // above it: that one ADDED people, this one only moved the dates of
  // people already here. Two importers, two sentences.
  'member.dates_imported': 'Member dates set from a file',
  'communication.batch_sent': 'Follow-up emails sent',
  'csv_import.completed': 'Attendance file uploaded',
  'csv_import.member_created': 'Member added from the upload',
  'csv_import.matched_existing': 'Upload row matched to a member',
  'csv_import.email_added': 'Email address added from the upload',
  'csv_import.row_skipped': 'Upload row skipped',
  // The same file offered a second time. Nothing was written, which is the
  // whole point of recording it: the question "why is there no import for
  // that upload?" has an answer on this screen.
  'csv_import.already_imported': 'Attendance file offered again, already imported',
  'holiday.applied': 'Holiday applied',
  'holiday.removed': 'Holiday removed',
  'auth.staff_created': 'Staff account created',
  'auth.staff_reenabled': 'Staff account switched back on',
  'auth.pin_issued': 'PIN issued',
  'auth.pin_changed': 'PIN changed',
  'auth.pin_reset': 'PIN reset',
  'auth.mobile_changed': 'Mobile number changed',
  'auth.staff_deleted': 'Staff account removed',
  'auth.recovery_pin_set': 'PIN set after the recovery questions',
  /* THE PERMANENT DELETIONS (0047, 0051, 0053-0055).
   *
   * These five are not `<entity>.<op>`: they are written BY HAND, before the
   * rows go, because the audit triggers fire on insert and update only and a
   * DELETE would otherwise leave no trace of the most destructive act the app
   * offers. Composed, `member.hard_deleted` came out as "Member — member hard
   * deleted", which is the code with a noun glued to the front of it.
   *
   * "Permanently" is doing real work in each of these. This app HAD a soft
   * delete and now does not (0044 -> 0051), and the two are different facts
   * about whether anything can be got back. */
  'member.hard_deleted': 'Member deleted permanently',
  'course.hard_deleted': 'Course deleted permanently',
  'branch.hard_deleted': 'Branch deleted permanently',
  'member_email.hard_deleted': 'Email address deleted permanently',
  'member_import_run.hard_deleted': 'Import receipt deleted permanently',
  // Attendance, whose writers are functions rather than the row trigger:
  // set_attendance (0035) and reset_day_attendance (0056).
  'attendance.marked': 'Attendance marked',
  'attendance.session_created': 'Session opened by marking the register',
  'attendance.day_reset': 'A day’s register reset',
  // The upload's own steps, beyond the five 0014 already named.
  'csv_import.previewed': 'Attendance file checked before importing',
  'csv_import.overrode_register': 'Upload replaced that day’s register',
  'csv_import.member_in_other_course': 'Upload row matched a member of another course',
  'meeting_group.created': 'Meeting code given its own course offering',
  // Listed so the log can SAY what it is not showing, if it is ever asked to.
  'auth.login_succeeded': 'Signed in',
  'auth.login_failed': 'Sign-in refused',
  'auth.bootstrap_completed': 'Academy set up',
  'auth.recovery_passed': 'Recovery questions answered',
  'auth.recovery_failed': 'Recovery questions refused',
  'auth.pin_reset_requested': 'PIN reset requested',
};

/**
 * What happened, as a sentence.
 *
 * The composed half handles `<entity>.<op>` from `audit_row_change`, which is
 * where nineteen entities × three operations come from — writing all
 * fifty-seven out by hand is how one of them ends up missing.
 */
export function actionTitle(action: string, entityType?: string): string {
  const named = ACTION_TITLE[action];
  if (named) return named;

  // `auth.mobile_changed.insert` — the entity itself contains a dot, so the
  // split has to come from the RIGHT.
  const cut = action.lastIndexOf('.');
  if (cut > 0) {
    const entity = action.slice(0, cut);
    const op = action.slice(cut + 1);
    const special = ENTITY_OP_TITLE[entity]?.[op];
    if (special) return special;
    const noun = ENTITY_NOUN[entity];
    const verb = OP_VERB[op];
    if (noun && verb) return `${noun} ${verb}`;
  }

  const noun = entityType ? ENTITY_NOUN[entityType] : undefined;
  if (noun) return `${noun} — ${prettify(action).toLowerCase()}`;
  return prettify(action);
}

/**
 * Whether the title above was STATED or guessed.
 *
 * `actionTitle` is total by construction — it always returns something — and
 * that is exactly what made its coverage impossible to measure. The last two
 * branches guess: `prettify` turns `csv_import.previewed` into "Csv import
 * previewed", and the noun branch turns `member.hard_deleted` into "Member —
 * member hard deleted". Both look like translations. Neither is one, and on
 * the screen nobody could tell.
 *
 * So the fall-through is named. `auditActionCoverage.test.ts` reads every
 * action `supabase/` can emit and asserts this is true of all of them, which
 * makes adding an `audit_log(...)` call a failing test until somebody writes
 * the words — the coupling between the audit WRITERS and this reader that did
 * not exist, and whose absence let fourteen actions reach the academy owner as
 * codes (RC-036).
 */
export function hasPlainTitle(action: string, entityType?: string): boolean {
  if (ACTION_TITLE[action]) return true;
  const cut = action.lastIndexOf('.');
  if (cut > 0) {
    const entity = action.slice(0, cut);
    const op = action.slice(cut + 1);
    if (ENTITY_OP_TITLE[entity]?.[op]) return true;
    if (ENTITY_NOUN[entity] && OP_VERB[op]) return true;
  }
  return false;
}

/* -------------------------------------------------------------- categories
 * The chips above the list. Chosen so a person can ask the question they
 * actually have — "what happened to the members?", "what did the upload
 * do?" — rather than pick a table name.
 */
export type AuditCategory = 'members' | 'courses' | 'attendance' | 'uploads' | 'messages' | 'settings';

const ENTITY_CATEGORY: Record<string, AuditCategory> = {
  member: 'members',
  member_email: 'members',
  member_alias: 'members',
  member_enrollment: 'members',
  member_schedule: 'members',
  course: 'courses',
  offering: 'courses',
  offering_schedule: 'courses',
  session: 'courses',
  holiday: 'courses',
  follow_up_config: 'courses',
  course_follow_up_config: 'courses',
  attendance: 'attendance',
  // An import receipt is what an upload left behind, not a setting. Without
  // this line `member_import_run.hard_deleted` fell to the default and filed
  // eight removals under Settings.
  member_import_run: 'uploads',
  member_dates_import: 'uploads',
  csv_import: 'uploads',
  email_template: 'messages',
  course_communication: 'messages',
  email_batch: 'messages',
  app_user: 'settings',
  app_settings: 'settings',
  branch: 'settings',
  'auth.mobile_changed': 'settings',
};

export function categoryOf(action: string, entityType: string): AuditCategory {
  // An upload is a thing that HAPPENED, not a table — every row it wrote
  // belongs with it, whichever table took the write.
  if (action.startsWith('csv_import.')) return 'uploads';
  if (action === 'member.bulk_imported') return 'uploads';
  if (action.startsWith('communication.')) return 'messages';
  if (action.startsWith('auth.')) return 'settings';
  /* Attendance is a thing that HAPPENED too, and its writers file it against
   * whatever row identifies it: `attendance.marked` against the member,
   * `attendance.session_created` against the session, `attendance.day_reset`
   * against the course. Left to the entity, one reset of a day's register
   * appeared under Courses — the chip is the question somebody has, and
   * nobody looks for a cleared register under Courses. */
  if (action.startsWith('attendance.')) return 'attendance';

  const byEntity = ENTITY_CATEGORY[entityType];
  if (byEntity) return byEntity;

  const cut = action.lastIndexOf('.');
  const byAction = cut > 0 ? ENTITY_CATEGORY[action.slice(0, cut)] : undefined;
  if (byAction) return byAction;

  const head = action.split('.')[0];
  return ENTITY_CATEGORY[head] ?? 'settings';
}

/** Category → the chip's word and glyph. Colour is never the only signal. */
export const CATEGORY_CHIPS: { key: AuditCategory | 'all'; label: string; icon: string }[] = [
  { key: 'all', label: 'Everything', icon: 'list' },
  { key: 'members', label: 'Members', icon: 'group' },
  { key: 'courses', label: 'Courses', icon: 'school' },
  { key: 'attendance', label: 'Attendance', icon: 'fact_check' },
  { key: 'uploads', label: 'Uploads', icon: 'cloud_upload' },
  { key: 'messages', label: 'Messages', icon: 'mail' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
];

const CATEGORY_ICON: Record<AuditCategory, string> = {
  members: 'group',
  courses: 'school',
  attendance: 'fact_check',
  uploads: 'cloud_upload',
  messages: 'mail',
  settings: 'settings',
};

export function categoryIcon(c: AuditCategory): string {
  return CATEGORY_ICON[c];
}

/* ------------------------------------------------------------ field labels
 * A database column name is not a user-facing word (PRODUCT_LEXICON says so
 * in as many words). These are the columns the audited tables actually have.
 */
const FIELD_LABEL: Record<string, string> = {
  full_name: 'Name',
  name: 'Name',
  title: 'Title',
  member_code: 'Member code',
  // 'Joined on' until 0057. The column is still `joined_on` -- renaming it
  // would cost a migration nobody can review -- but every screen an end
  // user reads now calls it Active from, and an audit line is one of them.
  joined_on: 'Active from',
  status: 'Status',
  // The audit trigger reports every changed column by name; without a
  // label this one would reach an end user as `inactive_from` (0045).
  inactive_from: 'Inactive from',
  notes: 'Notes',
  email: 'Email address',
  is_primary: 'Main address',
  alias_display: 'Name used on Meet',
  alias_type: 'Kind of name',
  weekdays: 'Days',
  start_time: 'Start time',
  end_time: 'End time',
  effective_from: 'In force from',
  effective_to: 'In force until',
  occurred_on: 'Date',
  session_date: 'Date',
  present: 'Present',
  source: 'Recorded from',
  role_label: 'Role',
  kind: 'Account type',
  is_active: 'Active',
  active: 'In use',
  phone_e164: 'Mobile number',
  academy_name: 'Academy name',
  subject: 'Subject',
  body: 'Message',
  from_email: 'Sent from',
  sender_email: 'Sent from',
  weekly_threshold: 'Missed in a week',
  consecutive_threshold: 'Missed in a row',
  combination: 'Both rules or either',
  week_start_day: 'Week starts on',
  from_date: 'From',
  to_date: 'Until',
  scope: 'Applies to',
  meeting_code: 'Meeting code',
  // Anything pointing at another row. The VALUE is resolved to that row's
  // name before it reaches the screen; the label says which row it is.
  member_id: 'Member',
  course_id: 'Course',
  branch_id: 'Branch',
  offering_id: 'Course offering',
  session_id: 'Session',
  created_by: 'Added by',
  updated_by: 'Changed by',
  added_by: 'Added by',
  confirmed_by: 'Confirmed by',
  deleted_at: 'Removed on',
  actor_app_user_id: 'Done by',
};

export function fieldLabel(field: string): string {
  return FIELD_LABEL[field] ?? prettify(field);
}

/* ------------------------------------------------------------------ values */

const WEEKDAY = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_STAMP = /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/;

function clockText(h: number, m: number): string {
  const hr = ((h + 11) % 12) + 1;
  return `${hr}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}

/** `2026-09-07` -> "7 Sep 2026". Parsed by hand: `new Date('2026-09-07')` is
 *  UTC midnight, which is the previous DAY for anyone west of Greenwich. */
function dateText(y: number, mo: number, d: number): string {
  return `${d} ${MONTH[mo - 1] ?? mo} ${y}`;
}

/**
 * One recorded value, as something readable.
 *
 * `null` in means the value was not there — a creation has no PREVIOUS, and a
 * cleared field has no CURRENT. The caller decides which word to use for
 * that, because "not set" and "cleared" are the same null in different
 * places; this returns null and stays out of it.
 */
export function valueText(field: string, raw: string | null): string | null {
  if (raw === null || raw === undefined) return null;
  const v = String(raw).trim();
  if (v === '') return null;

  // The redaction pass has already been here. Say so in words rather than
  // showing the marker it left (guardrail 4: never in readable form).
  if (v === '[redacted]') return 'never recorded';

  if (v === 'true') return 'Yes';
  if (v === 'false') return 'No';

  if (field === 'weekdays') {
    const days = v.replace(/[[\]\s]/g, '').split(',').filter(Boolean);
    const named = days.map(d => WEEKDAY[Number(d) % 7] ?? d);
    return named.length ? named.join(' ') : null;
  }

  if (field === 'week_start_day') {
    const n = Number(v);
    return Number.isInteger(n) ? (WEEKDAY[n % 7] ?? v) : v;
  }

  if (field === 'status' || field === 'kind' || field === 'source' || field === 'scope'
      || field === 'alias_type' || field === 'combination') {
    return prettify(v);
  }

  const stamp = ISO_STAMP.exec(v);
  if (stamp) {
    return `${dateText(Number(stamp[1]), Number(stamp[2]), Number(stamp[3]))}, `
      + clockText(Number(stamp[4]), Number(stamp[5]));
  }

  const date = ISO_DATE.exec(v);
  if (date) return dateText(Number(date[1]), Number(date[2]), Number(date[3]));

  if (/^\d{2}:\d{2}(:\d{2})?$/.test(v)) {
    const [h, m] = v.split(':').map(Number);
    return clockText(h, m);
  }

  return v;
}

/* -------------------------------------------------------------------- when
 * "9/7/2026, 4:07:59 PM" is a machine's answer to "when". A person reading a
 * log of today's changes wants "Today, 4:07 PM" and only needs the year when
 * it is not this one.
 *
 * `now` is a parameter rather than a call to `new Date()` so this is
 * testable, and so a screen can hold one clock for a whole render instead of
 * asking the OS once per row.
 */
export function whenText(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;

  const time = clockText(at.getHours(), at.getMinutes());
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  if (sameDay(at, now)) return `Today, ${time}`;

  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  if (sameDay(at, yesterday)) return `Yesterday, ${time}`;

  const day = `${at.getDate()} ${MONTH[at.getMonth()]}`;
  return at.getFullYear() === now.getFullYear()
    ? `${day}, ${time}`
    : `${day} ${at.getFullYear()}, ${time}`;
}

/**
 * The same moment, said in full: "7 Sep 2026, 3:11 PM".
 *
 * The export uses this rather than `whenText`, because a spreadsheet outlives
 * the day it was made and a column reading "Today" in a file opened next week
 * is worse than the machine format it replaced.
 */
export function stampText(iso: string): string {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return iso;
  return `${at.getDate()} ${MONTH[at.getMonth()]} ${at.getFullYear()}, `
    + clockText(at.getHours(), at.getMinutes());
}

/* --------------------------------------------------------------- who did it
 * The requester's words: "even if its modified by staff". The name alone
 * does not answer that — a staff member and the owner are both just names —
 * so the role travels beside it. `system` is the app acting on its own; it
 * is not a person and must not read like one.
 */
export function actorRole(kind: string | null | undefined): string | null {
  switch (kind) {
    case 'super_admin': return 'Owner';
    case 'staff':       return 'Staff';
    case 'system':      return 'Automatic';
    case 'provider':    return 'Email provider';
    case 'anon':        return null;
    default:            return null;
  }
}

/* ------------------------------------------- what a CREATION is worth saying
 * A record being created has no previous values, so the trigger reports every
 * column it was born with. Printed in full, "Member added" became six lines --
 * Name, Member code, Status, Joined on, Notes, Added by -- of which one is the
 * answer to "who was added". The requester asked for the opposite: "member
 * added show only name of member and email thats it".
 *
 * So a creation prints the fields that IDENTIFY the thing, and says how many
 * it left out. An UPDATE is untouched: there the changed fields ARE the news,
 * and dropping one would hide the change the log exists to report.
 *
 * A member's email is not on the member. It lives in member_emails (0006,
 * C-73: several addresses, exactly one primary), so adding a member writes TWO
 * entries. They stay two entries -- folding them into one would invent a
 * record the database never wrote -- but each is now one line, and the email
 * entry names the member it belongs to, so the pair reads as the requester's
 * "name and email" without either row claiming to be the other.
 */
const CREATION_ESSENTIALS: Record<string, readonly string[]> = {
  member: ['full_name'],
  member_email: ['member_id', 'email'],
  member_alias: ['member_id', 'alias_display'],
  member_enrollment: ['member_id', 'offering_id'],
  member_schedule: ['member_id', 'weekdays'],
  course: ['name'],
  offering: ['course_id', 'branch_id'],
  offering_schedule: ['offering_id', 'weekdays'],
  session: ['occurred_on'],
  attendance: ['member_id', 'present'],
  holiday: ['from_date', 'to_date'],
  branch: ['name'],
  app_user: ['name', 'role_label'],
  email_template: ['title'],
  course_communication: ['course_id', 'subject'],
  follow_up_config: ['weekly_threshold', 'consecutive_threshold'],
  course_follow_up_config: ['course_id', 'weekly_threshold'],
};

/**
 * The entity a CREATION created, or null when the action is not a creation.
 * Split from the right for the same reason actionTitle does it: the entity
 * itself can contain a dot (`auth.mobile_changed.insert`).
 */
export function creationEntity(action: string): string | null {
  const cut = action.lastIndexOf('.');
  if (cut <= 0) return null;
  return action.slice(cut + 1) === 'insert' ? action.slice(0, cut) : null;
}

/* ------------------------------------------------- what a REMOVAL is about
 *
 * THE ONE CASE WHERE THE ROW CANNOT NAME ITSELF.
 * Everywhere else, an entry's subject is found by looking `entity_id` up in
 * the table it points at. The `*.hard_deleted` family cannot work that way and
 * not by accident: `purge_member` (0051), `purge_course` (0047) and the
 * one-off purges in 0053-0055 DELETE that row, in the same transaction that
 * writes the entry. The lookup misses by design.
 *
 * Each of those functions knew it, and each recorded the name in `metadata`
 * before deleting — under whichever key made sense to it. Nothing read them.
 * So on 08-Sep-2026 the log's 46 most recent entries were 46 members destroyed
 * for good, and not one of them said who.
 *
 * The keys are checked in the order a subject is most specifically named:
 * `name` is the thing itself; `member_name` is 0053's address entry, which is
 * about an address but belongs to a person, and every other member_email entry
 * on this screen is headed by her name; `email` and `file_name` are the last
 * resort for a row that names no person at all.
 */
const SUBJECT_KEYS = ['name', 'member_name', 'email', 'file_name'] as const;

export function subjectFromMeta(meta: Record<string, unknown> | undefined): string | null {
  for (const key of SUBJECT_KEYS) {
    const raw = meta?.[key];
    if (typeof raw === 'string' && raw.trim() !== '') return raw.trim();
  }
  return null;
}

/** True for the entries whose subject row is gone by the time anybody reads
 *  them. Named by suffix rather than listed, so a future purge that follows
 *  the same convention is covered the day it is written. */
export function isRemoval(action: string): boolean {
  return action.endsWith('.hard_deleted');
}

/** The column a removal's identifying value belongs under. `member_email`
 *  removed an ADDRESS; the rest removed the thing their noun names. */
function removalFieldLabel(action: string, meta: Record<string, unknown> | undefined): string {
  if (action === 'member_email.hard_deleted') return 'Member';
  if (action === 'member_import_run.hard_deleted') return 'File';
  return typeof meta?.name === 'string' ? 'Name' : 'Record';
}

/**
 * What went with it, from the counts the deletion itself recorded.
 *
 * Every one of these functions counted the damage before doing it — 0051's
 * header states in as many words that "the sessions she attended now count one
 * fewer person present" — and put the numbers in metadata beside the name. The
 * screen printed "No field values recorded": a row saying a person was
 * destroyed and declining to say what went with her, on the one screen whose
 * promise is that nothing is hidden.
 *
 * Only NON-ZERO counts are named. "0 sent emails" is not news, and four zeroes
 * bury the one number that is.
 */
const REMOVAL_COUNTS: Record<string, readonly [key: string, one: string, many: string][]> = {
  'member.hard_deleted': [
    ['attendance_records', 'attendance record', 'attendance records'],
    ['enrolments', 'enrolment', 'enrolments'],
    ['emails_sent', 'sent email', 'sent emails'],
  ],
  'course.hard_deleted': [
    ['sessions', 'session', 'sessions'],
    ['attendance_records', 'attendance record', 'attendance records'],
    ['imports', 'upload', 'uploads'],
  ],
  'branch.hard_deleted': [
    ['offerings', 'offering', 'offerings'],
    ['holidays', 'holiday', 'holidays'],
  ],
  'member_import_run.hard_deleted': [
    ['total_rows', 'row', 'rows'],
    ['inserted_count', 'member it added', 'members it added'],
  ],
};

function count(meta: Record<string, unknown> | undefined, key: string): number | null {
  const raw = meta?.[key];
  return typeof raw === 'number' && Number.isInteger(raw) && raw >= 0 ? raw : null;
}

function removalDetail(action: string, meta: Record<string, unknown> | undefined): string | null {
  if (!isRemoval(action)) return null;

  const named: string[] = [];
  for (const [key, one, many] of REMOVAL_COUNTS[action] ?? []) {
    const n = count(meta, key);
    if (n !== null && n > 0) named.push(`${n} ${n === 1 ? one : many}`);
  }

  const parts: string[] = [];
  parts.push(named.length
    ? `Removed with it: ${named.join(', ')}.`
    : 'Nothing else was attached to it.');

  // The consequence 0051 asks the confirmation to state, restated where the
  // act is read rather than only where it was approved: those days' figures
  // are not what they were.
  const touched = count(meta, 'sessions_touched');
  if (touched !== null && touched > 0) {
    parts.push(`${touched} ${touched === 1 ? "session's" : "sessions'"} figures changed.`);
  }

  // WHO DECIDED. A purge run by a migration is attributed to no app user, so
  // without this the log shows a whole register destroyed by nobody in
  // particular. It is the only account of the decision that exists.
  const note = meta?.note;
  if (typeof note === 'string' && note.trim() !== '') parts.push(note.trim());

  return parts.join(' ');
}

/* ---------------------------------------------------------------- the whole
 * One recorded entry, entirely in words. This is what the screen renders;
 * nothing downstream of here reads a code.
 */
export type PlainChange = {
  label: string;
  /** the column it came from, kept so a creation can be filtered by it */
  field: string;
  /** what it was. null when there was nothing there before. */
  from: string | null;
  /** what it is now. null when it was cleared. */
  to: string | null;
};

export type PlainEntry = {
  id: string;
  /**
   * The raw action code. Nothing RENDERS it -- the whole point of this
   * module is that no code reaches the screen -- but the grouping in
   * auditGroups.ts has to recognise a bulk import by its action, and doing
   * that on the raw rows would mean translating every entry twice.
   */
  action: string;
  /** `audit_logs.metadata`, as recorded. A bulk import puts the file name
   *  and its counts here; almost nothing else sets it. */
  meta?: Record<string, unknown>;
  title: string;
  /** who or what it was about, when the record names one */
  subject: string | null;
  /** the branch the change traces to, or null when it belongs to no one branch */
  branch: string | null;
  category: AuditCategory;
  icon: string;
  who: string;
  role: string | null;
  when: string;
  /** ISO, kept so the row can be searched and sorted on the real value */
  at: string;
  changes: PlainChange[];
  /**
   * Fields the entry RECORDED and this row does not print -- always 0 on an
   * update, and on a creation the columns that are not identifying. Shown as
   * a line under the values, because a log that quietly summarises is a log
   * that has stopped being complete, and this screen promises it is.
   */
  hiddenCount: number;
  /**
   * True when this entry removed its own subject for good, so the row's `to`
   * of null means "no longer on record" rather than "cleared". Two different
   * facts that the same null would otherwise render identically.
   */
  removal: boolean;
  /**
   * What else the act took with it, in one sentence, from the counts the
   * writer recorded. null on everything that is not a removal.
   */
  detail: string | null;
  /** everything above, lower-cased, for the search box to match on */
  haystack: string;
};

export function toPlain(
  entry: {
    id: string; action: string; entity: string; subject: string | null;
    branch?: string | null;
    who: string; whoKind?: string | null; when: string;
    changes: { field: string; old: string | null; new: string | null }[];
    meta?: Record<string, unknown>;
  },
  now: Date = new Date(),
): PlainEntry {
  const title = actionTitle(entry.action, entry.entity);
  const category = categoryOf(entry.action, entry.entity);
  const role = actorRole(entry.whoKind);

  /* The subject, and the ONE case where the log has to answer from its own
   * record: a removal's row is gone, so `entry.subject` arrives null and the
   * name is in metadata. A FALLBACK, in that order — a subject the log did
   * resolve is the live truth and metadata must never override it. */
  const subject = entry.subject ?? subjectFromMeta(entry.meta);
  const removal = isRemoval(entry.action);
  const detail = removalDetail(entry.action, entry.meta);

  const changes: PlainChange[] = [];
  for (const c of entry.changes) {
    const from = valueText(c.field, c.old);
    const to = valueText(c.field, c.new);
    // A field that was empty and is still empty says nothing. It cannot
    // normally happen (the trigger only records a real difference) but a
    // hand-written entry can carry one, and a blank line reads as a defect.
    if (from === null && to === null) continue;
    changes.push({ label: fieldLabel(c.field), from, to, field: c.field });
  }

  /* A creation keeps only its identifying fields (see CREATION_ESSENTIALS).
   * Two guards, because a summary that empties a row is worse than a long
   * one: an entity with no list keeps everything, and a list that matches
   * nothing recorded keeps everything too. */
  const essentials = CREATION_ESSENTIALS[creationEntity(entry.action) ?? ""];
  const kept = essentials
    ? changes.filter(c => essentials.includes(c.field))
    : changes;
  let shown = kept.length > 0 ? kept : changes;
  const hiddenCount = changes.length - shown.length;

  /* A removal recorded no CHANGES -- it writes `'[]'::jsonb` and then deletes
   * the row -- so the two value columns printed dashes on the one entry where
   * the previous value is the whole point of the row. The line below is not an
   * invention: `from` is the name the deletion recorded, and `to` is null
   * because there is no new value. The screen says "no longer on record" for
   * that null, which is what it means here. */
  if (removal && shown.length === 0 && subject !== null) {
    shown = [{
      label: removalFieldLabel(entry.action, entry.meta),
      field: 'full_name', from: subject, to: null,
    }];
  }

  const when = whenText(entry.when, now);
  const haystack = [
    title, subject ?? '', entry.branch ?? '', entry.who, role ?? '', when,
    // The removal's own account of itself — the counts and, crucially, the
    // note saying who ordered a purge. Searchable even where the row shows it
    // trimmed, so "why is the register empty" has somewhere to look.
    detail ?? '',
    // The HAYSTACK stays the whole record, not the summary. The row prints
    // what identifies the change; the search still reaches everything the
    // entry actually holds, which is the difference between summarising a
    // display and shortening the record.
    ...changes.flatMap(c => [c.label, c.from ?? '', c.to ?? '']),
  ].join(' ').toLowerCase();

  return {
    id: entry.id, action: entry.action, meta: entry.meta,
    title, subject, branch: entry.branch ?? null, category,
    icon: categoryIcon(category),
    who: entry.who, role, when, at: entry.when, changes: shown, hiddenCount,
    removal, detail, haystack,
  };
}

/**
 * The list the screen shows: changes only, newest first, narrowed by the chip
 * and the search box.
 *
 * Sign-in traffic is dropped HERE rather than in the query, and that is
 * deliberate: nothing is deleted, nothing stops being recorded, and the one
 * place that decides what is listed is a function with tests on it.
 */
export function visibleEntries(
  entries: {
    id: string; action: string; entity: string; subject: string | null;
    branch?: string | null;
    who: string; whoKind?: string | null; when: string;
    changes: { field: string; old: string | null; new: string | null }[];
    meta?: Record<string, unknown>;
  }[],
  opts: { category: AuditCategory | 'all'; query: string; branch?: string | null; now?: Date },
): PlainEntry[] {
  const now = opts.now ?? new Date();
  const q = opts.query.trim().toLowerCase();
  const branch = opts.branch ?? null;
  return entries
    .filter(e => !isSessionAction(e.action))
    .map(e => toPlain(e, now))
    .filter(e => opts.category === 'all' || e.category === opts.category)
    // A branch narrows to what can be TRACED to it. An entry that belongs to
    // no single branch -- a setting, a message template, an account -- is not
    // "at every branch", so it is not shown under one; the screen says this
    // out loud rather than leaving somebody to notice the gap.
    .filter(e => branch === null || e.branch === branch)
    .filter(e => q === '' || e.haystack.includes(q));
}
