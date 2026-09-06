import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getPasteForViewer: vi.fn(),
  getAppOrigin: vi.fn()
}));

vi.mock("@/lib/paste-service", () => ({
  getPasteForViewer: mocks.getPasteForViewer
}));

vi.mock("@/lib/request", () => ({
  getAppOrigin: mocks.getAppOrigin
}));

const oembedRoutePromise = import("@/app/api/oembed/route");

describe("GET /api/oembed", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAppOrigin.mockReturnValue("https://wox-bin.vercel.app");
  });

  it("returns 400 when 'url' query parameter is missing", async () => {
    const { GET } = await oembedRoutePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/api/oembed"));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Query parameter 'url' is required."
    });
  });

  it("returns 404 when target URL does not match /p/[slug] pattern", async () => {
    const { GET } = await oembedRoutePromise;
    const response = await GET(
      new Request("https://wox-bin.vercel.app/api/oembed?url=https://wox-bin.vercel.app/other/path")
    );
    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Unsupported URL path. Expected /p/[slug]."
    });
  });

  it("returns rich oEmbed JSON metadata for valid public paste", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: {
        slug: "cool-script",
        title: "Super Fast Algorithm",
        content: "function test() {}",
        language: "typescript",
        author: {
          username: "alice",
          displayName: "Alice Dev"
        }
      }
    });

    const { GET } = await oembedRoutePromise;
    const response = await GET(
      new Request(
        "https://wox-bin.vercel.app/api/oembed?url=https://wox-bin.vercel.app/p/cool-script&format=json"
      )
    );

    expect(response.status).toBe(200);
    const json = await response.json();
    expect(json).toMatchObject({
      version: "1.0",
      type: "rich",
      provider_name: "WOX-Bin",
      provider_url: "https://wox-bin.vercel.app",
      title: "Super Fast Algorithm",
      author_name: "Alice Dev",
      author_url: "https://wox-bin.vercel.app/u/alice",
      thumbnail_url: "https://wox-bin.vercel.app/api/og/paste/cool-script",
      thumbnail_width: 1200,
      thumbnail_height: 630
    });
    expect(json.html).toContain("<iframe");
  });

  it("returns 404 when paste is not found or inaccessible", async () => {
    mocks.getPasteForViewer.mockResolvedValue({
      paste: null
    });

    const { GET } = await oembedRoutePromise;
    const response = await GET(
      new Request(
        "https://wox-bin.vercel.app/api/oembed?url=https://wox-bin.vercel.app/p/nonexistent-paste"
      )
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Paste not found or inaccessible."
    });
  });
});
