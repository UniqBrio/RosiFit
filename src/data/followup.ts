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

export function ruleHits(m: Member, r: FollowUpRule) {
  return {
    // a member with nothing scheduled cannot have "missed" anything
    weekly: r.weekly_enabled && m.expected >= 1 && m.missed >= r.weekly_threshold,
    consecutive: r.consecutive_enabled && m.streak >= r.consecutive_threshold,
  };
}

export function isEligible(m: Member, r: FollowUpRule): boolean {
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
 * The three numbers the attendance donut draws, counted from the SAME member
 * list the report reads.
 *
 * Here rather than inline in the dashboard because that is the whole promise
 * the chart's own caption makes -- "one source, so the chart and the report
 * cannot disagree" (C-87) -- and a promise computed inside a render body is
 * one nobody can test.
 *
 * `notExpected` is the segment that stops a reduced schedule reading as poor
 * attendance: a member expected at 4 sessions in a 6-session week has 2 not
 * expected, not 2 missed. Drop the segment and she is indistinguishable from
 * a 6-day member who skipped twice.
 */
export const FULL_WEEK_SESSIONS = 6;

export function distribution(members: Member[], perWeek = FULL_WEEK_SESSIONS):
  { attended: number; missed: number; notExpected: number } {
  return {
    attended: members.reduce((n, m) => n + m.attended, 0),
    // Attending MORE than expected is an extra, not a negative miss -- a
    // member who turned up to a session she was not due at would otherwise
    // subtract from somebody else's absence.
    missed: members.reduce((n, m) => n + Math.max(m.expected - m.attended, 0), 0),
    notExpected: members.reduce((n, m) => n + Math.max(perWeek - m.expected, 0), 0),
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
 *  course-specific rule (C-60) override the global default per member. */
export function flagged(
  members: Member[], globalRule: FollowUpRule,
  rulesByCourseName: Record<string, FollowUpRule> = {},
): Member[] {
  return members.filter(m => isEligible(m, rulesByCourseName[m.course] ?? globalRule));
}
