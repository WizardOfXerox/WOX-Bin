import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cookies: vi.fn(),
  getPasteForViewer: vi.fn(),
  publicScrapeRateGate: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("next/headers", () => ({
  cookies: mocks.cookies
}));

vi.mock("@/lib/public-scrape", () => ({
  publicScrapeRateGate: mocks.publicScrapeRateGate
}));

vi.mock("@/lib/paste-service", () => ({
  getPasteForViewer: mocks.getPasteForViewer
}));

const routePromise = import("@/app/file/[slug]/[index]/route");

describe("GET & OPTIONS /file/[slug]/[index] CORS and MIME resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(null);
    mocks.cookies.mockResolvedValue({
      get: vi.fn().mockReturnValue(null)
    });
    mocks.publicScrapeRateGate.mockResolvedValue({
      ok: true,
      rateHeaders: {},
      ctx: { tier: "anonymous" }
    });
  });

  it("handles OPTIONS preflight requests on file attachments", async () => {
    const { OPTIONS } = await routePromise;
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, HEAD, OPTIONS");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("serves image attachments inline with CORS and CORP headers", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: {
        id: "p1",
        slug: "demo",
        files: [
          {
            filename: "photo.png",
            content: Buffer.from("fake-png-data").toString("base64"),
            language: "none",
            mediaKind: "image",
            mimeType: "image/png"
          }
        ]
      },
      locked: false
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/file/demo/0"), {
      params: Promise.resolve({ slug: "demo", index: "0" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    // Should NOT have attachment disposition (served inline)
    expect(response.headers.get("Content-Disposition")).toBeNull();
  });

  it("serves attached CSS files inline with proper MIME type and CORS headers", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: {
        id: "p2",
        slug: "bundle",
        files: [
          {
            filename: "theme.css",
            content: "a { text-decoration: underline; }",
            language: "css",
            mediaKind: null,
            mimeType: "text/plain"
          }
        ]
      },
      locked: false
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/file/bundle/0"), {
      params: Promise.resolve({ slug: "bundle", index: "0" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    expect(response.headers.get("Content-Disposition")).toBeNull();
  });

  it("forces Content-Disposition: attachment when download=1 is requested", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: {
        id: "p3",
        slug: "bundle",
        files: [
          {
            filename: "theme.css",
            content: "a { text-decoration: underline; }",
            language: "css",
            mediaKind: null,
            mimeType: "text/css"
          }
        ]
      },
      locked: false
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/file/bundle/0?download=1"), {
      params: Promise.resolve({ slug: "bundle", index: "0" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toContain("attachment; filename=");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
  });
});
