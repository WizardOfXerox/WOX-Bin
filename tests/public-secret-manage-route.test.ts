import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getEncryptedSecretManageSnapshot: vi.fn(),
  getRequestIp: vi.fn(),
  manageEncryptedSecretShare: vi.fn(),
  rateLimit: vi.fn()
}));

vi.mock("@/lib/secret-share", () => ({
  getEncryptedSecretManageSnapshot: mocks.getEncryptedSecretManageSnapshot,
  manageEncryptedSecretShare: mocks.manageEncryptedSecretShare
}));

vi.mock("@/lib/request", () => ({
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

const routePromise = import("@/app/api/public/secrets/[slug]/manage/route");

describe("/api/public/secrets/[slug]/manage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("198.51.100.7");
    mocks.rateLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    mocks.getEncryptedSecretManageSnapshot.mockResolvedValue({
      slug: "secret123",
      status: "active",
      viewCount: 1,
      burnAfterRead: true,
      createdAt: new Date("2026-03-28T00:00:00.000Z"),
      expiresAt: new Date("2026-04-02T00:00:00.000Z"),
      updatedAt: new Date("2026-03-28T00:00:00.000Z"),
      deletedAt: null,
      lastViewedAt: null
    });
    mocks.manageEncryptedSecretShare.mockResolvedValue(undefined);
  });

  it("requires a management token for status lookups", async () => {
    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/api/public/secrets/secret123/manage"), {
      params: Promise.resolve({ slug: "secret123" })
    });

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({
      error: "Management token is required."
    });
    expect(mocks.getEncryptedSecretManageSnapshot).not.toHaveBeenCalled();
  });

  it("returns the encrypted secret management snapshot", async () => {
    const { GET } = await routePromise;
    const response = await GET(
      new Request("https://wox-bin.vercel.app/api/public/secrets/secret123/manage", {
        headers: {
          "x-manage-token": "manage-secret-token"
        }
      }),
      {
        params: Promise.resolve({ slug: "secret123" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      slug: "secret123",
      status: "active",
      viewCount: 1,
      burnAfterRead: true
    });
    expect(mocks.getEncryptedSecretManageSnapshot).toHaveBeenCalledWith("secret123", "manage-secret-token");
  });

  it("applies revoke and expiry actions with the provided token", async () => {
    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/secrets/secret123/manage", {
        method: "POST",
        body: JSON.stringify({
          token: "manage-secret-token",
          action: "update_expiry",
          expiresPreset: "7-days"
        })
      }),
      {
        params: Promise.resolve({ slug: "secret123" })
      }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      status: "active"
    });
    expect(mocks.manageEncryptedSecretShare).toHaveBeenCalledWith({
      slug: "secret123",
      token: "manage-secret-token",
      action: "update_expiry",
      expiresPreset: "7-days"
    });
  });
});
