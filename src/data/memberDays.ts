/**
 * What the member form sends as her own days — one rule, in one place.
 *
 * `member_schedules` (0006) is an OVERRIDE: a member with no row follows the
 * offering's schedule and goes on following it when that schedule changes,
 * and `create_member`/`update_member` read `p_weekdays = null` as exactly
 * that. So the question this module answers is not "which chips are lit" but
 * "has she actually been given days of her own".
 *
 * The add form seeds the chips from the course, which makes "all of them" the
 * state nobody chose. Sending that literally would give every new member an
 * override equal to today's course days and leave her expected on days the
 * course had since stopped running. A seeded row is therefore still `null` —
 * only a NARROWER set is an override.
 *
 * The edit form seeds nothing, so every selection there was made by hand and
 * is sent as it stands (`seeded: false`).
 */
import { DAY_NAMES } from './mock';

export function memberWeekdays(
  selected: string[],
  courseDays: Iterable<string>,
  seeded: boolean,
): number[] | null {
  const allowed = new Set(courseDays);
  const followsCourse = selected.length === 0
    || (seeded && allowed.size > 0
        && selected.length === allowed.size && selected.every(d => allowed.has(d)));
  return followsCourse ? null : selected.map(d => DAY_NAMES.indexOf(d));
}

/**
 * Which day chips the member form OPENS with.
 *
 * The saving rule above has an opening half, and the two must agree or the
 * form lies about the member in front of it. `own` is her `member_schedules`
 * override -- `null` when she has none and follows the offering.
 *
 * With no override, the row opens on every day the course runs: she joins a
 * course to attend the days it runs, and making somebody tick them one by one
 * asks her to re-state the course she just chose. With one, the row opens on
 * HER days -- the whole point of an override is that it is not the course's
 * set, and seeding the course's over it would show days that are not hers.
 *
 * A day of hers the course no longer runs is dropped: that chip is disabled,
 * `update_member` refuses `p_weekdays` that is not a subset of the offering's
 * days (0027), so lighting it would put the form in a state it cannot save.
 */
export function openingDays(courseDays: Iterable<string>, own: number[] | null): string[] {
  const allowed = new Set(courseDays);
  if (!own) return [...allowed];
  return own.map(d => DAY_NAMES[d]).filter(name => allowed.has(name));
}
