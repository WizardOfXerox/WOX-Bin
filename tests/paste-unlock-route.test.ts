import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  rateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  getPasteForViewer: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

vi.mock("@/lib/request", () => ({
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/paste-service", () => ({
  getPasteForViewer: mocks.getPasteForViewer
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn().mockResolvedValue({
    get: vi.fn().mockReturnValue(undefined)
  })
}));

const routePromise = import("@/app/api/pastes/[slug]/unlock/route");

describe("POST /api/pastes/[slug]/unlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue(null);
    mocks.getRequestIp.mockReturnValue("198.51.100.22");
    mocks.rateLimit.mockResolvedValue({ success: true, limit: 10, remaining: 9, reset: Date.now() + 60_000 });
  });

  it("returns 429 when unlock attempts exceed rate limit", async () => {
    mocks.rateLimit.mockResolvedValue({ success: false, limit: 10, remaining: 0, reset: Date.now() + 60_000 });

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/pastes/test-paste/unlock", {
        method: "POST",
        body: JSON.stringify({ password: "wrong" })
      }),
      { params: Promise.resolve({ slug: "test-paste" }) }
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many unlock attempts. Try again later."
    });
    expect(mocks.rateLimit).toHaveBeenCalledWith("paste-unlock", "198.51.100.22:test-paste");
  });
});
