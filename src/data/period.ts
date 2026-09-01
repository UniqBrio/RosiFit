/**
 * Periods, in the two shapes the app needs at once: ISO dates for the
 * queries and a human label for the screen. Every metric tile states its
 * period (C-84), so the label travels with the dates rather than being
 * rebuilt per screen — that is how two tiles end up claiming different
 * weeks for the same numbers.
 *
 * Weeks are Monday–Sunday, matching follow_up_config.week_start_day = 1.
 */
export type Period = { from: string; to: string; label: string };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function iso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function shiftDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

/** Monday of the week `date` falls in. */
export function weekStart(date: Date): Date {
  const dow = (date.getDay() + 6) % 7;          // 0 = Monday
  return shiftDays(date, -dow);
}

export function label(from: Date, to: Date): string {
  const sameMonth = from.getMonth() === to.getMonth() && from.getFullYear() === to.getFullYear();
  return sameMonth
    ? `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`
    : `${from.getDate()} ${MONTHS[from.getMonth()]} – ${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
}

export function currentWeek(today = new Date()): Period {
  const from = weekStart(today);
  const to = shiftDays(from, 6);
  return { from: iso(from), to: iso(to), label: label(from, to) };
}

export function lastWeek(today = new Date()): Period {
  return currentWeek(shiftDays(weekStart(today), -7));
}

export function lastFourWeeks(today = new Date()): Period {
  const to = shiftDays(weekStart(today), 6);
  const from = shiftDays(weekStart(today), -21);
  return { from: iso(from), to: iso(to), label: label(from, to) };
}
