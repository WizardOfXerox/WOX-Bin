import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  rateLimit: vi.fn(),
  getRequestIp: vi.fn(),
  isSmtpConfigured: vi.fn(),
  sendMail: vi.fn(),
  findFirst: vi.fn(),
  deleteWhere: vi.fn(),
  insertValues: vi.fn()
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

vi.mock("@/lib/request", () => ({
  getRequestIp: mocks.getRequestIp,
  getAppOrigin: vi.fn(() => "https://example.com")
}));

vi.mock("@/lib/mail", () => ({
  isSmtpConfigured: mocks.isSmtpConfigured,
  sendMail: mocks.sendMail
}));

vi.mock("@/lib/security-timing", () => ({
  withMinimumDuration: vi.fn(async (_ms: number, callback: () => Promise<Response>) => callback())
}));

vi.mock("@/lib/db", () => ({
  db: {
    query: {
      users: {
        findFirst: mocks.findFirst
      }
    },
    delete: vi.fn(() => ({
      where: mocks.deleteWhere
    })),
    insert: vi.fn(() => ({
      values: mocks.insertValues
    }))
  }
}));

const routePromise = import("@/app/api/auth/forgot-password/route");

describe("POST /api/auth/forgot-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ success: true, reset: Date.now() + 60_000 });
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.isSmtpConfigured.mockReturnValue(true);
    mocks.sendMail.mockResolvedValue({ ok: true });
    mocks.findFirst.mockResolvedValue(null);
    mocks.deleteWhere.mockResolvedValue(undefined);
    mocks.insertValues.mockResolvedValue(undefined);
  });

  it("returns 503 when SMTP is not configured", async () => {
    mocks.isSmtpConfigured.mockReturnValue(false);

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://example.com/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "user@example.com" })
      })
    );

    expect(response.status).toBe(503);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining("Password reset email is not configured")
    });
  });

  it("returns the generic success message when no password user exists for the email", async () => {
    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://example.com/api/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: "missing@example.com" })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      message: expect.stringContaining("If an account with that email exists")
    });
    expect(mocks.sendMail).not.toHaveBeenCalled();
  });
});
