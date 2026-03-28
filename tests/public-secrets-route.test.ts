import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  createEncryptedSecretShare: vi.fn(),
  getAppOrigin: vi.fn(),
  getRequestIp: vi.fn(),
  rateLimit: vi.fn(),
  verifyTurnstile: vi.fn()
}));

vi.mock("@/lib/secret-share", () => ({
  createEncryptedSecretShare: mocks.createEncryptedSecretShare
}));

vi.mock("@/lib/request", () => ({
  getAppOrigin: mocks.getAppOrigin,
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

vi.mock("@/lib/turnstile", () => ({
  verifyTurnstile: mocks.verifyTurnstile
}));

const routePromise = import("@/app/api/public/secrets/route");

describe("POST /api/public/secrets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("203.0.113.10");
    mocks.getAppOrigin.mockReturnValue("https://wox-bin.vercel.app");
    mocks.rateLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    mocks.verifyTurnstile.mockResolvedValue({ ok: true, errors: [] });
    mocks.createEncryptedSecretShare.mockResolvedValue({
      slug: "secret123",
      manageToken: "manage-secret-token",
      expiresAt: new Date("2026-04-02T00:00:00.000Z")
    });
  });

  it("returns 429 when anonymous secret publishing is rate limited", async () => {
    mocks.rateLimit.mockResolvedValue({ success: false, reset: Date.now() + 60_000 });

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/secrets", {
        method: "POST",
        body: JSON.stringify({
          payloadCiphertext: "ciphertext",
          payloadIv: "iv",
          expiresPreset: "7-days"
        })
      })
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many anonymous secrets. Try again later."
    });
    expect(mocks.verifyTurnstile).not.toHaveBeenCalled();
  });

  it("creates an encrypted secret link and returns share plus manage URLs", async () => {
    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/secrets", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "user-agent": "Vitest"
        },
        body: JSON.stringify({
          payloadCiphertext: "ciphertext-123",
          payloadIv: "payload-iv",
          burnAfterRead: false,
          expiresPreset: "30-days",
          turnstileToken: "turnstile-pass"
        })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      slug: "secret123",
      shareUrl: "https://wox-bin.vercel.app/s/secret123",
      manageUrl: "https://wox-bin.vercel.app/secret/manage/secret123",
      manageToken: "manage-secret-token",
      expiresAt: "2026-04-02T00:00:00.000Z"
    });
    expect(mocks.verifyTurnstile).toHaveBeenCalledWith("turnstile-pass", "203.0.113.10");
    expect(mocks.createEncryptedSecretShare).toHaveBeenCalledWith({
      payloadCiphertext: "ciphertext-123",
      payloadIv: "payload-iv",
      burnAfterRead: false,
      expiresPreset: "30-days",
      ip: "203.0.113.10",
      userAgent: "Vitest"
    });
  });
});
