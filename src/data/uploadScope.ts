/**
 * Which sessions the upload screen offers, and whether it can skip the choice.
 *
 * THE UPLOAD SCREEN HAD ONE ENTRY POINT WEARING FOUR HATS. Whether it was
 * opened from a specific awaiting DAY on a course, from the course itself, or
 * from the academy-wide Attendance list, it opened the same list of every
 * session anywhere that is waiting for a file -- and asked the person to find
 * again the one she had just tapped.
 *
 * That is not only tedious. Picking the wrong session here attaches a real
 * class's attendance to a different class, and the screen's own check can
 * only compare the file's meeting code against whatever she picked. Narrowing
 * the list to what she asked for removes most of the ways to pick wrong.
 *
 * Pure and separate because "which session did she mean" is a claim, and a
 * claim computed inside a render body is one nobody can test.
 */
import type { PendingSession } from './mock';

export type UploadScope = {
  /** what the picker offers */
  sessions: PendingSession[];
  /** the one session to open straight into, or null to let her choose */
  preselect: PendingSession | null;
  /** the line naming the narrowing, or null when nothing is narrowed */
  note: string | null;
  /** true when a scope was asked for and NOTHING matched it */
  empty: boolean;
};

export function scopeSessions(
  all: PendingSession[],
  courseId?: string | null,
  date?: string | null,
): UploadScope {
  const wantCourse = typeof courseId === 'string' && courseId.trim() !== '';
  const wantDate = typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date);

  if (!wantCourse && !wantDate) {
    return { sessions: all, preselect: null, note: null, empty: false };
  }

  const byCourse = wantCourse ? all.filter(s => s.course_id === courseId) : all;
  const matched = wantDate ? byCourse.filter(s => s.session_date === date) : byCourse;

  // A scope that matches nothing does NOT silently widen back to everything.
  // She tapped "Upload this session" about one session; showing her twelve
  // others as though that were the answer is how the wrong file goes to the
  // wrong class. The screen says the session is no longer awaiting a file and
  // offers the full list as a deliberate second step.
  if (matched.length === 0) {
    return {
      sessions: [],
      preselect: null,
      note: wantDate
        ? 'That session is no longer waiting for a file — it may already have been uploaded.'
        : 'No session for this course is waiting for a file.',
      empty: true,
    };
  }

  // Exactly one is the whole point of asking for a day: skip the picker.
  // Two sessions of the same course on one date is possible (two branches),
  // and then she still chooses -- from two, not from twenty.
  const name = matched[0].course || 'this course';
  return {
    sessions: matched,
    preselect: matched.length === 1 ? matched[0] : null,
    note: wantDate
      ? (matched.length === 1 ? null : `${matched.length} sessions of ${name} ran that day.`)
      : `Showing ${name} only.`,
    empty: false,
  };
}
