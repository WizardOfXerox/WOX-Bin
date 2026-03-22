import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  select: vi.fn(),
  transaction: vi.fn(),
  rateLimit: vi.fn(),
  hashPassword: vi.fn(),
  logAudit: vi.fn(),
  getRequestIp: vi.fn()
}));

const schema = vi.hoisted(() => ({
  users: { id: Symbol("users.id"), passwordHash: Symbol("users.passwordHash"), updatedAt: Symbol("users.updatedAt") },
  passwordResetTokens: {
    id: Symbol("passwordResetTokens.id"),
    userId: Symbol("passwordResetTokens.userId"),
    tokenHash: Symbol("passwordResetTokens.tokenHash"),
    expiresAt: Symbol("passwordResetTokens.expiresAt")
  },
  browserSessions: {
    userId: Symbol("browserSessions.userId"),
    revokedAt: Symbol("browserSessions.revokedAt")
  }
}));

vi.mock("@/lib/db", () => ({
  db: {
    select: mocks.select,
    transaction: mocks.transaction
  }
}));

vi.mock("@/lib/db/schema", () => schema);

vi.mock("@/lib/crypto", () => ({
  hashPassword: mocks.hashPassword,
  hashToken: vi.fn(() => "hashed-token")
}));

vi.mock("@/lib/rate-limit", () => ({
  rateLimit: mocks.rateLimit
}));

vi.mock("@/lib/request", () => ({
  getRequestIp: mocks.getRequestIp
}));

vi.mock("@/lib/audit", () => ({
  logAudit: mocks.logAudit
}));

const routePromise = import("@/app/api/auth/reset-password/route");

describe("POST /api/auth/reset-password", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.rateLimit.mockResolvedValue({ success: true });
    mocks.getRequestIp.mockReturnValue("127.0.0.1");
    mocks.hashPassword.mockResolvedValue("new-password-hash");
    mocks.logAudit.mockResolvedValue(undefined);
  });

  it("revokes active browser sessions after resetting the password", async () => {
    const limit = vi.fn().mockResolvedValue([{ id: "reset-token-1", userId: "user-123" }]);
    const where = vi.fn().mockReturnValue({ limit });
    const from = vi.fn().mockReturnValue({ where });
    mocks.select.mockReturnValue({ from });

    const updateUserWhere = vi.fn().mockResolvedValue(undefined);
    const updateUserSet = vi.fn().mockReturnValue({ where: updateUserWhere });

    const updateSessionWhere = vi.fn().mockResolvedValue(undefined);
    const updateSessionSet = vi.fn().mockReturnValue({ where: updateSessionWhere });

    const update = vi.fn((table: unknown) => {
      if (table === schema.users) {
        return { set: updateUserSet };
      }
      if (table === schema.browserSessions) {
        return { set: updateSessionSet };
      }
      throw new Error("Unexpected update target");
    });

    const deleteWhere = vi.fn().mockResolvedValue(undefined);
    const del = vi.fn((table: unknown) => {
      if (table === schema.passwordResetTokens) {
        return { where: deleteWhere };
      }
      throw new Error("Unexpected delete target");
    });

    mocks.transaction.mockImplementation(async (callback: (tx: { update: typeof update; delete: typeof del }) => Promise<void>) =>
      callback({ update, delete: del })
    );

    const { POST } = await routePromise;
    const response = await POST(
      new Request("https://example.com/api/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({
          token: "12345678901234567890123456789012",
          password: "super-secure-password"
        })
      })
    );

    expect(response.status).toBe(200);
    expect(mocks.hashPassword).toHaveBeenCalledWith("super-secure-password");
    expect(update).toHaveBeenCalledWith(schema.users);
    expect(update).toHaveBeenCalledWith(schema.browserSessions);
    expect(updateSessionSet).toHaveBeenCalledWith({
      revokedAt: expect.any(Date)
    });
    expect(updateSessionWhere).toHaveBeenCalledTimes(1);
    expect(deleteWhere).toHaveBeenCalledTimes(1);
    expect(mocks.logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorUserId: "user-123",
        action: "auth.password_reset_completed",
        ip: "127.0.0.1"
      })
    );
  });
});
