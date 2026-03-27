import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  headers: vi.fn(),
  hashIp: vi.fn(),
  update: vi.fn()
}));

const schema = vi.hoisted(() => ({
  browserSessions: {
    id: Symbol("browserSessions.id")
  }
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("next/headers", () => ({
  headers: mocks.headers
}));

vi.mock("@/lib/crypto", () => ({
  hashIp: mocks.hashIp
}));

vi.mock("@/lib/db/schema", () => schema);

vi.mock("@/lib/db", () => ({
  db: {
    update: mocks.update
  }
}));

const routePromise = import("@/app/api/settings/sessions/touch/route");

describe("POST /api/settings/sessions/touch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.hashIp.mockReturnValue("hashed-ip");
    mocks.headers.mockResolvedValue({
      get(name: string) {
        return name === "x-forwarded-for" ? "203.0.113.10, 10.0.0.2" : null;
      }
    });
  });

  it("rejects callers without an active browser session", async () => {
    mocks.auth.mockResolvedValue(null);

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://example.com/api/settings/sessions/touch", {
        method: "POST",
        body: JSON.stringify({ userAgent: "Mozilla/5.0" })
      })
    );

    expect(response.status).toBe(401);
    await expect(response.json()).resolves.toEqual({ error: "Unauthorized." });
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it("touches the current browser session with metadata", async () => {
    mocks.auth.mockResolvedValue({
      user: {
        browserSessionId: "browser-session-123"
      }
    });

    const where = vi.fn().mockResolvedValue(undefined);
    const set = vi.fn().mockReturnValue({ where });
    mocks.update.mockReturnValue({ set });

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://example.com/api/settings/sessions/touch", {
        method: "POST",
        body: JSON.stringify({ userAgent: "Mozilla/5.0 (X11; Linux x86_64)" })
      })
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true });
    expect(mocks.update).toHaveBeenCalledWith(schema.browserSessions);
    expect(set).toHaveBeenCalledWith({
      lastSeenAt: expect.any(Date),
      userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
      ipHash: "hashed-ip"
    });
    expect(where).toHaveBeenCalledTimes(1);
  });
});
