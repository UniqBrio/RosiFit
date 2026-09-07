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

/**
 * The month she joined, the way the register writes it -- "Mar 2026" -- or
 * '\u2014' when her record carries no date.
 *
 * ONE derivation, called by every producer of a `Member`. The record carries
 * the stored date AND this label, and two fields for one fact is exactly how
 * the two drift apart; deriving the second from the first is what stops it.
 *
 * Locale-free, for the same reason `label()` below is: this was
 * `toLocaleDateString`, which writes a different month name per device, and
 * the canvas writes one.
 */
export function joinedLabel(joinedOn: string | null): string {
  const d = parseISO(joinedOn ?? '');
  return d ? `${MONTHS[d.getMonth()]} ${d.getFullYear()}` : '\u2014';
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

/* ------------------------------------------------------------- the buckets
 *
 * A period split into the consecutive sub-ranges the "based on period"
 * section of Overview draws one bar for.
 *
 * WHY THE SPLIT IS A FUNCTION AND NOT A LOOP IN THE SCREEN
 * Each bucket is queried with the SAME function the donut and the member
 * report read (`member_period_metrics`), just over a shorter range. That is
 * the only reason the trend can be trusted beside the total: the buckets
 * PARTITION the period exactly -- consecutive, no gap, no overlap, clipped to
 * the range at both ends -- so summing them reproduces the whole-period
 * figure. Split it wrong and the bars quietly describe a different span from
 * the ring above them, which is the drift C-84 exists to stop.
 *
 * The grain follows the span, because a bar per day over a year is not a
 * chart and a single bar for a week is not a trend.
 */

/** A week and a bit: past this a bar per day stops fitting on a phone. */
const MAX_DAILY_SPAN = 8;
/** Eleven weeks. Past this the weekly grain gives more bars than bars. */
const MAX_WEEKLY_SPAN = 77;

const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dayCount = (from: Date, to: Date): number =>
  Math.round((to.getTime() - from.getTime()) / 86400000) + 1;

/** A bucket's own label — short enough to sit at the head of a bar row, and
 *  built from the SAME two dates the bucket is queried over. */
function bucketLabel(from: Date, to: Date, grain: 'day' | 'week' | 'month'): string {
  if (grain === 'day') return `${DAYS_SHORT[from.getDay()]} ${from.getDate()}`;
  if (grain === 'month') return `${MONTHS[from.getMonth()]} ${from.getFullYear()}`;
  return from.getMonth() === to.getMonth()
    ? `${from.getDate()}\u2013${to.getDate()} ${MONTHS[to.getMonth()]}`
    : `${from.getDate()} ${MONTHS[from.getMonth()]}\u2013${to.getDate()} ${MONTHS[to.getMonth()]}`;
}

export function periodBuckets(range: Period): Period[] {
  const start = parseISO(range.from);
  const end = parseISO(range.to);
  if (!start || !end || end < start) return [];

  const span = dayCount(start, end);
  const grain: 'day' | 'week' | 'month' =
    span <= MAX_DAILY_SPAN ? 'day' : span <= MAX_WEEKLY_SPAN ? 'week' : 'month';

  const out: Period[] = [];
  let cursor = start;
  // The guard is the calendar, not a counter: every branch below moves the
  // cursor strictly forwards, and the loop stops on the range's own last day.
  while (cursor <= end) {
    // The natural end of the bucket the cursor sits in -- then CLIPPED to the
    // range, which is what makes the first and last buckets partial rather
    // than reaching outside the period the label promises.
    const natural =
      grain === 'day' ? cursor
      : grain === 'week' ? shiftDays(weekStart(cursor), 6)
      : new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0);
    const to = natural > end ? end : natural;
    out.push({ from: iso(cursor), to: iso(to), label: bucketLabel(cursor, to, grain) });
    cursor = shiftDays(to, 1);
  }
  return out;
}
