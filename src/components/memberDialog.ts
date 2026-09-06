/**
 * The two decisions the member pop-up takes that are not layout
 * (requests/2026-09-06-member-detail-as-popup.md).
 *
 * The record was a page with a plum gradient header carrying her name, her
 * course and her branch on three lines, and five tiles each choosing its own
 * colour. It is a dialog card now, and a card has ONE subtitle line and ONE
 * figure that carries a tone. Both rules lived inline on the page; they are
 * here so the dialog is nothing but layout and the rules can be read on
 * their own.
 */

import type { StatusKey } from '../theme/tokens';

/**
 * `course · branch · joined <month>` -- or just `course · branch` when there
 * is no joining month on record. The page wrote the branch alone in that
 * case rather than "joined —"; a dash after "joined" reads as a date nobody
 * filled in, which is not what an empty joined field means.
 */
export function memberSubtitle(m: { course: string; branch: string; joined: string }): string {
  const where = `${m.course} · ${m.branch}`;
  return m.joined === '—' ? where : `${where} · joined ${m.joined}`;
}

/**
 * The tone the week's attendance figure wears: the same three thresholds the
 * page and the weekly row use, so the pop-up cannot call 65% green while the
 * list behind it calls it amber. `null` in, `null` out -- a member expected
 * at nothing this week has no figure, and no figure is not a bad one.
 */
export function attendanceTone(pct: number | null): Extract<StatusKey, 'present' | 'awaiting' | 'absent'> | null {
  if (pct === null) return null;
  return pct >= 70 ? 'present' : pct >= 40 ? 'awaiting' : 'absent';
}
