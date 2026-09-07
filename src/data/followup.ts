/**
 * The follow-up derivation — the ONE implementation, used identically by the
 * fixtures and by live Supabase data.
 *
 * This is the property that must survive the swap to live data: the follow-up
 * set is DERIVED from the member list plus the saved rule, never stored as a
 * second list. Two lists, populated by two queries, are exactly how the
 * dashboard count, the weekly list and the send flow drift apart. The
 * database has its own equivalent in follow_up_candidates() (0009, covered by
 * supabase/tests/06_followup.sql) and the two agree by construction because
 * they evaluate the same conditions over the same figures — but the app
 * reads members once and derives from that, so what a screen shows and what
 * it counts cannot disagree.
 */
import type { Member, FollowUpRule, FollowUpCandidate } from './mock';
import { isActiveOn } from './inactiveFrom';
import { iso } from './period';

/**
 * The follow-up threshold's bounds: 1..7.
 *
 * The count was hard-coded 4 in save_course (0022), in the values list,
 * twice. A course running once or twice a week could therefore never reach
 * it: the trigger read as switched ON in the form and was unreachable by
 * arithmetic, so the course had no follow-up at all. 0030 makes the count the
 * academy's, and this is the range it may take.
 *
 * SEVEN because a week has seven days -- a weekly threshold above that can
 * never fire, which is the same defect as zero the other way up. The same
 * bound is applied to the consecutive count deliberately: a run longer than a
 * week is a member who has left, and the academy asked for one control, not
 * two with different limits.
 *
 * Here rather than in the form because the form imports react-native, which
 * cannot be transformed under node -- so anything a spec needs to reach lives
 * in this layer. It is also the layer that already owns what a rule MEANS.
 */
export const MIN_THRESHOLD = 1;
export const MAX_THRESHOLD = 7;

/** Pulls any number into range. Used on the way in from the database too:
 *  0009 put no CHECK on these columns, so a row written before 0030 -- or by
 *  hand -- can say anything, and the stepper must not start outside itself. */
export function clampThreshold(n: number): number {
  if (!Number.isFinite(n)) return 4;
  return Math.min(MAX_THRESHOLD, Math.max(MIN_THRESHOLD, Math.round(n)));
}

export function ruleHits(m: Member, r: FollowUpRule) {
  return {
    // a member with nothing scheduled cannot have "missed" anything
    weekly: r.weekly_enabled && m.expected >= 1 && m.missed >= r.weekly_threshold,
    consecutive: r.consecutive_enabled && m.streak >= r.consecutive_threshold,
  };
}

/**
 * A member who is not ACTIVE is never followed up, whatever her figures say.
 *
 * This is not a new condition. `public.follow_up_candidates()` (0009) has
 * carried `m.status = 'active'` in its WHERE clause since it was written, so
 * until now the app's derivation and the database's disagreed the moment
 * anybody's status left 'active' -- the app would list her, count her on the
 * dashboard and offer to mail her, and the server-side candidate query would
 * not. Reading the same column here is what closes that, and it is why
 * marking somebody inactive MEANS something rather than colouring a pill.
 *
 * Checked before the rule rather than folded into ruleHits, because ruleHits
 * answers "did a condition fire" and the answer to that is unchanged by her
 * being off the register. She is excluded; her figures are not rewritten.
 *
 * ON A DAY, since 0044. Her status carries a date now (`inactive_from`), so
 * "is she followable" is a question about a day and this one answers it for
 * TODAY by default -- which is the day a follow-up would actually leave.
 * `follow_up_candidates()` judges on `current_date` for the same reason, so
 * the two ends go on agreeing: a member whose date is still ahead of her is
 * listed and written to, and stops being listed the moment it arrives, with
 * nobody having to press anything on the day.
 *
 * The default is read at CALL time, not at module load -- a list left open
 * across midnight must not go on answering for yesterday.
 */
export const isFollowable = (m: Member, onIso: string = iso(new Date())): boolean =>
  isActiveOn(m, onIso);

export function isEligible(m: Member, r: FollowUpRule, onIso: string = iso(new Date())): boolean {
  if (!isFollowable(m, onIso)) return false;
  const h = ruleHits(m, r);
  return r.combination === 'AND' && r.weekly_enabled && r.consecutive_enabled
    ? h.weekly && h.consecutive
    : h.weekly || h.consecutive;
}

/** Names the CONDITION that fired, not the rule -- so the row explains itself. */
export function reasonFor(m: Member, r: FollowUpRule): string {
  const h = ruleHits(m, r);
  if (h.weekly && h.consecutive) {
    return `Missed ${m.missed} of ${m.expected} this week and ${m.streak} consecutive`;
  }
  if (h.weekly) return `Missed ${m.missed} of ${m.expected} sessions this week`;
  if (h.consecutive) return `${m.streak} consecutive missed sessions`;
  return 'Meets the follow-up rule';
}

export const attendancePct = (m: Member): number | null =>
  m.expected === 0 ? null : Math.round((m.attended / m.expected) * 100);

