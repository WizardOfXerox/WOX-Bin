import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  deleteClipboardBucket: vi.fn(),
  getAppOrigin: vi.fn(),
  getClipboardBucket: vi.fn(),
  getRequestIp: vi.fn(),
  rateLimit: vi.fn(),
  saveClipboardBucket: vi.fn()
}));

vi.mock("@/lib/request", () => ({
  getAppOrigin: mocks.getAppOrigin,
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

vi.mock("@/lib/public-drops", async () => {
  const actual = await vi.importActual<typeof import("@/lib/public-drops")>("@/lib/public-drops");
  return {
    ...actual,
    deleteClipboardBucket: mocks.deleteClipboardBucket,
    getClipboardBucket: mocks.getClipboardBucket,
    saveClipboardBucket: mocks.saveClipboardBucket
  };
});

const routePromise = import("@/app/api/public/clipboard/[slug]/route");

describe("POST /api/public/clipboard/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("203.0.113.44");
    mocks.getAppOrigin.mockReturnValue("https://wox-bin.vercel.app");
    mocks.rateLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    mocks.saveClipboardBucket.mockResolvedValue({
      slug: "opsdesk",
      urlPath: "/c/opsdesk",
      created: true,
      manageToken: "bucket-manage-token",
      expiresAt: "2026-03-29T00:00:00.000Z"
    });
  });

  it("stores encrypted clipboard buckets without plaintext content", async () => {
    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/clipboard/opsdesk", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Vitest"
        },
        body: JSON.stringify({
          content: "",
          expires: "12",
          burnAfterRead: true,
          token: "bucket-manage-token",
          encrypted: true,
          payloadCiphertext: "clipboard-ciphertext",
          payloadIv: "clipboard-iv"
        })
      }),
      {
        params: Promise.resolve({ slug: "opsdesk" })
      }
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      slug: "opsdesk",
      url: "https://wox-bin.vercel.app/c/opsdesk",
      expiresAt: "2026-03-29T00:00:00.000Z",
      created: true,
      manageToken: "bucket-manage-token"
    });
    expect(mocks.saveClipboardBucket).toHaveBeenCalledWith({
      slug: "opsdesk",
      content: "",
      expires: "12",
      burnAfterRead: true,
      token: "bucket-manage-token",
      encrypted: true,
      payloadCiphertext: "clipboard-ciphertext",
      payloadIv: "clipboard-iv",
      ip: "203.0.113.44",
      userAgent: "Vitest"
    });
  });
});
