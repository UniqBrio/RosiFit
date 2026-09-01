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

export const CANDIDATES: FollowUpCandidate[] = [
  { member_id: '1', full_name: 'Divya Ramesh', course_name: 'Prenatal Fitness', branch_name: 'Coimbatore',
    expected: 6, attended: 3, missed: 3, attendance_pct: 50.0, current_streak: 1,
    config_source: 'course', reason: 'Missed 3 of 6 sessions this week', has_email: true },
  { member_id: '2', full_name: 'Meenakshi Iyer', course_name: 'Prenatal Yoga', branch_name: 'Salem',
    expected: 4, attended: 0, missed: 4, attendance_pct: 0.0, current_streak: 4,
    config_source: 'course', reason: '4 consecutive missed sessions', has_email: true },
  { member_id: '3', full_name: 'Meena Raj', course_name: 'Prenatal Yoga', branch_name: 'Salem',
    expected: 4, attended: 1, missed: 3, attendance_pct: 25.0, current_streak: 2,
    config_source: 'global', reason: 'Missed 3 of 4 sessions this week', has_email: false },
  { member_id: '4', full_name: 'Anitha Kumar', course_name: 'Postnatal Recovery', branch_name: 'Erode',
    expected: 3, attended: 0, missed: 3, attendance_pct: 0.0, current_streak: 3,
    config_source: 'global', reason: 'Missed 3 of 3 sessions this week', has_email: true },
];

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
  last_attended?: string; aliases?: string;
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
      course: 'Prenatal Fitness', branch: 'Coimbatore', last_attended: '21 Aug',
      aliases: '“Divya”, “Divya R”' }] },
  { row: 47, kind: 'possible', raw: 'Shazia', first_seen: '6:02 pm', minutes: 58,
    candidates: [{ member_id: '5', name: 'Shazia Farheen', code: 'RF-000118',
      course: 'Prenatal Fitness', branch: 'Coimbatore', last_attended: '28 Aug',
      aliases: '“Shazia F”, “Shazia Farheen”' }] },
  { row: 52, kind: 'ambiguous', raw: 'priya l', first_seen: '6:00 pm', minutes: 52,
    candidates: [
      { member_id: '7', name: 'Lakshmi Priya', code: 'RF-000131', course: 'Prenatal Flow', branch: 'Chennai' },
      { member_id: '8', name: 'Priya Lakshmi', code: 'RF-000149', course: 'Prenatal Flow', branch: 'Chennai' }] },
  { row: 88, kind: 'noEmail', raw: 'Meena Raj', first_seen: '6:05 pm', minutes: 52,
    candidates: [{ member_id: '3', name: 'Meena Raj', code: 'RF-000204',
      course: 'Prenatal Yoga', branch: 'Salem', last_attended: '26 Aug' }] },
  { row: 91, kind: 'unmatched', raw: 'kavi.s', first_seen: '6:11 pm', minutes: 9, candidates: [] },
];

export type Member = {
  id: string; code: string; name: string; course: string; branch: string;
  aliases: string[]; emails: { address: string; primary: boolean }[];
  expected: number; attended: number; missed: number; streak: number;
};

export const MEMBERS: Member[] = [
  { id: '1', code: 'RF-000102', name: 'Divya Ramesh', course: 'Prenatal Fitness', branch: 'Coimbatore',
    aliases: ['Divya', 'Divya R'], emails: [{ address: 'divya@example.com', primary: true }],
    expected: 6, attended: 3, missed: 3, streak: 1 },
  { id: '5', code: 'RF-000118', name: 'Shazia Farheen', course: 'Prenatal Fitness', branch: 'Coimbatore',
    aliases: ['Shazia', 'Shazia F'], emails: [
      { address: 'shazia@example.com', primary: true },
      { address: 'shazia.f@work.example.com', primary: false }],
    expected: 6, attended: 5, missed: 1, streak: 0 },
  { id: '3', code: 'RF-000204', name: 'Meena Raj', course: 'Prenatal Yoga', branch: 'Salem',
    aliases: ['Meena'], emails: [],
    expected: 4, attended: 1, missed: 3, streak: 2 },
  { id: '2', code: 'RF-000151', name: 'Meenakshi Iyer', course: 'Prenatal Yoga', branch: 'Salem',
    aliases: [], emails: [{ address: 'meenakshi@example.com', primary: true }],
    expected: 4, attended: 0, missed: 4, streak: 4 },
];

export const WEEK = { from: '17 Aug', to: '23 Aug 2026', label: '17–23 August 2026' };
export const BRANCHES = ['All branches', 'Coimbatore', 'Salem', 'Erode', 'Chennai'];
export const COURSES  = ['All courses', 'Prenatal Fitness', 'Prenatal Yoga', 'Postnatal Recovery', 'Prenatal Flow'];
export const SUPPORT_PHONE = '9994871158';
