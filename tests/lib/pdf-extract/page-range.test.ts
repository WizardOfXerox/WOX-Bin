import { describe, expect, it } from "vitest";

import { parsePageRange } from "@/lib/pdf-extract/page-range";

describe("parsePageRange", () => {
  it("returns all pages for empty or all", () => {
    expect(parsePageRange("", 5)).toEqual([1, 2, 3, 4, 5]);
    expect(parsePageRange("all", 3)).toEqual([1, 2, 3]);
    expect(parsePageRange("  ALL  ", 2)).toEqual([1, 2]);
  });

  it("parses singles and ranges", () => {
    expect(parsePageRange("1, 3, 5", 5)).toEqual([1, 3, 5]);
    expect(parsePageRange("1-3", 5)).toEqual([1, 2, 3]);
    expect(parsePageRange("3-1", 5)).toEqual([1, 2, 3]);
    expect(parsePageRange("1-2, 4", 5)).toEqual([1, 2, 4]);
  });

  it("ignores out-of-range and dedupes", () => {
    expect(parsePageRange("0, 1, 99", 3)).toEqual([1]);
    expect(parsePageRange("2, 2, 2", 3)).toEqual([2]);
  });
});
