/**
 * THE DATE FORMAT the academy reads and types: 10-Oct-2026.
 *
 * The requester chose it on 09-Sep-2026 -- "we shall go with dd-mmm-yyyy
 * format as its easier to understand month" -- and the reason is the whole
 * point of this module. A month written as a NAME cannot be misread. A month
 * written as a number, with the year last, can: 01/09/2026 is the 1st of
 * September to the academy and the 9th of January to Postgres, and nobody
 * looking at the cell can tell which one landed. That is not hypothetical
 * here -- it is why the import has carried a shape check since 0029.
 *
 * SO THIS MODULE IS DELIBERATELY GENEROUS IN ONE DIRECTION AND STRICT IN THE
 * OTHER. "if they enter date in any format convert that to dd-mmm-yyyy", the
 * requester said, and that is honoured for every format whose meaning is not
 * in question:
 *
 *     10-Oct-2026   10 Oct 2026   10 October 2026   Oct 10, 2026
 *     2026-10-10    (ISO, and what every export written before today holds)
 *     a real Excel date cell (Excel has already resolved it)
 *
 * What it will NOT do is guess. An all-numeric date that is not ISO --
 * 01/09/2026, 1-9-2026, 1.9.2026 -- is refused, and the refusal says to write
 * the month as a name. Converting it would mean picking a reading, being
 * right about half the time, and writing the wrong day onto the column that
 * decides every session a member was expected at. A refusal a person can fix
 * in four keystrokes is worth more than a silent guess.
 *
 * ISO IS STILL THE WIRE FORMAT. Postgres takes YYYY-MM-DD and the RPCs check
 * for it; nothing about that changed. dd-mmm-yyyy is what a person reads and
 * types, and this module is the boundary between the two.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;

/** What the academy is asked for, wherever a date is asked for. */
export const DATE_FORMAT_HINT = 'DD-MMM-YYYY';
/** The same, shown as itself. Worth more than the letters beside a field. */
export const DATE_FORMAT_EXAMPLE = '10-Oct-2026';

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;
/** day, month NAME, year -- the canonical shape and its spelled-out cousins */
const NAMED = /^(\d{1,2})[\s./-]+([A-Za-z]{3,})[\s./-]+(\d{4})$/;
/** month NAME first: "Oct 10, 2026" */
const NAMED_FIRST = /^([A-Za-z]{3,})[\s./-]+(\d{1,2})(?:st|nd|rd|th)?,?[\s./-]+(\d{4})$/;
/** all-numeric and NOT iso -- the shape that cannot be read safely */
const NUMERIC = /^\d{1,4}[\s./-]+\d{1,2}[\s./-]+\d{1,4}$/;

/** A month name, or a full one, to its index. Null when it is not a month. */
function monthIndex(word: string): number | null {
  const w = word.slice(0, 3).toLowerCase();
  const at = MONTHS.findIndex(m => m.toLowerCase() === w);
  return at === -1 ? null : at;
}

/** Does this day exist? 2026-02-30 has the right shape and is not a day. */
function realDay(y: number, m: number, d: number): boolean {
  if (m < 1 || m > 12 || d < 1 || d > 31) return false;
  const probe = new Date(Date.UTC(y, m - 1, d));
  return probe.getUTCFullYear() === y && probe.getUTCMonth() === m - 1 && probe.getUTCDate() === d;
}

const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/**
 * What a typed date means, or why it cannot be read.
 *
 *   { iso }        -- understood; the ISO form to store
 *   { problem }    -- a sentence to show the person, naming what they typed
 *   null           -- the cell was empty, which is never an error here
 */
export type DateReading = { iso: string } | { problem: string } | null;

export function readDate(raw: string): DateReading {
  const text = (raw ?? '').trim();
  if (!text) return null;

  const isoHit = ISO.exec(text);
  if (isoHit) {
    const [, y, m, d] = isoHit.map(Number) as unknown as number[];
    return realDay(y, m, d)
      ? { iso: iso(y, m, d) }
      : { problem: `“${text}” is not a real date — there is no such day` };
  }

  const named = NAMED.exec(text);
  if (named) {
    const day = Number(named[1]), year = Number(named[3]);
    const mon = monthIndex(named[2]);
    if (mon === null) return { problem: `“${named[2]}” is not a month — write it as ${DATE_FORMAT_EXAMPLE}` };
    return realDay(year, mon + 1, day)
      ? { iso: iso(year, mon + 1, day) }
      : { problem: `“${text}” is not a real date — there is no such day` };
  }

  const first = NAMED_FIRST.exec(text);
  if (first) {
    const mon = monthIndex(first[1]);
    const day = Number(first[2]), year = Number(first[3]);
    if (mon === null) return { problem: `“${first[1]}” is not a month — write it as ${DATE_FORMAT_EXAMPLE}` };
    return realDay(year, mon + 1, day)
      ? { iso: iso(year, mon + 1, day) }
      : { problem: `“${text}” is not a real date — there is no such day` };
  }

  // THE ONE IT REFUSES TO GUESS AT. Said plainly, with the fix in it: the
  // month has to be a name, and then there is nothing left to get wrong.
  if (NUMERIC.test(text)) {
    return { problem:
      `“${text}” could be two different days — write the month as a name, like ${DATE_FORMAT_EXAMPLE}` };
  }

  return { problem: `“${text}” is not a date — write it as ${DATE_FORMAT_EXAMPLE}` };
}

/** The stored date, as the academy reads it. '' for nothing on record. */
export function formatDate(isoDate: string | null | undefined): string {
  if (!isoDate) return '';
  const hit = ISO.exec(isoDate.trim());
  if (!hit) return isoDate;                       // never invent a shape
  const [, y, m, d] = hit.map(Number) as unknown as number[];
  if (!realDay(y, m, d)) return isoDate;
  return `${String(d).padStart(2, '0')}-${MONTHS[m - 1]}-${y}`;
}

/** Understood dates to ISO, everything else to ''. For a caller that has
 *  already had the reading judged and only needs the value. */
export function toIso(raw: string): string {
  const r = readDate(raw);
  return r && 'iso' in r ? r.iso : '';
}
