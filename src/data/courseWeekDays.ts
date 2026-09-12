/**
 * The seven day statuses of a course's week, and the one rule the TypeScript
 * side of them has to keep.
 *
 * PURE, and in its own file for the reason RC-012 records: a derivation that
 * imports `repository.ts` drags react-native in behind it and cannot be run
 * under plain node at all, so it ends up "tested" by a spec that reads its
 * source instead of running it.
 *
 * WHAT THIS IS FOR. Migration 0067 computes the strip in Postgres — seven rows
 * per course per week, instead of every attendance record in the week for
 * every course counted on the phone. The counting is the database's; what is
 * left here is the mapping, and the mapping has exactly one job that matters:
 *
 *     A SHORT ANSWER IS A FAILED READ, NEVER A SMALL WEEK.
 *
 * The function generates its own dates with `generate_series(0, 6)`, so six
 * rows is not a week with six days in it — something went wrong. Accepting it
 * would hand the strip five days it knows about and two it does not, and the
 * two would render "Awaiting upload". That is RC-039 arriving through the fix
 * for RC-039, which is the mistake this whole change exists to stop making
 * twice (RC-041).
 */

/** Seven. The strip's own length, and what 0067 always returns. */
export const WEEK_DAYS = 7;

/** The shape 0067 returns, before any of it is trusted. */
export type CourseDayRow = {
  day: string;
  uploaded: boolean;
  present_count: number | null;
  absent_count: number | null;
  expected_count: number | null;
  runs: boolean;
};

/** One day of the course strip, as the database computed it. */
export type CourseDayStatus = {
  /** ISO yyyy-mm-dd */
  day: string;
  /** are there records for this day at all — NOT "is anybody present" */
  uploaded: boolean;
  present: number;
  absent: number;
  expected: number;
  /** does a file belong on this day: the course is timetabled on this weekday
   *  at the branches in scope, OR a live session was held on this date off
   *  the timetable (0070) -- an ad-hoc upload that was reset still awaits */
  runs: boolean;
};

/** Raised when the answer is not a week. Translated by the caller into the
 *  screen's one error convention, so a person sees a sentence and the console
 *  keeps the count. */
export class ShortWeekError extends Error {
  constructor(got: number) {
    super(`course_week_day_status returned ${got} rows, expected ${WEEK_DAYS}`);
    this.name = 'ShortWeekError';
  }
}

/**
 * Seven rows to seven cells, and nothing else.
 *
 * It INVENTS NOTHING. `uploaded` and `runs` are carried through exactly as
 * they arrived: deriving `uploaded` here from `present > 0` would be a second
 * derivation of a rule 0067 already holds, and it would be wrong on precisely
 * the day it matters — production's Tuesday, 42 present against 217 absent,
 * and any day where nobody attended at all. Uploaded is the EXISTENCE of
 * records.
 *
 * The counts are coerced because a cell renders them. `Number(undefined)` is
 * NaN, and "NaN" printed beside a date reads as a defect in the academy's
 * attendance rather than in this mapping.
 */
export function mapCourseWeekDays(rows: CourseDayRow[]): CourseDayStatus[] {
  if (rows.length !== WEEK_DAYS) throw new ShortWeekError(rows.length);
  return rows.map(r => ({
    day: r.day,
    uploaded: r.uploaded,
    present: Number(r.present_count ?? 0),
    absent: Number(r.absent_count ?? 0),
    expected: Number(r.expected_count ?? 0),
    runs: r.runs,
  }));
}
