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

/** '2026-09-02' -> a local Date. Never `new Date(iso)`, which reads UTC and
 *  puts an IST date on the day before. */
export function parseISO(value: string): Date | null {
  const [y, m, d] = (value ?? '').split('-').map(Number);
  if (!y || !m || !d) return null;
  const date = new Date(y, m - 1, d);
  return Number.isNaN(date.getTime()) ? null : date;
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
  const sameYear = from.getFullYear() === to.getFullYear();
  const sameMonth = sameYear && from.getMonth() === to.getMonth();
  if (sameMonth) return `${from.getDate()}–${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
  // A custom range is the only one that can cross a year, and "28 Dec – 3 Jan
  // 2027" would hide which December it started in, so both years are stated.
  if (sameYear) return `${from.getDate()} ${MONTHS[from.getMonth()]} – ${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
  return `${from.getDate()} ${MONTHS[from.getMonth()]} ${from.getFullYear()} – ${to.getDate()} ${MONTHS[to.getMonth()]} ${to.getFullYear()}`;
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

/** The calendar month `today` falls in, first day to last. */
export function thisMonth(today = new Date()): Period {
  const from = new Date(today.getFullYear(), today.getMonth(), 1);
  const to = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  return { from: iso(from), to: iso(to), label: label(from, to) };
}

/**
 * Any two days somebody picked. Total on purpose: a reversed pair is the
 * same range read backwards, so it is swapped rather than rejected, and the
 * label is built from the SAME two dates the query runs over — a custom
 * range cannot end up labelled one span and counted over another (C-84).
 */
export function customRange(fromValue: string, toValue: string): Period {
  const a = parseISO(fromValue) ?? new Date();
  const b = parseISO(toValue) ?? a;
  const [from, to] = a <= b ? [a, b] : [b, a];
  return { from: iso(from), to: iso(to), label: label(from, to) };
}

/* ------------------------------------------------------------ the choice
 * The named ranges the app offers, plus the one somebody dates themselves.
 * Modelling custom as a variant that CARRIES its two dates is what stops a
 * screen sitting on "Custom range" with nothing chosen and quietly showing
 * this week's figures under it.
 */
export const PERIOD_PRESETS = ['This week', 'Last week', 'Last 4 weeks', 'This month'] as const;
export type PeriodPreset = typeof PERIOD_PRESETS[number];

export const CUSTOM_PERIOD = 'Custom range';

export type PeriodChoice =
  | { key: PeriodPreset }
  | { key: typeof CUSTOM_PERIOD; from: string; to: string };

export function presetPeriod(key: PeriodPreset, today = new Date()): Period {
  return key === 'Last week' ? lastWeek(today)
    : key === 'Last 4 weeks' ? lastFourWeeks(today)
    : key === 'This month' ? thisMonth(today)
    : currentWeek(today);
}

export function resolvePeriod(choice: PeriodChoice, today = new Date()): Period {
  return choice.key === CUSTOM_PERIOD
    ? customRange(choice.from, choice.to)
    : presetPeriod(choice.key, today);
}
