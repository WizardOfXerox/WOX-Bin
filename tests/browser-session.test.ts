import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  delete: vi.fn()
}));

const schema = vi.hoisted(() => ({
  browserSessions: {
    id: Symbol("browserSessions.id"),
    userId: Symbol("browserSessions.userId"),
    lastSeenAt: Symbol("browserSessions.lastSeenAt"),
    revokedAt: Symbol("browserSessions.revokedAt")
  }
}));

vi.mock("@/lib/db", () => ({
  db: {
    delete: mocks.delete
  }
}));

vi.mock("@/lib/db/schema", () => schema);

const modulePromise = import("@/lib/browser-session");

describe("browser session pruning", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves expected stale and revoked cutoffs", async () => {
    const now = new Date("2026-03-29T00:00:00.000Z");
    const { resolveExpiredBrowserSessionCutoff, resolveRevokedBrowserSessionCutoff } = await modulePromise;

    expect(resolveExpiredBrowserSessionCutoff(now).toISOString()).toBe("2026-02-27T00:00:00.000Z");
    expect(resolveRevokedBrowserSessionCutoff(now).toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("returns zero when nothing is pruned", async () => {
    const returning = vi.fn().mockResolvedValue([]);
    const where = vi.fn().mockReturnValue({ returning });
    mocks.delete.mockReturnValue({ where });

    const { pruneBrowserSessions } = await modulePromise;
    await expect(
      pruneBrowserSessions({
        userId: "user-123",
        keepSessionId: "session-keep",
        now: new Date("2026-03-29T00:00:00.000Z")
      })
    ).resolves.toBe(0);

    expect(mocks.delete).toHaveBeenCalledWith(schema.browserSessions);
    expect(where).toHaveBeenCalledTimes(1);
    expect(returning).toHaveBeenCalledWith({ id: schema.browserSessions.id });
  });

  it("returns the deleted row count", async () => {
    const returning = vi.fn().mockResolvedValue([{ id: "a" }, { id: "b" }]);
    const where = vi.fn().mockReturnValue({ returning });
    mocks.delete.mockReturnValue({ where });

    const { pruneBrowserSessionsForUser } = await modulePromise;
    await expect(pruneBrowserSessionsForUser("user-123", "session-keep")).resolves.toBe(2);
  });
});
