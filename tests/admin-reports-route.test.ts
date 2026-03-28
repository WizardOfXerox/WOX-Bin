import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAdminSession: vi.fn(),
  listReportsForAdmin: vi.fn()
}));

vi.mock("@/auth", () => ({
  auth: mocks.auth
}));

vi.mock("@/lib/admin-auth", () => ({
  isAdminSession: mocks.isAdminSession
}));

vi.mock("@/lib/report-service", () => ({
  listReportsForAdmin: mocks.listReportsForAdmin
}));

const routePromise = import("@/app/api/admin/reports/route");

describe("GET /api/admin/reports", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects non-admin callers", async () => {
    mocks.auth.mockResolvedValue(null);
    mocks.isAdminSession.mockReturnValue(false);

    const { GET } = await routePromise;
    const response = await GET(new Request("https://wox-bin.vercel.app/api/admin/reports"));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "Admin access required." });
    expect(mocks.listReportsForAdmin).not.toHaveBeenCalled();
  });

  it("returns the report queue snapshot for admins", async () => {
    const snapshot = {
      reports: [],
      total: 2,
      limit: 30,
      offset: 0,
      status: "open",
      q: "spam",
      counts: {
        open: 2,
        reviewed: 1,
        resolved: 3
      }
    };

    mocks.auth.mockResolvedValue({ user: { id: "admin-1", role: "admin" } });
    mocks.isAdminSession.mockReturnValue(true);
    mocks.listReportsForAdmin.mockResolvedValue(snapshot);

    const { GET } = await routePromise;
    const response = await GET(
      new Request("https://wox-bin.vercel.app/api/admin/reports?status=open&q=spam&limit=25&offset=50")
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(snapshot);
    expect(mocks.listReportsForAdmin).toHaveBeenCalledWith({
      q: "spam",
      status: "open",
      limit: 25,
      offset: 50
    });
  });
});
