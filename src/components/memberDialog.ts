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
 *
 * The card is TWO panels since 2026-09-07 (the tabs below), so this module
 * also holds the readings her details panel needs -- for the same reason:
 * the panel is layout, and what "Inactive" or "follows the course" MEANS is
 * a rule that belongs beside the ones already here.
 */

import type { StatusKey } from '../theme/tokens';
import { DAY_NAMES, type MemberStatus } from '../data/mock';
import { statusOn, statusNote } from '../data/inactiveFrom';

/**
 * `course · branch · joined <month>` -- or just `course · branch` when there
 * is no joining month on record. The page wrote the branch alone in that
 * case rather than "joined —"; a dash after "joined" reads as a date nobody
 * filled in, which is not what an empty joined field means.
 */
export function memberSubtitle(m: { course: string; branch: string; joined: string }): string {
  const where = `${m.course} · ${m.branch}`;
  return m.joined === '—' ? where : `${where} · Joined ${m.joined}`;
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

/* ------------------------------------------------------------ the two tabs
 * (requests/2026-09-07-member-dialog-two-tabs.md)
 *
 * The card carried her week AND her record in one scroll. It is two panels
 * now: the week exactly as it was, and the record's own details -- the facts
 * the Edit form writes, read-only, at the moment somebody is deciding whether
 * to reach out to her.
 *
 * The list is here rather than in the dialog because the panel a tab names
 * and the tab itself must not be able to drift apart; the key is what the
 * dialog switches on, so a tab with no panel is a type error.
 */
export const MEMBER_TABS = [
  { key: 'week', label: 'This week' },
  { key: 'details', label: 'Details' },
] as const;

export type MemberTab = typeof MEMBER_TABS[number]['key'];

/**
 * Her status, as a WORD and an ICON -- never the colour alone (guardrail 3).
 *
 * 'paused' reads as Inactive, and that is not a shortcut: `members.status`
 * allows a third value that no screen sets, and `follow_up_candidates()`
 * (0009) passes 'active' and nothing else -- so paused and inactive are the
 * SAME fact to every part of the app that acts on the column. The roster
 * pill already folds them this way; this is the same reading, named, so the
 * pop-up and the row behind it cannot start calling one member two things.
 *
 * SINCE 0045 IT READS A DAY. `members.inactive_from` says from when the
 * stored status applies, so a member stored 'inactive' from the 1st of next
 * month is ACTIVE today and the word has to say so -- the alternative is a
 * dialog calling her Inactive for five weeks while the follow-up rule goes
 * on reaching her, which is the two ends disagreeing again in a new place.
 *
 * Both date arguments are optional and are honoured only TOGETHER: a caller
 * with no date to give gets exactly the reading this returned before, which
 * is what the pre-0045 rows mean anyway. `note` is the date said in words,
 * or null when there is nothing to add -- never the only signal, the word
 * and the icon carry the status itself (guardrail 3).
 */
export function memberStatusReading(
  status: MemberStatus,
  inactiveFrom: string | null = null,
  todayIso: string = '',
): { word: string; icon: string; active: boolean; note: string | null } {
  const dated = Boolean(inactiveFrom && todayIso);
  const effective = dated ? statusOn({ status, inactiveFrom }, todayIso) : status;
  const active = effective === 'active';
  return {
    active,
    word: active ? 'Active' : 'Inactive',
    icon: active ? 'check_circle' : 'pause_circle',
    note: dated ? statusNote({ status, inactiveFrom }, todayIso) : null,
  };
}

/**
 * The days she attends, Monday first -- or `null` when she has none of her
 * own and follows the days her offering runs.
 *
 * `member_schedules` (0006) is an OVERRIDE, so `null` and `[]` both mean "no
 * row, she follows the course" and must not be drawn as "no days": a member
 * who follows a course that runs three days a week attends three days. The
 * order is the WEEK's, not the row's -- a stored [5,1] is Mon · Fri.
 */
export function memberDayNames(weekdays: number[] | null): string[] | null {
  if (!weekdays || weekdays.length === 0) return null;
  return [...weekdays].sort((a, b) => a - b).map(d => DAY_NAMES[d]);
}

/**
 * Her addresses with the primary first, the order the member form saves them
 * in -- so the panel that READS the record and the form that WRITES it agree
 * about which address is at the top. Stable below the primary: the rest keep
 * the order they are stored in rather than being shuffled by the sort.
 */
export function addressesInOrder<T extends { primary: boolean }>(emails: T[]): T[] {
  return [...emails].sort((a, b) => Number(b.primary) - Number(a.primary));
}
