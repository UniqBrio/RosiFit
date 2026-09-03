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
export type ParsedFile = { rows: ParsedRow[]; headers: string[] };

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

export function parseMeetCsv(text: string): ParsedFile {
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) throw new Error('That file is empty.');

  const headers = splitLine(lines[0]);
  const lower = headers.map(h => h.toLowerCase());
  const nameIx = lower.indexOf(CSV_REQUIRED_COLUMN.toLowerCase());
  if (nameIx === -1) {
    throw new Error(
      `That file has no “${CSV_REQUIRED_COLUMN}” column. RosiFit reads the Google Meet export: ` +
      `${CSV_COLUMNS.join(', ')}.`
    );
  }
  const seenIx = lower.indexOf('first seen');
  const durIx = lower.indexOf('time in call');

  const rows: ParsedRow[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitLine(line);
    const full_name = cells[nameIx] ?? '';
    if (!full_name) continue;
    rows.push({
      full_name,
      first_seen: seenIx === -1 ? undefined : cells[seenIx],
      minutes_in_call: durIx === -1 ? 0 : parseMinutes(cells[durIx] ?? ''),
    });
  }
  return { rows, headers };
}

/** The fingerprint that stops the same file importing twice
 *  (csv_imports_sha_completed). Web Crypto, so no dependency. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Opens the platform file chooser and reads the file as text.
 *
 * RosiFit ships as a PWA, so this is the web file input rather than a
 * native document picker — no extra dependency, and it is the surface the
 * academy actually uploads from. On a native build there is no picker
 * wired up yet and this says so plainly instead of failing silently.
 */
export function pickCsvFile(): Promise<{ name: string; text: string } | null> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) {
    return Promise.reject(new Error('Choosing a file is available in the RosiFit web app.'));
  }
  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, text: String(reader.result ?? '') });
      reader.onerror = () => reject(new Error('That file could not be read.'));
      reader.readAsText(file);
    };
    input.click();
  });
}

/**
 * Hands the browser a file to save.
 *
 * Same reasoning as pickCsvFile: RosiFit ships as a PWA, so this is the
 * anchor-and-blob the web actually saves from -- no extra dependency. On a
 * native build there is nothing wired up, and it says so plainly rather than
 * appearing to succeed. A button labelled Export that only flashed a toast is
 * the same defect as a form that reports a save it never attempted.
 */
export function downloadCsv(filename: string, content: string): void {
  const doc = (globalThis as { document?: Document }).document;
  const url = (globalThis as { URL?: typeof URL }).URL;
  if (!doc || !url?.createObjectURL) {
    throw new Error('Exporting is available in the RosiFit web app.');
  }
  const href = url.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const link = doc.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  // Revoked on the next tick, not immediately: Safari has not started the
  // download by the time click() returns, and a revoked URL saves 0 bytes.
  setTimeout(() => url.revokeObjectURL(href), 10_000);
}
