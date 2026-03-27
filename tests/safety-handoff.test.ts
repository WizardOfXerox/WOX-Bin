import { describe, expect, it } from "vitest";

import { buildVirusTotalLookupUrl, parseDownloadHandoffTarget } from "@/lib/safety-handoff";

describe("safety handoff helpers", () => {
  it("builds a VirusTotal search URL for the target", () => {
    expect(buildVirusTotalLookupUrl("https://example.com/report?q=1")).toBe(
      "https://www.virustotal.com/gui/search/https%3A%2F%2Fexample.com%2Freport%3Fq%3D1"
    );
  });

  it("accepts same-origin allowed download paths", () => {
    const target = parseDownloadHandoffTarget("/raw/demo?download=1", "https://wox-bin.vercel.app/download-check");

    expect(target?.toString()).toBe("https://wox-bin.vercel.app/raw/demo?download=1");
  });

  it("rejects cross-origin or disallowed download targets", () => {
    expect(parseDownloadHandoffTarget("https://evil.example/test", "https://wox-bin.vercel.app/download-check")).toBeNull();
    expect(parseDownloadHandoffTarget("/app", "https://wox-bin.vercel.app/download-check")).toBeNull();
  });
});
