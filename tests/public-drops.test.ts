import { describe, expect, it } from "vitest";

import {
  buildFileDropPath,
  buildTermbinPath,
  FILE_DROP_MAX_HOURS,
  FILE_DROP_MIN_HOURS,
  parseDropExpires
} from "@/lib/public-drops";

describe("public drops", () => {
  it("builds stable drop paths", () => {
    expect(buildTermbinPath("abc123")).toBe("/t/abc123");
    expect(buildFileDropPath("abc123", "image.png")).toBe("/x/abc123/image.png");
  });

  it("clamps expiry windows into the supported range", () => {
    const min = parseDropExpires("0.25", 24);
    const max = parseDropExpires(String(FILE_DROP_MAX_HOURS * 10), 24);
    const now = Date.now();

    expect(min.getTime()).toBeGreaterThanOrEqual(now + FILE_DROP_MIN_HOURS * 60 * 60 * 1000 - 5_000);
    expect(max.getTime()).toBeLessThanOrEqual(now + FILE_DROP_MAX_HOURS * 60 * 60 * 1000 + 5_000);
  });
});
