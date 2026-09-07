/**
 * What one member's attendance chips say for ONE day.
 *
 * The course roster shows three chips per card -- Present · Absent · Yet to
 * mark -- for the day the week strip has selected. This module is the whole
 * of the decision: which chip is true, which of the other two may be tapped,
 * and the sentence explaining any that may not.
 *
 * It is pure and takes rows as an argument, for the reason RC-012 records:
 * a screen that resolves a member against an imported fixture shows the
 * wrong person, and a derivation that imports `mock.ts` cannot be tested
 * against anything else. It also never asks the network -- `useAttendance`
 * has already loaded the week the strip is showing.
 *
 * The three states are what the requester asked for; `extra` is a fourth
 * thing the DATABASE stores (she turned up when nobody expected her, 0008)
 * and it reads as Present here, because that is what happened. The
 * distinction is about expectation and it is carried by `expected`, which is
 * what decides whether Absent can be offered at all: `absent_must_be_expected`
 * refuses an absence on a day she was never expected, and a chip that offers
 * a write the database will reject is a chip that lies.
 */
import type { AttendanceRow, AttendanceStatus, Member } from './mock';

export type DayState = 'present' | 'absent' | 'unmarked';

export type DayAttendance = {
  /** which chip is filled */
  state: DayState;
  /** what is actually recorded, when anything is. 'extra' reads as present */
  stored: AttendanceStatus | null;
  /** was she expected that day, by the schedule in force for her */
  expected: boolean;
  canPresent: boolean;
  canAbsent: boolean;
  /** why a chip is unavailable, as a sentence. null when both may be tapped */
  reason: string | null;
};

/** ISO yyyy-mm-dd -> 1..7 with Monday = 1, matching offering_schedules.weekdays. */
export function isoWeekday(iso: string): number {
  const day = new Date(`${iso}T00:00:00`).getDay();
  return day === 0 ? 7 : day;
}

/**
 * What the database will STORE for the chip that was tapped.
 *
 * `set_attendance` (0035) decides this server-side and never takes the
 * caller's word for it. It is exported because the FIXTURE path has no
 * server to ask, and two answers to "is this present or extra" is exactly
 * how the offline mode and the live one start telling different stories.
 */
export function storedStatus(chosen: 'present' | 'absent', expected: boolean): AttendanceStatus {
  return chosen === 'present' && !expected ? 'extra' : chosen;
}

/** "Tuesday 1 September" -- how a day is named in a sentence, not on a chip. */
export function dayInWords(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString(undefined,
    { weekday: 'long', day: 'numeric', month: 'long' });
}

export function dayAttendance(input: {
  /** every attendance row loaded for the week on screen */
  rows: AttendanceRow[];
  member: Pick<Member, 'id' | 'name' | 'course' | 'course_id' | 'weekdays'>;
  /** the day the strip has selected, ISO */
  dayIso: string;
  /** the offerings of THIS course, already narrowed to the branches in scope */
  weekdays: number[];
  /** today, ISO, passed in so the caller owns the clock */
  todayIso: string;
}): DayAttendance {
  const { rows, member, dayIso, weekdays, todayIso } = input;

  // Her own row for that day. member_id and date identify it -- one active
  // enrolment (0006) means she cannot have two -- but where a stale row for
  // another course is in the loaded week, hers wins. Matched on the course's
  // ID: a row kept from a DELETED course carries that course's name, and a
  // new course of the same name would otherwise pick it up as its own.
  const mine = rows.filter(r => r.member_id === member.id && r.date === dayIso);
  const row = mine.find(r => r.course_id !== null && r.course_id === member.course_id)
    ?? mine[0] ?? null;

  // Expectation: the row is the server's own answer where one exists. Where
  // none does, her OWN days override the offering's, the way
  // expected_members_for_session resolves member_schedules over
  // offering_schedules.
  const schedule = member.weekdays ?? weekdays;
  const expected = row ? row.expected : schedule.includes(isoWeekday(dayIso));

  const state: DayState = row === null ? 'unmarked'
    : row.status === 'absent' ? 'absent'
    : 'present';

  // A class that has not happened has no attendance. The chips still SAY
  // where she stands -- unmarked -- they simply cannot be used to invent it.
  if (dayIso > todayIso) {
    return {
      state, stored: row?.status ?? null, expected,
      canPresent: false, canAbsent: false,
      reason: `${dayInWords(dayIso)} has not happened yet`,
    };
  }

  return {
    state, stored: row?.status ?? null, expected,
    canPresent: true,
    canAbsent: expected,
    reason: expected ? null
      : `${member.name} was not expected on ${dayInWords(dayIso)}. `
        + 'Mark her present and it is recorded as extra.',
  };
}
