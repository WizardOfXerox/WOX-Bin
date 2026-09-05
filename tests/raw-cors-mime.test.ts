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

const routePromise = import("@/app/raw/[slug]/route");

describe("GET & OPTIONS /raw/[slug] CORS and MIME resolution", () => {
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

  it("handles OPTIONS preflight requests with CORS & CORP headers", async () => {
    const { OPTIONS } = await routePromise;
    const response = await OPTIONS();

    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Access-Control-Allow-Methods")).toBe("GET, HEAD, OPTIONS");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("serves CSS pastes with text/css Content-Type and CORS headers", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: {
        id: "p1",
        slug: "christmas_theme",
        title: "Christmas Theme",
        content: ":root { --theme-color: red; }",
        language: "css",
        files: [],
        encryptedShare: false
      },
      locked: false
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/raw/christmas_theme"), {
      params: Promise.resolve({ slug: "christmas_theme" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    await expect(response.text()).resolves.toBe(":root { --theme-color: red; }");
  });

  it("serves JavaScript pastes with text/javascript Content-Type and CORS headers", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: {
        id: "p2",
        slug: "widget_script",
        title: "Widget Script",
        content: "console.log('wox-bin loaded');",
        language: "javascript",
        files: [],
        encryptedShare: false
      },
      locked: false
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/raw/widget_script"), {
      params: Promise.resolve({ slug: "widget_script" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/javascript; charset=utf-8");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });

  it("infers MIME type from title extension when language is none", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: {
        id: "p3",
        slug: "custom_styles",
        title: "custom_styles.css",
        content: "body { background: black; }",
        language: "none",
        files: [],
        encryptedShare: false
      },
      locked: false
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/raw/custom_styles"), {
      params: Promise.resolve({ slug: "custom_styles" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
  });

  it("resolves base slug with extension fallback when requested as /raw/slug.css", async () => {
    // First call with "theme.css" returns null (not found directly as a slug)
    // Second call with base "theme" succeeds
    mocks.getPasteForViewer.mockImplementation(async ({ slug }) => {
      if (slug === "theme") {
        return {
          paste: {
            id: "p4",
            slug: "theme",
            title: "Theme",
            content: "div { color: green; }",
            language: "none",
            files: [],
            encryptedShare: false
          },
          locked: false
        };
      }
      return { paste: null, locked: false };
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/raw/theme.css"), {
      params: Promise.resolve({ slug: "theme.css" })
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("text/css; charset=utf-8");
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
    await expect(response.text()).resolves.toBe("div { color: green; }");
  });

  it("includes CORS headers even on 404 responses", async () => {
    mocks.getPasteForViewer.mockResolvedValue({ paste: null, locked: false });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/raw/nonexistent"), {
      params: Promise.resolve({ slug: "nonexistent" })
    });

    expect(response.status).toBe(404);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("*");
    expect(response.headers.get("Cross-Origin-Resource-Policy")).toBe("cross-origin");
  });
});
