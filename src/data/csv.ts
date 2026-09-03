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
