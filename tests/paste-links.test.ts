import { describe, expect, it } from "vitest";

import { getPasteSharePath, getPasteShareUrl } from "@/lib/paste-links";

describe("paste links", () => {
  it("builds the normal public paste route", () => {
    expect(getPasteSharePath("demo-paste", false)).toBe("/p/demo-paste");
    expect(getPasteShareUrl("https://example.com", "demo-paste", false)).toBe(
      "https://example.com/p/demo-paste"
    );
  });

  it("builds the secret paste route", () => {
    expect(getPasteSharePath("demo-paste", true)).toBe("/s/demo-paste");
    expect(getPasteShareUrl("https://example.com", "demo-paste", true)).toBe(
      "https://example.com/s/demo-paste"
    );
  });
});
