import { describe, expect, it } from "vitest";

import { normalizeOptionalSlug, normalizeTagList, slugify } from "@/lib/utils";

describe("slugify", () => {
  it("normalizes mixed input into URL-safe slugs", () => {
    expect(slugify("Hello, WOX Bin!!!")).toBe("hello-wox-bin");
  });

  it("falls back to paste when the input becomes empty", () => {
    expect(slugify("$$$")).toBe("paste");
  });
});

describe("normalizeTagList", () => {
  it("deduplicates and trims tags", () => {
    expect(normalizeTagList(["  alpha ", "beta", "alpha"])).toEqual(["alpha", "beta"]);
  });

  it("accepts comma-separated strings", () => {
    expect(normalizeTagList("one, two, three")).toEqual(["one", "two", "three"]);
  });
});

describe("normalizeOptionalSlug", () => {
  it("normalizes mixed input without forcing a fallback", () => {
    expect(normalizeOptionalSlug("Hello, WOX Bin!!!")).toBe("hello-wox-bin");
  });

  it("allows blank output when the input becomes empty", () => {
    expect(normalizeOptionalSlug("$$$")).toBe("");
  });
});
