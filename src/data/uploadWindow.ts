/**
 * WHEN a day card may offer its upload.
 *
 * The course week strip gives an un-uploaded day the `awaiting` status
 * whether the date has passed or not (0034), and until now every one of
 * those days carried a pressable "Awaiting upload" button. Step the strip
 * forward and next week's Tuesday offered to upload a file for a class that
 * has not happened.
 *
 * That is not only premature, it is a dead end. `fetchPendingSessions` --
 * the one place the app decides what is actually waiting for a file --
 * queries `session_date <= today`, so a future day is in NO sense pending.
 * Pressing its button opened `/upload` scoped to that course and date,
 * `scopeSessions` matched nothing, and the screen answered "That session is
 * no longer waiting for a file — it may already have been uploaded", which
 * is the opposite of what happened.
 *
 * So the offer is narrowed here, at the derivation, rather than by a
 * condition in the render body: the button appears on a day of the CURRENT
 * week that has ARRIVED, and nowhere else. A future week has no such day; a
 * past week's days are reached from the upload screen's own list, which is
 * what `fetchPendingSessions` is for and which reaches back further than a
 * strip does.
 *
 * The week is `period.weekStart` -- Monday, matching
 * follow_up_config.week_start_day = 1 -- and never a subtraction of
 * timestamps, so a DST change inside the week cannot move the boundary.
 * Dates are compared as ISO strings, the same local-date comparison
 * `dayAttendance` makes for "has not happened yet"; `parseISO` is what keeps
 * `new Date(iso)` and its UTC reading out of this (an IST date would land on
 * the day before).
 *
 * Pure, and the clock is an argument, because "is this the current week" is
 * a claim and a claim computed inside a render body is one nobody can test.
 */
import { iso, parseISO, weekStart } from './period';

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Monday of the week `dayIso` falls in, as ISO. null when unreadable. */
export function weekStartIso(dayIso: string): string | null {
  if (!ISO_DATE.test(dayIso ?? '')) return null;
  const date = parseISO(dayIso);
  return date === null ? null : iso(weekStart(date));
}

/** Do the two dates fall in the same Monday–Sunday week? */
export function sameWeek(aIso: string, bIso: string): boolean {
  const a = weekStartIso(aIso);
  const b = weekStartIso(bIso);
  return a !== null && a === b;
}

export type UploadOffer = {
  /** the day is in the week `todayIso` falls in */
  currentWeek: boolean;
  /** the day has come -- today or earlier, the rule fetchPendingSessions uses */
  arrived: boolean;
  /** show the day's own upload button */
  offered: boolean;
};

/**
 * Whether the strip may offer an upload on `dayIso`. Says nothing about
 * whether the day is awaiting a file -- that is the strip's own status
 * derivation, and both have to be true before a button is drawn.
 */
export function uploadOffer(dayIso: string, todayIso: string): UploadOffer {
  const currentWeek = sameWeek(dayIso, todayIso);
  const arrived = ISO_DATE.test(dayIso ?? '') && ISO_DATE.test(todayIso ?? '')
    && dayIso <= todayIso;
  return { currentWeek, arrived, offered: currentWeek && arrived };
}

/** The predicate on its own, for a caller that only needs the answer. */
export function offersUpload(dayIso: string, todayIso: string): boolean {
  return uploadOffer(dayIso, todayIso).offered;
}
