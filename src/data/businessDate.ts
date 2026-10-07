/**
 * THE ACADEMY'S DAY, not the device's and not the server's.
 *
 * Every date-only value in this application -- a joining date, the day a
 * member goes inactive, the day an attendance file is for -- is a calendar
 * day in the academy's own time zone. `2026-10-05` means the fifth of
 * October in Chennai. It is never an instant, and it must never be made
 * from one by a path that quietly picks a different zone.
 *
 * THE DEFECT THIS CLOSES. The member form took "today" from `new Date()` in
 * the browser -- the device's zone, India for everybody who uses this -- and
 * create_member compared it with `current_date` in Postgres, which is the
 * SERVER'S day, UTC. Between midnight and 05:30 in India the two disagree
 * by a day, and four members added on 3 Oct between 00:37 and 01:02 were
 * refused with "a joining date in the future cannot be recorded" for
 * choosing today (docs/PERFORMANCE_ROOT_CAUSE_REPORT_2026-10-04.md §12).
 * Migration 0088 moves the server's checks onto the same day this reads.
 *
 * ONE ZONE, NAMED ONCE. Asia/Kolkata is UTC+05:30 all year -- India has had
 * no daylight saving since 1945 -- so the day is arithmetic on the instant,
 * with no dependence on the device's zone, its locale, or whether its Intl
 * tables know the zone. A licence for an academy elsewhere changes this one
 * constant and the one in 0088's business_today().
 */
export const BUSINESS_TIME_ZONE = 'Asia/Kolkata';

/** Asia/Kolkata's offset from UTC, in minutes. Fixed: no daylight saving. */
export const BUSINESS_UTC_OFFSET_MINUTES = 330;

/** The academy's calendar day for an instant, as YYYY-MM-DD. */
export function businessDateOf(instant: Date): string {
  const shifted = new Date(instant.getTime() + BUSINESS_UTC_OFFSET_MINUTES * 60_000);
  // The UTC fields of the shifted instant ARE the Chennai fields of the real
  // one; toISOString reads UTC fields, whatever zone the device is in.
  return shifted.toISOString().slice(0, 10);
}

/** Today, in the academy's zone. `now` is injectable so a spec can stand at
 *  00:30 in Chennai without waiting for it. */
export function businessTodayIso(now: () => Date = () => new Date()): string {
  return businessDateOf(now());
}

/** The two instants that bound a calendar day, or a run of days, in the
 *  academy's zone -- for a query over a timestamptz column. Written with the
 *  zone's own offset so the device's zone cannot move the boundary. */
export function businessDayBounds(fromIso: string, toIso: string): { from: string; to: string } {
  const offset = `${BUSINESS_UTC_OFFSET_MINUTES < 0 ? '-' : '+'}${String(Math.floor(Math.abs(BUSINESS_UTC_OFFSET_MINUTES) / 60)).padStart(2, '0')}:${String(Math.abs(BUSINESS_UTC_OFFSET_MINUTES) % 60).padStart(2, '0')}`;
  return {
    from: new Date(`${fromIso}T00:00:00.000${offset}`).toISOString(),
    to: new Date(`${toIso}T23:59:59.999${offset}`).toISOString(),
  };
}
