import { describe, expect, it } from "vitest";

import { buildStarterAccountPasteSeed, exampleWorkspaceSnapshot, bigExampleTemplatePaste } from "@/lib/example-data";

describe("example workspace snapshot", () => {
  it("ships with default folders", () => {
    expect(exampleWorkspaceSnapshot.folders).toContain("Notes");
    expect(exampleWorkspaceSnapshot.folders).toContain("Examples");
  });

  it("contains starter pastes for first-run onboarding", () => {
    expect(exampleWorkspaceSnapshot.pastes.length).toBeGreaterThan(0);
    expect(exampleWorkspaceSnapshot.pastes.some((paste) => paste.title.includes("Welcome"))).toBe(true);
  });

  it("exposes the megademo paste for templates and first-account seeding", () => {
    expect(bigExampleTemplatePaste.title).toContain("megademo");
    expect(bigExampleTemplatePaste.language).toBe("markdown");
    expect(bigExampleTemplatePaste.files.length).toBeGreaterThan(0);
  });

  it("builds the first account starter paste from the megademo as a private draft", () => {
    const starter = buildStarterAccountPasteSeed();

    expect(starter.title).toContain("megademo");
    expect(starter.visibility).toBe("private");
    expect(starter.folderName).toBe("Examples");
    expect(starter.files.length).toBe(bigExampleTemplatePaste.files.length);
  });
});
