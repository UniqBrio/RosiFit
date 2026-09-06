/**
 * Which days a month's grid shows.
 *
 * The calendar used to draw the days of ONE month and pad the space before
 * the 1st with blank cells, so the grid was five rows in one month and six
 * in the next: the Clear and Today buttons under it moved by a whole row
 * between September and November, out from under the finger already going
 * to them. It now draws six whole weeks every time, and the days either
 * side belong to the neighbouring months rather than to nothing.
 *
 * Pure arithmetic, in its own module beside `datePanel.ts`, for the same
 * reason that one exists: a grid that starts on the wrong day is wrong by a
 * single integer, it is wrong identically every month so nothing looks odd,
 * and the only place it shows is a person choosing the wrong date.
 *
 * MONDAY-START, deliberately. The requester pointed at a Sunday-first
 * calendar and was asked about it directly; Monday stays, because this same
 * grid picks a custom range beside the This week / Last week chips, and a
 * Sunday-first row invites a Sun-Sat span that is not the week `period.ts`
 * counts (`weekStart`, follow_up_config.week_start_day = 1).
 */
import { iso } from '../data/period';

/** Six whole weeks. The grid never has a different number of rows. */
export const GRID_DAYS = 42;

/** The `yyyy-mm` that every ISO day of this month starts with. */
export function monthKey(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

/**
 * The 42 ISO days a Monday-start grid draws for `month` (0-11), beginning
 * at the Monday on or before the 1st. Rollover across a year end is the
 * `Date` constructor's own, which is why the days are built by offset from
 * the 1st rather than by clamping a day number.
 */
export function monthCells(year: number, month: number): string[] {
  const lead = (new Date(year, month, 1).getDay() + 6) % 7;
  return Array.from({ length: GRID_DAYS }, (_, i) =>
    iso(new Date(year, month, 1 - lead + i)));
}

/** True when a day the grid draws belongs to a neighbouring month. */
export function isOutside(value: string, year: number, month: number): boolean {
  return value.slice(0, 7) !== monthKey(year, month);
}
