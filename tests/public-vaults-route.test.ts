import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  checkEdgeRateLimit: vi.fn(),
  createFileDrop: vi.fn(),
  getAppOrigin: vi.fn(),
  getRequestIp: vi.fn(),
  rateLimit: vi.fn()
}));

vi.mock("@/lib/firewall", () => ({
  checkEdgeRateLimit: mocks.checkEdgeRateLimit
}));

vi.mock("@/lib/public-drops", async () => {
  const actual = await vi.importActual<typeof import("@/lib/public-drops")>("@/lib/public-drops");
  return {
    ...actual,
    createFileDrop: mocks.createFileDrop
  };
});

vi.mock("@/lib/request", () => ({
  getAppOrigin: mocks.getAppOrigin,
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

const routePromise = import("@/app/api/public/vaults/route");

describe("POST /api/public/vaults", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("198.51.100.12");
    mocks.getAppOrigin.mockReturnValue("https://wox-bin.vercel.app");
    mocks.checkEdgeRateLimit.mockResolvedValue({ configured: true, rateLimited: false });
    mocks.rateLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    mocks.createFileDrop.mockResolvedValue({
      slug: "vault123",
      filename: "encrypted.bin",
      deleteToken: "drop-manage-token",
      urlPath: "/x/vault123/encrypted.bin",
      expiresAt: "2026-04-03T00:00:00.000Z"
    });
  });

  it("returns 429 when the edge firewall rate limit trips", async () => {
    mocks.checkEdgeRateLimit.mockResolvedValue({ configured: true, rateLimited: true });

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/vaults", {
        method: "POST",
        body: new FormData()
      })
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Rate limit exceeded. Try again later."
    });
    expect(mocks.createFileDrop).not.toHaveBeenCalled();
  });

  it("uploads encrypted file vault metadata and ciphertext", async () => {
    const form = new FormData();
    form.set("file", new File([Uint8Array.from([1, 2, 3])], "plans.pdf", { type: "application/pdf" }));
    form.set("metadataCiphertext", "meta-ciphertext");
    form.set("metadataIv", "meta-iv");
    form.set("payloadIv", "payload-iv");
    form.set("expires", "72");

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/public/vaults", {
        method: "POST",
        headers: {
          "user-agent": "Vitest"
        },
        body: form
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({
      slug: "vault123",
      shareUrl: "https://wox-bin.vercel.app/v/vault123",
      rawUrl: "https://wox-bin.vercel.app/x/vault123/encrypted.bin",
      manageUrl: "https://wox-bin.vercel.app/v/manage/vault123",
      manageToken: "drop-manage-token",
      expiresAt: "2026-04-03T00:00:00.000Z"
    });
    expect(mocks.createFileDrop).toHaveBeenCalledWith({
      filename: "plans.pdf",
      mimeType: "application/octet-stream",
      contentBase64: "AQID",
      sizeBytes: 3,
      secret: true,
      encrypted: true,
      payloadIv: "payload-iv",
      metadataCiphertext: "meta-ciphertext",
      metadataIv: "meta-iv",
      expires: "72",
      ip: "198.51.100.12",
      userAgent: "Vitest"
    });
  });
});
