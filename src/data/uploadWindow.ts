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

/**
 * A FILE FOR A DAY THAT HAS NOT HAPPENED, refused before anything runs.
 *
 * The strip's button is already withheld from a future day (`arrived`, above),
 * but that only guards the way IN. The day a file lands on has never come from
 * the screen -- it comes from the Meet `Created on` line -- so a file dated
 * tomorrow, opened from anywhere, imported without comment and
 * `commit_csv_import` created the future session to hold it.
 *
 * The requester's own boundary: *"If today is 8 sept user can upload for today
 * if the upload files date is 9 sept then block show message"*. TODAY IS
 * ALLOWED; tomorrow is not. That is exactly `arrived`, which is why this reads
 * the same predicate rather than a second copy of the comparison -- one rule,
 * one place, whether it is a button or a file being judged.
 *
 * `null` means import it and say nothing, and an UNREADABLE day answers null
 * on purpose: a file with no usable date is already refused by the screen, for
 * a reason it can state, and inventing a second refusal here would tell her
 * the wrong thing about it.
 *
 * A CAUTION, AND IT SAYS THE WORDS. Requester, on seeing the first version in
 * the red failure panel: *"for future date add a caution simple and message
 * should include as its a future date"*. So it is amber and not red on the
 * screen -- nothing has gone wrong, she picked a file too early -- and the
 * sentence names the reason in her own words rather than describing it. It
 * also lost a clause: naming TODAY as well as the file's day was a second date
 * to read in a message whose whole content is "not yet".
 */
export function futureFileRefusal(fileDay: string, todayIso: string, ctx: {
  /** the file she just picked, named as she will recognise it */
  fileName: string;
  /** '2026-09-09' -> 'Wed 9 Sep', the screen's own way of writing a day */
  label: (dayIso: string) => string;
}): string | null {
  if (!ISO_DATE.test(fileDay ?? '') || !ISO_DATE.test(todayIso ?? '')) return null;
  if (uploadOffer(fileDay, todayIso).arrived) return null;
  return `${ctx.fileName} is for ${ctx.label(fileDay)} — a future date. `
    + `Attendance can only be uploaded once the class has run.`;
}
