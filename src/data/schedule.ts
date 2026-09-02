/**
 * Which schedule version is in force on a given day.
 *
 * offering_schedules is effective-dated: changing an offering's weekdays
 * closes the old row and opens a new one (0018), so an offering accumulates
 * VERSIONS and "the weekdays" is always a question about a date. Reading the
 * wrong version is a silent failure of the worst kind -- the app renders
 * happily, every screen agrees with every other screen, and the expected
 * attendance behind them is counted against days the offering does not run.
 * Nobody sees it until a follow-up list is wrong weeks later.
 *
 * This lived twice, inline, in two repository functions that had to agree
 * with each other by hand. Two copies of "which version is in force" is
 * exactly how the dashboard count and the weekly list drift apart, so it is
 * one function now, and the cases are in schedule.test.ts.
 */
export type ScheduleWindow = {
  offering_id: string;
  weekdays: number[];
  effective_from: string;
  /** null means open-ended -- in force from effective_from onwards */
  effective_to: string | null;
};

/**
 * BOTH ends are inclusive, which is not a detail: 0005 stores the window as
 * `daterange(effective_from, effective_to, '[]')` and closes a superseded row
 * at `new_start - 1`. Treating effective_to as exclusive here would leave the
 * changeover day covered by neither version -- one day a year where every
 * member is expected at nothing.
 */
export function inForceOn(row: ScheduleWindow, onDate: string): boolean {
  if (row.effective_from > onDate) return false;
  if (row.effective_to !== null && row.effective_to < onDate) return false;
  return true;
}

/**
 * The version in force per offering, keyed by offering_id.
 *
 * The exclusion constraint in 0005 means at most one version can be in force
 * on any date, so a tie is not supposed to be reachable. This still resolves
 * one DETERMINISTICALLY -- latest effective_from wins -- rather than letting
 * whichever row PostgREST happened to return last overwrite the answer. A
 * correctness that holds only because a constraint elsewhere is intact reads
 * as luck to the next person, and reorders the moment anything adds a sort.
 */
export function currentSchedules<T extends ScheduleWindow>(
  rows: readonly T[], onDate: string,
): Map<string, T> {
  const out = new Map<string, T>();
  for (const row of rows) {
    if (!inForceOn(row, onDate)) continue;
    const held = out.get(row.offering_id);
    if (!held || row.effective_from > held.effective_from) out.set(row.offering_id, row);
  }
  return out;
}

/** Today, as the ISO day the schedule columns are compared against. */
export function today(): string {
  return new Date().toISOString().slice(0, 10);
}