/**
 * Who a follow-up actually reaches, and who it cannot.
 *
 * The send draft has no per-member selection: the recipients ARE the flagged
 * set. So this split is the whole decision the screen presents, and C-76 is
 * the rule it enforces -- a member with no address is EXCLUDED and NAMED,
 * never quietly dropped from a list that then reads as complete.
 *
 * Both halves come from ONE input, so the two counts cannot be a query apart
 * and the draft cannot claim to reach somebody it will skip.
 */
export function recipientSplit(flagged: Member[]):
  { recipients: Member[]; excluded: Member[] } {
  return {
    recipients: flagged.filter(isReachable),
    excluded: flagged.filter(m => !isReachable(m)),
  };
}

/**
 * Whether a follow-up can actually LEAVE for her.
 *
 * Written out rather than imported from mock's `hasEmail`: mock imports
 * isEligible and attendancePct FROM this file, so a value import back would
 * close a require cycle and mock's module body -- which calls both at load --
 * would run before they exist. Type imports are erased and are fine.
 *
 * Exported because it is not the same question as `hasEmail`, and anything
 * claiming on screen that an email is or is not going has to ask THIS one.
 * `hasEmail` is `primaryEmail(m) !== ''` -- her PRIMARY address, untrimmed --
 * so a member whose primary is blank but who holds a second address answers
 * no to it and yes here, and the send would reach somebody a label had just
 * said was unreachable. This is the predicate the send itself splits on, so a
 * screen that uses it cannot disagree with what the draft does.
 */
export const isReachable = (m: Member): boolean =>
  m.emails.some(e => e.address.trim() !== '');

/**
 * The two numbers the attendance ring draws, counted from the SAME member
 * list the report reads.
 *
 * Here rather than inline in the dashboard because that is the whole promise
 * the chart's own caption makes -- "one source, so the chart and the report
 * cannot disagree" (C-87) -- and a promise computed inside a render body is
 * one nobody can test.
 *
 * WHY THERE IS NO "NOT EXPECTED" SEGMENT ANY MORE
 * There used to be a third one, sized `perWeek - expected`, and it was there
 * to stop a member on a reduced schedule reading as poor attendance. It only
 * had that job because the ring's denominator was the whole six-session week:
 * against that, a member due at four looked two short before she had missed
 * anything.
 *
 * The denominator is now what was EXPECTED of the people counted -- a member
 * due at four who came four times is 100%, not 67% -- so the segment protects
 * nothing and costs the reader a category that is not an attendance outcome.
 * Present and absent are what a session can be; "not expected" is the absence
 * of a session, and it belongs to the schedule, not to the chart
 * (requests/2026-09-06-overview-filters-and-sections.md).
 */
export function distribution(members: Member[]):
  { attended: number; missed: number } {
  return {
    // Attending MORE than expected is an extra, not a credit against the
    // academy's absences -- a member who turned up to a session she was not
    // due at would otherwise inflate the attended share past 100%.
    attended: members.reduce((n, m) => n + Math.min(m.attended, m.expected), 0),
    missed: members.reduce((n, m) => n + Math.max(m.expected - m.attended, 0), 0),
  };
}

/** The plain-language sentence is GENERATED from the values (C-67), never
 *  hardcoded, so it cannot drift away from what the rule actually does. */
export function ruleSentence(r: FollowUpRule, courseName: string): string {
  const parts: string[] = [];
  if (r.weekly_enabled) parts.push(`miss ${r.weekly_threshold} or more sessions in the week`);
  if (r.consecutive_enabled) parts.push(`miss ${r.consecutive_threshold} consecutive sessions`);
  if (parts.length === 0) return 'No condition is switched on, so nobody would be listed.';
  const joined = parts.length === 1
    ? parts[0]
    : parts.join(r.combination === 'OR' ? ' OR ' : ' AND ');
  const caveat = parts.length === 1 && r.combination === 'AND'
    ? ' (only one condition is on, so AND behaves as that condition alone)'
    : '';
  return `Members in ${courseName} will be listed for follow-up when they ${joined}.${caveat}`;
}

/** A member in the shape the template renderer and the send flow read, with
 *  her real engine figures — never a placeholder (C-69). */
export function toCandidate(m: Member, r: FollowUpRule): FollowUpCandidate {
  return {
    member_id: m.id, full_name: m.name, course_name: m.course, branch_name: m.branch,
    expected: m.expected, attended: m.attended, missed: m.missed,
    attendance_pct: attendancePct(m), current_streak: m.streak,
    config_source: r.source,
    reason: reasonFor(m, r),
    has_email: m.emails.length > 0,
  };
}

/** The flagged set for any member list and any rule. `rulesByCourse` lets a
 *  course-specific rule (C-60) override the global default per member.
 *
 *  `onIso` is the day the STATUS is judged on -- today, unless a caller is
 *  asking about another one. The figures are already about whatever period
 *  produced them; this is the one thing that was being answered for today
 *  whether or not the question was about today (0044). */
export function flagged(
  members: Member[], globalRule: FollowUpRule,
  rulesByCourseName: Record<string, FollowUpRule> = {},
  onIso: string = iso(new Date()),
): Member[] {
  return members.filter(m => isEligible(m, rulesByCourseName[m.course] ?? globalRule, onIso));
}
