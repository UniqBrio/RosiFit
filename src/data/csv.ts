/**
 * The BROWSER halves of choosing and saving a file.
 *
 * Separate from meetCsv.ts (parsing) and csvFormat.ts (writing) because both
 * of those are pure and are typechecked by scripts/tsconfig.json, which has
 * no DOM in its lib -- so anything reaching for `document` or `FileReader`
 * cannot sit beside logic that needs tests.
 */
/** The fingerprint that stops the same file importing twice
 *  (csv_imports_sha_completed). Web Crypto, so no dependency. */
export async function sha256Hex(text: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Opens the platform file chooser and reads EVERY file chosen, as text.
 *
 * RosiFit ships as a PWA, so this is the web file input rather than a
 * native document picker — no extra dependency, and it is the surface the
 * academy actually uploads from. On a native build there is no picker
 * wired up yet and this says so plainly instead of failing silently.
 *
 * MULTIPLE, since 08-Sep-2026: an academy that runs four classes a day
 * exports four Meet files and had to walk the whole dialog four times. The
 * picker takes them all and hands them back in the order the browser gives
 * them; which day each one lands on is still read from its own `Created on`
 * line, never from its position in the list.
 *
 * An empty array means she opened the picker and chose nothing — the same
 * "she changed her mind" that `null` used to mean, and the caller treats it
 * the same way. A file that cannot be read rejects the WHOLE pick rather
 * than silently returning the others: a batch that quietly lost one file is
 * how a register goes missing without anybody being told.
 */
export function pickCsvFiles(): Promise<{ name: string; text: string }[]> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) {
    return Promise.reject(new Error('Choosing a file is available in the RosiFit web app.'));
  }
  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.multiple = true;
    input.onchange = () => {
      const files = [...(input.files ?? [])];
      if (files.length === 0) return resolve([]);
      Promise.all(files.map(file => new Promise<{ name: string; text: string }>((ok, no) => {
        const reader = new FileReader();
        reader.onload = () => ok({ name: file.name, text: String(reader.result ?? '') });
        reader.onerror = () => no(new Error(`${file.name} could not be read.`));
        reader.readAsText(file);
      }))).then(resolve, reject);
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
/**
 * Opens the platform file chooser for a BINARY file and reads its bytes.
 * The .xlsx member import uses this; the size ceiling is checked here, at
 * the door, because a 40 MB workbook should be refused before it is parsed,
 * not after the tab has frozen.
 */
export function pickFile(accept: string, maxBytes: number):
  Promise<{ name: string; bytes: ArrayBuffer; size: number } | null> {
  const doc = (globalThis as { document?: Document }).document;
  if (!doc) {
    return Promise.reject(new Error('Choosing a file is available in the RosiFit web app.'));
  }
  return new Promise((resolve, reject) => {
    const input = doc.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return resolve(null);
      if (file.size > maxBytes) {
        return reject(new Error(
          `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB; the limit is ${Math.round(maxBytes / 1024 / 1024)} MB.`));
      }
      const reader = new FileReader();
      reader.onload = () => resolve({ name: file.name, bytes: reader.result as ArrayBuffer, size: file.size });
      reader.onerror = () => reject(new Error('That file could not be read.'));
      reader.readAsArrayBuffer(file);
    };
    input.click();
  });
}

/** Hands the browser any bytes to save, under a name. Same contract as
 *  downloadCsv, which is now the text special case of this. */
export function downloadBlob(filename: string, blob: Blob): void {
  const doc = (globalThis as { document?: Document }).document;
  const url = (globalThis as { URL?: typeof URL }).URL;
  if (!doc || !url?.createObjectURL) {
    throw new Error('Exporting is available in the RosiFit web app.');
  }
  const href = url.createObjectURL(blob);
  const link = doc.createElement('a');
  link.href = href;
  link.download = filename;
  link.click();
  setTimeout(() => url.revokeObjectURL(href), 10_000);
}

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
