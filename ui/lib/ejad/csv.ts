// Minimal RFC 4180 CSV reading and writing for bulk uploads and downloads.

/**
 * Parses CSV text into rows of cells. Handles quoted cells with embedded
 * commas, quotes ("") and line breaks, CRLF or LF line endings, and a
 * leading byte-order mark. Fully blank lines are skipped.
 */
export function parseCsv(text: string): string[][] {
  const input = text.startsWith("﻿") ? text.slice(1) : text;
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  let i = 0;

  const endRow = () => {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
    row = [];
    cell = "";
  };

  while (i < input.length) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          cell += '"';
          i += 2;
          continue;
        }
        quoted = false;
        i += 1;
        continue;
      }
      cell += ch;
      i += 1;
      continue;
    }
    if (ch === '"' && cell === "") {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\r") {
      if (input[i + 1] === "\n") i += 1;
      endRow();
    } else if (ch === "\n") {
      endRow();
    } else {
      cell += ch;
    }
    i += 1;
  }
  if (quoted) throw new Error("The CSV file has an unclosed quote.");
  if (cell !== "" || row.length > 0) endRow();
  return rows;
}

function escapeCell(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Serializes rows to CSV text with CRLF line endings. */
export function toCsv(rows: string[][]): string {
  return `${rows.map((row) => row.map(escapeCell).join(",")).join("\r\n")}\r\n`;
}

/** Browser-only: saves text as a downloaded file. */
export function downloadTextFile(
  filename: string,
  contents: string,
  type = "text/csv;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([contents], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
