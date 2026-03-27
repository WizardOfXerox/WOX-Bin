import { describe, expect, it } from "vitest";

const outRoutePromise = import("@/app/out/route");
const downloadRoutePromise = import("@/app/download-check/route");

describe("public safety handoff routes", () => {
  it("redirects invalid outbound targets back home", async () => {
    const { GET } = await outRoutePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/out?to=javascript:alert(1)"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://wox-bin.vercel.app/");
  });

  it("renders the outbound redirect handoff document with same-origin return links", async () => {
    const { GET } = await outRoutePromise;
    const response = await GET(
      new Request("https://wox-bin.vercel.app/out?to=https%3A%2F%2Fexample.com%2Fdownload", {
        headers: {
          referer: "https://wox-bin.vercel.app/feed"
        }
      })
    );

    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(html).toContain("Leaving WOX-Bin");
    expect(html).toContain("https://example.com/download");
    expect(html).toContain("https://www.virustotal.com/gui/search/https%3A%2F%2Fexample.com%2Fdownload");
    expect(html).toContain("https://wox-bin.vercel.app/feed");
  });

  it("rejects disallowed download targets", async () => {
    const { GET } = await downloadRoutePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/download-check?to=%2Fapp"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://wox-bin.vercel.app/");
  });

  it("renders the download handoff for same-origin raw/file targets", async () => {
    const { GET } = await downloadRoutePromise;
    const response = await GET(
      new Request(
        "https://wox-bin.vercel.app/download-check?to=%2Fraw%2Fdemo123&label=demo.txt",
        {
          headers: {
            referer: "https://evil.example/not-used"
          }
        }
      )
    );

    const html = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
    expect(html).toContain("Download safety check");
    expect(html).toContain("demo.txt");
    expect(html).toContain("https://wox-bin.vercel.app/raw/demo123");
    expect(html).toContain("https://wox-bin.vercel.app/");
    expect(html).toContain("Download immediately");
  });
});
