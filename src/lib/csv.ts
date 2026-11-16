// Cells starting with these are run as formulas by Excel/Sheets, so they're neutralised.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

function cell(value: unknown): string {
  let text = value === null || value === undefined ? '' : String(value);
  if (typeof value === 'string' && FORMULA_PREFIX.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** RFC 4180 CSV with CRLF line endings. */
export function toCsv(rows: unknown[][]): string {
  return rows.map((row) => row.map(cell).join(',')).join('\r\n');
}

/** Triggers a browser download. The BOM makes Excel read UTF-8 names correctly. */
export function downloadCsv(filename: string, csv: string) {
  const url = URL.createObjectURL(new Blob(['﻿', csv], { type: 'text/csv;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
