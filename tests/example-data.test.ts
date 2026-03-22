import { describe, expect, it } from "vitest";

import { exampleWorkspaceSnapshot } from "@/lib/example-data";

describe("example workspace snapshot", () => {
  it("ships with default folders", () => {
    expect(exampleWorkspaceSnapshot.folders).toContain("Notes");
    expect(exampleWorkspaceSnapshot.folders).toContain("Examples");
  });

  it("contains starter pastes for first-run onboarding", () => {
    expect(exampleWorkspaceSnapshot.pastes.length).toBeGreaterThan(0);
    expect(exampleWorkspaceSnapshot.pastes.some((paste) => paste.title.includes("Welcome"))).toBe(true);
  });
});
