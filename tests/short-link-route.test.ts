import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolvePrivacyShortLink: vi.fn()
}));

vi.mock("@/lib/privacy-suite", () => ({
  resolvePrivacyShortLink: mocks.resolvePrivacyShortLink
}));

const routePromise = import("@/app/go/[slug]/route");

describe("GET /go/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects missing short links back to the privacy tools hub", async () => {
    mocks.resolvePrivacyShortLink.mockResolvedValue(null);

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/go/missing"), {
      params: Promise.resolve({ slug: "missing" })
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("https://wox-bin.vercel.app/privacy-tools");
    expect(mocks.resolvePrivacyShortLink).toHaveBeenCalledWith("missing", true);
  });

  it("routes valid short links through the privacy handoff with no-referrer headers", async () => {
    mocks.resolvePrivacyShortLink.mockResolvedValue({
      slug: "demo123",
      destinationUrl: "https://example.com/report?q=1"
    });

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/go/demo123"), {
      params: Promise.resolve({ slug: "demo123" })
    });

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe(
      "https://wox-bin.vercel.app/out?to=https%3A%2F%2Fexample.com%2Freport%3Fq%3D1&via=short-link&slug=demo123"
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(response.headers.get("Referrer-Policy")).toBe("no-referrer");
    expect(response.headers.get("X-Robots-Tag")).toBe("noindex, nofollow");
  });
});
