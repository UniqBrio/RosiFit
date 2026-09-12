/**
 * WHAT THE APP KNOWS ABOUT A DAY, kept apart from what happened on it.
 *
 * RC-039 is what this module is for. A week of attendance passed PostgREST's
 * 1,000-row ceiling; the reply came back `200`, a thousand rows and
 * `error: null`; four of General's uploaded days had no rows in it; and the
 * course strip printed "Awaiting upload" over attendance that was sitting in
 * the table. Nobody wrote that bug. It falls out of one line —
 *
 *     const rows = attendance.data ?? [];
 *
 * — because `data` is null while a read is in flight, null when a read has
 * failed, and null-ish-in-effect when a read came back short. All three
 * arrive at the screen as "no records", which is the exact shape of a week
 * nobody has uploaded.
 *
 * So the rule this module exists to hold is a narrow one:
 *
 *     "NOT UPLOADED" IS A CLAIM ONLY A COMPLETED READ MAY MAKE.
 *
 * It is pure and takes the read's state as an argument, for the reason RC-012
 * records: a derivation that reaches for a hook cannot be tested against
 * anything but the app it lives in.
 */
import type { StatusKey } from '../theme/tokens';
import type { ScreenState } from './useScreenState';

export type DayLoad =
  /** the read has not answered yet. Nothing is claimed */
  | 'loading'
  /** the read answered, and it had records for this day */
  | 'uploaded'
  /** the read answered, and it had none. The ONLY state that may say so */
  | 'not-uploaded'
  /** the read failed, was cut short, or timed out. The app does not know */
  | 'failed';

/**
 * The read's outcome first, the rows second — and never the other way round.
 *
 * `hasRows` is asked for only once the read has come back whole, so a caller
 * cannot accidentally let an empty array speak for a failure.
 */
export function dayLoad(read: ScreenState, hasRows: boolean): DayLoad {
  if (read === 'loading') return 'loading';
  if (read === 'error') return 'failed';
  return hasRows ? 'uploaded' : 'not-uploaded';
}

/**
 * How that is drawn — the status tone the cell wears.
 *
 * `failed` is its own status, with its own word and its own icon, because
 * guardrail 3 does not let a state be carried by colour: a strip of pink
 * cells and a strip of yellow ones must still read differently to somebody
 * who sees neither.
 *
 * A LOADING day is given `none` rather than a business word. It is never
 * drawn — the strip puts a skeleton in place of the whole row — but a state
 * that is invisible today is a state somebody renders tomorrow, and the one
 * thing it must not do is arrive wearing "Awaiting upload".
 */
export function dayStatusKey(load: DayLoad, day: {
  /** rows marked present or extra */
  present: number;
  /** rows marked absent */
  absent: number;
  /** does a file belong on this day -- timetabled, or a session was held on
   *  it off the timetable (0070). Read from 0067's `runs`, never re-derived */
  runsToday: boolean;
}): StatusKey {
  switch (load) {
    case 'failed': return 'failed';
    case 'loading': return 'none';
    case 'uploaded':
      // An all-absent day is an absent day. A day with anybody present reads
      // present, because the register for it exists either way and the counts
      // beside the icon say the rest.
      return day.absent > 0 && day.present === 0 ? 'absent' : 'present';
    case 'not-uploaded':
      return day.runsToday ? 'awaiting' : 'none';
  }
}
