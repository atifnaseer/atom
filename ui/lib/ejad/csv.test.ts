import { describe, expect, it } from "vitest";
import { parseCsv, toCsv } from "@/lib/ejad/csv";

describe("parseCsv", () => {
  it("parses plain rows with CRLF or LF endings", () => {
    expect(parseCsv("a,b\r\nc,d\ne,f")).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e", "f"],
    ]);
  });

  it("handles quoted commas, quotes and line breaks", () => {
    expect(parseCsv('n,"x, y","say ""hi""","line1\nline2"\n')).toEqual([
      ["n", "x, y", 'say "hi"', "line1\nline2"],
    ]);
  });

  it("keeps empty cells and skips blank lines", () => {
    expect(parseCsv("a,,c\n\n,b,\n")).toEqual([
      ["a", "", "c"],
      ["", "b", ""],
    ]);
  });

  it("strips a byte-order mark", () => {
    expect(parseCsv("﻿Name\nx")).toEqual([["Name"], ["x"]]);
  });

  it("rejects an unclosed quote", () => {
    expect(() => parseCsv('a,"b')).toThrow(/unclosed quote/);
  });
});

describe("toCsv", () => {
  it("round-trips through parseCsv", () => {
    const rows = [
      ["Name", "Metadata"],
      ["dev, 1", '{"a":"b"}'],
      ["plain", ""],
    ];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
});
