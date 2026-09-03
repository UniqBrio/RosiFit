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

/** The preamble as key -> value. Meet writes "Meeting code,abc-defg-hij". */
function readMeta(lines: string[]): MeetMeta {
  const pick = (re: RegExp): string | null => {
    for (const line of lines) {
      const cells = splitLine(line);
      if (cells.length >= 2 && re.test(cells[0].toLowerCase())) {
        // Later cells are joined back: a timestamp Meet did not quote can
        // arrive split across commas, and half a date is worse than none.
        const value = cells.slice(1).filter(Boolean).join(', ').trim();
        if (value) return value;
      }
    }
    return null;
  };
  return {
    code: pick(/meeting code|conference code|^code$/),
    created: pick(/created|start/),
    ended: pick(/ended|finish|end$/),
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
