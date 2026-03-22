import { describe, expect, it } from "vitest";

import {
  activeGuideColumns,
  getLineIndexForOffset,
  indentReferenceLine,
  leadingIndentColumns,
  splitLines
} from "@/lib/active-indent-guides";

describe("active-indent-guides", () => {
  it("getLineIndexForOffset", () => {
    expect(getLineIndexForOffset("a\nb\nc", 0)).toBe(0);
    expect(getLineIndexForOffset("a\nb\nc", 2)).toBe(1);
    expect(getLineIndexForOffset("a\nb\nc", 4)).toBe(2);
  });

  it("leadingIndentColumns with spaces and tabs", () => {
    expect(leadingIndentColumns("    x", 2)).toBe(4);
    expect(leadingIndentColumns("\t", 2)).toBe(2);
    expect(leadingIndentColumns(" \t", 2)).toBe(2);
    expect(leadingIndentColumns(" \t ", 2)).toBe(3);
  });

  it("indentReferenceLine walks up for blank lines", () => {
    const lines = splitLines("  a\n\n    b");
    expect(indentReferenceLine(lines, 1)).toBe("  a");
    expect(indentReferenceLine(lines, 2)).toBe("    b");
  });

  it("activeGuideColumns", () => {
    expect(activeGuideColumns(0, 2)).toEqual([]);
    expect(activeGuideColumns(2, 2)).toEqual([2]);
    expect(activeGuideColumns(5, 2)).toEqual([2, 4]);
    expect(activeGuideColumns(6, 2)).toEqual([2, 4, 6]);
  });

  it("splitLines empty", () => {
    expect(splitLines("")).toEqual([""]);
  });
});
