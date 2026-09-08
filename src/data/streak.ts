/**
 * HOW THE MISSED RUN IS WORDED, in one place.
 *
 * `member_stats.current_streak` is the run of countable sessions before her
 * most recent present -- recomputed, never incremented (apply_all.sql,
 * `current_streak_for`). Two screens print it: the roster card's miss line and
 * the member pop-up's figure strip.
 *
 * WHY THIS MODULE EXISTS. Both screens printed the bare number under the word
 * *consecutive*, beside a weekly miss count, on a course whose follow-up
 * trigger is weekly. Three things were unreadable at once:
 *
 *   1. `consecutive 6` on a course that runs five days a week looked
 *      arithmetically impossible. It is not: the run is counted in SESSIONS
 *      and carries across weeks, so five from last week plus Monday is six.
 *   2. Beside `Missed this week: 1` it read as a second, contradictory count
 *      of the same thing.
 *   3. The consecutive TRIGGER was withdrawn from the course form (0030), so
 *      the word *consecutive* named a rule that no longer decides anything --
 *      while sitting directly under the rule that does.
 *
 * The fix is wording, not arithmetic: the number is right and is unchanged.
 * It is named for what it is (a run, not a rule) and dated to the session that
 * ended it, so a reader can check it against her sessions instead of trying to
 * divide it by the week.
 *
 * Pure, and it takes the fields rather than a `Member`, for the reason
 * dayAttendance.ts records: a derivation that imports the fixtures cannot be
 * tested against anything else.
 */
import { shortDate } from './period';

export type StreakReading = {
  /** the run itself, exactly as member_stats holds it */
  count: number;
  /** the figure's label. Never the word "streak", which reads as a rule. */
  label: string;
  /** what follows the week's miss count on a roster card, or null when
   *  nothing is running and there is nothing to add */
  short: string | null;
  /** the sentence under her figures, which says what the run counts and what
   *  ended it -- the two facts the bare number was missing */
  sentence: string;
};

export const STREAK_LABEL = 'Missed in a row';

/** The run does not answer to the week, and saying so is the whole point. */
const CARRIES =
  'It counts her course’s own sessions and carries across weeks, '
  + 'so it is not capped by the number the week holds.';

export function streakReading(input: {
  /** member_stats.current_streak */
  streak: number;
  /** member_stats.last_present_date, ISO, or null when she has never attended */
  lastPresent: string | null;
}): StreakReading {
  // Anything below zero is not a run and cannot be worded as one. The column
  // is constrained non-negative; this is what stops a bad read printing
  // "-1 in a row" rather than the honest "nothing running".
  const count = Math.max(Math.trunc(input.streak) || 0, 0);

  if (count === 0) {
    return {
      count,
      label: STREAK_LABEL,
      // Nothing is appended to the card's miss line. A card that reads
      // "0 in a row" spends a line saying nothing happened.
      short: null,
      sentence: 'Nothing running — she attended the last session she was expected at.',
    };
  }

  const sessions = `${count} session${count === 1 ? '' : 's'}`;
  const since = input.lastPresent ? shortDate(input.lastPresent) : null;

  return {
    count,
    label: STREAK_LABEL,
    short: since ? `${count} in a row since ${since}` : `${count} in a row`,
    sentence: since
      ? `${sessions} missed in a row — she was last present on ${since}. ${CARRIES}`
      // No attended session on record is a different fact from one we failed
      // to read, and it is stated rather than dressed as a date.
      : `${sessions} missed in a row — she has no attended session on record. ${CARRIES}`,
  };
}

/**
 * The roster card's whole miss line: the week's count, then the run.
 *
 * Built here rather than in the screen so the card and the pop-up cannot end
 * up naming the same run two ways -- which is how `consecutive 6` and
 * `Missed streak 6` came to sit on two screens describing one number.
 */
export function missLine(input: {
  /** the label of the week being shown, e.g. '7–13 Sep 2026' */
  weekLabel: string;
  /** what she missed inside that week */
  missed: number;
  reading: StreakReading;
}): string {
  const week = `Missed ${input.weekLabel}: ${input.missed}`;
  return input.reading.short ? `${week} · ${input.reading.short}` : week;
}
