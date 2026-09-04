/**
 * The Google Meet attendance export, parsed.
 *
 * C-74: the file carries Full Name, First Seen and Time in Call, and NOTHING
 * else. There is no email column, no member id, no course and no branch —
 * so this parser refuses a file that does not have the name column rather
 * than guessing, and never infers an address from anything in it.
 */
export const CSV_REQUIRED_COLUMN = 'Full Name';
export const CSV_COLUMNS = ['Full Name', 'First Seen', 'Time in Call'] as const;

export type ParsedRow = { full_name: string; first_seen?: string; minutes_in_call: number };

/**
 * The lines Meet writes ABOVE the table: the meeting code and when the call
 * was created and ended. They are the only evidence in the file of WHICH
 * meeting it came from, which is what lets the upload screen say whether the
 * file matches the session that was picked.
 */
export type MeetMeta = {
  /** e.g. "abc-defg-hij", or null when the file carries no such line */
  code: string | null;
  /** the created-at line, verbatim as Meet wrote it */
  created: string | null;
  ended: string | null;
};

export type ParsedFile = {
  rows: ParsedRow[];
  headers: string[];
  meta: MeetMeta;
  /** how many preamble lines were read past before the table began */
  skipped: number;
};

/** Splits one CSV line, honouring "quoted, fields" and "" escapes. */
function splitLine(line: string): string[] {
  const out: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (quoted) {
      if (c === '"') {
        if (line[i + 1] === '"') { field += '"'; i++; } else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { out.push(field); field = ''; }
    else field += c;
  }
  out.push(field);
  return out.map(f => f.trim());
}

/**
 * "52 min", "1 hr 3 min", "0:52:14", "45" -> whole minutes.
 * Meet has used more than one of these shapes; an unrecognised value counts
 * as 0, which the <15-minute rule then drops rather than importing a row
 * whose duration nobody could read.
 */
export function parseMinutes(raw: string): number {
  const v = raw.trim().toLowerCase();
  if (!v) return 0;

  const clock = v.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/);
  if (clock) {
    // h:mm:ss when there are three parts, mm:ss when there are two
    return clock[3]
      ? Number(clock[1]) * 60 + Number(clock[2])
      : Number(clock[1]);
  }

  let minutes = 0;
  const hr = v.match(/(\d+)\s*(?:hr|hour|h)\b/);
  const min = v.match(/(\d+)\s*(?:min|minute|m)\b/);
  if (hr) minutes += Number(hr[1]) * 60;
  if (min) minutes += Number(min[1]);
  if (minutes > 0) return minutes;

  const bare = v.match(/^(\d+)$/);
  return bare ? Number(bare[1]) : 0;
}

/**
 * Finds the header row, wherever Meet put it.
 *
 * WHAT WAS WRONG HERE
 * This parser read `lines[0]` as the header. A real Google Meet attendance
 * export does not start with the table: it writes the meeting code and the
 * created/ended times first, THEN the Full Name / First Seen / Time in Call
 * header. So a genuine export hit the "that file has no Full Name column"
 * refusal -- the file was right and the reader was wrong, and the message
 * blamed the file.
 *
 * A file that DOES start with the header still works: the search finds it at
 * index 0 and no preamble is read.
 */
function findHeader(lines: string[]): { index: number; cells: string[] } | null {
  const want = CSV_REQUIRED_COLUMN.toLowerCase();
  for (let i = 0; i < lines.length; i++) {
    const cells = splitLine(lines[i]);
    if (cells.some(c => c.toLowerCase() === want)) return { index: i, cells };
  }
  return null;
}

/**
 * The label that opens a preamble line, and what is left after it.
 *
 * WHAT WAS WRONG HERE
 * This read `cells[0]` as the label and `cells[1..]` as the value, which only
 * works for the two-column shape `Meeting code,abc-defg-hij`. A real export
 * writes ONE cell -- "Meeting code: gzj-yhru-ehp" -- often behind a `*` marker
 * in the first column:
 *
 *     *,Meet
 *     *,Meeting code: gzj-yhru-ehp
 *     *,Created on 2026-08-31 20:12:56
 *     *,Ended on 2026-08-31 20:15:25
 *     Full Name,First Seen,Time in Call
 *
 * Against that file every field came back null. The rows still parsed, so
 * nothing looked broken -- the file's ONLY evidence of which meeting it came
 * from and when was silently discarded, and the session it belongs to could
 * not be derived at all.
 *
 * Matched by PREFIX rather than by splitting on ':', because the value itself
 * contains colons: splitting "Created on 2026-08-31 20:12:56" at the first
 * one yields the time 12:56 and a date ending in 20.
 */
const LABELS = {
  code: /^\s*(?:meeting|conference)\s*code\b\s*[:\-]?\s*/i,
  created: /^\s*(?:created|started)\s*(?:on|at)?\b\s*[:\-]?\s*/i,
  ended: /^\s*(?:ended|finished)\s*(?:on|at)?\b\s*[:\-]?\s*/i,
} as const;

