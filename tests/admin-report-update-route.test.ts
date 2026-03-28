import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdminSession: vi.fn(),
  updateReportStatus: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminSession: mocks.isAdminSession
}));

vi.mock("@/lib/report-service", () => ({
  REPORT_STATUSES: ["open", "reviewed", "resolved"],
  updateReportStatus: mocks.updateReportStatus
}));

const routePromise = import("@/app/api/admin/reports/[id]/route");

describe("PATCH /api/admin/reports/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.isAdminSession.mockReturnValue(false);

    const { PATCH } = await routePromise;
    const response = await PATCH(
      new Request("https://wox-bin.vercel.app/api/admin/reports/42", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" })
      }),
      { params: Promise.resolve({ id: "42" }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Admin access required." });
  });

  it("validates the report id and payload", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.isAdminSession.mockReturnValue(true);

    const { PATCH } = await routePromise;
    const response = await PATCH(
      new Request("https://wox-bin.vercel.app/api/admin/reports/not-a-number", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" })
      }),
      { params: Promise.resolve({ id: "not-a-number" }) }
    );

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Invalid report id." });
    expect(mocks.updateReportStatus).not.toHaveBeenCalled();
  });

  it("updates the report status for admins", async () => {
    const report = {
      id: 42,
      status: "reviewed",
      reason: "Spam",
      notes: null,
      createdAt: "2026-03-28T00:00:00.000Z",
      reporter: { id: null, username: null, email: null, source: "anonymous" },
      paste: null,
      comment: null
    };

    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.isAdminSession.mockReturnValue(true);
    mocks.updateReportStatus.mockResolvedValue(report);

    const { PATCH } = await routePromise;
    const response = await PATCH(
      new Request("https://wox-bin.vercel.app/api/admin/reports/42", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "reviewed" })
      }),
      { params: Promise.resolve({ id: "42" }) }
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ report });
    expect(mocks.updateReportStatus).toHaveBeenCalledWith({
      reportId: 42,
      status: "reviewed",
      actorUserId: "admin-1"
    });
  });
});
