import { describe, expect, it } from "vitest";

import {
  buildDiscordSiteLinks,
  buildDiscordWelcomeLines,
  normalizeDiscordSiteBaseUrl
} from "@/lib/discord/shared";

describe("discord shared helpers", () => {
  it("normalizes secure and localhost base urls", () => {
    expect(normalizeDiscordSiteBaseUrl("https://wox-bin.vercel.app/")).toBe("https://wox-bin.vercel.app");
    expect(normalizeDiscordSiteBaseUrl("http://localhost:3000/")).toBe("http://localhost:3000");
    expect(normalizeDiscordSiteBaseUrl("http://127.0.0.1:3000/test")).toBe("http://127.0.0.1:3000");
    expect(normalizeDiscordSiteBaseUrl("http://192.168.1.50:3000")).toBe("");
  });

  it("builds stable site links from the base url", () => {
    expect(buildDiscordSiteLinks("https://wox-bin.vercel.app")).toEqual({
      home: "https://wox-bin.vercel.app/",
      workspace: "https://wox-bin.vercel.app/app",
      quick: "https://wox-bin.vercel.app/quick",
      feed: "https://wox-bin.vercel.app/feed",
      archive: "https://wox-bin.vercel.app/archive",
      privacy: "https://wox-bin.vercel.app/privacy-tools",
      support: "https://wox-bin.vercel.app/support",
      bookmarkfs: "https://wox-bin.vercel.app/bookmarkfs"
    });
  });

  it("includes the key onboarding routes in the welcome summary", () => {
    const lines = buildDiscordWelcomeLines("https://wox-bin.vercel.app");
    expect(lines).toHaveLength(6);
    expect(lines.some((line) => line.includes("/app"))).toBe(true);
    expect(lines.some((line) => line.includes("/bookmarkfs/sync"))).toBe(true);
  });
});
