import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getRequestIp: vi.fn(),
  rateLimit: vi.fn(),
  recordEncryptedSecretShareView: vi.fn()
}));

vi.mock("@/lib/request", () => ({
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

vi.mock("@/lib/secret-share", () => ({
  recordEncryptedSecretShareView: mocks.recordEncryptedSecretShareView
}));

const routePromise = import("@/app/api/public/secrets/[slug]/view/route");

describe("POST /api/public/secrets/[slug]/view", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("198.51.100.7");
    mocks.rateLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    mocks.recordEncryptedSecretShareView.mockResolvedValue({
      viewCount: 2,
      lastViewedAt: new Date("2026-03-28T12:00:00.000Z"),
      status: "deleted"
    });
  });

  it("records a successful encrypted secret open", async () => {
    const { POST } = await routePromise;
    const response = await POST(new Request("https://wox-bin.vercel.app/api/public/secrets/secret123/view", { method: "POST" }), {
      params: Promise.resolve({ slug: "secret123" })
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      viewCount: 2,
      status: "deleted",
      lastViewedAt: "2026-03-28T12:00:00.000Z"
    });
    expect(mocks.recordEncryptedSecretShareView).toHaveBeenCalledWith("secret123");
  });

  it("returns not found when the encrypted secret is gone", async () => {
    mocks.recordEncryptedSecretShareView.mockResolvedValueOnce(null);

    const { POST } = await routePromise;
    const response = await POST(new Request("https://wox-bin.vercel.app/api/public/secrets/missing/view", { method: "POST" }), {
      params: Promise.resolve({ slug: "missing" })
    });

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({
      error: "Secret link not found."
    });
  });
});
