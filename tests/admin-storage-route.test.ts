import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdminSession: vi.fn(),
  getStorageReport: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminSession: mocks.isAdminSession
}));

vi.mock("@/lib/storage-report", () => ({
  getStorageReport: mocks.getStorageReport
}));

const routePromise = import("@/app/api/admin/storage/route");

describe("GET /api/admin/storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.isAdminSession.mockReturnValue(false);

    const { GET } = await routePromise;
    const response = await GET();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Admin access required." });
    expect(mocks.getStorageReport).not.toHaveBeenCalled();
  });

  it("returns the storage report for admins", async () => {
    const report = {
      generatedAt: "2026-03-29T02:00:00.000Z",
      database: {
        name: "neondb",
        usedBytes: 11_157_504,
        nominalCapBytes: 536_870_912,
        remainingBytes: 525_713_408,
        usedPercent: 2.08,
        status: "healthy"
      },
      quotas: {
        freePlanStorageBytes: 262_144_000,
        trackedHostedBytes: 249_920,
        untrackedBytesEstimate: 10_907_584
      },
      hotspots: {
        uploadedAvatarCount: 0,
        uploadedAvatarBytes: 0,
        externalAvatarCount: 0,
        pasteVersionBytes: 130_488,
        publicDropInlineBytes: 120,
        supportAttachmentBytes: 48,
        browserSessionRows: 45,
        activeBrowserSessions: 13,
        revokedBrowserSessions: 32,
        publicDropObjectStorageEnabled: false
      },
      tables: [
        {
          schema: "public",
          tableName: "paste_files",
          approxRows: 31,
          totalBytes: 294_912,
          tableBytes: 188_416,
          indexToastBytes: 106_496
        }
      ],
      warnings: [
        {
          level: "warn",
          title: "Public file drops can still land in Postgres",
          detail: "The public-drop object-storage flag is off."
        }
      ]
    };

    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.isAdminSession.mockReturnValue(true);
    mocks.getStorageReport.mockResolvedValue(report);

    const { GET } = await routePromise;
    const response = await GET();

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(report);
    expect(mocks.getStorageReport).toHaveBeenCalledTimes(1);
  });
});
