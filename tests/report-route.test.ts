import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  createReport: vi.fn(),
  getRequestIp: vi.fn(),
  rateLimit: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/paste-service", () => ({
  createReport: mocks.createReport
}));

vi.mock("@/lib/request", () => ({
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

const routePromise = import("@/app/api/reports/route");

describe("POST /api/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.rateLimit.mockResolvedValue({ success: true, limit: 12, remaining: 11, reset: Date.now() + 60_000 });
  });

  it("rate limits excessive report submissions", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.rateLimit.mockResolvedValue({
      success: false,
      limit: 12,
      remaining: 0,
      reset: Date.now() + 90_000
    });

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pasteSlug: "demo", reason: "spam" })
      })
    );

    expect(response.status).toBe(429);
    await expect(response.json()).resolves.toEqual({
      error: "Too many reports submitted. Please wait before sending another one.",
      retryAfter: expect.any(Number)
    });
    expect(mocks.createReport).not.toHaveBeenCalled();
  });

  it("creates a report with the viewer identity when allowed", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-1", role: "user" } });
    mocks.createReport.mockResolvedValue({ id: 99 });

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pasteSlug: "demo", reason: "spam", notes: "looks automated" })
      })
    );

    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true, reportId: 99 });
    expect(mocks.rateLimit).toHaveBeenCalledWith("report", "user:user-1");
    expect(mocks.createReport).toHaveBeenCalledWith({
      pasteSlug: "demo",
      reason: "spam",
      notes: "looks automated",
      reporterUserId: "user-1",
      ip: "127.0.0.1"
    });
  });

  it("returns not found when the target paste does not exist", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.createReport.mockRejectedValue(new Error("Paste not found."));

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://wox-bin.vercel.app/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pasteSlug: "missing-paste", reason: "spam" })
      })
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Paste not found." });
  });
});
