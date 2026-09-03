/**
 * Turning rows into a CSV file Excel will not corrupt.
 *
 * Separate from csv.ts on purpose. csv.ts reaches for `document` and
 * `FileReader` -- the browser halves of choosing and saving a file -- and
 * scripts/tsconfig.json, which is where *.test.ts is typechecked, has no DOM
 * in its lib. A pure formatter in its own module is therefore the only shape
 * this logic can be TESTED in, and it is the half worth testing: the escaping
 * rules are where a silent corruption lives.
 */

/** One CSV cell. Quotes anything that would otherwise break the row, and
 *  doubles an embedded quote -- RFC 4180, which is what Excel reads. */
function cell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function toCsv(header: string[], rows: string[][]): string {
  // CRLF and a UTF-8 BOM: without the BOM Excel opens a Tamil name or a curly
  // quote as mojibake, which makes an export of names useless to the person
  // who asked for it.
  return '\uFEFF' + [header, ...rows].map(r => r.map(cell).join(',')).join('\r\n') + '\r\n';
}