/** The preamble as key -> value, in whichever column and shape Meet wrote it. */
function readMeta(lines: string[]): MeetMeta {
  const pick = (re: RegExp): string | null => {
    for (const line of lines) {
      const cells = splitLine(line);
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        const m = cell.match(re);
        if (!m) continue;
        const rest = cell.slice(m[0].length).trim();
        // "Meeting code: abc" -- the value is in the same cell.
        if (rest) return rest;
        // "Meeting code","abc" -- the label filled the cell on its own, so
        // the value is what follows. Later cells are joined back: a timestamp
        // Meet did not quote arrives split across commas, and half a date is
        // worse than none.
        const after = cells.slice(i + 1).filter(Boolean).join(', ').trim();
        if (after) return after;
      }
    }
    return null;
  };
  return {
    code: pick(LABELS.code),
    created: pick(LABELS.created),
    ended: pick(LABELS.ended),
  };
}

export function parseMeetCsv(text: string): ParsedFile {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) throw new Error('That file is empty.');

  const header = findHeader(lines);
  if (!header) {
    throw new Error(
      `That file has no “${CSV_REQUIRED_COLUMN}” column. RosiFit reads the Google Meet export: ` +
      `${CSV_COLUMNS.join(', ')}.`
    );
  }
  const headers = header.cells;
  const lower = headers.map(h => h.toLowerCase());
  const nameIx = lower.indexOf(CSV_REQUIRED_COLUMN.toLowerCase());
  const seenIx = lower.indexOf('first seen');
  const durIx = lower.indexOf('time in call');
  const meta = readMeta(lines.slice(0, header.index));

  const rows: ParsedRow[] = [];
  for (const line of lines.slice(header.index + 1)) {
    const cells = splitLine(line);
    const full_name = cells[nameIx] ?? '';
    if (!full_name) continue;
    rows.push({
      full_name,
      first_seen: seenIx === -1 ? undefined : cells[seenIx],
      minutes_in_call: durIx === -1 ? 0 : parseMinutes(cells[durIx] ?? ''),
    });
  }
  return { rows, headers, meta, skipped: header.index };
}

/**
 * The DATE a Meet file says the call happened, as yyyy-mm-dd.
 *
 * Meet has written this line in more than one shape ("2026-08-22 17:55:00",
 * "Aug 22, 2026, 5:55 PM"), so an ISO date anywhere in the string is taken
 * first and everything else falls back to Date parsing. Returns null when
 * nothing date-shaped is there -- which the upload screen shows as "cannot
 * check" rather than as a mismatch, because an unreadable line is not
 * evidence of the wrong file.
 */
export function meetCreatedDate(created: string | null): string | null {
  if (!created) return null;

  const iso = created.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const parsed = new Date(created);
  if (Number.isNaN(parsed.getTime())) return null;
  // Local parts, not toISOString: a 5:55 PM call on the 22nd in IST is the
  // 22nd, and UTC would call an evening session the following day.
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`;
}

/**
 * Does the file's own date agree with the session it is about to be imported
 * into? `null` means it cannot be told -- no date line, or an unreadable one.
 *
 * A definite `false` is the only thing worth warning about. Warning on `null`
 * would train people to click past the warning that matters.
 */
export function meetMatchesSession(
  created: string | null, sessionDateIso: string | null): boolean | null {
  const fileDate = meetCreatedDate(created);
  if (!fileDate || !sessionDateIso) return null;
  return fileDate === sessionDateIso.slice(0, 10);
}

/**
 * The clock time a Meet file says the call started, as HH:MM:SS.
 *
 * The session a file belongs to is identified by its MEETING CODE and its
 * DATE AND TIME, so the time is carried alongside the date rather than thrown
 * away: two sessions of the same course can run on one day, and the date
 * alone cannot tell them apart.
 *
 * Null when the line is missing or carries no clock -- which the screen shows
 * as "no time in the file", never as midnight. A time nobody wrote is not
 * 00:00:00, and recording it as such would put a morning class at midnight.
 */
export function meetCreatedTime(created: string | null): string | null {
  if (!created) return null;
  const m = created.match(/\b(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!m) return null;
  let hour = Number(m[1]);
  const suffix = m[4]?.toLowerCase();
  if (suffix === 'pm' && hour < 12) hour += 12;
  if (suffix === 'am' && hour === 12) hour = 0;
  if (hour > 23 || Number(m[2]) > 59) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hour)}:${m[2]}:${m[3] ?? '00'}`;
}

/**
 * ONE PERSON, ONE ROW.
 *
 * Meet writes a participant once per JOIN, so anybody whose connection
 * dropped appears twice -- and the attendance table's own invariant is one
 * record per member per session (attendance_unique_live). Left alone, the
 * second row reaches the import and the whole transaction dies on a unique
 * violation: a raw Postgres error, for a file that is perfectly normal.
 *
 * The first appearance is kept because it is when she arrived. The duplicates
 * are COUNTED AND NAMED rather than dropped quietly -- a file that says 14
 * rows and imports 12 has to say why, or the two look lost.
 *
 * Matched on a casefolded, whitespace-collapsed name: "Divya  R" and "divya r"
 * are one person rejoining, and importing them as two would put a member in
 * her own session twice.
 */
export function dedupeRows(rows: ParsedRow[]): { rows: ParsedRow[]; duplicates: string[] } {
  const seen = new Map<string, ParsedRow>();
  const duplicates: string[] = [];
  for (const r of rows) {
    const key = r.full_name.trim().toLowerCase().replace(/\s+/g, ' ');
    if (!key) continue;
    if (seen.has(key)) { duplicates.push(r.full_name); continue; }
    seen.set(key, r);
  }
  return { rows: [...seen.values()], duplicates };
}
