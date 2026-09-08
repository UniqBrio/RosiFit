/**
 * ONE MEMBER'S WEEK, from her own sessions.
 *
 * WHAT WAS THERE BEFORE. The member pop-up's *Her sessions this week* list was
 * `sessionsFor(m)` (mock.ts), which returns the SAME six fixture rows for every
 * member on every course in every week: Mon 18 Aug, an Onam holiday, a coach
 * who was unwell, three Prenatal Flow absences. A Gentle Yoga member opened in
 * September was shown August sessions of a course she is not on, under her own
 * live figures. Nothing a reader counted in that list could ever add up to the
 * numbers above it -- which is what made *Missed streak 6* unreadable rather
 * than merely unexplained.
 *
 * This module is the whole of the decision about what each row SAYS. It is
 * pure and takes rows as an argument, for the reason dayAttendance.ts records:
 * a derivation that imports the fixtures cannot be tested against anything
 * else, and a screen that resolves a member against one shows the wrong person.
 *
 * WHAT COUNTS AND WHAT DOES NOT is unchanged and is still stated on every row
 * (C-92): a holiday and a cancellation are LISTED, and each says why it does
 * not count. A blank row would read as a miss, which is the whole reason they
 * are drawn at all. Nothing here computes a total -- the figures above the list
 * come from `member_period_metrics`, and a second count derived from these rows
 * is exactly how a list and the strip over it start disagreeing (guardrail 1).
 */
import type { AttendanceStatus, MemberSession } from './mock';
import { shortDate } from './period';

/** One session of an offering she is enrolled at, with her record for it. */
export type MemberWeekSession = {
  /** sessions.session_date, ISO */
  iso: string;
  /** sessions.start_time, 'HH:MM' or 'HH:MM:SS', or null when none is set */
  time: string | null;
  /** sessions.status */
  sessionStatus: 'scheduled' | 'completed' | 'cancelled' | 'holiday';
  course: string;
  branch: string;
  /** the holiday's name, when the session was marked for one */
  holidayName: string | null;
  /** sessions.cancellation_reason */
  cancellationReason: string | null;
  /** HER attendance record for it, when one exists */
  record: { status: AttendanceStatus; expected: boolean } | null;
};

/** Nothing scheduled is its own state, not an empty list of misses. */
export const NO_SESSIONS_ROW: MemberSession = {
  status: 'none', date: 'No sessions', time: '—',
  detail: 'She had none scheduled this week',
};

/**
 * '18:00:00' -> '6:00 pm'. The column may hold either 'HH:MM' or 'HH:MM:SS',
 * the way clockTime in reportSheets.ts already allows for.
 *
 * Written here rather than reached for from a locale: `toLocaleTimeString`
 * writes a different string per device, and the canvas writes one.
 */
export function clockLabel(value: string | null): string {
  const [h, m] = (value ?? '').split(':');
  const hour = Number(h);
  if (!Number.isInteger(hour) || hour < 0 || hour > 23 || !/^\d{2}$/.test(m ?? '')) return '—';
  const suffix = hour < 12 ? 'am' : 'pm';
  // 00:30 is 12:30 am and 12:30 is 12:30 pm -- the two the modulo alone gets
  // wrong, and the two auditPlain's spec already pins for the same column.
  const twelve = hour % 12 === 0 ? 12 : hour % 12;
  return `${twelve}:${m} ${suffix}`;
}

/**
 * What one session reads as on her card.
 *
 * The order of the questions is the order of the facts. Whether the class
 * happened at all comes first: a holiday is a holiday whether or not a stale
 * attendance row survived beside it, and reading her record first would print
 * "Absent" over a day the academy closed.
 */
function readSession(s: MemberWeekSession, todayIso: string): MemberSession {
  const date = shortDate(s.iso);
  const where = s.branch && s.branch !== '—' ? `${s.course} · ${s.branch}` : s.course;

  if (s.sessionStatus === 'holiday') {
    return {
      status: 'holiday', date, time: '—',
      detail: `${s.holidayName ?? 'Holiday'} — does not count`,
    };
  }
  if (s.sessionStatus === 'cancelled') {
    return {
      status: 'cancelled', date, time: '—',
      detail: `${s.cancellationReason ?? 'Cancelled'} — does not count`,
    };
  }

  const time = clockLabel(s.time);

  if (s.record) {
    // 'extra' is what the database stores when she turned up on a day nobody
    // expected her (0008). It is not a miss and it is not an ordinary present,
    // and the row says which -- the run above the list skips it either way,
    // because current_streak_for counts expected sessions only.
    if (s.record.status === 'extra') {
      return { status: 'extra', date, time, detail: `${where} — she was not expected` };
    }
    if (s.record.status === 'absent') {
      return { status: 'absent', date, time, detail: where };
    }
    return { status: 'present', date, time, detail: where };
  }

  // No record of her own. A session that has COMPLETED has its expected set
  // frozen (session_expectations), so her having no row in it is a fact and
  // not a gap: she was not expected, and it counts for nobody.
  if (s.sessionStatus === 'completed') {
    return { status: 'none', date, time, detail: `${where} — she was not expected` };
  }

  // Still 'scheduled'. Before today that means the file has not arrived;
  // from today on it simply has not run yet. Saying "awaiting upload" over a
  // class that is still to happen is how a future day reads as a failure.
  if (s.iso <= todayIso) {
    return {
      status: 'awaiting', date, time,
      detail: 'File not uploaded — counts for nobody',
    };
  }
  return { status: 'scheduled', date, time, detail: where };
}

/**
 * Her week, oldest first -- the order the strip above the list runs in, so the
 * eye travels the same way twice.
 */
export function memberWeek(sessions: MemberWeekSession[], todayIso: string): MemberSession[] {
  if (sessions.length === 0) return [NO_SESSIONS_ROW];
  return [...sessions]
    .sort((a, b) => a.iso.localeCompare(b.iso))
    .map(s => readSession(s, todayIso));
}
